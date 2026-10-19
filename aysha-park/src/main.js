import { buildTextures } from './art.js';
import { DIALOGUES, FRUITS, SAVE_KEY } from './data.js';
import { traceIsland, isOnIsland, cameraZoom } from './geometry.js';

const $ = (id) => document.getElementById(id);
const touchDevice = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const ui = { scene: null, mode: 'menu', started: false, dialogue: null, sound: false, audio: null, joystick: { x: 0, y: 0 }, lastActivity: Date.now(), tipTimer: null };
let saved = null;
try { saved = normalizeSave(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { /* Storage is optional. */ }
const freshState = () => ({ mission: 'not_started', collected: [], x: 1030, y: 925 });
function normalizeSave(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const mission = ['active', 'completed'].includes(value.mission) ? value.mission : 'not_started';
  const ids = Array.isArray(value.collected) ? value.collected : [];
  return { mission, collected: mission === 'completed' ? FRUITS.map(f => f.id) : mission === 'active' ? FRUITS.map(f => f.id).filter(id => ids.includes(id)) : [], x: Number.isFinite(value.x) ? value.x : 1030, y: Number.isFinite(value.y) ? value.y : 925 };
}
let state = freshState();
const show = (id, visible = true) => { $(id).hidden = !visible; };
function resetMovement() {
  ui.joystick.x = ui.joystick.y = 0;
  ui.resetJoystick?.();
  ui.scene?.input.keyboard.resetKeys();
}
function setMode(mode) {
  ui.mode = mode;
  resetMovement();
  if (ui.scene) {
    const keyboard=ui.scene.input.keyboard;
    keyboard.enabled=mode==='playing';
    if(mode==='playing')keyboard.addCapture('UP,DOWN,LEFT,RIGHT');
    else keyboard.removeCapture('UP,DOWN,LEFT,RIGHT');
  }
  document.body.classList.toggle('is-playing', ui.started);
  $('game-shell').dataset.mode = mode;
  show('touch-controls', touchDevice && mode === 'playing');
  show('interact-button', false);
  show('objective-guide', mode === 'playing');
  ui.lastActivity = Date.now();
}
function focusGame() { $('game').focus({ preventScroll: true }); }
const save = () => {
  if (!ui.started) return;
  if (ui.scene?.player) { state.x = ui.scene.player.x; state.y = ui.scene.player.y; }
  saved = { ...state, collected: [...state.collected] };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* Private mode can disable local storage. */ }
};
function playTone(type = 'collect') {
  if (!ui.sound) return;
  try {
    const ac = ui.audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const notes = type === 'complete' ? [523.25, 659.25, 783.99, 1046.5] : type === 'talk' ? [392, 523] : [659.25, 987.77];
    notes.forEach((frequency, i) => {
      const osc = ac.createOscillator(); const gain = ac.createGain(); const t = ac.currentTime + i * .11;
      osc.type = 'sine'; osc.frequency.value = frequency; gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.055, t + .015); gain.gain.exponentialRampToValueAtTime(.001, t + .5);
      osc.connect(gain); gain.connect(ac.destination); osc.start(t); osc.stop(t + .51);
    });
  } catch { ui.sound = false; updateSound(); }
}
function updateSound() {
  const path = ui.sound ? 'M11 5 6 9H3v6h3l5 4zM15 8q5 4 0 8M18 5q8 7 0 14' : 'M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6';
  $('sound-button').innerHTML = `<svg viewBox="0 0 24 24"><path d="${path}"/></svg>`;
  $('sound-button').setAttribute('aria-label', ui.sound ? 'Silenciar som' : 'Ativar som');
  $('sound-button').title = ui.sound ? 'Silenciar som' : 'Ativar som';
}
function toast(text) { $('toast').textContent = text; show('toast'); clearTimeout(ui.toastTimer); ui.toastTimer = setTimeout(() => show('toast', false), 3200); }
function syncHUD() {
  const n = state.collected.length;
  document.querySelectorAll('#fruit-progress>span').forEach((el, i) => el.classList.toggle('collected', i < n));
  $('fruit-count').textContent = `${n} / 3 frutas`;
  $('friendship-badge').classList.toggle('earned', state.mission === 'completed');
  const descriptions = { not_started: 'Encontre Tico e descubra o que aconteceu.', active: n === 3 ? 'As frutas estão com você! Volte até Tico.' : 'Siga as pegadas e encontre três frutas pelo jardim.', completed: 'Você ajudou Tico! O jardim é seu para explorar.' };
  $('quest-description').textContent = descriptions[state.mission];
  $('quest-title').textContent = state.mission === 'completed' ? 'Uma nova amizade' : 'Um tricerátopo faminto';
  $('quest-stage').textContent = state.mission === 'completed' ? '✓' : '01';
  $('quest-card').classList.toggle('mission-complete', state.mission === 'completed');
}
function dialogue(lines, onComplete) {
  setMode('dialogue');
  ui.dialogue = { lines, index: 0, onComplete };
  show('dialogue'); show('jenny-tip', false); renderDialogue(); $('dialogue-next').focus({ preventScroll: true });
}
function renderDialogue() {
  const d = ui.dialogue; if (!d) return;
  const line = d.lines[d.index]; $('dialogue-speaker').textContent = line.speaker.toUpperCase(); $('dialogue-text').textContent = line.text;
  const key = { Jenny: 'jenny', Tico: 'tico', Aysha: 'aysha' }[line.speaker];
  const source = ui.scene?.textures.get(key)?.getSourceImage();
  $('dialogue-portrait').replaceChildren();
  if (source?.toDataURL) { const img = document.createElement('img'); img.src = source.toDataURL(); img.alt = ''; $('dialogue-portrait').append(img); }
  $('dialogue-next').firstChild.textContent = d.index === d.lines.length - 1 ? 'Vamos lá ' : 'Continuar ';
}
function nextDialogue() {
  const d = ui.dialogue; if (!d || ui.mode !== 'dialogue') return;
  playTone('talk'); ui.lastActivity = Date.now();
  if (++d.index < d.lines.length) renderDialogue();
  else { const cb = d.onComplete; ui.dialogue = null; show('dialogue', false); setMode('playing'); focusGame(); cb?.(); }
}
function setPause(paused) {
  if (!ui.started || (paused && !['playing', 'dialogue'].includes(ui.mode)) || (!paused && ui.mode !== 'paused')) return;
  if (paused) { ui.beforePause = ui.mode; show('dialogue', false); setMode('paused'); }
  else { setMode(ui.beforePause || 'playing'); show('dialogue', ui.mode === 'dialogue'); if (ui.mode === 'dialogue') $('dialogue-next').focus({ preventScroll: true }); else focusGame(); }
  show('pause-modal', paused); if(paused)$('resume-button').focus({ preventScroll: true }); show('jenny-tip', false); save();
}
function start(continuing = false) {
  state = continuing && saved ? normalizeSave(saved) || freshState() : freshState();
  ['intro', 'complete-modal', 'pause-modal', 'help-modal', 'dialogue', 'jenny-tip', 'toast'].forEach(id => show(id, false));
  ['toastTimer', 'tipTimer', 'fruitHintTimer'].forEach(key => { clearTimeout(ui[key]); ui[key] = null; });
  ui.dialogue = null; ui.beforePause = null; ui.beforeHelp = null;
  ui.started = true; setMode('playing'); ui.scene.resetPark(); show('hud'); syncHUD(); save(); focusGame();
  if (!continuing) dialogue(DIALOGUES.intro, () => { save(); toast('Encontre Tico. Jenny está com você!'); });
  else toast(state.mission === 'completed' ? 'Bem-vinda de volta ao jardim!' : 'Sua aventura continua de onde parou.');
}

