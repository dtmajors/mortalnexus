using System.Text.Json;
using MortalNexusDesktop;

if (args.Length != 1) throw new ArgumentException("Pass the published wwwroot path.");
using var server = new LocalMapServer(args[0]);
server.Start();
using var client = new HttpClient { BaseAddress = server.BaseAddress, Timeout = TimeSpan.FromSeconds(10) };
var paths = new[] {
    "/", "/desktop-map", "/myrland-map", "/assets/sarducaa-map.webp",
    "/assets/myrland-map-worldanvil-registered.jpg", "/assets/data/sarducaa-community-markers.json",
    "/assets/data/myrland-community-markers.json", "/api/app/bootstrap", "/crafting", "/builder",
    "/loot", "/reference", "/spells", "/fishing", "/dungeons", "/guides", "/creatures"
};
foreach (var path in paths)
{
    using var response = await client.GetAsync(path, HttpCompletionOption.ResponseHeadersRead);
    if (!response.IsSuccessStatusCode) throw new Exception($"{path}: {(int)response.StatusCode}");
}
using var bootstrap = JsonDocument.Parse(await client.GetStringAsync("/api/app/bootstrap"));
var entitlement = bootstrap.RootElement.GetProperty("entitlement");
if (entitlement.GetProperty("tier").GetString() != "open-source" || !entitlement.GetProperty("premium").GetBoolean())
    throw new Exception("Free access was not exposed by the local API.");
foreach (var path in new[] { "/api/nexus-community/community/markers", "/api/oracle-builder/builds" })
{
    using var response = await client.GetAsync(path);
    if (response.StatusCode != System.Net.HttpStatusCode.Gone)
        throw new Exception("Retired hosted features were not disabled.");
}
Console.WriteLine($"PASS: {paths.Length} bundled map, page, and bootstrap endpoints work without a license or account.");
Console.WriteLine("PASS: all former Premium pages are accessible; retired hosted services return 410.");
