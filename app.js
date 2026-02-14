const KEY = "talse_runner_scoreboard_v6";
const THEME_KEY = "talse_runner_theme_v1";

const SETTINGS = {
  rosterSize: 4,
  totalGames: 30,
  basePerGame: 1000,
  maxPerGame: 1044,
  goalPoints: {1:288,2:270,3:252,4:234,5:216,6:198,7:180,8:162},
  retaPoints: {1:144,2:135,3:126,4:116,5:108,6:99,7:90,8:81},
  xPoints: 0
};

const DEFAULT = {
  players: ["", "", "", ""],
  totals: {},
  history: []
};

const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));

function safeInt(v, d=0){
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

function navType(){
  const e = performance.getEntriesByType?.("navigation")?.[0];
  return e?.type || "navigate";
}

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return structuredClone(DEFAULT);
    const d = JSON.parse(raw);
    const out = structuredClone(DEFAULT);
    if(Array.isArray(d.players)) out.players = d.players.map(x=>String(x ?? "")).slice(0, SETTINGS.rosterSize);
    while(out.players.length < SETTINGS.rosterSize) out.players.push("");
    if(typeof d.totals === "object" && d.totals) out.totals = d.totals;
    if(Array.isArray(d.history)) out.history = d.history;
    return out;
  }catch{
    return structuredClone(DEFAULT);
  }
}

function save(state){
  localStorage.setItem(KEY, JSON.stringify(state));
}

function setTheme(theme){
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(THEME_KEY, t);
  const btn = $("#themeToggle");
  if(btn) btn.textContent = `다크모드: ${t === "dark" ? "ON" : "OFF"}`;
}

function initTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  setTheme(saved || "dark");
}

function normalizeNames(arr){
  return arr.map(x=>String(x||"").trim()).slice(0, SETTINGS.rosterSize);
}

function isRegistered(state){
  const names = normalizeNames(state.players);
  return names.length === SETTINGS.rosterSize && names.every(Boolean) && new Set(names).size === names.length;
}

function ensureTotals(state){
  const names = normalizeNames(state.players);
  const t = {};
  for(const n of names){
    if(!n) continue;
    t[n] = safeInt(state.totals?.[n], 0);
  }
  state.totals = t;
}

