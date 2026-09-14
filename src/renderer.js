const E={
 moon:["☾","MoonWeb","Private","safe","MoonWeb search route."],
 duck:["🦆","DuckDuckGo","Strong privacy","safe","Privacy-focused search."],
 brave:["🦁","Brave Search","Privacy-focused","safe","Privacy-focused search engine."],
 google:["G","Google","Lower privacy","bad","Search/activity data may be collected and used for personalization and advertising."],
 bing:["b","Bing","Lower privacy","bad","Microsoft services collect data; review privacy settings."]
};
let cur="moon";
const $=x=>document.getElementById(x);

function draw(){
 $("engines").innerHTML=Object.entries(E).map(([k,e])=>
 `<div class="item" data-k="${k}"><span>${e[0]}</span><b>${e[1]}</b><span class="tag ${e[3]}">${e[2]}</span><small>${e[4]}</small></div>`
 ).join("");
}
function pick(k){
 cur=k;
 $("ei").textContent=E[k][0];
 $("en").textContent=E[k][1];
 $("engines").innerHTML="";
}
function search(){
 const q=$("q").value.trim();
 if(!q)return;
 const urls={
  moon:"https://www.google.com/search?q=",
  duck:"https://duckduckgo.com/?q=",
  brave:"https://search.brave.com/search?q=",
  google:"https://www.google.com/search?q=",
  bing:"https://www.bing.com/search?q="
 };
 const u=/^https?:\/\//i.test(q)?q:urls[cur]+encodeURIComponent(q);
 window.moon.navigate(u);
}
$("engine").onclick=()=>{draw();$("engines").classList.toggle("open")};
$("engines").onclick=e=>{const x=e.target.closest(".item");if(x)pick(x.dataset.k)};
$("go").onclick=search;
$("q").onkeydown=e=>{if(e.key==="Enter")search()};
$("vpn").onclick=()=>toast("VPN is not connected. Select a real WireGuard provider/profile instead of showing a fake VPN status.");
$("info").onclick=()=>toast("MoonWeb blocks known ad/analytics hosts, strips referrer and X-Client-Data headers, and denies web permissions.");
$("ext").onclick=async()=>{
 const r=await window.moon.loadExtension();
 if(r?.error)toast(r.error);
 else if(r)toast("Loaded "+r.name);
};
$("chrome").onclick=()=>window.moon.navigate("https://chromewebstore.google.com/");
$("menu").onclick=()=>toast("MoonWeb uses a bundled Chromium runtime. No Microsoft Edge install is required.");
function toast(s){
 const t=$("toast"); t.textContent=s; t.classList.add("show");
 clearTimeout(window.tt); window.tt=setTimeout(()=>t.classList.remove("show"),3200);
}
pick("moon");
