$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'assets-manifest.json') | ConvertFrom-Json
$url = "https://github.com/dtmajors/mortalnexus/releases/download/v$($manifest.version)/$($manifest.asset)"
$zip = Join-Path $PSScriptRoot 'assets-download.zip'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try {
    Write-Host 'Downloading the matching Mortal Nexus map and image assets...'
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    $hash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash
    if ($hash -ne $manifest.sha256) { throw 'Asset archive checksum did not match. Nothing was extracted.' }
    Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($zip)
    try {
        foreach ($entry in $archive.Entries) {
            $path = $entry.FullName.Replace('\', '/')
            if (-not $path.StartsWith('assets/') -or $path.Split('/') -contains '..' -or [IO.Path]::IsPathRooted($path)) {
                throw 'Asset archive contains an unexpected path.'
            }
        }
    } finally { $archive.Dispose() }
    Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $root 'wwwroot') -Force
    Write-Host 'Assets verified and installed. The desktop project is ready to build.'
} finally {
    if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip }
}
