const {contextBridge,ipcRenderer}=require("electron");
contextBridge.exposeInMainWorld("moon",{
  navigate:u=>ipcRenderer.invoke("navigate",u),
  home:()=>ipcRenderer.invoke("home"),
  back:()=>ipcRenderer.invoke("back"),
  forward:()=>ipcRenderer.invoke("forward"),
  chooseVPN:()=>ipcRenderer.invoke("choose-vpn"),
  loadExtension:()=>ipcRenderer.invoke("load-extension")
});
