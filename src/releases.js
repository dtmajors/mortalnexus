const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { config } = require('./config');

function githubHeaders(accept = 'application/vnd.github+json') {
  return {
    Accept: accept,
    Authorization: `Bearer ${config.githubReleaseToken}`,
    'User-Agent': 'mortal-nexus-store',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

async function fetchLatestInstaller() {
  const { asset } = await fetchLatestRelease();
  const assetResponse = await fetch(asset.url, {
    headers: githubHeaders('application/octet-stream'),
    redirect: 'follow'
  });
  if (!assetResponse.ok || !assetResponse.body) {
    throw new Error(`GitHub release download failed (${assetResponse.status}).`);
  }
  return assetResponse;
}

async function fetchLatestRelease() {
  const releaseResponse = await fetch(`https://api.github.com/repos/${config.githubReleaseRepo}/releases/latest`, {
    headers: githubHeaders()
  });
  if (!releaseResponse.ok) {
    throw new Error(`GitHub release lookup failed (${releaseResponse.status}).`);
  }

  const release = await releaseResponse.json();
  const asset = release.assets?.find((candidate) => candidate.name === config.githubReleaseAsset);
  if (!asset) {
    throw new Error(`Release asset ${config.githubReleaseAsset} was not found.`);
  }
  return { release, asset };
}

async function streamLatestInstaller(res) {
  const assetResponse = await fetchLatestInstaller();
  res.status(200);
  res.set({
    'Cache-Control': 'private, no-store',
    'Content-Type': assetResponse.headers.get('content-type') || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${config.githubReleaseAsset.replaceAll('"', '')}"`,
    'X-Content-Type-Options': 'nosniff'
  });
  const contentLength = assetResponse.headers.get('content-length');
  if (contentLength) res.set('Content-Length', contentLength);
  await pipeline(Readable.fromWeb(assetResponse.body), res);
}

module.exports = { streamLatestInstaller, fetchLatestRelease };
