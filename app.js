const KEY = "talse_runner_scoreboard_v10";
const THEME_KEY = "talse_runner_theme_v1";
const PHOTO_KEY = "talse_runner_settle_photo_v1";
const PAYLOAD_KEY = "talse_runner_settle_payload_v3";

const SETTINGS = {
  rosterSize: 4,
  totalGames: 30,
  basePerGame: 1000,
  maxPerGame: 1044,
  goalPoints: {1:288,2:270,3:252,4:234,5:216,6:198,7:180,8:162},
  retaPoints: {1:144,2:135,3:126,4:116,5:108,6:99,7:90,8:81},
  xPoints: 0
};

const DEFAULT = { players: ["","","",""], totals: {}, history: [] };
const ORD = ["첫번째","두번째","세번째","네번째"];
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));

function safeInt(v, d=0){
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

function nowISO(){
  const d = new Date();
  const p = (n)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
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

function parseToken(token){
  const t = String(token||"").trim().toLowerCase().replace(/\s+/g,"");
  if(!t) throw new Error("입력이 비어 있어요");
  const m = t.match(/^(\d+)(.*)$/);
  if(!m) throw new Error("등수 숫자가 필요해요");
  const rank = safeInt(m[1], 0);
  if(rank < 1 || rank > 8) throw new Error("등수는 1~8만 가능해요");
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

function fmtSignedPretty(n){
  if(n === 0) return "±0점";
  return (n > 0 ? `+${n}점` : `${n}점`);
}

function isFinished(state){
  return (state.history?.length || 0) >= SETTINGS.totalGames;
}

function escapeHTML(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function summarizeRanksFull(tags){
  const goals = {};
  const res = {};
  const xs = {};
  for(const r of tags){
    if(!r || r === "-") continue;
    const s = String(r).trim();
    const m = s.match(/^(\d+)(.*)$/);
    if(!m) continue;
    const rk = safeInt(m[1], 0);
    const suf = m[2] || "";
    if(rk < 1 || rk > 8) continue;
    if(suf === "") goals[rk] = (goals[rk]||0) + 1;
    else if(suf === "리") res[rk] = (res[rk]||0) + 1;
    else if(suf === "초") xs[rk] = (xs[rk]||0) + 1;
  }

  const parts = [];
  const gk = Object.keys(goals).map(Number).sort((a,b)=>a-b);
  const rk = Object.keys(res).map(Number).sort((a,b)=>a-b);
  const xk = Object.keys(xs).map(Number).sort((a,b)=>a-b);

  if(gk.length) parts.push(gk.map(k=>`${k}등×${goals[k]}`).join("·"));
  if(rk.length) parts.push(`리타(${rk.map(k=>`${k}리×${res[k]}`).join(", ")})`);
  if(xk.length) parts.push(`초사(${xk.map(k=>`${k}초×${xs[k]}`).join(", ")})`);
  return parts.length ? parts.join(" - ") : "-";
}

function computePerPlayerTags(state){
  const names = normalizeNames(state.players);
  const per = {};
  for(const n of names) per[n] = [];
  for(const row of (state.history || [])){
    const parsed = row?.parsed;
    if(!Array.isArray(parsed) || parsed.length !== names.length) continue;
    for(let i=0;i<names.length;i++){
      const name = names[i];
      const p = parsed[i];
      const rk = safeInt(p?.rank, 0);
      const re = !!p?.re;
      const x = !!p?.x;
      if(rk < 1 || rk > 8){ per[name].push("-"); continue; }
      if(x) per[name].push(`${rk}초`);
      else if(re) per[name].push(`${rk}리`);
      else per[name].push(`${rk}`);
    }
  }
  return per;
}

function computePerPlayerStats(state, perTags){
  const names = normalizeNames(state.players);
  const out = {};
  for(const name of names){
    const tags = perTags[name] || [];
    let bestRank = 99;
    let bestCount = 0;
    let reCount = 0;
    let xCount = 0;
    let goalCount = 0;

    for(const t of tags){
      if(!t || t === "-") continue;
      const m = String(t).match(/^(\d+)(.*)$/);
      if(!m) continue;
      const rk = safeInt(m[1], 0);
      const suf = m[2] || "";
      if(rk >= 1 && rk <= 8){
        if(rk < bestRank){
          bestRank = rk;
          bestCount = 1;
        }else if(rk === bestRank){
          bestCount += 1;
        }
      }
      if(suf === "리") reCount += 1;
      else if(suf === "초") xCount += 1;
      else goalCount += 1;
    }

    if(bestRank === 99) bestRank = 0;

    out[name] = {
      bestRank,
      bestCount,
      goalCount,
      reCount,
      xCount,
      summary: summarizeRanksFull(tags)
    };
  }
  return out;
}

function buildBoard(state){
  ensureTotals(state);

  const games = state.history.length;
  const remain = Math.max(0, SETTINGS.totalGames - games);

  const currentTotal = Object.values(state.totals).reduce((a,b)=>a+safeInt(b,0),0);
  const maxTotal = SETTINGS.maxPerGame * SETTINGS.totalGames;

  const maxPossibleFinal = currentTotal + (remain * SETTINGS.maxPerGame);
  const diff = maxPossibleFinal - maxTotal;

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
        <div class="v">${maxPossibleFinal}점 <span class="diff">(${fmtSignedPretty(diff)})</span></div>
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
  $("#savePlayers").classList.toggle("hidden", !!lock);
  $("#editPlayers").classList.toggle("hidden", !lock);
}

function clearScoreInputs(){
  $$("#scoreInputs input").forEach(i=>{ i.value = ""; });
  const first = $("#scoreInputs input");
  if(first) first.focus();
}

function applyFinishedLock(){
  const done = isFinished(window.__state);
  $$("#scoreInputs input").forEach(i=>{ i.disabled = done; });
  $("#addRound").disabled = done;
  $("#clearInputs").disabled = done;
}

function render(){
  const state = window.__state;

  const pWrap = $("#playerInputs");
  pWrap.innerHTML = "";
  for(let i=0;i<SETTINGS.rosterSize;i++){
    const inp = document.createElement("input");
    inp.placeholder = `${ORD[i]} 닉네임`;
    inp.value = state.players[i] || "";
    pWrap.appendChild(inp);
  }

  const registered = isRegistered(state);

  $("#regStatus").textContent = registered ? "등록 완료" : "아직 미등록";
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
    lab.textContent = names[i] || `${ORD[i]} 선수`;
    wrap.appendChild(lab);

    const inp = document.createElement("input");
    inp.addEventListener("keydown",(e)=>{
      if(e.key === "Enter"){
        e.preventDefault();
        const list = $$("#scoreInputs input");
        if(i < list.length - 1) list[i+1].focus();
        else addRound();
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
    $("#playStatus").textContent = isFinished(state) ? "30판 완료했어요" : `진행: ${games}판 · 남은 판 ${remain}판`;
    $("#board").innerHTML = buildBoard(state);
    applyFinishedLock();

    const settleBtn = $("#settle");
    if(settleBtn){
      if(isFinished(state)){
        settleBtn.classList.add("primary","settleReady");
        settleBtn.classList.remove("ghost");
      }else{
        settleBtn.classList.remove("primary","settleReady");
        if(!settleBtn.classList.contains("ghost")) settleBtn.classList.add("ghost");
      }
    }
  }else{
    $("#playStatus").textContent = "";
    $("#board").innerHTML = "";

    const settleBtn = $("#settle");
    if(settleBtn){
      settleBtn.classList.remove("primary","settleReady");
      if(!settleBtn.classList.contains("ghost")) settleBtn.classList.add("ghost");
    }
  }
}

function registerPlayers(){
  const state = window.__state;
  const inputs = $$("#playerInputs input");
  const names = inputs.map(i=>i.value.trim()).slice(0, SETTINGS.rosterSize);

  if(names.some(n=>!n)) return alert("닉네임은 전부 채워줘요");
  if(new Set(names).size !== names.length) return alert("닉네임이 겹쳐요. 전부 다르게 해줘요");

  const hasProgress = (state.history || []).length > 0;

  if(!hasProgress){
    state.players = names;
    state.totals = Object.fromEntries(names.map(n=>[n,0]));
    state.history = [];
    save(state);
    render();
    return;
  }

  const prevNames = normalizeNames(state.players).filter(Boolean);
  const prevTotals = state.totals || {};

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

  const newHistory = (state.history || []).map(r=>{
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

function editPlayers(){
  $$("#playerInputs input").forEach(i=>{ i.disabled = false; });
  $("#savePlayers").classList.remove("hidden");
  $("#editPlayers").classList.add("hidden");
  $("#regStatus").textContent = "수정 중";
  const first = $("#playerInputs input");
  if(first) first.focus();
}

function addRound(){
  const state = window.__state;
  if(!isRegistered(state)) return alert("먼저 선수 등록부터 해줘요");
  if(isFinished(state)) return alert("30판이 다 끝났어요");

  const inputs = $$("#scoreInputs input");
  const tokens = inputs.map(i=>i.value.trim());

  let parsed;
  try{
    parsed = tokens.map(parseToken);
  }catch(e){
    return alert(`입력 확인해줘요: ${e.message}`);
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
    return alert("등수가 겹쳤어요\n" + msg);
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

  state.history.push({
    ts: nowISO(),
    tokens,
    parsed: parsed.map(p=>({rank:p.rank,re:p.re,x:p.x})),
    delta
  });

  clearScoreInputs();
  save(state);
  render();
}

function undoRound(){
  const state = window.__state;
  if(!state.history.length) return alert("되돌릴 판이 아직 없어요");
  if(!confirm("마지막 1판만 되돌릴까요?")) return;

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
  if(!confirm("전부 리셋할까요?")) return;
  window.__state = structuredClone(DEFAULT);
  save(window.__state);
  render();
}

function settle(){
  const state = window.__state;
  if(!isRegistered(state)) return alert("선수 등록부터 먼저 해줘요");
  if(!isFinished(state)) return alert("30판 다 채워야 정산이 열려요");

  ensureTotals(state);

  const perTags = computePerPlayerTags(state);
  const perStats = computePerPlayerStats(state, perTags);

  const players = normalizeNames(state.players);
  const rows = players
    .map(name=>({ name, total: safeInt(state.totals[name],0) }))
    .sort((a,b)=>b.total-a.total);

  const leader = rows[0]?.total ?? 0;

  const lines = rows.map((r, idx)=>{
    const st = perStats[r.name] || {};
    return {
      name: r.name,
      total: r.total,
      diffFromFirst: idx === 0 ? 0 : (r.total - leader),
      bestRank: safeInt(st.bestRank, 0),
      bestCount: safeInt(st.bestCount, 0),
      goalCount: safeInt(st.goalCount, 0),
      reCount: safeInt(st.reCount, 0),
      xCount: safeInt(st.xCount, 0),
      summary: String(st.summary || "-"),
      isMvp: idx === 0
    };
  });

  const payload = { at: nowISO(), players, lines };
  localStorage.setItem(PAYLOAD_KEY, JSON.stringify(payload));
  location.href = "result.html";
}

function exportData(){
  const state = window.__state;
  const pack = {
    app: "TalesRunner Conquest Scoreboard",
    savedAt: nowISO(),
    theme: localStorage.getItem(THEME_KEY) || "dark",
    state,
    settlePhoto: localStorage.getItem(PHOTO_KEY) || ""
  };
  const blob = new Blob([JSON.stringify(pack)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `talse_runner_score_${pack.savedAt.replaceAll(":","").replaceAll(" ","_")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(){
  const input = $("#importFile");
  if(!input) return;
  input.value = "";
  try{
    if(typeof input.showPicker === "function"){
      input.showPicker();
      return;
    }
  }catch{}
  input.click();
}

function handleImportFile(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const pack = JSON.parse(String(reader.result || "{}"));
      const theme = pack?.theme === "light" ? "light" : "dark";
      const state = pack?.state;

      if(!state || !Array.isArray(state.players) || !Array.isArray(state.history) || typeof state.totals !== "object"){
        alert("불러오기 파일 형식이 달라요");
        return;
      }

      localStorage.setItem(THEME_KEY, theme);
      localStorage.setItem(KEY, JSON.stringify(state));
      if(typeof pack?.settlePhoto === "string") localStorage.setItem(PHOTO_KEY, pack.settlePhoto);
      else localStorage.removeItem(PHOTO_KEY);

      setTheme(theme);
      window.__state = load();
      render();
      alert("불러오기 완료했어요");
    }catch{
      alert("불러오기 실패했어요");
    }
  };
  reader.readAsText(file, "utf-8");
}

function bind(){
  $("#themeToggle").onclick = ()=>{
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(cur === "dark" ? "light" : "dark");
  };

  $("#savePlayers").onclick = registerPlayers;
  $("#editPlayers").onclick = editPlayers;

  $("#addRound").onclick = addRound;
  $("#clearInputs").onclick = clearScoreInputs;

  $("#undoRound").onclick = undoRound;
  $("#resetAll").onclick = resetAll;
  $("#settle").onclick = settle;

  $("#exportData").onclick = exportData;
  $("#importData").onclick = importData;

  $("#importFile").addEventListener("change",(e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    e.target.value = "";
    handleImportFile(f);
  });
}

function init(){
  initTheme();
  window.__state = load();
  bind();
  render();
}

init();
