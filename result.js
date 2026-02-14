const PHOTO_KEY = "talse_runner_settle_photo_v1";
const PAYLOAD_KEY = "talse_runner_settle_payload_v2";
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

function removePhoto(){
  localStorage.removeItem(PHOTO_KEY);
  showPhoto("");
  const input = $("#photo");
  if(input) input.value = "";
}

function render(payload){
  const stampText = $("#stampText");
  if(stampText) stampText.textContent = payload?.at ? fmtKoreanStamp(payload.at) : "";

  const wrap = $("#summary");
  if(!payload?.lines?.length){
    wrap.innerHTML = `<div class="pill">정산 데이터가 없어요. 메인에서 30판 채운 뒤 다시 눌러줘요</div>`;
    return;
  }

  const blocks = payload.lines.map((x)=>{
    const name = escapeHTML(x.name);
    const total = `${x.total}점`;
    const goal = `${x.goalCount}번`;
    const re = `${x.reCount}번`;
    const xs = `${x.xCount}번`;
    const ranks = escapeHTML(x.summary);

    return `
      <div class="finalBlock">
        <div class="finalTitle">✨ ${name} ✨</div>
        <div class="finalLine">━━━━━━━━━━━━━━━━━━━━</div>
        <div class="finalRow"><span class="k">최종점수</span><span class="v">→ ${total}</span></div>
        <div class="finalRow"><span class="k">골인 수</span><span class="v">→ ${goal}</span></div>
        <div class="finalRow"><span class="k">리타 수</span><span class="v">→ ${re}</span></div>
        <div class="finalRow"><span class="k">초사 수</span><span class="v">→ ${xs}</span></div>
        <div class="finalRow finalRanks"><span class="k">30판 등수</span><span class="v">→ ${ranks}</span></div>
      </div>
    `;
  }).join("");

  wrap.innerHTML = `<div class="finalList">${blocks}</div>`;
}

function bind(){
  $("#back").onclick = ()=>{ location.href = "index.html"; };
  $("#removePhoto").onclick = removePhoto;

  $("#photo").addEventListener("change", (e)=>{
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
  render(loadPayload());
  showPhoto(loadPhoto());
}

init();
