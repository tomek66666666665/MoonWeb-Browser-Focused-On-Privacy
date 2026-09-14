const $ = x => document.getElementById(x);
let engines = {};
let current = "duck";

function tagLabel(p) { return p === "low" ? "lower privacy" : p === "medium" ? "some tracking" : "privacy-focused"; }

function drawDropdown() {
  $("engines").innerHTML = Object.entries(engines).map(([k, e]) => `
    <div class="item" data-k="${k}">
      <span>${e.short}</span>
      <b>${e.name}</b>
      <span class="tag ${e.privacy}">${tagLabel(e.privacy)}</span>
    </div>`).join("");
}

async function pick(k, { silent } = {}) {
  current = k;
  $("en").textContent = engines[k].name;
  $("engines").innerHTML = "";
  $("engines").classList.remove("open");
  await window.homeAPI.setEngine(k);
  if (!silent) toast("Searches now use " + engines[k].name);
}

function toast(s) {
  let t = document.getElementById("hometoast");
  if (!t) {
    t = document.createElement("div");
    t.id = "hometoast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = s;
  t.classList.add("show");
  clearTimeout(window._tt);
  window._tt = setTimeout(() => t.classList.remove("show"), 2600);
}

function search() {
  const q = $("q").value.trim();
  if (!q) return;
  window.homeAPI.navigate(q);
}

$("engine").onclick = () => { drawDropdown(); $("engines").classList.toggle("open"); };
$("engines").onclick = e => { const x = e.target.closest(".item"); if (x) pick(x.dataset.k); };
$("go").onclick = search;
$("q").onkeydown = e => { if (e.key === "Enter") search(); };
$("changeengine").onclick = () => { drawDropdown(); $("engines").classList.add("open"); };

function drawOnboard() {
  $("ob-list").innerHTML = Object.entries(engines).map(([k, e]) => `
    <button class="ob-item" data-k="${k}">
      <span class="ob-name">${e.name}</span>
      <span class="tag ${e.privacy}">${tagLabel(e.privacy)}</span>
    </button>`).join("");
}
$("ob-list").addEventListener("click", async e => {
  const b = e.target.closest(".ob-item");
  if (!b) return;
  await pick(b.dataset.k, { silent: true });
  $("onboard").classList.add("hidden");
});

(async () => {
  engines = await window.homeAPI.getEngines();
  const settings = await window.homeAPI.getSettings();
  current = settings.engine;
  $("en").textContent = engines[current].name;
  if (!settings.onboarded) {
    drawOnboard();
    $("onboard").classList.remove("hidden");
  }
})();
