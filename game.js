/* Bejeweled by HoangDuy - HTML5 port for TINH MI LON */
(function(){
'use strict';
const N=8,TYPES=7,START_MOVES=30,CLEAR_PER_LEVEL=18,MAX_LEVELS=30;
const gemNames=['ruby','amber','citrine','emerald','sapphire','amethyst','diamond'];
const canvas=document.getElementById('bejeweledCanvas'); if(!canvas)return;
const GAME_STORAGE=(()=>{
  const memory=new Map();
  try{
    const s=window.localStorage;
    const probe='__tinh_mi_lon_game_storage_probe__';
    s.setItem(probe,'1');
    s.removeItem(probe);
    return s;
  }catch(_){
    return {
      getItem:k=>memory.has(k)?memory.get(k):null,
      setItem:(k,v)=>memory.set(k,String(v)),
      removeItem:k=>memory.delete(k),
      clear:()=>memory.clear()
    };
  }
})();
const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true,powerPreference:'high-performance'});
const modal=document.getElementById('bejeweledModal');
const bg=new Image(); bg.src='game/images/background_bejeweled_v135.png';
const gemSheet=new Image();
gemSheet.decoding='async';
gemSheet.src='game/images/gems_spritesheet.png';
gemSheet.addEventListener('load',()=>{try{if(typeof draw==='function')draw()}catch(_){} });
const soundNames=['select','swap','match','combo','special','error'];
// STEP 21: Dynamic Sound / Audio Feel. Use small pools so fast cascades do not
// cut off the previous sound; intensity controls volume + pitch + overlap.
const sounds=Object.fromEntries(soundNames.map(n=>[n,new Audio('game/images/'+n+'.wav')]));
Object.values(sounds).forEach(a=>{a.preload='auto';a.volume=.55;a.setAttribute('playsinline','')});
const soundPools=Object.fromEntries(soundNames.map(n=>[n,Array.from({length:3},()=>{const a=new Audio('game/images/'+n+'.wav');a.preload='auto';a.setAttribute('playsinline','');return a;})]));
const soundCursor=Object.fromEntries(soundNames.map(n=>[n,0]));
const soundLast=Object.fromEntries(soundNames.map(n=>[n,0]));
let audioUnlocked=false;
function unlockAudio(){
  if(audioUnlocked)return;
  audioUnlocked=true;
  // Unlock only one short audio element. The old version touched every pooled
  // audio object on the first tap, which could cause a visible hitch.
  const a=sounds.select;if(!a)return;
  try{const v=a.volume;a.volume=0;a.currentTime=0;const p=a.play();if(p&&p.catch)p.catch(()=>{});a.pause();a.currentTime=0;a.volume=v;}catch(_){}
}
let board=[],selected=null,state='menu',score=0,moves=START_MOVES,level=1,progress=0,combo=0,banner='',bannerT=0,hint=null,hintT=0,particles=[],last=0,swapInfo=null,phase=0,reverting=false,soundOn=(GAME_STORAGE.getItem('tinh-mi-lon-game-sound')!=='off'),hapticOn=(GAME_STORAGE.getItem('tinh-mi-lon-game-haptic')!=='off'),warningT=0;
let hintCooldown=0;
let boosterState='menu',boosterTarget=null;
let feedbackFlash=0,feedbackPulse=0;
// V131: localized match impact — only the gems/cells being cleared react.
let localImpacts=[];
// STEP 20: centralized Game Feel / Juice engine.
let juiceShake=0,juiceShakeT=0,juiceHitStop=0,juiceBoardPunch=0,juiceBoardPunchT=0,juiceLastEvent=0;
// STEP 25: Final Game Feel polish — pacing, effect budgets, idle breathing and input-safe feedback.
let polishBeat=0, polishIdle=0, polishLastState='menu', polishEffectBudget=0;
function juice(event='tap',intensity=1){
  const i=Math.max(.35,Math.min(2,Number(intensity)||1));
  const q=(qualityMode==='performance'?.62:qualityMode==='balanced'?.82:1)*(reducedMotion?.45:1);
  const now=performance.now();
  const cooldown=event==='tap'||event==='select'?45:18;
  if(now-juiceLastEvent<cooldown && (event==='tap'||event==='select'))return;
  // Final polish: repeated micro-events are softened so cascades feel rhythmic, not noisy.
  const cadence=event==='cascade' ? (1+Math.min(4,polishBeat)*.035) : 1;
  intensity=i/cadence;
  juiceLastEvent=now;
  // V129: normal matches should feel smooth; screen shake is reserved for impactful events.
  const shakeMap={tap:.12,select:.08,swap:.18,match:.08,combo:.34,special:.62,fusion:.92,cascade:.14,obstacle:.22,nearMiss:.14,undo:.22,booster:.28,win:1.05,error:.16};
  const hitMap={match:.010,combo:.020,special:.030,fusion:.042,win:.055,error:.010};
  const punchMap={swap:.018,match:.012,combo:.035,special:.070,fusion:.105,cascade:.014,win:.11,error:.015};
  juiceShake=Math.max(juiceShake,(shakeMap[event]||.4)*i*q);
  juiceShakeT=Math.max(juiceShakeT,event==='fusion'?.28:event==='win'?.34:.18);
  juiceBoardPunch=Math.max(juiceBoardPunch,(punchMap[event]||.02)*i*q);
  juiceBoardPunchT=Math.max(juiceBoardPunchT,event==='fusion'?.30:.16);
  juiceHitStop=Math.max(juiceHitStop,(hitMap[event]||0)*i*q);
  feedbackFlash=Math.max(feedbackFlash,event==='fusion'?.34:event==='win'?.30:event==='special'?.24:event==='combo'?.20:.08);
  feedbackPulse=Math.max(feedbackPulse,event==='fusion'?.62:event==='win'?.58:event==='special'?.46:event==='combo'?.38:.18);
}
function juiceShakeOffset(){
  if(juiceShakeT<=0||juiceShake<=0)return [0,0];
  const p=Math.max(0,juiceShakeT/.34),amp=juiceShake*cell.s*.035*p;
  return [(Math.sin(performance.now()*.095)*.72+Math.sin(performance.now()*.173)*.28)*amp,(Math.cos(performance.now()*.11)*.65+Math.sin(performance.now()*.157)*.35)*amp];
}
let running=false, rafId=0, pixelRatio=1, pointerStart=null, lastPointerUpAt=0;
let fps=60,fpsTimer=0,fpsFrames=0,toastScore=[],effects=[],cascadeDrops=[];
// STEP 22: Performance Engine — centralized runtime load control. V125.
let frameEMA=16.7, perfPressure=0, perfSampleT=0, perfLastDraw=0, perfSkip=0, perfPausedByVisibility=false;
function finalPolishTick(dt){
  polishBeat=Math.max(0,polishBeat-dt*2.4);
  polishIdle=state==='playing' && !selected && !hint && !effects.length ? polishIdle+dt : 0;
  polishEffectBudget=Math.max(0,polishEffectBudget-dt);
  if(polishLastState!==state){
    polishLastState=state;
    polishIdle=0;
    polishBeat=0;
  }
  // Keep transient arrays bounded during extreme cascades on low-memory devices.
  const cap=performanceProfile? (qualityMode==='performance'?90:qualityMode==='balanced'?150:220):150;
  if(particles.length>cap)particles.splice(0,particles.length-cap);
  if(effects.length>70)effects.splice(0,effects.length-70);
  if(toastScore.length>24)toastScore.splice(0,toastScore.length-24);
}
function finalPolishIntensity(base=1){
  const p=performanceProfile();
  const motion=reducedMotion?.55:1;
  const adaptive=p.adaptive||0;
  return Math.max(.35,Math.min(1.15,base*motion*(1-adaptive*.22)));
}
function performanceProfile(){
  const base=qualityMode==='performance'?{dpr:1,particles:55,effects:.55,motif:false,shadow:0,ai:24,gen:5,audio:.78}:
    qualityMode==='balanced'?{dpr:1.5,particles:110,effects:.82,motif:true,shadow:.55,ai:56,gen:8,audio:.90}:
    {dpr:2,particles:180,effects:1,motif:true,shadow:1,ai:112,gen:18,audio:1};
  const adaptive=adaptivePerformance ? (qualityMode==='high' ? Math.max(0,Math.min(1,(frameEMA-18)/16)) : Math.max(0,Math.min(1,(frameEMA-20)/10))) : 0;
  return {
    ...base,
    adaptive,
    effectiveDpr:Math.max(1,base.dpr-(base.dpr-1)*adaptive),
    particleCap:Math.max(28,Math.round(base.particles*(1-adaptive*.60))),
    effectScale:Math.max(.42,base.effects*(1-adaptive*.45)),
    aiLimit:Math.max(18,Math.round(base.ai*(1-adaptive*.55))),
    generatorCap:Math.max(5,Math.round(base.gen*(1-adaptive*.35))),
    motif:base.motif&&!adaptive,
    shadow:base.shadow*(1-adaptive*.8),
    audioMul:base.audio*(1-adaptive*.25)
  };
}
function updatePerformance(dt){
  const ms=Math.max(.1,Math.min(80,dt*1000));
  frameEMA=frameEMA*.90+ms*.10;
  perfSampleT+=dt;
  if(perfSampleT>=1){
    perfPressure=Math.max(0,Math.min(1,(frameEMA-16.7)/20));
    perfSampleT=0;
  }
}
function perfCanRender(){
  // Continuous rendering feels smoother than dropping alternate frames.
  // Adaptive quality lowers GPU work instead of making cascades look frozen.
  return running;
}

let specialActivations=0;
// ===== STEP 14: CAREFUL UNDO =====
// One undo token per level/session. The snapshot is created BEFORE a valid move,
// and only becomes undoable after that move fully settles. This prevents animation
// abuse and avoids an infinite free-move loop. Undo is never persisted as a token.
let undoSnapshot=null,undoAvailable=false,undoPending=false,undoUsed=false;
function clearUndo(resetToken=true){undoSnapshot=null;undoAvailable=false;undoPending=false;if(resetToken)undoUsed=false}
function makeUndoSnapshot(){
  return {
    score,moves,progress,objectiveProgress,combo,
    board:board.map(row=>row.map(c=>({kind:c.kind,special:c.special,obstacle:c.obstacle}))),
    objective:objective?{type:objective.type,target:objective.target,label:objective.label,kind:objective.kind,world:objective.world}:null,
    level,
    boardChecksum:boardChecksum(board.map(row=>row.map(c=>({kind:c.kind,special:c.special,obstacle:c.obstacle}))))
  };
}
function armUndo(){if(undoUsed||undoPending||state!=='playing'||dailyMode)return false;undoSnapshot=makeUndoSnapshot();undoPending=true;undoAvailable=false;return true}
function finalizeUndo(){if(undoPending){undoPending=false;undoAvailable=!!undoSnapshot&&!undoUsed}}
function useUndo(){
  if(dailyMode){banner='UNDO • DAILY KHÔNG HỖ TRỢ';bannerT=.75;return false;}
  if(state!=='playing'||levelCompletePending)return false;
  if(undoUsed){banner='UNDO • ĐÃ SỬ DỤNG';bannerT=.75;sound('error',1);haptic('error');return false;}
  if(!undoAvailable||!undoSnapshot){banner='UNDO • CHƯA CÓ NƯỚC ĐI';bannerT=.75;return false;}
  const d=undoSnapshot;
  if(d.level!==level || !Array.isArray(d.board) || d.board.length!==N || boardChecksum(d.board)!==d.boardChecksum){clearUndo(false);banner='UNDO • SNAPSHOT KHÔNG HỢP LỆ';bannerT=.85;return false;}
  score=Number(d.score)||0; moves=Math.max(0,Number(d.moves)||0); progress=Math.max(0,Math.min(1,Number(d.progress)||0));
  objectiveProgress=Math.max(0,Number(d.objectiveProgress)||0); combo=0;
  board=d.board.map(row=>row.map(c=>{const x=makeCell(Number(c.kind)||0);x.special=c.special||'';x.obstacle=c.obstacle||'';return x;}));
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){board[r][c].x=board[r][c].tx=cellX(c);board[r][c].y=board[r][c].ty=cellY(r);}
  selected=null;hint=null;hintT=0;swapInfo=null;phase=0;particles=[];effects=[];cascadeDrops=[];toastScore=[];
  chainActive=false;chainStep=0;chainMax=0;chainScore=0;chainCleared=0;chainSpecials=0;chainSwaps=0;chainQualified=false;resetNearMiss();nearMissStreak=0;
  if(d.objective) objective={...d.objective};
  undoSnapshot=null;undoAvailable=false;undoPending=false;undoUsed=true;
  banner='UNDO • NƯỚC ĐI ĐÃ HOÀN TÁC • 0/1';bannerT=1.05;sound('special',1);haptic('special', Math.min(1.65, 1 + combo*0.12));flashFeedback(.20);
  saveProgress('undo',true);startLoop();return true;
}
// ===== STEP 3: NEAR-MISS / ALMOST COMBO =====
let nearMiss=null,nearMissT=0,nearMissCount=0,nearMissStreak=0;
function resetNearMiss(){nearMiss=null;nearMissT=0}
function gemCanMove(r,c){const g=board[r][c];return !!g&&g.obstacle!=='stone'&&g.obstacle!=='lock'&&!g.special}
function findNearMissAfterInvalidSwap(swappedA,swappedB){
  const base=matches(),baseMatched=base.m,pairs=[],seen=new Set();
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    if(!gemCanMove(r,c))continue;
    for(const [dr,dc] of [[0,1],[1,0]]){
      const rr=r+dr,cc=c+dc;
      if(!inside(rr,cc)||!gemCanMove(rr,cc)||board[r][c].kind!==board[rr][cc].kind)continue;
      if(baseMatched[r][c]||baseMatched[rr][cc])continue;
      const key=r+','+c+'|'+rr+','+cc;
      if(seen.has(key))continue;seen.add(key);pairs.push([{r,c},{r:rr,c:cc}]);
    }
  }
  pairs.sort((p1,p2)=>{
    const touch=p=>p.some(q=>(q.r===swappedA.r&&q.c===swappedA.c)||(q.r===swappedB.r&&q.c===swappedB.c));
    return Number(touch(p2))-Number(touch(p1));
  });
  for(const pair of pairs){
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){
      if(!gemCanMove(r,c))continue;
      for(const [dr,dc] of [[0,1],[1,0]]){
        const rr=r+dr,cc=c+dc;
        if(!inside(rr,cc)||!gemCanMove(rr,cc))continue;
        const a={r,c},b={r:rr,c:cc};
        [board[a.r][a.c].kind,board[b.r][b.c].kind]=[board[b.r][b.c].kind,board[a.r][a.c].kind];
        const m=matches();
        const completes=m.m[pair[0].r][pair[0].c]&&m.m[pair[1].r][pair[1].c];
        [board[a.r][a.c].kind,board[b.r][b.c].kind]=[board[b.r][b.c].kind,board[a.r][a.c].kind];
        if(completes)return {pair,move:[a,b],kind:board[pair[0].r][pair[0].c].kind};
      }
    }
  }
  return null;
}
function triggerNearMiss(info){
  if(!info)return;
  nearMiss=info;nearMissT=1.55;nearMissCount++;nearMissStreak++;
  banner='ALMOST COMBO!';bannerT=.9;
  effects.push({type:'nearMiss',pair:info.pair,move:info.move,life:1.35,max:1.35});
  sound('match',2);haptic('match');flashFeedback(.10);juice('nearMiss',1);
}
// ===== STEP 2: TRUE COMBO CHAIN =====
let chainActive=false,chainStep=0,chainMax=0,chainScore=0,chainCleared=0,chainSpecials=0,chainSwaps=0,chainQualified=false,chainStartedAt=0;
const cell={x:0,y:0,s:0};
const DESIGN_W=620, DESIGN_H=960;
const MAX_PARTICLES=180;
const BOARD_PAD=9;
const LEVEL_BASE_TARGET=18;

// Settings state must be initialized before levelConfig()/difficultyProfile() are evaluated.
// This prevents a JavaScript temporal-dead-zone error during game boot.
const SETTINGS_KEY='tinh-mi-lon-game-settings-v97';
const QUALITY_MODES=['high','balanced','performance'];
let qualityMode='balanced';
let showFps=true;
let reducedMotion=false;
let adaptivePerformance=true;

// ===== STEP 6: THEMED LEVELS — 30 LEVELS / 6 WORLDS =====
// The theme engine is data-driven so extending to Level 31–100 does not require
// rewriting gameplay code. Each world changes atmosphere, pacing, objective and
// obstacle profile while preserving the core 8×8 mechanics.
const THEME_WORLDS=[
  {id:'crystal-garden',name:'CRYSTAL GARDEN',vi:'Khu Vườn Pha Lê',from:1,to:5,
   c1:'#122b56',c2:'#6b3f9d',accent:'#9ee7ff',accent2:'#ffe299',motif:'crystal',music:'song-city.mp3?v=76'},
  {id:'frozen-cave',name:'FROZEN CAVE',vi:'Hang Động Băng Giá',from:6,to:10,
   c1:'#092f4b',c2:'#477fa6',accent:'#bdeeff',accent2:'#e7fbff',motif:'snow',music:'song-10k-years.mp3?v=72'},
  {id:'magma-factory',name:'MAGMA FACTORY',vi:'Nhà Máy Dung Nham',from:11,to:15,
   c1:'#35100b',c2:'#a64216',accent:'#ffb45c',accent2:'#ffe08a',motif:'ember',music:'song-city.mp3?v=76'},
  {id:'ocean-temple',name:'OCEAN TEMPLE',vi:'Đền Thờ Đại Dương',from:16,to:20,
   c1:'#062b45',c2:'#087d91',accent:'#8cefff',accent2:'#9fffd0',motif:'bubble',music:'song-10k-years.mp3?v=72'},
  {id:'mystic-forest',name:'MYSTIC FOREST',vi:'Rừng Huyền Bí',from:21,to:25,
   c1:'#102d24',c2:'#416b3e',accent:'#b8ffc4',accent2:'#e6ff9b',motif:'leaf',music:'song-city.mp3?v=76'},
  {id:'crystal-castle',name:'CRYSTAL CASTLE',vi:'Lâu Đài Pha Lê',from:26,to:30,
   c1:'#24133f',c2:'#7b3fa1',accent:'#e0c6ff',accent2:'#fff0a6',motif:'castle',music:'song-10k-years.mp3?v=72'}
];
function themeForLevel(l){return THEME_WORLDS.find(t=>l>=t.from&&l<=t.to)||THEME_WORLDS[0]}
function levelConfig(l){
  const t=themeForLevel(l),i=l-t.from+1;
  const configs={
    'crystal-garden': [
      {objective:'score',target:1300,moves:32}, {objective:'collect',kind:4,target:14,moves:31},
      {objective:'special',target:3,moves:30}, {objective:'clear',target:8,moves:29,obstacle:'ice'},
      {objective:'score',target:2700,moves:28,obstacle:'ice'}],
    'frozen-cave': [
      {objective:'collect',kind:4,target:16,moves:31,obstacle:'ice'}, {objective:'clear',target:10,moves:30,obstacle:'ice'},
      {objective:'combo',target:3,moves:29,obstacle:'ice'}, {objective:'special',target:4,moves:28,obstacle:'lock'},
      {objective:'score',target:3600,moves:27,obstacle:'lock'}],
    'magma-factory': [
      {objective:'special',target:4,moves:30,obstacle:'stone'}, {objective:'score',target:3300,moves:29,obstacle:'stone'},
      {objective:'combo',target:4,moves:28,obstacle:'stone'}, {objective:'clear',target:14,moves:27,obstacle:'stone'},
      {objective:'special',target:6,moves:26,obstacle:'stone'}],
    'ocean-temple': [
      {objective:'collect',kind:1,target:18,moves:30,obstacle:'lock'}, {objective:'clear',target:14,moves:29,obstacle:'lock'},
      {objective:'score',target:4300,moves:28,obstacle:'lock'}, {objective:'combo',target:4,moves:27,obstacle:'lock'},
      {objective:'collect',kind:2,target:22,moves:26,obstacle:'lock'}],
    'mystic-forest': [
      {objective:'score',target:4600,moves:29,obstacle:'ice'}, {objective:'collect',kind:3,target:20,moves:28,obstacle:'ice'},
      {objective:'special',target:6,moves:27,obstacle:'lock'}, {objective:'combo',target:5,moves:26,obstacle:'lock'},
      {objective:'clear',target:17,moves:25,obstacle:'lock'}],
    'crystal-castle': [
      {objective:'special',target:7,moves:29,obstacle:'stone'}, {objective:'score',target:5600,moves:28,obstacle:'stone'},
      {objective:'combo',target:5,moves:27,obstacle:'stone'}, {objective:'clear',target:20,moves:26,obstacle:'stone'},
      {objective:'score',target:7000,moves:25,obstacle:'stone'}]
  };
  const raw=(configs[t.id]||configs['crystal-garden'])[Math.max(0,Math.min(4,i-1))];
  const d=difficultyProfile(l, raw);
  const target=Math.max(1,Math.round(raw.target*d.targetMul));
  const moves=Math.max(20,Math.min(35,raw.moves+d.moveAdjust));
  const q={...raw,target,moves,difficulty:d.level,difficultyBand:d.band,difficultyLabel:d.label,
    difficultyPressure:d.pressure,obstacleDensity:d.obstacleDensity,generatorAttempts:d.generatorAttempts};
  const collectGem=gemNames[Number.isInteger(q.kind)?q.kind:0]||gemNames[0];
  const labels={score:'SCORE '+q.target,collect:'COLLECT '+q.target+' '+collectGem.toUpperCase(),special:'CREATE '+q.target+' SPECIAL',clear:'CLEAR '+q.target+' BLOCKS',combo:'REACH COMBO x'+q.target};
  return {...q,theme:t.id,themeName:t.vi,world:t.name,label:labels[q.objective],index:i};
}
function difficultyProfile(l,raw){
  // Step 18: deterministic 1→10 scaling across all 30 levels.
  // Level is the primary driver; world/objective/obstacle add small pressure,
  // while the final result is clamped so no level becomes unfair or impossible.
  const safeLevel=Math.max(1,Math.min(MAX_LEVELS,Number(l)||1));
  const progression=1+(safeLevel-1)*9/(MAX_LEVELS-1);
  let level=progression;
  if(raw?.obstacle==='ice')level+=.20;
  if(raw?.obstacle==='lock')level+=.45;
  if(raw?.obstacle==='stone')level+=.75;
  if(raw?.objective==='combo')level+=.35;
  if(raw?.objective==='special')level+=.20;
  level=Math.max(1,Math.min(10,Math.round(level)));

  // Pressure controls the three things the generator/game can tune safely:
  // objective target, move budget and blocker density.
  const pressure=(level-1)/9;
  const targetMul=level<=2?.94:level<=4?.97:level<=6?1:level<=8?1.03:level<=9?1.06:1.08;
  const moveAdjust=level<=2?2:level<=3?1:level<=5?0:level<=6?-1:level<=7?-2:level<=8?-3:-4;
  const obstacleDensity=raw?.obstacle==='stone'?Math.min(1,.22+pressure*.18):
    raw?.obstacle==='lock'?Math.min(1,.18+pressure*.16):
    raw?.obstacle==='ice'?Math.min(1,.14+pressure*.13):0;
  const generatorAttempts=qualityMode==='high'?Math.max(7,Math.round(18-pressure*4)):
    qualityMode==='balanced'?Math.max(6,Math.round(11-pressure*3)):
    Math.max(5,Math.round(7-pressure*2));
  const band=level<=3?'EASY':level<=5?'NORMAL':level<=7?'HARD':level<=9?'EXPERT':'MASTER';
  const labels={EASY:'DỄ',NORMAL:'BÌNH THƯỜNG',HARD:'KHÓ',EXPERT:'CHUYÊN GIA',MASTER:'BẬC THẦY'};
  return {level,targetMul,moveAdjust,band,label:labels[band],pressure,obstacleDensity,generatorAttempts};
}
function levelTarget(){return LEVEL_BASE_TARGET+Math.min(12,(level-1)*2)}
function objectiveForLevel(l){
  const q=levelConfig(l);
  return {type:q.objective,target:q.target,label:q.label,kind:q.kind,world:q.world,theme:q.theme};
}
let objective=objectiveForLevel(1),objectiveProgress=0;
function refreshObjective(){objective=objectiveForLevel(level);objectiveProgress=0}
function objectiveDone(){
  if(objective.type==='score')return score>=objective.target;
  if(objective.type==='combo')return chainMax>=objective.target || objectiveProgress>=objective.target;
  return objectiveProgress>=objective.target;
}
function obstacleForLevel(l){return levelConfig(l).obstacle||''}
function obstacleCount(l){
  const q=levelConfig(l);
  if(!q.obstacle)return 0;
  const d=difficultyProfile(l,q);
  const base=q.obstacle==='stone'?4:q.obstacle==='lock'?3:2;
  const pressure=Math.max(0,Math.floor((d.level-2)*.65));
  const densityBonus=Math.round(d.obstacleDensity*10);
  const objectiveNeed=q.objective==='clear'?Number(q.target)||0:0;
  const planned=base+pressure+densityBonus;
  // CLEAR must always have enough blocks; other objectives receive controlled density.
  return Math.min(24,Math.max(planned,objectiveNeed));
}
function themePalette(){return themeForLevel(level)}
function themeMusicSource(){return themeForLevel(level).music}
function applyThemeMusic(){
  // Respect a user-imported track. Built-in tracks may follow the current world.
  try{
    const a=document.getElementById('bgMusic');
    const idx=themeForLevel(level).music.includes('10k-years')?1:0;
    const current=(typeof musicTrackIndex==='number')?musicTrackIndex:-1;
    const currentTrack=(typeof MUSIC_PLAYLIST!=='undefined'&&MUSIC_PLAYLIST[current])?MUSIC_PLAYLIST[current]:null;
    if(a&&typeof selectMusicTrack==='function'&&(!currentTrack||!currentTrack.user) && current!==idx) selectMusicTrack(idx);
  }catch(_){}
}
function setSound(v){soundOn=!!v;try{GAME_STORAGE.setItem('tinh-mi-lon-game-sound',soundOn?'on':'off')}catch(_){}}
function setHaptic(v){hapticOn=!!v;try{GAME_STORAGE.setItem('tinh-mi-lon-game-haptic',hapticOn?'on':'off')}catch(_){} }
const HAPTIC_CAPABLE=typeof navigator!=='undefined'&&typeof navigator.vibrate==='function';
const HAPTIC_NATIVE_CAPABLE=!!(typeof window!=='undefined' && (
  window.TinhMiLonHaptics ||
  window.Capacitor?.Plugins?.Haptics ||
  window.webkit?.messageHandlers?.tinhMiLonHaptic
));
let lastHapticAt=0;
let lastHapticKind='';
function hapticProfile(){
  // Step 19 final: keep haptics responsive while respecting motion/performance settings.
  const qualityGain=qualityMode==='performance'?.72:qualityMode==='balanced'?.90:1;
  const adaptiveGain=adaptivePerformance?Math.max(.62,1-Math.max(0,Math.min(1,perfPressure))*.30):1;
  const motionGain=reducedMotion?.72:1;
  return Math.max(.55,Math.min(1.05,qualityGain*adaptiveGain*motionGain));
}
function nativeHaptic(kind,intensity){
  try{
    const native=window.TinhMiLonHaptics;
    if(native){
      if(typeof native.trigger==='function') return Promise.resolve(native.trigger({kind,intensity}));
      if(typeof native.impact==='function') return Promise.resolve(native.impact({kind,intensity}));
    }
    const cap=window.Capacitor?.Plugins?.Haptics;
    if(cap){
      const strong=intensity>=1.35;
      const medium=intensity>=.95;
      const style=strong?'HEAVY':medium?'MEDIUM':'LIGHT';
      if(typeof cap.impact==='function') return Promise.resolve(cap.impact({style}));
      if(typeof cap.notification==='function' && (kind==='error'||kind==='win')){
        return Promise.resolve(cap.notification({type:kind==='error'?'ERROR':'SUCCESS'}));
      }
    }
    const bridge=window.webkit?.messageHandlers?.tinhMiLonHaptic;
    if(bridge?.postMessage){bridge.postMessage({kind,intensity});return Promise.resolve(true)}
  }catch(_){ }
  return Promise.resolve(false);
}
function haptic(kind='tap', intensity=1){
  if(!hapticOn)return;
  const now=performance.now();
  const baseCooldown=(kind==='tap'||kind==='select')?42:68;
  // Same-event debouncing prevents cascade spam, while different meaningful events can still fire.
  if(now-lastHapticAt<baseCooldown && kind===lastHapticKind)return;
  lastHapticAt=now;lastHapticKind=kind;
  let i=Math.max(.45,Math.min(1.65,Number(intensity)||1))*hapticProfile();
  const scale=n=>Math.max(5,Math.round(n*i));
  const patterns={
    tap:[scale(8)],
    select:[scale(6),scale(4),scale(6)],
    swap:[scale(7),scale(4),scale(9)],
    match:[scale(11),scale(5),scale(11)],
    combo:i>=1.30?[scale(22),scale(10),scale(22),scale(10),scale(32)]:i>=1.05?[scale(18),scale(8),scale(18),scale(8),scale(25)]:[scale(14),scale(7),scale(14)],
    special:[scale(18),scale(8),scale(28)],
    fusion:[scale(24),scale(10),scale(36),scale(10),scale(24)],
    level:[scale(30),scale(10),scale(30),scale(10),scale(48)],
    error:[scale(10),scale(28),scale(10)],
    win:[scale(32),scale(12),scale(32),scale(12),scale(58)],
    nearMiss:[scale(7),scale(5),scale(12)],
    obstacle:[scale(13),scale(5),scale(18)],
    undo:[scale(9),scale(5),scale(15)],
    booster:[scale(12),scale(6),scale(20)]
  };
  const pattern=patterns[kind]||patterns.tap;
  if(HAPTIC_NATIVE_CAPABLE)nativeHaptic(kind,i);
  else if(HAPTIC_CAPABLE){try{navigator.vibrate(pattern)}catch(_){}}
  const pulse=kind==='tap'||kind==='select'?0.16:kind==='combo'?Math.min(.48,.28+i*.08):kind==='error'?.30:kind==='win'?.58:.40;
  feedbackPulse=Math.max(feedbackPulse,pulse);
}
function hapticCapabilityLabel(){
  if(HAPTIC_NATIVE_CAPABLE)return 'NATIVE HAPTIC';
  if(HAPTIC_CAPABLE)return 'WEB VIBRATION';
  return 'VISUAL FALLBACK';
}
function testHaptic(){
  if(!hapticOn){setHaptic(true);}
  haptic('special',1.05);banner=HAPTIC_NATIVE_CAPABLE?'HAPTIC • NATIVE':'HAPTIC • '+(HAPTIC_CAPABLE?'WEB':'VISUAL');bannerT=.9;
}
function flashFeedback(amount=.18){feedbackFlash=Math.max(feedbackFlash,amount)}
function beginComboChain(fromSwap=false){
  if(chainActive)return;
  chainActive=true; chainStep=0; chainMax=0; chainScore=0; chainCleared=0; chainSpecials=0; chainSwaps=fromSwap?1:0; chainQualified=false; chainStartedAt=performance.now();
  combo=0;
}
function finishComboChain(){
  if(!chainActive)return;
  const max=chainMax, total=chainScore, elapsed=Math.max(0,(performance.now()-chainStartedAt)/1000);
  if(max>=2){
    effects.push({type:'chainComplete',x:cellX(3.5),y:cellY(3.5),life:.95,max:.95,combo:max,total});
    juice('combo',Math.min(1.7,0.9+max*.16));
    banner='CHAIN COMPLETE • x'+max; bannerT=1.05;
    sound(max>=4?'combo':'match',Math.min(8,max));
    if(max>=3)haptic('combo', Math.min(1.65, 0.85 + max*0.18));
  }
  chainActive=false; chainStep=0; chainMax=0; chainScore=0; chainCleared=0; chainSpecials=0; chainSwaps=0; chainQualified=false; chainStartedAt=0; combo=0;
  return {max,total,elapsed};
}
function comboMultiplier(step){return 1+Math.min(4,(Math.max(1,step)-1)*.5)}

