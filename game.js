‘use strict’;

/* ═══════════════════════════════════════
GAME STATE
═══════════════════════════════════════ */
const G = {
name:‘STICK’, str:5, int:5, cha:5, kar:0,
money:50, day:1, hour:8, energy:100,
jobId:null, jobLevel:0, jobShiftsToday:0,
bankBalance:0, loan:0, apartment:‘Street’,
hasCar:false, furniture:0,
hasCoke:false, stockShares:0, stockPrice:10,
fightWins:0, escaped:false,
usedTV:false, usedConsole:false,
heitkampRobbed:false, heitkampRobbedDay:0
};

/* ═══════════════════════════════════════
SAVE / LOAD
═══════════════════════════════════════ */
const SAVE_KEY = ‘stickrpg_v2’;
let saveTimer = null;

function saveGame() {
try {
localStorage.setItem(SAVE_KEY, JSON.stringify({ G, px, py }));
const el = document.getElementById(‘saveInd’);
el.classList.add(‘on’);
setTimeout(() => el.classList.remove(‘on’), 1800);
} catch(e) { bugLog(’Save error: ’ + e.message); }
}

function loadGame() {
try {
const raw = localStorage.getItem(SAVE_KEY);
if (!raw) return false;
const d = JSON.parse(raw);
if (!d || !d.G) return false;
Object.assign(G, d.G);
if (typeof d.px === ‘number’) px = d.px;
if (typeof d.py === ‘number’) py = d.py;
return true;
} catch(e) { bugLog(’Load error: ’ + e.message); return false; }
}

function hasSave() {
try { return !!localStorage.getItem(SAVE_KEY); } catch(e) { return false; }
}

function deleteSaveData() {
try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
}

function queueSave() {
if (saveTimer) clearTimeout(saveTimer);
saveTimer = setTimeout(saveGame, 700);
}

/* ═══════════════════════════════════════
SOUND ENGINE (Web Audio — no files)
═══════════════════════════════════════ */
let _ac = null;
function getAC() { if (!_ac) _ac = new (window.AudioContext||window.webkitAudioContext)(); return _ac; }

function sfx(type) {
try {
const ac = getAC();
const g = ac.createGain();
g.connect(ac.destination);
const o = ac.createOscillator();
o.connect(g);
const now = ac.currentTime;
switch(type) {
case ‘coin’:
o.type=‘sine’; o.frequency.setValueAtTime(880,now); o.frequency.exponentialRampToValueAtTime(1200,now+.08);
g.gain.setValueAtTime(.18,now); g.gain.exponentialRampToValueAtTime(.001,now+.2);
o.start(now); o.stop(now+.2); break;
case ‘lose’:
o.type=‘sawtooth’; o.frequency.setValueAtTime(300,now); o.frequency.exponentialRampToValueAtTime(100,now+.25);
g.gain.setValueAtTime(.15,now); g.gain.exponentialRampToValueAtTime(.001,now+.3);
o.start(now); o.stop(now+.3); break;
case ‘level’:
// fanfare — two notes
[0,.1].forEach((t,i)=>{
const o2=ac.createOscillator(); const g2=ac.createGain();
o2.connect(g2); g2.connect(ac.destination);
o2.type=‘square’; o2.frequency.value=[660,880][i];
g2.gain.setValueAtTime(.12,now+t); g2.gain.exponentialRampToValueAtTime(.001,now+t+.18);
o2.start(now+t); o2.stop(now+t+.2);
}); break;
case ‘punch’:
o.type=‘sawtooth’; o.frequency.setValueAtTime(150,now); o.frequency.exponentialRampToValueAtTime(60,now+.12);
g.gain.setValueAtTime(.2,now); g.gain.exponentialRampToValueAtTime(.001,now+.15);
o.start(now); o.stop(now+.15); break;
case ‘buy’:
o.type=‘sine’; o.frequency.setValueAtTime(440,now); o.frequency.setValueAtTime(550,now+.06); o.frequency.setValueAtTime(660,now+.12);
g.gain.setValueAtTime(.1,now); g.gain.exponentialRampToValueAtTime(.001,now+.25);
o.start(now); o.stop(now+.25); break;
case ‘ach’:
[0,.08,.16,.24].forEach((t,i)=>{
const o2=ac.createOscillator(); const g2=ac.createGain();
o2.connect(g2); g2.connect(ac.destination);
o2.type=‘sine’; o2.frequency.value=[523,659,784,1047][i];
g2.gain.setValueAtTime(.12,now+t); g2.gain.exponentialRampToValueAtTime(.001,now+t+.15);
o2.start(now+t); o2.stop(now+t+.18);
}); break;
case ‘tap’:
o.type=‘sine’; o.frequency.value=800;
g.gain.setValueAtTime(.05,now); g.gain.exponentialRampToValueAtTime(.001,now+.06);
o.start(now); o.stop(now+.07); break;
}
} catch(e) {}
}

/* ═══════════════════════════════════════
ACHIEVEMENT SYSTEM
═══════════════════════════════════════ */
const ACHIEVEMENTS = [
{id:‘first_job’,    icon:‘💼’, name:‘First Paycheck’,   check:()=>G.jobId!==null},
{id:‘broke_no_more’,icon:‘💰’, name:‘Not Broke Anymore’,check:()=>G.money>=100},
{id:‘grand’,        icon:‘🤑’, name:‘Grand!’,           check:()=>G.money>=1000},
{id:‘ten_grand’,    icon:‘💎’, name:‘Ten Large’,        check:()=>G.money>=10000},
{id:‘first_fight’,  icon:‘👊’, name:‘First Blood’,      check:()=>G.fightWins>=1},
{id:‘fighter’,      icon:‘🥊’, name:‘Street Fighter’,   check:()=>G.fightWins>=10},
{id:‘buff’,         icon:‘💪’, name:‘Getting Buff’,     check:()=>G.str>=20},
{id:‘genius’,       icon:‘🧠’, name:‘Big Brain’,        check:()=>G.int>=20},
{id:‘charmer’,      icon:‘✨’, name:‘Charmer’,          check:()=>G.cha>=20},
{id:‘saint’,        icon:‘😇’, name:‘Saint’,            check:()=>G.kar>=50},
{id:‘villain’,      icon:‘😈’, name:‘Villain’,          check:()=>G.kar<=-50},
{id:‘home_owner’,   icon:‘🏠’, name:‘Home Owner’,       check:()=>G.apartment!==‘Street’},
{id:‘car_owner’,    icon:‘🚗’, name:‘Car Owner’,        check:()=>G.hasCar},
{id:‘furnished’,    icon:‘🛋️’, name:‘Fully Furnished’,  check:()=>G.furniture>=6},
{id:‘investor’,     icon:‘📈’, name:‘Investor’,         check:()=>G.stockShares>=10},
{id:‘loan_free’,    icon:‘🎉’, name:‘Debt Free’,        check:()=>G.loan===0&&G.day>1},
{id:‘criminal’,     icon:‘🦹’, name:‘Criminal’,         check:()=>G.kar<=-30&&G.fightWins>=3},
{id:‘day10’,        icon:‘📅’, name:‘Still Alive’,      check:()=>G.day>=10},
{id:‘day30’,        icon:‘🗓️’, name:‘Month In’,         check:()=>G.day>=30},
{id:‘escape_ready’, icon:‘🌀’, name:‘Ready to Escape’,  check:()=>G.hasCar&&G.money>=10000&&G.str>=30&&G.int>=30&&G.cha>=30},
];
const unlockedAch = new Set();

function checkAchievements() {
ACHIEVEMENTS.forEach(a => {
if (!unlockedAch.has(a.id) && a.check()) {
unlockedAch.add(a.id);
showAchievement(a);
}
});
}

function showAchievement(a) {
sfx(‘ach’);
const container = document.getElementById(‘achBadge’);
const el = document.createElement(‘div’);
el.className = ‘ach-pop’;
el.innerHTML = `<span class="ach-icon">${a.icon}</span><div class="ach-title">ACHIEVEMENT</div><div class="ach-name">${a.name}</div>`;
container.appendChild(el);
setTimeout(() => el.remove(), 3200);
addMsg(`🏆 Achievement: ${a.name}!`, ‘o’);
}

/* ═══════════════════════════════════════
KARMA WORLD CONSEQUENCES
═══════════════════════════════════════ */
function karmaDiscount() {
// Good karma: up to 20% discount at legitimate shops
if (G.kar >= 30) return 0.8;
if (G.kar >= 15) return 0.9;
return 1.0;
}
function karmaMarkup() {
// Evil karma: police suspicious, legit shops charge more
if (G.kar <= -30) return 1.2;
return 1.0;
}
function karmaEvilBonus() {
// Evil karma: better deals at shady places
if (G.kar <= -30) return 1.3;
if (G.kar <= -15) return 1.15;
return 1.0;
}
function karmaDesc() {
if (G.kar >= 50)  return ‘😇 Saint — people trust you’;
if (G.kar >= 20)  return ‘🙂 Good — discounts at shops’;
if (G.kar >= 5)   return ‘😐 Neutral’;
if (G.kar >= -5)  return ‘😐 Neutral’;
if (G.kar >= -20) return ‘😠 Shady — shops charge more’;
if (G.kar >= -50) return ‘😈 Evil — feared on the street’;
return ‘👹 Monster — all NPCs fear you’;
}

/* ═══════════════════════════════════════
BUG PANEL
═══════════════════════════════════════ */
const bugEntries = [];

function bugLog(msg) {
const ts = ‘Day’ + G.day + ’ $’ + G.money;
bugEntries.push(’[’ + ts + ‘] ’ + msg);
if (bugEntries.length > 50) bugEntries.shift();
const el = document.getElementById(‘bugLog’);
if (el) { el.textContent = bugEntries.join(’\n’); el.scrollTop = el.scrollHeight; }
console.warn(’[BUG]’, msg);
}

function setupBugPanel() {
const toggle = document.getElementById(‘bugToggle’);
const panel  = document.getElementById(‘bugPanel’);
const send   = document.getElementById(‘bugSend’);
const close  = document.getElementById(‘bugClose’);
const input  = document.getElementById(‘bugInput’);

toggle.addEventListener(‘click’, () => panel.classList.toggle(‘open’));
close.addEventListener(‘click’,  () => panel.classList.remove(‘open’));

function sendBug() {
const msg = input.value.trim();
if (!msg) return;
// Log full game state alongside report
const state = `STR:${G.str} INT:${G.int} CHA:${G.cha} KAR:${G.kar} $${G.money} Day:${G.day} Job:${G.jobId||'none'}`;
bugLog(’USER REPORT: ’ + msg + ’ | State: ’ + state);
input.value = ‘’;
toast(‘Bug reported! 🐛’);
}

send.addEventListener(‘click’, sendBug);
input.addEventListener(‘keydown’, e => { if (e.key === ‘Enter’) sendBug(); });

// Global error catcher
window.addEventListener(‘error’, e => bugLog(’JS ERROR: ’ + e.message + ’ (line ’ + e.lineno + ‘)’));
window.addEventListener(‘unhandledrejection’, e => bugLog(’PROMISE: ’ + e.reason));
}

/* ═══════════════════════════════════════
MESSAGES / TOAST / STAT POP
═══════════════════════════════════════ */
const msgLines = [];
function addMsg(text, type=‘s’) {
msgLines.push({ text, type });
if (msgLines.length > 6) msgLines.shift();
const log = document.getElementById(‘log’);
log.innerHTML = msgLines.map(m => `<div class="ml m${m.type}">${m.text}</div>`).join(’’);
}

let toastTimer = null;
function toast(txt) {
const el = document.getElementById(‘toast’);
el.textContent = txt;
el.classList.remove(‘h’);
if (toastTimer) clearTimeout(toastTimer);
toastTimer = setTimeout(() => el.classList.add(‘h’), 2600);
}

