const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { TranscriptionQueue } = require('./transcriptionQueue');
const { registerIpcHandlers } = require('./ipcHandlers');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  const queue = new TranscriptionQueue((state) => {
    win.webContents.send('queue:update', state);
  });

  registerIpcHandlers({ mainWindow: win, queue });
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