// ===== STEP 6: PERSISTENT PLAYER PROGRESS =====
const SAVE_KEY='tinh-mi-lon-game-progress-v108';
const SAVE_LEGACY_KEY='tinh-mi-lon-game-progress-v95';
const SAVE_VERSION=4;
const SAVE_MIN_VERSION=1;
let lastSaveAt=0;
let saveFlashT=0;
let saveFlashText='';

// ===== STEP 7: SETTINGS + PERFORMANCE MODE =====

// ===== STEP 24: FIRST-RUN TUTORIAL =====
const TUTORIAL_KEY='tinh-mi-lon-tutorial-v124';
const TUTORIAL_VERSION=2;
const TUTORIAL_STEPS=[
  {title:'CHÀO MỪNG ĐẾN BEJEWELED',icon:'💎',body:'Ghép 3 viên ngọc cùng màu để ghi điểm và hoàn thành mục tiêu của từng Level.',hint:'Bắt đầu từ 3 viên cùng màu — sau đó khám phá các cơ chế nâng cao.',board:[4,4,4,1,2,3,5,6,0],highlight:[0,1,2]},
  {title:'1 • ĐỔI 2 VIÊN NGỌC',icon:'🔄',body:'Chạm/kéo một viên ngọc sang ô bên cạnh để đổi vị trí. Chỉ nước đi hợp lệ mới được tính Move.',hint:'Máy tính: kéo chuột. Điện thoại: chạm rồi vuốt.',board:[4,1,2,3,4,5,6,0,1],highlight:[1,2]},
  {title:'2 • TẠO MATCH',icon:'✨',body:'Tạo hàng hoặc cột có từ 3 viên cùng loại. Các viên được ghép sẽ biến mất và ngọc mới rơi xuống.',hint:'Cascade liên tiếp trong cùng một lượt sẽ tăng Combo Chain.',board:[4,4,4,1,2,3,5,6,0],highlight:[0,1,2]},
  {title:'3 • SPECIAL GEM',icon:'⚡',body:'Ghép 4 hoặc 5 viên để tạo Special Gem. Ghép hình L/T có thể tạo Bomb và các Special có thể Fusion với nhau.',hint:'4/5 viên hoặc L/T có thể tạo Special; Special + Special tạo Fusion.',board:[4,4,4,4,1,2,3,5,6],highlight:[0,1,2,3]},
  {title:'4 • COMBO & MỤC TIÊU',icon:'🔥',body:'Cascade liên tiếp làm Combo tăng từ x2 đến x5. Mỗi Level có mục tiêu, số Move và độ khó riêng.',hint:'Ưu tiên Objective của Level và tận dụng Combo để tăng điểm.',board:[4,4,4,1,2,3,5,6,0],highlight:[0,1,2,3,4,5]},
  {title:'5 • BOOSTER & TRỢ GIÚP',icon:'🛠️',body:'Hammer phá một ô, Shuffle sắp xếp lại bàn và +5 Moves tăng lượt chơi. Smart Hint/AI có thể gợi ý nước đi.',hint:'Booster mở từ nút BOOST; hãy dùng đúng thời điểm để tiết kiệm lượt.',board:[4,1,2,3,4,5,6,0,1],highlight:[6,7,8]}
];
let tutorialStep=0;
function tutorialSeen(){try{const d=JSON.parse(GAME_STORAGE.getItem(TUTORIAL_KEY)||'{}');return d.version===TUTORIAL_VERSION&&d.seen===true}catch(_){return false}}
function markTutorialSeen(){try{GAME_STORAGE.setItem(TUTORIAL_KEY,JSON.stringify({version:TUTORIAL_VERSION,seen:true,seenAt:new Date().toISOString()}))}catch(_){} tutorialStep=0}
function resetTutorial(){try{GAME_STORAGE.removeItem(TUTORIAL_KEY)}catch(_){} tutorialStep=0}
function openTutorial(){tutorialStep=0;state='tutorial';startLoop()}
function tutorialNext(){if(tutorialStep<TUTORIAL_STEPS.length-1){tutorialStep++;haptic('tap');return}markTutorialSeen();startGame(1,true)}
function tutorialSkip(){markTutorialSeen();state='menu';haptic('tap');startLoop()}

// ===== STEP 8: LEVEL MAP + 3 STARS + UNLOCK =====
const MAP_KEY='tinh-mi-lon-level-map-v98';
let mapState={version:1,stars:{},unlocked:1};
let mapScroll=0;
let selectedMapLevel=1;
let levelCompletePending=false;
function loadMapState(){
  try{
    const d=JSON.parse(GAME_STORAGE.getItem(MAP_KEY)||'{}');
    if(d && d.version===1){
      mapState={version:1,stars:(d.stars&&typeof d.stars==='object')?d.stars:{},unlocked:Math.max(1,Math.min(MAX_LEVELS,Number(d.unlocked)||1))};
    }
  }catch(_){}
}
function saveMapState(){try{GAME_STORAGE.setItem(MAP_KEY,JSON.stringify(mapState))}catch(_){}}
function levelStars(l){return Math.max(0,Math.min(3,Number(mapState.stars[String(l)])||0))}
function isLevelUnlocked(l){return l>=1&&l<=mapState.unlocked}
function rateLevel(){
  const budget=Math.max(1,Number(levelConfig(level).moves)||START_MOVES);
  const ratio=moves/budget;
  if(ratio>=.50)return 3;
  if(ratio>=.20)return 2;
  return 1;
}
function completeLevel(){
  if(dailyMode){completeDaily();return;}
  const stars=rateLevel(),old=levelStars(level);
  if(stars>old)mapState.stars[String(level)]=stars;
  if(level<MAX_LEVELS)mapState.unlocked=Math.max(mapState.unlocked,level+1);
  // A completed level grants a small booster reward without forcing purchases.
  if(stars>=3)rewardBooster('hammer',1);
  if(stars>=2)rewardBooster('shuffle',1);
  rewardBooster('moves',1);
  saveMapState();
  addMissionProgress('levels',1);
  clearSavedGame();
  banner='LEVEL '+level+' COMPLETE!';bannerT=1.4;
  state='levelcomplete';
}
loadMapState();
function loadSettings(){
  try{
    const d=JSON.parse(GAME_STORAGE.getItem(SETTINGS_KEY)||'{}');
    if(QUALITY_MODES.includes(d.quality))qualityMode=d.quality;
    if(typeof d.showFps==='boolean')showFps=d.showFps;
    if(typeof d.reducedMotion==='boolean')reducedMotion=d.reducedMotion;
    if(typeof d.adaptivePerformance==='boolean')adaptivePerformance=d.adaptivePerformance;
  }catch(_){}
}
function saveSettings(){try{GAME_STORAGE.setItem(SETTINGS_KEY,JSON.stringify({version:2,quality:qualityMode,showFps,reducedMotion,adaptivePerformance}))}catch(_){} }
function qualityLabel(){return qualityMode==='high'?'HIGH':qualityMode==='balanced'?'BALANCED':'PERFORMANCE'}
function setQuality(mode){if(!QUALITY_MODES.includes(mode))return;qualityMode=mode;saveSettings();fit();banner='QUALITY: '+qualityLabel();bannerT=.7}
function setShowFps(v){showFps=!!v;saveSettings()}
function setReducedMotion(v){reducedMotion=!!v;saveSettings();juiceShake=0;juiceHitStop=0;juiceBoardPunch=0;feedbackFlash=0;feedbackPulse=0}
function setAdaptivePerformance(v){adaptivePerformance=!!v;saveSettings();perfPressure=0;frameEMA=16.7;fit()}
function resetGameSettings(){qualityMode='balanced';showFps=true;reducedMotion=false;adaptivePerformance=true;saveSettings();fit();banner='SETTINGS RESET';bannerT=.9}
function particleLimit(){return performanceProfile().particleCap}
function effectEnabled(){return performanceProfile().effectScale>.5}
function motionScale(){return performanceProfile().effectScale}

// ===== STEP 10: MISSION SYSTEM (POLISHED) =====
const MISSION_KEY='tinh-mi-lon-missions-v105';
const MISSION_VERSION=2;
const MISSION_DEFS=[
  {type:'score',target:5000,label:'Đạt 5.000 điểm',reward:'moves',icon:'🏆'},
  {type:'match',target:50,label:'Phá 50 viên ngọc',reward:'hammer',icon:'💎'},
  {type:'special',target:5,label:'Tạo 5 Special Gem',reward:'shuffle',icon:'✨'},
  {type:'blocks',target:15,label:'Phá 15 vật cản',reward:'moves',icon:'🧊'},
  {type:'combo',target:5,label:'Tạo 5 Combo từ x3',reward:'hammer',icon:'🔥'},
  {type:'booster',target:3,label:'Sử dụng 3 Booster',reward:'shuffle',icon:'🛠️'},
  {type:'levels',target:3,label:'Hoàn thành 3 Level',reward:'moves',icon:'🗺️'},
  {type:'score',target:12000,label:'Đạt 12.000 điểm',reward:'hammer',icon:'👑'}
];
const MISSION_DEFAULT={version:MISSION_VERSION,active:[],nextIndex:3};
let missionState={...MISSION_DEFAULT};
let missionFlash=0;

