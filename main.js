const { app, BrowserWindow, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

const RELEASE_URL = 'https://github.com/nuruzade052/-drugsafe-ai/releases/latest';
let mainWindow = null;

function isPortableBuild() {
  return Boolean(process.env.PORTABLE_EXECUTABLE_DIR || process.env.PORTABLE_EXECUTABLE_FILE);
}

function sendUpdateStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:status', payload);
  }
}

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;

autoUpdater.on('checking-for-update', () => sendUpdateStatus({ state: 'checking' }));
autoUpdater.on('update-available', info => sendUpdateStatus({ state: 'available', version: info.version }));
autoUpdater.on('update-not-available', info => sendUpdateStatus({ state: 'current', version: info.version || app.getVersion() }));
autoUpdater.on('download-progress', progress => sendUpdateStatus({
  state: 'downloading',
  percent: Math.round(progress.percent || 0),
  transferred: progress.transferred || 0,
  total: progress.total || 0
}));
autoUpdater.on('update-downloaded', info => sendUpdateStatus({ state: 'downloaded', version: info.version }));
autoUpdater.on('error', error => sendUpdateStatus({ state: 'error', message: error?.message || String(error) }));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1050,
    minHeight: 700,
    show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (app.isPackaged && !isPortableBuild()) {
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 8000);
  }
}

ipcMain.handle('app:get-info', () => ({
  version: app.getVersion(),
  packaged: app.isPackaged,
  portable: isPortableBuild(),
  platform: process.platform,
  releaseUrl: RELEASE_URL
}));

ipcMain.handle('app:open-external', async (_event, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('updater:check', async () => {
  if (!app.isPackaged) return { state: 'development' };
  if (isPortableBuild()) {
    await shell.openExternal(RELEASE_URL);
    return { state: 'portable-external' };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return { state: 'checking', version: result?.updateInfo?.version || null };
  } catch (error) {
    return { state: 'error', message: error?.message || String(error) };
  }
});

ipcMain.handle('updater:download', async () => {
  if (!app.isPackaged || isPortableBuild()) return { state: 'unsupported' };
  try {
    await autoUpdater.downloadUpdate();
    return { state: 'downloading' };
  } catch (error) {
    return { state: 'error', message: error?.message || String(error) };
  }
});

ipcMain.handle('updater:install', () => {
  if (!app.isPackaged || isPortableBuild()) return { state: 'unsupported' };
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return { state: 'installing' };
});

app.whenReady().then(() => {
  app.setAppUserModelId('com.drugsafeai.desktop');
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
