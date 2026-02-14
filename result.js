const PHOTO_KEY = "talse_runner_settle_photo_v1";
const PAYLOAD_KEY = "talse_runner_settle_payload_v1";
const THEME_KEY = "talse_runner_theme_v1";

const $ = (s)=>document.querySelector(s);

function setTheme(theme){
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
}

function fmtKoreanStamp(iso){
  const d = new Date(iso.replace(" ", "T"));
  const y = d.getFullYear();
  const mo = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  const h = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  const s = String(d.getSeconds()).padStart(2,"0");
  return `${y}년 ${mo}월 ${da}일 ${h}시 ${mi}분 ${s}초`;
}

function escapeHTML(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function loadPayload(){
  try{
    const raw = localStorage.getItem(PAYLOAD_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch{
    return null;
  }
}

function loadPhoto(){
  return localStorage.getItem(PHOTO_KEY) || "";
}

function showPhoto(dataUrl){
  const box = $("#photoBox");
  const img = $("#photoImg");
  if(!dataUrl){
    box.classList.add("hidden");
    img.src = "";
    return;
  }
  img.src = dataUrl;
  box.classList.remove("hidden");
}

function render(payload){
  $("#stamp").textContent = payload?.at ? fmtKoreanStamp(payload.at) : "";

  const wrap = $("#summary");
  if(!payload?.lines?.length){
    wrap.innerHTML = `<div class="pill">정산 데이터가 없어요. 메인에서 30판 채운 뒤 다시 눌러줘요</div>`;
    return;
  }

  const lines = payload.lines.map(x=>{
    return `<div class="pill" style="display:flex;gap:10px;justify-content:space-between;align-items:center;">
      <div style="font-weight:700">${escapeHTML(x.name)}</div>
      <div style="opacity:.9;flex:1;text-align:left;padding-left:12px;">30판 등수 : ${escapeHTML(x.summary)}</div>
      <div style="font-weight:800">${x.total}점</div>
    </div>`;
  }).join("");

  wrap.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;">${lines}</div>`;
}

function bind(){
  $("#back").onclick = ()=>history.back();

  $("#photo").addEventListener("change", async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const url = String(reader.result || "");
      localStorage.setItem(PHOTO_KEY, url);
      showPhoto(url);
    };
    reader.readAsDataURL(f);
  });
}

function init(){
  setTheme(localStorage.getItem(THEME_KEY) || "dark");
  bind();
  const payload = loadPayload();
  render(payload);
  showPhoto(loadPhoto());
}

init();
