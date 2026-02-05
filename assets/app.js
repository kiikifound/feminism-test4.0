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
      if(st.i < total-1){
        st.i += 1;
        saveState(st);
        renderTest(app, ctx);
      }else{
        // last question: if all answered, go results
        const answered = Object.keys(st.answers).length;
        if(answered >= total){
          renderResult(app, ctx);
        }else{
          renderTest(app, ctx);
        }
      }
    };
    bwrap.appendChild(el);
  });

  $("#prevBtn").onclick = ()=>{
    st.i = Math.max(0, st.i-1);
    saveState(st);
    renderTest(app, ctx);
  };
  $("#nextBtn").onclick = ()=>{
    st.i = Math.min(total-1, st.i+1);
    saveState(st);
    renderTest(app, ctx);
  };
  $("#finishBtn").onclick = ()=>{
    location.hash = "#/result";
  };
}

function mean(arr){
  if(!arr.length) return 0;
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}

function buildScores(ctx, st){
  const {questions} = ctx.questions;
  const axisBuckets = {A1:[],A2:[],A3:[],A4:[],A5:[],A6:[]};
  const polBuckets = {P1:[],P2:[]};

  for(const q of questions){
    const v = st.answers[q.id];
    if(!v) continue;
    if(q.kind === "theory" || q.kind === "consistency"){
      if(q.axis.startsWith("A")){
        axisBuckets[q.axis].push(scoreScale1to7(v));
      }
    }else if(q.kind === "political"){
      // For political: statements with agree/disagree; map agree to right side if statement is "structural/critical"
      // We encode direction by flipping some statements in text set: we need per-question reverse flag.
      // Simple heuristic: statements that advocate personal/market-neutral are reversed.
      const txt = q.text;
      let s = scoreAgree1to7(v); // 0 disagree, 100 agree
      const reverse = (
        txt.includes("去污名") || 
        txt.includes("不必上升到结构") ||
        txt.includes("市场竞争") ||
        txt.includes("不是核心")
      );
      if(reverse) s = 100 - s;
      polBuckets[q.axis].push(s);
    }
  }
  const userVec = ["A1","A2","A3","A4","A5","A6"].map(k=>mean(axisBuckets[k]));
  const polVec = ["P1","P2"].map(k=>mean(polBuckets[k]));

  return {userVec, polVec};
}

function distWeighted(a,b,weights){
  let sum=0;
  for(let i=0;i<a.length;i++){
    const d = a[i]-b[i];
    sum += (weights[i]||1)*d*d;
  }
  return Math.sqrt(sum);
}
function simFromDist(d){
  return 100*Math.exp(-d/45);
}

function topN(obj,n){
  return Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n);
}

function pickMainSecond(sorted){
  const [m, mv] = sorted[0];
  const [s, sv] = sorted[1] || [null, -Infinity];
  const second = (s && (sv >= mv*0.85 || (mv - sv) <= 6)) ? s : null;
  return {main:m, second};
}

function buildNeighborDiff(typeA, typeB){
  // Return 3 bullet differences based on claims focus.
  const a = typeA;
  const b = typeB;
  // Simple contrast template using first two claims and actions
  const diffs = [];
  diffs.push(`关注重点：${a.name}更强调「${a.claims[0]}」，而${b.name}更强调「${b.claims[0]}」。`);
  diffs.push(`行动路径：${a.name}更常见的做法是「${a.actions[0]}」，而${b.name}更常见的做法是「${b.actions[0]}」。`);
  diffs.push(`争议敏感点：${a.name}更容易反对「${a.opposes[0]}」，而${b.name}更容易反对「${b.opposes[0]}」。`);
  return diffs;
}

let radarChart = null;
let barChart = null;

