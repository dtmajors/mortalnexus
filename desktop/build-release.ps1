$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$project = Join-Path $root 'MortalNexusDesktop.csproj'
$publish = Join-Path $root 'production-build'
$installer = Join-Path $root 'installer\MortalNexus.iss'
$resolvedRoot = [IO.Path]::GetFullPath($root).TrimEnd([IO.Path]::DirectorySeparatorChar)
$resolvedPublish = [IO.Path]::GetFullPath($publish)
if (-not $resolvedPublish.StartsWith($resolvedRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'The publish directory resolved outside the Mortal Nexus workspace.'
}
$isccCandidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe'),
    'C:\Program Files (x86)\Inno Setup 6\ISCC.exe',
    'C:\Program Files\Inno Setup 6\ISCC.exe'
)
$iscc = $isccCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (Test-Path -LiteralPath $resolvedPublish) {
    Remove-Item -LiteralPath $resolvedPublish -Recurse -Force
}

dotnet publish $project -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:LocalUiPreview=false -o $publish
if ($LASTEXITCODE -ne 0) { throw 'Mortal Nexus publish failed.' }
if (-not $iscc) { throw 'Inno Setup 6 was not found.' }

& $iscc $installer
if ($LASTEXITCODE -ne 0) { throw 'Mortal Nexus installer compilation failed.' }

Write-Host "Local standalone build ready: $(Join-Path $root 'dist\MortalNexusStandaloneSetup.exe')"
