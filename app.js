const KEY = "personal_scoreboard_v1";

const DEFAULT = {
  settings: {
    totalGames: 30,
    rosterSize: 4,
    goalPoints: {1:288,2:270,3:252,4:234,5:216,6:198,7:180,8:162},
    retaPoints: {1:144,2:135,3:126,4:116,5:108,6:99,7:90,8:81},
    xPoints: 0,
    addGoal: 0,
    addRe: 0,
    addX: 0,
  },
  players: [],
  totals: {},
  history: [],
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const data = JSON.parse(raw);
    return { ...structuredClone(DEFAULT), ...data };
  } catch {
    return structuredClone(DEFAULT);
  }
}
function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function safeInt(v, d=0){
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

function parseToken(token){
  const t = String(token || "").trim().toLowerCase().replace(/\s+/g, "");
  if (!t) throw new Error("빈 입력");
  const m = t.match(/^(\d+)(.*)$/);
  if (!m) throw new Error("등수 숫자가 없음 (1~8)");
  const rank = safeInt(m[1], 0);
  const rest = m[2] || "";
  if (rank < 1 || rank > 8) throw new Error("등수는 1~8만 가능");
  const hasRe = rest.includes("re") || rest.includes("리") || rest.includes("리타");
  const hasX  = rest.includes("x")  || rest.includes("초") || rest.includes("초사");
  return { rank, re: hasRe, x: hasX };
}

function scoreFrom(p, s){
  if (p.x) return s.xPoints + s.addX;
  if (p.re) return s.retaPoints[p.rank] + s.addRe;
  return s.goalPoints[p.rank] + s.addGoal;
}

function isRegistered(state){
  return state.players.length === state.settings.rosterSize
    && state.players.every(Boolean);
}

function fmtSigned(n){ return n >= 0 ? `+${n}` : `${n}`; }

function render(){
  const state = window.__state;

  document.getElementById("rosterSize").value = state.settings.rosterSize;
  document.getElementById("totalGames").value = state.settings.totalGames;

  // 선수 입력칸
  const pWrap = document.getElementById("playerInputs");
  pWrap.innerHTML = "";
  for(let i=0;i<state.settings.rosterSize;i++){
    const inp = document.createElement("input");
    inp.placeholder = `${i+1}번 닉네임`;
    inp.value = state.players[i] || "";
    inp.dataset.idx = String(i);
    pWrap.appendChild(inp);
  }

  // 점수 입력칸
  const sWrap = document.getElementById("scoreInputs");
  sWrap.innerHTML = "";
  for(let i=0;i<state.settings.rosterSize;i++){
    const name = state.players[i] || `플레이어${i+1}`;
    const inp = document.createElement("input");
    inp.placeholder = "예: 1 / 2리 / 3초";
    inp.dataset.idx = String(i);
    inp.dataset.name = name;
    inp.disabled = !isRegistered(state);
    sWrap.appendChild(inp);
  }

  // 점수판
  const board = document.getElementById("board");
  const games = state.history.length;
  const totalGames = state.settings.totalGames;
  const remain = Math.max(0, totalGames - games);

  const currentTotal = Object.values(state.totals).reduce((a,b)=>a+safeInt(b,0),0);
  const baseline = 1000 * games; // 너 예시처럼 BASE_PER_GAME 개념 유지(원하면 바꿔도 됨)
  const diff = currentTotal - baseline;

  const rows = state.players
    .map(n => [n, safeInt(state.totals[n] || 0, 0)])
    .sort((a,b)=>b[1]-a[1]);

  const html = `
    <div class="mono">
      진행: ${games}/${totalGames}판 · 남은 ${remain}판<br/>
      현재점수: ${currentTotal} (기준 ${baseline} 대비 ${fmtSigned(diff)})
    </div>
    <table class="table" style="margin-top:10px">
      <thead><tr><th>순위</th><th>이름</th><th>점수</th></tr></thead>
      <tbody>
        ${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${r[0]}</td><td>${r[1]}</td></tr>`).join("") || `<tr><td colspan="3">-</td></tr>`}
      </tbody>
    </table>
    <div class="mono" style="margin-top:10px">
      기록(최근 5판):<br/>
      ${state.history.slice(-5).reverse().map(h=>`- ${h.ts}: ${h.tokens.join(" / ")}`).join("<br/>") || "- 없음"}
    </div>
  `;
  board.innerHTML = html;
}

function init(){
  window.__state = load();

  document.getElementById("applySettings").onclick = () => {
    const state = window.__state;
    const n = safeInt(document.getElementById("rosterSize").value, state.settings.rosterSize);
    const tg = safeInt(document.getElementById("totalGames").value, state.settings.totalGames);

    if (n < 2 || n > 8) return alert("인원수는 2~8만 가능");
    if (tg < 1 || tg > 999) return alert("총판수는 1~999만 가능");

    // 진행 중이면 인원 변경 막기
    if ((state.players.length || state.history.length) && n !== state.settings.rosterSize) {
      return alert("이미 선수등록/진행 중이라 인원 변경은 리셋 후 가능");
    }

    state.settings.rosterSize = n;
    state.settings.totalGames = tg;
    save(state);
    render();
  };

  document.getElementById("savePlayers").onclick = () => {
    const state = window.__state;
    const inputs = [...document.querySelectorAll("#playerInputs input")];
    const names = inputs.map(i => i.value.trim()).slice(0, state.settings.rosterSize);

    if (names.some(n => !n)) return alert("닉네임은 전부 입력");
    const set = new Set(names);
    if (set.size !== names.length) return alert("닉네임 중복됨");

    state.players = names;
    state.totals = Object.fromEntries(names.map(n => [n, 0]));
    state.history = [];
    save(state);
    render();
    alert("선수등록 완료");
  };

  document.getElementById("addRound").onclick = () => {
    const state = window.__state;
    if (!isRegistered(state)) return alert("먼저 선수등록 필요");

    const games = state.history.length;
    if (games >= state.settings.totalGames) return alert("총판수 다 했음");

    const inputs = [...document.querySelectorAll("#scoreInputs input")];
    const tokens = inputs.map(i => i.value.trim());

    let parsed;
    try {
      parsed = tokens.map(parseToken);
    } catch (e) {
      return alert(`입력 오류: ${e.message}`);
    }

    // 등수 중복 체크(같은 rank만)
    const byRank = {};
    for(let i=0;i<parsed.length;i++){
      const rk = parsed[i].rank;
      byRank[rk] = byRank[rk] || [];
      byRank[rk].push(state.players[i]);
    }
    const dup = Object.entries(byRank).filter(([_,arr])=>arr.length>=2);
    if (dup.length){
      const msg = dup.map(([rk,arr])=>`${rk}등: ${arr.join(", ")}`).join("\n");
      return alert("등수가 겹침\n" + msg);
    }

    const delta = {};
    for(let i=0;i<state.players.length;i++){
      const name = state.players[i];
      delta[name] = scoreFrom(parsed[i], state.settings);
    }

    for (const name of state.players){
      state.totals[name] = safeInt(state.totals[name],0) + safeInt(delta[name],0);
    }

    const ts = new Date().toISOString().slice(0,19);
    state.history.push({ ts, tokens, parsed, delta });
    if (state.history.length > 300) state.history = state.history.slice(-300);

    save(state);
    render();

    // 입력칸 비우기
    inputs.forEach(i => i.value = "");
  };

  document.getElementById("undoRound").onclick = () => {
    const state = window.__state;
    if (!state.history.length) return alert("되돌릴 판이 없음");
    const last = state.history.pop();
    const delta = last.delta || {};
    for (const name of state.players){
      state.totals[name] = safeInt(state.totals[name],0) - safeInt(delta[name],0);
    }
    save(state);
    render();
  };

  document.getElementById("resetAll").onclick = () => {
    if (!confirm("전부 삭제하고 초기화할래?")) return;
    window.__state = structuredClone(DEFAULT);
    save(window.__state);
    render();
  };

  render();
}

init();