function nowISO(){
  const d = new Date();
  const p = (n)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function parseToken(token){
  const t = String(token||"").trim().toLowerCase().replace(/\s+/g,"");
  if(!t) throw new Error("빈 입력");
  const m = t.match(/^(\d+)(.*)$/);
  if(!m) throw new Error("등수 숫자가 없다");
  const rank = safeInt(m[1], 0);
  if(rank < 1 || rank > 8) throw new Error("등수는 1~8만 가능");
  const rest = m[2] || "";
  const re = rest.includes("re") || rest.includes("리") || rest.includes("리타");
  const x  = rest.includes("x")  || rest.includes("초") || rest.includes("초사");
  return { rank, re, x };
}

function scoreFrom(p){
  if(p.x) return safeInt(SETTINGS.xPoints, 0);
  if(p.re) return safeInt(SETTINGS.retaPoints[p.rank], 0);
  return safeInt(SETTINGS.goalPoints[p.rank], 0);
}

function escapeHTML(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function fmtSigned(n){
  return (n >= 0 ? `+${n}` : `${n}`);
}

function computeBestPossibleFinalByBase(state){
  const maxTotal = SETTINGS.maxPerGame * SETTINGS.totalGames;
  let penalty = 0;
  for(const row of (state.history || [])){
    const delta = row?.delta || {};
    const roundTotal = Object.values(delta).reduce((a,b)=>a+safeInt(b,0),0);
    if(roundTotal < SETTINGS.basePerGame) penalty += (SETTINGS.basePerGame - roundTotal);
  }
  return Math.max(0, maxTotal - penalty);
}

function buildBoard(state){
  ensureTotals(state);

  const games = state.history.length;
  const remain = Math.max(0, SETTINGS.totalGames - games);

  const currentTotal = Object.values(state.totals).reduce((a,b)=>a+safeInt(b,0),0);

  const maxTotal = SETTINGS.maxPerGame * SETTINGS.totalGames;
  const bestPossibleFinal = computeBestPossibleFinalByBase(state);

  const names = normalizeNames(state.players).filter(Boolean);
  const rows = names.map(n=>[n, safeInt(state.totals[n],0)]).sort((a,b)=>b[1]-a[1]);

  const kpi = `
    <div class="kpi">
      <div class="box">
        <div class="t">현재 점수</div>
        <div class="v">${currentTotal}점</div>
      </div>
      <div class="box">
        <div class="t">남은 판</div>
        <div class="v">${remain}판 <span class="diff">(${games}/${SETTINGS.totalGames})</span></div>
      </div>
      <div class="box">
        <div class="t">최고 점수</div>
        <div class="v">${bestPossibleFinal}점 <span class="diff">(기준 ${maxTotal}점 대비 ${fmtSigned(bestPossibleFinal - maxTotal)})</span></div>
      </div>
    </div>
  `;

  const table = `
    <table class="table">
      <thead><tr><th>순위</th><th>이름</th><th>점수</th></tr></thead>
      <tbody>
        ${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${escapeHTML(r[0])}</td><td>${r[1]}</td></tr>`).join("")}
      </tbody>
    </table>
  `;

  return kpi + table;
}

function lockRegisterUI(lock){
  $$("#playerInputs input").forEach(i=>{ i.disabled = !!lock; });
  $("#savePlayers").style.display = lock ? "none" : "inline-flex";
  const editBtn = $("#editPlayers");
  if(editBtn) editBtn.style.display = lock ? "inline-flex" : "none";
}

function ensureEditButton(){
  const row = $("#registerCard .row");
  if(!row) return;
  if($("#editPlayers")) return;

  const btn = document.createElement("button");
  btn.id = "editPlayers";
  btn.className = "ghost";
  btn.textContent = "닉네임 수정";
  btn.style.display = "none";
  row.insertBefore(btn, row.querySelector("#regStatus"));

  btn.onclick = ()=>{
    const state = window.__state;
    if(!isRegistered(state)) return;

    $$("#playerInputs input").forEach(i=>{ i.disabled = false; });
    $("#savePlayers").style.display = "inline-flex";
    btn.style.display = "none";
    $("#regStatus").textContent = "수정 중";
  };
}

function clearScoreInputs(){
  $$("#scoreInputs input").forEach(i=>{ i.value = ""; });
  const first = $("#scoreInputs input");
  if(first) first.focus();
}

function render(){
  const state = window.__state;

  ensureEditButton();

  const pWrap = $("#playerInputs");
  pWrap.innerHTML = "";
  for(let i=0;i<SETTINGS.rosterSize;i++){
    const inp = document.createElement("input");
    inp.placeholder = `${i+1}번 닉네임`;
    inp.value = state.players[i] || "";
    pWrap.appendChild(inp);
  }

  const registered = isRegistered(state);

  $("#regStatus").textContent = registered ? "등록 완료" : "미등록";
  lockRegisterUI(registered);

  $("#scoreCard").classList.toggle("hidden", !registered);
  $("#boardCard").classList.toggle("hidden", !registered);

  const sWrap = $("#scoreInputs");
  sWrap.innerHTML = "";
  const names = normalizeNames(state.players);

  for(let i=0;i<SETTINGS.rosterSize;i++){
    const wrap = document.createElement("div");
    wrap.className = "input-wrap";

    const lab = document.createElement("div");
    lab.className = "label";
    lab.textContent = names[i] || `${i+1}번`;
    wrap.appendChild(lab);

    const inp = document.createElement("input");
    inp.value = "";
    inp.addEventListener("keydown", (e)=>{
      if(e.key === "Enter"){
        e.preventDefault();
        addRound();
      }
      if(e.key === "Escape"){
        e.preventDefault();
        clearScoreInputs();
      }
    });
    wrap.appendChild(inp);

    sWrap.appendChild(wrap);
  }

  if(registered){
    ensureTotals(state);
    const games = state.history.length;
    const remain = Math.max(0, SETTINGS.totalGames - games);
    $("#playStatus").textContent = `진행: ${games}판 · 남은 판 ${remain}판`;
    $("#board").innerHTML = buildBoard(state);
  } else {
    $("#playStatus").textContent = "";
    $("#board").innerHTML = "";
  }
}

function registerPlayers(){
  const state = window.__state;
  const inputs = $$("#playerInputs input");
  const names = inputs.map(i=>i.value.trim()).slice(0, SETTINGS.rosterSize);

  if(names.some(n=>!n)) return alert("닉네임은 전부 입력해야 한다.");
  if(new Set(names).size !== names.length) return alert("닉네임이 중복됐다. 전부 다르게 입력해야 한다.");

  const prevNames = normalizeNames(state.players).filter(Boolean);
  const prevTotals = state.totals || {};
  const prevHistory = state.history || [];
  const hasProgress = prevHistory.length > 0;

  if(!hasProgress){
    state.players = names;
    state.totals = Object.fromEntries(names.map(n=>[n,0]));
    state.history = [];
    save(state);
    render();
    return;
  }

  const map = {};
  for(let i=0;i<Math.min(prevNames.length, names.length);i++){
    map[prevNames[i]] = names[i];
  }

  const newTotals = {};
  for(const oldName of prevNames){
    const nn = map[oldName] || oldName;
    newTotals[nn] = (newTotals[nn] || 0) + safeInt(prevTotals[oldName], 0);
  }

  for(const nn of names){
    if(newTotals[nn] == null) newTotals[nn] = 0;
  }

  const newHistory = prevHistory.map(r=>{
    const delta = r?.delta || {};
    const nd = {};
    for(const oldName of Object.keys(delta)){
      const nn = map[oldName] || oldName;
      nd[nn] = (nd[nn] || 0) + safeInt(delta[oldName],0);
    }
    return { ...r, delta: nd };
  });

  state.players = names;
  state.totals = newTotals;
  state.history = newHistory;

  save(state);
  render();
}

function addRound(){
  const state = window.__state;
  if(!isRegistered(state)) return alert("먼저 선수 등록을 완료해야 한다.");
  const games = state.history.length;
  if(games >= SETTINGS.totalGames) return alert("총 판수를 모두 진행했다.");

  const inputs = $$("#scoreInputs input");
  const tokens = inputs.map(i=>i.value.trim());

  let parsed;
  try{
    parsed = tokens.map(parseToken);
  }catch(e){
    return alert(`입력 오류: ${e.message}`);
  }

  const byRank = {};
  for(let i=0;i<parsed.length;i++){
    const rk = parsed[i].rank;
    byRank[rk] = byRank[rk] || [];
    byRank[rk].push(state.players[i]);
  }
  const dup = Object.entries(byRank).filter(([_,arr])=>arr.length >= 2);
  if(dup.length){
    const msg = dup.map(([rk,arr])=>`${rk}등: ${arr.join(", ")}`).join("\n");
    return alert("등수가 겹쳤다.\n" + msg);
  }

  ensureTotals(state);

  const delta = {};
  for(let i=0;i<SETTINGS.rosterSize;i++){
    const name = state.players[i];
    delta[name] = scoreFrom(parsed[i]);
  }

  for(const name of state.players){
    state.totals[name] = safeInt(state.totals[name],0) + safeInt(delta[name],0);
  }

  state.history.push({ ts: nowISO(), tokens, parsed, delta });

  clearScoreInputs();
  save(state);
  render();
}

function undoRound(){
  const state = window.__state;
  if(!state.history.length) return alert("되돌릴 판이 없다.");
  if(!confirm("마지막 1판을 되돌릴까?")) return;

  ensureTotals(state);
  const last = state.history.pop();
  const delta = last?.delta || {};

  for(const name of state.players){
    state.totals[name] = safeInt(state.totals[name],0) - safeInt(delta[name],0);
  }

  save(state);
  render();
}

function resetAll(){
  if(!confirm("전부 리셋할까?")) return;
  window.__state = structuredClone(DEFAULT);
  save(window.__state);
  render();
}

function bind(){
  $("#themeToggle").onclick = ()=>{
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(cur === "dark" ? "light" : "dark");
  };
  $("#savePlayers").onclick = registerPlayers;
  $("#addRound").onclick = addRound;
  $("#clearInputs").onclick = clearScoreInputs;
  $("#undoRound").onclick = undoRound;
  $("#resetAll").onclick = resetAll;
}

function init(){
  initTheme();

  if(navType() === "reload"){
    localStorage.removeItem(KEY);
    window.__state = structuredClone(DEFAULT);
  } else {
    window.__state = load();
  }

  bind();
  render();
}

init();
