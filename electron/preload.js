const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  getPlaidSettings: () => ipcRenderer.invoke("settings:get-plaid"),
  setPlaidSettings: (creds) => ipcRenderer.invoke("settings:set-plaid", creds),
});