// ===== STEP 11: DAILY CHALLENGE =====
const DAILY_KEY='tinh-mi-lon-daily-v106';
const DAILY_VERSION=1;
const STREAK_KEY='tinh-mi-lon-daily-streak-v107';
const STREAK_VERSION=2;
const STREAK_MILESTONES=[3,7,14,30];
let dailyMode=false,dailyState={version:DAILY_VERSION,date:'',completed:false,bestScore:0,attempts:0};
let streakState={version:STREAK_VERSION,current:0,best:0,lastCompleted:'',claimedMilestones:[],lastMilestone:0};
let streakFlash=0,streakMilestone=0;
let dailyConfig=null;
let dailyResult='';
function dailyDate(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function dailySeed(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function dailyRand(seed){let x=seed>>>0;return function(){x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
function dailyBuild(){
  const date=dailyDate(),seed=dailySeed(date),r=dailyRand(seed),types=['score','collect','special','combo'];
  const type=types[seed%types.length],kind=(seed>>>5)%TYPES;
  const target=type==='score'?4200+(seed%1600):type==='collect'?18+(seed%9):type==='special'?4+(seed%3):3+(seed%3);
  const moves=25+(seed%5),obs=['','ice','lock','stone'][(seed>>>8)%4];
  const reward=['hammer','shuffle','moves'][(seed>>>12)%3];
  return {date,seed,type,kind,target,moves,obstacle:obs,reward,label:type==='score'?'SCORE '+target:type==='collect'?'COLLECT '+target+' '+gemNames[kind].toUpperCase():type==='special'?'CREATE '+target+' SPECIAL':'REACH COMBO x'+target,world:'DAILY CRYSTAL'};
}
function loadDaily(){try{const d=JSON.parse(GAME_STORAGE.getItem(DAILY_KEY)||'{}');if(d&&d.version===DAILY_VERSION&&d.date===dailyDate())dailyState={version:DAILY_VERSION,date:d.date,completed:!!d.completed,bestScore:Number(d.bestScore)||0,attempts:Number(d.attempts)||0};else {dailyState={version:DAILY_VERSION,date:dailyDate(),completed:false,bestScore:0,attempts:0};saveDaily()} }catch(_){dailyState={version:DAILY_VERSION,date:dailyDate(),completed:false,bestScore:0,attempts:0};saveDaily()} dailyConfig=dailyBuild()}
function saveDaily(){try{GAME_STORAGE.setItem(DAILY_KEY,JSON.stringify(dailyState))}catch(_){} }
function dateOffset(dateStr,days){const d=new Date(dateStr+'T00:00:00');if(Number.isNaN(d.getTime()))return '';d.setDate(d.getDate()+days);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function loadStreak(){
  try{
    const d=JSON.parse(GAME_STORAGE.getItem(STREAK_KEY)||'{}');
    const legacyVersion=Number(d.version)||1;
    const claimed=Array.isArray(d.claimedMilestones)?d.claimedMilestones.map(Number).filter(n=>STREAK_MILESTONES.includes(n)):[];
    streakState={version:STREAK_VERSION,current:Math.max(0,Number(d.current)||0),best:Math.max(0,Number(d.best)||0),lastCompleted:String(d.lastCompleted||''),claimedMilestones:[...new Set(claimed)],lastMilestone:Math.max(0,Number(d.lastMilestone)||0)};
    if(legacyVersion!==STREAK_VERSION)saveStreak();
  }catch(_){streakState={version:STREAK_VERSION,current:0,best:0,lastCompleted:'',claimedMilestones:[],lastMilestone:0};saveStreak();}
}
function saveStreak(){try{GAME_STORAGE.setItem(STREAK_KEY,JSON.stringify(streakState))}catch(_){} }
function streakDaysUntilNext(){const n=STREAK_MILESTONES.find(m=>m>streakState.current);return n?{target:n,remaining:Math.max(0,n-streakState.current)}:{target:0,remaining:0};}
function streakStatus(){
  const today=dailyDate();
  if(!streakState.lastCompleted)return 'BẮT ĐẦU STREAK HÔM NAY';
  if(streakState.lastCompleted===today)return 'ĐÃ GHI NHẬN HÔM NAY';
  const yesterday=dateOffset(today,-1);
  if(streakState.lastCompleted===yesterday)return 'STREAK ĐANG ĐƯỢC DUY TRÌ';
  return 'STREAK ĐÃ ĐỨT • HOÀN THÀNH HÔM NAY ĐỂ BẮT ĐẦU LẠI';
}
function updateDailyStreak(){
  const today=dailyDate();
  if(streakState.lastCompleted===today)return {current:streakState.current,milestone:0,milestones:[],already:true};
  const yesterday=streakState.lastCompleted?dateOffset(today,-1):'';
  streakState.current=streakState.lastCompleted===yesterday?Math.max(0,streakState.current)+1:1;
  streakState.best=Math.max(streakState.best,streakState.current);
  streakState.lastCompleted=today;
  const milestones=[];
  for(const m of STREAK_MILESTONES){if(streakState.current>=m&&!streakState.claimedMilestones.includes(m)){streakState.claimedMilestones.push(m);milestones.push(m);}}
  streakState.lastMilestone=milestones.length?Math.max(...milestones):streakState.lastMilestone;
  saveStreak();
  return {current:streakState.current,milestone:milestones.length?Math.max(...milestones):0,milestones,already:false};
}
function streakRewardFor(m){return m>=30?'hammer':m>=14?'shuffle':'moves'}
function streakRewardText(m){const k=streakRewardFor(m);return k==='hammer'?'🔨 +1 Hammer':k==='shuffle'?'🔀 +1 Shuffle':'➕ +1 +5 Moves'}
function applyStreakCompletion(){
  const r=updateDailyStreak();
  streakFlash=.9; streakMilestone=r.milestone;
  if(r.milestones.length){for(const m of r.milestones)rewardBooster(streakRewardFor(m),1);missionFlash=.5;sound('combo',Math.min(6,r.current));haptic('level');banner='🔥 '+r.current+' DAY STREAK!';bannerT=1.7;flashFeedback(.28);}
  else {sound('special',6);haptic('win',1.15);}
  return r;
}
loadStreak();
function fillDaily(){
  const cfg=dailyConfig||dailyBuild(),rand=dailyRand(cfg.seed^0x9e3779b9);board=[];
  for(let r=0;r<N;r++){board[r]=[];for(let c=0;c<N;c++){let k;let guard=0;do{k=Math.floor(rand()*TYPES);guard++}while(guard<40&&((c>=2&&board[r][c-1].kind===k&&board[r][c-2].kind===k)||(r>=2&&board[r-1][c].kind===k&&board[r-2][c].kind===k)));board[r][c]=makeCell(k)}}
  if(cfg.obstacle){const count=cfg.obstacle==='stone'?4:3;let placed=0,guard=0;while(placed<count&&guard++<400){const r=Math.floor(rand()*N),c=Math.floor(rand()*N);if(board[r][c].obstacle)continue;board[r][c].obstacle=cfg.obstacle;placed++}}
}
function dailyStart(){
  loadDaily(); if(dailyState.completed){banner='DAILY ALREADY COMPLETE';bannerT=.9;state='daily';startLoop();return;}
  dailyMode=true; level=1; score=0; moves=dailyConfig.moves; progress=0; combo=0; chainActive=false;chainStep=0;chainMax=0;chainScore=0;chainCleared=0;chainSpecials=0;chainSwaps=0;chainQualified=false;selected=null;hint=null;particles=[];effects=[];cascadeDrops=[];toastScore=[];resetNearMiss();nearMissStreak=0;objective={type:dailyConfig.type,target:dailyConfig.target,label:dailyConfig.label,kind:dailyConfig.kind,world:'DAILY'};objectiveProgress=0;fillDaily();while(!findMove())fillDaily();for(let r=0;r<N;r++)for(let c=0;c<N;c++){board[r][c].x=board[r][c].tx=cellX(c);board[r][c].y=board[r][c].ty=cellY(r)}dailyState.attempts++;saveDaily();clearUndo();warningT=0;state='playing';banner='DAILY CHALLENGE • '+dailyConfig.label;bannerT=1.25;applyThemeMusic();startLoop();
}
function completeDaily(){dailyState.completed=true;dailyState.bestScore=Math.max(dailyState.bestScore,score);saveDaily();rewardBooster(dailyConfig.reward,1);addMissionProgress('levels',1);dailyResult='COMPLETED';clearUndo();const streak=applyStreakCompletion();if(!streak.milestone){banner='DAILY COMPLETE! • 🔥 STREAK '+streak.current;bannerT=1.4;}clearSavedGame();dailyMode=false;state='dailycomplete';}
function failDaily(){dailyState.bestScore=Math.max(dailyState.bestScore,score);saveDaily();dailyMode=false;clearUndo();state='gameover';banner='DAILY FAILED';bannerT=1.0}
function missionDefForType(type){return MISSION_DEFS.find(d=>d.type===type)||MISSION_DEFS[0]}
function missionRewardLabel(k){return k==='hammer'?'🔨 +1 Hammer':k==='shuffle'?'🔀 +1 Shuffle':'➕ +1 +5 Moves'}
function missionRewardText(k){return k==='hammer'?'HAMMER ×1':k==='shuffle'?'SHUFFLE ×1':'+5 MOVES ×1'}
function makeMission(def,index){
  const d=def||MISSION_DEFS[0];
  return {uid:'m'+index+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),type:d.type,target:d.target,label:d.label,reward:d.reward,icon:d.icon||'◆',progress:0,claimed:false};
}
function normalizeMission(raw,index){
  const def=missionDefForType(String(raw?.type||''));
  const target=Number(raw?.target)||def.target;
  return {
    uid:String(raw?.uid||('m'+index+'-'+Date.now())),
    type:def.type,target:Math.max(1,target),label:String(raw?.label||def.label),reward:def.reward,icon:def.icon||'◆',
    progress:Math.max(0,Math.min(Math.max(1,target),Number(raw?.progress)||0)),claimed:!!raw?.claimed
  };
}
function freshMissionState(){return {version:MISSION_VERSION,active:MISSION_DEFS.slice(0,3).map((d,i)=>makeMission(d,i)),nextIndex:3}}
function loadMissions(){
  try{
    const raw=GAME_STORAGE.getItem(MISSION_KEY)||GAME_STORAGE.getItem('tinh-mi-lon-missions-v100')||'';
    const d=raw?JSON.parse(raw):null;
    if(d&&Array.isArray(d.active)&&d.active.length){
      missionState={version:MISSION_VERSION,active:d.active.slice(0,3).map((m,i)=>normalizeMission(m,i)),nextIndex:Math.max(3,Number(d.nextIndex)||3)};
      while(missionState.active.length<3){
        const def=MISSION_DEFS[missionState.nextIndex%MISSION_DEFS.length];
        missionState.active.push(makeMission(def,missionState.nextIndex++));
      }
      saveMissions();
    }else{missionState=freshMissionState();saveMissions()}
  }catch(_){missionState=freshMissionState();saveMissions()}
}
function saveMissions(){try{GAME_STORAGE.setItem(MISSION_KEY,JSON.stringify(missionState))}catch(_){}
}
function missionDone(m){return !!m&&Number(m.progress)>=Number(m.target)}
function missionRewardAvailable(m){return !!m&&Number(boosters?.[m.reward]||0)<BOOSTER_MAX}
function addMissionProgress(type,amount=1){
  amount=Number(amount)||0;if(amount<=0)return;
  let changed=false,completedNow=0;
  for(const m of missionState.active){
    if(m.type!==type||missionDone(m)||m.claimed)continue;
    const before=Number(m.progress)||0;
    m.progress=Math.min(Number(m.target)||1,before+amount);
    if(m.progress!==before){changed=true;if(m.progress>=m.target)completedNow++;}
  }
  if(changed){
    missionFlash=.55;saveMissions();
    if(completedNow>0){banner=completedNow>1?'MISSIONS READY!':'MISSION READY!';bannerT=.95;sound('special',3);haptic('level');flashFeedback(.18)}
  }
}
function claimMission(index){
  const m=missionState.active[index];
  if(!m||m.claimed||!missionDone(m)||!missionRewardAvailable(m))return false;
  rewardBooster(m.reward,1);
  m.claimed=true;
  const next=MISSION_DEFS[missionState.nextIndex%MISSION_DEFS.length];
  missionState.active[index]=makeMission(next,missionState.nextIndex++);
  saveMissions();
  banner='MISSION REWARD!';bannerT=1.0;sound('special',3);haptic('level');flashFeedback(.24);return true;
}
function claimAllMissions(){
  let n=0;
  for(let i=0;i<missionState.active.length;i++)if(missionDone(missionState.active[i])&&missionRewardAvailable(missionState.active[i]))if(claimMission(i))n++;
  return n;
}
function missionCountDone(){return missionState.active.filter(missionDone).length}
function missionCountClaimable(){return missionState.active.filter(m=>missionDone(m)&&missionRewardAvailable(m)).length}
loadMissions();

// ===== STEP 9: BOOSTERS =====
const BOOSTER_KEY='tinh-mi-lon-boosters-v105';
const BOOSTER_VERSION=2, BOOSTER_MAX=9;
const BOOSTER_DEFAULTS={hammer:3,shuffle:2,moves:2};
let boosters={...BOOSTER_DEFAULTS};
function clampBooster(n){return Math.max(0,Math.min(BOOSTER_MAX,Math.floor(Number(n)||0)))}
function loadBoosters(){
  try{
    const raw=GAME_STORAGE.getItem(BOOSTER_KEY)||GAME_STORAGE.getItem('tinh-mi-lon-boosters-v99')||'{}';
    const d=JSON.parse(raw);
    boosters={hammer:clampBooster(d.hammer ?? BOOSTER_DEFAULTS.hammer),shuffle:clampBooster(d.shuffle ?? BOOSTER_DEFAULTS.shuffle),moves:clampBooster(d.moves ?? BOOSTER_DEFAULTS.moves)};
    saveBoosters();
  }catch(_){boosters={...BOOSTER_DEFAULTS}}
}
function saveBoosters(){try{GAME_STORAGE.setItem(BOOSTER_KEY,JSON.stringify({...boosters,version:BOOSTER_VERSION}))}catch(_){}
}
function boosterLabel(k){return k==='hammer'?'HAMMER':k==='shuffle'?'SHUFFLE':'+5 MOVES'}
function boosterIcon(k){return k==='hammer'?'🔨':k==='shuffle'?'🔀':'➕'}
function boosterCanUse(k){return (state==='playing'||state==='boosters') && clampBooster(boosters[k])>0 && moves>0}
function boosterUsedBanner(k){return k==='hammer'?'HAMMER!':k==='shuffle'?'BOARD SHUFFLED!':'+5 MOVES!'}
function useBooster(k){
  if(!boosterCanUse(k)){
    banner=boosters[k]?'Không thể dùng lúc này':'HẾT BOOSTER';bannerT=.8;sound('error');haptic('error');return false;
  }
  if(k==='hammer'){
    boosterTarget=null;state='booster-hammer';banner='HAMMER: CHỌN 1 Ô • CHẠM NGOÀI ĐỂ HỦY';bannerT=1.2;haptic('tap');startLoop();return true;
  }
  if(k==='moves'){
    boosters.moves=clampBooster(boosters.moves-1);saveBoosters();addMissionProgress('booster',1);
    moves=Math.min(99,moves+5);banner='+5 MOVES!';bannerT=.95;sound('special',2);haptic('special', Math.min(1.65, 1 + combo*0.12));flashFeedback(.22);state='playing';saveProgress();startLoop();return true;
  }
  if(k==='shuffle'){
    if(!boosterShuffle()){
      banner='KHÔNG THỂ XÁO TRỘN';bannerT=.9;sound('error');haptic('error');return false;
    }
    boosters.shuffle=clampBooster(boosters.shuffle-1);saveBoosters();addMissionProgress('booster',1);
    banner='BOARD SHUFFLED!';bannerT=1.0;sound('special',2);haptic('special', Math.min(1.65, 1 + combo*0.12));flashFeedback(.20);state='playing';saveProgress();startLoop();return true;
  }
  return false;
}
function shufflePoolCells(){
  const cells=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const x=board[r][c];
    if(x.obstacle!=='stone'&&x.obstacle!=='lock'&&x.special!=='rainbow'&&x.special!=='bomb'&&x.special!=='row'&&x.special!=='col')cells.push(x);
  }
  return cells;
}
function hasImmediateMatch(){return matches().count>0}
function boosterShuffle(){
  const cells=shufflePoolCells();
  if(cells.length<3)return false;
  const original=cells.map(x=>x.kind);
  for(let attempt=0;attempt<180;attempt++){
    const pool=original.slice();
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
    for(let i=0;i<cells.length;i++){cells[i].kind=pool[i];cells[i].matched=false;cells[i].alpha=1;cells[i].scale=.92}
    if(!hasImmediateMatch() && findMove()){
      selected=null;hint=null;combo=0;nearMiss=null;nearMissT=0;
      return true;
    }
  }
  // Deterministic fallback: try random pair swaps from the current safe board.
  for(let i=0;i<220;i++){
    const a=cells[Math.floor(Math.random()*cells.length)],b=cells[Math.floor(Math.random()*cells.length)];
    if(a===b)continue;
    [a.kind,b.kind]=[b.kind,a.kind];
    if(!hasImmediateMatch()&&findMove()){selected=null;hint=null;combo=0;nearMiss=null;nearMissT=0;return true}
    [a.kind,b.kind]=[b.kind,a.kind];
  }
  return false;
}
function applyHammer(r,c){
  if(!inside(r,c)||state!=='booster-hammer')return;
  const x=board[r][c];
  if(x.obstacle==='stone' && x.special){} // Special may coexist visually; hammer still targets the cell.
  const wasObstacle=!!x.obstacle,obstacleType=x.obstacle||'',wasSpecial=!!x.special,kind=x.kind;
  boosters.hammer=clampBooster(boosters.hammer-1);saveBoosters();addMissionProgress('booster',1);boosterTarget={r,c};
  if(wasObstacle){x.obstacle='';objectiveProgress+=1}
  if(objective.type==='collect'&&kind===objective.kind)objectiveProgress+=1;
  if(wasSpecial&&objective.type==='special')objectiveProgress+=1;
  x.special='';x.matched=true;x.alpha=1;
  const hammerScore=wasObstacle?45:(wasSpecial?120:30);
  score+=hammerScore;addMissionProgress('score',hammerScore);
  if(!wasObstacle)addMissionProgress('match',1);
  if(wasSpecial)addMissionProgress('special',1);
  if(objective.type==='score')objectiveProgress=score;
  progress=Math.min(1,objective.target>0?objectiveProgress/objective.target:0);
  combo=0;chainActive=false;chainStep=0;chainMax=0;chainScore=0;chainCleared=0;chainSpecials=0;chainSwaps=0;chainQualified=false;hint=null;
  banner=wasObstacle?(obstacleType==='ice'?'HAMMER! ICE BROKEN':obstacleType==='lock'?'HAMMER! LOCK BROKEN':obstacleType==='stone'?'HAMMER! STONE BROKEN':'HAMMER! BLOCK BROKEN'):'HAMMER!';bannerT=.8;
  effects.push({type:'burst',x:cellX(c),y:cellY(r),life:.45,max:.45,combo:0});spawn(cellX(c),cellY(r),10);
  sound('special',2);haptic('special', Math.min(1.65, 1 + combo*0.12));flashFeedback(.24);state='clearing';phase=.32;saveProgress();
}
function rewardBooster(k,n=1){const add=Math.max(0,Math.floor(n||0));const before=clampBooster(boosters[k]||0);const after=clampBooster(before+add);boosters[k]=after;saveBoosters();return after-before;}
function hasSavedGame(){try{return !!(GAME_STORAGE.getItem(SAVE_KEY)||GAME_STORAGE.getItem(SAVE_LEGACY_KEY))}catch(_){return false}}
function boardChecksum(rows){
  let h=2166136261>>>0;
  for(const row of rows||[])for(const c of row||[]){
    const v=(Number(c.kind)||0)+'|'+(c.special||'')+'|'+(c.obstacle||'')+';';
    for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
  }
  return (h>>>0).toString(16);
}
function snapshotGame(){
  const cleanBoard=board.map(row=>row.map(c=>({kind:Number(c.kind)||0,special:c.special||'',obstacle:c.obstacle||''})));
  return {
    version:SAVE_VERSION, schema:'normal-save', savedAt:Date.now(),
    score,moves,level,progress,combo:0,objectiveProgress,
    objective:objective?{type:objective.type,target:objective.target,label:objective.label,kind:objective.kind,world:objective.world}:null,
    board:cleanBoard,
    boardChecksum:boardChecksum(cleanBoard),
    stats:{bestScore:Number(GAME_STORAGE.getItem('tinh-mi-lon-game-best-score')||0),
      highestLevel:Number(GAME_STORAGE.getItem('tinh-mi-lon-game-highest-level')||1),
      games:Number(GAME_STORAGE.getItem('tinh-mi-lon-game-games')||0)},
    map:{unlocked:mapState.unlocked,stars:{...mapState.stars}},
    boosters:{...boosters},
    settings:{quality:qualityMode,showFps,reducedMotion,adaptivePerformance},
    meta:{mode:'normal',state:'stable',reason:'auto',theme:themeForLevel(level).vi,levelLabel:levelConfig(level).label}
  };
}
function saveProgress(reason='auto',force=false){
  // Daily Challenge has its own save; never overwrite the normal game slot.
  if(dailyMode || !board.length || (!force && !['playing','paused','levelcomplete'].includes(state)))return false;
  try{
    const now=Date.now();
    const data=snapshotGame();
    data.meta.reason=reason;
    data.meta.savedFrom=state;
    GAME_STORAGE.setItem(SAVE_KEY,JSON.stringify(data));
    // Migrate/clean the old V95 slot after the first successful V114 save.
    GAME_STORAGE.removeItem(SAVE_LEGACY_KEY);
    GAME_STORAGE.setItem('tinh-mi-lon-game-best-score',String(Math.max(score,Number(GAME_STORAGE.getItem('tinh-mi-lon-game-best-score')||0))));
    GAME_STORAGE.setItem('tinh-mi-lon-game-highest-level',String(Math.max(level,Number(GAME_STORAGE.getItem('tinh-mi-lon-game-highest-level')||1))));
    lastSaveAt=now;saveFlashT=.9;saveFlashText='GAME SAVED';
    return true;
  }catch(_){saveFlashT=.9;saveFlashText='SAVE FAILED';return false;}
}
function clearSavedGame(){try{GAME_STORAGE.removeItem(SAVE_KEY);GAME_STORAGE.removeItem(SAVE_LEGACY_KEY)}catch(_){} }
function savedGameInfo(){try{const raw=GAME_STORAGE.getItem(SAVE_KEY)||GAME_STORAGE.getItem(SAVE_LEGACY_KEY);if(!raw)return null;const d=JSON.parse(raw);return {level:Math.max(1,Number(d.level)||1),score:Math.max(0,Number(d.score)||0),moves:Math.max(0,Number(d.moves)||0),savedAt:Number(d.savedAt)||0,version:Number(d.version)||1,valid:Array.isArray(d.board)&&d.board.length===N};}catch(_){return null}}
function loadProgress(){
  try{
    const raw=GAME_STORAGE.getItem(SAVE_KEY)||GAME_STORAGE.getItem(SAVE_LEGACY_KEY); if(!raw)return false;
    const d=JSON.parse(raw);
    if(!d || Number(d.version)<SAVE_MIN_VERSION || Number(d.version)>SAVE_VERSION || !Array.isArray(d.board) || d.board.length!==N || d.board.some(row=>!Array.isArray(row)||row.length!==N))return false;
    if(d.boardChecksum && d.boardChecksum!==boardChecksum(d.board))return false;
    score=Number(d.score)||0; moves=Math.max(0,Number(d.moves)||0); level=Math.max(1,Number(d.level)||1);
    progress=Math.max(0,Math.min(.9999,Number(d.progress)||0)); combo=0; objectiveProgress=Math.max(0,Number(d.objectiveProgress)||0);
    objective=objectiveForLevel(level);
    if(d.map && d.map.stars){mapState.stars=d.map.stars;mapState.unlocked=Math.max(mapState.unlocked,Number(d.map.unlocked)||1);saveMapState();}
    if(d.boosters){boosters={hammer:clampBooster(d.boosters.hammer),shuffle:clampBooster(d.boosters.shuffle),moves:clampBooster(d.boosters.moves)};saveBoosters();}
    if(d.settings){if(QUALITY_MODES.includes(d.settings.quality))qualityMode=d.settings.quality;if(typeof d.settings.showFps==='boolean')showFps=d.settings.showFps;if(typeof d.settings.reducedMotion==='boolean')reducedMotion=d.settings.reducedMotion;if(typeof d.settings.adaptivePerformance==='boolean')adaptivePerformance=d.settings.adaptivePerformance;saveSettings();}
    if(d.objective && d.objective.type===objective.type) objective={...objective,target:Number(d.objective.target)||objective.target,label:d.objective.label||objective.label,kind:d.objective.kind??objective.kind,world:d.objective.world||objective.world};
    board=d.board.map(row=>row.map(c=>{const x=makeCell(Number(c.kind)||0);x.special=c.special||'';x.obstacle=c.obstacle||'';return x;}));
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){board[r][c].x=board[r][c].tx=cellX(c);board[r][c].y=board[r][c].ty=cellY(r);}
    selected=null;hint=null;particles=[];effects=[];resetNearMiss();nearMissStreak=0;cascadeDrops=[];toastScore=[];chainActive=false;chainStep=0;chainMax=0;chainScore=0;chainCleared=0;chainSpecials=0;chainSwaps=0;chainQualified=false;dailyMode=false;lastSaveAt=Number(d.savedAt)||Date.now();state='playing';banner='CONTINUED • SAVE '+(Number(d.version)>=SAVE_VERSION?'RESTORED':'MIGRATED');bannerT=.9;warningT=0;
    saveFlashT=1.1;saveFlashText='SAVE RESTORED';
    return true;
  }catch(_){return false}
}
function recordNewGame(){try{const n=Number(GAME_STORAGE.getItem('tinh-mi-lon-game-games')||0)+1;GAME_STORAGE.setItem('tinh-mi-lon-game-games',String(n));}catch(_){} }
const GEM_RATIO=.76;
const UI={hint:{x:18,y:160,w:112,h:38},menu:{x:142,y:160,w:112,h:38}};
function fit(){
  const vv=window.visualViewport;
  const vw=vv?vv.width:window.innerWidth;
  const vh=vv?vv.height:window.innerHeight;
  const safeTop=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top'))||0;
  const safeBottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0;
  const maxW=Math.max(320,Math.min(vw-20,DESIGN_W));
  const maxH=Math.max(480,Math.min(vh-safeTop-safeBottom-20,DESIGN_H));
  const d=Math.min(maxW,maxH/(DESIGN_H/DESIGN_W));
  const dprCap=performanceProfile().effectiveDpr;
  pixelRatio=Math.min(window.devicePixelRatio||1,dprCap);
  canvas.width=Math.round(d*pixelRatio);
  canvas.height=Math.round(d*(DESIGN_H/DESIGN_W)*pixelRatio);
  canvas.style.width=d+'px';
  canvas.style.height=(d*(DESIGN_H/DESIGN_W))+'px';
  const sc=d/DESIGN_W;
  // 8x8 board: the board always occupies exactly 8 cells across.
  // Keep a small side margin on narrow phones while preserving square cells.
  cell.s=Math.min(72*sc,(d-26*sc)/8);
  cell.x=(d-cell.s*8)/2;
  // Keep the 8x8 board below the compact HUD and above the lower controls.
  cell.y=208*sc;
  if(board.length)for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const g=board[r][c];
    g.tx=cellX(c);g.ty=cellY(r);
    // V133: a viewport/modal resize can happen after gameplay starts. In that
    // case the old x/y may still be from the hidden/previous viewport (often 0,0),
    // making every gem render outside the board. Re-anchor invalid/stale cells.
    const stale=!Number.isFinite(g.x)||!Number.isFinite(g.y)||
      (Math.abs(g.x-g.tx)>cell.s*2.5 && Math.abs(g.y-g.ty)>cell.s*2.5);
    if(state==='menu'||state==='gameover'||state==='paused'||stale){g.x=g.tx;g.y=g.ty}
  }
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
}
function makeCell(k){return {kind:k,special:'',obstacle:'',matched:false,x:0,y:0,tx:0,ty:0,scale:1,alpha:1,impactT:0,impactPower:0}}
function triggerLocalImpact(cells,intensity=1){
  if(!cells||!cells.length)return;
  const unique=[];const seen=new Set();let sx=0,sy=0;
  for(const q of cells){if(!inside(q.r,q.c)||seen.has(q.r+','+q.c))continue;seen.add(q.r+','+q.c);unique.push(q);const g=board[q.r][q.c];if(g){g.impactT=Math.max(g.impactT,.16);g.impactPower=Math.max(g.impactPower,Math.min(1.25,Number(intensity)||1));sx+=cellX(q.c);sy+=cellY(q.r);}}
  if(!unique.length)return;sx/=unique.length;sy/=unique.length;
  localImpacts.push({x:sx,y:sy,radius:cell.s*(.48+Math.min(unique.length,8)*.08),life:.26,max:.26,strength:Math.min(1.25,Number(intensity)||1)});
  if(localImpacts.length>18)localImpacts.splice(0,localImpacts.length-18);
}
// ===== STEP 17: SMART BOARD GENERATOR — POLISHED V117 =====
// Generates several clean, playable 8×8 openings and selects a board whose
// tactical quality matches the current difficulty. The generator is bounded so
// it never blocks the UI with an unbounded AI search.
const SMART_BOARD_VERSION='v117';
let smartBoardStats={attempts:0,legalMoves:0,bestScore:0,quality:0};

function smartRandKind(){return Math.floor(Math.random()*TYPES)}
function buildSmartCandidate(){
  const cells=Array.from({length:N},()=>Array(N).fill(0));
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    let k=smartRandKind(),guard=0;
    while(guard++<24&&(
      (c>=2&&cells[r][c-1]===k&&cells[r][c-2]===k)||
      (r>=2&&cells[r-1][c]===k&&cells[r-2][c]===k)
    )) k=smartRandKind();
    cells[r][c]=k;
  }
  return cells;
}
function smartKindsHash(kinds){
  let h=2166136261>>>0;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    h^=(kinds[r][c]+1+(r*17)+(c*31));
    h=Math.imul(h,16777619)>>>0;
  }
  return h>>>0;
}
function installSmartKinds(kinds,withObstacles=true){
  board=Array.from({length:N},(_,r)=>Array.from({length:N},(_,c)=>makeCell(kinds[r][c])));
  if(!withObstacles)return;
  const ob=obstacleForLevel(level),count=obstacleCount(level);
  if(!ob||count<=0)return;
  let placed=0,guard=0;
  while(placed<count&&guard++<1400){
    const r=Math.floor(Math.random()*N),c=Math.floor(Math.random()*N),x=board[r][c];
    if(x.obstacle)continue;
    // Keep a playable core. Blockers may surround it, but should not occupy
    // most of the centre where opening moves are evaluated.
    if((ob==='stone'||ob==='lock')&&r>=2&&r<=5&&c>=2&&c<=5){
      const centrePlaced=board.slice(2,6).reduce((n,row)=>n+row.slice(2,6).filter(v=>v.obstacle).length,0);
      if(centrePlaced>=Math.max(1,Math.floor(count*.18))||Math.random()<.68)continue;
    }
    x.obstacle=ob;placed++;
  }
}
function smartLegalMoves(){
  const legal=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    if(c+1<N&&swapValid({r,c},{r,c:c+1}))legal.push([{r,c},{r,c:c+1}]);
    if(r+1<N&&swapValid({r,c},{r:r+1,c}))legal.push([{r,c},{r:r+1,c}]);
  }
  return legal;
}
function smartObjectivePotential(){
  if(!objective)return 0;
  let value=0;
  if(objective.type==='collect'){
    for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(board[r][c].kind===objective.kind)value++;
    return Math.min(24,value)*1.15;
  }
  if(objective.type==='clear'){
    let blockers=0,adjacent=0;
    for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(board[r][c].obstacle){
      blockers++;
      for(const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]){
        const rr=r+dr,cc=c+dc;if(inside(rr,cc)&&!board[rr][cc].obstacle)adjacent++;
      }
    }
    return Math.min(24,blockers)*.55+Math.min(36,adjacent)*.35;
  }
  if(objective.type==='special')return 3.5;
  if(objective.type==='combo')return 3.5;
  return 2;
}
function smartBoardScore(){
  const legal=smartLegalMoves();
  if(!legal.length)return null;
  const evals=[];
  // The full list is at most 112 moves on an 8×8 board. On lower quality
  // modes, sample enough moves to keep generation responsive.
  const limit=Math.min(performanceProfile().aiLimit,legal.length);
  for(let i=0;i<limit;i++){
    const idx=limit===legal.length?i:Math.floor(i*legal.length/limit);
    const e=aiEvaluateMove(legal[idx]);
    if(e)evals.push(e);
  }
  if(!evals.length)return null;
  evals.sort((a,b)=>b.score-a.score);
  const best=evals[0],second=evals[1]||best;
  const avg=evals.slice(0,Math.min(6,evals.length)).reduce((a,v)=>a+v.score,0)/Math.min(6,evals.length);
  const d=levelConfig(level).difficulty;
  const moveCount=legal.length;
  // Easier boards intentionally offer more alternatives. Harder boards narrow
  // the opening without ever becoming dead or having only one legal move.
  const moveTarget=d<=3?26:d<=5?22:d<=7?18:d<=9?14:11;
  const moveFit=Math.max(0,24-Math.abs(moveCount-moveTarget)*1.35);
  const strength=best.score*.58+second.score*.22+avg*.20;
  const targetStrength=d<=2?34:d<=4?30:d<=6?26:d<=8?22:d<=9?19:16;
  const tacticalFit=Math.max(0,30-Math.abs(strength-targetStrength)*1.55);
  const objectiveFit=smartObjectivePotential();
  const variety=Math.min(moveCount,18)*.55;
  const quality=moveFit+tacticalFit+objectiveFit+variety+Math.random()*2.5;
  return {quality,score:strength,best:best.score,legalMoves:moveCount,objectiveFit};
}
function fill(){
  const cfg=levelConfig(level);
  const d=cfg.difficulty;
  // Step 18: the difficulty profile controls generator budget too. This keeps
  // higher levels tactical without allowing an expensive search to block input.
  const attempts=Math.min(Math.max(5,Number(cfg.generatorAttempts)||7),performanceProfile().generatorCap);
  let bestKinds=null,bestObstacles=null,best=null,bestHash=0;
  const seen=new Set();
  for(let i=0;i<attempts;i++){
    const kinds=buildSmartCandidate(),hash=smartKindsHash(kinds);
    if(seen.has(hash))continue;seen.add(hash);
    installSmartKinds(kinds,true);
    const q=smartBoardScore();
    if(q&&(!best||q.quality>best.quality)){
      best=q;bestKinds=kinds.map(row=>row.slice());
      bestObstacles=board.map(row=>row.map(c=>c.obstacle||''));bestHash=hash;
    }
  }
  // Guaranteed bounded fallback: the clean board generator always prevents
  // immediate matches; findMove() below only retries if obstacles make it dead.
  if(!bestKinds){bestKinds=buildSmartCandidate();installSmartKinds(bestKinds,true);bestObstacles=board.map(row=>row.map(c=>c.obstacle||''));bestHash=smartKindsHash(bestKinds);best=smartBoardScore()||{quality:0,score:0,legalMoves:0};}
  installSmartKinds(bestKinds,false);
  if(bestObstacles)for(let r=0;r<N;r++)for(let c=0;c<N;c++)board[r][c].obstacle=bestObstacles[r][c]||'';
  smartBoardStats={attempts:attempts,legalMoves:best.legalMoves||0,bestScore:Math.round(best.score||0),quality:Math.round(best.quality||0),hash:bestHash,version:SMART_BOARD_VERSION};
}

