const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopPet', {
  isDesktopApp: true,
  close: () => ipcRenderer.invoke('desktop-pet:close'),
});