function renderResult(app, ctx){
  setActiveNav("/");
  const st = loadState();
  if(!st || !st.answers) { location.hash="#/"; return; }

  const {types, ideals, weights, political_ideals} = ctx.types;
  const typeById = Object.fromEntries(types.map(t=>[t.id,t]));
  const {userVec, polVec} = buildScores(ctx, st);

  // Sims on theory only
  const sims = {};
  for(const t of types){
    const d = distWeighted(userVec, ideals[t.id], weights);
    sims[t.id] = simFromDist(d);
  }
  const sorted = topN(sims, 9);
  const {main, second} = pickMainSecond(sorted);
  const mainType = typeById[main];
  const secondType = second ? typeById[second] : null;

  // Top5 for bar chart
  const top5 = sorted.slice(0,5);

  // Neighbor: next best excluding main and second
  const neighbors = sorted.map(x=>x[0]).filter(id=>id!==main && id!==second).slice(0,2).map(id=>typeById[id]);

  const axisDefs = ctx.dimensions.dimensions;

  app.innerHTML = `
    <div class="card">
      <div class="resultHead">
        <div>
          <div class="badge">你的理论谱系结果</div>
          <h2 class="typeName">${mainType.name}${secondType ? `（偏 ${secondType.name}）` : ""}</h2>
          <div class="typeTag">${mainType.tagline}</div>
        </div>
        <div class="typeChips">
          ${top5.map(([id, s])=>`<div class="chip">${typeById[id].name}<span>${s.toFixed(0)}</span></div>`).join("")}
        </div>
      </div>

      <hr class="hr"/>

      <div class="chartGrid">
        <div class="canvasWrap">
          <div class="sectionTitle">你的理解方式图谱</div>
          <canvas id="radar" height="220"></canvas>
          <div class="small" style="margin-top:8px">雷达图 6 轴：不使用学术词，描述你常用的理解路径。</div>
        </div>
        <div class="canvasWrap">
          <div class="sectionTitle">派别分布（Top 5）</div>
          <canvas id="bar" height="220"></canvas>
          <div class="small" style="margin-top:8px">分布来自“理论谱系”距离匹配；现实倾向单独在下方展示。</div>
        </div>
      </div>

      <hr class="hr"/>

      <div class="sectionTitle">这个派别主张什么 / 反对什么 / 怎么行动</div>
      <div class="grid3" style="margin-top:12px">
        <div class="card" style="box-shadow:none">
          <div class="badge">主张</div>
          <ul class="list">${mainType.claims.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
        </div>
        <div class="card" style="box-shadow:none">
          <div class="badge">反对</div>
          <ul class="list">${mainType.opposes.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
        </div>
        <div class="card" style="box-shadow:none">
          <div class="badge">行动方式</div>
          <ul class="list">${mainType.actions.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
        </div>
      </div>

      <div class="small" style="margin-top:10px">为什么你会被归到这里：系统会优先匹配你在 6 种理解路径上的整体形状；若出现“偏某派别”，表示你与该派别的整体形状也很接近。</div>

      <hr class="hr"/>

      ${renderPopularRefs(mainType)}

      <div class="sectionTitle">代表人物与思想贡献（理论来源）</div>
      <div class="figureGrid" style="margin-top:12px">
        ${(mainType.figures||[]).map(f=>`
          <div class="figureCard">
            <div class="figureName">${esc(f.name)}</div>
            <p class="figureMeta"><strong>主要观点：</strong>${esc(f.theory)}</p>
            <p class="figureMeta"><strong>贡献：</strong>${esc(f.contrib)}</p>
          </div>
        `).join("")}
      </div>

      ${renderLearnMore(mainType)}

      <hr class="hr"/>

      <div class="sectionTitle">与你接近的派别 & 核心差异（主张/态度/行动）</div>
      <div class="grid3" style="margin-top:12px">
        ${neighbors.map(nb=>{
          const diffs = buildNeighborDiff(mainType, nb);
          return `
            <div class="card" style="box-shadow:none">
              <div class="badge">临近派别</div>
              <div class="title" style="margin-top:10px">${esc(nb.name)}</div>
              <ul class="list">${diffs.map(d=>`<li>${esc(d)}</li>`).join("")}</ul>
            </div>
          `;
        }).join("")}
      </div>

      <hr class="hr"/>

      <div class="sectionTitle">现实立场倾向（不决定理论谱系）</div>
      <div class="grid3" style="margin-top:12px">
        <div class="card" style="box-shadow:none">
          <div class="badge">性议题倾向</div>
          <div class="title">${labelPol(polVec[0], "更私人化", "更结构化")}</div>
          <p class="p">你的得分：${polVec[0].toFixed(0)} / 100</p>
          <p class="p">越靠右表示越倾向把性议题放入结构关系中评估；越靠左表示越倾向按个人边界与同意框架处理。</p>
        </div>
        <div class="card" style="box-shadow:none">
          <div class="badge">经济/分配倾向</div>
          <div class="title">${labelPol(polVec[1], "更中立/正面", "更批判")}</div>
          <p class="p">你的得分：${polVec[1].toFixed(0)} / 100</p>
          <p class="p">越靠右表示越倾向批判市场与分配结构；越靠左表示越倾向相信市场+法律改良。</p>
        </div>
        <div class="card" style="box-shadow:none">
          <div class="badge">提示</div>
          <p class="p">如果你想看所有派别的定义、人物与特点，可在“派别百科”中查看。</p>
          <div class="actions">
            <button class="primary" id="goEncy">打开派别百科</button>
            <button class="secondary" id="retake">重新作答</button>
          </div>
        </div>
      </div>
    </div>
  `;

  $("#goEncy").onclick = ()=> location.hash="#/encyclopedia";
  $("#retake").onclick = ()=>{
    resetState();
    saveState({i:0, answers:{}});
    location.hash="#/test";
  };

  // Render charts
  const radarCtx = $("#radar");
  const barCtx = $("#bar");

  const labels = axisDefs.map(d=>`${d.left} ↔ ${d.right}`);
  const userData = userVec.map(v=>v);
  const mainIdeal = ideals[main].map(v=>v);
  const secondIdeal = second ? ideals[second].map(v=>v) : null;

  if(radarChart) radarChart.destroy();
  radarChart = new Chart(radarCtx, {
    type:"radar",
    data:{
      labels,
      datasets:[
        {label:"你", data:userData, borderWidth:2, pointRadius:2},
        {label:mainType.name, data:mainIdeal, borderDash:[6,4], borderWidth:2, pointRadius:0},
        ...(secondIdeal ? [{label:secondType.name, data:secondIdeal, borderDash:[3,3], borderWidth:2, pointRadius:0}] : [])
      ]
    },
    options:{
      responsive:true,
      scales:{ r:{ suggestedMin:0, suggestedMax:100, ticks:{display:false}, grid:{color:"rgba(107,114,128,.2)"}, angleLines:{color:"rgba(107,114,128,.2)"} } },
      plugins:{ legend:{ position:"bottom" } }
    }
  });

  if(barChart) barChart.destroy();
  barChart = new Chart(barCtx, {
    type:"bar",
    data:{
      labels: top5.map(([id,_])=>typeById[id].name),
      datasets:[{label:"匹配度", data: top5.map(([_,s])=>Number(s.toFixed(1))) }]
    },
    options:{
      responsive:true,
      plugins:{ legend:{ display:false } },
      scales:{ y:{ suggestedMin:0, suggestedMax:100, grid:{color:"rgba(107,114,128,.15)"} }, x:{ grid:{display:false} } }
    }
  });
}

