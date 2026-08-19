const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getPathForFile: (file) => webUtils.getPathForFile(file),
  addFiles: (paths) => ipcRenderer.invoke('queue:addFiles', paths),
  removeFile: (id) => ipcRenderer.invoke('queue:removeFile', id),
  chooseOutputFolder: () => ipcRenderer.invoke('dialog:chooseOutputFolder'),
  chooseInputFiles: () => ipcRenderer.invoke('dialog:chooseInputFiles'),
  startQueue: (opts) => ipcRenderer.invoke('queue:start', opts),
  stopQueue: () => ipcRenderer.invoke('queue:stop'),
  openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
  showInFolder: (p) => ipcRenderer.invoke('shell:showInFolder', p),
  getEnvStatus: () => ipcRenderer.invoke('env:getStatus'),
  onQueueUpdate: (cb) => ipcRenderer.on('queue:update', (_e, state) => cb(state)),
});