const STAT_COLOR = { str:’#ff6633’, int:’#44aaff’, cha:’#ff88ff’, kar:’#ffd700’, money:’#00ff88’ };
const STAT_ICON  = { str:‘💪’, int:‘🧠’, cha:‘✨’, kar:‘☯’, money:’$’ };

function statPop(stat, amount) {
if (!amount) return;
const el = document.createElement(‘div’);
el.className = ‘statpop’;
el.style.color = STAT_COLOR[stat] || ‘#fff’;
el.textContent = (STAT_ICON[stat] || ‘’) + (amount > 0 ? ‘+’ : ‘’) + amount;
const vp = document.getElementById(‘viewport’).getBoundingClientRect();
el.style.left = (vp.left + vp.width / 2 - 24 + (Math.random() * 40 - 20)) + ‘px’;
el.style.top  = (vp.top  + vp.height / 2 - 10) + ‘px’;
document.body.appendChild(el);
setTimeout(() => el.remove(), 950);
}

function statPops(changes) {
let i = 0;
for (const [stat, amt] of Object.entries(changes)) {
if (amt === 0) continue;
setTimeout(() => statPop(stat, amt), i * 110);
i++;
}
}

/* ═══════════════════════════════════════
HUD
═══════════════════════════════════════ */
function updateHUD() {
document.getElementById(‘hN’).textContent = G.name;
document.getElementById(‘hS’).textContent = ’STR ’ + G.str;
document.getElementById(‘hI’).textContent = ’INT ’ + G.int;
document.getElementById(‘hC’).textContent = ’CHA ’ + G.cha;
document.getElementById(‘hK’).textContent = ’☯ ’  + G.kar;
document.getElementById(‘hM’).textContent = ‘$’   + G.money;
document.getElementById(‘hD’).textContent = ’DAY ’+ G.day;
const h = G.hour;
const ampm = h < 12 ? ‘AM’ : ‘PM’;
const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h;
document.getElementById(‘hTime’).textContent = h12 + ampm;
const eEl = document.getElementById(‘hEnergy’);
eEl.textContent = ‘⚡’ + G.energy;
eEl.style.borderColor = G.energy > 50 ? ‘#4fc’ : G.energy > 20 ? ‘#fa0’ : ‘#f44’;
eEl.style.color       = G.energy > 50 ? ‘#4fc’ : G.energy > 20 ? ‘#fa0’ : ‘#f44’;
updateSky();
drawMinimap();
}

/* ── SKY COLOR BY TIME ── */
function updateSky() {
const h = G.hour;
// Sky gradient colors: [hour, bg, overlay-rgba]
const skyStops = [
[0,  ‘#050518’, ‘rgba(0,0,30,0.7)’],
[5,  ‘#1a0a2a’, ‘rgba(20,5,40,0.5)’],
[6,  ‘#e07030’, ‘rgba(200,80,20,0.3)’],   // sunrise
[7,  ‘#f09050’, ‘rgba(180,60,10,0.15)’],
[8,  ‘#87ceeb’, ‘rgba(0,0,0,0)’],           // day
[17, ‘#87ceeb’, ‘rgba(0,0,0,0)’],
[18, ‘#e08040’, ‘rgba(180,60,10,0.2)’],     // sunset
[19, ‘#c05030’, ‘rgba(150,30,10,0.3)’],
[20, ‘#3a1a4a’, ‘rgba(30,10,50,0.5)’],
[21, ‘#1a0828’, ‘rgba(10,5,30,0.65)’],
[22, ‘#050518’, ‘rgba(0,0,20,0.72)’],
[24, ‘#050518’, ‘rgba(0,0,30,0.75)’],
];
let bg = ‘#87ceeb’, ov = ‘rgba(0,0,0,0)’;
for (let i = 0; i < skyStops.length - 1; i++) {
const [h0, bg0, ov0] = skyStops[i];
const [h1, bg1, ov1] = skyStops[i+1];
if (h >= h0 && h < h1) { bg = bg0; ov = ov0; break; }
}
document.getElementById(‘viewport’).style.background = bg;
document.getElementById(‘skyOverlay’).style.background = ov;
// Night-time darkness over world
document.getElementById(‘world’).style.filter = (h >= 20 || h < 6) ? ‘brightness(0.55)’ : h >= 18 ? ‘brightness(0.8)’ : ‘none’;
}

/* ── MINIMAP ── */
function drawMinimap() {
const canvas = document.getElementById(‘minimapCanvas’);
if (!canvas) return;
const ctx = canvas.getContext(‘2d’);
const mw = 80, mh = 80;
const scaleX = mw / W, scaleY = mh / H;
ctx.clearRect(0, 0, mw, mh);
// Background
ctx.fillStyle = ‘#1a3a1a’; ctx.fillRect(0, 0, mw, mh);
// Roads
ctx.fillStyle = ‘#555’;
ctx.fillRect(0, RY*scaleY, mw, RH*scaleY);
ctx.fillRect(RX*scaleX, 0, RW*scaleX, mh);
// Buildings as colored dots
const bColors = {apartment:’#4a6aab’,university:’#6b5a2a’,castle:’#888’,newlines:’#2a3a6a’,
gym:’#2a4818’,bank:’#7a1818’,hospital:’#e8eee8’,realestate:’#c8962a’,police:’#0e1e5a’,
mcsticks:’#c07010’,bar:’#5a2808’,dealer:’#0e0e0e’,market:’#8a2810’,market2:’#8a3010’,
casino:’#2a0438’,busdepot:’#184858’,hospital2:’#d8e8d0’,police2:’#aaa888’,heitkamp:’#8B4513’};
BUILDINGS.forEach(b => {
ctx.fillStyle = bColors[b.id] || ‘#666’;
ctx.fillRect(b.x*scaleX, b.y*scaleY, Math.max(4, b.w*scaleX), Math.max(3, b.h*scaleY));
});
// Player dot
ctx.fillStyle = ‘#00ff88’;
ctx.beginPath();
ctx.arc(px*scaleX, py*scaleY, 3, 0, Math.PI*2);
ctx.fill();
// Player dot glow
ctx.strokeStyle = ‘#00ff88’;
ctx.lineWidth = 1;
ctx.stroke();
}

/* ═══════════════════════════════════════
WORLD CONSTANTS
═══════════════════════════════════════ */
// Road cross centered in world
// Left buildings need ~500px, right buildings need ~500px
// Road width 100px, so total ≈ 500 + 100 + 500 = 1100 + padding
const W = 1200, H = 1100;
const RX = 530, RW = 100, RY = 480, RH = 100;
// Sidewalk thickness on each road edge
const SW = 16;

// All buildings sit RIGHT against the sidewalk edge of a road
// door faces the road it’s on
// TOP-LEFT quadrant: right edge = RX, bottom edge = RY
// TOP-RIGHT quadrant: left edge = RX+RW, bottom edge = RY
// BOTTOM-LEFT quadrant: right edge = RX, top edge = RY+RH
// BOTTOM-RIGHT quadrant: left edge = RX+RW, top edge = RY+RH

const BUILDINGS = [
{id:‘apartment’,  label:‘YOUR APT’,    x:RX-168, y:10,          w:155, h:120, door:‘right’},
{id:‘university’, label:‘UNIVERSITY’,  x:RX-168, y:148,         w:155, h:140, door:‘right’},
{id:‘castle’,     label:‘CASTLE’,      x:RX-168, y:308,         w:155, h:150, door:‘right’},
{id:‘newlines’,   label:‘NEW LINES’,   x:RX-338, y:RY-138,      w:155, h:125, door:‘down’},
{id:‘gym’,        label:“JIM’S GYM”,   x:RX-508, y:RY-128,      w:155, h:115, door:‘down’},
{id:‘bank’,       label:‘CITY BANK’,   x:RX+RW+5, y:10,         w:160, h:130, door:‘left’},
{id:‘hospital’,   label:‘HOSPITAL’,    x:RX+RW+5, y:158,        w:155, h:130, door:‘left’},
{id:‘realestate’, label:‘REAL ESTATE’, x:RX+RW+5, y:306,        w:155, h:130, door:‘left’},
{id:‘police’,     label:‘POLICE DEPT’, x:RX+RW+175, y:RY-138,   w:155, h:125, door:‘down’},
{id:‘market’,     label:‘FOOD MART’,   x:RX+RW+345, y:RY-128,   w:145, h:115, door:‘down’},
{id:‘mcsticks’,   label:“McSTICK’S”,   x:RX-168, y:RY+RH+5,    w:155, h:125, door:‘right’},
{id:‘bar’,        label:‘THE BAR’,     x:RX-168, y:RY+RH+148,  w:155, h:115, door:‘right’},
{id:‘heitkamp’,   label:‘HEITKAMP MASONRY’, x:RX-168, y:RY+RH+282, w:155, h:120, door:‘right’},
{id:‘dealer’,     label:‘BACK ALLEY’,  x:RX-338, y:RY+RH+5,    w:140, h:110, door:‘up’},
{id:‘market2’,    label:‘SHOP’,        x:RX-493, y:RY+RH+5,    w:140, h:110, door:‘up’},
{id:‘casino’,     label:‘CASINO’,      x:RX+RW+5, y:RY+RH+5,   w:160, h:130, door:‘left’},
{id:‘busdepot’,   label:‘BUS DEPOT’,   x:RX+RW+5, y:RY+RH+153, w:155, h:110, door:‘left’},
{id:‘hospital2’,  label:‘CLINIC’,      x:RX+RW+175, y:RY+RH+5, w:145, h:110, door:‘up’},
{id:‘police2’,    label:‘COURT HOUSE’, x:RX+RW+335, y:RY+RH+5, w:155, h:125, door:‘up’},
];

const TREES = [
{x:RX-520,y:20},{x:RX-520,y:160},
{x:RX+RW+520,y:20},{x:RX+RW+520,y:160},
{x:RX-520,y:RY+RH+160},{x:RX-520,y:RY+RH+280},
{x:RX+RW+520,y:RY+RH+160},{x:RX+RW+520,y:RY+RH+280},
{x:RX-20,y:20},{x:RX-20,y:RY+RH+20},
];

/* ── SVG building drawer ── */
function drawBuilding(id, w, h) {
const ns = ‘http://www.w3.org/2000/svg’;
const s = document.createElementNS(ns,‘svg’);
s.setAttribute(‘width’,w); s.setAttribute(‘height’,h);
s.setAttribute(‘viewBox’,`0 0 ${w} ${h}`);
s.style.cssText = ‘display:block;overflow:visible’;

const mk = (tag,attrs,text) => {
const e = document.createElementNS(ns,tag);
for(const[k,v] of Object.entries(attrs)) e.setAttribute(k,v);
if(text!=null) e.textContent=text;
s.appendChild(e); return e;
};
const R  = (x,y,w,h,f,ex={}) => mk(‘rect’,{x,y,width:w,height:h,fill:f,…ex});
const T  = (x,y,f,fs,txt,ex={}) => mk(‘text’,{x,y,fill:f,‘font-size’:fs,‘font-family’:‘VT323,monospace’,‘text-anchor’:‘middle’,…ex},txt);
const L  = (x1,y1,x2,y2,st,sw=1) => mk(‘line’,{x1,y1,x2,y2,stroke:st,‘stroke-width’:sw});
const P  = (pts,f,ex={}) => mk(‘polygon’,{points:pts.map(p=>p.join(’,’)).join(’ ‘),fill:f,…ex});
const W  = (x,y,ww,wh,lit) => R(x,y,ww,wh,lit?’#fffde0’:’#4a6a80’,{rx:‘1’,stroke:lit?’#d4b000’:’#2a3a50’,‘stroke-width’:‘1’});
const lit = () => Math.random() > 0.3;

switch(id) {

```
case 'apartment':
  R(0,0,w,h,'#5a7ab8',{rx:'2',stroke:'#1a3a70','stroke-width':'2'});
  for(let y=8;y<h;y+=12) L(0,y,w,y,'#4a6aa8');
  for(let y=8;y<h;y+=24) for(let x=0;x<w;x+=24) L(x,y,x+12,y,'#6888c0');
  R(0,0,w,20,'#2a4a80',{stroke:'#1a3a70','stroke-width':'1'});
  // AC unit
  R(w-26,4,20,12,'#888',{rx:'2',stroke:'#555','stroke-width':'1'});
  R(w-24,6,16,8,'#aaa');
  [[10,26],[50,26],[90,26],[10,58],[50,58],[90,58]].forEach(p=>W(p[0],p[1],30,22,lit()));
  R(w-16,h/2-7,14,14,'#2a1400',{rx:'1',stroke:'#ffd700','stroke-width':'1'});
  mk('circle',{cx:w-10,cy:h/2,r:'2',fill:'#ffd700'});
  R(w-38,h/2-10,20,12,'#1a3060',{rx:'2',stroke:'#7ab4ff','stroke-width':'1'});
  T(w-28,h/2+1,'#7ab4ff','8','🏠 APT');
  break;

case 'university':
  R(0,0,w,h,'#7a6030',{rx:'2',stroke:'#3a2a08','stroke-width':'2'});
  R(0,0,w,24,'#5a4020',{stroke:'#3a2a08','stroke-width':'1'});
  // Water tower
  R(8,2,14,14,'#8B5E3C',{rx:'2',stroke:'#5a3010','stroke-width':'1'});
  L(14,16,14,22,'#5a3010',2); L(10,22,18,22,'#5a3010',2);
  [10,32,56,80,106,128].forEach(x => {
    R(x,24,9,h-24,'#8a7040',{stroke:'#5a4020','stroke-width':'1'});
    R(x-2,20,13,8,'#9a8050');
  });
  [[14,30],[38,30],[64,30],[88,30],[114,30],
   [14,70],[38,70],[64,70],[88,70],[114,70]].forEach(p =>
    R(p[0],p[1],18,24,lit()?'#fffde0':'#3a2808',{rx:'8 8 0 0',stroke:'#7a6030','stroke-width':'1'}));
  P([[0,0],[w/2,-18],[w,0]],'#5a4020',{stroke:'#3a2a08','stroke-width':'1'});
  T(w/2,-4,'#ffe080','10','📚 U of S',{'font-weight':'bold'});
  R(w/2-7,h-16,14,16,'#2a1800',{rx:'3 3 0 0',stroke:'#9a8050','stroke-width':'1'});
  break;

case 'castle':
  R(0,0,w,h,'#7a7a7a',{stroke:'#3a3a3a','stroke-width':'2'});
  for(let y=0;y<h;y+=14) for(let x=(Math.floor(y/14)%2)*12;x<w;x+=24)
    R(x,y,22,13,'#888',{stroke:'#5a5a5a','stroke-width':'0.5'});
  // Towers
  R(0,0,30,h,'#6a6a6a',{stroke:'#3a3a3a','stroke-width':'1'});
  R(w-30,0,30,h,'#6a6a6a',{stroke:'#3a3a3a','stroke-width':'1'});
  // Battlements
  R(0,0,w,16,'#5a5a5a');
  for(let x=2;x<w;x+=14) R(x,0,9,12,'#686868',{stroke:'#4a4a4a','stroke-width':'1'});
  for(let x=2;x<30;x+=8) R(x,0,6,12,'#727272');
  for(let x=w-28;x<w;x+=8) R(x,0,6,12,'#727272');
  // Flag
  P([[4,0],[4,-18],[18,-10]],'#cc2222'); L(4,0,4,-18,'#888',2);
  // Tower windows arched
  [[4,22],[4,52],[w-22,22],[w-22,52]].forEach(p=>R(p[0],p[1],14,18,'#88aacc',{rx:'7 7 0 0',stroke:'#4466aa','stroke-width':'1'}));
  // Main windows
  [[40,20],[70,20],[100,20],[40,52],[70,52],[100,52]].forEach(p=>W(p[0],p[1],18,22,lit()));
  // Door
  R(w-14,h/2-8,14,16,'#2a1800',{rx:'0 2 2 0',stroke:'#888','stroke-width':'1'});
  T(w+2,h/2+4,'#ccc','10','CASTLE',{'text-anchor':'start'});
  break;

case 'newlines':
  R(0,0,w,h,'#0e1e3a',{rx:'2',stroke:'#08122a','stroke-width':'2'});
  // Glass curtain wall
  R(4,26,w-8,h-32,'#162a4a',{stroke:'#2a4a7a','stroke-width':'1'});
  for(let row=0;row<3;row++) for(let col=0;col<4;col++) {
    const l=lit();
    R(6+col*35,30+row*22,29,18,l?'#a0c4ff':'#0a1630',{stroke:'#1a3a6a','stroke-width':'1'});
    if(l) R(6+col*35,30+row*22,29,18,'rgba(100,160,255,0.1)');
  }
  R(0,0,w,24,'#06101e',{stroke:'#1a3060','stroke-width':'1'});
  T(w/2,16,'#88aaff','9','NEW LINES INC');
  // Logo mark
  mk('circle',{cx:w-12,cy:12,r:'6',fill:'none',stroke:'#88aaff','stroke-width':'2'});
  // Revolving door
  R(w/2-10,h-14,20,14,'#0a1630',{stroke:'#4466aa','stroke-width':'1'});
  L(w/2,h-14,w/2,h,'#4466aa',1); L(w/2-10,h-7,w/2+10,h-7,'#4466aa',1);
  T(w/2,h+12,'#88aaff','10','NEW LINES');
  break;

case 'gym':
  R(0,0,w,h,'#2a4818',{rx:'2',stroke:'#0e2808','stroke-width':'2'});
  for(let x=0;x<w;x+=5) L(x,0,x,h,'#223810',1);
  R(0,0,w,18,'#0e2808');
  // Barbell on roof
  R(w/2-18,4,36,8,'#666',{rx:'2'}); R(w/2-20,2,6,12,'#888',{rx:'2'}); R(w/2+14,2,6,12,'#888',{rx:'2'});
  R(4,22,w-8,44,'#3a6020',{stroke:'#1a4008','stroke-width':'2'});
  for(let x=6;x<w-8;x+=20) W(x,24,16,40,lit());
  R(6,h-28,w-12,16,'#0e2808',{rx:'2',stroke:'#4a8a2a','stroke-width':'1'});
  T(w/2,h-17,"JIM'S GYM",'#88ff88','10');
  // Dumbbell icon
  T(w-22,70,'#88ff88','18','🏋️');
  R(w/2-8,h-12,16,12,'#0e2000',{stroke:'#4a8a2a','stroke-width':'1'});
  T(w/2,h+12,"JIM'S GYM",'#88ff88','10');
  break;

case 'bank':
  R(0,0,w,h,'#7a1818',{rx:'2',stroke:'#4a0808','stroke-width':'2'});
  R(0,h-16,w,16,'#4a0808');
  [8,30,54,78,102,126].forEach(x => {
    R(x,8,10,h-24,'#8a2020',{stroke:'#4a0808','stroke-width':'0.5'});
    R(x-2,4,14,8,'#9a2828'); R(x-2,h-24,14,6,'#9a2828');
  });
  P([[0,8],[w/2,-14],[w,8]],'#5a0808',{stroke:'#3a0000','stroke-width':'1'});
  T(w/2,-1,'#ffd700','10','🏦 CITY BANK',{'font-weight':'bold'});
  [[10,24],[36,24],[62,24],[88,24],[114,24],
   [10,58],[36,58],[62,58],[88,58],[114,58]].forEach(p=>W(p[0],p[1],18,24,lit()));
  R(0,h/2-8,14,16,'#1a0404',{rx:'0 2 2 0',stroke:'#ffd700','stroke-width':'1'});
  mk('circle',{cx:10,cy:String(h/2),r:'3',fill:'#ffd700'});
  T(-2,h/2+4,'#ffd700','10','CITY BANK',{'text-anchor':'end'});
  break;

case 'hospital':
  R(0,0,w,h,'#e8eee8',{rx:'2',stroke:'#aabbaa','stroke-width':'2'});
  R(0,0,w,20,'#c8d8c8',{stroke:'#aabbaa','stroke-width':'1'});
  R(w/2-4,4,8,12,'#cc2222'); R(w/2-8,8,16,4,'#cc2222');
  [[6,24],[52,24],[98,24],[6,58],[52,58],[98,58]].forEach(p=>R(p[0],p[1],34,22,lit()?'#fff':'#c0d4d4',{stroke:'#aabbaa','stroke-width':'1'}));
  R(0,h/2-18,14+6,36,'#d8e8d8',{stroke:'#aabbaa','stroke-width':'1'});
  P([[0,h/2-18],[20,h/2-18],[20,h/2-24]],'#cc2222');
  R(0,h/2-8,14,16,'#2a4a3a',{stroke:'#aabbaa','stroke-width':'1'});
  R(2,h/2-6,10,12,'rgba(180,220,210,0.4)');
  T(-2,h/2+4,'#ff4444','10','HOSPITAL',{'text-anchor':'end'});
  break;

case 'realestate':
  R(0,0,w,h,'#c89028',{rx:'2',stroke:'#886010','stroke-width':'2'});
  for(let y=24;y<h;y+=10) L(0,y,w,y,'#b07820',1);
  R(0,0,w,22,'#a07020',{stroke:'#786010','stroke-width':'1'});
  T(w/2,14,'#ffe880','9','🏡 REAL ESTATE');
  R(4,26,w-8,44,'#f0e0a8',{stroke:'#886010','stroke-width':'2'});
  T(w/2,51,'#5a3000','11','FOR SALE');
  // Water tower
  R(w-20,2,14,12,'#8B5E3C',{rx:'2',stroke:'#5a3010','stroke-width':'1'});
  L(w-13,14,w-13,20,'#5a3010',2); L(w-17,20,w-9,20,'#5a3010',2);
  [[6,78],[52,78],[98,78]].forEach(p=>W(p[0],p[1],28,18,lit()));
  R(0,h/2-8,14,16,'#4a2800',{rx:'0 2 2 0',stroke:'#ffd700','stroke-width':'1'});
  mk('circle',{cx:10,cy:String(h/2),r:'2.5',fill:'#ffd700'});
  T(-2,h/2+4,'#ffd700','10','REAL ESTATE',{'text-anchor':'end'});
  break;

case 'police':
  R(0,0,w,h,'#0e1e5a',{rx:'2',stroke:'#08102a','stroke-width':'2'});
  R(0,0,w,8,'#cc1111'); R(0,8,w,4,'#fff'); R(0,12,w,8,'#0e1e5a');
  T(w/2,30,'#ffd700','18','⭐');
  [[6,38],[48,38],[90,38],[6,72],[48,72],[90,72]].forEach(p=>W(p[0],p[1],32,20,lit()));
  R(6,h-30,w-12,16,'#06102a',{rx:'2',stroke:'#4488ff','stroke-width':'1'});
  T(w/2,h-18,'#4488ff','10','🚔 POLICE DEPT');
  R(w/2-8,h-12,16,12,'#040a16',{stroke:'#4488ff','stroke-width':'1'});
  // Satellite dish on tower
  R(w-14,0,12,16,'#2a3a7a',{stroke:'#0a1230','stroke-width':'1'});
  T(w/2,h+12,'#4488ff','10','POLICE DEPT');
  break;

case 'market':
  R(0,0,w,h,'#8a2810',{rx:'2',stroke:'#5a1000','stroke-width':'2'});
  for(let x=0;x<w;x+=10) R(x,0,5,22,'#aa3818',{opacity:'0.6'});
  R(0,0,w,22,'#cc3818');
  R(4,26,w-8,44,'#ffe8c0',{stroke:'#5a1000','stroke-width':'2'});
  T(w/2-16,14,'#fff','10','FOOD'); T(w/2+18,14,'#ffcc44','10','MART');
  T(w/2,50,'#cc2200','11','🛒 OPEN');
  [[6,78],[46,78],[86,78]].forEach(p=>W(p[0],p[1],28,18,lit()));
  R(w/2-8,h-12,16,12,'#3a0a00',{stroke:'#ff8844','stroke-width':'1'});
  T(w/2,h+12,'#ff8844','10','FOOD MART');
  break;

case 'mcsticks':
  R(0,0,w,h,'#c07010',{rx:'2',stroke:'#8a4800','stroke-width':'2'});
  R(0,0,w,28,'#aa5800');
  // Golden M arches
  mk('path',{d:`M ${w/2-22} 26 Q ${w/2-22} 4 ${w/2} 14 Q ${w/2+22} 4 ${w/2+22} 26`,
    fill:'none',stroke:'#ffcc00','stroke-width':'6','stroke-linecap':'round'});
  R(4,32,w-8,46,'#ffe870',{stroke:'#8a4800','stroke-width':'2'});
  T(w/2,58,"McSTICK'S",'#cc4400','14',{'font-weight':'bold'});
  // Menu items in window
  [[6,86],[54,86],[100,86]].forEach(p=>R(p[0],p[1],30,16,'#ffe0a0',{stroke:'#8a4800','stroke-width':'1'}));
  T(w-22,h-8,'#ffcc00','8','DRIVE THRU');
  R(w-14,h/2-8,14,16,'#5a2a00',{stroke:'#ffcc00','stroke-width':'1'});
  mk('circle',{cx:w-8,cy:String(h/2),r:'2',fill:'#ffcc00'});
  T(w+2,h/2+4,'#ffcc00','11',"McSTICK'S",{'text-anchor':'start'});
  break;

case 'bar':
  R(0,0,w,h,'#5a2808',{rx:'2',stroke:'#2a1000','stroke-width':'2'});
  for(let y=0;y<h;y+=12) { L(0,y,w,y,'#3a1400',1); L(w*.3,y,w*.3,y+12,'#3a1400',1); L(w*.65,y,w*.65,y+12,'#3a1400',1); }
  R(0,0,w,18,'#2a1000');
  R(8,3,w-16,12,'#1a0800',{rx:'3',stroke:'#ff8844','stroke-width':'1'});
  T(w/2,12,'#ff9944','9','🍺 THE BAR 🍺');
  [[8,22],[54,22],[100,22]].forEach(p => { R(p[0],p[1],32,32,'#3a1800',{stroke:'#1a0800','stroke-width':'1'}); R(p[0]+2,p[1]+2,28,28,'rgba(255,100,0,0.25)',{rx:'1'}); });
  // Saloon swing doors
  R(w-14,h/2-9,14,8,'#2a1000',{stroke:'#7a4000','stroke-width':'1'});
  R(w-14,h/2+1,14,8,'#2a1000',{stroke:'#7a4000','stroke-width':'1'});
  T(w+2,h/2+4,'#ff9944','10','THE BAR',{'text-anchor':'start'});
  break;

case 'dealer':
  R(0,0,w,h,'#0e0e0e',{rx:'1',stroke:'#282828','stroke-width':'2'});
  for(let i=0;i<6;i++) { const gx=10+Math.floor(i*22),gy=20+Math.floor(i*14); L(gx,gy,gx+18,gy+6,'#1a2a1a',2); }
  // Boarded windows
  [[6,16],[w-46,16]].forEach(p => { R(p[0],p[1],36,28,'#0a0a0a',{stroke:'#222','stroke-width':'1'}); L(p[0],p[1],p[0]+36,p[1]+28,'#1a1a1a',2); L(p[0]+36,p[1],p[0],p[1]+28,'#1a1a1a',2); });
  mk('circle',{cx:String(w/2),cy:String(h/2+10),r:'7',fill:'#00ff44','filter':'drop-shadow(0 0 5px #00ff44)'});
  R(6,h-24,w-12,14,'#081208',{rx:'2',stroke:'#00aa22','stroke-width':'1'});
  T(w/2,h-13,'#00ff44','10','💊 ???');
  R(w/2-8,0,16,14,'#0a0a0a',{rx:'0 0 3 3',stroke:'#00aa22','stroke-width':'1'});
  T(w/2,h+12,'#00ff44','10','BACK ALLEY');
  break;

case 'market2':
  R(0,0,w,h,'#8a3010',{rx:'2',stroke:'#5a1800','stroke-width':'2'});
  for(let x=0;x<w;x+=9) R(x,0,4,20,'#aa4020',{opacity:'0.5'});
  R(0,0,w,20,'#aa4020');
  T(w/2,13,'#ffe0b0','10','🛍️ SHOP');
  R(4,24,w-8,38,'#ffe0b0',{stroke:'#5a1800','stroke-width':'2'});
  T(w/2,45,'#cc3300','12','OPEN');
  [[6,70],[46,70],[86,70]].forEach(p=>W(p[0],p[1],26,18,lit()));
  R(w/2-8,0,16,13,'#3a0a00',{rx:'0 0 3 3',stroke:'#ffaa44','stroke-width':'1'});
  T(w/2,h+12,'#ffaa44','10','SHOP');
  break;

case 'casino':
  R(0,0,w,h,'#2a0438',{rx:'2',stroke:'#1a0028','stroke-width':'2'});
  R(2,2,w-4,h-4,'none',{rx:'2',stroke:'#ff44ff','stroke-width':'1.5','stroke-dasharray':'4,3'});
  R(0,0,w,28,'#160020',{stroke:'#ff44ff','stroke-width':'1'});
  T(w/2,18,'#ff44ff','11','🎰 CASINO 🎲',{'filter':'drop-shadow(0 0 4px #ff44ff)'});
  const cc=['#ff44ff','#44ffff','#ffff44','#ff4488','#44ff88','#ff8844'];
  [[6,34],[56,34],[106,34],[6,68],[56,68],[106,68]].forEach((p,i) =>
    R(p[0],p[1],36,20,cc[i%6],{rx:'2',opacity:'0.75','filter':'drop-shadow(0 0 3px '+cc[i%6]+')'}));
  // Satellite dish
  R(w-14,0,12,16,'#1a0228',{stroke:'#ff44ff','stroke-width':'1'});
  R(0,h/2-9,14,18,'#100018',{stroke:'#ff44ff','stroke-width':'2'});
  R(2,h/2-7,10,14,'rgba(255,0,255,0.2)');
  mk('circle',{cx:'8',cy:String(h/2),r:'2.5',fill:'#ff44ff'});
  T(-2,h/2+4,'#ff44ff','11','CASINO',{'text-anchor':'end','filter':'drop-shadow(0 0 4px #ff44ff)'});
  break;

case 'busdepot':
  R(0,0,w,h,'#184858',{rx:'2',stroke:'#082030','stroke-width':'2'});
  for(let x=0;x<w;x+=7) R(x,0,3,18,'#0a3040',{opacity:'0.6'});
  R(0,0,w,18,'#0a3040');
  T(w/2,12,'#44aacc','9','🚌 BUS DEPOT');
  R(6,22,w-12,38,'#c0e0f0',{stroke:'#0a3040','stroke-width':'2'});
  T(w/2,42,'#0a3040','10','DEPARTURES',{'font-weight':'bold'});
  R(8,64,w-16,22,'#0a1820',{rx:'2',stroke:'#44aacc','stroke-width':'1'});
  T(w/2,70,'#44aacc','8','DEP ARR');
  for(let i=0;i<3;i++) { L(12+i*18,74,12+i*18+12,74,'#44aacc',1); L(12+i*18,78,12+i*18+12,78,'#44aacc',1); }
  R(0,h/2-9,14,18,'#081420',{stroke:'#44aacc','stroke-width':'1'});
  R(2,h/2-7,10,14,'rgba(100,200,220,0.2)');
  T(-2,h/2+4,'#44ccff','10','BUS DEPOT',{'text-anchor':'end'});
  break;

case 'hospital2':
  R(0,0,w,h,'#d8e8d0',{rx:'2',stroke:'#88aa88','stroke-width':'2'});
  R(0,0,w,18,'#c0d8b8',{stroke:'#88aa88','stroke-width':'1'});
  R(w/2-3,3,7,12,'#228822'); R(w/2-8,7,16,4,'#228822');
  [[6,22],[50,22],[94,22],[6,54],[50,54],[94,54]].forEach(p=>R(p[0],p[1],30,20,lit()?'#fff':'#c0d8c0',{stroke:'#88aa88','stroke-width':'1'}));
  R(w/2-8,0,16,13,'#224422',{rx:'0 0 3 3',stroke:'#88aa88','stroke-width':'1'});
  T(w/2,h+12,'#44aa44','10','CLINIC');
  break;

case 'police2':
  R(0,0,w,h,'#aaa888',{rx:'2',stroke:'#686648','stroke-width':'2'});
  [6,28,52,76,100,124].forEach(x => { R(x,20,9,h-20,'#bbb898',{stroke:'#8a8868','stroke-width':'0.5'}); R(x-2,16,13,8,'#ccc8a8'); });
  P([[0,20],[w/2,-6],[w,20]],'#989878',{stroke:'#686648','stroke-width':'1'});
  T(w/2,8,'#ffffaa','16','⚖️');
  [[8,26],[34,26],[62,26],[88,26],[114,26],
   [8,60],[34,60],[62,60],[88,60],[114,60]].forEach(p=>W(p[0],p[1],18,20,lit()));
  R(w/2-20,h-8,40,8,'#888868'); R(w/2-14,h-14,28,6,'#9a9878');
  R(w/2-8,0,16,14,'#484828',{rx:'0 0 2 2',stroke:'#ffffaa','stroke-width':'1'});
  T(w/2,h+12,'#ffffaa','10','COURT HOUSE');
  break;

case 'heitkamp': {
  // Brick masonry building — red-brown brick pattern, industrial look
  R(0,0,w,h,'#8B3A1A',{rx:'2',stroke:'#5a1a08','stroke-width':'2'});
  // Brick rows
  for(let y=0;y<h;y+=10) {
    L(0,y,w,y,'#7a2e10',1);
    const offset=(Math.floor(y/10)%2)*16;
    for(let x=offset;x<w;x+=32) L(x,y,x,y+10,'#6a2008',1);
  }
  // Darker mortar tint
  R(0,0,w,h,'rgba(0,0,0,0.08)');
  // Stone lintel above door
  R(0,0,w,20,'#6a3010',{stroke:'#4a1808','stroke-width':'1'});
  // Chiseled text on sign board
  R(4,3,w-8,14,'#5a2808',{rx:'1',stroke:'#3a1000','stroke-width':'1'});
  T(w/2,13,'#d4a870','8','HEITKAMP MASONRY',{'font-weight':'bold'});
  // Windows — small, industrial style with bars
  [[10,26],[60,26],[110,26],[10,64],[60,64],[110,64]].forEach(p => {
    R(p[0],p[1],32,24,'#1a0a04',{stroke:'#8B5E3C','stroke-width':'2'});
    // Window bars
    L(p[0]+10,p[1],p[0]+10,p[1]+24,'#666',1);
    L(p[0]+20,p[1],p[0]+20,p[1]+24,'#666',1);
    L(p[0],p[1]+12,p[0]+32,p[1]+12,'#666',1);
    // Dim glow inside
    R(p[0]+1,p[1]+1,30,22,'rgba(255,140,60,0.08)');
  });
  // Vault door hint (right side, facing road)
  R(w-18,h/2-14,18,28,'#2a1800',{stroke:'#8B5E3C','stroke-width':'2'});
  // Vault wheel
  mk('circle',{cx:String(w-9),cy:String(h/2),r:'6',fill:'none',stroke:'#888','stroke-width':'2'});
  L(w-9,h/2-6,w-9,h/2+6,'#888',2);
  L(w-15,h/2,w-3,h/2,'#888',2);
  // "VAULT" label on door
  T(w-9,h/2+18,'#8B5E3C','7','VAULT',{'text-anchor':'middle'});
  // Chimney
  R(w-22,0,14,20,'#7a2e10',{stroke:'#5a1808','stroke-width':'1'});
  R(w-24,0,18,6,'#6a2008');
  // Label outside
  T(w+2,h/2+4,'#d4a870','9','HEITKAMP',{'text-anchor':'start'});
  break;
}

default:
  R(0,0,w,h,'#666',{rx:'2',stroke:'#444','stroke-width':'2'});
  T(w/2,h/2+6,'#fff','12','?');
```

}
return s;
}

/* ═══════════════════════════════════════
BUILD WORLD
═══════════════════════════════════════ */
function buildWorld() {
const world = document.getElementById(‘world’);
world.style.width  = W + ‘px’;
world.style.height = H + ‘px’;
world.style.position = ‘relative’;

const d = (style) => { const e = document.createElement(‘div’); e.style.cssText = ‘position:absolute;’ + style; return e; };

// Sky bg
world.style.background = ‘#87ceeb’;

// Grass quads
[[0,0,RX,RY],[RX+RW,0,W-RX-RW,RY],[0,RY+RH,RX,H-RY-RH],[RX+RW,RY+RH,W-RX-RW,H-RY-RH]]
.forEach(([x,y,w,h]) => world.appendChild(d(`left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:#4a8c2a`)));

// Dirt border
[{x:0,y:0,w:W,h:14},{x:0,y:H-14,w:W,h:14},{x:0,y:0,w:14,h:H},{x:W-14,y:0,w:14,h:H}]
.forEach(r => world.appendChild(d(`left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;background:#7a4a10`)));

// Roads
world.appendChild(d(`left:0;top:${RY}px;width:${W}px;height:${RH}px;background:#555`));
world.appendChild(d(`left:${RX}px;top:0;width:${RW}px;height:${H}px;background:#555`));

// Sidewalk edges
const sw = 18;
world.appendChild(d(`left:0;top:${RY}px;width:${W}px;height:${sw}px;background:#999`));
world.appendChild(d(`left:0;top:${RY+RH-sw}px;width:${W}px;height:${sw}px;background:#999`));
world.appendChild(d(`left:${RX}px;top:0;width:${sw}px;height:${H}px;background:#999`));
world.appendChild(d(`left:${RX+RW-sw}px;top:0;width:${sw}px;height:${H}px;background:#999`));

// Road dashes H
for (let x = 0; x < W; x += 80) {
if (x > RX-50 && x < RX+RW+50) continue;
world.appendChild(d(`left:${x}px;top:${RY+RH/2-4}px;width:46px;height:8px;background:#ffee00`));
}
// Road dashes V
for (let y = 0; y < H; y += 80) {
if (y > RY-50 && y < RY+RH+50) continue;
world.appendChild(d(`left:${RX+RW/2-4}px;top:${y}px;width:8px;height:46px;background:#ffee00`));
}

// Cars on roads
[{x:RX+12, y:100,      w:24,h:44,c:’#e03030’},
{x:RX+62, y:280,      w:24,h:44,c:’#3060e0’},
{x:100,   y:RY+12,    w:44,h:24,c:’#e09030’},
{x:700,   y:RY+62,    w:44,h:24,c:’#30c080’},
{x:RX+14, y:RY+RH+200,w:24,h:44,c:’#8030c0’},
{x:800,   y:RY+14,    w:44,h:24,c:’#c0c030’}]
.forEach(c => world.appendChild(d(`left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;background:${c.c};border-radius:4px;border:2px solid rgba(0,0,0,.4)`)));

// Trees
TREES.forEach(({x,y}) => {
const t = d(`left:${x}px;top:${y}px;width:32px;height:44px`);
t.appendChild(d(`bottom:0;left:12px;width:8px;height:14px;background:#7a4010;border:1px solid #4a2008`));
t.appendChild(d(`top:0;left:1px;width:30px;height:30px;border-radius:50%;background:#2d8a1e;border:2px solid #1e6614;box-shadow:inset -4px -4px 6px rgba(0,0,0,.3)`));
world.appendChild(t);
});

// Buildings
BUILDINGS.forEach(b => {
const wrap = document.createElement(‘div’);
wrap.id = ‘bld-’ + b.id;
wrap.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;cursor:pointer;z-index:5`;
wrap.appendChild(drawBuilding(b.id, b.w, b.h));

```
// Near-road label (outside building)
const lbl = document.createElement('div');
const door = b.door || 'down';
let ls = 'position:absolute;white-space:nowrap;font-size:10px;font-family:VT323,monospace;color:#fff;text-shadow:1px 1px 0 #000;background:rgba(0,0,0,.75);padding:2px 6px;border-radius:2px;z-index:10;pointer-events:none';
if (door==='down')  ls += ';bottom:-18px;left:50%;transform:translateX(-50%)';
if (door==='up')    ls += ';top:-18px;left:50%;transform:translateX(-50%)';
if (door==='right') ls += ';top:50%;right:-4px;transform:translate(100%,-50%)';
if (door==='left')  ls += ';top:50%;left:-4px;transform:translate(-100%,-50%)';
lbl.style.cssText = ls;
lbl.textContent = b.label;
wrap.appendChild(lbl);

wrap.addEventListener('click', () => { if (nearB && nearB.id === b.id) openBuilding(b.id); });
world.appendChild(wrap);
```

});
}

/* ═══════════════════════════════════════
PLAYER & CAMERA
═══════════════════════════════════════ */
let px = RX + RW/2, py = RY + RH/2;
let camX = 0, camY = 0;
const mv = { up:false, down:false, left:false, right:false };
let isWalking = false;
const SPEED = 2.5;

function setPlayerPos() {
const p = document.getElementById(‘player’);
p.style.left = px + ‘px’;
p.style.top  = py + ‘px’;
}

function updateCamera() {
const vp = document.getElementById(‘viewport’);
const vw = vp.clientWidth, vh = vp.clientHeight;
camX = Math.max(0, Math.min(W - vw, px - vw / 2));
camY = Math.max(0, Math.min(H - vh, py - vh / 2));
document.getElementById(‘world’).style.transform = `translate(${-camX}px,${-camY}px)`;
}

let nearB = null;
function checkNear() {
let found = null, best = 9999;
BUILDINGS.forEach(b => {
const dist = Math.hypot(px - (b.x + b.w/2), py - (b.y + b.h/2));
if (dist < 100 && dist < best) { best = dist; found = b; }
});
nearB = found;
const ind = document.getElementById(‘nearInd’);
if (found) { ind.textContent = ’▲ ENTER: ’ + found.label; ind.classList.add(‘on’); }
else ind.classList.remove(‘on’);
}

let gameLoop = null;
let loopFrame = 0;
function startLoop() {
if (gameLoop) return;
gameLoop = setInterval(() => {
loopFrame++;
let moved = false;
if (mv.up)    { py = Math.max(14, py - SPEED); moved = true; }
if (mv.down)  { py = Math.min(H-14, py + SPEED); moved = true; }
if (mv.left)  { px = Math.max(14, px - SPEED); moved = true;
document.getElementById(‘player’).style.transform = ‘scaleX(-1)’; }
if (mv.right) { px = Math.min(W-14, px + SPEED); moved = true;
document.getElementById(‘player’).style.transform = ‘scaleX(1)’; }
if (moved !== isWalking) {
isWalking = moved;
document.getElementById(‘player’).classList.toggle(‘walking’, isWalking);
}
if (moved) { setPlayerPos(); updateCamera(); checkNear(); maybeStreetEvent(); }
if (loopFrame % 30 === 0) drawMinimap();
}, 1000/60);
}

/* ═══════════════════════════════════════
DPAD
═══════════════════════════════════════ */
function setupDpad() {
[[‘du’,‘up’],[‘dd’,‘down’],[‘dl’,‘left’],[‘dr’,‘right’]].forEach(([id, dir]) => {
const el = document.getElementById(id);
const on  = () => { mv[dir] = true;  el.classList.add(‘on’); };
const off = () => { mv[dir] = false; el.classList.remove(‘on’); };
el.addEventListener(‘touchstart’,  e => { e.preventDefault(); on();  }, { passive: false });
el.addEventListener(‘touchend’,    e => { e.preventDefault(); off(); }, { passive: false });
el.addEventListener(‘touchcancel’, e => { e.preventDefault(); off(); }, { passive: false });
el.addEventListener(‘mousedown’, on);
el.addEventListener(‘mouseup’,   off);
el.addEventListener(‘mouseleave’,off);
});
}

document.addEventListener(‘keydown’, e => {
if (e.key===‘ArrowUp’   ||e.key===‘w’) mv.up    = true;
if (e.key===‘ArrowDown’ ||e.key===‘s’) mv.down  = true;
if (e.key===‘ArrowLeft’ ||e.key===‘a’) mv.left  = true;
if (e.key===‘ArrowRight’||e.key===‘d’) mv.right = true;
if (e.key===‘Enter’     ||e.key===‘e’) handleEnter();
});
document.addEventListener(‘keyup’, e => {
if (e.key===‘ArrowUp’   ||e.key===‘w’) mv.up    = false;
if (e.key===‘ArrowDown’ ||e.key===‘s’) mv.down  = false;
if (e.key===‘ArrowLeft’ ||e.key===‘a’) mv.left  = false;
if (e.key===‘ArrowRight’||e.key===‘d’) mv.right = false;
});

/* ═══════════════════════════════════════
MODAL
═══════════════════════════════════════ */
function openModal(title, desc, opts) {
let h = `<div class="mtitle">${title}</div>`;
if (desc) h += `<div class="mdesc">${desc}</div>`;
h += `<div class="mopts">`;
opts.forEach((o, i) => h += `<button class="mopt ${o.cls||''}" id="mo${i}" type="button">${o.label}</button>`);
h += `</div>`;
const box = document.getElementById(‘mbox’);
box.innerHTML = h;
document.getElementById(‘modal’).classList.remove(‘h’);
opts.forEach((o, i) => {
const btn = document.getElementById(‘mo’ + i);
if (btn && o.fn) btn.addEventListener(‘click’, () => { sfx(‘tap’); o.fn(); });
});
}
function closeModal() { document.getElementById(‘modal’).classList.add(‘h’); }

/* ═══════════════════════════════════════
TIME & ENERGY
═══════════════════════════════════════ */
function advanceTime(hours, energyCost) {
G.hour += hours;
G.energy = Math.max(0, G.energy - energyCost);
if (G.energy === 0) { addMsg(‘You're exhausted! Sleep soon.’, ‘b’); }
if (G.hour >= 24) { G.hour = 23; addMsg(‘It's past midnight — sleep!’, ‘w’); }
updateHUD();
}

function isOpen(openH, closeH) {
return G.hour >= openH && G.hour < closeH;
}

/* ═══════════════════════════════════════
SLEEP
═══════════════════════════════════════ */
function doSleep() {
G.day++; G.hour = 8; G.jobShiftsToday = 0;
G.energy = G.furniture >= 1 ? 110 : 100; // Bed gives +10 bonus energy
G.energy = Math.min(100, G.energy);
G.usedTV = false; G.usedConsole = false;
// Bank interest
if (G.bankBalance > 0) {
const i = Math.floor(G.bankBalance * 0.02);
G.bankBalance += i;
if (i) { addMsg(‘Bank interest +$’ + i, ‘o’); statPop(‘money’, i); }
}
// Loan interest
if (G.loan > 0) {
const i = Math.floor(G.loan * 0.05);
G.loan += i;
addMsg(‘Loan interest: now $’ + G.loan, ‘b’);
}
// Stock price drift ±20%
if (G.stockShares > 0 || Math.random() < 0.6) {
const drift = 0.8 + Math.random() * 0.4;
G.stockPrice = Math.max(1, Math.round(G.stockPrice * drift));
}
updateHUD();
addMsg(’— Day ’ + G.day + ’ —’, ‘s’);
toast(‘☀️ Day ’ + G.day + ’ — Morning!’);
sfx(‘buy’);
checkAchievements();
if (Math.random() < 0.25) morningEvent();
saveGame();
}

function morningEvent() {
const events = [
() => { G.money += 20; addMsg(‘Found $20 in your old jacket!’, ‘g’); statPop(‘money’, 20); },
() => { G.str++;       addMsg(‘Did morning push-ups. +1 STR’, ‘g’); statPop(‘str’, 1); },
() => { if(G.loan>0){const extra=Math.floor(G.loan*.02);G.loan+=extra;addMsg(‘Loan interest hit hard: +$’+extra,‘b’);} },
() => { addMsg(‘Neighbour complained about noise. Nothing happened.’, ‘s’); },
() => { G.cha++;       addMsg(‘Had a great hair day. +1 CHA’, ‘g’); statPop(‘cha’, 1); },
];
events[Math.floor(Math.random() * events.length)]();
updateHUD();
}

/* ═══════════════════════════════════════
STREET EVENTS (random while walking)
═══════════════════════════════════════ */
let streetEventCooldown = 0;
function maybeStreetEvent() {
streetEventCooldown–;
if (streetEventCooldown > 0) return;
if (Math.random() > 0.004) return; // ~0.4% chance per frame
streetEventCooldown = 400; // cooldown frames

const roll = Math.random();
if (roll < 0.33) {
streetFight();
} else if (roll < 0.55) {
findSomething();
} else if (roll < 0.75) {
randomNPC();
} else {
drunkEncounter();
}
}

function streetFight() {
const enemies = [
{name:‘Drunk Guy’,    str:4,  reward:15},
{name:‘Gangster’,     str:8,  reward:30},
{name:‘Mobster’,      str:14, reward:60},
{name:‘Street Boxer’, str:18, reward:100},
];
const enemy = enemies[Math.min(Math.floor(G.str/5), enemies.length-1)];
openModal(‘⚠️ STREET FIGHT’, `A ${enemy.name} blocks your path!\n\nYour STR: ${G.str}\nEnemy STR: ~${enemy.str}`, [
{ label:‘👊 FIGHT!’, cls:‘d’, fn:() => {
closeModal();
const win = Math.random() < 0.4 + (G.str - enemy.str) * 0.04;
if (win) {
const reward = enemy.reward + Math.floor(Math.random() * 20);
G.money += reward; G.str = Math.min(99, G.str+1); G.fightWins++;
addMsg(`Beat the ${enemy.name}! +$${reward} +1 STR`, ‘g’);
toast(`💪 You won! +$${reward}`);
statPops({money: reward, str: 1});
sfx(‘coin’); sfx(‘level’);
} else {
const loss = Math.min(G.money, Math.floor(enemy.reward * 0.5));
G.money -= loss; G.energy = Math.max(0, G.energy - 30);
addMsg(`Lost to the ${enemy.name}. −$${loss}`, ‘b’);
toast(`😵 You lost. −$${loss}`);
statPop(‘money’, -loss);
sfx(‘lose’);
}
updateHUD(); checkAchievements(); queueSave();
}},
{ label:‘🏃 Run Away’, cls:‘c’, fn:() => {
closeModal();
if (Math.random() < 0.5) {
addMsg(‘Escaped!’, ‘s’);
} else {
const loss = Math.min(G.money, 10);
G.money -= loss;
addMsg(‘Couldn't escape! Lost $’ + loss, ‘b’);
statPop(‘money’, -loss);
updateHUD(); queueSave();
}
}},
]);
}

function findSomething() {
const finds = [
{ msg:‘Found $10 on the ground!’, fn:()=>{ G.money+=10; statPop(‘money’,10); } },
{ msg:‘Found a $50 bill!’, fn:()=>{ G.money+=50; statPop(‘money’,50); } },
{ msg:‘Stumbled across a motivational poster. +1 CHA’, fn:()=>{ G.cha++; statPop(‘cha’,1); } },
{ msg:‘Found a protein bar. +5 Energy’, fn:()=>{ G.energy=Math.min(100,G.energy+5); } },
{ msg:‘Stepped in something. Nothing happened.’, fn:()=>{} },
];
const f = finds[Math.floor(Math.random()*finds.length)];
f.fn();
addMsg(f.msg, ‘g’);
updateHUD();
}

function randomNPC() {
const npcs = [
{ msg:‘An old lady drops her groceries.\n”Oh dear, could you help me?”’, opts:[
{label:‘🤝 Help her (+3 KAR +1 CHA)’,fn:()=>{ G.kar+=3;G.cha++;statPops({kar:3,cha:1});addMsg(‘Helped old lady. +3 KAR +1 CHA’,‘g’);closeModal();updateHUD();queueSave();}},
{label:‘🚶 Ignore her’,fn:()=>{G.kar–;statPop(‘kar’,-1);addMsg(‘Walked past. −1 KAR’,‘w’);closeModal();updateHUD();queueSave();}},
]},
{ msg:‘A nerd approaches.\n”Hey, wanna study together? I know everything about quantum physics.”\n\nStudy with him?’, opts:[
{label:‘📚 Sure (+1 INT −$5)’,fn:()=>{if(G.money<5){toast(‘No cash!’);return;}G.money-=5;G.int++;statPops({int:1,money:-5});addMsg(‘Studied with nerd. +1 INT’,‘g’);closeModal();updateHUD();queueSave();}},
{label:‘👋 No thanks’,fn:()=>{closeModal();addMsg(‘You walked on.’,‘s’);}},
]},
{ msg:‘A drunk man weaves toward you.\n”Psst… want a Rolex? Only $20. It's… definitely real.”’, opts:[
{label:‘💰 Buy it ($20, +1 CHA)’,fn:()=>{if(G.money<20){toast(‘Need $20!’);return;}G.money-=20;G.cha++;statPops({money:-20,cha:1});addMsg(‘Bought a “Rolex”. +1 CHA (it's plastic)’,‘g’);closeModal();updateHUD();queueSave();}},
{label:‘🚶 Walk on’,fn:()=>{closeModal();addMsg(‘You declined.’,‘s’);}},
]},
{ msg:‘A street performer is playing guitar.\nThe crowd is loving it. What do you do?’, opts:[
{label:‘💵 Tip $10 (+2 KAR +1 CHA)’,fn:()=>{if(G.money<10){toast(‘Need $10!’);return;}G.money-=10;G.kar+=2;G.cha++;statPops({money:-10,kar:2,cha:1});addMsg(‘Tipped the musician. +2 KAR +1 CHA’,‘g’);closeModal();updateHUD();queueSave();}},
{label:‘👏 Applaud (free +1 CHA)’,fn:()=>{G.cha++;statPop(‘cha’,1);addMsg(‘Applauded the performer. +1 CHA’,‘g’);closeModal();updateHUD();queueSave();}},
{label:‘🚶 Keep walking’,fn:()=>{closeModal();}},
]},
{ msg:‘A shady businessman offers you a deal.\n”Invest $100 in my startup. Could be worth millions!”’, opts:[
{label:‘💸 Invest $100’,fn:()=>{
if(G.money<100){toast(‘Need $100!’);return;}
G.money-=100;
const pays=Math.random()<0.3;
if(pays){G.money+=400;addMsg(‘The investment paid off! +$400’,‘g’);toast(‘🎉 +$400!’);}
else{addMsg(‘The “startup” vanished. Lost $100.’,‘b’);toast(‘😞 Scammed.’);}
closeModal();updateHUD();queueSave();
}},
{label:‘🚶 Pass’,fn:()=>{closeModal();addMsg(‘You declined.’,‘s’);}},
]},
];
const npc = npcs[Math.floor(Math.random()*npcs.length)];
openModal(‘RANDOM ENCOUNTER’, npc.msg, npc.opts);
}

/* ── STAT CAPS for balance ── */
function capStats() {
G.str = Math.min(99, G.str);
G.int = Math.min(99, G.int);
G.cha = Math.min(99, G.cha);
G.kar = Math.max(-99, Math.min(99, G.kar));
G.energy = Math.max(0, Math.min(100, G.energy));
}

function drunkEncounter() {
openModal(‘DRUNK GUY’, ‘A wasted man stumbles toward you.\n”Hey… you got any cash?”’, [
{ label:‘💵 Give him $5’, fn:()=>{ if(G.money<5){toast(‘You're broke!’);return;} G.money-=5; G.kar+=3; addMsg(‘Gave $5 to drunk guy. +3 KAR’,‘g’); statPops({money:-5,kar:3}); closeModal(); updateHUD(); queueSave(); }},
{ label:‘👊 Shove him’, cls:‘d’, fn:()=>{ G.kar-=2; addMsg(‘Shoved him. −2 KAR’,‘b’); statPop(‘kar’,-2); closeModal(); updateHUD(); queueSave(); }},
{ label:‘🚶 Ignore’, cls:‘c’, fn:()=>{ closeModal(); addMsg(‘You walked past.’,‘s’); }},
]);
}

/* ═══════════════════════════════════════
INTERACT
═══════════════════════════════════════ */
function handleEnter() {
if (!nearB) { addMsg(‘Nothing nearby.’, ‘w’); return; }
openBuilding(nearB.id);
}

/* ═══════════════════════════════════════
JOB DEFS
═══════════════════════════════════════ */
const JOBDEF = {
mcsticks: { name:“McStick’s”,      pay:6,  promos:[‘Cook’,‘Fry Guy’,‘Shift Lead’,‘Manager’,‘McManager’], req:{},               bonus:null,  maxS:3 },
newlines: { name:‘New Lines Inc.’, pay:12, promos:[‘Janitor’,‘Intern’,‘Analyst’,‘Manager’,‘VP’,‘CEO’],   req:{int:20},          bonus:‘int’, maxS:2 },
gym:      { name:‘Personal Trainer’,pay:9, promos:[‘Trainer’,‘Sr. Trainer’,‘Head Trainer’],             req:{str:20},          bonus:‘str’, maxS:2 },
police:   { name:‘Police Officer’, pay:10, promos:[‘Recruit’,‘Officer’,‘Detective’,‘Sgt’,‘Chief’],       req:{str:15, kar:10},  bonus:‘kar’, maxS:2 },
};

/* ═══════════════════════════════════════
HELPER — spend money & gain stat
═══════════════════════════════════════ */
function spend(stat, amt, cost, msg) {
if (cost && G.money < Math.abs(cost)) { toast(‘Need $’ + Math.abs(cost) + ‘!’); return; }
const changes = {};
if (cost)  { G.money += cost;  changes.money = cost; }
if (stat)  { G[stat] += amt;   changes[stat] = amt;  }
capStats();
addMsg(msg, ‘g’);
closeModal();
updateHUD();
statPops(changes);
if (cost < 0) sfx(‘buy’); else if (cost > 0) sfx(‘coin’);
checkAchievements();
queueSave();
}

function spend2(s1, a1, s2, a2, cost, msg) {
if (cost && G.money < Math.abs(cost)) { toast(‘Need $’ + Math.abs(cost) + ‘!’); return; }
const changes = {};
if (cost) { G.money += cost; changes.money = cost; }
G[s1] += a1; changes[s1] = a1;
G[s2] += a2; changes[s2] = a2;
capStats();
addMsg(msg, ‘g’);
closeModal();
updateHUD();
statPops(changes);
if (cost < 0) sfx(‘buy’); else sfx(‘coin’);
checkAchievements();
queueSave();
}

/* ═══════════════════════════════════════
BUSINESS HOURS
═══════════════════════════════════════ */
const HOURS = {
apartment:  [0,  24], university:[8,  22], gym:      [6,  23],
bank:       [9,  17], hospital:  [0,  24], realestate:[9, 18],
police:     [0,  24], mcsticks:  [6,  24], bar:       [16, 24],
dealer:     [20, 24], market:    [7,  23], market2:   [7,  23],
casino:     [12, 24], busdepot:  [6,  22], castle:    [0,  24],
newlines:   [8,  18], heitkamp:  [0,  24],
};
function bldOpen(id) {
const h = HOURS[id] || [0,24];
return G.hour >= h[0] && G.hour < h[1];
}
function hourStr(h) {
const ap = h<12?‘AM’:‘PM’; const h2=h===0?12:h>12?h-12:h; return h2+ap;
}

/* ═══════════════════════════════════════
BUILDINGS
═══════════════════════════════════════ */
function openBuilding(id) {
// Business hours gate (except apartment, hospital, police, castle always open)
const alwaysOpen = [‘apartment’,‘hospital’,‘police’,‘police2’,‘castle’,‘heitkamp’];
if (!alwaysOpen.includes(id)) {
const realId = id === ‘police2’ ? ‘police’ : id === ‘market2’ ? ‘market’ : id === ‘hospital2’ ? ‘hospital’ : id;
if (!bldOpen(realId)) {
const h = HOURS[realId] || [0,24];
openModal(‘CLOSED’, `This place is closed right now.\n\nOpens: ${hourStr(h[0])}\nCloses: ${hourStr(h[1])}\n\nCurrent time: ${hourStr(G.hour)}`, [
{ label:‘📋 OK’, cls:‘c’, fn:closeModal }
]);
return;
}
}
const map = {
apartment:  bApartment,
mcsticks:   () => bJob(‘mcsticks’, “McSTICK’S”, “Over 2 Billion Stick Figures Served”),
gym:        bGym,
university: bUniversity,
bar:        bBar,
bank:       bBank,
newlines:   () => bJob(‘newlines’, ‘NEW LINES INC.’, ‘Synergy Through Circles’),
realestate: bRealEstate,
police:     bPolice,
police2:    bPolice,
casino:     bCasino,
dealer:     bDealer,
market:     bMarket,
market2:    bMarket,
hospital:   bHospital,
hospital2:  bHospital,
busdepot:   bBusDepot,
castle:     bCastle,
heitkamp:   bHeitkamp,
};
if (map[id]) map[id]();
else bugLog(’Unknown building: ’ + id);
}

function bApartment() {
const FURN = [
{icon:‘🛏️’, name:‘Bed’,         cost:200,  perk:‘Sleep restores +10 bonus energy’},
{icon:‘📺’, name:‘TV’,          cost:400,  perk:‘Watch TV: +1 CHA (free, once/day)’},
{icon:‘🛋️’, name:‘Couch’,       cost:600,  perk:‘Rest: restore 20 energy for free’},
{icon:‘💻’, name:‘Desk’,        cost:800,  perk:‘Study at home: +1 INT for $5’},
{icon:‘🎮’, name:‘Console’,     cost:1200, perk:‘Game session: +1 CHA, +15 energy’},
{icon:‘🏆’, name:‘Trophy Case’, cost:2000, perk:’+5 CHA permanent bonus’},
];

const opts = [
{ label:‘😴 Sleep — advance to next day’, cls:‘g’, fn:() => { closeModal(); doSleep(); } },
];

// Furniture perks usable today
if (G.furniture >= 2 && !G.usedTV) {
opts.push({ label:‘📺 Watch TV (+1 CHA, free)’, fn:() => {
G.cha = Math.min(99, G.cha+1); G.usedTV = true;
addMsg(‘Watched TV. +1 CHA’,‘g’); statPop(‘cha’,1); sfx(‘buy’);
closeModal(); updateHUD(); checkAchievements(); queueSave();
}});
}
if (G.furniture >= 3) {
opts.push({ label:‘🛋️ Rest on Couch (+20 Energy, free)’, fn:() => {
G.energy = Math.min(100, G.energy+20);
addMsg(‘Rested on couch. +20 Energy’,‘g’); sfx(‘buy’);
closeModal(); updateHUD(); queueSave();
}});
}
if (G.furniture >= 4) {
opts.push({ label:‘💻 Study at Desk (−$5 +1 INT)’, fn:() => {
if(G.money<5){toast(‘Need $5!’);return;}
G.money-=5; G.int=Math.min(99,G.int+1);
addMsg(‘Studied at desk. +1 INT’,‘g’); statPop(‘int’,1); sfx(‘buy’);
closeModal(); updateHUD(); checkAchievements(); queueSave();
}});
}
if (G.furniture >= 5 && !G.usedConsole) {
opts.push({ label:‘🎮 Play Console (+1 CHA, +15 Energy)’, fn:() => {
G.cha = Math.min(99, G.cha+1); G.energy = Math.min(100, G.energy+15);
G.usedConsole = true;
addMsg(‘Gaming session. +1 CHA +15 Energy’,‘g’); statPop(‘cha’,1); sfx(‘buy’);
closeModal(); updateHUD(); checkAchievements(); queueSave();
}});
}

// Buy next furniture
const nextF = FURN[G.furniture];
if (nextF) {
opts.push({ label:`🛒 Buy ${nextF.icon} ${nextF.name} — $${nextF.cost}`, cls: G.money>=nextF.cost?‘g’:‘c’, fn:() => {
if (G.money < nextF.cost) { toast(`Need $${nextF.cost}!`); return; }
G.money -= nextF.cost; G.furniture++;
if (G.furniture === 6) { G.cha = Math.min(99, G.cha+5); addMsg(‘Trophy Case bonus: +5 CHA!’,‘g’); statPop(‘cha’,5); }
addMsg(`Bought ${nextF.name}! Perk: ${nextF.perk}`, ‘g’);
toast(`🏠 ${nextF.icon} ${nextF.name} added!`);
statPop(‘money’, -nextF.cost); sfx(‘level’); closeModal(); updateHUD(); checkAchievements(); queueSave();
}});
}

opts.push({ label:‘📋 Close’, cls:‘c’, fn:closeModal });
const owned = G.furniture > 0 ? FURN.slice(0,G.furniture).map(f=>f.icon+f.name).join(’, ’) : ‘Nothing yet’;
openModal(‘YOUR APARTMENT’,
`🏠 ${G.apartment}  |  ${G.furniture}/6 furnished\n⚡ Energy: ${G.energy}/100\n☯ ${karmaDesc()}\n\nItems: ${owned}`, opts);
}

function bJob(jid, title, flavor) {
const job = JOBDEF[jid];
const isMine = G.jobId === jid;
const opts = [];
if (!isMine) {
const ok = Object.entries(job.req).every(([s,v]) => G[s] >= v);
if (!ok) {
const r = Object.entries(job.req).map(([s,v]) => s.toUpperCase() + ’ ’ + v).join(’, ’);
opts.push({ label:’🔒 Requires: ’ + r, cls:‘c’, fn:()=>{} });
} else {
opts.push({ label:‘💼 Apply ($’ + job.pay + ‘/hr)’, cls:‘g’, fn:() => {
G.jobId = jid; G.jobLevel = 0; G.jobShiftsToday = 0;
addMsg(‘Hired at ’ + job.name + ‘!’, ‘g’);
closeModal(); updateHUD(); queueSave();
}});
}
} else {
const pname = job.promos[Math.min(G.jobLevel, job.promos.length-1)];
const pay   = job.pay + G.jobLevel * (jid === ‘newlines’ ? 8 : 3);
if (G.jobShiftsToday < job.maxS) {
opts.push({ label:‘⏰ Work Shift +$’ + (pay*8) + ’ [’ + G.jobShiftsToday + ‘/’ + job.maxS + ‘]’, cls:‘g’, fn:() => {
if (G.energy < 20) { toast(‘Too exhausted to work! Sleep first.’); return; }
G.money += pay * 8; G.jobShiftsToday++;
const ch = { money: pay*8 };
if (job.bonus) { G[job.bonus] = Math.min(99, G[job.bonus]+1); ch[job.bonus] = 1; }
addMsg(‘Shift done +$’ + (pay*8) + (job.bonus ? ’ +1 ’ + job.bonus.toUpperCase() : ‘’), ‘o’);
if (G.jobShiftsToday % 2 === 0 && G.jobLevel < job.promos.length-1) {
G.jobLevel++;
toast(’🏅 Promoted: ’ + job.promos[G.jobLevel]);
sfx(‘level’);
} else {
sfx(‘coin’);
}
advanceTime(8, 30);
closeModal(); updateHUD(); statPops(ch); checkAchievements(); queueSave();
}});
} else {
opts.push({ label:‘✅ Done for today’, cls:‘c’, fn:closeModal });
}
opts.push({ label:’🏅 Title: ’ + pname, cls:‘c’, fn:()=>{} });
opts.push({ label:‘🚪 Quit Job’, cls:‘d’, fn:() => {
G.jobId = null; G.jobLevel = 0;
addMsg(‘Quit job.’, ‘w’); closeModal(); updateHUD(); queueSave();
}});
}
opts.push({ label:‘📋 Leave’, cls:‘c’, fn:closeModal });
openModal(title, flavor + ’\n\nINT: ’ + G.int + ’  STR: ’ + G.str + ’  KAR: ’ + G.kar, opts);
}

function bGym() {
openModal(“JIM’S GYM”, `STR: ${G.str}  Energy: ${G.energy}/100`, [
{ label:‘💪 Lift Weights −$10 +2 STR’, cls:‘g’, fn:() => { if(G.energy<15){toast(‘Too tired!’);return;} advanceTime(3,20); spend(‘str’, 2, -10, ‘Pumped iron! +2 STR’); } },
{ label:‘🥊 Spar −$5 +1 STR’,                 fn:() => { if(G.energy<10){toast(‘Too tired!’);return;} advanceTime(2,15); spend(‘str’, 1, -5,  ‘Sparred! +1 STR’); } },
{ label:‘🏋️ Apply: Trainer (need STR 20)’, fn:() => {
if (G.str < 20) { toast(’Need STR 20 (have ’ + G.str + ‘)’); return; }
G.jobId = ‘gym’; G.jobLevel = 0;
addMsg(‘Now a Personal Trainer!’, ‘g’); closeModal(); updateHUD(); queueSave();
}},
{ label:‘📋 Leave’, cls:‘c’, fn:closeModal },
]);
}

function bUniversity() {
openModal(‘UNIVERSITY’, `INT: ${G.int}  CHA: ${G.cha}  Energy: ${G.energy}/100`, [
{ label:‘📖 Study Hard −$20 +2 INT’, cls:‘g’, fn:() => { if(G.energy<20){toast(‘Too tired!’);return;} advanceTime(4,25); spend(‘int’, 2, -20, ‘Studied hard! +2 INT’); } },
{ label:‘🎓 Attend Class −$10 +1 INT’,        fn:() => { if(G.energy<15){toast(‘Too tired!’);return;} advanceTime(3,20); spend(‘int’, 1, -10, ‘Class done. +1 INT’); } },
{ label:‘🗣️ Charm Workshop −$15 +2 CHA’,      fn:() => { if(G.energy<15){toast(‘Too tired!’);return;} advanceTime(3,15); spend(‘cha’, 2, -15, ‘Charmed up! +2 CHA’); } },
{ label:‘📋 Leave’, cls:‘c’, fn:closeModal },
]);
}

function bBar() {
const barLines = [
‘“What'll it be, pal?”’,
‘“Rough day? You look terrible.”’,
‘“Last call ain't for a while. Relax.”’,
‘“You want the good stuff or the cheap stuff?”’,
];
const line = barLines[Math.floor(Math.random()*barLines.length)];
openModal(‘THE BAR’, `Bartender: ${line}\n\nCHA: ${G.cha}  KAR: ${G.kar}\nEnergy: ${G.energy}/100`, [
{ label:‘🍺 Beer −$8 +1 CHA −5 Energy’,     fn:() => { if(G.money<8){toast(‘Broke!’);return;} G.money-=8;G.cha++;G.energy=Math.max(0,G.energy-5); capStats(); addMsg(‘Had a beer. +1 CHA’,‘g’);statPop(‘cha’,1);closeModal();updateHUD();queueSave(); }},
{ label:‘🥃 Whiskey −$15 +2 CHA −10 Energy’, fn:() => { if(G.money<15){toast(‘Need $15!’);return;} G.money-=15;G.cha+=2;G.energy=Math.max(0,G.energy-10); capStats(); addMsg(‘Downed whiskey. +2 CHA’,‘g’);statPop(‘cha’,2);closeModal();updateHUD();queueSave(); }},
{ label:‘🎲 Arm Wrestle — bet $20’, cls:‘g’, fn:() => {
if (G.money < 20) { toast(‘Need $20!’); return; }
if (Math.random() < 0.3 + G.str * 0.01) {
G.money += 20; G.str = Math.min(99,G.str+1);
addMsg(‘Won the arm wrestle! +$20 +1 STR’, ‘g’);
toast(‘💪 You won!’); statPops({money:20, str:1});
} else {
G.money -= 20;
addMsg(‘Lost the arm wrestle. −$20’, ‘b’);
toast(‘😞 You lost.’); statPop(‘money’, -20);
}
closeModal(); updateHUD(); queueSave();
}},
{ label:‘🍹 Buy Round −$30 +3 CHA +2 KAR’, fn:() => spend2(‘cha’, 3, ‘kar’, 2, -30, ‘Bought a round! +3 CHA +2 KAR’) },
{ label:‘💬 Talk to locals −$5 +1 CHA’,     fn:() => { if(G.money<5){toast(‘Broke!’);return;} G.money-=5;G.cha++; capStats(); addMsg(‘Chatted at the bar. +1 CHA’,‘g’);statPop(‘cha’,1);closeModal();updateHUD();queueSave(); }},
{ label:‘📋 Leave’, cls:‘c’, fn:closeModal },
]);
}

function bBank() {
const stockVal = G.stockShares * G.stockPrice;
openModal(‘CITY BANK’, `Cash: $${G.money}\nBank: $${G.bankBalance}\nLoan: $${G.loan}\nStocks: ${G.stockShares} shares @ $${G.stockPrice} = $${stockVal}`, [
{ label:‘💵 Deposit $50’,  cls:‘g’, fn:() => { if(G.money<50){toast(‘Need $50!’);return;} G.money-=50; G.bankBalance+=50; addMsg(‘Deposited $50’,‘o’); statPop(‘money’,-50); sfx(‘buy’); closeModal(); updateHUD(); checkAchievements(); queueSave(); }},
{ label:‘💵 Deposit $200’, cls:‘g’, fn:() => { if(G.money<200){toast(‘Need $200!’);return;} G.money-=200; G.bankBalance+=200; addMsg(‘Deposited $200’,‘o’); statPop(‘money’,-200); sfx(‘buy’); closeModal(); updateHUD(); checkAchievements(); queueSave(); }},
{ label:‘🏧 Withdraw $50’,         fn:() => { if(G.bankBalance<50){toast(‘Not enough in bank!’);return;} G.bankBalance-=50; G.money+=50; addMsg(‘Withdrew $50’,‘o’); statPop(‘money’,50); sfx(‘coin’); closeModal(); updateHUD(); queueSave(); }},
{ label:`📈 Buy 10 Stocks ($${G.stockPrice*10})`, cls:‘g’, fn:() => {
const cost = G.stockPrice*10;
if(G.money<cost){toast(`Need $${cost}!`);return;}
G.money-=cost; G.stockShares+=10;
addMsg(`Bought 10 shares @ $${G.stockPrice}`,‘o’); statPop(‘money’,-cost); sfx(‘buy’);
closeModal(); updateHUD(); checkAchievements(); queueSave();
}},
{ label:`📉 Sell All Stocks (+$${stockVal})`, fn:() => {
if(G.stockShares===0){toast(‘No stocks!’);return;}
G.money+=stockVal; G.stockShares=0;
addMsg(`Sold stocks for $${stockVal}`,‘o’); statPop(‘money’,stockVal);
sfx(stockVal > 0 ? ‘coin’ : ‘lose’); closeModal(); updateHUD(); checkAchievements(); queueSave();
}},
{ label:‘🤝 Take Loan $500 (5%/day)’, cls:‘d’, fn:() => { if(G.loan>0){toast(‘Already have a loan!’);return;} G.money+=500; G.loan=500; G.kar-=5; addMsg(‘Took $500 loan. −5 KAR’,‘w’); statPops({money:500,kar:-5}); sfx(‘buy’); closeModal(); updateHUD(); queueSave(); }},
{ label:‘💳 Repay Loan ($’ + G.loan + ‘)’, fn:() => {
if(!G.loan){toast(‘No loan!’);return;} if(G.money<G.loan){toast(‘Need $’+G.loan);return;}
const amt=G.loan; G.money-=amt; G.loan=0; G.kar+=5;
addMsg(‘Loan repaid! +5 KAR’,‘g’); statPops({money:-amt,kar:5}); sfx(‘level’);
closeModal(); updateHUD(); checkAchievements(); queueSave();
}},
{ label:‘📋 Leave’, cls:‘c’, fn:closeModal },
]);
}

function bRealEstate() {
const homes = [
{id:‘Apartment’,p:500,  icon:‘🏠’},
{id:‘Condo’,    p:2500, icon:‘🏢’},
{id:‘Mansion’,  p:10000,icon:‘🏰’},
];
const opts = homes.map(h => ({
label: h.icon + ’ ’ + h.id + ’ — $’ + h.p + (G.apartment===h.id ? ’ ✓’ : ‘’),
cls: G.apartment===h.id ? ‘c’ : ‘g’,
fn:() => {
if (G.apartment===h.id) { toast(‘Already own this!’); return; }
if (G.money<h.p) { toast(‘Need $’+h.p+’!’); return; }
G.money -= h.p; G.apartment = h.id;
addMsg(’Bought the ’ + h.id + ‘! ’ + h.icon, ‘g’);
toast(h.icon + ’ ’ + h.id + ’ is yours!’);
statPop(‘money’, -h.p); sfx(‘level’);
closeModal(); updateHUD(); checkAchievements(); queueSave();
}
}));
opts.push({ label:‘📋 Leave’, cls:‘c’, fn:closeModal });
openModal(‘REAL ESTATE’, `Current: ${G.apartment}\nCash: $${G.money}\n\nOwn a better home for the escape!`, opts);
}

function bPolice() {
const job = JOBDEF.police;
const isMine = G.jobId === ‘police’;
const opts = [];
if (!isMine) {
if (G.str < job.req.str || G.kar < job.req.kar) {
opts.push({ label:‘🔒 Need STR ’ + job.req.str + ‘, KAR ’ + job.req.kar, cls:‘c’, fn:()=>{} });
} else {
opts.push({ label:‘🚔 Apply as Officer’, cls:‘g’, fn:() => {
G.jobId = ‘police’; G.jobLevel = 0;
addMsg(‘Joined the police force!’, ‘g’); closeModal(); updateHUD(); queueSave();
}});
}
} else {
const pay = job.pay + G.jobLevel * 5;
if (G.jobShiftsToday < job.maxS) {
opts.push({ label:‘🚔 Work Patrol +$’ + (pay*8) + ’ +2 KAR’, cls:‘g’, fn:() => {
G.money += pay*8; G.kar = Math.min(99, G.kar+2); G.jobShiftsToday++;
addMsg(‘Patrol done. +$’ + (pay*8) + ’ +2 KAR’, ‘g’);
if (G.jobShiftsToday%2===0 && G.jobLevel < job.promos.length-1) {
G.jobLevel++; toast(’Promoted: ’ + job.promos[G.jobLevel]); sfx(‘level’);
} else { sfx(‘coin’); }
statPops({money:pay*8, kar:2}); closeModal(); updateHUD(); checkAchievements(); queueSave();
}});
} else {
opts.push({ label:‘✅ Off duty today’, cls:‘c’, fn:closeModal });
}
opts.push({ label:‘🚪 Resign’, cls:‘d’, fn:() => { G.jobId=null; G.jobLevel=0; addMsg(‘Resigned.’,‘w’); closeModal(); updateHUD(); queueSave(); }});
}
opts.push({ label:‘📋 Leave’, cls:‘c’, fn:closeModal });
openModal(‘POLICE DEPT’, ’STR: ’ + G.str + ’  KAR: ’ + G.kar, opts);
}

function bCasino() {
openModal(‘THE CASINO’, ‘Cash: $’ + G.money, [
{ label:‘🎲 Blackjack $50 (45% odds)’,  cls:‘g’, fn:() => gamble(50,  0.45) },
{ label:‘🎲 Blackjack $200’,            cls:‘g’, fn:() => gamble(200, 0.45) },
{ label:‘🎰 Slots $20’, fn:() => {
if (G.money < 20) { toast(‘Need $20!’); return; }
G.money -= 20;
const r = Math.random();
if      (r < 0.05) { G.money += 500; addMsg(‘JACKPOT! +$500’, ‘o’); toast(‘🎰 JACKPOT +$500!’); statPop(‘money’, 500); sfx(‘level’); checkAchievements(); }
else if (r < 0.28) { G.money += 40;  addMsg(‘Slots win +$40’, ‘g’); statPop(‘money’, 40); sfx(‘coin’); }
else               { addMsg(‘No luck on slots.’, ‘b’); statPop(‘money’, -20); sfx(‘lose’); }
closeModal(); updateHUD(); queueSave();
}},
{ label:‘🃏 Poker $100 (CHA helps)’, cls:‘g’, fn:() => gamble(100, 0.35 + G.cha*0.005) },
{ label:‘📋 Leave’, cls:‘c’, fn:closeModal },
]);
}

function gamble(amt, odds) {
if (G.money < amt) { toast(‘Need $’ + amt + ‘!’); return; }
if (Math.random() < odds) {
G.money += amt; addMsg(‘Won $’ + amt + ‘! 🎉’, ‘o’); toast(‘🎉 +$’ + amt + ‘!’);
statPop(‘money’, amt); sfx(‘coin’); checkAchievements();
} else {
G.money -= amt; addMsg(‘Lost $’ + amt + ‘.’, ‘b’); toast(‘😞 −$’ + amt + ‘.’);
statPop(‘money’, -amt); sfx(‘lose’);
}
closeModal(); updateHUD(); queueSave();
}

function bDealer() {
const hasCoke = G.hasCoke;
openModal(‘BACK ALLEY’, `A shady figure in the shadows...\nKAR: ${G.kar}\nTime: ${hourStr(G.hour)} (only open 8PM-12AM)`, [
!hasCoke
? { label:‘💊 Buy Cocaine −$100 −10 KAR’, cls:‘d’, fn:() => {
if(G.money<100){toast(‘Need $100!’);return;}
G.money-=100; G.kar-=10; G.hasCoke=true;
addMsg(‘Bought cocaine. −10 KAR’,‘b’); statPops({money:-100,kar:-10});
sfx(‘buy’); closeModal(); updateHUD(); checkAchievements(); queueSave();
}}
: { label:‘💰 Sell Cocaine +$300 −15 KAR’, cls:‘d’, fn:() => {
const bonus = Math.round(300 * karmaEvilBonus());
G.money+=bonus; G.kar-=15; G.hasCoke=false;
addMsg(`Sold cocaine. +$${bonus} −15 KAR`,‘b’); toast(`💰 +$${bonus} (dirty)`);
statPops({money:bonus,kar:-15}); sfx(‘coin’); closeModal(); updateHUD(); checkAchievements(); queueSave();
}},
{ label:‘🏦 Rob the Bank (risky!)’, cls:‘d’, fn:() => {
closeModal();
openModal(‘ROB THE BANK?’, `This is extremely risky.\n\nSuccess: ~${Math.round((20+G.str*1.5))}%\nReward: +$2000 −30 KAR\nFail: Arrested, lose $500 −20 KAR`, [
{ label:‘💰 DO IT’, cls:‘d’, fn:() => {
const chance = 0.2 + G.str * 0.015;
if (Math.random() < chance) {
G.money += 2000; G.kar = Math.max(-99, G.kar-30);
addMsg(‘ROBBED THE BANK! +$2000 −30 KAR’,‘b’);
toast(‘💰 Got away with $2000!’);
statPops({money:2000, kar:-30}); sfx(‘level’); checkAchievements();
} else {
const fine = Math.min(G.money, 500);
G.money -= fine; G.kar = Math.max(-99, G.kar-20);
addMsg(`Caught! Lost $${fine} −20 KAR.`,‘b’);
toast(‘🚔 Busted! −$’ + fine);
statPops({money:-fine, kar:-20}); sfx(‘lose’);
}
closeModal(); updateHUD(); queueSave();
}},
{ label:‘🏃 Back out’, cls:‘c’, fn:closeModal },
]);
}},
{ label:‘🎁 Buy Stolen Goods −$50 +2 CHA’, fn:() => {
if(G.money<50){toast(‘Need $50!’);return;}
G.money-=50; G.cha=Math.min(99,G.cha+2); G.kar=Math.max(-99,G.kar-3);
addMsg(‘Stolen goods. +2 CHA −3 KAR’,‘w’);
statPops({money:-50,cha:2,kar:-3}); sfx(‘buy’); closeModal(); updateHUD(); checkAchievements(); queueSave();
}},
{ label:‘🏃 Walk Away’, cls:‘c’, fn:closeModal },
]);
}

function bMarket() {
const disc = karmaDiscount(); const mark = karmaMarkup();
const pm = disc < 1 ? disc : mark;
const pl = disc < 1 ? ’ 😇 karma discount!’ : mark > 1 ? ’ 😠 karma markup’ : ‘’;
const p = b => Math.round(b * pm);
openModal(‘FOOD MART’, `Cash: $${G.money}\nEnergy: ${G.energy}/100${pl}`, [
{ label:`☕ Rad Bull −$${p(3)} +25 Energy`,         fn:() => { if(G.money<p(3)){toast(‘Broke!’);return;} G.money-=p(3); G.energy=Math.min(100,G.energy+25); addMsg(‘Chugged Rad Bull. +25 Energy’,‘g’); sfx(‘buy’); closeModal(); updateHUD(); queueSave(); }},
{ label:`🥗 Healthy Meal −$${p(8)} +1 INT +20 Nrg`, fn:() => { if(G.money<p(8)){toast(`Need $${p(8)}!`);return;} G.money-=p(8); G.int=Math.min(99,G.int+1); G.energy=Math.min(100,G.energy+20); addMsg(‘Ate healthy. +1 INT +20 Energy’,‘g’); statPop(‘int’,1); sfx(‘buy’); closeModal(); updateHUD(); checkAchievements(); queueSave(); }},
{ label:`🍕 Pizza −$${p(5)} +1 STR +15 Nrg`,        fn:() => { if(G.money<p(5)){toast(`Need $${p(5)}!`);return;} G.money-=p(5); G.str=Math.min(99,G.str+1); G.energy=Math.min(100,G.energy+15); addMsg(‘Pizza time. +1 STR +15 Energy’,‘g’); statPop(‘str’,1); sfx(‘buy’); closeModal(); updateHUD(); checkAchievements(); queueSave(); }},
{ label:`🚬 Cigarettes −$${p(4)} +1 CHA −5 Nrg`,    fn:() => { if(G.money<p(4)){toast(`Need $${p(4)}!`);return;} G.money-=p(4); G.cha=Math.min(99,G.cha+1); G.energy=Math.max(0,G.energy-5); addMsg(‘Smoked. +1 CHA −5 Energy’,‘w’); statPop(‘cha’,1); sfx(‘buy’); closeModal(); updateHUD(); checkAchievements(); queueSave(); }},
{ label:`🍺 6-Pack −$${p(10)} +2 CHA −10 Nrg`,      fn:() => { if(G.money<p(10)){toast(`Need $${p(10)}!`);return;} G.money-=p(10); G.cha=Math.min(99,G.cha+2); G.energy=Math.max(0,G.energy-10); addMsg(‘6-pack. +2 CHA’,‘g’); statPop(‘cha’,2); sfx(‘buy’); closeModal(); updateHUD(); checkAchievements(); queueSave(); }},
{ label:‘📋 Leave’, cls:‘c’, fn:closeModal },
]);
}

function bHospital() {
const disc = karmaDiscount();
const p = b => Math.round(b * (disc < 1 ? disc : 1)); // good karma = discount at hospital
const pl = disc < 1 ? ’ 😇 karma discount!’ : ‘’;
openModal(‘HOSPITAL’, `Cash: $${G.money}\nEnergy: ${G.energy}/100${pl}`, [
{ label:`💊 Full Checkup −$${p(50)} (full energy)`,   fn:() => { if(G.money<p(50)){toast(`Need $${p(50)}!`);return;} G.money-=p(50); G.energy=100; addMsg(‘Patched up! Energy full.’,‘g’); statPop(‘money’,-p(50)); sfx(‘buy’); closeModal(); updateHUD(); queueSave(); }},
{ label:‘🧪 Brain Boost −$100 +3 INT’, cls:‘g’, fn:() => spend(‘int’, 3, -100, ‘Brain boost! +3 INT’) },
{ label:`💉 Energy Shot −$${p(20)} +50 Energy`,       fn:() => { if(G.money<p(20)){toast(`Need $${p(20)}!`);return;} G.money-=p(20); G.energy=Math.min(100,G.energy+50); addMsg(‘Energy shot! +50 Energy’,‘g’); statPop(‘money’,-p(20)); sfx(‘buy’); closeModal(); updateHUD(); queueSave(); }},
{ label:‘📋 Leave’, cls:‘c’, fn:closeModal },
]);
}

function bBusDepot() {
openModal(‘BUS DEPOT’, `Cash: $${G.money}\nCar: ${G.hasCar ? '🚗 OWNED' : 'Not yet — $3000'}`, [
{ label:‘🚌 Day Trip −$10 +1 CHA’, fn:() => spend(‘cha’, 1, -10, ‘Bus trip! +1 CHA’) },
{ label:`🚗 Buy a Car — $3000 ${G.hasCar?'✅':''}`, cls: G.hasCar?‘c’:‘g’, fn:() => {
if (G.hasCar) { toast(‘You already have a car!’); return; }
if (G.money < 3000) { toast(‘Need $3000 for the car!’); return; }
G.money -= 3000; G.hasCar = true;
addMsg(‘You bought a car! 🚗 One step closer to escaping.’, ‘g’);
toast(‘🚗 Car purchased!’);
statPop(‘money’, -3000); sfx(‘level’); closeModal(); updateHUD(); checkAchievements(); queueSave();
}},
{ label:‘📋 Leave’, cls:‘c’, fn:closeModal },
]);
}

function bCastle() {
const canPres  = G.kar >= 50  && G.money >= 50000;
const canDict  = G.kar <= -50 && G.money >= 50000;
const canEscape= G.hasCar && G.money >= 10000 && G.str >= 30 && G.int >= 30 && G.cha >= 30 && G.furniture >= 3;
const escapeReqs = `🚗 Car: ${G.hasCar?'✅':'❌'}  💰 $10k: ${G.money>=10000?'✅':'❌'}\n💪 STR 30: ${G.str>=30?'✅':'❌'}  🧠 INT 30: ${G.int>=30?'✅':'❌'}\n✨ CHA 30: ${G.cha>=30?'✅':'❌'}  🏠 3 Furnishings: ${G.furniture>=3?'✅':'❌'}`;
const opts = [];
opts.push({ label:`🌀 Use Portal (Escape home!) ${canEscape?'':'🔒'}`, cls: canEscape?‘g’:‘c’, fn:() => {
if (!canEscape) { toast(‘Not ready to escape yet!’); return; }
closeModal();
G.escaped = true;
showWinScreen(‘escape’);
}});
opts.push(canPres
? { label:‘🗳️ Run for PRESIDENT’, cls:‘g’, fn:() => { closeModal(); G.kar+=10; showWinScreen(‘president’); }}
: { label:‘🔒 President: KAR 50 + $50k’, cls:‘c’, fn:()=>{} });
opts.push(canDict
? { label:‘👹 Become DICTATOR’, cls:‘d’, fn:() => { closeModal(); G.kar-=10; showWinScreen(‘dictator’); }}
: { label:‘🔒 Dictator: KAR −50 + $50k’, cls:‘c’, fn:()=>{} });
opts.push({ label:‘📋 Leave’, cls:‘c’, fn:closeModal });
openModal(‘THE CASTLE’, `Portal to home dimension detected.\n\nRequirements:\n${escapeReqs}\n\nKAR: ${G.kar}  Money: $${G.money}`, opts);
}

function showWinScreen(type) {
const screens = {
escape: { title:‘🌀 YOU ESCAPED!’, msg:`After ${G.day} days in the 2D World...\n\n${G.name} found the portal home!\n\nFinal Stats:\nSTR: ${G.str}  INT: ${G.int}  CHA: ${G.cha}\nNet Worth: $${G.money+G.bankBalance}\nFight Wins: ${G.fightWins}\n\nYou made it back!`, col:’#00ff88’ },
president: { title:‘🗳️ PRESIDENT!’, msg:`${G.name} has been elected\nPRESIDENT of the 2D World!\n\nDay ${G.day} | Karma: ${G.kar}\nNet Worth: $${G.money+G.bankBalance}`, col:’#ffd700’ },
dictator: { title:‘👹 DICTATOR!’, msg:`${G.name} has seized power\nas DICTATOR of the 2D World!\n\nDay ${G.day} | Karma: ${G.kar}\nNet Worth: $${G.money+G.bankBalance}`, col:’#ff4444’ },
};
const s = screens[type];
saveGame();
openModal(s.title, s.msg, [
{ label:‘🔄 Play Again’, cls:‘g’, fn:() => { closeModal(); deleteSaveData(); location.reload(); }},
{ label:‘📋 Keep Playing’, cls:‘c’, fn:closeModal },
]);
}

function bHeitkamp() {
const robbed = G.heitkampRobbed || false;
const cooldownDone = !robbed || (G.day - (G.heitkampRobbedDay||0)) >= 3;
const successChance = Math.round(15 + G.str * 2);

openModal(‘HEITKAMP MASONRY’, `A sturdy brick building.\nThe vault looks... interesting.\n\nSTR: ${G.str}  KAR: ${G.kar}${robbed && !cooldownDone ? '\n\n⚠️ Still on alert — wait ' + (3-(G.day-(G.heitkampRobbedDay||0))) + ' more day(s)' : ''}`, [

```
{ label:'💼 Apply for Work +$60/day', cls:'g', fn:() => {
  if(G.energy < 15) { toast('Too tired!'); return; }
  G.money += 60; G.str = Math.min(99, G.str+1);
  advanceTime(8, 25);
  addMsg('Laid bricks all day. +$60 +1 STR', 'g');
  statPops({money:60, str:1}); sfx('coin');
  closeModal(); updateHUD(); checkAchievements(); queueSave();
}},

{ label: robbed && !cooldownDone
    ? `🔒 Vault on Alert (${3-(G.day-(G.heitkampRobbedDay||0))} days left)`
    : `🏚️ Rob the Vault (~${successChance}% success)`,
  cls:'d',
  fn:() => {
    if (robbed && !cooldownDone) { toast('Too hot right now. Lay low.'); return; }
    closeModal();
    openModal('ROB THE VAULT?',
      `Heitkamp Masonry has a cash vault.\n\nSuccess: ~${successChance}%\nReward: $800–$1500\nFail: Caught, lose cash + heavy KAR hit\n\nThis will take guts.`, [
      { label:'🔓 Crack it', cls:'d', fn:() => {
        const win = Math.random() < (0.15 + G.str * 0.02);
        if (win) {
          const loot = 800 + Math.floor(Math.random() * 700);
          G.money += loot;
          G.kar = Math.max(-99, G.kar - 25);
          G.heitkampRobbed = true;
          G.heitkampRobbedDay = G.day;
          addMsg(`Cracked the Heitkamp vault! +$${loot} −25 KAR`, 'b');
          toast(`💰 Vault cracked! +$${loot}`);
          statPops({money:loot, kar:-25});
          sfx('level'); checkAchievements();
        } else {
          const fine = Math.min(G.money, 400);
          G.money -= fine;
          G.kar = Math.max(-99, G.kar - 15);
          G.energy = Math.max(0, G.energy - 40);
          addMsg(`Caught at Heitkamp! Lost $${fine} −15 KAR`, 'b');
          toast(`🚔 Busted at Heitkamp! −$${fine}`);
          statPops({money:-fine, kar:-15});
          sfx('lose');
        }
        closeModal(); updateHUD(); queueSave();
      }},
      { label:'🚪 Walk away', cls:'c', fn:closeModal },
    ]);
}},

{ label:'🧱 Buy Bricks −$30 (for apartment)', fn:() => {
  if(G.money < 30) { toast('Need $30!'); return; }
  G.money -= 30; G.furniture = Math.min(6, G.furniture + 0.5|0);
  addMsg('Bought bricks. Reinforced apartment.', 'g');
  statPop('money', -30); sfx('buy');
  closeModal(); updateHUD(); queueSave();
}},

{ label:'📋 Leave', cls:'c', fn:closeModal },
```

]);
}

/* ═══════════════════════════════════════
STATUS MODAL
═══════════════════════════════════════ */
function openStatus() {
const jname  = G.jobId ? (JOBDEF[G.jobId]?.name || G.jobId) : ‘Unemployed’;
const jtitle = G.jobId ? (JOBDEF[G.jobId]?.promos[G.jobLevel] || ‘’) : ‘’;
const netWorth = G.money + G.bankBalance + (G.stockShares * G.stockPrice) - G.loan;
const h = G.hour; const ampm = h<12?‘AM’:‘PM’; const h12=h===0?12:h>12?h-12:h;
openModal(‘CHARACTER STATUS’, null, [
{ label:‘✖ Close’,                                                               cls:‘c’, fn:closeModal },
{ label:’👤 ’ + G.name,                                                          cls:‘c’, fn:()=>{} },
{ label:’💪 Strength: ’     + G.str,                                             cls:‘c’, fn:()=>{} },
{ label:’🧠 Intelligence: ’ + G.int,                                             cls:‘c’, fn:()=>{} },
{ label:’✨ Charm: ’        + G.cha,                                             cls:‘c’, fn:()=>{} },
{ label:’☯ Karma: ’        + G.kar + ’  ’ + karmaDesc(),                        cls:‘c’, fn:()=>{} },
{ label:’⚡ Energy: ’       + G.energy + ‘/100’,                                 cls:‘c’, fn:()=>{} },
{ label:’🕐 Time: ’         + h12 + ampm + ’ — Day ’ + G.day,                   cls:‘c’, fn:()=>{} },
{ label:‘💰 Cash: $’        + G.money,                                           cls:‘c’, fn:()=>{} },
{ label:‘🏦 Bank: $’        + G.bankBalance,                                     cls:‘c’, fn:()=>{} },
{ label:‘📈 Stocks: ’       + G.stockShares + ’ shares @ $’ + G.stockPrice,     cls:‘c’, fn:()=>{} },
{ label:‘💳 Loan: $’        + G.loan,                                            cls:‘c’, fn:()=>{} },
{ label:‘📊 Net Worth: $’   + netWorth,                                          cls:‘c’, fn:()=>{} },
{ label:‘💼 ‘+ jname + (jtitle?’ — ‘+jtitle:’’),                                 cls:‘c’, fn:()=>{} },
{ label:’🏠 Home: ’         + G.apartment + ’  Furnished: ’ + G.furniture + ‘/6’,cls:‘c’, fn:()=>{} },
{ label:’🚗 Car: ’          + (G.hasCar?‘Owned ✅’:‘Not yet’),                   cls:‘c’, fn:()=>{} },
{ label:’👊 Fight Wins: ’   + G.fightWins,                                       cls:‘c’, fn:()=>{} },
{ label:’🌀 Escape: ’       + (G.hasCar&&G.money>=10000&&G.str>=30&&G.int>=30&&G.cha>=30&&G.furniture>=3?‘READY ✅’:‘Not yet’), cls:‘c’, fn:()=>{} },
]);
}

/* ═══════════════════════════════════════
START SCREEN
═══════════════════════════════════════ */
let allocPts = 10;
const allocVals = { str:0, int:0, cha:0 };

function setupStartScreen() {
// Show continue button if save exists
if (hasSave()) {
document.getElementById(‘continueBtn’).style.display = ‘block’;
document.getElementById(‘delSave’).style.display    = ‘block’;
}

// Allocator buttons — using touchstart for instant mobile response
const allocConfig = [
[‘btn-sp’,‘btn-sm’,‘val-str’,‘str’],
[‘btn-ip’,‘btn-im’,‘val-int’,‘int’],
[‘btn-cp’,‘btn-cm’,‘val-cha’,‘cha’],
];

allocConfig.forEach(([plusId, minusId, valId, stat]) => {
const plus  = document.getElementById(plusId);
const minus = document.getElementById(minusId);

```
function doPlus(e)  { e.preventDefault(); if(allocPts<=0)return; allocVals[stat]++; allocPts--; document.getElementById(valId).textContent=allocVals[stat]; document.getElementById('ptsLeft').textContent='Points: '+allocPts; }
function doMinus(e) { e.preventDefault(); if(allocVals[stat]<=0)return; allocVals[stat]--; allocPts++; document.getElementById(valId).textContent=allocVals[stat]; document.getElementById('ptsLeft').textContent='Points: '+allocPts; }

plus.addEventListener('touchstart',  doPlus,  { passive:false });
minus.addEventListener('touchstart', doMinus, { passive:false });
plus.addEventListener('click',  doPlus);
minus.addEventListener('click', doMinus);
```

});

// Continue
const contBtn = document.getElementById(‘continueBtn’);
function doContinue(e) {
e.preventDefault();
if (loadGame()) { launchGame(false); }
else { toast(‘Save corrupted.’); }
}
contBtn.addEventListener(‘touchstart’, doContinue, { passive:false });
contBtn.addEventListener(‘click’, doContinue);

// New game
const startBtn = document.getElementById(‘startBtn’);
function doStart(e) {
e.preventDefault();
const name = document.getElementById(‘nameInput’).value.trim() || ‘STICK’;
G.name = name.toUpperCase().slice(0, 12);
G.str = 5 + allocVals.str;
G.int = 5 + allocVals.int;
G.cha = 5 + allocVals.cha;
launchGame(true);
}
startBtn.addEventListener(‘touchstart’, doStart, { passive:false });
startBtn.addEventListener(‘click’, doStart);

// Delete save
const delBtn = document.getElementById(‘delSave’);
function doDel(e) {
e.preventDefault();
deleteSaveData();
document.getElementById(‘continueBtn’).style.display = ‘none’;
delBtn.style.display = ‘none’;
toast(‘Save deleted.’);
}
delBtn.addEventListener(‘touchstart’, doDel, { passive:false });
delBtn.addEventListener(‘click’, doDel);
}

function launchGame(isNew) {
document.getElementById(‘startScreen’).classList.add(‘gone’);
updateHUD();
if (isNew) {
addMsg(‘Welcome, ’ + G.name + ‘! You have $50.’, ‘s’);
addMsg(“Head to McStick’s for your first job.”, ‘w’);
addMsg(‘D-Pad moves. ENTER enters buildings.’, ‘o’);
} else {
addMsg(’Welcome back, ’ + G.name + ‘! Day ’ + G.day + ‘.’, ‘s’);
addMsg(‘Cash: $’ + G.money + ’  Bank: $’ + G.bankBalance, ‘o’);
// Silently restore achievements from loaded state
ACHIEVEMENTS.forEach(a => { if (a.check()) unlockedAch.add(a.id); });
}
setPlayerPos();
updateCamera();
checkNear();
startLoop();
}

/* ═══════════════════════════════════════
BOTTOM BUTTONS
═══════════════════════════════════════ */
document.getElementById(‘btnE’).addEventListener(‘click’, handleEnter);
document.getElementById(‘btnSl’).addEventListener(‘click’, () => {
openModal(‘SLEEP?’, ‘Skip to next day?\nBank interest applies.’, [
{ label:‘😴 Yes, sleep’, cls:‘g’, fn:() => { closeModal(); doSleep(); } },
{ label:‘❌ No’,          cls:‘c’, fn:closeModal },
]);
});
document.getElementById(‘btnSt’).addEventListener(‘click’, openStatus);

/* ═══════════════════════════════════════
PREVENT SCROLL ON GAME AREA ONLY
═══════════════════════════════════════ */
document.getElementById(‘viewport’).addEventListener(‘touchmove’, e => e.preventDefault(), { passive:false });

/* ═══════════════════════════════════════
INIT
═══════════════════════════════════════ */
buildWorld();
setupDpad();
setupBugPanel();
setupStartScreen();
updateHUD();
setPlayerPos();
updateCamera();
window.addEventListener(‘resize’, updateCamera);