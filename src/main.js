const { app, BrowserWindow, WebContentsView, session, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");

const TAB_ROW_H = 40;
const TOOL_ROW_H = 44;
const CHROME_H = TAB_ROW_H + TOOL_ROW_H;

const SETTINGS_PATH = path.join(app.getPath("userData"), "moonweb-settings.json");

const ENGINES = {
  duck:  { name: "DuckDuckGo",   short: "DDG", url: "https://duckduckgo.com/?q=",              privacy: "high" },
  brave: { name: "Brave Search", short: "BR",  url: "https://search.brave.com/search?q=",       privacy: "high" },
  start: { name: "Startpage",    short: "SP",  url: "https://www.startpage.com/sp/search?query=", privacy: "high" },
  ecosia:{ name: "Ecosia",       short: "EC",  url: "https://www.ecosia.org/search?q=",          privacy: "medium" },
  google:{ name: "Google",       short: "G",   url: "https://www.google.com/search?q=",          privacy: "low" }
};

function loadSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf8");
    const s = JSON.parse(raw);
    if (!ENGINES[s.engine]) s.engine = "duck";
    return { engine: "duck", onboarded: false, vpnConfigPath: null, vpnTunnelName: null, vpnConnected: false, ...s };
  } catch {
    return { engine: "duck", onboarded: false, vpnConfigPath: null, vpnTunnelName: null, vpnConnected: false };
  }
}
function saveSettings(s) {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2));
}
let settings = loadSettings();

let win;
let chromeView;
let tabs = new Map(); // id -> { view, title, url, isHome }
let order = [];       // tab id order
let activeId = null;
let nextId = 1;

const BLOCKED = [
  "doubleclick.net","googlesyndication.com","googleadservices.com","googletagmanager.com",
  "facebook.net","connect.facebook.net","analytics.twitter.com","ads.linkedin.com",
  "bat.bing.com","clarity.ms","hotjar.com","segment.com","mixpanel.com","amplitude.com",
  "scorecardresearch.com","quantserve.com","taboola.com","outbrain.com","criteo.com",
  "amazon-adsystem.com"
];
function blockedHost(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return BLOCKED.some(d => h === d || h.endsWith("." + d));
  } catch { return false; }
}
function setupPrivacy() {
  const s = session.defaultSession;
  s.webRequest.onBeforeRequest({ urls: ["*://*/*"] }, (d, cb) => cb({ cancel: blockedHost(d.url) }));
  s.webRequest.onBeforeSendHeaders({ urls: ["*://*/*"] }, (d, cb) => {
    const h = { ...d.requestHeaders };
    delete h.Referer; delete h.referrer;
    delete h["X-Client-Data"]; delete h["x-client-data"];
    cb({ requestHeaders: h });
  });
  s.setPermissionRequestHandler((_w, _p, cb) => cb(false));
  s.setPermissionCheckHandler(() => false);
}

function homeURL() {
  return "file://" + path.join(__dirname, "home.html");
}

function layout() {
  if (!win) return;
  const [w, h] = win.getContentSize();
  if (chromeView) chromeView.setBounds({ x: 0, y: 0, width: w, height: CHROME_H });
  const active = tabs.get(activeId);
  if (active) active.view.setBounds({ x: 0, y: CHROME_H, width: w, height: Math.max(0, h - CHROME_H) });
}

function sendTabsUpdate() {
  if (!chromeView) return;
  const list = order.map(id => {
    const t = tabs.get(id);
    return { id, title: t.title || (t.isHome ? "New Tab" : "Loading..."), url: t.url || "", isHome: t.isHome };
  });
  chromeView.webContents.send("tabs:update", { list, activeId });
}

function makeTabView() {
  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
      preload: path.join(__dirname, "tab-preload.js")
    }
  });
  return view;
}