function makeGround(scene) {
  const tex = scene.textures.createCanvas('ground', 2000, 1550); const c = tex.context;
  let seed = 375;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const shape = (offset = 0) => traceIsland(c, offset);
  c.fillStyle = '#1b4b43'; c.fillRect(0,0,2000,1550);
  for(let i=0;i<180;i++){c.fillStyle='#37726435';c.fillRect(rand()*2000,rand()*1550,25+rand()*50,2);}
  shape(60); c.fillStyle = '#244e3c'; c.fill(); shape(37); c.fillStyle = '#52784a'; c.fill(); shape(18); c.fillStyle='#769d5e';c.fill();
  shape(); c.fillStyle = '#a6bf78'; c.fill(); c.save(); shape(); c.clip();
  const gradient = c.createLinearGradient(200,350,1600,1400); gradient.addColorStop(0,'#acc881');gradient.addColorStop(.5,'#b6cb88');gradient.addColorStop(1,'#8dae6c');c.fillStyle=gradient;c.fillRect(0,0,2000,1550);
  for (let i=0;i<10000;i++) { c.fillStyle=['#c9d89555','#769d6345','#dbe4ab66','#618f4f23'][i%4];c.fillRect(Math.floor(rand()*2000/3)*3,Math.floor(rand()*1550/3)*3,3+Math.floor(rand()*3)*3,3); }
  // Broad, gently curving paths make each fruit reachable without a maze.
  const path = () => {c.beginPath();c.moveTo(1005,1390);c.bezierCurveTo(1080,1200,1120,1060,1100,905);c.bezierCurveTo(1100,740,1350,800,1450,650);c.bezierCurveTo(1510,500,1250,390,1020,480);c.bezierCurveTo(760,450,660,660,810,820);c.bezierCurveTo(890,950,1080,980,1230,1090);c.bezierCurveTo(1390,1170,1500,1110,1550,1010);};
  c.lineCap='round';c.lineJoin='round';path();c.strokeStyle='#8fa865';c.lineWidth=100;c.stroke();path();c.strokeStyle='#dbcf99';c.lineWidth=83;c.stroke();path();c.strokeStyle='#e4d8a7';c.lineWidth=64;c.stroke();
  for(let i=0;i<1600;i++){const x=rand()*2000,y=rand()*1550;c.fillStyle='#fcf0c322';c.fillRect(x,y,3,2);}
  // Turquoise pond and a little stream, with stepped shorelines.
  c.beginPath();c.ellipse(480,930,258,178,-.18,0,Math.PI*2);c.fillStyle='#d6d29b';c.fill();c.beginPath();c.ellipse(476,927,243,161,-.18,0,Math.PI*2);c.fillStyle='#5a9a83';c.fill();c.beginPath();c.ellipse(476,925,226,146,-.18,0,Math.PI*2);c.fillStyle='#65b4a2';c.fill();c.beginPath();c.ellipse(450,925,194,119,-.18,0,Math.PI*2);c.fillStyle='#78c8b7';c.fill();
  for(let i=0;i<85;i++){const x=270+rand()*390,y=805+rand()*235;if(((x-460)/196)**2+((y-925)/117)**2<1){c.fillStyle=i%3?'#bde6c348':'#d7edc48a';c.fillRect(x,y,10+rand()*27,2);}}
  for(let i=0;i<8;i++){const x=342+rand()*230,y=855+rand()*135;c.fillStyle='#458b6d';c.beginPath();c.ellipse(x,y,13,6,-.2,0,Math.PI*2);c.fill();c.fillStyle='#d4ac91';c.fillRect(x-2,y-5,5,5);}
  // Tracks connect the friendly dinosaur to the collectible trail.
  for(const [x,y,a] of [[1000,707,-.5],[944,651,-.5],[883,611,-.5],[1174,810,.1],[1287,787,-.2],[1372,739,-.5],[1131,1013,.8],[1172,1063,.8]]){
    c.save();c.translate(x,y);c.rotate(a);c.fillStyle='#a69f6a90';for(const side of [-1,1]){c.beginPath();c.ellipse(side*9,side*9,4,7,0,0,Math.PI*2);c.fill();c.fillRect(side*9-5,side*9-8,3,3);c.fillRect(side*9+2,side*9-8,3,3);}c.restore();
  }
  c.restore();tex.refresh();scene.add.image(0,0,'ground').setOrigin(0).setDepth(-100);
}

