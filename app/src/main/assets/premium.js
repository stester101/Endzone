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
  if(t.buzz)haptic(t.buzz);
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

/* ---------- Shared API (window.EndzonePremium) ----------
   Used by share slip, Stats calendar and sweat mode. Native calls fall back to web APIs when the APK bridge is absent. */
const native=()=>window.EndzoneNative||null;
function haptic(pattern){
  const p=Array.isArray(pattern)?pattern:[pattern];
  try{const n=native();if(n&&n.haptic){n.haptic(p.join(','));return true;}}catch(e){}
  try{if(navigator.vibrate)return navigator.vibrate(p);}catch(e){}
  return false;
}
function keepAwake(on){
  try{const n=native();if(n&&n.keepAwake){n.keepAwake(!!on);return true;}}catch(e){}
  return false;
}
const legLabel=l=>{try{return EndzoneMarkets.label(l);}catch(e){return l.name||l.label||'Selection';}};
const legGame=(a,l)=>{try{return a.game(l.game);}catch(e){return null;}};
const legTitle=(a,l)=>{const g=legGame(a,l);return (g&&g.a&&g.h?g.a+' @ '+g.h+' · ':'')+legLabel(l);};
/* A bet counts as settled on the last kickoff among its legs (the app stores no settle date). */
function settledDay(a,b){
  const t=Math.max(0,...b.legs.map(l=>num(legGame(a,l)?.time)));
  return new Date(t||num(b.addedAt)||Date.now());
}
const dayKey=d=>{const x=new Date(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');};
function profit(a,b){return b.state==='won'?num(a.returnOf(b))-num(b.stake):b.state==='lost'?-num(b.stake):0;}
function slipText(a,b){
  const stateWord={open:'Open',won:'WON',lost:'LOST'}[b.state]||b.state;
  const lines=[`${b.name||'Bet'} · ${stateWord}`,...b.legs.map(l=>'• '+legTitle(a,l))];
  const ret=a.returnOf(b);
  lines.push(`Stake ${money(num(b.stake))} · Odds ${Number.isFinite(b.odds)?b.odds.toFixed(2):'—'} · Return ${money(ret)}`);
  lines.push('via Endzone');
  return lines.join('\n');
}
async function share(title,text,pngBase64){
  const n=native();
  try{
    if(n&&pngBase64&&n.shareImage&&n.shareImage(title,text,pngBase64))return 'native-image';
    if(n&&n.shareText){n.shareText(title,text);return 'native-text';}
  }catch(e){}
  try{if(navigator.share){await navigator.share({title,text});return 'web';}}catch(e){if(e&&e.name==='AbortError')return 'cancelled';}
  try{await navigator.clipboard.writeText(text);say({title:'Copied',text:'Slip text copied to clipboard',tone:'good',ms:2200});return 'clipboard';}catch(e){}
  return 'failed';
}
const subscribers=new Set();
window.EndzonePremium={version:1,fmt:{money,signed,esc},native,haptic,keepAwake,toast:t=>say(t),share,slipText,legLabel,legTitle,legClass:(l)=>legClass(app(),l),settledDay,dayKey,profit,onRender:fn=>{subscribers.add(fn);return()=>subscribers.delete(fn);},root};

/* ---------- Share slip ---------- */
const P=window.EndzonePremium;
function slipPng(a,b){
  try{
    const W=1080,pad=64,rowH=84,legs=b.legs.map(l=>({t:P.legTitle(a,l),c:P.legClass(l)}));
    const H=pad*2+330+legs.length*rowH+130,c=document.createElement('canvas');c.width=W;c.height=H;
    const g=c.getContext('2d');if(!g)return null;
    g.fillStyle='#070d0a';g.fillRect(0,0,W,H);
    g.fillStyle='#101b16';g.beginPath();g.roundRect?g.roundRect(32,32,W-64,H-64,36):g.rect(32,32,W-64,H-64);g.fill();
    const col={good:'#2ee08a',bad:'#ff5c76',pending:'#ffb732',future:'#6b7f74'};
    const stateCol=b.state==='won'?col.good:b.state==='lost'?col.bad:col.pending;
    g.textBaseline='alphabetic';
    g.fillStyle='#8fa59a';g.font='600 30px system-ui,Roboto,sans-serif';g.fillText('ENDZONE',pad+16,pad+54);
    g.fillStyle=stateCol;g.font='800 30px system-ui,Roboto,sans-serif';g.textAlign='right';g.fillText({open:'OPEN',won:'WON',lost:'LOST'}[b.state]||String(b.state).toUpperCase(),W-pad-16,pad+54);g.textAlign='left';
    g.fillStyle='#eef5f1';g.font='800 56px system-ui,Roboto,sans-serif';
    let name=String(b.name||'Bet');while(name.length>3&&g.measureText(name).width>W-pad*2-32)name=name.slice(0,-2);if(name!==String(b.name||'Bet'))name+='…';
    g.fillText(name,pad+16,pad+140);
    let y=pad+200;
    legs.forEach(l=>{
      g.fillStyle=col[l.c]||col.pending;g.beginPath();g.arc(pad+30,y+8,12,0,6.3);g.fill();
      g.fillStyle='#e8f1ec';g.font='500 34px system-ui,Roboto,sans-serif';
      let t=l.t;while(t.length>3&&g.measureText(t).width>W-pad*2-90)t=t.slice(0,-2);if(t!==l.t)t+='…';
      g.fillText(t,pad+62,y+20);y+=rowH;
    });
    y+=20;g.fillStyle='#24352c';g.fillRect(pad+16,y,W-pad*2-32,2);y+=70;
    const ret=a.returnOf(b),cells=[['STAKE',P.fmt.money(Number(b.stake))],['ODDS',Number.isFinite(b.odds)?b.odds.toFixed(2):'—'],[b.state==='won'?'RETURNED':'TO RETURN',P.fmt.money(ret)]];
    cells.forEach((x,i)=>{const cx=pad+16+i*((W-pad*2-32)/3);g.fillStyle='#8fa59a';g.font='600 26px system-ui,Roboto,sans-serif';g.fillText(x[0],cx,y);g.fillStyle=i===2?col.good:'#eef5f1';g.font='800 44px system-ui,Roboto,sans-serif';g.fillText(x[1],cx,y+56);});
    return c.toDataURL('image/png').split(',')[1];
  }catch(e){console.error('Endzone slip image',e);return null;}
}
async function shareBet(index){
  const a=app(),b=a&&a.bets()[index];if(!b)return;
  P.haptic(30);
  const how=await P.share(b.name||'Endzone slip',P.slipText(a,b),slipPng(a,b));
  if(how==='failed')P.toast({title:'Could not share',text:'No share target available',tone:'bad',ms:2500});
}
function injectShare(){
  root.querySelectorAll('[data-deletebet]').forEach(del=>{
    if(del.parentElement.querySelector('[data-sharebet]'))return;
    const btn=document.createElement('button');btn.type='button';btn.className=del.className+' ez-share';
    btn.dataset.sharebet=del.dataset.deletebet;btn.textContent='Share';
    del.before(btn);
  });
}
root.addEventListener('click',e=>{const b=e.target.closest('[data-sharebet]');if(!b)return;e.preventDefault();e.stopPropagation();shareBet(Number(b.dataset.sharebet));},true);
P.onRender(injectShare);

/* ---------- Stats calendar (profit/loss by day) ---------- */
let calMonth=null,calDay=null;
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
function calendarHtml(a){
  const settled=a.bets().filter(b=>b.state==='won'||b.state==='lost');
  const days=new Map();
  settled.forEach(b=>{const k=P.dayKey(P.settledDay(a,b));const d=days.get(k)||{pnl:0,bets:[]};d.pnl+=P.profit(a,b);d.bets.push(b);days.set(k,d);});
  const now=new Date();if(!calMonth)calMonth=new Date(now.getFullYear(),now.getMonth(),1);
  const y=calMonth.getFullYear(),m=calMonth.getMonth(),first=new Date(y,m,1),count=new Date(y,m+1,0).getDate();
  const lead=(first.getDay()+6)%7;let monthPnl=0,w=0,l=0;
  for(let d=1;d<=count;d++){const e=days.get(P.dayKey(new Date(y,m,d)));if(e){monthPnl+=e.pnl;e.bets.forEach(b=>b.state==='won'?w++:l++);}}
  let cells='';
  for(let i=0;i<lead;i++)cells+='<i class="ez-cal-pad"></i>';
  for(let d=1;d<=count;d++){
    const k=P.dayKey(new Date(y,m,d)),e=days.get(k),cls=!e?'':e.pnl>0?'pos':e.pnl<0?'neg':'flat';
    const today=k===P.dayKey(now)?' today':'',sel=calDay===k?' sel':'';
    cells+=e?`<button class="ez-cal-day ${cls}${today}${sel}" data-calday="${k}"><span>${d}</span><b>${P.fmt.signed(e.pnl).replace('£','')}</b></button>`:`<div class="ez-cal-day empty${today}"><span>${d}</span></div>`;
  }
  const sel=calDay&&days.get(calDay);
  const detail=sel?`<div class="ez-cal-detail"><b>${esc(new Date(calDay+'T12:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}))} · ${P.fmt.signed(sel.pnl)}</b>${sel.bets.map(b=>`<div class="${b.state}"><span>${esc(b.name||'Bet')}</span><em>${P.fmt.signed(P.profit(a,b))}</em></div>`).join('')}</div>`:'';
  return `<section class="ez-cal"><div class="ez-cal-head"><button data-calnav="-1" aria-label="Previous month">‹</button><div><small>PROFIT &amp; LOSS</small><h3>${MONTHS[m]} ${y}</h3></div><button data-calnav="1" aria-label="Next month">›</button></div>
<div class="ez-cal-sum"><span class="${monthPnl>0?'pos':monthPnl<0?'neg':''}">${P.fmt.signed(monthPnl)}</span><span>${w} won · ${l} lost</span></div>
<div class="ez-cal-grid">${['M','T','W','T','F','S','S'].map(x=>`<small>${x}</small>`).join('')}${cells}</div>${detail}<p class="ez-cal-note">Days use each bet's last kickoff. Lost stakes count as negative; pushes are not tracked.</p></section>`;
}
function injectCalendar(a){
  const st=root.querySelector('.stats');if(!st||st.hidden)return;
  if(st.querySelector('.ez-cal'))return;
  st.insertAdjacentHTML('afterbegin',calendarHtml(a));
}
root.addEventListener('click',e=>{
  const nav=e.target.closest('[data-calnav]'),day=e.target.closest('[data-calday]');
  if(!nav&&!day)return;
  if(nav){calMonth=new Date(calMonth.getFullYear(),calMonth.getMonth()+Number(nav.dataset.calnav),1);calDay=null;}
  else calDay=calDay===day.dataset.calday?null:day.dataset.calday;
  const cal=root.querySelector('.stats .ez-cal');if(cal&&app())cal.outerHTML=calendarHtml(app());
  P.haptic(15);
});
P.onRender(injectCalendar);

function update(){const a=app();if(!a)return;try{renderBar(a);markLive(a);watchScores(a);subscribers.forEach(fn=>{try{fn(a);}catch(e){console.error('Endzone premium module',e);}});}catch(e){console.error('Endzone premium',e);}}
window.addEventListener('endzone:render',update);
update();
})();