function createTab(url) {
  const id = nextId++;
  const view = makeTabView();
  const isHome = !url;
  const entry = { view, title: isHome ? "New Tab" : "", url: url || "", isHome };
  tabs.set(id, entry);
  order.push(id);

  view.webContents.on("page-title-updated", (_e, title) => { entry.title = title; sendTabsUpdate(); });
  view.webContents.on("did-navigate", (_e, u) => { entry.url = u; entry.isHome = u.startsWith("file://"); sendTabsUpdate(); if (activeId === id) sendNavState(); });
  view.webContents.on("did-navigate-in-page", (_e, u) => { entry.url = u; sendTabsUpdate(); if (activeId === id) sendNavState(); });
  view.webContents.setWindowOpenHandler(({ url }) => { createTab(url); return { action: "deny" }; });

  win.contentView.addChildView(view);
  view.webContents.loadURL(url || homeURL());

  switchTab(id);
  return id;
}

function switchTab(id) {
  if (!tabs.has(id)) return;
  if (activeId !== null && tabs.has(activeId)) tabs.get(activeId).view.setVisible(false);
  activeId = id;
  tabs.get(id).view.setVisible(true);
  layout();
  sendTabsUpdate();
  sendNavState();
}

function closeTab(id) {
  if (!tabs.has(id)) return;
  const idx = order.indexOf(id);
  const entry = tabs.get(id);
  win.contentView.removeChildView(entry.view);
  entry.view.webContents.close();
  tabs.delete(id);
  order.splice(idx, 1);

  if (order.length === 0) {
    createTab(null);
    return;
  }
  if (activeId === id) {
    const next = order[Math.min(idx, order.length - 1)];
    switchTab(next);
  } else {
    sendTabsUpdate();
  }
}

function sendNavState() {
  const t = tabs.get(activeId);
  if (!t || !chromeView) return;
  chromeView.webContents.send("nav:state", {
    canBack: t.view.webContents.navigationHistory ? t.view.webContents.navigationHistory.canGoBack() : t.view.webContents.canGoBack(),
    canForward: t.view.webContents.navigationHistory ? t.view.webContents.navigationHistory.canGoForward() : t.view.webContents.canGoForward(),
    url: t.isHome ? "" : t.url,
    loading: t.view.webContents.isLoading()
  });
}

function create() {
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 960, minHeight: 620,
    backgroundColor: "#0a0b0f",
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#0a0b0f", symbolColor: "#9a9fae", height: TAB_ROW_H },
    webPreferences: { contextIsolation: true, sandbox: true }
  });

  chromeView = new WebContentsView({
    webPreferences: {
      contextIsolation: true, sandbox: true, nodeIntegration: false,
      preload: path.join(__dirname, "chrome-preload.js")
    }
  });
  win.contentView.addChildView(chromeView);
  chromeView.webContents.loadFile(path.join(__dirname, "chrome.html"));
  chromeView.webContents.once("did-finish-load", () => {
    createTab(null);
    layout();
    sendTabsUpdate();
  });

  win.on("resize", layout);
  win.on("closed", () => { win = null; chromeView = null; tabs.clear(); order = []; activeId = null; });
}

// ---------- chrome -> main IPC ----------
ipcMain.handle("app:getSettings", () => settings);
ipcMain.handle("app:setEngine", (_e, key) => {
  if (!ENGINES[key]) return settings;
  settings.engine = key;
  settings.onboarded = true;
  saveSettings(settings);
  return settings;
});
ipcMain.handle("app:getEngines", () => ENGINES);

ipcMain.handle("tabs:new", (_e, url) => createTab(url || null));
ipcMain.handle("tabs:close", (_e, id) => closeTab(id));
ipcMain.handle("tabs:switch", (_e, id) => switchTab(id));
ipcMain.handle("tabs:navigate", (_e, { id, input }) => {
  const t = tabs.get(id ?? activeId);
  if (!t) return;
  let target = input.trim();
  const looksLikeUrl = /^https?:\/\//i.test(target) || /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(target);
  if (!/^https?:\/\//i.test(target)) {
    target = looksLikeUrl ? "https://" + target : ENGINES[settings.engine].url + encodeURIComponent(target);
  }
  t.view.webContents.loadURL(target);
});
ipcMain.handle("tabs:back", (_e, id) => { const t = tabs.get(id ?? activeId); if (t?.view.webContents.canGoBack()) t.view.webContents.goBack(); });
ipcMain.handle("tabs:forward", (_e, id) => { const t = tabs.get(id ?? activeId); if (t?.view.webContents.canGoForward()) t.view.webContents.goForward(); });
ipcMain.handle("tabs:reload", (_e, id) => { const t = tabs.get(id ?? activeId); t?.view.webContents.reload(); });
ipcMain.handle("tabs:home", (_e, id) => { const t = tabs.get(id ?? activeId); t?.view.webContents.loadURL(homeURL()); });
ipcMain.handle("tabs:getActive", () => activeId);