function labelPol(v, left, right){
  if(v < 34) return left;
  if(v < 67) return "两者之间";
  return right;
}

function renderEncyclopedia(app, ctx){
  setActiveNav("/encyclopedia");
  const {types} = ctx.types;

  app.innerHTML = `
    <section class="hero">
      <h1 class="h1" style="font-size:38px">派别百科</h1>
      <p class="lead">每个派别用同一结构呈现：主张 / 反对 / 行动方式 / 大众参照 / 理论来源 / 进一步了解。</p>
    </section>

    <div class="grid3">
      ${types.map(t=>`
        <div class="card">
          <div class="cardTopLine"></div>
          <div class="badge">${esc(t.id)}</div>
          <div class="title">${esc(t.name)}</div>
          <p class="p">${esc(t.tagline)}</p>
          <div class="actions">
            <button class="primary" data-open="${esc(t.id)}">查看</button>
          </div>
        </div>
      `).join("")}
    </div>

    <div class="card" id="modal" style="display:none;margin:18px 0">
      <div class="actions" style="justify-content:space-between;margin-top:0">
        <div>
          <div class="badge" id="mId"></div>
          <div class="title" id="mTitle" style="margin-top:8px"></div>
          <p class="p" id="mTag"></p>
        </div>
        <button class="secondary" id="mClose">关闭</button>
      </div>

      <hr class="hr"/>

      <div class="grid3">
        <div class="card" style="box-shadow:none">
          <div class="badge">主张</div>
          <ul class="list" id="mClaims"></ul>
        </div>
        <div class="card" style="box-shadow:none">
          <div class="badge">反对</div>
          <ul class="list" id="mOpp"></ul>
        </div>
        <div class="card" style="box-shadow:none">
          <div class="badge">行动方式</div>
          <ul class="list" id="mAct"></ul>
        </div>
      </div>

      <hr class="hr"/>

      <div id="mPopular"></div>

      <div class="sectionTitle">代表人物与思想贡献（理论来源）</div>
      <div class="figureGrid" id="mFig" style="margin-top:12px"></div>

      <div id="mLearn"></div>
    </div>
  `;

  const typeById = Object.fromEntries(types.map(t=>[t.id,t]));
  const modal = $("#modal");

  $$("#app [data-open]").forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.dataset.open;
      const t = typeById[id];

      $("#mId").textContent = id;
      $("#mTitle").textContent = t.name;
      $("#mTag").textContent = t.tagline;

      $("#mClaims").innerHTML = (t.claims||[]).map(x=>`<li>${esc(x)}</li>`).join("");
      $("#mOpp").innerHTML = (t.opposes||[]).map(x=>`<li>${esc(x)}</li>`).join("");
      $("#mAct").innerHTML = (t.actions||[]).map(x=>`<li>${esc(x)}</li>`).join("");

      // 新增：大众参照 + 进一步了解
      $("#mPopular").innerHTML = renderPopularRefs(t);

      $("#mFig").innerHTML = (t.figures||[]).map(f=>`
        <div class="figureCard">
          <div class="figureName">${esc(f.name)}</div>
          <p class="figureMeta"><strong>主要观点：</strong>${esc(f.theory)}</p>
          <p class="figureMeta"><strong>贡献：</strong>${esc(f.contrib)}</p>
        </div>
      `).join("");

      $("#mLearn").innerHTML = renderLearnMore(t);

      modal.style.display="block";
      modal.scrollIntoView({behavior:"smooth", block:"start"});
    };
  });

  $("#mClose").onclick = ()=>{ modal.style.display="none"; };
}

