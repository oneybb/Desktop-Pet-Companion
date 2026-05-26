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

const INSTALLER_EXTENSIONS = new Set(['.exe', '.msi', '.dmg', '.zip', '.AppImage', '.deb']);

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
      } catch {
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

function resolveBuildFor(payload) {
  const requested = String(payload?.buildFor || 'auto').toLowerCase();
  if (requested === 'windows' || requested === 'win' || requested === 'win32') return 'win32';
  if (requested === 'mac' || requested === 'darwin' || requested === 'macos') return 'darwin';
  return process.platform;
}

function isInstallerArtifact(fileName) {
  const lower = fileName.toLowerCase();
  const ext = path.extname(lower);
  if (!INSTALLER_EXTENSIONS.has(ext)) return false;
  if (lower.endsWith('.blockmap')) return false;
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) return false;
  if (lower.includes('builder-debug')) return false;
  return true;
}

function scoreArtifact(fileName, buildFor) {
  const lower = fileName.toLowerCase();
  let score = 0;
  if (!isInstallerArtifact(fileName)) return -1;

  if (buildFor === 'win32') {
    if (!lower.endsWith('.exe')) return -1;
    if (lower.includes('portable')) score += 100;
    if (lower.includes('setup')) score += 80;
    if (lower.includes('desktoppetcompanion')) score += 10;
    if (lower.includes('arm64') && process.arch === 'x64') score -= 5;
  } else if (buildFor === 'darwin') {
    if (lower.endsWith('.dmg')) score += 100;
    if (lower.endsWith('.zip') && lower.includes('mac')) score += 90;
  }

  return score;
}

async function listArtifacts() {
  try {
    const entries = await fs.readdir(releaseDir, { withFileTypes: true });
    const artifacts = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!isInstallerArtifact(entry.name)) continue;

      const artifactPath = path.join(releaseDir, entry.name);
      const stat = await fs.stat(artifactPath);
      artifacts.push({
        name: entry.name,
        path: artifactPath,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      });
    }

    return artifacts.sort((a, b) => b.mtimeMs - a.mtimeMs);
  } catch {
    return [];
  }
}

function pickArtifact(artifacts, buildFor, beforeNames) {
  const fresh = artifacts.filter((item) => !beforeNames.has(item.name));
  const pool = fresh.length > 0 ? fresh : artifacts;

  const ranked = pool
    .map((item) => ({ item, score: scoreArtifact(item.name, buildFor) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score || b.item.mtimeMs - a.item.mtimeMs);

  const chosen = ranked[0]?.item;
  if (!chosen) return null;

  const minSize = buildFor === 'win32' ? 40 * 1024 * 1024 : 20 * 1024 * 1024;
  if (chosen.size < minSize) {
    throw new Error(
      `Built file "${chosen.name}" looks too small (${Math.round(chosen.size / 1024 / 1024)} MB). The build may have failed — try building on a ${buildFor === 'win32' ? 'Windows' : 'Mac'} computer.`
    );
  }

  return chosen;
}

function runCommand(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, ...extraEnv },
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

async function cleanStaleWinBuildArtifacts() {
  try {
    const entries = await fs.readdir(releaseDir);
    await Promise.all(
      entries
        .filter((name) => name.includes('.nsis.7z') || name.endsWith('.nsis.7z.tmp'))
        .map((name) => fs.rm(path.join(releaseDir, name), { force: true }))
    );
  } catch {
    /* release dir may not exist yet */
  }
}

async function buildDesktopPackage(buildFor) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  await runCommand(npmCommand, ['run', 'build']);

  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const builderArgs = ['electron-builder'];

  if (buildFor === 'win32') {
    await cleanStaleWinBuildArtifacts();
    // Portable .exe only — NSIS cross-build on Mac often fails (missing .nsis.7z).
    builderArgs.push('--win', 'portable', '--x64');
  } else if (buildFor === 'darwin') {
    if (process.platform === 'darwin') {
      builderArgs.push('--mac', 'dmg', 'zip', '--arm64');
    } else {
      throw new Error('macOS installers must be built on a Mac. Use buildFor: "windows" on this machine.');
    }
  } else {
    await runCommand(npmCommand, ['run', 'desktop:dist']);
    return;
  }

  const builderEnv =
    buildFor === 'win32' && process.platform !== 'win32'
      ? { CSC_IDENTITY_AUTO_DISCOVERY: 'false' }
      : {};

  await runCommand(npxCommand, builderArgs, builderEnv);
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
    companionSettings: payload.companionSettings,
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

function mimeTypeForArtifact(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.exe')) return 'application/vnd.microsoft.portable-executable';
  if (lower.endsWith('.msi')) return 'application/x-msi';
  if (lower.endsWith('.dmg')) return 'application/x-apple-diskimage';
  if (lower.endsWith('.zip')) return 'application/zip';
  return 'application/octet-stream';
}

async function handleExport(req, res) {
  if (isBuilding) {
    sendJson(res, 409, { error: 'A desktop app build is already running.' });
    return;
  }

  isBuilding = true;
  try {
    const payload = await readJsonBody(req);
    const buildFor = resolveBuildFor(payload);
    await writeExportSeed(payload);

    const before = new Set((await listArtifacts()).map((artifact) => artifact.name));
    await buildDesktopPackage(buildFor);

    const artifacts = await listArtifacts();
    const artifact = pickArtifact(artifacts, buildFor, before);
    if (!artifact) {
      throw new Error(
        buildFor === 'win32'
          ? 'No Windows .exe was produced. Build this project on a Windows PC (recommended), or run: npm run desktop:dist:win'
          : 'Build finished, but no Mac .dmg/.zip was found in release/.'
      );
    }

    latestArtifact = artifact;
    sendJson(res, 200, {
      fileName: artifact.name,
      fileSize: artifact.size,
      buildFor,
      downloadUrl: `/api/download/${encodeURIComponent(artifact.name)}`,
      installHint:
        buildFor === 'win32'
          ? artifact.name.toLowerCase().includes('portable')
            ? 'Run the Portable .exe directly (no install). Do not rename the file.'
            : 'Run the Setup .exe and follow the installer. Use the shortcut it creates — do not run random .exe from inside the zip folder.'
          : 'Open the .dmg and drag the app to Applications.',
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

  if (!latestArtifact || latestArtifact.name !== requestedName) {
    sendJson(res, 404, { error: 'No built artifact is available for download yet.' });
    return;
  }

  if (!fsSync.existsSync(latestArtifact.path)) {
    sendJson(res, 404, { error: 'Built file is missing on disk. Rebuild the app.' });
    return;
  }

  const stat = await fs.stat(latestArtifact.path);
  const buffer = await fs.readFile(latestArtifact.path);

  if (buffer.length !== stat.size) {
    sendJson(res, 500, { error: 'Download failed: file read was incomplete.' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': mimeTypeForArtifact(latestArtifact.name),
    'Content-Length': String(stat.size),
    'Content-Disposition': `attachment; filename="${latestArtifact.name}"`,
    'Cache-Control': 'no-store',
  });
  res.end(buffer);
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