ipcMain.handle("load-extension", async () => {
  const r = await dialog.showOpenDialog(win, { title: "Load unpacked extension", properties: ["openDirectory"] });
  if (r.canceled) return null;
  try {
    const e = await session.defaultSession.loadExtension(r.filePaths[0]);
    return { name: e.name, id: e.id };
  } catch (e) { return { error: e.message }; }
});

// ---------- Real WireGuard VPN integration ----------
// Requires the free WireGuard client (wireguard.com/install) and a config file
// from any WireGuard-compatible provider (many have free tiers, e.g. ProtonVPN
// Free, Windscribe Free). We orchestrate the official wireguard.exe CLI on
// Windows; there is no way to ship a working VPN backend without a real
// provider behind it, so this never pretends to be "connected" without a
// real tunnel service running.
function wireguardExePath() {
  const candidates = [
    "C:\\Program Files\\WireGuard\\wireguard.exe",
    "C:\\Program Files (x86)\\WireGuard\\wireguard.exe"
  ];
  return candidates.find(p => fs.existsSync(p)) || null;
}

ipcMain.handle("vpn:status", () => ({
  configName: settings.vpnTunnelName,
  connected: settings.vpnConnected,
  wireguardInstalled: process.platform === "win32" ? !!wireguardExePath() : null
}));

ipcMain.handle("vpn:chooseConfig", async () => {
  const r = await dialog.showOpenDialog(win, {
    title: "Select a WireGuard configuration (.conf) from your VPN provider",
    properties: ["openFile"],
    filters: [{ name: "WireGuard configuration", extensions: ["conf"] }]
  });
  if (r.canceled) return null;
  const filePath = r.filePaths[0];
  const tunnelName = path.basename(filePath, ".conf");
  settings.vpnConfigPath = filePath;
  settings.vpnTunnelName = tunnelName;
  settings.vpnConnected = false;
  saveSettings(settings);
  return { configName: tunnelName };
});

ipcMain.handle("vpn:toggle", async () => {
  if (process.platform !== "win32") {
    return { error: "Automatic VPN control is only wired up for Windows in this build. On other platforms, run wg-quick with your provider's config from a terminal." };
  }
  const exe = wireguardExePath();
  if (!exe) {
    return { error: "WireGuard isn't installed. Get the free official client at wireguard.com/install, then pick a config from your provider." };
  }
  if (!settings.vpnConfigPath || !fs.existsSync(settings.vpnConfigPath)) {
    return { error: "No config selected yet. Choose a .conf file from your VPN provider first." };
  }
  const wantConnect = !settings.vpnConnected;
  return new Promise(resolve => {
    const args = wantConnect
      ? ["/installtunnelservice", settings.vpnConfigPath]
      : ["/uninstalltunnelservice", settings.vpnTunnelName];
    execFile(exe, args, { windowsHide: false }, err => {
      if (err) { resolve({ error: "WireGuard reported an error: " + err.message }); return; }
      settings.vpnConnected = wantConnect;
      saveSettings(settings);
      resolve({ connected: settings.vpnConnected, configName: settings.vpnTunnelName });
    });
  });
});

ipcMain.handle("vpn:openInstallPage", () => shell.openExternal("https://www.wireguard.com/install/"));

app.whenReady().then(() => { setupPrivacy(); create(); });
app.on("window-all-closed", () => app.quit());
