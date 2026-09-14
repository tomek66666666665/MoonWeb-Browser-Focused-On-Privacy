const $ = x => document.getElementById(x);
let activeId = null;
let lastTabsList = [];
let engines = {};

function toast(s, ms = 3200) {
  const t = $("toast");
  t.textContent = s;
  t.classList.add("show");
  clearTimeout(window._tt);
  window._tt = setTimeout(() => t.classList.remove("show"), ms);
}

function faviconLetter(title, url) {
  if (!url) return "☾";
  try { return new URL(url).hostname.replace("www.", "")[0].toUpperCase(); } catch { return "•"; }
}

function renderTabs({ list, activeId: aid }) {
  lastTabsList = list;
  activeId = aid;
  $("tabs").innerHTML = list.map(t => `
    <div class="tab ${t.id === aid ? "active" : ""}" data-id="${t.id}">
      <span class="favicon">${t.isHome ? "☾" : faviconLetter(t.title, t.url)}</span>
      <span class="title">${escapeHtml(t.title || "New Tab")}</span>
      <span class="close" data-close="${t.id}">×</span>
    </div>`).join("");

  const active = list.find(t => t.id === aid);
  if (active && document.activeElement !== $("addr")) {
    $("addr").value = active.isHome ? "" : active.url;
    $("addr").placeholder = active.isHome ? "Search or enter address" : active.url;
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

$("tabs").addEventListener("click", e => {
  const closeId = e.target.dataset.close;
  if (closeId) { window.chromeAPI.closeTab(Number(closeId)); return; }
  const tabEl = e.target.closest(".tab");
  if (tabEl) window.chromeAPI.switchTab(Number(tabEl.dataset.id));
});
$("newtab").onclick = () => window.chromeAPI.newTab(null);

$("back").onclick = () => window.chromeAPI.back();
$("fwd").onclick = () => window.chromeAPI.forward();
$("reload").onclick = () => window.chromeAPI.reload();
$("homebtn").onclick = () => window.chromeAPI.home();

$("addr").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const v = e.target.value.trim();
    if (v) window.chromeAPI.navigate(v);
    e.target.blur();
  }
});

function renderNavState(s) {
  $("back").disabled = !s.canBack;
  $("fwd").disabled = !s.canForward;
  $("reload").textContent = s.loading ? "×" : "⟳";
  $("addrlock").style.opacity = s.url.startsWith("https://") ? "1" : "0.3";
  if (document.activeElement !== $("addr")) $("addr").value = s.url;
}

// ---------- menu / engines ----------
function renderEngineMenu(currentKey) {
  $("menu-engines").innerHTML = Object.entries(engines).map(([k, e]) => `
    <button class="engine-row ${k === currentKey ? "selected" : ""}" data-engine="${k}">
      <span class="engine-name">${e.name}</span>
      <span class="engine-tag ${e.privacy}">${e.privacy === "low" ? "lower privacy" : e.privacy === "medium" ? "some tracking" : "privacy-focused"}</span>
    </button>`).join("");
}

async function refreshMenu() {
  const settings = await window.chromeAPI.getSettings();
  renderEngineMenu(settings.engine);
}

$("menubtn").onclick = async () => {
  await refreshMenu();
  $("menu").classList.toggle("hidden");
};
document.addEventListener("click", e => {
  if (!$("menu").contains(e.target) && e.target !== $("menubtn")) $("menu").classList.add("hidden");
});
$("menu-engines").addEventListener("click", async e => {
  const row = e.target.closest(".engine-row");
  if (!row) return;
  const key = row.dataset.engine;
  await window.chromeAPI.setEngine(key);
  toast("Default search engine set to " + engines[key].name);
  refreshMenu();
});
$("menu-ext").onclick = async () => {
  const r = await window.chromeAPI.loadExtension();
  if (r?.error) toast(r.error);
  else if (r) toast("Loaded extension: " + r.name);
  $("menu").classList.add("hidden");
};
$("menu-about").onclick = () => {
  toast("MoonWeb blocks known ad/analytics hosts, strips referrer and client-data headers, and denies camera/mic/location prompts by default.", 5000);
  $("menu").classList.add("hidden");
};

// ---------- VPN ----------
async function refreshVpn() {
  const s = await window.chromeAPI.vpnStatus();
  const btn = $("vpnbtn");
  btn.classList.toggle("off", !s.connected);
  btn.classList.toggle("on", !!s.connected);
  $("vpnlabel").textContent = s.connected ? "VPN On" : (s.configName ? "VPN Off" : "Set up VPN");
}
$("vpnbtn").onclick = async () => {
  const s = await window.chromeAPI.vpnStatus();
  if (!s.configName) {
    const chosen = await window.chromeAPI.vpnChooseConfig();
    if (chosen) toast("Config \"" + chosen.configName + "\" saved. Click VPN again to connect.");
    refreshVpn();
    return;
  }
  const r = await window.chromeAPI.vpnToggle();
  if (r?.error) toast(r.error, 5200);
  refreshVpn();
};
$("menu-vpnconfig").onclick = async () => {
  const chosen = await window.chromeAPI.vpnChooseConfig();
  if (chosen) toast("Config \"" + chosen.configName + "\" saved.");
  refreshVpn();
  $("menu").classList.add("hidden");
};
$("menu-vpninstall").onclick = () => { window.chromeAPI.vpnOpenInstallPage(); $("menu").classList.add("hidden"); };

// ---------- boot ----------
(async () => {
  engines = await window.chromeAPI.getEngines();
  window.chromeAPI.onTabsUpdate(renderTabs);
  window.chromeAPI.onNavState(renderNavState);
  refreshVpn();
  setInterval(refreshVpn, 4000);
})();
