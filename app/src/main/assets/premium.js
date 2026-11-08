/* Endzone premium layer: night theme, "your action" summary, score alerts with haptics.
   Reads app state through window.EndzoneApp only. Never writes bets or the endzone-v1 store. */
(function(){
'use strict';
const root=document.getElementById('ez-compact');
if(!root)return;
const html=document.documentElement,THEME_KEY='endzone-theme';
let theme='night';
try{theme=localStorage.getItem(THEME_KEY)||'night';}catch(e){}
const applyTheme=()=>html.classList.toggle('night',theme==='night');
applyTheme();

const app=()=>window.EndzoneApp;
const num=n=>Number.isFinite(n)?n:0;
const money=n=>Number.isFinite(n)?'£'+(Math.abs(n)>=1000?Math.round(n).toLocaleString('en-GB'):n.toFixed(2)):'—';
const signed=n=>(n>0?'+':n<0?'−':'')+money(Math.abs(n));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WEEK=7*864e5;

/* ---------- Your action summary ---------- */
const bar=document.createElement('section');
bar.className='ez-sweat';bar.setAttribute('aria-label','Your action');
root.querySelector('header')?.after(bar);
bar.addEventListener('click',()=>{const a=app();if(a&&a.view()!=='bets')a.go('bets');});

function legClass(a,l){
  try{const c=a.signal(l).cls;return ['good','bad','pending','future'].includes(c)?c:'pending';}catch(e){return 'pending';}
}
function renderBar(a){
  const view=a.view();
  bar.hidden=!['games','bets'].includes(view);
  if(bar.hidden)return;
  const all=a.bets(),open=all.filter(b=>b.state==='open');
  const legs={good:0,pending:0,bad:0,future:0};let live=0;
  open.forEach(b=>{let isLive=false;b.legs.forEach(l=>{legs[legClass(a,l)]++;if(a.game(l.game).state==='live')isLive=true;});if(isLive)live++;});
  const stake=open.reduce((s,b)=>s+num(b.stake),0);
  const ret=open.reduce((s,b)=>s+num(a.returnOf(b)),0);
  const since=Date.now()-WEEK;
  const pnl=all.filter(b=>b.state!=='open'&&num(b.settledAt||b.addedAt)>=since).reduce((s,b)=>s+(b.state==='won'?num(a.returnOf(b))-num(b.stake):-num(b.stake)),0);
  const total=legs.good+legs.pending+legs.bad+legs.future;
  if(!open.length){
    bar.innerHTML=`<div class="ez-sweat-empty"><span>No open bets</span><span class="${pnl>0?'pos':pnl<0?'neg':''}">7-day ${signed(pnl)}</span></div>`;
    return;
  }
  const seg=k=>legs[k]?`<i class="${k}" style="flex:${legs[k]}"></i>`:'';
  const parts=[legs.good&&`<span class="good">${legs.good} on track</span>`,legs.pending&&`<span class="pending">${legs.pending} in the balance</span>`,legs.bad&&`<span class="bad">${legs.bad} behind</span>`,legs.future&&`<span>${legs.future} to play</span>`].filter(Boolean).join('');
  bar.innerHTML=`<div class="ez-sweat-top">
<div><small>In play</small><b>${money(stake)}</b></div>
<div><small>To return</small><b class="pos">${money(ret)}</b></div>
<div><small>7-day P&amp;L</small><b class="${pnl>0?'pos':pnl<0?'neg':''}">${signed(pnl)}</b></div>
<div class="ez-sweat-count"><small>${live?'<span class="ez-pulse"></span>Live':'Open'}</small><b>${live||open.length}</b></div>
</div>
<div class="ez-legbar" aria-hidden="true">${total?seg('good')+seg('pending')+seg('bad')+seg('future'):''}</div>
<div class="ez-sweat-legs">${parts}</div>`;
}

/* ---------- Live card accents ---------- */
function markLive(a){
  root.querySelectorAll('.games article[data-game]').forEach(el=>{const g=a.game(el.dataset.game);el.classList.toggle('ez-live',g.state==='live');});
}

/* ---------- Score alerts ---------- */
const toast=document.createElement('div');
toast.className='ez-toast';toast.hidden=true;toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
(root.querySelector('.app')||root).appendChild(toast);
let toastTimer=null;const queue=[];
toast.addEventListener('click',()=>{hideToast();app()?.go('feed');});
function hideToast(){toast.classList.remove('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;next();},250);}
function next(){
  if(!toast.hidden||!queue.length)return;
  const t=queue.shift();
  toast.className='ez-toast '+t.tone;
  toast.innerHTML=`<b>${esc(t.title)}</b><span>${esc(t.text)}</span>`;
  toast.hidden=false;requestAnimationFrame(()=>toast.classList.add('show'));
  if(t.buzz&&navigator.vibrate){try{navigator.vibrate(t.buzz);}catch(e){}}
  clearTimeout(toastTimer);toastTimer=setTimeout(hideToast,t.ms||5500);
}
function say(t){queue.push(t);next();}

const kind=p=>p>=6?'Touchdown':p===3?'Field goal':p===2?'Safety / 2-pt':p===1?'Extra point':'Score';
let prev=null;
function watchScores(a){
  const now=new Map(a.games().map(g=>[g.id,{as:g.as,hs:g.hs,state:g.state}]));
  if(prev){
    now.forEach((s,id)=>{
      const p=prev.get(id);if(!p)return;
      const linked=a.linked(id);if(!linked.length)return;
      const g=a.game(id),line=`${g.a} ${s.as}–${s.hs} ${g.h}`;
      const legsHere=linked.flatMap(b=>b.legs.filter(l=>l.game===id).map(l=>({b,c:legClass(a,l)})));
      const good=legsHere.filter(x=>x.c==='good').length,bad=legsHere.filter(x=>x.c==='bad').length;
      const tone=bad&&!good?'bad':good&&!bad?'good':'pending';
      const verdict=`${linked.length} bet${linked.length>1?'s':''} · ${good?good+' on track':''}${good&&bad?', ':''}${bad?bad+' behind':''}${!good&&!bad?'in the balance':''}`;
      if(p.state!=='final'&&s.state==='final'){
        say({title:'Final · '+line,text:verdict,tone,buzz:tone==='bad'?[220]:[60,80,60,80,160],ms:7000});
      }else if(s.as!==p.as||s.hs!==p.hs){
        const side=s.as-p.as>s.hs-p.hs?'away':'home',pts=side==='away'?s.as-p.as:s.hs-p.hs;
        if(pts<=0)return;
        say({title:`${kind(pts)} ${side==='away'?g.a:g.h} · ${line}`,text:verdict,tone,buzz:tone==='bad'?[200]:tone==='good'?[40,60,40]:[80]});
      }
    });
  }
  prev=now;
}

/* ---------- Theme toggle: tap the Endzone logo ---------- */
root.addEventListener('click',e=>{
  if(!e.target.closest('.endzone-brand'))return;
  theme=theme==='night'?'light':'night';
  try{localStorage.setItem(THEME_KEY,theme);}catch(err){}
  applyTheme();
  say({title:theme==='night'?'Night theme':'Light theme',text:'Tap the logo to switch',tone:'pending',ms:1800});
});

function update(){const a=app();if(!a)return;try{renderBar(a);markLive(a);watchScores(a);}catch(e){console.error('Endzone premium',e);}}
window.addEventListener('endzone:render',update);
update();
})();
