const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chromeAPI", {
  getSettings: () => ipcRenderer.invoke("app:getSettings"),
  getEngines: () => ipcRenderer.invoke("app:getEngines"),
  setEngine: k => ipcRenderer.invoke("app:setEngine", k),

  newTab: url => ipcRenderer.invoke("tabs:new", url),
  closeTab: id => ipcRenderer.invoke("tabs:close", id),
  switchTab: id => ipcRenderer.invoke("tabs:switch", id),
  navigate: (input, id) => ipcRenderer.invoke("tabs:navigate", { id, input }),
  back: id => ipcRenderer.invoke("tabs:back", id),
  forward: id => ipcRenderer.invoke("tabs:forward", id),
  reload: id => ipcRenderer.invoke("tabs:reload", id),
  home: id => ipcRenderer.invoke("tabs:home", id),

  loadExtension: () => ipcRenderer.invoke("load-extension"),

  vpnStatus: () => ipcRenderer.invoke("vpn:status"),
  vpnChooseConfig: () => ipcRenderer.invoke("vpn:chooseConfig"),
  vpnToggle: () => ipcRenderer.invoke("vpn:toggle"),
  vpnOpenInstallPage: () => ipcRenderer.invoke("vpn:openInstallPage"),

  onTabsUpdate: cb => ipcRenderer.on("tabs:update", (_e, data) => cb(data)),
  onNavState: cb => ipcRenderer.on("nav:state", (_e, data) => cb(data))
});
