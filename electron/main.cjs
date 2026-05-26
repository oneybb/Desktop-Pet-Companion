const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');

const isDev = !app.isPackaged;

function createWidgetWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const windowWidth = 360;
  const windowHeight = 420;

  const widgetWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: width - windowWidth - 32,
    y: height - windowHeight - 32,
    frame: false,
    transparent: true,
    resizable: true,
    minWidth: 260,
    minHeight: 300,
    alwaysOnTop: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    title: 'Desktop Pet Companion',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  widgetWindow.setAlwaysOnTop(true, 'floating');

  if (isDev) {
    widgetWindow.loadURL('http://localhost:3000?widget=1');
  } else {
    widgetWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
      query: { widget: '1' },
    });
  }
}

app.whenReady().then(() => {
  createWidgetWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWidgetWindow();
    }
  });
});

ipcMain.handle('desktop-pet:close', () => {
  app.quit();
});

ipcMain.on('desktop-pet:move-window-by', (event, { dx, dy }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || typeof dx !== 'number' || typeof dy !== 'number') return;
  const [x, y] = win.getPosition();
  win.setPosition(Math.round(x + dx), Math.round(y + dy));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