function fillFast(){
  board=Array.from({length:N},()=>Array.from({length:N},()=>makeCell(Math.floor(Math.random()*TYPES))));
  // Guarantee no immediate 3-match without invoking the heavy AI board generator.
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    let guard=0;
    while(guard++<20){
      const k=board[r][c].kind;
      const h=c>=2&&board[r][c-1].kind===k&&board[r][c-2].kind===k;
      const v=r>=2&&board[r-1][c].kind===k&&board[r-2][c].kind===k;
      if(!h&&!v)break;
      board[r][c].kind=(k+1+Math.floor(Math.random()*(TYPES-1)))%TYPES;
    }
    board[r][c].x=board[r][c].tx=cellX(c);board[r][c].y=board[r][c].ty=cellY(r);
  }
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)board[r][c].obstacle='';
}
function reset(startLevel=1,smart=true){dailyMode=false;levelCompletePending=false;clearUndo();resetNearMiss();nearMissStreak=0;score=0;level=Math.max(1,Math.min(MAX_LEVELS,startLevel));moves=Math.max(20,Number(levelConfig(level).moves)||START_MOVES);combo=0;chainActive=false;chainStep=0;chainMax=0;chainScore=0;chainCleared=0;chainSpecials=0;chainSwaps=0;chainQualified=false;selected=null;hint=null;particles=[];effects=[];cascadeDrops=[];toastScore=[];localImpacts=[];polishBeat=0;polishIdle=0;polishEffectBudget=0;refreshObjective();if(smart){fill();let guard=0;while(!findMove()&&guard++<3)fill();if(!findMove())fillFast()}else{fillFast();let guard=0;while(!findMove()&&guard++<3)fillFast()}for(let r=0;r<N;r++)for(let c=0;c<N;c++){board[r][c].x=board[r][c].tx=cellX(c);board[r][c].y=board[r][c].ty=cellY(r)}state='menu';banner='';}
function start(startLevel=1,countGame=true){reset(startLevel,true);clearSavedGame();if(countGame)recordNewGame();warningT=0;state='playing';banner=themeForLevel(level).vi.toUpperCase()+' • LEVEL '+level+' • '+levelConfig(level).label;bannerT=1.15;applyThemeMusic();saveProgress('new-game',true)}
function cellX(c){return cell.x+c*cell.s+cell.s/2}function cellY(r){return cell.y+r*cell.s+cell.s/2}
function inside(r,c){return r>=0&&r<N&&c>=0&&c<N}function adj(a,b){return Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1}
function inLine(r,c){const k=board[r][c].kind;let h=1,v=1;for(let x=c-1;x>=0&&board[r][x].kind===k;x--)h++;for(let x=c+1;x<N&&board[r][x].kind===k;x++)h++;for(let y=r-1;y>=0&&board[y][c].kind===k;y--)v++;for(let y=r+1;y<N&&board[y][c].kind===k;y++)v++;return h>=3||v>=3}
function swapValid(a,b){const A=board[a.r][a.c],B=board[b.r][b.c];if(A.obstacle==='stone'||A.obstacle==='lock'||B.obstacle==='stone'||B.obstacle==='lock')return false;if(A.special||B.special)return true;[A.kind,B.kind]=[B.kind,A.kind];const ok=inLine(a.r,a.c)||inLine(b.r,b.c);[A.kind,B.kind]=[B.kind,A.kind];return ok}
function findMove(){for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(c+1<N&&swapValid({r,c},{r,c:c+1}))return [{r,c},{r,c:c+1}];if(r+1<N&&swapValid({r,c},{r:r+1,c}))return [{r,c},{r:r+1,c}]}return null}
function matches(){const m=Array.from({length:N},()=>Array(N).fill(false)),runs=[];for(let r=0;r<N;r++){let s=0;while(s<N){let e=s+1;while(e<N&&board[r][e].kind===board[r][s].kind)e++;if(e-s>=3){runs.push({r,c:s,len:e-s,h:true});for(let c=s;c<e;c++)m[r][c]=true}s=e}}for(let c=0;c<N;c++){let s=0;while(s<N){let e=s+1;while(e<N&&board[e][c].kind===board[s][c].kind)e++;if(e-s>=3){runs.push({r:s,c,len:e-s,h:false});for(let r=s;r<e;r++)m[r][c]=true}s=e}}let count=0;for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(m[r][c])count++;return {m,runs,count}}
function planSpecials(m,anchor){
  const p=Array.from({length:N},()=>Array(N).fill(''));
  const rank=s=>({row:1,col:1,bomb:2,rainbow:3}[s]||0);
  const put=(r,c,s)=>{if(inside(r,c)&&rank(s)>rank(p[r][c]))p[r][c]=s};
  // L/T intersections always create a Bomb, regardless of which run was scanned first.
  for(const h of m.runs) if(h.h) for(const v of m.runs) if(!v.h && v.c>=h.c && v.c<h.c+h.len && h.r>=v.r && h.r<v.r+v.len) put(h.r,v.c,'bomb');
  for(const run of m.runs){
    let i=Math.floor(run.len/2);
    if(anchor && anchor.r>=0 && anchor.r<N && anchor.c>=0 && anchor.c<N){
      const onRun=run.h ? anchor.r===run.r && anchor.c>=run.c && anchor.c<run.c+run.len : anchor.c===run.c && anchor.r>=run.r && anchor.r<run.r+run.len;
      if(onRun) i=run.h ? anchor.c-run.c : anchor.r-run.r;
    }
    const r=run.h?run.r:run.r+i, c=run.h?run.c+i:run.c;
    if(run.len>=5) put(r,c,'rainbow');
    else if(run.len===4) put(r,c,run.h?'row':'col');
  }
  return p;
}
function specialEffect(s,r,c){
  const x=cellX(c),y=cellY(r);
  specialActivations++;
  if(s==='row'||s==='col') effects.push({type:'line',dir:s,x,y,life:.42,max:.42});
  else if(s==='bomb') effects.push({type:'bomb',x,y,life:.55,max:.55});
  else if(s==='rainbow') effects.push({type:'rainbow',x,y,life:.7,max:.7});
}

function resolve(fromSwap){
  const m=matches();
  const specialA=fromSwap&&swapInfo?board[swapInfo.a.r][swapInfo.a.c].special:'';
  const specialB=fromSwap&&swapInfo?board[swapInfo.b.r][swapInfo.b.c].special:'';
  if(!m.count&&!specialA&&!specialB){
    const finished=finishComboChain();
    combo=0;swapInfo=null;
    if(levelCompletePending || objectiveDone()){completeLevel();return;}
    state='playing';finalizeUndo();if(!findMove())shuffle();saveProgress('stable');return;
  }
  beginComboChain(!!fromSwap);
  combo++; chainStep=combo; chainMax=Math.max(chainMax,combo); if(objective.type==='combo') objectiveProgress=Math.max(objectiveProgress,chainMax);
  const anchor=fromSwap&&swapInfo?swapInfo.anchor:null;
  const plan=planSpecials(m,anchor),clear=Array.from({length:N},()=>Array(N).fill(false)),stack=[];
  const matchedCells=[];for(let rr=0;rr<N;rr++)for(let cc=0;cc<N;cc++)if(m.m[rr][cc])matchedCells.push({r:rr,c:cc});
  triggerLocalImpact(matchedCells,combo>=3?1.05:0.82);
  const add=(r,c)=>{if(inside(r,c)&&!clear[r][c]){clear[r][c]=true;stack.push([r,c])}};
  const addRow=r=>{for(let c=0;c<N;c++)add(r,c)};
  const addCol=c=>{for(let r=0;r<N;r++)add(r,c)};
  const addBomb=(r,c,rad=1)=>{for(let y=r-rad;y<=r+rad;y++)for(let x=c-rad;x<=c+rad;x++)add(y,x)};

  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(m.m[r][c])add(r,c);

  // Special Fusion: two special gems swapped together become one dedicated super-effect.
  // This is evaluated before ordinary special propagation so Fusion is deterministic.
  const isLine=s=>s==='row'||s==='col';
  const fusion=!!(fromSwap&&swapInfo&&specialA&&specialB);
  if(fusion){
    const a=swapInfo.a,b=swapInfo.b;
    triggerLocalImpact([a,b],1.18);
    const x=(a.c===b.c)?cellX(a.c):(cellX(a.c)+cellX(b.c))/2;
    const y=(a.r===b.r)?cellY(a.r):(cellY(a.r)+cellY(b.r))/2;
    effects.push({type:'fusion',a:specialA,b:specialB,x,y,life:1.0,max:1.0});

    if(specialA==='rainbow'&&specialB==='rainbow'){
      for(let r=0;r<N;r++)for(let c=0;c<N;c++)add(r,c);
      banner='CRYSTAL STORM!'; bannerT=1.35;
    }else if(specialA==='rainbow'||specialB==='rainbow'){
      const rp=specialA==='rainbow'?a:b,op=specialA==='rainbow'?b:a;
      const target=board[op.r][op.c].kind;
      if(isLine(specialA)||isLine(specialB)){
        const lineType=specialA==='rainbow'?specialB:specialA;
        for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(board[r][c].kind===target){
          if(lineType==='row')addRow(r); else addCol(c);
        }
        banner='RAINBOW LINE!'; bannerT=1.1;
      }else{
        // Rainbow + Bomb: every gem of the target color becomes a Bomb detonation.
        for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(board[r][c].kind===target)addBomb(r,c,1);
        banner='RAINBOW BOMB!'; bannerT=1.1;
      }
      add(rp.r,rp.c);add(op.r,op.c);
    }else if(isLine(specialA)&&isLine(specialB)){
      // Line + Line: clear the complete row and column crossing the fusion point.
      addRow(a.r);addCol(b.c);addRow(b.r);addCol(a.c);
      banner='CROSS BLAST!'; bannerT=1.05;
    }else if(specialA==='bomb'&&specialB==='bomb'){
      // Bomb + Bomb: a larger 5x5 blast.
      const cr=Math.round((a.r+b.r)/2),cc=Math.round((a.c+b.c)/2);
      addBomb(cr,cc,2);
      banner='MEGA BOMB!'; bannerT=1.05;
    }else if((isLine(specialA)&&specialB==='bomb')||(specialA==='bomb'&&isLine(specialB))){
      // Line + Bomb: three rows and three columns centered on the fusion point.
      const cr=Math.round((a.r+b.r)/2),cc=Math.round((a.c+b.c)/2);
      for(let d=-1;d<=1;d++){addRow(cr+d);addCol(cc+d)}
      banner='SUPER BLAST!'; bannerT=1.15;
    }
    // Fusion consumes both original Special Gems; do not run their ordinary effects.
    specialActivations+=2;
    add(a.r,a.c);add(b.r,b.c);
  }else{
    if(specialA){specialEffect(specialA,swapInfo.a.r,swapInfo.a.c);add(swapInfo.a.r,swapInfo.a.c)}
    if(specialB){specialEffect(specialB,swapInfo.b.r,swapInfo.b.c);add(swapInfo.b.r,swapInfo.b.c)}
    const rbA=specialA==='rainbow',rbB=specialB==='rainbow';
    if(rbA||rbB){
      if(rbA&&rbB){for(let r=0;r<N;r++)for(let c=0;c<N;c++)add(r,c)}
      else{
        const rp=rbA?swapInfo.a:swapInfo.b,op=rbA?swapInfo.b:swapInfo.a,k=board[op.r][op.c].kind;
        effects.push({type:'rainbowTarget',kind:k,life:.55,max:.55});
        for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(board[r][c].kind===k)add(r,c);
      }
    }
  }

  while(stack.length){
    const [r,c]=stack.pop(),s=board[r][c].special;
    // During a Fusion the two swapped specials have already been consumed; their
    // normal effect must not fire a second time.
    const swappedSpecial=fusion&&((r===swapInfo.a.r&&c===swapInfo.a.c)||(r===swapInfo.b.r&&c===swapInfo.b.c));
    if(swappedSpecial)continue;
    if(s==='row'){specialEffect('row',r,c);addRow(r)}
    else if(s==='col'){specialEffect('col',r,c);addCol(c)}
    else if(s==='bomb'){specialEffect('bomb',r,c);addBomb(r,c,1)}
    else if(s==='rainbow'){
      specialEffect('rainbow',r,c);
      const k=board[r][c].kind;
      for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(board[y][x].kind===k)add(y,x);
    }
  }

  // Newly created specials survive this clear; all other matched cells disappear.
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(plan[r][c])clear[r][c]=false;
  let cleared=0,specialCreated=0,blocksCleared=0,collected=0;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(clear[r][c]){
    const cellRef=board[r][c];
    if(cellRef.obstacle){blocksCleared++;cellRef.obstacle='';effects.push({type:'blockBreak',x:cellX(c),y:cellY(r),life:.48,max:.48});spawn(cellX(c),cellY(r),9);juice('obstacle',1);}
    if(!cellRef.obstacle){cleared++;if(cellRef.kind===objective.kind)collected++;cellRef.matched=true;spawn(cellX(c),cellY(r),7)}
  }
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(plan[r][c]){board[r][c].special=plan[r][c];board[r][c].matched=false;board[r][c].scale=1.35;specialCreated++;effects.push({type:'specialCreate',special:plan[r][c],x:cellX(c),y:cellY(r),life:.72,max:.72})}
  objectiveProgress += blocksCleared;
  if(objective.type==='collect') objectiveProgress += collected;
  if(objective.type==='special') objectiveProgress += specialCreated;
  if(objective.type==='score') objectiveProgress=score;
  const fusionBonus=fusion?500:0;
  const specialBonus=specialCreated*150+specialActivations*40+fusionBonus;
  const multiplier=comboMultiplier(combo);
  const chainBonus=combo>1?Math.round(cleared*15*(combo-1)):0;
  const scoreGain=Math.round(cleared*30*multiplier)+specialBonus+chainBonus;
  score+=scoreGain;
  chainScore+=scoreGain; chainCleared+=cleared; chainSpecials+=specialCreated+specialActivations;
  addMissionProgress('score',scoreGain);
  addMissionProgress('match',cleared);
  addMissionProgress('special',specialCreated);
  addMissionProgress('blocks',blocksCleared);
  if(combo>=3&&!chainQualified){addMissionProgress('combo',1);chainQualified=true;}
  if(objective.type==='score')objectiveProgress=score;
  // In Step 8, a level is completed by its objective. Level progression is
  // controlled by the Level Map instead of silently advancing mid-game.
  progress=Math.min(1, objective.target>0?objectiveProgress/objective.target:0);
  if(objectiveDone()){
    levelCompletePending=true;clearUndo();
    sound('special',5);haptic('win',1.15);flashFeedback(.30);juice('win',1.2);
  }
  saveProgress();
  toastScore.push({x:cell.x+cell.s*4,y:cell.y+cell.s*4-8,text:'+'+scoreGain,life:.9,max:.9,scale:1});
  effects.push({type:combo>1?'combo':'match',x:cell.x+cell.s*4,y:cell.y+cell.s*4,life:combo>1?.82:.58,max:combo>1?.82:.58,combo,cleared});
  if(combo>1)effects.push({type:'banner',x:cell.x+cell.s*4,y:cell.y+cell.s*4,life:.95,max:.95,combo,cleared});
  if(!bannerT)banner=combo>1?'COMBO CHAIN x'+combo:'MATCH!';bannerT=.8;
  sound(fusion?'special':(combo>=3?'combo':'match'),Math.max(1,combo));
  if(combo>=2){haptic('combo', Math.min(1.65, 0.85 + combo*0.18));juice('combo',Math.min(1.7,0.9+combo*.16));} else {haptic('match');juice('match',1);}
  flashFeedback(fusion||specialCreated||specialActivations?0.24:(combo>=2?0.18:0.10));
  if(cleared>=4||specialCreated||specialActivations||fusion){sound('special',Math.max(1,combo));haptic(fusion?'fusion':'special', Math.min(1.65, 1 + combo*0.12));juice(fusion?'fusion':'special',Math.min(1.8,1+combo*.10));}
  specialActivations=0;swapInfo=null;phase=.42;state='clearing'
}
function collapse(){cascadeDrops=[];juice('cascade',Math.min(1.4,1+Math.max(0,combo-1)*.12));for(let c=0;c<N;c++){let wr=N-1;for(let r=N-1;r>=0;r--){if(board[r][c].matched)continue;if(wr!==r){const moved=board[r][c];cascadeDrops.push({x:cellX(c),y:moved.y,ty:cellY(wr),life:.34,max:.34});board[wr][c]=moved}board[wr][c].tx=cellX(c);board[wr][c].ty=cellY(wr);wr--}for(let r=wr;r>=0;r--){const x=makeCell(Math.floor(Math.random()*TYPES));x.x=cellX(c);x.y=cellY(r)-cell.s*(wr-r+1);x.tx=cellX(c);x.ty=cellY(r);board[r][c]=x;cascadeDrops.push({x:cellX(c),y:x.y,ty:x.ty,life:.46,max:.46})}}state='falling'}
function shuffle(){finishComboChain();resetNearMiss();nearMissStreak=0;fill();while(!findMove())fill();selected=null;hint=null;combo=0;chainActive=false;chainStep=0;chainMax=0;chainScore=0;chainCleared=0;chainSpecials=0;chainSwaps=0;chainQualified=false;banner='NO MOVES • SHUFFLED';bannerT=1.2;sound('special')}
function doSwap(a,b){[board[a.r][a.c],board[b.r][b.c]]=[board[b.r][b.c],board[a.r][a.c]];board[a.r][a.c].tx=cellX(a.c);board[a.r][a.c].ty=cellY(a.r);board[b.r][b.c].tx=cellX(b.c);board[b.r][b.c].ty=cellY(b.r);sound('swap')}
function choose(q){if(state!=='playing')return;if(!selected){selected=q;sound('select');haptic('select');return}if(q.r===selected.r&&q.c===selected.c){selected=null;return}if(adj(selected,q)){if(!swapValid(selected,q)){
    const a={r:selected.r,c:selected.c},b={r:q.r,c:q.c};
    [board[a.r][a.c].kind,board[b.r][b.c].kind]=[board[b.r][b.c].kind,board[a.r][a.c].kind];
    const near=findNearMissAfterInvalidSwap(a,b);
    [board[a.r][a.c].kind,board[b.r][b.c].kind]=[board[b.r][b.c].kind,board[a.r][a.c].kind];
    if(near)triggerNearMiss(near); else {nearMissStreak=0;sound('error');haptic('error');flashFeedback(.14);juice('error',1)}
    selected=null;return}if(!chainActive)combo=0;armUndo();moves--;swapInfo={a:selected,b:q,anchor:{r:q.r,c:q.c}};doSwap(selected,q);haptic('swap',1);selected=null;phase=.22;state='swapping'}else{selected=q;sound('select');haptic('select')}}
