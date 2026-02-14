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

function fmtDiff(n){
  if(n === 0) return "±0";
  return n > 0 ? `+${n}` : `${n}`;
}

function mvpBadge(idx){
  return idx === 0 ? `<span class="mvp">👑 MVP</span>` : "";
}

function render(payload){
  const stampText = $("#stampText");
  if(stampText) stampText.textContent = payload?.at ? fmtKoreanStamp(payload.at) : "";

  const wrap = $("#summary");
  if(!payload?.lines?.length){
    wrap.innerHTML = `<div class="pill">정산 데이터가 없어요. 메인에서 30판 채운 뒤 다시 눌러줘요</div>`;
    return;
  }

  const lines = payload.lines;

  const cards = lines.map((x, idx)=>{
    const isTop = idx === 0 ? "mvpCard" : "";
    const diff = idx === 0 ? "" : `<span class="delta">(${fmtDiff(x.diffFromFirst)}점)</span>`;

    const bestRankTxt = x.bestRank ? `${x.bestRank}등` : "-";
    const bestCountTxt = x.bestRank ? `${x.bestCount}회` : "-";

    return `
      <div class="resultCard ${isTop}">
        <div class="resultTop">
          <div class="name">${escapeHTML(x.name)} ${mvpBadge(idx)}</div>
          <div class="score">${x.total}점 ${diff}</div>
        </div>

        <div class="miniStats">
          <div class="miniBox">
            <div class="k">최고 등수</div>
            <div class="v">${bestRankTxt} <span class="subv">(${bestCountTxt})</span></div>
          </div>
          <div class="miniBox">
            <div class="k">골인</div>
            <div class="v">${x.goalCount}회</div>
          </div>
          <div class="miniBox">
            <div class="k">리타</div>
            <div class="v">${x.reCount}회</div>
          </div>
          <div class="miniBox">
            <div class="k">초사</div>
            <div class="v">${x.xCount}회</div>
          </div>
        </div>

        <div class="rankSummary">30판 등수 : ${escapeHTML(x.summary)}</div>
      </div>
    `;
  }).join("");

  wrap.innerHTML = `<div class="resultList">${cards}</div>`;
}

function removePhoto(){
  localStorage.removeItem(PHOTO_KEY);
  showPhoto("");
  const input = $("#photo");
  if(input) input.value = "";
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

  const payload = loadPayload();
  render(payload);

  showPhoto(loadPhoto());
}

init();
