const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('drugSafeDesktop', {
  getInfo: () => ipcRenderer.invoke('app:get-info'),
  openExternal: url => ipcRenderer.invoke('app:open-external', url),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateStatus: callback => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('update:status', handler);
    return () => ipcRenderer.removeListener('update:status', handler);
  }
});
