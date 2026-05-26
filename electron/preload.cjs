const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopPet', {
  isDesktopApp: true,
  close: () => ipcRenderer.invoke('desktop-pet:close'),
  moveWindowBy: (dx, dy) => ipcRenderer.send('desktop-pet:move-window-by', { dx, dy }),
});