// ===== STEP 16: AI MOVE EVALUATION =====
// Heuristic look-ahead: evaluates every legal swap, then simulates up to two
// deterministic cascade waves using the gems already on the board. It does
// not claim to predict random refill gems; this keeps the AI fast and stable
// on mobile while looking deeper than the Step 15 static evaluator.
function aiCloneKinds(){return board.map(row=>row.map(c=>c.kind));}
function aiMatches(kinds){
  const m=Array.from({length:N},()=>Array(N).fill(false)),runs=[];
  for(let r=0;r<N;r++){
    let s=0;while(s<N){let e=s+1;while(e<N&&kinds[r][e]===kinds[r][s])e++;if(kinds[r][s]>=0&&e-s>=3){runs.push({r,c:s,len:e-s,h:true});for(let c=s;c<e;c++)m[r][c]=true;}s=e;}
  }
  for(let c=0;c<N;c++){
    let s=0;while(s<N){let e=s+1;while(e<N&&kinds[e][c]===kinds[s][c])e++;if(kinds[s][c]>=0&&e-s>=3){runs.push({r:s,c,len:e-s,h:false});for(let r=s;r<e;r++)m[r][c]=true;}s=e;}
  }
  let count=0;for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(m[r][c])count++;
  return {m,runs,count};
}
function aiCollapse(kinds,mask){
  for(let c=0;c<N;c++){
    let wr=N-1;
    for(let r=N-1;r>=0;r--){if(mask[r][c])continue;kinds[wr--][c]=kinds[r][c];}
    while(wr>=0)kinds[wr--][c]=-1;
  }
}
function aiRunCascades(kinds,maxWaves=2){
  let total=0,waves=0,longRuns=0,createdPotential=0;
  for(let wave=0;wave<maxWaves;wave++){
    const m=aiMatches(kinds);if(!m.count)break;
    waves++;total+=m.count;
    for(const run of m.runs){if(run.len>=4)createdPotential+=run.len>=5?3:1;longRuns+=Math.max(0,run.len-3);}
    aiCollapse(kinds,m.m);
  }
  return {total,waves,longRuns,createdPotential,kinds};
}
function aiObjectiveBonus(kinds,objectiveInfo){
  if(!objectiveInfo)return 0;
  const {type,kind}=objectiveInfo;let bonus=0;
  if(type==='collect'){
    for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(kinds[r][c]===kind)bonus+=1;
  }
  if(type==='score')bonus+=0.15;
  if(type==='special')bonus+=0.8;
  if(type==='combo')bonus+=0.8;
  return bonus;
}
function aiEvaluateMove(move){
  if(!move)return null;
  const [a,b]=move,A=board[a.r][a.c],B=board[b.r][b.c];
  const kinds=aiCloneKinds();[kinds[a.r][a.c],kinds[b.r][b.c]]=[kinds[b.r][b.c],kinds[a.r][a.c]];
  const immediate=aiMatches(kinds);
  const sim=aiRunCascades(kinds,2);
  let scoreValue=sim.total*11+sim.waves*24+sim.longRuns*13+sim.createdPotential*24;
  scoreValue+=immediate.count*7+immediate.runs.length*5;
  scoreValue+=aiObjectiveBonus(kinds,objective);

  // Real board features that the kind-only simulation cannot reproduce.
  let obstacleHits=0;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(immediate.m[r][c]){
    for(const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]){
      const rr=r+dr,cc=c+dc;if(inside(rr,cc)&&board[rr][cc].obstacle)obstacleHits++;
    }
  }
  scoreValue+=obstacleHits*18;
  if(A.special||B.special){
    scoreValue+=55;
    if((A.special==='rainbow'&&B.special)||(B.special==='rainbow'&&A.special))scoreValue+=80;
    else if(A.special&&B.special)scoreValue+=65;
  }
  if(A.obstacle==='ice'||B.obstacle==='ice')scoreValue+=10;
  if(A.obstacle==='lock'||B.obstacle==='lock'||A.obstacle==='stone'||B.obstacle==='stone')scoreValue-=25;

  // Prefer moves that leave a playable board and avoid creating a dead state.
  const remaining=sim.kinds.map(row=>row.map(v=>v));
  let stablePotential=0;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const k=remaining[r][c];if(k<0)continue;
    if((c+1<N&&remaining[r][c+1]===k)||(r+1<N&&remaining[r+1][c]===k))stablePotential++;
  }
  scoreValue+=stablePotential*.4;
  return {move,score:scoreValue,immediate:immediate.count,cascade:sim.total,waves:sim.waves,longRuns:sim.longRuns,obstacleHits,special:!!(A.special||B.special)};
}
function aiFindBestMove(){
  const candidates=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    if(c+1<N&&swapValid({r,c},{r,c:c+1}))candidates.push(aiEvaluateMove([{r,c},{r,c:c+1}]));
    if(r+1<N&&swapValid({r,c},{r:r+1,c}))candidates.push(aiEvaluateMove([{r,c},{r:r+1,c}]));
  }
  candidates.sort((x,y)=>y.score-x.score||y.cascade-x.cascade||y.immediate-x.immediate||y.waves-x.waves);
  return candidates[0]||null;
}
// Step 15 remains the fast fallback. Step 16 upgrades HINT to the deeper AI
// evaluator while preserving Near-Miss priority and the same mobile UX.
function showHint(){
  if(state!=='playing'||hintCooldown>0)return;
  hintCooldown=.85;
  const h=nearMiss&&nearMissT>0?{move:nearMiss.move,score:999}:{move:null};
  const ai=(!h.move)?aiFindBestMove():null;
  const chosen=h.move?h:ai;
  if(chosen&&chosen.move){
    hint=chosen.move;hintT=2.9;
    banner=h.move?'HINT • ALMOST COMBO':'AI HINT • NƯỚC ĐI TỐI ƯU';
    bannerT=1.0;haptic('tap');flashFeedback(.08);
  }
}
function spawn(x,y,n){
  const pp=performanceProfile();
  n=Math.min(n,Math.max(4,Math.round(pp.particleCap/10)));
  for(let i=0;i<n;i++){
    const limit=particleLimit();
    if(particles.length>=limit) particles.shift();
    const a=Math.random()*Math.PI*2,s=40+Math.random()*130;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.45+Math.random()*.18,max:.63,size:2+Math.random()*4});
  }
}
function sound(n,intensity=1){
  if(!soundOn||!sounds[n])return;
  try{
    const now=performance.now();
    const raw=Number(intensity)||1;
    const power=Math.max(.35,Math.min(2.4,raw));
    // Prevent noisy event storms while keeping match/cascade sounds responsive.
    const minGap=n==='match'?42:n==='select'?55:n==='swap'?70:n==='error'?80:34;
    if(now-(soundLast[n]||0)<minGap)return;
    soundLast[n]=now;
    const pool=soundPools[n]||[sounds[n]];
    const idx=(soundCursor[n]||0)%pool.length;soundCursor[n]=(idx+1)%pool.length;
    const a=pool[idx];
    a.currentTime=0;
    // Dynamic pitch: stronger combo/special events sound brighter and slightly shorter.
    const base={select:.98,swap:1.00,match:1.00,combo:1.03,special:1.06,error:.90}[n]||1;
    const rate=Math.max(.84,Math.min(1.38,base+(power-1)*.055));
    a.playbackRate=rate;
    a.preservesPitch=false;
    // Dynamic loudness: performance mode is intentionally softer; high mode keeps the impact.
    const qualityMul=performanceProfile().audioMul;
    const typeMul={select:.32,swap:.46,match:.52,combo:.64,special:.72,error:.42}[n]||.5;
    a.volume=Math.max(.05,Math.min(.92,typeMul*qualityMul*(.72+power*.18)));
    const p=a.play();if(p&&p.catch)p.catch(()=>{});
  }catch(_){}
}
function drawBackground(w,h){
  const t=themePalette();
  ctx.fillStyle='#0a0b2b';ctx.fillRect(0,0,w,h);
  if(bg.complete&&bg.naturalWidth>0&&bg.naturalHeight>0){
    ctx.save();
    const scale=Math.max(w/bg.naturalWidth,h/bg.naturalHeight);
    const dw=bg.naturalWidth*scale,dh=bg.naturalHeight*scale;
    ctx.globalAlpha=.88;
    ctx.drawImage(bg,(w-dw)/2,(h-dh)/2,dw,dh);
    ctx.restore();
  }
  // Unified cinematic veil keeps the new artwork visible without reducing text/board contrast.
  const veil=ctx.createLinearGradient(0,0,0,h);
  veil.addColorStop(0,'rgba(7,10,30,.18)');
  veil.addColorStop(.40,'rgba(8,8,26,.28)');
  veil.addColorStop(.78,'rgba(12,8,34,.40)');
  veil.addColorStop(1,'rgba(5,5,20,.58)');
  ctx.fillStyle=veil;ctx.fillRect(0,0,w,h);
  // Subtle theme tint, deliberately low-cost and static.
  ctx.fillStyle='rgba(90,115,220,.045)';ctx.fillRect(0,h*.10,w,h*.58);
  // Calm star points: no moving particles here, keeping the new background stable.
  const pp=performanceProfile();
  if(pp.motif){
    ctx.save();ctx.globalAlpha=.34;
    const pts=[[.08,.16],[.90,.13],[.14,.53],[.86,.49],[.07,.77],[.93,.74],[.24,.06],[.76,.07]];
    pts.forEach(([px,py],i)=>{
      const x=w*px,y=h*py,r=(i%2?1.6:1.1);
      ctx.fillStyle=i%3===0?'#7edcff':'#ffffff';
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      if(i%3===0){ctx.strokeStyle='#8fdcff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();}
    });
    ctx.restore();
  }
}
function draw(){
  const drawPerf=performanceProfile();
  const w=parseFloat(canvas.style.width)||DESIGN_W,h=parseFloat(canvas.style.height)||DESIGN_H;
  const u=cell.s/74; // draw-scope UI scale
  ctx.clearRect(0,0,w,h); drawBackground(w,h);
  // Cohesive premium header; all gameplay chrome uses the same glass language.
  const utilityModal=['menu','tutorial','settings','levelmap','boosters','missions','daily','dailycomplete'].includes(state);
  if(!utilityModal){
    ctx.save();
    ctx.textAlign='center';
    ctx.fillStyle='rgba(238,247,255,.96)';ctx.font='950 '+Math.max(13,14.2*(w/DESIGN_W))+'px system-ui';
    ctx.fillText('💎  BEJEWELED',w/2,22*(w/DESIGN_W));
    ctx.fillStyle='rgba(203,225,255,.58)';ctx.font='800 '+Math.max(7.5,8*(w/DESIGN_W))+'px system-ui';
    ctx.fillText(themePalette().vi.toUpperCase()+'  •  '+themePalette().name.toUpperCase(),w/2,34*(w/DESIGN_W));
    ctx.restore();
  }
  if(state==='menu'){menuDraw(w,h);return}
  if(state==='tutorial'){tutorialDraw(w,h);return}
  if(state==='settings'){settingsDraw(w,h);return}
  if(state==='paused'){overlay(w,h,'PAUSED',['RESUME','RESTART','SAVE & MENU']);return;}
  if(state==='levelmap'){levelmapDraw(w,h);return}
  if(state==='boosters'){boosterDraw(w,h);return}
  if(state==='daily'){dailyDraw(w,h);return}
  if(state==='dailycomplete'){dailyCompleteDraw(w,h);return}
  if(state==='missions'){missionDraw(w,h);return}
  hud(w);
  // V131: no global canvas shake/zoom. Game Feel is localized to the affected match zone.
  ctx.save();
  drawCrystalBoard();
  ctx.save();
  ctx.textAlign='left';ctx.fillStyle='rgba(228,244,255,.60)';ctx.font='800 '+Math.max(8,9*u)+'px system-ui';
  ctx.fillText('8 × 8  •  MATCH 3+  •  5 = SPECIAL',cell.x,cell.y-BOARD_PAD-8*u);
  ctx.textAlign='right';ctx.fillStyle='rgba(255,226,154,.72)';ctx.fillText('LEVEL '+level,cell.x+cell.s*N,cell.y-BOARD_PAD-8*u);
  ctx.restore();
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)drawGem(board[r][c],r,c);
  if(selected) {outline(selected.r,selected.c,'rgba(255,235,150,.98)',3); pulseSelected(selected.r,selected.c);}
  if(hint&&hintT>0){const a=.55+.45*Math.sin(performance.now()/100);outline(hint[0].r,hint[0].c,'rgba(255,255,255,'+a+')',3);outline(hint[1].r,hint[1].c,'rgba(255,255,255,'+a+')',3)}
  // Localized impact ring: only the match area reacts; the rest of the board remains stable.
  for(const li of localImpacts){const p=1-li.life/li.max;const a=(1-p)*.34*li.strength;const rr=li.radius*(.35+p*1.18);ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='rgba(255,235,170,.96)';ctx.lineWidth=Math.max(1.5,cell.s*.022);if(drawPerf.shadow>.35){ctx.shadowColor='#ffd66d';ctx.shadowBlur=8;}ctx.beginPath();ctx.arc(li.x,li.y,rr,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.restore();}
  for(const e of effects){
    if(drawPerf.effectScale<.62 && (e.type==='fusion'||e.type==='rainbow'||e.type==='banner')) continue;
    const p=1-e.life/e.max, a=Math.max(0,1-p)*motionScale();
    ctx.save();ctx.globalAlpha=a;
    if(e.type==='nearMiss'){
      const p=1-e.life/e.max,pulse=.72+.28*Math.sin(performance.now()/95);
      for(const q of e.pair){
        ctx.strokeStyle='rgba(255,226,117,'+(0.55+0.35*pulse)+')';ctx.lineWidth=Math.max(2.5,cell.s*.045);
        if(drawPerf.shadow>.35){ctx.shadowColor='#ffd86b';ctx.shadowBlur=12;}ctx.beginPath();ctx.arc(cellX(q.c),cellY(q.r),cell.s*(.34+.10*Math.sin(p*8)),0,Math.PI*2);ctx.stroke();
      }
      ctx.shadowBlur=0;
      const a=e.move[0],b=e.move[1];
      ctx.strokeStyle='rgba(188,239,255,'+(.45+.35*pulse)+')';ctx.lineWidth=Math.max(2,cell.s*.035);ctx.setLineDash([cell.s*.10,cell.s*.07]);
      ctx.beginPath();ctx.moveTo(cellX(a.c),cellY(a.r));ctx.lineTo(cellX(b.c),cellY(b.r));ctx.stroke();ctx.setLineDash([]);
      ctx.font='900 '+Math.max(17,cell.s*.28)+'px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff0a6';ctx.shadowColor='#ffbe55';ctx.shadowBlur=10;
      ctx.fillText('ALMOST COMBO!',cell.x+cell.s*4,cell.y-cell.s*.25-p*cell.s*.15);ctx.shadowBlur=0;
    }else if(e.type==='burst'){
      const rr=cell.s*(.16+p*.58);ctx.strokeStyle=e.combo>1?'#ffd86b':'rgba(255,255,255,.9)';ctx.lineWidth=Math.max(2,cell.s*.035);
      ctx.beginPath();ctx.arc(e.x,e.y,rr,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(e.x,e.y,rr*.58,0,Math.PI*2);ctx.stroke();
    }else if(e.type==='banner'){
      const rise=p*cell.s*.55;ctx.globalAlpha=a*(1-p*.25);ctx.font='900 '+Math.max(20,cell.s*(.34+Math.min(e.combo,6)*.025))+'px system-ui';ctx.textAlign='center';
      ctx.fillStyle='#fff4ae';ctx.shadowColor='#ffbd4a';ctx.shadowBlur=10;ctx.fillText('COMBO CHAIN x'+e.combo,e.x,e.y-cell.s*.78-rise);ctx.shadowBlur=0;
    }else if(e.type==='chainComplete'){
      const rise=p*cell.s*.72; const rr=cell.s*(.30+p*.95);
      ctx.strokeStyle='rgba(255,224,130,.96)';ctx.lineWidth=Math.max(2.5,cell.s*.04);ctx.shadowColor='#ffd36a';ctx.shadowBlur=14;
      ctx.beginPath();ctx.arc(e.x,e.y,rr,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
      ctx.font='900 '+Math.max(19,cell.s*(.34+Math.min(e.combo,8)*.02))+'px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff1a6';
      ctx.fillText('CHAIN x'+e.combo,e.x,e.y-cell.s*.62-rise);
      ctx.font='800 '+Math.max(11,cell.s*.20)+'px system-ui';ctx.fillStyle='rgba(255,255,255,.92)';ctx.fillText('+'+e.total,e.x,e.y-cell.s*.30-rise);
    }else if(e.type==='line'){
      ctx.strokeStyle='rgba(255,255,255,.95)';ctx.shadowColor='#bcecff';ctx.shadowBlur=12;ctx.lineWidth=Math.max(3,cell.s*.075);
      ctx.beginPath();if(e.dir==='row'){ctx.moveTo(cell.x,e.y);ctx.lineTo(cell.x+cell.s*N,e.y)}else{ctx.moveTo(e.x,cell.y);ctx.lineTo(e.x,cell.y+cell.s*N)}ctx.stroke();ctx.shadowBlur=0;
    }else if(e.type==='bomb'){
      ctx.strokeStyle='#ffd66d';ctx.lineWidth=Math.max(2,cell.s*.045);ctx.beginPath();ctx.arc(e.x,e.y,cell.s*(.25+p*1.7),0,Math.PI*2);ctx.stroke();
      for(let i=0;i<8;i++){const a=i*Math.PI/4;const rr=cell.s*(.45+p*1.1);ctx.beginPath();ctx.moveTo(e.x+Math.cos(a)*cell.s*.22,e.y+Math.sin(a)*cell.s*.22);ctx.lineTo(e.x+Math.cos(a)*rr,e.y+Math.sin(a)*rr);ctx.stroke();}
    }else if(e.type==='rainbow'){
      ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=Math.max(2,cell.s*.035);ctx.beginPath();ctx.arc(e.x,e.y,cell.s*(.25+p*1.1),0,Math.PI*2);ctx.stroke();
      for(let i=0;i<12;i++){const a=i*Math.PI/6+p*5;const rr=cell.s*(.35+p*.9);ctx.fillStyle=['#ffe66d','#8ee8ff','#e0a4ff','#a7ffc4'][i%4];ctx.beginPath();ctx.arc(e.x+Math.cos(a)*rr,e.y+Math.sin(a)*rr,Math.max(1.5,cell.s*.035),0,Math.PI*2);ctx.fill();}
    }else if(e.type==='fusion'){
      const R=cell.s*(.35+p*2.2);
      ctx.strokeStyle='rgba(255,255,255,.96)';ctx.lineWidth=Math.max(3,cell.s*.045);ctx.shadowColor='#d9f8ff';ctx.shadowBlur=18;
      ctx.beginPath();ctx.arc(e.x,e.y,R,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.arc(e.x,e.y,R*.55,-p*4,Math.PI*1.4-p*4);ctx.stroke();
      ctx.shadowBlur=0;
      ctx.font='900 '+Math.max(15,cell.s*.25)+'px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff4ae';
      const label=(e.a==='rainbow'&&e.b==='rainbow')?'CRYSTAL STORM':(e.a==='rainbow'||e.b==='rainbow')?(e.a==='bomb'||e.b==='bomb'?'RAINBOW BOMB':'RAINBOW LINE'):(e.a==='bomb'&&e.b==='bomb'?'MEGA BOMB':(e.a==='row'&&e.b==='col')||(e.a==='col'&&e.b==='row')?'CROSS BLAST':(e.a==='bomb'||e.b==='bomb')?'SUPER BLAST':'CROSS BLAST');
      ctx.fillText(label,e.x,e.y-cell.s*(.95+p*.15));
    }else if(e.type==='specialCreate'){
      const rr=cell.s*(.35+p*.8);ctx.strokeStyle=e.special==='rainbow'?'#fff0a0':e.special==='bomb'?'#ffd36d':'#d9f8ff';ctx.lineWidth=Math.max(2,cell.s*.035);ctx.beginPath();ctx.arc(e.x,e.y,rr,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha*=.7;ctx.beginPath();ctx.arc(e.x,e.y,rr*.55,0,Math.PI*2);ctx.stroke();
    }else{
      ctx.strokeStyle=e.combo>1?'#ffd86b':'#ffffff';ctx.lineWidth=Math.max(2,cell.s*.025);ctx.beginPath();ctx.arc(e.x,e.y,cell.s*(.18+p*.78),0,Math.PI*2);ctx.stroke();
      if(e.combo>1){ctx.font='900 '+Math.max(18,cell.s*.42)+'px system-ui';ctx.fillStyle='#ffe38a';ctx.textAlign='center';ctx.fillText('COMBO CHAIN x'+e.combo,e.x,e.y-cell.s*(.8+p*.18));}
    }
    ctx.restore();
  }
  for(const d of cascadeDrops){const p=1-d.life/d.max;ctx.save();ctx.globalAlpha=.16*(1-p);ctx.fillStyle='#bdeaff';ctx.beginPath();ctx.ellipse(d.x,d.y+(d.ty-d.y)*p,cell.s*.16,cell.s*.34*(1-p),0,0,Math.PI*2);ctx.fill();ctx.restore();}

  for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
  for(const t of toastScore){const p=1-t.life/t.max;ctx.globalAlpha=Math.max(0,1-p);ctx.fillStyle='#fff3b0';ctx.font='900 '+Math.max(14,cell.s*.28)+'px system-ui';ctx.textAlign='center';ctx.fillText(t.text,t.x,t.y-p*30)}ctx.globalAlpha=1;
  if(feedbackFlash>0){ctx.fillStyle='rgba(255,240,190,'+Math.min(.28,feedbackFlash)+')';ctx.fillRect(0,0,w,h)}
  // No global center-board pulse; visual impact stays local to matched cells.
  if(bannerT>0){
    ctx.save();
    const chipW=Math.min(w*.72,320*u),chipH=24*u,cx=w/2,cy=178*u;
    ctx.fillStyle='rgba(7,12,32,.78)';round(cx-chipW/2,cy-chipH/2,chipW,chipH,chipH/2);
    ctx.strokeStyle='rgba(255,226,154,.28)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#ffe8a7';ctx.font='900 '+Math.max(10,10.5*u)+'px system-ui';ctx.textAlign='center';ctx.fillText(banner,cx,cy+3.5*u);
    ctx.restore();
  }
  if(state==='booster-hammer'){
    ctx.save();ctx.fillStyle='rgba(8,6,22,.34)';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='rgba(255,226,154,.96)';ctx.font='900 '+Math.max(15,cell.s*.24)+'px system-ui';ctx.textAlign='center';
    ctx.fillText('🔨 CHỌN Ô MUỐN PHÁ • CHẠM NGOÀI BÀN ĐỂ HỦY',w/2,cell.y-18);
    const pulse=.55+.45*Math.sin(performance.now()/120);
    ctx.strokeStyle='rgba(255,217,105,'+pulse+')';ctx.lineWidth=Math.max(3,cell.s*.045);
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){ctx.strokeRect(cell.x+c*cell.s+5,cell.y+r*cell.s+5,cell.s-10,cell.s-10)}
    ctx.restore();
  }
  if(state==='paused')overlay(w,h,'PAUSED',['RESUME','RESTART','SAVE & MENU']);if(state==='gameover')overlay(w,h,'GAME OVER',['PLAY AGAIN','MENU']);if(state==='levelcomplete')levelCompleteOverlay(w,h);
  ctx.restore();
}
function drawCrystalBoard(){
  const bx=cell.x-8,by=cell.y-8,bw=cell.s*N+16,bh=cell.s*N+16;
  const r0=Math.max(12,cell.s*.15),r1=Math.max(9,cell.s*.105);
  ctx.save();
  // Sapphire bezel with restrained gold/champagne edging: classic match-3 look without over-decoration.
  const outer=ctx.createLinearGradient(bx,by,bx,by+bh);
  outer.addColorStop(0,'rgba(38,77,124,.98)');
  outer.addColorStop(.15,'rgba(18,40,83,.99)');
  outer.addColorStop(.62,'rgba(8,20,51,.99)');
  outer.addColorStop(1,'rgba(14,25,60,.99)');
  ctx.fillStyle=outer;
  ctx.shadowColor='rgba(44,166,255,.22)';ctx.shadowBlur=Math.max(7,cell.s*.12);
  round(bx,by,bw,bh,r0);ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(220,235,255,.36)';ctx.lineWidth=Math.max(1.15,cell.s*.017);ctx.stroke();

  const gold=ctx.createLinearGradient(bx,by,bx+bw,by+bh);
  gold.addColorStop(0,'rgba(255,226,150,.42)');
  gold.addColorStop(.20,'rgba(165,205,245,.30)');
  gold.addColorStop(.62,'rgba(90,146,205,.28)');
  gold.addColorStop(1,'rgba(255,221,142,.34)');
  ctx.strokeStyle=gold;ctx.lineWidth=Math.max(1.2,cell.s*.020);ctx.stroke();

  const innerX=bx+5,innerY=by+5,innerW=bw-10,innerH=bh-10;
  const inner=ctx.createLinearGradient(innerX,innerY,innerX,innerY+innerH);
  inner.addColorStop(0,'rgba(69,116,179,.45)');
  inner.addColorStop(.45,'rgba(34,54,103,.60)');
  inner.addColorStop(1,'rgba(7,15,39,.92)');
  ctx.fillStyle=inner;round(innerX,innerY,innerW,innerH,r1);
  ctx.strokeStyle='rgba(108,183,238,.40)';ctx.lineWidth=Math.max(1,cell.s*.012);ctx.stroke();

  const gap=Math.max(2.6,cell.s*.046),radius=Math.max(5.5,cell.s*.085);
  // One shared fill/stroke instead of 64 gradients every frame.
  ctx.fillStyle='rgba(49,79,135,.34)';
  ctx.strokeStyle='rgba(190,225,255,.14)';
  ctx.lineWidth=Math.max(.65,cell.s*.008);
  for(let rr=0;rr<N;rr++)for(let cc=0;cc<N;cc++){
    const x=cell.x+cc*cell.s+gap*.5,y=cell.y+rr*cell.s+gap*.5,cw=cell.s-gap,ch=cell.s-gap;
    round(x,y,cw,ch,radius);ctx.stroke();
  }
  const shine=ctx.createLinearGradient(bx,by,bx+bw,by);
  shine.addColorStop(0,'rgba(255,255,255,0)');
  shine.addColorStop(.24,'rgba(208,240,255,.10)');
  shine.addColorStop(.50,'rgba(255,227,161,.25)');
  shine.addColorStop(.76,'rgba(208,240,255,.10)');
  shine.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=shine;round(bx+10,by+4,bw-20,2.2,2);
  ctx.fillStyle='rgba(255,225,152,.62)';
  [[bx+7,by+7],[bx+bw-7,by+7],[bx+7,by+bh-7],[bx+bw-7,by+bh-7]].forEach(([px,py])=>{ctx.beginPath();ctx.arc(px,py,1.3,0,Math.PI*2);ctx.fill()});
  ctx.restore();
}
function menuLayout(w,h){
  const boxW=Math.min(w*.92,560),boxH=Math.min(h*.90,740),boxX=(w-boxW)/2,boxY=(h-boxH)/2;
  const pad=Math.max(18,boxW*.075),gap=Math.max(10,boxW*.026),innerW=boxW-pad*2;
  const colW=(innerW-gap)/2;
  const mainY=boxY+128,mainH=Math.min(52,h*.058);
  const rowH=Math.min(48,h*.054),rowGap=Math.min(12,h*.014),gridTop=mainY+72;
  const closeY=boxY+boxH-64;
  return {boxX,boxY,boxW,boxH,pad,gap,innerW,colW,mainY,mainH,rowH,rowGap,gridTop,closeY};
}
function menuDraw(w,h){
  const L=menuLayout(w,h),saved=hasSavedGame(),sInfo=savedGameInfo();
  const frame={boxX:L.boxX,boxY:L.boxY,boxW:L.boxW,boxH:L.boxH};
  modalFrameCustom(frame);
  ctx.textAlign='center';ctx.fillStyle='#ffe6a5';ctx.font='950 '+Math.max(27,34*(L.boxW/540))+'px system-ui';ctx.fillText('BEJEWELED',w/2,L.boxY+58);
  ctx.fillStyle='rgba(215,234,255,.72)';ctx.font='800 11px system-ui';ctx.fillText('CRYSTAL MATCH  •  8×8',w/2,L.boxY+82);
  if(saved&&sInfo){
    const when=sInfo.savedAt?new Date(sInfo.savedAt).toLocaleString([],{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'--';
    ctx.fillStyle='rgba(214,235,255,.64)';ctx.font='800 9.5px system-ui';
    ctx.fillText('SAVE  •  LV '+sInfo.level+'  •  '+sInfo.score.toLocaleString()+' PTS  •  '+sInfo.moves+' MOVES',w/2,L.boxY+103);
    ctx.fillStyle='rgba(255,225,158,.42)';ctx.font='700 8.5px system-ui';ctx.fillText('Lưu lúc '+when,w/2,L.boxY+116);
  }else{
    ctx.fillStyle='rgba(214,235,255,.50)';ctx.font='750 9.5px system-ui';ctx.fillText('CHỌN MỘT CHẾ ĐỘ ĐỂ BẮT ĐẦU',w/2,L.boxY+106);
  }
  const mainLabel=saved?'CONTINUE':'NEW GAME';
  modalAction(L.boxX+L.pad,L.mainY,L.innerW,L.mainH,mainLabel,true,saved?'▶':'✦');

  const rows=[
    ['LEVEL MAP','MISSIONS '+(missionCountDone()?'• '+missionCountDone():''),['levelmap','missions']],
    ['DAILY CHALLENGE','TUTORIAL',['daily','tutorial']],
    ['SOUND: '+(soundOn?'ON':'OFF'),'HAPTIC: '+(hapticOn?'ON':'OFF'),['sound','haptic']],
    ['SETTINGS','NEW GAME',['settings','newgame']]
  ];
  rows.forEach((row,i)=>{
    const y=L.gridTop+i*(L.rowH+L.rowGap);
    const xs=[L.boxX+L.pad,L.boxX+L.pad+L.colW+L.gap];
    row.slice(0,2).forEach((label,j)=>{
      const action=row[2][j];
      modalAction(xs[j],y,L.colW,L.rowH,label,false,action==='levelmap'?'◆':action==='missions'?'★':action==='daily'?'☀':action==='tutorial'?'▣':action==='sound'?(soundOn?'◉':'○'):action==='haptic'?(hapticOn?'◈':'◇'):action==='settings'?'⚙':'✦');
    });
  });
  modalAction(L.boxX+L.pad,L.closeY,L.innerW,48,'CLOSE',false,'×');
  ctx.fillStyle='rgba(207,228,250,.38)';ctx.font='700 8.5px system-ui';ctx.fillText('LEVEL '+mapState.unlocked+'/'+MAX_LEVELS+' UNLOCKED  •  QUALITY: '+qualityLabel(),w/2,L.closeY+64);
}
function modalFrameCustom(f){
  const {boxX,boxY,boxW,boxH}=f,r=Math.min(28,boxW*.045);
  ctx.save();ctx.fillStyle='rgba(2,6,18,.78)';ctx.fillRect(0,0,boxW+boxX*2,boxH+boxY*2);ctx.restore();
  ctx.save();
  const g=ctx.createLinearGradient(boxX,boxY,boxX,boxY+boxH);g.addColorStop(0,'rgba(15,36,73,.985)');g.addColorStop(.18,'rgba(9,25,56,.995)');g.addColorStop(1,'rgba(5,13,30,.998)');
  ctx.fillStyle=g;ctx.shadowColor='rgba(0,0,0,.48)';ctx.shadowBlur=30;round(boxX,boxY,boxW,boxH,r);ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(184,225,255,.34)';ctx.lineWidth=1.4;ctx.stroke();ctx.strokeStyle='rgba(255,224,152,.23)';ctx.lineWidth=1;ctx.stroke();
  const lx=boxX+boxW*.12,lw=boxW*.76,ly=boxY+18,lg=ctx.createLinearGradient(lx,0,lx+lw,0);lg.addColorStop(0,'rgba(255,224,152,0)');lg.addColorStop(.2,'rgba(255,224,152,.72)');lg.addColorStop(.8,'rgba(255,224,152,.72)');lg.addColorStop(1,'rgba(255,224,152,0)');
  ctx.strokeStyle=lg;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(lx+lw,ly);ctx.stroke();
  ctx.fillStyle='rgba(190,231,255,.58)';ctx.beginPath();ctx.arc(boxX+18,boxY+18,2.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(boxX+boxW-18,boxY+18,2.2,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function starString(n){return '★'.repeat(n)+'☆'.repeat(3-n)}
function levelmapLayout(w,h){
  const frame=modalFrame(w,h,{kind:'levelmap'});
  const listX=frame.boxX+frame.boxW*.07;
  const listW=frame.boxW*.86;
  const top=frame.boxY+112;
  const bottom=frame.boxY+frame.boxH-96;
  const rowH=Math.max(52,Math.min(58,frame.boxH*.078));
  const rowGap=8;
  const backY=frame.boxY+frame.boxH-68;
  const maxScroll=Math.max(0,MAX_LEVELS*(rowH+rowGap)-rowGap-(bottom-top));
  return {frame,listX,listW,top,bottom,rowH,rowGap,backY,maxScroll};
}
function levelmapDraw(w,h){
  const L=levelmapLayout(w,h);
  modalHeader(L.frame,'LEVEL MAP','CHỌN MÀN ĐÃ MỞ KHÓA  •  6 THẾ GIỚI  •  3 SAO / MÀN');
  mapScroll=Math.max(0,Math.min(L.maxScroll,mapScroll));
  ctx.save();ctx.beginPath();ctx.rect(L.listX,L.top,L.listW,L.bottom-L.top);ctx.clip();
  let lastWorld='';
  for(let l=1;l<=MAX_LEVELS;l++){
    const y=L.top+(l-1)*(L.rowH+L.rowGap)-mapScroll;
    const th=themeForLevel(l);
    if(th.vi!==lastWorld){ctx.fillStyle=th.accent;ctx.font='900 9px system-ui';ctx.textAlign='left';ctx.fillText('✦ '+th.vi.toUpperCase(),L.listX+8,y-6);lastWorld=th.vi;}
    const unlocked=isLevelUnlocked(l),done=levelStars(l)>0,sel=(selectedMapLevel===l);
    const rh=L.rowH-6;
    const grad=ctx.createLinearGradient(L.listX,y,L.listX,y+rh);
    grad.addColorStop(0,unlocked?(sel?'rgba(88,133,190,.88)':'rgba(31,51,84,.90)'):'rgba(17,24,40,.72)');
    grad.addColorStop(1,unlocked?(sel?'rgba(42,81,136,.96)':'rgba(12,25,49,.94)'):'rgba(9,14,25,.74)');
    ctx.fillStyle=grad;round(L.listX,y,L.listW,rh,14);
    ctx.strokeStyle=unlocked?(sel?'rgba(255,226,154,.62)':'rgba(173,217,255,.20)'):'rgba(255,255,255,.07)';ctx.lineWidth=1.1;ctx.stroke();
    ctx.strokeStyle='rgba(255,222,144,.10)';ctx.lineWidth=.75;ctx.stroke();
    ctx.textAlign='left';ctx.fillStyle=unlocked?'#fff4cf':'rgba(255,255,255,.28)';ctx.font='950 15px system-ui';ctx.fillText('LEVEL '+l,L.listX+14,y+21);
    ctx.fillStyle=unlocked?th.accent:'rgba(255,255,255,.18)';ctx.font='800 8px system-ui';ctx.fillText(th.vi,L.listX+L.listW*.45,y+20);
    ctx.textAlign='right';ctx.fillStyle=unlocked?'#ffd96a':'rgba(255,255,255,.18)';ctx.font='900 16px system-ui';ctx.fillText(done?starString(levelStars(l)):'🔒',L.listX+L.listW-12,y+21);
    ctx.textAlign='left';ctx.fillStyle='rgba(226,239,255,.60)';ctx.font='700 8px system-ui';ctx.fillText((objectiveForLevel(l).label||'').toUpperCase(),L.listX+14,y+38);
    ctx.textAlign='right';ctx.fillStyle='rgba(226,239,255,.44)';ctx.font='700 7.5px system-ui';ctx.fillText('ĐỘ KHÓ '+levelConfig(l).difficulty+'/10 • '+levelConfig(l).difficultyLabel,L.listX+L.listW-12,y+38);
  }
  ctx.restore();
  modalAction(L.listX,L.backY,L.listW,46,'QUAY LẠI',false,'←');
  ctx.textAlign='center';ctx.fillStyle='rgba(207,228,250,.40)';ctx.font='700 8px system-ui';ctx.fillText('Vuốt lên / xuống hoặc dùng con lăn để xem các màn',w/2,L.frame.boxY+L.frame.boxH-20);
}
function missionLayout(w,h){
  const frame=modalFrame(w,h,{kind:'missions'});
  const innerX=frame.boxX+frame.boxW*.07, innerW=frame.boxW*.86;
  const top=frame.boxY+112, rowH=Math.max(68,Math.min(88,frame.boxH*.112)), gap=8;
  const actionsY=frame.boxY+frame.boxH-62;
  return {frame,innerX,innerW,top,rowH,gap,actionsY};
}
function missionDraw(w,h){
  const L=missionLayout(w,h);
  modalHeader(L.frame,'MISSIONS','HOÀN THÀNH NHIỆM VỤ  •  NHẬN BOOSTER  •  TIẾN ĐỘ TỰ ĐỘNG LƯU');
  missionState.active.forEach((m,i)=>{
    const y=L.top+i*(L.rowH+L.gap),done=missionDone(m),canClaim=done&&missionRewardAvailable(m);
    const g=ctx.createLinearGradient(L.innerX,y,L.innerX,y+L.rowH);
    g.addColorStop(0,done?(canClaim?'rgba(77,66,111,.96)':'rgba(58,62,63,.94)'):'rgba(23,35,60,.94)');
    g.addColorStop(1,done?(canClaim?'rgba(39,35,70,.98)':'rgba(22,29,43,.98)'):'rgba(10,22,45,.98)');
    ctx.fillStyle=g;round(L.innerX,y,L.innerW,L.rowH,15);
    ctx.strokeStyle=done?(canClaim?'rgba(255,225,146,.48)':'rgba(255,225,146,.22)'):'rgba(174,216,255,.17)';ctx.lineWidth=1.1;ctx.stroke();
    ctx.textAlign='left';ctx.fillStyle=done?'#ffe29a':'#f3f7ff';ctx.font='950 12.5px system-ui';ctx.fillText((m.icon||'◆')+'  '+m.label,L.innerX+14,y+22);
    const pr=Math.min(1,m.progress/Math.max(1,m.target));
    const bx=L.innerX+14,by=y+35,bw=L.innerW*.55,bh=7;
    ctx.fillStyle='rgba(0,0,0,.36)';round(bx,by,bw,bh,4);
    if(pr>0){const pg=ctx.createLinearGradient(bx,by,bx+bw*pr,by);pg.addColorStop(0,'#5fc9ff');pg.addColorStop(1,'#ffdc7a');ctx.fillStyle=pg;round(bx,by,bw*pr,bh,4);}
    ctx.fillStyle='rgba(223,238,255,.62)';ctx.font='700 8.5px system-ui';ctx.fillText(Math.floor(m.progress)+' / '+m.target,bx,by+17);
    ctx.fillStyle='#ffe29a';ctx.font='850 8.5px system-ui';ctx.fillText('THƯỞNG  •  '+missionRewardText(m.reward),bx,y+69);
    if(done){modalAction(L.innerX+L.innerW*.70,y+18,L.innerW*.25,38,canClaim?'NHẬN':'ĐẦY',canClaim,canClaim?'✓':'•');}
    else{ctx.textAlign='right';ctx.fillStyle='rgba(223,238,255,.34)';ctx.font='800 8px system-ui';ctx.fillText('ĐANG THỰC HIỆN',L.innerX+L.innerW-14,y+23);}
  });
  const claimable=missionCountClaimable();
  modalAction(L.innerX,L.actionsY,L.innerW*.42,44,'NHẬN TẤT CẢ'+(claimable?' ×'+claimable:''),claimable>0,'✓');
  modalAction(L.innerX+L.innerW*.47,L.actionsY,L.innerW*.53,44,'QUAY LẠI',false,'←');
  ctx.textAlign='center';ctx.fillStyle='rgba(207,228,250,.40)';ctx.font='700 8px system-ui';ctx.fillText(claimable+' nhiệm vụ có thể nhận • Booster tối đa '+BOOSTER_MAX+' mỗi loại',w/2,L.frame.boxY+L.frame.boxH-20);
  if(missionFlash>0){ctx.globalAlpha=Math.min(.22,missionFlash);ctx.fillStyle='#ffe9a5';ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;}
}

function levelCompleteOverlay(w,h){
  ctx.fillStyle='rgba(0,0,0,.64)';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='rgba(35,15,45,.98)';round(w*.13,h*.24,w*.74,h*.48,24);
  ctx.fillStyle='#ffe299';ctx.font='900 27px system-ui';ctx.textAlign='center';ctx.fillText('LEVEL '+level+' COMPLETE!',w/2,h*.34);
  ctx.fillStyle=themeForLevel(level).accent;ctx.font='900 11px system-ui';ctx.fillText(themeForLevel(level).vi+' • '+themeForLevel(level).name,w/2,h*.375);
  ctx.fillStyle='#ffd96a';ctx.font='900 38px system-ui';ctx.fillText(starString(levelStars(level)),w/2,h*.43);
  ctx.fillStyle='#fff';ctx.font='800 15px system-ui';ctx.fillText('SCORE  '+score,w/2,h*.48);
  ctx.fillStyle='rgba(255,255,255,.58)';ctx.font='700 11px system-ui';ctx.fillText(moves+' MOVES LEFT',w/2,h*.515);
  button(w*.25,h*.57,w*.50,42,level<MAX_LEVELS?'NEXT LEVEL':'LEVEL MAP',true);
  button(w*.25,h*.64,w*.50,42,'LEVEL MAP',false);
}

function dailyDraw(w,h){
  ctx.fillStyle='rgba(8,9,28,.97)';round(w*.055,h*.055,w*.89,h*.89,24);
  ctx.fillStyle='#ffe299';ctx.font='900 29px system-ui';ctx.textAlign='center';ctx.fillText('DAILY CHALLENGE',w/2,h*.13);
  const cfg=dailyConfig||dailyBuild();
  ctx.fillStyle='rgba(255,255,255,.58)';ctx.font='700 10px system-ui';ctx.fillText(cfg.date+' • đổi mới mỗi ngày',w/2,h*.17);
  ctx.fillStyle=cfg.obstacle?'#8cefff':'#bfffc7';ctx.font='900 12px system-ui';ctx.fillText(cfg.obstacle?('OBSTACLE: '+cfg.obstacle.toUpperCase()):'CRYSTAL BOARD',w/2,h*.23);
  ctx.fillStyle='#fff';ctx.font='900 20px system-ui';ctx.fillText(cfg.label,w/2,h*.30);
  ctx.fillStyle='rgba(255,255,255,.62)';ctx.font='700 11px system-ui';ctx.fillText(cfg.moves+' MOVES • REWARD: '+missionRewardText(cfg.reward),w/2,h*.35);
  ctx.fillStyle=dailyState.completed?'#bfffc7':'#ffe29a';ctx.font='900 14px system-ui';ctx.fillText(dailyState.completed?'✓ COMPLETED TODAY':'READY TO PLAY',w/2,h*.44);
  ctx.fillStyle='rgba(255,255,255,.52)';ctx.font='700 10px system-ui';ctx.fillText('Best score: '+dailyState.bestScore+' • Attempts: '+dailyState.attempts,w/2,h*.49);
  ctx.fillStyle='#ffd96a';ctx.font='900 17px system-ui';ctx.fillText('🔥 '+streakState.current+' DAY STREAK',w/2,h*.535);
  const sn=streakDaysUntilNext();
  ctx.fillStyle='rgba(255,255,255,.48)';ctx.font='700 9px system-ui';ctx.fillText('Best '+streakState.best+' • '+streakStatus(),w/2,h*.56);
  ctx.fillStyle='rgba(255,255,255,.38)';ctx.font='700 9px system-ui';ctx.fillText(sn.target?'CÒN '+sn.remaining+' NGÀY → MỐC '+sn.target:'TẤT CẢ MỐC ĐÃ MỞ KHÓA',w/2,h*.585);
  button(w*.20,h*.615,w*.60,46,dailyState.completed?'COMPLETED':'PLAY DAILY',!dailyState.completed);
  button(w*.20,h*.705,w*.60,46,'BACK',true);
  ctx.fillStyle='rgba(255,255,255,.32)';ctx.font='700 8px system-ui';ctx.fillText('Hoàn thành Daily mỗi ngày để duy trì Streak. Mốc thưởng chỉ nhận 1 lần.',w/2,h*.80);
}
function dailyCompleteDraw(w,h){
  ctx.fillStyle='rgba(12,8,30,.97)';round(w*.06,h*.08,w*.88,h*.84,24);
  ctx.fillStyle='#ffe299';ctx.font='900 30px system-ui';ctx.textAlign='center';ctx.fillText('DAILY COMPLETE!',w/2,h*.22);
  ctx.fillStyle='#bfffc7';ctx.font='900 15px system-ui';ctx.fillText('THỬ THÁCH HÔM NAY ĐÃ HOÀN THÀNH',w/2,h*.29);
  ctx.fillStyle='#fff';ctx.font='900 22px system-ui';ctx.fillText('SCORE  '+score,w/2,h*.39);
  ctx.fillStyle='rgba(255,255,255,.62)';ctx.font='700 11px system-ui';ctx.fillText('BEST  '+dailyState.bestScore+' • REWARD CLAIMED',w/2,h*.46);
  ctx.fillStyle='#ffd96a';ctx.font='900 20px system-ui';ctx.fillText('🔥 '+streakState.current+' DAY STREAK',w/2,h*.53);
  ctx.fillStyle='rgba(255,255,255,.55)';ctx.font='700 10px system-ui';ctx.fillText('BEST STREAK  '+streakState.best+' DAYS • '+streakStatus(),w/2,h*.57);
  const sn=streakDaysUntilNext();
  if(streakMilestone){ctx.fillStyle='#bfffc7';ctx.font='900 11px system-ui';ctx.fillText('MILESTONE '+streakMilestone+' • '+streakRewardText(streakMilestone),w/2,h*.61);}
  ctx.fillStyle='rgba(255,255,255,.42)';ctx.font='700 9px system-ui';ctx.fillText(sn.target?'NEXT MILESTONE: '+sn.target+' DAYS • CÒN '+sn.remaining:'ALL MILESTONES UNLOCKED',w/2,h*.65);
  button(w*.22,h*.70,w*.56,44,'BACK TO MENU',true);
}

function tutorialLayout(w,h){
  const frame=modalFrame(w,h,{kind:'tutorial'});
  const pad=frame.boxW*.075;
  const visualY=frame.boxY+frame.boxH*.30;
  const visualS=Math.min(52,frame.boxW*.12);
  const navY=frame.boxY+frame.boxH-72;
  return {frame,pad,visualY,visualS,navY};
}
function drawTutorialMiniBoard(L,st,w,h){
  const cx=w/2,cy=L.visualY,s=L.visualS,gap=s*.13,total=s*3+gap*2,left=cx-total/2;
  const kinds=st.board||[4,4,4,1,1,1,2,3,5];
  ctx.save();ctx.fillStyle='rgba(12,27,58,.88)';round(left-13,cy-total/2-13,total+26,total+26,18);
  ctx.strokeStyle='rgba(190,226,255,.24)';ctx.lineWidth=1;ctx.stroke();
  for(let r=0;r<3;r++)for(let c=0;c<3;c++){
    const x=left+c*(s+gap),y=cy-total/2+r*(s+gap);
    ctx.fillStyle='rgba(72,106,161,.30)';round(x,y,s,s,9);ctx.strokeStyle='rgba(188,222,255,.12)';ctx.stroke();
    const g={kind:kinds[r*3+c]??4,special:'',obstacle:'',alpha:1,scale:1,x:x+s/2,y:y+s/2};
    if(st.highlight?.includes(r*3+c)){ctx.save();ctx.strokeStyle='#ffe29a';ctx.lineWidth=2.4;ctx.shadowColor='#ffd56b';ctx.shadowBlur=performanceProfile().shadow>.35?7:0;ctx.strokeRect(x+3,y+3,s-6,s-6);ctx.restore();}
    drawGem(g,r,c);
  }
  ctx.restore();
}
function tutorialDraw(w,h){
  const L=tutorialLayout(w,h),st=TUTORIAL_STEPS[tutorialStep];
  modalHeader(L.frame,'HƯỚNG DẪN '+(tutorialStep+1)+' / '+TUTORIAL_STEPS.length,'BEJEWELED  •  NHỮNG ĐIỀU CẦN BIẾT','gold');
  const {boxX,boxY,boxW,boxH}=L.frame;ctx.textAlign='center';
  ctx.fillStyle='#fff0c2';ctx.font='950 '+Math.max(18,boxW*.052)+'px system-ui';ctx.fillText(st.title,w/2,boxY+88);
  drawTutorialMiniBoard(L,st,w,h);
  ctx.fillStyle='rgba(226,239,255,.88)';ctx.font='750 '+Math.max(11,boxW*.028)+'px system-ui';
  wrapText(st.body,w/2,boxY+boxH*.47,boxW*.76,Math.max(11,boxW*.028),1.42);
  ctx.fillStyle='rgba(255,224,154,.62)';ctx.font='700 '+Math.max(9,boxW*.022)+'px system-ui';
  wrapText(st.hint,w/2,boxY+boxH*.59,boxW*.72,Math.max(9,boxW*.022),1.35);
  for(let i=0;i<TUTORIAL_STEPS.length;i++){ctx.beginPath();ctx.fillStyle=i===tutorialStep?'#ffe29a':'rgba(185,215,245,.24)';ctx.arc(w/2+(i-(TUTORIAL_STEPS.length-1)/2)*15,boxY+boxH*.68,i===tutorialStep?4:2.7,0,Math.PI*2);ctx.fill();}
  modalAction(boxX+L.pad,L.navY,(boxW-L.pad*2)*.42,46,tutorialStep===0?'BỎ QUA':'QUAY LẠI',false,'‹');
  modalAction(boxX+L.pad+(boxW-L.pad*2)*.48,L.navY,(boxW-L.pad*2)*.52,46,tutorialStep===TUTORIAL_STEPS.length-1?'BẮT ĐẦU':'TIẾP THEO',true,tutorialStep===TUTORIAL_STEPS.length-1?'▶':'›');
  ctx.fillStyle='rgba(202,225,250,.34)';ctx.font='700 '+Math.max(8,boxW*.018)+'px system-ui';ctx.fillText('Có thể xem lại bất cứ lúc nào trong Cài đặt.',w/2,boxY+boxH-14);
}

function wrapText(text,x,y,maxW,fontSize,lineH){
  ctx.font='700 '+fontSize+'px system-ui';ctx.textAlign='center';
  const words=String(text).split(' ');let line='',lines=[];
  for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxW&&line){lines.push(line);line=word}else line=test}
  if(line)lines.push(line);
  lines.forEach((ln,i)=>ctx.fillText(ln,x,y+i*fontSize*lineH));
}

function settingsDraw(w,h){
  ctx.fillStyle='rgba(18,10,34,.97)';round(w*.06,h*.06,w*.88,h*.88,24);
  ctx.fillStyle='#ffe299';ctx.font='900 29px system-ui';ctx.textAlign='center';ctx.fillText('SETTINGS',w/2,h*.115);
  ctx.fillStyle='rgba(255,255,255,.45)';ctx.font='700 9px system-ui';ctx.fillText('Cấu hình game • âm thanh • phản hồi • hiệu năng',w/2,h*.145);
  const rows=[
    ['quality','HIGH • MAX EFFECTS',qualityMode==='high'],
    ['quality','BALANCED • CÂN BẰNG',qualityMode==='balanced'],
    ['quality','PERFORMANCE • TỐI ƯU FPS',qualityMode==='performance'],
    ['sound','🔊 SOUND: '+(soundOn?'ON':'OFF'),soundOn],
    ['haptic','📳 HAPTIC: '+(hapticOn?'ON':'OFF'),hapticOn],
    ['fps','FPS COUNTER: '+(showFps?'ON':'OFF'),showFps],
    ['adaptive','AUTO PERFORMANCE: '+(adaptivePerformance?'ON':'OFF'),adaptivePerformance],
    ['motion','REDUCED MOTION: '+(reducedMotion?'ON':'OFF'),reducedMotion]
  ];
  const y0=.205,step=.074;
  rows.forEach((r,i)=>{
    const y=h*(y0+i*step);
    button(w*.16,y,w*.68,35,r[1],r[2]);
  });
  button(w*.06,h*.805,w*.22,37,'🎵 MUSIC',true);
  button(w*.30,h*.805,w*.22,37,'📖 TUTORIAL',true);
  button(w*.54,h*.805,w*.18,37,'📳 TEST',true);
  button(w*.74,h*.805,w*.20,37,'RESET',true);
  button(w*.16,h*.875,w*.68,36,'BACK',true);
  const pp=performanceProfile();
  ctx.fillStyle='rgba(255,255,255,.32)';ctx.font='700 8px system-ui';
  ctx.fillText('FPS '+Math.round(fps)+' • DPR '+pixelRatio.toFixed(2)+' • '+qualityLabel()+' • '+(adaptivePerformance?(perfPressure>.35?'ADAPTIVE':'STABLE'):'MANUAL'),w/2,h*.935);
  ctx.fillStyle='rgba(255,226,154,.58)';ctx.font='700 8px system-ui';ctx.fillText('📳 '+hapticCapabilityLabel()+' • HAPTIC '+(hapticOn?'ON':'OFF'),w/2,h*.955);
}
function modalFrame(w,h,opts={}){
  const kind=opts.kind||'default';
  const full=opts.full!==false;
  const boxW=Math.min(w*.88,540);
  const tallModal=['booster','missions','levelmap'].includes(kind);
  const boxH=Math.min(h*(tallModal?.84:.62),680);
  const boxX=(w-boxW)/2;
  const boxY=kind==='pause'?h*.19:(h-boxH)/2;
  const radius=Math.min(26,w*.045);
  ctx.save();
  ctx.fillStyle='rgba(2,7,20,.66)';
  ctx.fillRect(0,0,w,h);
  ctx.fillStyle='rgba(0,0,0,.16)';
  ctx.fillRect(0,0,w,h);
  const g=ctx.createLinearGradient(boxX,boxY,boxX,boxY+boxH);
  g.addColorStop(0,'rgba(19,39,77,.985)');
  g.addColorStop(.22,'rgba(9,24,52,.985)');
  g.addColorStop(1,'rgba(6,12,29,.992)');
  ctx.fillStyle=g;
  ctx.shadowColor='rgba(0,0,0,.40)';ctx.shadowBlur=26;
  round(boxX,boxY,boxW,boxH,radius);ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(176,221,255,.28)';ctx.lineWidth=1.4;ctx.stroke();
  ctx.strokeStyle='rgba(255,222,144,.22)';ctx.lineWidth=1;ctx.stroke();
  // Top jewel line
  const lx=boxX+boxW*.11, ly=boxY+18, lw=boxW*.78;
  const lg=ctx.createLinearGradient(lx,ly,lx+lw,ly);
  lg.addColorStop(0,'rgba(255,220,145,0)');lg.addColorStop(.18,'rgba(255,220,145,.65)');lg.addColorStop(.82,'rgba(255,220,145,.65)');lg.addColorStop(1,'rgba(255,220,145,0)');
  ctx.strokeStyle=lg;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(lx+lw,ly);ctx.stroke();
  // Corner glints
  ctx.fillStyle='rgba(188,229,255,.55)';ctx.beginPath();ctx.arc(boxX+18,boxY+18,2.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(boxX+boxW-18,boxY+18,2.2,0,Math.PI*2);ctx.fill();
  ctx.restore();
  return {boxX,boxY,boxW,boxH,radius};
}
function modalHeader(frame,title,subtitle,accent='gold'){
  const {boxX,boxY,boxW}=frame;
  ctx.textAlign='center';
  ctx.fillStyle=accent==='cyan'?'#dff7ff':'#ffe6a5';
  ctx.font='950 '+Math.max(24,29*(boxW/540))+'px system-ui';
  ctx.fillText(title,boxX+boxW/2,boxY+62);
  if(subtitle){
    ctx.fillStyle='rgba(219,237,255,.62)';
    ctx.font='750 '+Math.max(10,11*(boxW/540))+'px system-ui';
    ctx.fillText(subtitle,boxX+boxW/2,boxY+88);
  }
}
function modalAction(x,y,w,h,label,primary=false,icon=''){
  ctx.save();
  const grad=ctx.createLinearGradient(x,y,x,y+h);
  if(primary){
    grad.addColorStop(0,'rgba(105,193,255,.98)');
    grad.addColorStop(.5,'rgba(49,127,205,.98)');
    grad.addColorStop(1,'rgba(24,69,133,.99)');
  }else{
    grad.addColorStop(0,'rgba(43,65,100,.96)');
    grad.addColorStop(.5,'rgba(21,38,70,.98)');
    grad.addColorStop(1,'rgba(11,22,45,.99)');
  }
  ctx.fillStyle=grad;round(x,y,w,h,13);
  ctx.strokeStyle=primary?'rgba(240,251,255,.55)':'rgba(175,217,255,.22)';ctx.lineWidth=1.15;ctx.stroke();
  ctx.strokeStyle='rgba(255,221,146,.15)';ctx.lineWidth=.8;ctx.stroke();
  if(primary){ctx.fillStyle='rgba(255,255,255,.10)';round(x+1,y+1,w-2,h*.34,11)}
  ctx.fillStyle='#fff';ctx.font='950 '+Math.max(12,14*(w/300))+'px system-ui';ctx.textAlign='center';
  ctx.fillText((icon?icon+'  ':'')+label,x+w/2,y+h/2+5);
  ctx.restore();
}
function modalCard(x,y,w,h,title,subtitle,count,icon,active=true){
  ctx.save();
  const g=ctx.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,active?'rgba(47,76,117,.92)':'rgba(26,36,57,.72)');
  g.addColorStop(1,active?'rgba(14,29,56,.98)':'rgba(15,22,36,.88)');
  ctx.fillStyle=g;round(x,y,w,h,16);
  ctx.strokeStyle=active?'rgba(172,218,255,.26)':'rgba(255,255,255,.10)';ctx.lineWidth=1.1;ctx.stroke();
  ctx.strokeStyle='rgba(255,223,148,.12)';ctx.lineWidth=.8;ctx.stroke();
  const cx=x+30,cy=y+h/2;
  ctx.fillStyle=active?'rgba(83,154,219,.18)':'rgba(255,255,255,.05)';ctx.beginPath();ctx.arc(cx,cy,22,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=active?'rgba(171,221,255,.30)':'rgba(255,255,255,.08)';ctx.stroke();
  ctx.font='900 23px system-ui';ctx.textAlign='center';ctx.fillStyle=active?'#ffe39c':'rgba(255,255,255,.35)';ctx.fillText(icon,cx,cy+8);
  ctx.textAlign='left';ctx.fillStyle=active?'#fff':'rgba(255,255,255,.42)';ctx.font='950 13px system-ui';ctx.fillText(title,x+62,y+23);
  ctx.fillStyle=active?'rgba(218,235,255,.60)':'rgba(255,255,255,.30)';ctx.font='700 9px system-ui';ctx.fillText(subtitle,x+62,y+41);
  const pw=Math.min(74,w*.19),ph=30,px=x+w-pw-14,py=y+(h-ph)/2;
  const pg=ctx.createLinearGradient(px,py,px,py+ph);pg.addColorStop(0,active?'rgba(255,220,142,.24)':'rgba(255,255,255,.07)');pg.addColorStop(1,active?'rgba(255,220,142,.10)':'rgba(255,255,255,.04)');ctx.fillStyle=pg;round(px,py,pw,ph,12);ctx.strokeStyle=active?'rgba(255,220,142,.22)':'rgba(255,255,255,.08)';ctx.stroke();
  ctx.fillStyle=active?'#ffe39c':'rgba(255,255,255,.30)';ctx.font='950 18px system-ui';ctx.textAlign='center';ctx.fillText('×'+count,px+pw/2,py+21);
  ctx.restore();
}
function boostersLayout(w,h){
  const boxW=Math.min(w*.92,560),boxH=Math.min(h*.86,680),boxX=(w-boxW)/2,boxY=(h-boxH)/2;
  const pad=Math.max(18,boxW*.075),innerX=boxX+pad,innerW=boxW-pad*2;
  const rowH=Math.min(76,h*.088),gap=Math.min(16,h*.018),top=boxY+132,backY=boxY+boxH-64;
  return {boxX,boxY,boxW,boxH,pad,innerX,innerW,rowH,gap,top,backY};
}
function boosterDraw(w,h){
  const L=boostersLayout(w,h),frame={boxX:L.boxX,boxY:L.boxY,boxW:L.boxW,boxH:L.boxH};
  modalFrameCustom(frame);
  ctx.textAlign='center';ctx.fillStyle='#ffe6a5';ctx.font='950 '+Math.max(27,34*(L.boxW/540))+'px system-ui';ctx.fillText('BOOSTERS',w/2,L.boxY+60);
  ctx.fillStyle='rgba(214,235,255,.60)';ctx.font='800 10px system-ui';ctx.fillText('Hành trang hỗ trợ  •  tối đa 9 mỗi loại',w/2,L.boxY+86);
  ctx.fillStyle='rgba(255,224,152,.50)';ctx.font='750 9px system-ui';ctx.fillText('CHẠM VÀO BOOSTER ĐỂ SỬ DỤNG',w/2,L.boxY+104);
  const items=[['hammer','🔨','HAMMER','Phá 1 ô hoặc vật cản'],['shuffle','🔀','SHUFFLE','Xáo trộn toàn bộ bàn'],['moves','＋','+5 MOVES','Thêm 5 lượt chơi']];
  items.forEach((it,i)=>{
    const y=L.top+i*(L.rowH+L.gap),count=clampBooster(boosters[it[0]]),active=count>0&&moves>0;
    modalCard(L.innerX,y,L.innerW,L.rowH,it[2],it[3],count,it[1],active);
    if(!active){ctx.textAlign='right';ctx.fillStyle='rgba(255,225,170,.34)';ctx.font='800 8px system-ui';ctx.fillText(count<=0?'HẾT':'KHÓA KHI HẾT LƯỢT',L.innerX+L.innerW-16,y+L.rowH-10)}
  });
  modalAction(L.innerX,L.backY,L.innerW,48,'QUAY LẠI',false,'←');
  ctx.textAlign='center';ctx.fillStyle='rgba(206,226,250,.40)';ctx.font='700 8.5px system-ui';ctx.fillText('Booster chỉ trừ khi thao tác hợp lệ • Hammer: chọn ô sau khi mở',w/2,L.backY+62);
}

function hud(w){
  const u=cell.s/72;
  const panelX=10*u,panelY=45*u,panelW=w-20*u,panelH=126*u;
  ctx.save();
  const shell=ctx.createLinearGradient(panelX,panelY,panelX,panelY+panelH);
  shell.addColorStop(0,'rgba(10,23,53,.95)');shell.addColorStop(.48,'rgba(8,16,40,.95)');shell.addColorStop(1,'rgba(11,11,34,.97)');
  ctx.fillStyle=shell;ctx.shadowColor='rgba(0,0,0,.34)';ctx.shadowBlur=14;round(panelX,panelY,panelW,panelH,17*u);ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(190,227,255,.36)';ctx.lineWidth=1.15;ctx.stroke();
  ctx.strokeStyle='rgba(255,221,145,.24)';ctx.lineWidth=Math.max(.8,cell.s*.011);ctx.stroke();

  const innerX=panelX+6*u,innerY=panelY+6*u,innerW=panelW-12*u,statGap=5*u,statW=(innerW-statGap*2)/3,statH=48*u;
  const stats=[['SCORE',score,'#ffe09a'],['MOVES',moves,moves<=5?'#ffd56e':'#e4f4ff'],['LEVEL',level,themePalette().accent2||'#bdeeff']];
  stats.forEach((it,i)=>{
    const x=innerX+i*(statW+statGap);
    const sg=ctx.createLinearGradient(x,innerY,x,innerY+statH);
    sg.addColorStop(0,'rgba(45,76,126,.62)');sg.addColorStop(.18,'rgba(27,48,92,.78)');sg.addColorStop(1,'rgba(11,22,52,.90)');
    ctx.fillStyle=sg;round(x,innerY,statW,statH,12*u);
    ctx.strokeStyle='rgba(171,218,255,.22)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='rgba(218,238,255,.64)';ctx.font='900 '+Math.max(8.5,8.9*u)+'px system-ui';ctx.textAlign='center';ctx.fillText(it[0],x+statW/2,innerY+15*u);
    ctx.fillStyle=it[2];ctx.font='950 '+Math.max(18.5,19.5*u)+'px system-ui';ctx.fillText(String(it[1]),x+statW/2,innerY+36*u);
    ctx.fillStyle='rgba(255,225,159,.30)';round(x+12*u,innerY+statH-4*u,statW-24*u,1.25*u,.62*u);
  });

  const barX=innerX+1*u,barY=innerY+54*u,barW=innerW-2*u,barH=7*u;
  ctx.fillStyle='rgba(0,0,0,.40)';round(barX,barY,barW,barH,3.5*u);
  const pw=barW*Math.min(1,Math.max(0,progress));
  if(pw>0){const pg=ctx.createLinearGradient(barX,barY,barX+Math.max(1,pw),barY);pg.addColorStop(0,'#5cc9ff');pg.addColorStop(.60,'#a9eaff');pg.addColorStop(1,'#ffdc7c');ctx.fillStyle=pg;round(barX,barY,pw,barH,3.5*u);}
  ctx.textAlign='left';ctx.fillStyle='rgba(232,244,255,.70)';ctx.font='900 '+Math.max(8.2,8.6*u)+'px system-ui';ctx.fillText('LEVEL '+level+'  •  '+Math.round(progress*levelTarget())+'/'+levelTarget(),barX,barY+15*u);
  ctx.textAlign='right';ctx.fillStyle='rgba(255,225,162,.67)';ctx.fillText(Math.round(progress*100)+'%',barX+barW,barY+15*u);

  const capY=innerY+76*u,capH=25*u;
  ctx.fillStyle='rgba(29,47,82,.72)';round(innerX,capY,innerW,capH,capH/2);ctx.strokeStyle='rgba(255,220,143,.22)';ctx.lineWidth=1;ctx.stroke();
  const op=objective.type==='score'?Math.min(score,objective.target):Math.min(objectiveProgress,objective.target);
  ctx.textAlign='center';ctx.fillStyle='#ffe6ab';ctx.font='900 '+Math.max(8.8,9.5*u)+'px system-ui';ctx.fillText('🎯  '+objective.label+'  '+op+'/'+objective.target,w/2,capY+16.2*u);
  ctx.fillStyle='rgba(211,234,255,.56)';ctx.font='850 '+Math.max(8,8.5*u)+'px system-ui';ctx.fillText('✦ '+themePalette().vi+'  •  '+themePalette().name,w/2,capY+34*u);

  if(chainActive&&combo>0){
    const cw=Math.min(w*.46,176*u),ch=20*u,cx=w/2,cy=panelY+112*u;ctx.fillStyle='rgba(102,74,23,.30)';round(cx-cw/2,cy-ch/2,cw,ch,ch/2);ctx.strokeStyle='rgba(255,225,137,.32)';ctx.stroke();ctx.fillStyle='#ffe39a';ctx.font='900 '+Math.max(8.3,9.1*u)+'px system-ui';ctx.fillText('🔥 CHAIN x'+combo+'  •  '+Math.round(comboMultiplier(combo)*10)/10+'×',cx,cy+3*u);
  }else if(nearMiss&&nearMissT>0){ctx.fillStyle='#ffe38a';ctx.font='900 '+Math.max(8.5,9.2*u)+'px system-ui';ctx.fillText('✨ ALMOST COMBO',w/2,panelY+114*u)}

  const by=cell.y+cell.s*N+13*u,gap=6*u,bw=(w-30*u-gap*4)/5,bh=43*u;
  gameButton(9*u,by,bw,bh,'💡','HINT');
  gameButton(9*u+(bw+gap),by,bw,bh,'↩',undoAvailable?'UNDO ×1':(undoUsed?'UNDO ✓':'UNDO'));
  gameButton(9*u+(bw+gap)*2,by,bw,bh,'⚡','BOOST');
  gameButton(9*u+(bw+gap)*3,by,bw,bh,soundOn?'🔊':'🔇','SOUND');
  gameButton(9*u+(bw+gap)*4,by,bw,bh,'☰','MENU');
  ctx.textAlign='right';ctx.fillStyle='rgba(228,243,255,.46)';if(showFps){ctx.font='800 '+Math.max(7.5,8.2*u)+'px system-ui';ctx.fillText(Math.round(fps)+' FPS',w-12*u,16*u)}
  ctx.textAlign='center';ctx.fillStyle='rgba(215,232,255,.30)';ctx.font='750 '+Math.max(7.2,7.7*u)+'px system-ui';ctx.fillText('SWIPE  •  TAP  •  MATCH LOCAL',w/2,by+bh+25*u);
  ctx.restore();
}
function overlay(w,h,title,buttons){
  const isPause=title==='PAUSED';
  const boxW=Math.min(w*.78,480);
  const boxH=isPause?Math.min(h*.60,575):Math.min(h*.48,460);
  const boxX=(w-boxW)/2;
  const boxY=isPause?h*.18:(h-boxH)/2;
  // unified backdrop
  ctx.save();ctx.fillStyle='rgba(2,6,18,.70)';ctx.fillRect(0,0,w,h);ctx.restore();
  ctx.save();
  const g=ctx.createLinearGradient(boxX,boxY,boxX,boxY+boxH);
  g.addColorStop(0,'rgba(20,43,82,.985)');g.addColorStop(.18,'rgba(10,25,56,.99)');g.addColorStop(1,'rgba(7,13,31,.995)');
  ctx.fillStyle=g;ctx.shadowColor='rgba(0,0,0,.42)';ctx.shadowBlur=26;round(boxX,boxY,boxW,boxH,22);ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(176,221,255,.30)';ctx.lineWidth=1.35;ctx.stroke();
  ctx.strokeStyle='rgba(255,220,145,.23)';ctx.lineWidth=1;ctx.stroke();
  const lx=boxX+boxW*.12,lw=boxW*.76;const lg=ctx.createLinearGradient(lx,0,lx+lw,0);lg.addColorStop(0,'rgba(255,221,145,0)');lg.addColorStop(.2,'rgba(255,221,145,.72)');lg.addColorStop(.8,'rgba(255,221,145,.72)');lg.addColorStop(1,'rgba(255,221,145,0)');ctx.strokeStyle=lg;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(lx,boxY+17);ctx.lineTo(lx+lw,boxY+17);ctx.stroke();
  ctx.restore();
  ctx.textAlign='center';ctx.fillStyle='#ffe7a4';ctx.font='950 '+Math.max(27,33*(w/DESIGN_W))+'px system-ui';ctx.fillText(title,w/2,boxY+67);
  if(isPause){
    ctx.fillStyle='rgba(214,233,255,.55)';ctx.font='750 '+Math.max(10,11*(w/DESIGN_W))+'px system-ui';
    ctx.fillText(lastSaveAt?'LAST SAVE  '+new Date(lastSaveAt).toLocaleTimeString():'NOT SAVED',w/2,boxY+101);
    ctx.fillStyle='rgba(181,214,247,.30)';ctx.font='700 '+Math.max(9,9.5*(w/DESIGN_W))+'px system-ui';ctx.fillText('Màn chơi đang tạm dừng • tiến trình vẫn được giữ nguyên',w/2,boxY+124);
  }else{
    ctx.fillStyle='rgba(214,233,255,.60)';ctx.font='800 14px system-ui';ctx.fillText('SCORE  '+score,w/2,boxY+105);
    ctx.fillStyle='rgba(181,214,247,.48)';ctx.font='700 10px system-ui';ctx.fillText('GOAL  •  '+objective.label,w/2,boxY+126);
  }
  const bx=boxX+boxW*.12,bw=boxW*.76,bh=isPause?50:52,gap=isPause?18:20;
  const firstY=isPause?boxY+boxH*.44:boxY+boxH*.50;
  buttons.forEach((b,i)=>modalAction(bx,firstY+i*(bh+gap),bw,bh,b,i===0,i===0?(isPause?'▶':'↻'):''));
}
function button(x,y,w,h,t,p){
  ctx.save();
  const g=ctx.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,p?'rgba(226,126,255,.98)':'rgba(75,101,143,.80)');g.addColorStop(1,p?'rgba(151,59,216,.98)':'rgba(26,39,67,.96)');
  ctx.fillStyle=g;round(x,y,w,h,14);ctx.strokeStyle=p?'rgba(255,237,192,.54)':'rgba(195,221,255,.23)';ctx.lineWidth=1.05;ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='900 13px system-ui';ctx.textAlign='center';ctx.fillText(t,x+w/2,y+h/2+4.5);
  ctx.restore();
}
function gameButton(x,y,w,h,icon,label){
  ctx.save();
  const grad=ctx.createLinearGradient(x,y,x,y+h);grad.addColorStop(0,'rgba(40,65,105,.97)');grad.addColorStop(.46,'rgba(17,30,63,.99)');grad.addColorStop(1,'rgba(8,13,34,.99)');
  ctx.fillStyle=grad;round(x,y,w,h,13);ctx.strokeStyle='rgba(182,221,255,.28)';ctx.lineWidth=1;ctx.stroke();ctx.strokeStyle='rgba(255,218,140,.16)';ctx.lineWidth=.8;ctx.stroke();
  const s=Math.min(23,h-10);ctx.fillStyle='rgba(114,160,213,.18)';round(x+5,y+(h-s)/2,s,s,s*.33);
  ctx.fillStyle='#ffe3a0';ctx.font='900 '+Math.max(12.5,s*.60)+'px system-ui';ctx.textAlign='center';ctx.fillText(icon,x+5+s/2,y+h/2+s*.21);
  ctx.fillStyle='rgba(246,251,255,.96)';ctx.font='950 '+Math.max(9.2,10.2*(w/105))+'px system-ui';ctx.fillText(label,x+s+8+(w-s-8)/2,y+h/2+3.4);
  ctx.restore();
}
function outline(r,c,col,l){ctx.strokeStyle=col;ctx.lineWidth=l;ctx.strokeRect(cell.x+c*cell.s+3,cell.y+r*cell.s+3,cell.s-6,cell.s-6)}
function round(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function pulseSelected(r,c){const a=.35+.25*Math.sin(performance.now()/120);ctx.strokeStyle='rgba(255,255,210,'+a+')';ctx.lineWidth=2;ctx.strokeRect(cell.x+c*cell.s+7,cell.y+r*cell.s+7,cell.s-14,cell.s-14)}
function crystalPath(cx,cy,r,kind,rot=0){
  const pts=[];
  const sides=kind===6?10:8;
  const yScale=kind===6?0.88:1;
  for(let i=0;i<sides;i++){
    const a=rot-Math.PI/2+i*Math.PI*2/sides;
    const rr=(i%2===0?r:r*(kind===6?.78:.88));
    pts.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr*yScale]);
  }
  ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
  ctx.closePath();
  return pts;
}
function drawGem(x,r,c){
  // V132: artwork rendering is deliberately defensive. A broken/missing image
  // must never stop the render loop and leave the entire board empty.
  if(!x||typeof x!=='object') return;
  const alpha=Number.isFinite(x.alpha)?x.alpha:1;
  if(alpha<=0)return;
  const kind=Math.max(0,Math.min(TYPES-1,Number.isFinite(Number(x.kind))?Number(x.kind):0));
  const impact=x.impactT>0?Math.sin((1-x.impactT/.16)*Math.PI*3)*x.impactPower:0;
  const localAmp=cell.s*.035*impact;
  // V133: always derive a valid on-board anchor. This is the final guard
  // against gems disappearing after a resize, modal transition, or first frame.
  const baseX=Number.isFinite(x.x)&&x.x>0?x.x:cellX(c);
  const baseY=Number.isFinite(x.y)&&x.y>0?x.y:cellY(r);
  const px=baseX+Math.sin(r*7+c*3)*localAmp;
  const py=baseY+Math.cos(r*5+c*11)*localAmp*.72;
  const sz=cell.s*GEM_RATIO*(Number.isFinite(x.scale)?x.scale:1);
  const size=sz*(x.special==='rainbow'?1.04:1);
  const sheetReady=gemSheet.complete&&gemSheet.naturalWidth>=1024&&gemSheet.naturalHeight>=128;
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.imageSmoothingEnabled=true;
  let drawn=false;
  try{
    // Prefer the single supplied sprite sheet: one asset, deterministic mapping.
    if(sheetReady){
      const sx=(x.special==='rainbow'?7:kind)*128;
      ctx.drawImage(gemSheet,sx,0,128,128,px-size/2,py-size/2,size,size);
      drawn=true;
    }
  }catch(_){ drawn=false; }
  if(!drawn){
    // Guaranteed visual fallback. This is only used while artwork is loading
    // or if a browser refuses the image resource; it is intentionally crystal-shaped.
    const colors=['#f06a82','#f4a24d','#ffd84d','#45d88b','#4ca9f4','#a86af4','#e9f5ff'];
    ctx.save();ctx.translate(px,py);
    const pts=[];const sides=kind===2?6:8;const rr=size*.42;
    for(let i=0;i<sides;i++){const a=-Math.PI/2+i*Math.PI*2/sides;pts.push([Math.cos(a)*rr,Math.sin(a)*rr]);}
    ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();
    ctx.fillStyle=colors[kind];ctx.shadowColor='rgba(255,255,255,.35)';ctx.shadowBlur=6;ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=Math.max(1.2,size*.025);ctx.stroke();
    if(x.special==='rainbow'){
      const rr2=size*.27;ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(2,size*.035);ctx.beginPath();ctx.arc(0,0,rr2,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }
  if(x.impactT>0){const p=x.impactT/.16;ctx.globalAlpha*=Math.min(.42,p*.9);ctx.strokeStyle='#fff1a6';ctx.lineWidth=Math.max(1.5,cell.s*.022);ctx.beginPath();ctx.arc(px,py,size*.48*(1+(1-p)*.08),0,Math.PI*2);ctx.stroke();}
  if(x.special&&x.special!=='rainbow'){
    const ring=x.special==='bomb'?'rgba(255,222,130,.96)':'rgba(235,250,255,.96)';
    ctx.globalAlpha=alpha;ctx.save();ctx.translate(px,py);ctx.strokeStyle=ring;ctx.lineWidth=Math.max(2,size*.035);ctx.shadowColor=ring;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(0,0,size*.42,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
    if(x.special==='row'||x.special==='col'){ctx.strokeStyle='rgba(255,255,255,.94)';ctx.lineWidth=Math.max(2.2,size*.045);ctx.beginPath();if(x.special==='row'){ctx.moveTo(-size*.29,0);ctx.lineTo(size*.29,0)}else{ctx.moveTo(0,-size*.29);ctx.lineTo(0,size*.29)}ctx.stroke();}
    else if(x.special==='bomb'){ctx.fillStyle='rgba(255,230,150,.96)';ctx.beginPath();ctx.arc(0,0,size*.10,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=Math.max(1.5,size*.025);for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*size*.12,Math.sin(a)*size*.12);ctx.lineTo(Math.cos(a)*size*.29,Math.sin(a)*size*.29);ctx.stroke();}}
    ctx.restore();
  }
  if(x.obstacle){
    ctx.save();ctx.translate(px,py);ctx.globalAlpha=Math.min(1,alpha+.15);const R=size*.42;
    if(x.obstacle==='ice'){ctx.strokeStyle='rgba(180,240,255,.9)';ctx.lineWidth=Math.max(2,size*.045);ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;const rr=R*(i%2?.86:1);const xx=Math.cos(a)*rr,yy=Math.sin(a)*rr;if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy)}ctx.closePath();ctx.stroke();}
    else if(x.obstacle==='lock'){ctx.strokeStyle='#ffd66d';ctx.lineWidth=Math.max(2,size*.05);ctx.strokeRect(-R*.55,-R*.2,R*1.1,R*.72);ctx.beginPath();ctx.arc(0,-R*.15,R*.38,Math.PI,0);ctx.stroke();}
    else if(x.obstacle==='stone'){ctx.fillStyle='rgba(40,46,60,.88)';ctx.beginPath();ctx.arc(0,0,R,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(230,240,255,.38)';ctx.stroke();}
    ctx.restore();
  }
  ctx.restore();
}
function update(dt){
  updatePerformance(dt);
  finalPolishTick(dt);
  if(juiceHitStop>0){juiceHitStop=Math.max(0,juiceHitStop-dt);juiceShakeT=Math.max(0,juiceShakeT-dt);juiceBoardPunchT=Math.max(0,juiceBoardPunchT-dt);return;}
  if(saveFlashT>0)saveFlashT=Math.max(0,saveFlashT-dt);
  missionFlash=Math.max(0,missionFlash-dt);streakFlash=Math.max(0,streakFlash-dt);if(streakFlash>0){ctx.save();ctx.globalAlpha=Math.min(.22,streakFlash*.2);ctx.fillStyle='#ffd96a';ctx.fillRect(0,0,parseFloat(canvas.style.width)||DESIGN_W,parseFloat(canvas.style.height)||DESIGN_H);ctx.restore();}if(nearMissT>0){nearMissT-=dt;if(nearMissT<=0){nearMiss=null;nearMissStreak=0}}
  fpsFrames++;fpsTimer+=dt;if(fpsTimer>=.5){fps=Math.round(fpsFrames/fpsTimer);fpsFrames=0;fpsTimer=0}
  if(hintT>0)hintT-=dt;if(hintCooldown>0)hintCooldown=Math.max(0,hintCooldown-dt);if(bannerT>0)bannerT-=dt;feedbackFlash=Math.max(0,feedbackFlash-dt*1.8);feedbackPulse=Math.max(0,feedbackPulse-dt*1.7);juiceShakeT=Math.max(0,juiceShakeT-dt);juiceShake=Math.max(0,juiceShake-dt*7);juiceBoardPunchT=Math.max(0,juiceBoardPunchT-dt);juiceBoardPunch=Math.max(0,juiceBoardPunch-dt*.55);juiceHitStop=Math.max(0,juiceHitStop-dt);for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=board[r][c];x.impactT=Math.max(0,x.impactT-dt);x.impactPower=Math.max(0,x.impactPower-dt*6);if(x.matched){x.alpha=Math.max(0,x.alpha-dt*4);x.scale+=dt*2;continue}x.x+=(x.tx-x.x)*Math.min(1,dt*14);x.y+=(x.ty-x.y)*Math.min(1,dt*14);x.scale+=(1-x.scale)*Math.min(1,dt*10)}for(let i=localImpacts.length-1;i>=0;i--){localImpacts[i].life-=dt;if(localImpacts[i].life<=0)localImpacts.splice(i,1)}for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
  for(let i=toastScore.length-1;i>=0;i--){toastScore[i].life-=dt;toastScore[i].scale+=dt*1.8;if(toastScore[i].life<=0)toastScore.splice(i,1)}
  for(let i=effects.length-1;i>=0;i--){effects[i].life-=dt;if(effects[i].life<=0)effects.splice(i,1)}
  for(let i=cascadeDrops.length-1;i>=0;i--){cascadeDrops[i].life-=dt;if(cascadeDrops[i].life<=0)cascadeDrops.splice(i,1)}if(state==='swapping'){phase-=dt;if(phase<=0){if(matches().count===0){doSwap(swapInfo.a,swapInfo.b);moves++;sound('error');haptic('error');flashFeedback(.16);juice('error',1);state='playing';swapInfo=null;clearUndo(false);saveProgress('invalid-swap')}else resolve(true)}}else if(state==='clearing'){phase-=dt;if(phase<=0)collapse()}else if(state==='falling'){let settled=true;for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(Math.abs(board[r][c].x-board[r][c].tx)>1||Math.abs(board[r][c].y-board[r][c].ty)>1)settled=false;if(settled)resolve(false)}else if(state==='playing'){if(moves<=5&&moves>0&&warningT<=0){warningT=.9;sound('error');}if(moves<=0){finishComboChain();if(dailyMode){failDaily();}else{clearSavedGame();state='gameover';saveFlashT=.8;saveFlashText='SAVE CLEARED';}}}}
function loop(t){
  if(!running)return;
  const dt=Math.min(.033,(t-last)/1000||0);
  last=t;
  update(dt);
  if(perfCanRender()) draw();
  rafId=requestAnimationFrame(loop);
}
function startLoop(){
  if(running)return;
  running=true;
  last=performance.now();
  cancelAnimationFrame(rafId);
  rafId=requestAnimationFrame(loop);
}
function stopLoop(){
  running=false;
  cancelAnimationFrame(rafId);
  rafId=0;
}
function hit(rect,x,y){
  return x>=rect.x&&x<=rect.x+rect.w&&y>=rect.y&&y<=rect.y+rect.h;
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    perfPausedByVisibility=running;
    if(running)stopLoop();
  }else if(perfPausedByVisibility){
    perfPausedByVisibility=false;
    frameEMA=16.7; perfPressure=0; startLoop();
  }
});
window.addEventListener('pagehide',()=>{if(running)stopLoop()},{passive:true});
window.addEventListener('pageshow',()=>{if(state!=='menu'&&!document.hidden)startLoop()},{passive:true});
function pointer(e){
  if(e.type==='pointerdown')unlockAudio();
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  // Always convert the physical touch position to the same logical coordinate
  // system used by draw(). This prevents PLAY/HINT/MENU hitboxes drifting on iOS.
  const x=(e.clientX-rect.left)*(parseFloat(canvas.style.width)||rect.width)/rect.width;
  const y=(e.clientY-rect.top)*(parseFloat(canvas.style.height)||rect.height)/rect.height;
  if(e.type==='pointerdown'){
    pointerStart={x,y};
    try{canvas.setPointerCapture?.(e.pointerId)}catch(_){ }
    return;
  }
  if(e.type!=='pointerup' && e.type!=='pointercancel')return;
  const start=pointerStart; pointerStart=null;
  lastPointerUpAt=performance.now();
  if(!start)return;
  const dx=x-start.x,dy=y-start.y;
  const swipe=Math.hypot(dx,dy)>=Math.max(16,cell.s*.24);

  if(state==='tutorial'){
    const w=parseFloat(canvas.style.width)||DESIGN_W,h=parseFloat(canvas.style.height)||DESIGN_H,L=tutorialLayout(w,h),bw=L.boxW-L.pad*2;
    if(hit({x:L.boxX+L.pad,y:L.navY,w:bw*.42,h:50},x,y)){if(tutorialStep===0)tutorialSkip();else{tutorialStep--;haptic('tap');startLoop()}return;}
    if(hit({x:L.boxX+L.pad+bw*.48,y:L.navY,w:bw*.52,h:50},x,y)){tutorialNext();return;}
    return;
  }
  if(state==='menu'){
    const w=parseFloat(canvas.style.width)||DESIGN_W, h=parseFloat(canvas.style.height)||DESIGN_H;
    const L=menuLayout(w,h), saved=hasSavedGame();
    if(hit({x:L.boxX+L.pad,y:L.mainY,w:L.innerW,h:L.mainH},x,y)){
      haptic('tap');
      if(saved){if(!loadProgress())startGame(1,true);}else startGame(1,true);
      return;
    }
    const actions=[['levelmap','missions'],['daily','tutorial'],['sound','haptic'],['settings','newgame']];
    for(let i=0;i<actions.length;i++){
      const yy=L.gridTop+i*(L.rowH+L.rowGap),xs=[L.boxX+L.pad,L.boxX+L.pad+L.colW+L.gap];
      for(let j=0;j<2;j++){
        if(!hit({x:xs[j],y:yy,w:L.colW,h:L.rowH},x,y))continue;
        const action=actions[i][j]; haptic('tap');
        if(action==='levelmap'){state='levelmap';selectedMapLevel=mapState.unlocked;mapScroll=0;startLoop();return;}
        if(action==='missions'){state='missions';startLoop();return;}
        if(action==='daily'){state='daily';loadDaily();startLoop();return;}
        if(action==='tutorial'){openTutorial();return;}
        if(action==='sound'){setSound(!soundOn);return;}
        if(action==='haptic'){setHaptic(!hapticOn);return;}
        if(action==='settings'){state='settings';startLoop();return;}
        if(action==='newgame'){startGame(1,true);return;}
      }
    }
    if(hit({x:L.boxX+L.pad,y:L.closeY,w:L.innerW,h:48},x,y)){close();return;}
    return;
  }
  if(state==='settings'){
    const w=parseFloat(canvas.style.width)||DESIGN_W;
    const h=parseFloat(canvas.style.height)||DESIGN_H;
    const y0=.205,step=.074;
    for(let i=0;i<3;i++){if(hit({x:w*.16,y:h*(y0+i*step),w:w*.68,h:43},x,y)){setQuality(QUALITY_MODES[i]);haptic('tap');return;}}
    if(hit({x:w*.16,y:h*(y0+3*step),w:w*.68,h:43},x,y)){setSound(!soundOn);haptic('tap');return;}
    if(hit({x:w*.16,y:h*(y0+4*step),w:w*.68,h:43},x,y)){setHaptic(!hapticOn);haptic('tap');return;}
    if(hit({x:w*.16,y:h*(y0+5*step),w:w*.68,h:43},x,y)){setShowFps(!showFps);haptic('tap');return;}
    if(hit({x:w*.16,y:h*(y0+6*step),w:w*.68,h:43},x,y)){setAdaptivePerformance(!adaptivePerformance);haptic('tap');return;}
    if(hit({x:w*.16,y:h*(y0+7*step),w:w*.68,h:43},x,y)){setReducedMotion(!reducedMotion);haptic('tap');return;}
    if(hit({x:w*.06,y:h*.805,w:w*.22,h:44},x,y)){try{window.showMusicPanel?.(true)}catch(_){} haptic('tap');return;}
    if(hit({x:w*.54,y:h*.805,w:w*.18,h:44},x,y)){testHaptic();return;}
    if(hit({x:w*.375,y:h*.805,w:w*.25,h:44},x,y)){openTutorial();return;}
    if(hit({x:w*.74,y:h*.805,w:w*.20,h:44},x,y)){resetGameSettings();haptic('tap');return;}
    if(hit({x:w*.16,y:h*.875,w:w*.68,h:43},x,y)){state='menu';haptic('tap');return;}
    return;
  }
  if(state==='boosters'){
    const w=parseFloat(canvas.style.width)||DESIGN_W, h=parseFloat(canvas.style.height)||DESIGN_H, L=boostersLayout(w,h);
    for(let i=0;i<3;i++){
      const yy=L.top+i*(L.rowH+L.gap);
      if(hit({x:L.innerX,y:yy,w:L.innerW,h:L.rowH},x,y)){haptic('tap');useBooster(['hammer','shuffle','moves'][i]);return;}
    }
    if(hit({x:L.innerX,y:L.backY,w:L.innerW,h:48},x,y)){state='playing';haptic('tap');startLoop();return;}
    return;
  }
  if(state==='daily'){
    const w=parseFloat(canvas.style.width)||DESIGN_W,h=parseFloat(canvas.style.height)||DESIGN_H;
    if(hit({x:w*.20,y:h*.615,w:w*.60,h:46},x,y)&&!dailyState.completed){dailyStart();return;}
    if(hit({x:w*.20,y:h*.705,w:w*.60,h:46},x,y)){state='menu';startLoop();return;}
    return;
  }
  if(state==='dailycomplete'){
    const w=parseFloat(canvas.style.width)||DESIGN_W,h=parseFloat(canvas.style.height)||DESIGN_H;
    if(hit({x:w*.22,y:h*.70,w:w*.56,h:44},x,y)){state='menu';startLoop();return;}
    return;
  }
  if(state==='daily'){
    if(hit({x:w*.20,y:h*.615,w:w*.60,h:46},x,y)&&!dailyState.completed){dailyStart();return;}
    if(hit({x:w*.20,y:h*.705,w:w*.60,h:46},x,y)){state='menu';startLoop();return;}
    return;
  }
  if(state==='dailycomplete'){
    if(hit({x:w*.22,y:h*.70,w:w*.56,h:44},x,y)){state='menu';startLoop();return;}
    return;
  }
  if(state==='missions'){
    const w=parseFloat(canvas.style.width)||DESIGN_W,h=parseFloat(canvas.style.height)||DESIGN_H,L=missionLayout(w,h);
    for(let i=0;i<3;i++){
      const yy=L.top+i*(L.rowH+L.gap);
      if(hit({x:L.innerX,y:yy,w:L.innerW,h:L.rowH},x,y) && missionDone(missionState.active[i])){
        if(!claimMission(i)){banner='BOOSTER ĐÃ ĐẦY';bannerT=.8;sound('error');haptic('error');}
        startLoop();return;
      }
    }
    if(hit({x:L.innerX,y:L.actionsY,w:L.innerW*.42,h:44},x,y)){claimAllMissions();startLoop();return;}
    if(hit({x:L.innerX+L.innerW*.47,y:L.actionsY,w:L.innerW*.53,h:44},x,y)){state='menu';haptic('tap');startLoop();return;}
    return;
  }
  if(state==='levelmap'){
    const w=parseFloat(canvas.style.width)||DESIGN_W,h=parseFloat(canvas.style.height)||DESIGN_H,L=levelmapLayout(w,h);
    if(swipe){mapScroll=Math.max(0,Math.min(L.maxScroll,mapScroll-dy));haptic('tap');startLoop();return;}
    if(hit({x:L.listX,y:L.backY,w:L.listW,h:46},x,y)){state='menu';haptic('tap');startLoop();return;}
    if(x>=L.listX&&x<=L.listX+L.listW&&y>=L.top&&y<=L.bottom){
      const l=Math.floor((y-L.top+mapScroll)/(L.rowH+L.rowGap))+1;
      if(l>=1&&l<=MAX_LEVELS&&isLevelUnlocked(l)){selectedMapLevel=l;haptic('tap');startGame(l,false);return;}
      banner='MÀN CHƯA MỞ KHÓA';bannerT=.7;haptic('error');startLoop();return;
    }
    return;
  }
  if(state==='booster-hammer'){
    if(swipe){return;}
    if(x>=cell.x&&x<cell.x+cell.s*N&&y>=cell.y&&y<cell.y+cell.s*N){
      const r=Math.floor((y-cell.y)/cell.s),c=Math.floor((x-cell.x)/cell.s);applyHammer(r,c);return;
    }
    state='playing';boosterTarget=null;banner='HAMMER CANCELLED';bannerT=.65;haptic('tap');startLoop();return;
  }
  if(state==='levelcomplete'){
    const w=parseFloat(canvas.style.width)||DESIGN_W,h=parseFloat(canvas.style.height)||DESIGN_H;
    if(hit({x:w*.25,y:h*.57,w:w*.50,h:48},x,y)){
      if(level<MAX_LEVELS)startGame(level+1,false); else {state='levelmap';startLoop();}
    }else if(hit({x:w*.25,y:h*.64,w:w*.50,h:48},x,y)){state='levelmap';startLoop();}
    return;
  }
  if(state==='paused'){
    const w=parseFloat(canvas.style.width)||DESIGN_W,h=parseFloat(canvas.style.height)||DESIGN_H;
    const boxW=Math.min(w*.78,480),boxH=Math.min(h*.60,575),boxX=(w-boxW)/2,boxY=h*.18,bw=boxW*.76,bh=50,gap=18,bx=boxX+boxW*.12,firstY=boxY+boxH*.44;
    if(hit({x:bx,y:firstY,w:bw,h:bh},x,y)){state='playing';haptic('tap');startLoop();return;}
    if(hit({x:bx,y:firstY+bh+gap,w:bw,h:bh},x,y)){haptic('tap');startGame(level,false);return;}
    if(hit({x:bx,y:firstY+2*(bh+gap),w:bw,h:bh},x,y)){saveProgress('pause-menu',true);state='menu';selectedMapLevel=mapState.unlocked;mapScroll=0;haptic('tap');startLoop();return;}
    return;
  }
  if(state==='gameover'){
    const w=parseFloat(canvas.style.width)||DESIGN_W;
    const h=parseFloat(canvas.style.height)||DESIGN_H;
    if(hit({x:w*.28,y:h*.48,w:w*.44,h:45},x,y))startGame(level,true);
    else if(hit({x:w*.28,y:h*.58,w:w*.44,h:45},x,y))close();
    return;
  }
  if(state!=='playing')return;
  if(swipe && start.x>=cell.x&&start.x<cell.x+cell.s*8&&start.y>=cell.y&&start.y<cell.y+cell.s*8){
    const q1={r:Math.floor((start.y-cell.y)/cell.s),c:Math.floor((start.x-cell.x)/cell.s)};
    let q2={r:q1.r,c:q1.c};
    if(Math.abs(dx)>Math.abs(dy))q2.c+=dx>0?1:-1;else q2.r+=dy>0?1:-1;
    if(inside(q2.r,q2.c)){
      if(selected)selected=null;
      choose(q1); choose(q2);
    }
  }else{
    const u=cell.s/74;
    const by=cell.y+cell.s*8+14*u;
    const gap=5*u,bw=(wScale(1)-34*u-gap*4)/5;
    const pad=7*u;
    if(hit({x:8*u-pad,y:by-pad,w:bw+pad*2,h:42*u+pad*2},x,y))showHint();
    else if(hit({x:8*u+(bw+gap)-pad,y:by-pad,w:bw+pad*2,h:42*u+pad*2},x,y)){useUndo();}
    else if(hit({x:8*u+(bw+gap)*2-pad,y:by-pad,w:bw+pad*2,h:42*u+pad*2},x,y)){state='boosters';haptic('tap');startLoop();}
    else if(hit({x:8*u+(bw+gap)*3-pad,y:by-pad,w:bw+pad*2,h:42*u+pad*2},x,y))setSound(!soundOn);
    else if(hit({x:8*u+(bw+gap)*4-pad,y:by-pad,w:bw+pad*2,h:42*u+pad*2},x,y)){state='paused';startLoop();}
  }
}

// iOS Safari can occasionally deliver a click without a complete pointer sequence.
// Keep a native click fallback for the menu buttons while avoiding double activation.
canvas.addEventListener('click',function(e){
  unlockAudio();
  if(performance.now()-lastPointerUpAt<450)return;
  if(state!=='menu' && state!=='tutorial' && state!=='settings' && state!=='levelmap' && state!=='levelcomplete' && state!=='boosters' && state!=='missions' && state!=='daily' && state!=='dailycomplete' && state!=='booster-hammer')return;
  const rect=canvas.getBoundingClientRect(); if(!rect.width||!rect.height)return;
  const x=(e.clientX-rect.left)*(parseFloat(canvas.style.width)||rect.width)/rect.width;
  const y=(e.clientY-rect.top)*(parseFloat(canvas.style.height)||rect.height)/rect.height;
  const w=parseFloat(canvas.style.width)||DESIGN_W, h=parseFloat(canvas.style.height)||DESIGN_H;
  if(state==='tutorial'){
    const by=h*.09;
    if(hit({x:w*.18,y:by+h*.69,w:w*.28,h:48},x,y)){if(tutorialStep===0)tutorialSkip();else{tutorialStep--;haptic('tap');startLoop()}return;}
    if(hit({x:w*.54,y:by+h*.69,w:w*.28,h:48},x,y)){tutorialNext();return;}
    return;
  }
  if(state==='settings'){
    const y0=.205,step=.074;
    for(let i=0;i<3;i++){if(hit({x:w*.16,y:h*(y0+i*step),w:w*.68,h:43},x,y)){setQuality(QUALITY_MODES[i]);haptic('tap');return;}}
    if(hit({x:w*.16,y:h*(y0+3*step),w:w*.68,h:43},x,y)){setSound(!soundOn);haptic('tap');return;}
    if(hit({x:w*.16,y:h*(y0+4*step),w:w*.68,h:43},x,y)){setHaptic(!hapticOn);haptic('tap');return;}
    if(hit({x:w*.16,y:h*(y0+5*step),w:w*.68,h:43},x,y)){setShowFps(!showFps);haptic('tap');return;}
    if(hit({x:w*.16,y:h*(y0+6*step),w:w*.68,h:43},x,y)){setAdaptivePerformance(!adaptivePerformance);haptic('tap');return;}
    if(hit({x:w*.16,y:h*(y0+7*step),w:w*.68,h:43},x,y)){setReducedMotion(!reducedMotion);haptic('tap');return;}
    if(hit({x:w*.06,y:h*.805,w:w*.22,h:44},x,y)){try{window.showMusicPanel?.(true)}catch(_){} haptic('tap');return;}
    if(hit({x:w*.54,y:h*.805,w:w*.18,h:44},x,y)){testHaptic();return;}
    if(hit({x:w*.375,y:h*.805,w:w*.25,h:44},x,y)){openTutorial();return;}
    if(hit({x:w*.74,y:h*.805,w:w*.20,h:44},x,y)){resetGameSettings();haptic('tap');return;}
    if(hit({x:w*.16,y:h*.875,w:w*.68,h:43},x,y)){state='menu';haptic('tap');return;}
    return;
  }
  if(state==='boosters'){
    const L=boostersLayout(w,h);
    for(let i=0;i<3;i++){const yy=L.top+i*(L.rowH+L.gap);if(hit({x:L.innerX,y:yy,w:L.innerW,h:L.rowH},x,y)){useBooster(['hammer','shuffle','moves'][i]);return;}}
    if(hit({x:L.innerX,y:L.backY,w:L.innerW,h:48},x,y)){state='playing';haptic('tap');startLoop();}
    return;
  }
  if(state==='missions'){
    const L=missionLayout(w,h);
    for(let i=0;i<3;i++){
      const yy=L.top+i*(L.rowH+L.gap);
      if(hit({x:L.innerX,y:yy,w:L.innerW,h:L.rowH},x,y)&&missionDone(missionState.active[i])){claimMission(i);startLoop();return;}
    }
    if(hit({x:L.innerX,y:L.actionsY,w:L.innerW*.42,h:44},x,y)){claimAllMissions();startLoop();return;}
    if(hit({x:L.innerX+L.innerW*.47,y:L.actionsY,w:L.innerW*.53,h:44},x,y)){state='menu';haptic('tap');startLoop();}
    return;
  }
  if(state==='booster-hammer'){
    if(x>=cell.x&&x<cell.x+cell.s*N&&y>=cell.y&&y<cell.y+cell.s*N){const r=Math.floor((y-cell.y)/cell.s),c=Math.floor((x-cell.x)/cell.s);applyHammer(r,c);return;}
    state='playing';boosterTarget=null;banner='HAMMER CANCELLED';bannerT=.65;haptic('tap');startLoop();return;
  }
  if(state==='levelmap'){
    const L=levelmapLayout(w,h);
    if(hit({x:L.listX,y:L.backY,w:L.listW,h:46},x,y)){state='menu';haptic('tap');startLoop();return;}
    if(x>=L.listX&&x<=L.listX+L.listW&&y>=L.top&&y<=L.bottom){
      const l=Math.floor((y-L.top+mapScroll)/(L.rowH+L.rowGap))+1;
      if(l>=1&&l<=MAX_LEVELS&&isLevelUnlocked(l)){selectedMapLevel=l;haptic('tap');startGame(l,false);return;}
    }
    return;
  }
  if(state==='levelcomplete'){
    if(hit({x:w*.25,y:h*.57,w:w*.50,h:48},x,y)){
      if(level<MAX_LEVELS)startGame(level+1,false); else {state='levelmap';startLoop();}
    }else if(hit({x:w*.25,y:h*.64,w:w*.50,h:48},x,y)){state='levelmap';startLoop();}
    return;
  }
  const saved=hasSavedGame();
  if(state==='menu'){
    const L=menuLayout(w,h), mainRect={x:L.boxX+L.pad,y:L.mainY,w:L.innerW,h:L.mainH};
    if(hit(mainRect,x,y)){if(saved){if(!loadProgress())startGame(1,true)}else startGame(1,true);return;}
    const actions=[['levelmap','missions'],['daily','tutorial'],['sound','haptic'],['settings','newgame']];
    for(let i=0;i<actions.length;i++){
      const yy=L.gridTop+i*(L.rowH+L.rowGap),xs=[L.boxX+L.pad,L.boxX+L.pad+L.colW+L.gap];
      for(let j=0;j<2;j++){
        if(!hit({x:xs[j],y:yy,w:L.colW,h:L.rowH},x,y))continue;
        const action=actions[i][j];
        if(action==='levelmap'){state='levelmap';selectedMapLevel=mapState.unlocked;mapScroll=0;haptic('tap');startLoop();return;}
        if(action==='missions'){state='missions';haptic('tap');startLoop();return;}
        if(action==='daily'){state='daily';loadDaily();haptic('tap');startLoop();return;}
        if(action==='tutorial'){openTutorial();return;}
        if(action==='sound'){setSound(!soundOn);return;}
        if(action==='haptic'){setHaptic(!hapticOn);return;}
        if(action==='settings'){state='settings';haptic('tap');startLoop();return;}
        if(action==='newgame'){startGame(1,true);return;}
      }
    }
    if(hit({x:L.boxX+L.pad,y:L.closeY,w:L.innerW,h:48},x,y)){close();return;}
    return;
  }
},{passive:true});

function wScale(v){return (parseFloat(canvas.style.width)||DESIGN_W)*v}
function hScale(v){return (parseFloat(canvas.style.height)||DESIGN_H)*v}
function startGame(levelToStart=1,countGame=true){start(levelToStart,countGame)}
function key(e){if(!modal.classList.contains('show'))return;if(e.key==='Escape'){if(state==='playing')state='paused';else close()}if((e.key==='h'||e.key==='H')&&state==='playing')showHint();if((e.key==='u'||e.key==='U')&&state==='playing')useUndo();if((e.key==='s'||e.key==='S')&&state==='menu'){state='settings';startLoop();}if((e.key==='t'||e.key==='T')&&(state==='menu'||state==='settings'))openTutorial();if((e.key==='p'||e.key==='P'||e.key===' ')&&state==='playing'){state='paused';startLoop();}}
function close(){
  const wasPlaying=state==='playing'||state==='swapping'||state==='clearing'||state==='falling';
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
  document.body.classList.remove('game-open');
  if(wasPlaying)state='paused';
  if(wasPlaying || state==='paused')saveProgress('close',true);
  stopLoop();
}
loadDaily();
window.openBejeweled=function(){
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('game-open');
  fit();
  if(!tutorialSeen()){tutorialStep=0;state='tutorial';}
  else if(state==='menu' && !board.length){reset(1,false);} else if(state==='paused')state='playing';
  startLoop();
};
window.closeBejeweled=close;
window.__tinhMiLonGameDebug={getState:()=>state,getBoardSize:()=>board.length,useBooster,hasSavedGame,menuLayout,boostersLayout};
canvas.addEventListener('wheel',function(e){
  if(state!=='levelmap')return;
  e.preventDefault();
  const w=parseFloat(canvas.style.width)||DESIGN_W,h=parseFloat(canvas.style.height)||DESIGN_H,L=levelmapLayout(w,h);
  mapScroll=Math.max(0,Math.min(L.maxScroll,mapScroll+e.deltaY));
  startLoop();
},{passive:false});
canvas.addEventListener('pointerdown',pointer,{passive:true});
canvas.addEventListener('pointerup',pointer,{passive:true});
canvas.addEventListener('pointercancel',pointer,{passive:true});
window.addEventListener('resize',fit,{passive:true});
window.visualViewport?.addEventListener('resize',fit,{passive:true});
document.addEventListener('keydown',key);
document.getElementById('bejeweledClose')?.addEventListener('click',close);
document.getElementById('bejeweledMenu')?.addEventListener('click',close);
document.getElementById('bejeweledPause')?.addEventListener('click',()=>{if(state==='playing'){state='paused';startLoop()}});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){stopLoop();}
  else if(modal.classList.contains('show')){fit();startLoop();}
});
window.addEventListener('pagehide',stopLoop,{passive:true});
fit();fillFast();state='menu';
})();
