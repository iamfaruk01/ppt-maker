const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const os = require('os');

let mainWindow = null;

// ── Paths & Setup ─────────────────────────────────────────────────────────────
function getAppDataDir() {
  return app.getPath('userData');
}

function getConfigPath() {
  return path.join(getAppDataDir(), 'config.json');
}

function getBackendDir() {
  if (app.isPackaged) {
    const unpacked = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend');
    if (fs.existsSync(unpacked)) return unpacked;
    const direct = path.join(process.resourcesPath, 'backend');
    if (fs.existsSync(direct)) return direct;
  }
  return path.join(__dirname, 'backend');
}

function getActiveScriptPath() {
  const userScript = path.join(getAppDataDir(), 'math_to_ppt.py');
  if (fs.existsSync(userScript)) return userScript;
  return path.join(getBackendDir(), 'math_to_ppt.py');
}

function loadConfig() {
  const p = getConfigPath();
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (_) {}
  }
  // Default fallback from project config.json
  const defaultP = path.join(__dirname, 'config.json');
  if (fs.existsSync(defaultP)) {
    try {
      return JSON.parse(fs.readFileSync(defaultP, 'utf8'));
    } catch (_) {}
  }
  return { github_repo: '', auto_sync: true, last_synced: null };
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to save config:', e);
    return false;
  }
}

// ── Live GitHub Script Sync ───────────────────────────────────────────────────
async function syncLatestScript() {
  const config = loadConfig();
  if (!config.github_repo || !config.github_repo.trim()) {
    const res = { status: 'no_repo', message: 'No GitHub Repo Set', date: null };
    emitSyncStatus(res);
    return res;
  }

  const repo = config.github_repo.trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/$/, '');

  const headers = { 'User-Agent': 'PPT-Maker' };
  if (config.github_token && config.github_token.trim()) {
    headers['Authorization'] = `Bearer ${config.github_token.trim()}`;
  }

  // Try direct raw URLs, then GitHub API raw endpoint (for private repositories)
  const candidateRequests = [
    { url: `https://raw.githubusercontent.com/${repo}/main/backend/math_to_ppt.py`, headers },
    { url: `https://raw.githubusercontent.com/${repo}/main/math_to_ppt.py`, headers },
    { url: `https://raw.githubusercontent.com/${repo}/master/backend/math_to_ppt.py`, headers },
    { url: `https://raw.githubusercontent.com/${repo}/master/math_to_ppt.py`, headers },
    { 
      url: `https://api.github.com/repos/${repo}/contents/backend/math_to_ppt.py`, 
      headers: { ...headers, 'Accept': 'application/vnd.github.raw' } 
    }
  ];

  emitSyncStatus({ status: 'syncing', message: 'Checking GitHub for updates…' });

  for (const req of candidateRequests) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(req.url, { headers: req.headers, signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const code = await res.text();
        // Sanity verification: must contain python generate function
        if (code.includes('def generate(') && code.includes('prs.save(')) {
          const target = path.join(getAppDataDir(), 'math_to_ppt.py');
          fs.writeFileSync(target, code, 'utf8');
          config.last_synced = new Date().toISOString();
          saveConfig(config);
          const payload = {
            status: 'synced',
            message: 'Live Up to Date',
            date: config.last_synced,
            sourceUrl: req.url
          };
          emitSyncStatus(payload);
          return payload;
        }
      }
    } catch (_) {
      // Continue to next candidate URL
    }
  }

  // If sync failed (e.g. offline)
  const failPayload = {
    status: 'offline',
    message: 'Using Local Script (Offline / Untracked)',
    date: config.last_synced
  };
  emitSyncStatus(failPayload);
  return failPayload;
}

function emitSyncStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sync:status', payload);
  }
}

// ── Font Auto-Install Check ───────────────────────────────────────────────────
function ensureBanikantaFont() {
  const winFonts = path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts', 'Banikanta.ttf');
  if (fs.existsSync(winFonts)) return;

  const batPath = path.join(getBackendDir(), 'install_font.bat');
  if (fs.existsSync(batPath)) {
    exec(`"${batPath}"`, (err) => {
      if (!err) console.log('Banikanta font installed automatically.');
    });
  }
}

// ── Python Generator Execution ────────────────────────────────────────────────
function getRunnerCommand() {
  const exePath = path.join(getBackendDir(), 'python_runner.exe');
  if (fs.existsSync(exePath)) {
    return { cmd: exePath, args: [] };
  }
  // Development fallback: use local python + runner.py
  const pyRunner = path.join(getBackendDir(), 'runner.py');
  if (fs.existsSync(pyRunner)) {
    return { cmd: 'python', args: [pyRunner] };
  }
  return { cmd: 'python', args: [getActiveScriptPath()] };
}

// ── Window Creation ───────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 840,
    minWidth: 980,
    minHeight: 650,
    backgroundColor: '#0f0f13',
    title: 'PPT Maker',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.on('did-finish-load', () => {
    ensureBanikantaFont();
    syncLatestScript();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC Handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('math-ppt:generate', async (event, data) => {
  const activeScript = getActiveScriptPath();
  const outputPath = data._output || path.join(app.getPath('desktop'), `presentation_${Date.now()}.pptx`);

  const tmpJson = path.join(os.tmpdir(), `ppt_data_${Date.now()}.json`);
  fs.writeFileSync(tmpJson, JSON.stringify(data, null, 2), 'utf8');

  return new Promise((resolve) => {
    const { cmd, args } = getRunnerCommand();
    const fullArgs = [...args, tmpJson, outputPath, activeScript];

    const proc = spawn(cmd, fullArgs);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => stdout += d.toString());
    proc.stderr.on('data', (d) => stderr += d.toString());

    proc.on('close', (code) => {
      try { fs.unlinkSync(tmpJson); } catch (_) {}

      if (code === 0) {
        try {
          const parsed = JSON.parse(stdout.trim().split('\n').pop());
          resolve(parsed);
        } catch (_) {
          resolve({ success: true, output: outputPath });
        }
      } else {
        resolve({ success: false, error: stderr || stdout || `Process exited with code ${code}` });
      }
    });

    proc.on('error', (err) => {
      try { fs.unlinkSync(tmpJson); } catch (_) {}
      resolve({ success: false, error: err.message });
    });
  });
});

ipcMain.handle('dialog:selectDirectory', async (event, opts) => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: opts?.title || 'Select Folder',
    properties: ['openDirectory', 'createDirectory']
  });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0];
});

ipcMain.handle('dialog:saveFile', async (event, opts) => {
  const res = await dialog.showSaveDialog(mainWindow, {
    title: opts?.title || 'Save PowerPoint Presentation',
    defaultPath: opts?.defaultPath || 'Presentation.pptx',
    filters: [
      { name: 'PowerPoint Presentation', extensions: ['pptx'] }
    ]
  });
  if (res.canceled || !res.filePath) return null;
  return res.filePath;
});

ipcMain.handle('shell:showInFolder', async (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  }
  return false;
});

ipcMain.handle('shell:openPath', async (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    return await shell.openPath(filePath);
  }
  return false;
});

ipcMain.handle('config:get', () => loadConfig());

ipcMain.handle('config:save', (event, cfg) => {
  const ok = saveConfig(cfg);
  if (ok) syncLatestScript();
  return ok;
});

ipcMain.handle('sync:check', () => syncLatestScript());

ipcMain.handle('font:install', () => {
  ensureBanikantaFont();
  return true;
});
