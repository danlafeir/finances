const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  getConfig: () => ipcRenderer.invoke("settings:get-config"),
  chooseDataDir: () => ipcRenderer.invoke("settings:choose-data-dir"),
  setDataDir: (dir) => ipcRenderer.invoke("settings:set-data-dir", dir),
  setConfig: (config) => ipcRenderer.invoke("settings:set-config", config),
});