class ParkScene extends Phaser.Scene {
  constructor() { super('Park'); this.trail = []; this.obstacles = []; this.occluders = []; this.fruits = []; this.moving = false; this.nextSave = 0; this.nextHint = 0; }
  create() {
    ui.scene = this; buildTextures(this); makeGround(this);
    this.cameras.main.setBounds(-1000,-1000,4000,3550); this.cameras.main.setBackgroundColor('#1b4b43');
    const addProp = (key,x,y,scale=1,solid=false) => { const s=this.add.image(x,y,key).setOrigin(.5,1).setScale(scale).setDepth(y); if(solid)this.obstacles.push({x,y:y-12,rx:key==='rock'?34*scale:20*scale,ry:18*scale});if(['tree','palm','gate'].includes(key)){const source=this.textures.get(key).getSourceImage();this.occluders.push({sprite:s,x,y,width:source.width*scale,height:source.height*scale});}return s; };
    // A frame of tall trees opens onto a sunlit clearing.
    const trees = [[230,580,1.25],[320,465,1.2],[425,390,1.15],[535,347,1.2],[670,330,1.35],[810,311,1.3],[960,312,1.15],[1125,305,1.35],[1270,325,1.2],[1410,356,1.2],[1560,425,1.3],[1670,515,1.2],[1760,640,1.3],[1790,820,1.35],[1750,990,1.2],[1650,1170,1.2],[1490,1320,1.25],[1320,1380,1.3],[1150,1410,1.1],[835,1400,1.35],[670,1360,1.2],[505,1300,1.3],[360,1220,1.2],[250,1110,1.35],[220,775,1.2],[1795,740,.95],[1610,430,.9],[370,422,.9],[1540,1230,.9]];
    trees.forEach(([x,y,s],i)=>addProp(i%5===0?'palm':'tree',x,y,s,true));
    [[714,554,.9],[1280,522,.85],[1590,935,1.1],[904,1175,.95],[681,1215,.8],[726,763,.85],[1590,692,.9]].forEach(([x,y,s],i)=>addProp(i%3===0?'palm':'tree',x,y,s,true));
    [[750,498],[875,490],[1360,469],[1530,595],[1535,710],[1350,1155],[1145,1190],[734,1108],[658,755],[620,695],[410,750],[331,1130],[1620,1025],[605,1265]].forEach(([x,y],i)=>addProp(i%4===0?'rock':'bush',x,y,.8+(i%3)*.13,true));
    let seed=102;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<130;i++){const x=340+rand()*1300,y=440+rand()*820; if(!this.inPond(x,y,30)&&Math.hypot(x-1090,y-760)>100) addProp(i%9===0?'mushroom':'flower',x,y,.6+rand()*.65);}
    // The entrance remains a landmark while the little garden is explored.
    addProp('gate',1005,1360,1.12); this.add.text(1003,1197,'AYSHA PARK',{fontFamily:'Georgia',fontSize:'15px',fontStyle:'bold',color:'#426046'}).setOrigin(.5).setDepth(1361);
    addProp('sign',880,938,.75,true);this.add.text(892,886,'JARDIM',{fontFamily:'Georgia',fontSize:'9px',color:'#536e49'}).setOrigin(.5).setDepth(939);
    [[778,650],[1335,602],[1397,1050],[1080,1275]].forEach(([x,y])=>{addProp('lantern',x,y,.8);const glow=this.add.circle(x,y-42,30,0xffe3a2,.08).setDepth(y-1);this.tweens.add({targets:glow,alpha:.025,duration:2200,yoyo:true,repeat:-1});});
    // Wooden picnic blanket and basket next to Tico.
    const decor=this.add.graphics().setDepth(755);decor.fillStyle(0xc69264,1);decor.fillRoundedRect(1009,730,43,26,5);decor.lineStyle(3,0x846846);decor.strokeEllipse(1030,728,26,17);decor.lineStyle(1,0xf1c58b,.6);for(let y=737;y<755;y+=6)decor.lineBetween(1013,y,1048,y);
    this.basketFruit = this.add.container(1030,732).setDepth(760);['fruit-pink','fruit-gold','fruit-purple'].forEach((key,i)=>this.basketFruit.add(this.add.image((i-1)*12,-i%2*7,key).setScale(.55)));
    this.tico = addProp('tico',1100,765,1);this.tweens.add({targets:this.tico,scaleY:1.022,duration:1700,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    this.npcName=this.add.text(1100,627,'TICO',{fontFamily:'Arial',fontSize:'11px',fontStyle:'bold',color:'#fff4cf',stroke:'#466b43',strokeThickness:3,letterSpacing:2}).setOrigin(.5).setDepth(2000);
    this.npcMarker=this.add.text(1100,606,'!',{fontFamily:'Georgia',fontSize:'21px',fontStyle:'bold',color:'#fceab0',backgroundColor:'#3f6b4b',padding:{left:9,right:9,top:1,bottom:3}}).setOrigin(.5).setDepth(1999);
    this.tweens.add({targets:this.npcMarker,y:599,duration:1000,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
    this.fruits=FRUITS.map(data=>{ const halo=this.add.ellipse(data.x,data.y,68,30,0xf8e5a2,.28).setDepth(data.y-3);const sprite=this.add.image(data.x,data.y-18,data.texture).setScale(1.12).setDepth(data.y);const sparkle=this.add.text(data.x+21,data.y-38,'✦',{fontSize:'17px',color:'#ffedaa'}).setOrigin(.5).setDepth(data.y+1);this.tweens.add({targets:sprite,y:data.y-24,duration:1400+data.x%400,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});this.tweens.add({targets:[halo,sparkle],alpha:.38,duration:1100,yoyo:true,repeat:-1});return {...data,sprite,halo,sparkle}; });
    this.playerShadow=this.add.ellipse(1030,925,30,12,0x244e3b,.27).setDepth(924);
    this.player=this.add.sprite(1030,925,'aysha').setOrigin(.5,1).setScale(.9).setDepth(925);
    this.catShadow=this.add.ellipse(980,955,24,9,0x244e3b,.2).setDepth(954);
    this.cat=this.add.sprite(980,955,'jenny').setOrigin(.5,1).setScale(.9).setDepth(955);
    this.playerName=this.add.text(1030,844,'AYSHA',{fontSize:'9px',fontFamily:'Arial',color:'#fff4d8',stroke:'#517346',strokeThickness:3}).setOrigin(.5).setDepth(2000).setVisible(false);
    this.catName=this.add.text(980,904,'JENNY',{fontSize:'8px',fontFamily:'Arial',color:'#fff4d8',stroke:'#517346',strokeThickness:3}).setOrigin(.5).setDepth(2000).setVisible(false);
    this.keys=this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false);
    this.input.keyboard.enabled = false;
    // Warm sunlight and lightweight fireflies; all effects are local and original.
    this.motes=[];for(let i=0;i<32;i++){const x=350+rand()*1300,y=400+rand()*850;const m=this.add.circle(x,y,1.5+rand()*1.8,0xfff1b0,.55).setDepth(2100);this.tweens.add({targets:m,x:x+40,y:y-35,alpha:.1,duration:2400+rand()*4000,delay:rand()*2000,yoyo:true,repeat:-1});this.motes.push(m);}
    const rays=this.add.graphics().setDepth(1900).setAlpha(.045);rays.fillStyle(0xfff7bc);rays.fillTriangle(1300,130,690,1450,960,1450);rays.fillTriangle(1440,130,1150,1450,1280,1450);
    this.scale.on('resize',this.resizeCamera,this);this.resizeCamera();this.cameras.main.centerOn(1110,800);this.cameras.main.setZoom(this.baseZoom*.92);this.basketFruit.setVisible(false);
    show('loading',false);if(saved)show('continue-button');
    this.nextHint=Date.now()+22000;
    // Read-only diagnostics support input-driven QA without altering gameplay.
    window.ayshaPrototype={snapshot:()=>({mode:ui.mode,mission:state.mission,collected:[...state.collected],player:{x:this.player.x,y:this.player.y},jenny:{x:this.cat.x,y:this.cat.y},target:this.nearest?.id||this.nearest?.type||null,obstacles:this.obstacles.length})};
  }
  resizeCamera() { this.baseZoom=cameraZoom(this.scale.width,this.scale.height,touchDevice);this.cameras.main.setZoom(ui.mode==='menu'?this.baseZoom*.92:this.baseZoom);this.cameras.main.setFollowOffset(0,0);if(ui.started)this.cameras.main.centerOn(this.player.x,this.player.y); }
  resetPark() {
    if(!this.walkable(state.x,state.y)){state.x=1030;state.y=925;}
    this.player.setPosition(state.x,state.y);this.cat.setPosition(state.x,state.y);this.trail=[];this.lastTrail={x:state.x,y:state.y};this.nearest=null;
    this.fruits.forEach(f=>[f.sprite,f.halo,f.sparkle].forEach(s=>s.setVisible(!state.collected.includes(f.id))));
    this.basketFruit.setVisible(state.mission==='completed');this.npcMarker.setText(state.mission==='completed'?'♥':'!');
    this.cameras.main.startFollow(this.player,true,.1,.1);this.resizeCamera();this.playerName.setVisible(true);this.catName.setVisible(true);this.nextSave=0;this.nextHint=Date.now()+18000;this.updateActorVisuals();this.updateGuide();
  }
  inPond(x,y,pad=0) {return ((x-476)/(242+pad))**2+((y-927)/(162+pad))**2<1;}
  walkable(x,y) {
    if(x<285||x>1700||y<410||y>1335)return false;
    if(!isOnIsland(x,y))return false;
    if(this.inPond(x,y,10))return false;
    if(this.obstacles.some(o=>((x-o.x)/(o.rx+10))**2+((y-o.y)/(o.ry+9))**2<1))return false;
    if(((x-1100)/72)**2+((y-747)/39)**2<1)return false;
    return true;
  }
  moveActor(actor,dx,dy) {
    const record = () => { if(actor===this.player)this.trail.push({x:actor.x,y:actor.y}); };
    if(Math.abs(dx)>.001&&this.walkable(actor.x+dx,actor.y)){actor.x+=dx;record();}
    if(Math.abs(dy)>.001&&this.walkable(actor.x,actor.y+dy)){actor.y+=dy;record();}
  }
  updateActorVisuals() {
    this.playerName.setPosition(this.player.x,this.player.y-78);this.catName.setPosition(this.cat.x,this.cat.y-46);
    this.player.setDepth(this.player.y);this.cat.setDepth(this.cat.y);
    this.playerShadow.setPosition(this.player.x,this.player.y-3).setDepth(this.player.y-1);
    this.catShadow.setPosition(this.cat.x,this.cat.y-2).setDepth(this.cat.y-1);
    for(const o of this.occluders){
      const covers = actor => actor.y<o.y-8&&actor.y>o.y-o.height+15&&Math.abs(actor.x-o.x)<o.width*.44;
      const target=(covers(this.player)||covers(this.cat)) ? .38 : 1;
      o.sprite.setAlpha(o.sprite.alpha+(target-o.sprite.alpha)*.22);
    }
  }
  objectiveTarget() {
    if(state.mission==='completed')return null;
    if(state.mission==='active'&&state.collected.length<3){
      return this.fruits.filter(f=>!state.collected.includes(f.id)).sort((a,b)=>Math.hypot(a.x-this.player.x,a.y-this.player.y)-Math.hypot(b.x-this.player.x,b.y-this.player.y))[0];
    }
    return {x:1100,y:770,type:'tico'};
  }
  updateGuide() {
    const target=this.objectiveTarget();show('objective-guide',ui.mode==='playing'&&!!target);
    if(!target)return;
    const angle=Math.atan2(target.y-this.player.y,target.x-this.player.x)*180/Math.PI+90;
    $('guide-arrow').style.transform=`rotate(${angle}deg)`;
    $('guide-label').textContent=target.type==='tico'?(state.collected.length===3?'Volte ao Tico':'Encontre Tico'):'Próxima fruta';
  }
  requestHint() {
    ui.lastActivity=Date.now();this.nextHint=Date.now()+30000;
    if(state.mission==='completed'){this.tip(DIALOGUES.jennyHints[4]);return;}
    const target=this.objectiveTarget();if(!target)return;
    const dx=target.x-this.player.x,dy=target.y-this.player.y;
    if(Math.hypot(dx,dy)<120){this.tip(target.type==='tico'?'O Tico está bem aqui! Use E ou toque no botão para conversar.':'A fruta está bem pertinho! Aproxime-se do brilho para coletar.');return;}
    const direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'à esquerda':'à direita'):(dy<0?'mais acima':'mais abaixo');
    this.tip(target.type==='tico'?`O Tico está ${direction}. Siga a setinha, eu vou com você!`:`Vamos olhar ${direction}. Tem uma fruta brilhando por ali!`);
  }
  interact() {
    if(ui.mode!=='playing'||!this.nearest)return;ui.lastActivity=Date.now();show('jenny-tip',false);
    if(this.nearest.type==='tico') {
      playTone('talk');
      if(state.mission==='not_started')dialogue(DIALOGUES.ticoStart,()=>{state.mission='active';syncHUD();save();toast('Nova missão · Encontre as três frutas brilhantes');});
      else if(state.mission==='completed')dialogue([{speaker:'Tico',text:'Meu lanche favorito? Aquele que vem com uma nova amizade. O jardim é todo seu, Aysha!'}]);
      else if(state.collected.length===3)dialogue(DIALOGUES.ticoComplete,()=>{state.mission='completed';syncHUD();this.basketFruit.setVisible(true);this.npcMarker.setText('♥');save();playTone('complete');this.celebrate();setMode('complete');show('complete-modal');$('keep-exploring').focus({preventScroll:true});});
      else dialogue(DIALOGUES.ticoWaiting);
    } else {
      const f=this.nearest;if(state.collected.includes(f.id))return;
      state.collected.push(f.id);[f.sprite,f.halo,f.sparkle].forEach(s=>s.setVisible(false));this.nearest=null;show('interact-button',false);this.collectBurst(f.x,f.y);playTone();syncHUD();save();toast(`${f.name} encontrada! · ${state.collected.length} de 3`);if(state.collected.length===3)ui.fruitHintTimer=setTimeout(()=>{if(state.mission==='active'&&state.collected.length===3)this.tip('Três frutas! Acho que ouvi a barriga do Tico comemorando. Vamos voltar?');},3300);
    }
  }
  collectBurst(x,y) {for(let i=0;i<14;i++){const a=(i/14)*Math.PI*2;const p=this.add.rectangle(x,y-15,4,4,[0xffe7a0,0xf7f2cf,0xe7bc91][i%3]).setDepth(2200);this.tweens.add({targets:p,x:x+Math.cos(a)*50,y:y-15+Math.sin(a)*40,alpha:0,angle:90,duration:650,onComplete:()=>p.destroy()});}}
  celebrate(){for(let i=0;i<7;i++)this.time.delayedCall(i*140,()=>this.collectBurst(1030+Math.random()*150,680+Math.random()*70));}
  tip(text){if(ui.mode!=='playing')return;$('jenny-tip').querySelector('p').textContent=text;show('jenny-tip');clearTimeout(ui.tipTimer);ui.tipTimer=setTimeout(()=>show('jenny-tip',false),6500);}
  update(time,delta) {
    if(!this.player)return;
    if(ui.mode!=='playing'){show('interact-button',false);return;}
    const dt=Math.min(delta,40)/1000;let dx=ui.joystick.x,dy=ui.joystick.y;
    if(this.keys.W.isDown||this.keys.UP.isDown)dy-=1;if(this.keys.S.isDown||this.keys.DOWN.isDown)dy+=1;if(this.keys.A.isDown||this.keys.LEFT.isDown)dx-=1;if(this.keys.D.isDown||this.keys.RIGHT.isDown)dx+=1;
    const len=Math.hypot(dx,dy);this.moving=len>.08;
    if(this.moving){if(len>1){dx/=len;dy/=len;}const ox=this.player.x,oy=this.player.y;this.moveActor(this.player,dx*204*dt,dy*204*dt);if(Math.abs(dx)>.1)this.player.setFlipX(dx<0);this.player.setAngle(Math.sin(time*.016)*2);this.player.scaleY=.9+Math.sin(time*.022)*.018;if(Math.hypot(this.player.x-ox,this.player.y-oy)>.01)ui.lastActivity=Date.now();}
    else {this.player.setAngle(0);this.player.scaleY=.9+Math.sin(time*.002)*.006;}
    let trailDistance=0,previous=this.cat;
    for(const point of this.trail){trailDistance+=Math.hypot(point.x-previous.x,point.y-previous.y);previous=point;}
    let catBudget=Math.min(230*dt,Math.max(0,trailDistance-58)),catMoved=false;
    while(this.trail.length&&catBudget>.001){
      const dest=this.trail[0],cx=dest.x-this.cat.x,cy=dest.y-this.cat.y,dist=Math.hypot(cx,cy);
      if(dist<.01){this.trail.shift();continue;}
      const d=Math.min(dist,catBudget),ox=this.cat.x,oy=this.cat.y;
      this.moveActor(this.cat,cx/dist*d,cy/dist*d);this.cat.setFlipX(cx<0);
      const moved=Math.hypot(this.cat.x-ox,this.cat.y-oy);catBudget-=moved;catMoved ||= moved>.01;
      if(Math.hypot(dest.x-this.cat.x,dest.y-this.cat.y)<.01)this.trail.shift();else if(moved<.001||moved<d-.01)break;
    }
    this.cat.setAngle(catMoved?Math.sin(time*.021)*2:0);this.updateActorVisuals();this.updateGuide();
    this.nearest=null;let distance=Infinity;const td=Math.hypot(this.player.x-1100,this.player.y-770);
    if(td<145){this.nearest={type:'tico'};distance=td;}
    if(state.mission==='active')this.fruits.filter(f=>!state.collected.includes(f.id)).forEach(f=>{const d=Math.hypot(this.player.x-f.x,this.player.y-f.y);if(d<80&&d<distance){this.nearest=f;distance=d;}});
    if(this.nearest){$('interact-button').querySelector('span').textContent=this.nearest.type==='tico'?(state.collected.length===3&&state.mission==='active'?'Entregar as frutas':'Conversar com Tico'):'Coletar fruta';show('interact-button');}else show('interact-button',false);
    if(time>this.nextSave){save();this.nextSave=time+2500;}
    if(Date.now()>this.nextHint&&Date.now()-ui.lastActivity>18000){this.requestHint();this.nextHint=Date.now()+30000;}
  }
}

const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',backgroundColor:'#1b4b43',pixelArt:true,antialias:false,roundPixels:true,scale:{mode:Phaser.Scale.RESIZE,width:$('game').clientWidth,height:$('game').clientHeight},scene:[ParkScene],input:{activePointers:3},render:{powerPreference:'low-power'}});
new ResizeObserver(()=>{game.scale.resize($('game').clientWidth,$('game').clientHeight);}).observe($('game'));
$('start-button').addEventListener('click',()=>{if(ui.scene?.player)start();});
$('continue-button').addEventListener('click',()=>start(true));
$('dialogue-next').addEventListener('click',nextDialogue);
$('dialogue-text').addEventListener('click',nextDialogue);
$('interact-button').addEventListener('click',()=>ui.scene?.interact());
$('pause-button').addEventListener('click',()=>setPause(true));
$('resume-button').addEventListener('click',()=>setPause(false));
$('restart-button').addEventListener('click',()=>start());
$('play-again').addEventListener('click',()=>start());
$('keep-exploring').addEventListener('click',()=>{show('complete-modal',false);setMode('playing');focusGame();ui.scene.nextHint=Date.now()+30000;});
$('objective-guide').addEventListener('click',()=>{if(ui.mode==='playing')ui.scene.requestHint();});
$('brand-home').addEventListener('click',e=>{e.preventDefault();setPause(true);});
$('sound-button').addEventListener('click',()=>{ui.sound=!ui.sound;updateSound();if(ui.sound)playTone('talk');});
function closeHelp(){show('help-modal',false);setMode(ui.beforeHelp||'menu');if(ui.mode==='dialogue')$('dialogue-next').focus({preventScroll:true});else if(ui.mode==='paused')$('resume-button').focus({preventScroll:true});else if(ui.mode==='complete')$('keep-exploring').focus({preventScroll:true});else if(ui.started)focusGame();else $('start-button').focus({preventScroll:true});}
$('help-button').addEventListener('click',()=>{if(ui.mode==='help'){closeHelp();return;}ui.beforeHelp=ui.mode;setMode('help');show('help-modal');show('jenny-tip',false);$('close-help').focus({preventScroll:true});});
$('close-help').addEventListener('click',closeHelp);
document.addEventListener('keydown',event=>{
  const code=event.code||event.key;
  const advance=ui.mode==='dialogue'&&['Space','KeyE','Enter',' ','e'].includes(code);
  const interact=ui.mode==='playing'&&['KeyE','e'].includes(code);
  const escape=code==='Escape';
  if(advance||interact||escape){
    event.preventDefault();event.stopPropagation();if(event.repeat)return;
    if(advance)nextDialogue();else if(interact)ui.scene?.interact();else if(ui.mode==='help')closeHelp();else setPause(ui.mode!=='paused');
    return;
  }
  const modal={dialogue:'dialogue',paused:'pause-modal',help:'help-modal',complete:'complete-modal'}[ui.mode];
  if(code==='Tab'&&modal){
    const buttons=[...$(modal).querySelectorAll('button:not([disabled])')];if(!buttons.length)return;
    const first=buttons[0],last=buttons[buttons.length-1],active=document.activeElement;
    if(!buttons.includes(active)||(event.shiftKey&&active===first)||(!event.shiftKey&&active===last)){event.preventDefault();(event.shiftKey?last:first).focus();}
  }
},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetMovement();if(['playing','dialogue'].includes(ui.mode))setPause(true);save();}});
window.addEventListener('blur',()=>{resetMovement();if(['playing','dialogue'].includes(ui.mode))setPause(true);});
window.addEventListener('resize',resetMovement);
window.addEventListener('pagehide',save);
if(touchDevice){document.body.classList.add('is-touch');const joy=$('joystick'),thumb=$('joystick-thumb');let pointer=null;
  ui.resetJoystick=()=>{const old=pointer;pointer=null;ui.joystick.x=ui.joystick.y=0;thumb.style.transform='';if(old!==null&&joy.hasPointerCapture(old))joy.releasePointerCapture(old);};
  const move=(e)=>{if(e.pointerId!==pointer||ui.mode!=='playing')return;const r=joy.getBoundingClientRect();const radius=r.width*.3;let x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;const d=Math.hypot(x,y);if(d>radius){x*=radius/d;y*=radius/d;}thumb.style.transform=`translate(${x}px,${y}px)`;ui.joystick.x=x/radius;ui.joystick.y=y/radius;e.preventDefault();};
  joy.addEventListener('pointerdown',e=>{if(pointer!==null||ui.mode!=='playing')return;pointer=e.pointerId;joy.setPointerCapture(pointer);move(e);});joy.addEventListener('pointermove',move);
  const release=e=>{if(e.pointerId===pointer)ui.resetJoystick();};joy.addEventListener('pointerup',release);joy.addEventListener('pointercancel',release);joy.addEventListener('lostpointercapture',release);
}
