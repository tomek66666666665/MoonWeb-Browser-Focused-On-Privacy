const {app,BrowserWindow,WebContentsView,session,ipcMain,dialog}=require("electron");
const path=require("path");

let win;
let browserView;
let homeVisible=true;

const BLOCKED=[
  "doubleclick.net","googlesyndication.com","googleadservices.com","googletagmanager.com",
  "facebook.net","connect.facebook.net","analytics.twitter.com","ads.linkedin.com",
  "bat.bing.com","clarity.ms","hotjar.com","segment.com","mixpanel.com","amplitude.com",
  "scorecardresearch.com","quantserve.com","taboola.com","outbrain.com","criteo.com",
  "amazon-adsystem.com"
];

function blocked(url){
  try{
    const h=new URL(url).hostname.toLowerCase();
    return BLOCKED.some(d=>h===d||h.endsWith("."+d));
  }catch{return false;}
}

function setupPrivacy(){
  const s=session.defaultSession;
  s.webRequest.onBeforeRequest({urls:["*://*/*"]},(d,cb)=>cb({cancel:blocked(d.url)}));
  s.webRequest.onBeforeSendHeaders({urls:["*://*/*"]},(d,cb)=>{
    const h={...d.requestHeaders};
    delete h.Referer; delete h.referrer;
    delete h["X-Client-Data"]; delete h["x-client-data"];
    cb({requestHeaders:h});
  });
  s.setPermissionRequestHandler((_w,_p,cb)=>cb(false));
  s.setPermissionCheckHandler(()=>false);
}

function layout(){
  if(!browserView || !win) return;
  const [w,h]=win.getContentSize();
  // Keep the browser page below the native window titlebar.
  browserView.setBounds({x:0,y:38,width:w,height:Math.max(0,h-38)});
}

function showBrowser(url){
  homeVisible=false;
  if(!browserView){
    browserView=new WebContentsView({
      webPreferences:{
        contextIsolation:true,
        sandbox:true,
        nodeIntegration:false,
        spellcheck:false
      }
    });
    win.contentView.addChildView(browserView);
    layout();
  }
  browserView.webContents.loadURL(url);
  browserView.setVisible(true);
}

function showHome(){
  homeVisible=true;
  if(browserView) browserView.setVisible(false);
  win.loadFile(path.join(__dirname,"index.html"));
}

function create(){
  win=new BrowserWindow({
    width:1280,height:820,minWidth:900,minHeight:600,
    backgroundColor:"#08090c",
    titleBarStyle:"hidden",
    titleBarOverlay:{color:"#08090c",symbolColor:"#777b86",height:34},
    webPreferences:{
      preload:path.join(__dirname,"preload.js"),
      contextIsolation:true,sandbox:true,nodeIntegration:false,
      spellcheck:false
    }
  });
  win.loadFile(path.join(__dirname,"index.html"));
  win.on("resize",layout);
  win.on("closed",()=>{win=null;browserView=null;});
}

ipcMain.handle("navigate",(_,u)=>{
  if(!/^https?:\/\//i.test(u)) return false;
  showBrowser(u); return true;
});
ipcMain.handle("home",()=>{showHome();return true;});
ipcMain.handle("back",()=>browserView?.webContents.canGoBack()&&browserView.webContents.goBack());
ipcMain.handle("forward",()=>browserView?.webContents.canGoForward()&&browserView.webContents.goForward());

ipcMain.handle("choose-vpn",async()=>{
  const r=await dialog.showOpenDialog(win,{
    title:"Select WireGuard configuration",
    properties:["openFile"],
    filters:[{name:"WireGuard configuration",extensions:["conf"]}]
  });
  return r.canceled?null:r.filePaths[0];
});

ipcMain.handle("load-extension",async()=>{
  const r=await dialog.showOpenDialog(win,{title:"Load unpacked extension",properties:["openDirectory"]});
  if(r.canceled)return null;
  try{
    const e=await session.defaultSession.loadExtension(r.filePaths[0]);
    return {name:e.name,id:e.id};
  }catch(e){return {error:e.message};}
});

app.whenReady().then(()=>{setupPrivacy();create();});
app.on("window-all-closed",()=>app.quit());
