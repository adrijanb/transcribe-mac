const { ipcMain, dialog, shell } = require('electron');
const pythonEnv = require('./pythonEnv');
const ffmpegCheck = require('./ffmpegCheck');

function registerIpcHandlers({ mainWindow, queue }) {
  ipcMain.handle('env:getStatus', () => ({
    ffmpegAvailable: ffmpegCheck.isFfmpegAvailable(),
    venvReady: pythonEnv.isVenvReady(),
  }));

  ipcMain.handle('queue:addFiles', (_event, filePaths) => {
    queue.addFiles(filePaths);
    return queue.getState();
  });

  ipcMain.handle('queue:removeFile', (_event, id) => {
    queue.removeFile(id);
    return queue.getState();
  });

  ipcMain.handle('queue:start', (_event, opts) => {
    queue.start(opts || {});
    return queue.getState();
  });

  ipcMain.handle('queue:stop', () => {
    queue.stop();
    return queue.getState();
  });

  ipcMain.handle('dialog:chooseOutputFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('dialog:chooseInputFiles', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Audio/Video',
          extensions: [
            'mp4', 'mov', 'm4v', 'mkv', 'avi', 'webm', 'wmv', 'flv',
            'mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'wma', 'aiff', 'aif',
          ],
        },
      ],
    });
    if (result.canceled) return [];
    return result.filePaths;
  });

  ipcMain.handle('shell:openPath', (_event, targetPath) => shell.openPath(targetPath));

  ipcMain.handle('shell:showInFolder', (_event, targetPath) => {
    shell.showItemInFolder(targetPath);
  });
}

module.exports = { registerIpcHandlers };