function renderAbout(app){
  setActiveNav("/about");
  app.innerHTML = `
    <section class="hero">
      <h1 class="h1" style="font-size:38px">方法说明</h1>
      <p class="lead">题目以日常情境表达“理解方式”，后台用 6 轴形状与派别原型进行距离匹配；现实倾向（性议题 / 经济分配）独立计算并单独展示。</p>
    </section>

    <div class="card">
      <div class="sectionTitle">6 个理解方式轴</div>
      <ul class="list">
        <li>看重现实后果 ↔ 看重观念影响</li>
        <li>寻找关键原因 ↔ 接受多重因素</li>
        <li>需要共同立场 ↔ 接受多样路径</li>
        <li>偏向分析理解 ↔ 偏向明确态度</li>
        <li>优先改变规则 ↔ 优先改变观念</li>
        <li>寻找共通规律 ↔ 强调情境差异</li>
      </ul>
      <hr class="hr"/>
      <div class="sectionTitle">结果如何产生</div>
      <ul class="list">
        <li>每题 1–7 档映射到 0–100；同一轴取平均。</li>
        <li>用加权欧氏距离比较你的 6 轴向量与各派别原型向量，距离越小匹配度越高。</li>
        <li>若第二名与第一名接近，会显示“偏某派别”。</li>
        <li>现实倾向模块独立计算，不参与派别匹配。</li>
      </ul>
    </div>
  `;
}

async function boot(){
  const app = $("#app");
  const ctx = {
    dimensions: await loadJSON("./data/dimensions.json"),
    questions: await loadJSON("./data/questions.json"),
    types: await loadJSON("./data/types.json"),
    axisLabel(axis){
      const dims = this.dimensions.dimensions;
      const pol = this.dimensions.political_dimensions;
      const d = dims.find(x=>x.id===axis) || pol.find(x=>x.id===axis);
      return d || {left:"左侧", right:"右侧"};
    }
  };

  // Reset button
  $("#btnReset").onclick = ()=>{
    if(confirm("确定清空作答并从头开始？")){
      resetState();
      saveState({i:0, answers:{}});
      location.hash="#/";
    }
  };

  function render(){
    const r = route();
    if(r.startsWith("/encyclopedia")) return renderEncyclopedia(app, ctx);
    if(r.startsWith("/about")) return renderAbout(app);
    if(r.startsWith("/result")) return renderResult(app, ctx);
    if(r.startsWith("/test")) return renderTest(app, ctx);
    return renderHome(app, ctx);
  }

  window.addEventListener("hashchange", render);
  render();
}

boot().catch(err=>{
  console.error(err);
  $("#app").innerHTML = `<div class="card"><div class="title">加载失败</div><p class="p">${String(err)}</p></div>`;
});


