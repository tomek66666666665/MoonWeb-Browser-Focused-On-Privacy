const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("homeAPI", {
  getSettings: () => ipcRenderer.invoke("app:getSettings"),
  getEngines: () => ipcRenderer.invoke("app:getEngines"),
  setEngine: k => ipcRenderer.invoke("app:setEngine", k),
  navigate: input => ipcRenderer.invoke("tabs:navigate", { id: null, input })
});
