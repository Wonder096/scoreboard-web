const KEY = "talse_runner_scoreboard_v1";

// 고정 규칙(네가 쓰던 기본값)
const DEFAULT_SETTINGS = {
  rosterSize: 4,
  totalGames: 30,
  goalPoints: {1:288,2:270,3:252,4:234,5:216,6:198,7:180,8:162},
  retaPoints: {1:144,2:135,3:126,4:116,5:108,6:99,7:90,8:81},
  xPoints: 0
};

const DEFAULT = {
  settings: DEFAULT_SETTINGS,
  players: [],
  totals: {},
  history: [] // 되돌리기용(표시는 안 함)
};

const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));

function safeInt(v, d=0){
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return structuredClone(DEFAULT);
    const data = JSON.parse(raw);

    const out = structuredClone(DEFAULT);
    if(Array.isArray(data.players)) out.players = data.players.map(String);
    if(typeof data.totals === "object" && data.totals) out.totals = data.totals;
    if(Array.isArray(data.history)) out.history = data.history;

    return out;
  }catch{
    return structuredClone(DEFAULT);
  }
}

function save(state){
  localStorage.setItem(KEY, JSON.stringify(state));
}

function isRegistered(state){
  return state.players.length === state.settings.rosterSize && state.players.every(Boolean);
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
  if(!m) throw new Error("등수 숫자가 없음(1~8)");

  const rank = safeInt(m[1], 0);
  if(rank < 1 || rank > 8) throw new Error("등수는 1~8만 가능");

  const rest = m[2] || "";
  const re = rest.includes("re") || rest.includes("리") || rest.includes("리타");
  const x  = rest.includes("x")  || rest.includes("초") || rest.includes("초사");
  return { rank, re, x };
}

function scoreFrom(p, s){
  if(p.x) return safeInt(s.xPoints,0);
  if(p.re) return safeInt(s.retaPoints[p.rank],0);
  return safeInt(s.goalPoints[p.rank],0);
}

function ensureTotals(state){
  const t = {};
  for(const name of state.players){
    t[name] = safeInt(state.totals?.[name], 0);
  }
  state.totals = t;
}

function escapeHTML(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function render(){
  const state = window.__state;

  // 선수 등록 UI
  const pWrap = $("#playerInputs");
  pWrap.innerHTML = "";
  for(let i=0;i<state.settings.rosterSize;i++){
    const inp = document.createElement("input");
    inp.placeholder = `${i+1}번 닉네임`;
    inp.value = state.players[i] || "";
    inp.dataset.idx = String(i);
    pWrap.appendChild(inp);
  }

  // 등록 여부에 따라 섹션 노출
  const registered = isRegistered(state);
  $("#scoreCard").classList.toggle("hidden", !registered);
  $("#boardCard").classList.toggle("hidden", !registered);

  // 점수 입력 UI
  const sWrap = $("#scoreInputs");
  sWrap.innerHTML = "";
  for(let i=0;i<state.settings.rosterSize;i++){
    const name = state.players[i] || `플레이어${i+1}`;
    const inp = document.createElement("input");
    inp.placeholder = "예: 1 / 2리 / 3초";
    inp.dataset.idx = String(i);
    inp.dataset.name = name;
    inp.disabled = !registered;
    sWrap.appendChild(inp);
  }

  // 상태 + 점수판
  if(registered){
    ensureTotals(state);
    const games = state.history.length;
    const remain = Math.max(0, state.settings.totalGames - games);

    $("#playStatus").textContent = `진행: ${games}판 · 남은 판 ${remain}판`;
    $("#board").innerHTML = buildBoardHTML(state);
  } else {
    $("#playStatus").textContent = "";
    $("#board").innerHTML = "";
  }
}

function buildBoardHTML(state){
  ensureTotals(state);

  const games = state.history.length;
  const remain = Math.max(0, state.settings.totalGames - games);

  const totalAll = Object.values(state.totals).reduce((a,b)=>a+safeInt(b,0),0);

  const rows = state.players
    .map(n=>[n, safeInt(state.totals[n],0)])
    .sort((a,b)=>b[1]-a[1]);

  const kpi = `
    <div class="kpi">
      <div class="box"><div class="t">현재 점수</div><div class="v">${totalAll}</div></div>
      <div class="box"><div class="t">진행</div><div class="v">${games}판</div></div>
      <div class="box"><div class="t">남은 판</div><div class="v">${remain}판</div></div>
      <div class="box"><div class="t">총 판수</div><div class="v">${state.settings.totalGames}판</div></div>
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

function init(){
  window.__state = load();

  $("#savePlayers").onclick = () => {
    const state = window.__state;
    const inputs = $$("#playerInputs input");
    const names = inputs.map(i=>i.value.trim()).slice(0, state.settings.rosterSize);

    if(names.some(n=>!n)) return alert("닉네임은 전부 입력해야 한다.");
    const set = new Set(names);
    if(set.size !== names.length) return alert("닉네임이 중복됐다. 전부 다르게 입력해야 한다.");

    state.players = names;
    state.totals = Object.fromEntries(names.map(n=>[n,0]));
    state.history = [];
    save(state);
    render();
  };

  $("#addRound").onclick = () => {
    const state = window.__state;
    if(!isRegistered(state)) return alert("먼저 선수 등록을 완료해야 한다.");

    const games = state.history.length;
    if(games >= state.settings.totalGames) return alert("총 판수를 모두 진행했다.");

    const inputs = $$("#scoreInputs input");
    const tokens = inputs.map(i=>i.value.trim());

    let parsed;
    try{
      parsed = tokens.map(parseToken);
    }catch(e){
      return alert(`입력 오류: ${e.message}`);
    }

    // 등수 중복 체크(순수 rank만)
    const byRank = {};
    for(let i=0;i<parsed.length;i++){
      const rk = parsed[i].rank;
      byRank[rk] = byRank[rk] || [];
      byRank[rk].push(state.players[i]);
    }
    const dup = Object.entries(byRank).filter(([_,arr])=>arr.length>=2);
    if(dup.length){
      const msg = dup.map(([rk,arr])=>`${rk}등: ${arr.join(", ")}`).join("\n");
      return alert("등수가 겹쳤다.\n" + msg);
    }

    ensureTotals(state);

    const delta = {};
    for(let i=0;i<state.players.length;i++){
      const name = state.players[i];
      delta[name] = scoreFrom(parsed[i], state.settings);
    }

    for(const name of state.players){
      state.totals[name] = safeInt(state.totals[name],0) + safeInt(delta[name],0);
    }

    state.history.push({ ts: nowISO(), tokens, parsed, delta });

    inputs.forEach(i=>i.value="");
    save(state);
    render();
  };

  $("#undoRound").onclick = () => {
    const state = window.__state;
    if(!state.history.length) return alert("되돌릴 판이 없다.");

    ensureTotals(state);

    const last = state.history.pop();
    const delta = last?.delta || {};
    for(const name of state.players){
      state.totals[name] = safeInt(state.totals[name],0) - safeInt(delta[name],0);
    }

    save(state);
    render();
  };

  $("#resetAll").onclick = () => {
    if(!confirm("전부 초기화할까?")) return;
    window.__state = structuredClone(DEFAULT);
    save(window.__state);
    render();
  };

  render();
}

init();
