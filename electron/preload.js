const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  getConfig: () => ipcRenderer.invoke("settings:get-config"),
  setConfig: (config) => ipcRenderer.invoke("settings:set-config", config),
});
