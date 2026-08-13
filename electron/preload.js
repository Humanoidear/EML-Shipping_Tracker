const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  isElectron: true,
  onBackendError: (callback) => {
    ipcRenderer.on("backend-error", (_event, message) => callback(message));
  },
  reload: () => ipcRenderer.send("app-reload"),
});
