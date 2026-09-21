const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // PPT Generation
  mathPptGenerate: (data) => ipcRenderer.invoke('math-ppt:generate', data),
  
  // File dialogs & Explorer
  selectDirectory: (opts) => ipcRenderer.invoke('dialog:selectDirectory', opts),
  saveFile: (opts) => ipcRenderer.invoke('dialog:saveFile', opts),
  showInFolder: (filePath) => ipcRenderer.invoke('shell:showInFolder', filePath),
  openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),
  
  // GitHub Live Script Sync & Config
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (cfg) => ipcRenderer.invoke('config:save', cfg),
  checkSync: () => ipcRenderer.invoke('sync:check'),
  onSyncStatus: (callback) => {
    ipcRenderer.on('sync:status', (event, status) => callback(status));
  },
  
  // Font auto-install
  installFont: () => ipcRenderer.invoke('font:install')
});
