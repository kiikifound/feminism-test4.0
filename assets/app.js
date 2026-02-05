const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const STORAGE_KEY = "feminism_test_v1";

function clamp(n,min,max){return Math.max(min,Math.min(max,n));}

async function loadJSON(path){
  const res = await fetch(path, {cache:"no-store"});
  if(!res.ok) throw new Error("Failed to load "+path);
  return await res.json();
}

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderPopularRefs(mainType){
  const items = (mainType.popular_refs || []).map(x => `
    <div class="figureCard">
      <div class="figureName">${esc(x.name)}</div>
      <p class="figureMeta"><strong>类型：</strong>${esc(x.type)}</p>
      <p class="figureMeta"><strong>为什么能帮助理解：</strong>${esc(x.why)}</p>
    </div>
  `).join("");
  if(!items) return "";
  return `
    <div class="sectionTitle">大众参照（更好理解的例子）</div>
    <div class="figureGrid" style="margin-top:12px">
      ${items}
    </div>
    <hr class="hr"/>
  `;
}

function renderLearnMore(mainType){
  const lm = mainType.learn_more || {};
  const books = (lm.books || []).map(x=>`<li>${esc(x)}</li>`).join("");
  const docs = (lm.documentaries || []).map(x=>`<li>${esc(x)}</li>`).join("");
  const films = (lm.films_series || []).map(x=>`<li>${esc(x)}</li>`).join("");
  if(!books && !docs && !films) return "";
  return `
    <hr class="hr"/>
    <div class="sectionTitle">进一步了解（书 / 纪录片 / 影视）</div>
    <div class="grid3" style="margin-top:12px">
      <div class="card" style="box-shadow:none">
        <div class="badge">书籍</div>
        <ul class="list">${books || "<li>—</li>"}</ul>
      </div>
      <div class="card" style="box-shadow:none">
        <div class="badge">纪录片</div>
        <ul class="list">${docs || "<li>—</li>"}</ul>
      </div>
      <div class="card" style="box-shadow:none">
        <div class="badge">影视</div>
        <ul class="list">${films || "<li>—</li>"}</ul>
      </div>
    </div>
  `;
}

function saveState(state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}
function resetState(){
  localStorage.removeItem(STORAGE_KEY);
}

function scoreScale1to7(v){
  // For A/B style: 1..7 => 0..100 (left->right)
  return ((v-1)/6)*100;
}
function scoreAgree1to7(v){
  // Agree scale: 1..7 => 0..100 (disagree->agree)
  return ((v-1)/6)*100;
}

function compute(){
  const st = loadState();
  if(!st || !st.answers) return null;
  return st;
}

function route(){
  const hash = location.hash.replace("#","") || "/";
  return hash;
}

function setActiveNav(path){
  $$(".navlink").forEach(a=>{
    a.classList.toggle("active", a.dataset.route === path);
  });
}

function renderHome(app, ctx){
  setActiveNav("/");
  app.innerHTML = `
    <section class="hero">
      <h1 class="h1">女性主义谱系测评</h1>
      <p class="lead">用更贴近日常判断的题目，推断你在女性主义理论谱系中更接近哪一支，并展示你的“理解方式图谱”、相邻派别差异，以及现实议题倾向。</p>

      <div class="grid3">
        <div class="card">
          <div class="cardTopLine"></div>
          <span class="badge">STEP 1</span>
          <div class="title">完成作答</div>
          <p class="p">每题用 7 档选择表达你更接近左侧还是右侧。</p>
        </div>
        <div class="card">
          <div class="cardTopLine"></div>
          <span class="badge">STEP 2</span>
          <div class="title">查看详细结果</div>
          <p class="p">先给出核心派别与“这个派别在主张什么/反对什么/怎么行动”，再展示雷达图与相邻派别差异。</p>
        </div>
        <div class="card">
          <div class="cardTopLine"></div>
          <span class="badge">STEP 3</span>
          <div class="title">理解现实倾向</div>
          <p class="p">最后给出你在性议题与经济/分配议题上的现实倾向（不决定理论谱系）。</p>
        </div>
      </div>

      <div class="actions">
        <button class="primary" id="startBtn">开始测评</button>
        <button class="secondary" id="resumeBtn">继续上次进度</button>
      </div>
      <div class="small" style="margin-top:10px">题量：${(ctx.questions?.questions||[]).length} 题（理论谱系为主，现实倾向为辅）</div>
    </section>
  `;
  $("#startBtn").onclick = ()=>{
    resetState();
    saveState({i:0, answers:{}});
    location.hash = "#/test";
  };
  $("#resumeBtn").onclick = ()=>{
    const st = loadState();
    if(!st) { alert("没有找到保存的进度。"); return; }
    location.hash = "#/test";
  };
}

function bubbleSizes(){
  // 7 bubbles: 3 large ends, 1 mid center
  return [3,2,1,0,1,2,3];
}

function renderTest(app, ctx){
  setActiveNav("/");
  const st = loadState() || {i:0, answers:{}};
  const {questions} = ctx.questions;
  const total = questions.length;
  const i = clamp(st.i ?? 0, 0, total-1);
  st.i = i;

  const q = questions[i];
  const ans = st.answers[q.id];

  const pct = Math.round(((i)/ (total)) * 100);

  const kindLabel = q.kind === "political" ? "现实倾向" : (q.kind === "consistency" ? "一致性" : "理解方式");
  const axisDef = ctx.axisLabel(q.axis) || {};
  const left = q.left || axisDef.left || "更接近左边";
  const right = q.right || axisDef.right || "更接近右边";

  app.innerHTML = `
    <div class="testHeader">
      <div>
        <div class="kpi">${kindLabel} · 第 ${i+1} / ${total} 题</div>
        <div class="progress" aria-label="进度条"><div style="width:${pct}%"></div></div>
      </div>
      <div class="small">选择会自动保存</div>
    </div>

    <div class="card qcard">
      <p class="qtext">${q.text}</p>

      <div class="scaleRow" role="group" aria-label="作答量表">
        <div class="scaleLabel">${left}</div>
        <div class="bubbles" id="bubbles"></div>
        <div class="scaleLabel" style="text-align:right">${right}</div>
      </div>

      <div class="navRow">
        <div class="pager">
          <button class="secondary" id="prevBtn" ${i===0?'disabled':''}>上一题</button>
          <button class="secondary" id="nextBtn" ${i===total-1?'disabled':''}>下一题</button>
        </div>
        <div class="pager">
          <button class="primary" id="finishBtn" ${Object.keys(st.answers).length<total?'disabled':''}>查看结果</button>
        </div>
      </div>
      <div class="small" style="margin-top:10px">提示：尽量按直觉作答；不确定时选中间。</div>
    </div>
  `;

  const bwrap = $("#bubbles");
  const sizes = bubbleSizes();
  sizes.forEach((s, idx)=>{
    const v = idx+1;
    const el = document.createElement("button");
    el.type="button";
    el.className = "bubble" + (v===4 ? " mid":"") + (ans===v ? " selected":"");
    el.dataset.size = s;
    el.setAttribute("aria-label", `选择 ${v}`);
    el.onclick = ()=>{
      st.answers[q.id] = v;
      saveState(st);
      // auto advance unless last
      i

