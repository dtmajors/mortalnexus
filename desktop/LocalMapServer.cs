using System.Net;
using System.Net.Sockets;
using System.Globalization;
using System.Text;
using System.Text.Json;

namespace MortalNexusDesktop;

internal sealed class LocalMapServer : IDisposable
{
    private const int PreferredPort = 48791;
    private const string CraftingApiBase = "https://mortalcodex.com/api/v1";
    private const string OracleBuilderApiBase = "https://builder.mortalonline2map.com";
    private static readonly HttpClient ApiClient = CreateApiClient();
    private static readonly HttpClient BuilderClient = CreateBuilderClient();
    private static readonly IReadOnlyDictionary<string, string[]> CraftingQueryFields =
        new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["weapon"] = ["handleId", "headId", "coreMatId", "gripMatId", "headMatId"],
            ["armor"] = ["armorStyleId", "baseMatId", "supportMatId", "baseDensity", "supportDensity"],
            ["bow"] = ["bowSizeId", "bowTypeId", "bellyMatId", "backMatId", "compositePercent", "isSelfBow"],
            ["shield"] = ["shieldStyleId", "shieldFrameId", "coreMatId", "coatMatId", "frameMatId"],
            ["pet"] = ["armorStyleId", "baseMatId", "supportMatId", "baseDensity", "supportDensity"],
        };
    private static readonly HashSet<string> ReferenceDatasets =
        new(["creatures", "mastery", "pets", "skills", "spells"], StringComparer.OrdinalIgnoreCase);
    private static readonly IReadOnlyDictionary<string, string> ContentTypes =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [".css"] = "text/css; charset=utf-8",
            [".html"] = "text/html; charset=utf-8",
            [".avif"] = "image/avif",
            [".ico"] = "image/x-icon",
            [".jpeg"] = "image/jpeg",
            [".jpg"] = "image/jpeg",
            [".js"] = "text/javascript; charset=utf-8",
            [".json"] = "application/json; charset=utf-8",
            [".mp3"] = "audio/mpeg",
            [".png"] = "image/png",
            [".svg"] = "image/svg+xml; charset=utf-8",
            [".webp"] = "image/webp",
            [".woff"] = "font/woff",
            [".woff2"] = "font/woff2",
        };

    private readonly HttpListener _listener = new();
    private readonly CancellationTokenSource _shutdown = new();
    private readonly string _root;
    private readonly DesktopAuthenticationResult _authenticationResult;
    private readonly SemaphoreSlim _catalogLock = new(1, 1);
    private readonly SemaphoreSlim _referenceLock = new(1, 1);
    private readonly SemaphoreSlim _builderCatalogLock = new(1, 1);
    private readonly Dictionary<string, CachedResponse> _referenceCache = new(StringComparer.OrdinalIgnoreCase);
    private CachedResponse? _catalogCache;
    private CachedResponse? _builderCatalogCache;
    private Task? _listenTask;

    public LocalMapServer(string root, DesktopAuthenticationResult? authenticationResult = null)
    {
        _root = Path.GetFullPath(root);
        _authenticationResult = authenticationResult ?? DesktopAuthenticationResult.CreateLocal();
        if (!Directory.Exists(_root))
        {
            throw new DirectoryNotFoundException($"Map assets were not found at {_root}");
        }

        var port = ReservePort();
        BaseAddress = new Uri($"http://localhost:{port}/");
        _listener.Prefixes.Add(BaseAddress.AbsoluteUri);
    }

    public Uri BaseAddress { get; }

    public void Start()
    {
        _listener.Start();
        _listenTask = Task.Run(() => ListenAsync(_shutdown.Token));
    }

    private async Task ListenAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            HttpListenerContext context;
            try
            {
                context = await _listener.GetContextAsync();
            }
            catch (Exception) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }
            catch (HttpListenerException) when (!_listener.IsListening)
            {
                break;
            }

            _ = Task.Run(() => ServeAsync(context), CancellationToken.None);
        }
    }

    private async Task ServeAsync(HttpListenerContext context)
    {
        try
        {
            var method = context.Request.HttpMethod;
            var path = Uri.UnescapeDataString(context.Request.Url?.AbsolutePath ?? "/");
            if (path.Equals("/api/app/bootstrap", StringComparison.OrdinalIgnoreCase))
            {
                var payload = JsonSerializer.SerializeToUtf8Bytes(new
                {
                    account = new
                    {
                        id = _authenticationResult.AppSession.Account.Id,
                        email = _authenticationResult.AppSession.Account.Email,
                        displayName = _authenticationResult.AppSession.Account.DisplayName,
                        role = _authenticationResult.AppSession.Account.Role,
                        canEdit = _authenticationResult.AppSession.Account.CanEdit,
                    },
                    entitlement = new
                    {
                        tier = "open-source",
                        premium = true,
                        source = _authenticationResult.AppSession.Entitlement?.Source,
                        trialExpiresAt = _authenticationResult.AppSession.Entitlement?.TrialExpiresAt,
                    },
                    firebaseToken = _authenticationResult.AppSession.FirebaseToken,
                });
                await WriteApiResponseAsync(context, method, payload, "application/json; charset=utf-8", "no-store");
                return;
            }
            const string communityProxyPrefix = "/api/nexus-community/";
            if (path.StartsWith(communityProxyPrefix, StringComparison.OrdinalIgnoreCase))
            {
                await WriteApiErrorAsync(context, HttpStatusCode.Gone, "Community features are not included in Mortal Nexus Standalone.");
                return;
            }

            const string builderBuildsPrefix = "/api/oracle-builder/builds";
            if (path.Equals(builderBuildsPrefix, StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith($"{builderBuildsPrefix}/", StringComparison.OrdinalIgnoreCase))
            {
                await WriteApiErrorAsync(context, HttpStatusCode.Gone, "Shared builds are not included in Mortal Nexus Standalone.");
                return;
            }

            if (path.Equals("/api/oracle-builder/catalog", StringComparison.OrdinalIgnoreCase))
            {
                if (method is not ("GET" or "HEAD"))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.MethodNotAllowed;
                    context.Response.Headers["Allow"] = "GET, HEAD";
                    return;
                }

                await ServeBuilderCatalogAsync(context, method);
                return;
            }

            if (path.Equals("/api/oracle-builder/compute", StringComparison.OrdinalIgnoreCase))
            {
                if (!string.Equals(method, "POST", StringComparison.OrdinalIgnoreCase))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.MethodNotAllowed;
                    context.Response.Headers["Allow"] = "POST";
                    return;
                }

                await ServeBuilderComputeAsync(context);
                return;
            }

            const string builderAssetPrefix = "/api/oracle-builder/assets/";
            if (path.StartsWith(builderAssetPrefix, StringComparison.OrdinalIgnoreCase))
            {
                if (method is not ("GET" or "HEAD"))
                {
                    context.Response.StatusCode = (int)HttpStatusCode.MethodNotAllowed;
                    context.Response.Headers["Allow"] = "GET, HEAD";
                    return;
                }

                await ServeBuilderAssetAsync(context, method, path[builderAssetPrefix.Length..]);
                return;
            }

            if (!string.Equals(method, "GET", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(method, "HEAD", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.StatusCode = (int)HttpStatusCode.MethodNotAllowed;
                context.Response.Headers["Allow"] = "GET, HEAD";
                return;
            }

            if (path.Equals("/api/crafting/catalog", StringComparison.OrdinalIgnoreCase))
            {
                await ServeCraftingCatalogAsync(context, method);
                return;
            }

            const string calculationPrefix = "/api/crafting/calculate/";
            if (path.StartsWith(calculationPrefix, StringComparison.OrdinalIgnoreCase))
            {
                var kind = path[calculationPrefix.Length..].Trim('/');
                await ServeCraftingCalculationAsync(context, method, kind);
                return;
            }

            const string referencePrefix = "/api/reference/";
            if (path.StartsWith(referencePrefix, StringComparison.OrdinalIgnoreCase))
            {
                var dataset = path[referencePrefix.Length..].Trim('/');
                await ServeReferenceDatasetAsync(context, method, dataset);
                return;
            }

            var relativePath = path switch
            {
                "/" or "/desktop-map" or "/desktop-map/" => "desktop-map.html",
                "/map" or "/map/" or "/myrland-map" or "/myrland-map/" or "/myrland-alt-map" or "/myrland-alt-map/" => "desktop-map.html",
                "/reference" or "/reference/" or "/nave-index" or "/nave-index/" => "reference.html",
                "/builder" or "/builder/" => "builder.html",
                "/crafting" or "/crafting/" => "crafting.html",
                "/extraction" or "/extraction/" or "/furnace" or "/furnace/" => "furnace.html",
                "/refining" or "/refining/" => "refining.html",
                "/butchery" or "/butchery/" => "butchery.html",
                "/alchemy" or "/alchemy/" => "alchemy.html",
                "/cooking" or "/cooking/" => "cooking.html",
                "/reverse" or "/reverse/" => "reverse.html",
                "/building" or "/building/" => "building.html",
                "/spells" or "/spells/" or "/spell-planner" or "/spell-planner/" => "spells.html",
                "/fishing" or "/fishing/" => "fishing.html",
                "/guides" or "/guides/" => "guides.html",
                "/market" or "/market/" => "market.html",
                "/house-hunter" or "/house-hunter/" => "house-hunter.html",
                "/pets" or "/pets/" => "pets.html",
                "/creatures" or "/creatures/" or "/shambles" or "/shambles/" => "shambles.html",
                "/dungeons" or "/dungeons/" => "dungeons.html",
                "/loot" or "/loot/" or "/loot-database" or "/loot-database/" => Path.Combine("loot", "index.html"),
                "/updates" or "/updates/" or "/update-log" or "/update-log/" => "update-log.html",
                _ => path.TrimStart('/').Replace('/', Path.DirectorySeparatorChar),
            };

            var filePath = Path.GetFullPath(Path.Combine(_root, relativePath));
            if (!filePath.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) ||
                !File.Exists(filePath))
            {
                context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                return;
            }

            var extension = Path.GetExtension(filePath);
            context.Response.StatusCode = (int)HttpStatusCode.OK;
            context.Response.ContentType = ContentTypes.GetValueOrDefault(
                extension,
                "application/octet-stream");
            context.Response.Headers["Cache-Control"] =
                extension.Equals(".html", StringComparison.OrdinalIgnoreCase)
                    ? "no-cache"
                    : "public, max-age=3600";
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";

            var info = new FileInfo(filePath);
            context.Response.ContentLength64 = info.Length;
            if (!string.Equals(method, "HEAD", StringComparison.OrdinalIgnoreCase))
            {
                await using var file = File.OpenRead(filePath);
                await file.CopyToAsync(context.Response.OutputStream);
            }
        }
        catch
        {
            if (context.Response.OutputStream.CanWrite)
            {
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            }
        }
        finally
        {
            context.Response.Close();
        }
    }

    private async Task ServeCraftingCatalogAsync(HttpListenerContext context, string method)
    {
        var cached = _catalogCache;
        if (cached is not null && cached.ExpiresAt > DateTimeOffset.UtcNow)
        {
            await WriteApiResponseAsync(context, method, cached.Body, "application/json; charset=utf-8", "public, max-age=900");
            return;
        }

        await _catalogLock.WaitAsync(_shutdown.Token);
        try
        {
            cached = _catalogCache;
            if (cached is null || cached.ExpiresAt <= DateTimeOffset.UtcNow)
            {
                var body = await FetchApiAsync("workbench/catalog", expectJson: true);
                cached = new CachedResponse(body, DateTimeOffset.UtcNow.AddHours(1));
                _catalogCache = cached;
            }

            await WriteApiResponseAsync(context, method, cached.Body, "application/json; charset=utf-8", "public, max-age=900");
        }
        catch
        {
            await WriteApiErrorAsync(context, HttpStatusCode.BadGateway, "Crafting catalog is temporarily unavailable");
        }
        finally
        {
            _catalogLock.Release();
        }
    }

    private async Task ServeCraftingCalculationAsync(HttpListenerContext context, string method, string kind)
    {
        if (!CraftingQueryFields.TryGetValue(kind, out var fields))
        {
            await WriteApiErrorAsync(context, HttpStatusCode.NotFound, "Unknown crafting calculator");
            return;
        }

        var query = new List<string>(fields.Length);
        foreach (var field in fields)
        {
            var value = context.Request.QueryString[field];
            if (string.IsNullOrWhiteSpace(value) ||
                !double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out _))
            {
                await WriteApiErrorAsync(context, HttpStatusCode.BadRequest, $"Missing or invalid {field}");
                return;
            }

            query.Add($"{Uri.EscapeDataString(field)}={Uri.EscapeDataString(value)}");
        }

        try
        {
            var body = await FetchApiAsync($"crafting/calculate/{kind}?{string.Join('&', query)}", expectJson: false);
            await WriteApiResponseAsync(context, method, body, "text/plain; charset=utf-8", "no-store");
        }
        catch
        {
            await WriteApiErrorAsync(context, HttpStatusCode.BadGateway, "Crafting calculation is temporarily unavailable");
        }
    }

    private async Task ServeReferenceDatasetAsync(HttpListenerContext context, string method, string dataset)
    {
        if (!ReferenceDatasets.Contains(dataset))
        {
            await WriteApiErrorAsync(context, HttpStatusCode.NotFound, "Unknown reference dataset");
            return;
        }

        if (_referenceCache.TryGetValue(dataset, out var cached) && cached.ExpiresAt > DateTimeOffset.UtcNow)
        {
            await WriteApiResponseAsync(context, method, cached.Body, "application/json; charset=utf-8", "public, max-age=900");
            return;
        }

        await _referenceLock.WaitAsync(_shutdown.Token);
        try
        {
            if (!_referenceCache.TryGetValue(dataset, out cached) || cached.ExpiresAt <= DateTimeOffset.UtcNow)
            {
                var body = await FetchApiAsync($"game-reference/{Uri.EscapeDataString(dataset)}", expectJson: true);
                cached = new CachedResponse(body, DateTimeOffset.UtcNow.AddHours(6));
                _referenceCache[dataset] = cached;
            }

            await WriteApiResponseAsync(context, method, cached.Body, "application/json; charset=utf-8", "public, max-age=900");
        }
        catch
        {
            await WriteApiErrorAsync(context, HttpStatusCode.BadGateway, "Reference data is temporarily unavailable");
        }
        finally
        {
            _referenceLock.Release();
        }
    }

    private async Task ServeBuilderCatalogAsync(HttpListenerContext context, string method)
    {
        var cached = _builderCatalogCache;
        if (cached is not null && cached.ExpiresAt > DateTimeOffset.UtcNow)
        {
            await WriteApiResponseAsync(context, method, cached.Body, "application/json; charset=utf-8", "public, max-age=900");
            return;
        }

        await _builderCatalogLock.WaitAsync(_shutdown.Token);
        try
        {
            cached = _builderCatalogCache;
            if (cached is null || cached.ExpiresAt <= DateTimeOffset.UtcNow)
            {
                byte[] body;
                try
                {
                    using var response = await BuilderClient.GetAsync("api/catalog", HttpCompletionOption.ResponseHeadersRead, _shutdown.Token);
                    body = await response.Content.ReadAsByteArrayAsync(_shutdown.Token);
                    if (!response.IsSuccessStatusCode || !Encoding.UTF8.GetString(body).TrimStart().StartsWith('{'))
                    {
                        throw new HttpRequestException($"Builder catalog returned {(int)response.StatusCode}.");
                    }
                }
                catch
                {
                    body = await File.ReadAllBytesAsync(Path.Combine(_root, "assets", "data", "oracle-builder-catalog.json"), _shutdown.Token);
                }

                cached = new CachedResponse(body, DateTimeOffset.UtcNow.AddHours(6));
                _builderCatalogCache = cached;
            }

            await WriteApiResponseAsync(context, method, cached.Body, "application/json; charset=utf-8", "public, max-age=900");
        }
        catch
        {
            await WriteApiErrorAsync(context, HttpStatusCode.BadGateway, "Character builder data is temporarily unavailable.");
        }
        finally
        {
            _builderCatalogLock.Release();
        }
    }

    private async Task ServeBuilderComputeAsync(HttpListenerContext context)
    {
        if (context.Request.ContentLength64 is > 2_000_000)
        {
            await WriteApiErrorAsync(context, HttpStatusCode.RequestEntityTooLarge, "Character build data is too large.");
            return;
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "api/compute");
            request.Content = new StreamContent(context.Request.InputStream);
            request.Content.Headers.ContentType = new("application/json");
            using var response = await BuilderClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, _shutdown.Token);
            var body = await response.Content.ReadAsByteArrayAsync(_shutdown.Token);
            context.Response.StatusCode = (int)response.StatusCode;
            context.Response.ContentType = "application/json; charset=utf-8";
            context.Response.Headers["Cache-Control"] = "no-store";
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            context.Response.ContentLength64 = body.Length;
            await context.Response.OutputStream.WriteAsync(body, _shutdown.Token);
        }
        catch
        {
            await WriteApiErrorAsync(context, HttpStatusCode.BadGateway, "Live character calculations are temporarily unavailable.");
        }
    }

    private static async Task ServeBuilderAssetAsync(HttpListenerContext context, string method, string relativePath)
    {
        var cleanPath = relativePath.Replace('\\', '/').TrimStart('/');
        var extension = Path.GetExtension(cleanPath);
        if (cleanPath.Contains("..", StringComparison.Ordinal) ||
            !cleanPath.StartsWith("img/", StringComparison.OrdinalIgnoreCase) ||
            extension is not (".png" or ".avif" or ".webp" or ".jpg" or ".jpeg"))
        {
            await WriteApiErrorAsync(context, HttpStatusCode.BadRequest, "Unknown character builder asset.");
            return;
        }

        try
        {
            using var response = await BuilderClient.GetAsync(cleanPath, HttpCompletionOption.ResponseHeadersRead);
            if (!response.IsSuccessStatusCode)
            {
                context.Response.StatusCode = (int)response.StatusCode;
                return;
            }

            context.Response.StatusCode = (int)HttpStatusCode.OK;
            context.Response.ContentType = response.Content.Headers.ContentType?.ToString() ?? "application/octet-stream";
            context.Response.Headers["Cache-Control"] = "public, max-age=86400";
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            if (!string.Equals(method, "HEAD", StringComparison.OrdinalIgnoreCase))
            {
                await response.Content.CopyToAsync(context.Response.OutputStream);
            }
        }
        catch
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadGateway;
        }
    }

    private static async Task<byte[]> FetchApiAsync(string relativeUrl, bool expectJson)
    {
        using var response = await ApiClient.GetAsync(relativeUrl, HttpCompletionOption.ResponseHeadersRead);
        var body = await response.Content.ReadAsByteArrayAsync();
        var text = Encoding.UTF8.GetString(body).TrimStart();
        if (!response.IsSuccessStatusCode ||
            (expectJson && !text.StartsWith('{')) ||
            (!expectJson && text.StartsWith('<')))
        {
            throw new HttpRequestException($"Upstream request failed with {(int)response.StatusCode}.");
        }

        return body;
    }

    private static async Task WriteApiResponseAsync(
        HttpListenerContext context,
        string method,
        byte[] body,
        string contentType,
        string cacheControl)
    {
        context.Response.StatusCode = (int)HttpStatusCode.OK;
        context.Response.ContentType = contentType;
        context.Response.Headers["Cache-Control"] = cacheControl;
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.ContentLength64 = string.Equals(method, "HEAD", StringComparison.OrdinalIgnoreCase) ? 0 : body.Length;
        if (!string.Equals(method, "HEAD", StringComparison.OrdinalIgnoreCase))
        {
            await context.Response.OutputStream.WriteAsync(body);
        }
    }

    private static async Task WriteApiErrorAsync(HttpListenerContext context, HttpStatusCode status, string message)
    {
        var escaped = message.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("\"", "\\\"", StringComparison.Ordinal);
        var body = Encoding.UTF8.GetBytes($"{{\"error\":\"{escaped}\"}}");
        context.Response.StatusCode = (int)status;
        context.Response.ContentType = "application/json; charset=utf-8";
        context.Response.Headers["Cache-Control"] = "no-store";
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.ContentLength64 = body.Length;
        await context.Response.OutputStream.WriteAsync(body);
    }

    private static HttpClient CreateApiClient()
    {
        var client = new HttpClient
        {
            BaseAddress = new Uri($"{CraftingApiBase}/"),
            Timeout = TimeSpan.FromSeconds(12),
        };
        client.DefaultRequestHeaders.Accept.ParseAdd("application/json, text/plain;q=0.9");
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Mortal-Nexus-Desktop/1.7");
        return client;
    }

    private static HttpClient CreateBuilderClient()
    {
        var client = new HttpClient
        {
            BaseAddress = new Uri($"{OracleBuilderApiBase}/"),
            Timeout = TimeSpan.FromSeconds(20),
        };
        client.DefaultRequestHeaders.Accept.ParseAdd("application/json");
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Mortal-Nexus-Desktop/1.16");
        return client;
    }

    private static int ReservePort()
    {
        for (var port = PreferredPort; port < PreferredPort + 10; port++)
        {
            try
            {
                using var preferredListener = new TcpListener(IPAddress.Loopback, port);
                preferredListener.Start();
                return port;
            }
            catch (SocketException)
            {
            }
        }

        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        return ((IPEndPoint)listener.LocalEndpoint).Port;
    }

    public void Dispose()
    {
        _shutdown.Cancel();
        if (_listener.IsListening)
        {
            _listener.Stop();
        }
        _listener.Close();

        try
        {
            _listenTask?.Wait(TimeSpan.FromSeconds(2));
        }
        catch
        {
            // Shutdown should never block application exit.
        }

        _shutdown.Dispose();
        _catalogLock.Dispose();
        _referenceLock.Dispose();
    }

    private sealed record CachedResponse(byte[] Body, DateTimeOffset ExpiresAt);
}
