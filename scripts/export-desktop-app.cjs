const http = require('node:http');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const exportedAssetsDir = path.join(publicDir, 'exported-assets');
const seedPath = path.join(publicDir, 'desktop-pet-seed.json');
const releaseDir = path.join(rootDir, 'release');
const port = Number(process.env.EXPORT_SERVER_PORT || 5174);

let latestArtifact = null;
let isBuilding = false;

const allowedArtifactExtensions = new Set(['.dmg', '.zip', '.exe', '.msi', '.AppImage', '.deb']);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, body) {
  setCors(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 300 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Export is too large. Try fewer or smaller media files.'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (err) {
        reject(new Error('Invalid JSON payload.'));
      }
    });
    req.on('error', reject);
  });
}

function sanitizeFileName(name) {
  return String(name || 'asset')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 120);
}

function dataUrlToBuffer(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) {
    throw new Error('Invalid uploaded file data.');
  }

  return Buffer.from(match[2], 'base64');
}

async function listArtifacts() {
  try {
    const entries = await fs.readdir(releaseDir, { withFileTypes: true });
    const artifacts = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name);
      if (!allowedArtifactExtensions.has(ext)) continue;

      const artifactPath = path.join(releaseDir, entry.name);
      const stat = await fs.stat(artifactPath);
      artifacts.push({ name: entry.name, path: artifactPath, mtimeMs: stat.mtimeMs });
    }

    return artifacts.sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch {
    return [];
  }
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}.`));
      }
    });
    child.on('error', reject);
  });
}

async function writeExportSeed(payload) {
  const files = Array.isArray(payload.files) ? payload.files : [];
  const assets = payload.assets || {};
  const uploadedAssets = {};

  await fs.rm(exportedAssetsDir, { recursive: true, force: true });
  await fs.mkdir(exportedAssetsDir, { recursive: true });

  for (const file of files) {
    const feature = String(file.feature || 'idle');
    const id = String(file.id || Date.now());
    const originalName = sanitizeFileName(file.name);
    const outputName = `${sanitizeFileName(feature)}-${sanitizeFileName(id)}-${originalName}`;
    const outputPath = path.join(exportedAssetsDir, outputName);

    await fs.writeFile(outputPath, dataUrlToBuffer(file.dataUrl));

    if (!uploadedAssets[feature]) {
      uploadedAssets[feature] = [];
    }

    uploadedAssets[feature].push({
      id,
      name: file.name || outputName,
      type: file.type === 'video' ? 'video' : 'image',
      url: `./exported-assets/${outputName}`,
    });
  }

  const seed = {
    exportedAt: new Date().toISOString(),
    stats: payload.stats,
    customizer: payload.customizer,
    customDuration: payload.customDuration,
    assets: {
      ...assets,
      useWorkspace: false,
      uploadedAssets,
      activeIndices: assets.activeIndices || {},
      playModes: assets.playModes || {},
      customFeatures: assets.customFeatures || [],
    },
  };

  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(seedPath, `${JSON.stringify(seed, null, 2)}\n`);
}

async function handleExport(req, res) {
  if (isBuilding) {
    sendJson(res, 409, { error: 'A desktop app build is already running.' });
    return;
  }

  isBuilding = true;
  try {
    const payload = await readJsonBody(req);
    await writeExportSeed(payload);

    const before = new Set((await listArtifacts()).map((artifact) => artifact.name));
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    await runCommand(npmCommand, ['run', 'desktop:dist']);

    const artifacts = await listArtifacts();
    const artifact = artifacts.find((item) => !before.has(item.name)) || artifacts[0];
    if (!artifact) {
      throw new Error('Build finished, but no downloadable artifact was found in release/.');
    }

    latestArtifact = artifact;
    sendJson(res, 200, {
      fileName: artifact.name,
      downloadUrl: `/api/download/${encodeURIComponent(artifact.name)}`,
    });
  } catch (err) {
    sendJson(res, 500, { error: err instanceof Error ? err.message : 'Build failed.' });
  } finally {
    isBuilding = false;
  }
}

async function handleDownload(req, res) {
  setCors(res);
  const requestedName = decodeURIComponent(req.url.split('/').pop() || '');

  if (!latestArtifact || latestArtifact.name !== requestedName || !fsSync.existsSync(latestArtifact.path)) {
    sendJson(res, 404, { error: 'No built artifact is available for download yet.' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${latestArtifact.name}"`,
  });
  fsSync.createReadStream(latestArtifact.path).pipe(res);
}

const server = http.createServer((req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/export-desktop-app') {
    handleExport(req, res);
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/api/download/')) {
    handleDownload(req, res);
    return;
  }

  sendJson(res, 404, { error: 'Not found.' });
});

server.listen(port, () => {
  console.log(`Desktop app export server listening on http://localhost:${port}`);
});
