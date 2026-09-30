/* Bejeweled by HoangDuy - HTML5 port for TINH MI LON */
(function(){
'use strict';
const N=8,TYPES=7,START_MOVES=30,CLEAR_PER_LEVEL=18;
const gemNames=['red','orange','yellow','green','blue','purple','pearl'];
const canvas=document.getElementById('bejeweledCanvas'); if(!canvas)return;
const ctx=canvas.getContext('2d');
const modal=document.getElementById('bejeweledModal');
const bg=new Image(); bg.src='game/images/background_crystal_v79.png';
const gems=gemNames.map((n,i)=>{const x=new Image();x.src='game/images/gem_'+i+'_'+n+'.png';return x});
const soundNames=['select','swap','match','combo','special','error'];
const sounds=Object.fromEntries(soundNames.map(n=>[n,new Audio('game/images/'+n+'.wav')]));
Object.values(sounds).forEach(a=>{a.preload='auto';a.volume=.55; a.setAttribute('playsinline','')});
let audioUnlocked=false;
function unlockAudio(){
  if(audioUnlocked)return;
  audioUnlocked=true;
  for(const a of Object.values(sounds)){
    try{ const v=a.volume; a.volume=0; a.currentTime=0; const p=a.play(); if(p&&p.catch)p.catch(()=>{}); a.pause(); a.currentTime=0; a.volume=v; }catch(_){}
  }
}
let board=[],selected=null,state='menu',score=0,moves=START_MOVES,level=1,progress=0,combo=0,banner='',bannerT=0,hint=null,hintT=0,particles=[],last=0,swapInfo=null,phase=0,reverting=false,soundOn=(localStorage.getItem('tinh-mi-lon-game-sound')!=='off'),warningT=0;
let running=false, rafId=0, pixelRatio=1, pointerStart=null;
let fps=60,fpsTimer=0,fpsFrames=0,toastScore=[],effects=[],cascadeDrops=[];
const cell={x:0,y:0,s:0};
const DESIGN_W=620, DESIGN_H=960;
const MAX_PARTICLES=180;
const BOARD_PAD=9;
const LEVEL_BASE_TARGET=18;
function levelTarget(){return LEVEL_BASE_TARGET+Math.min(12,(level-1)*2)}
function setSound(v){soundOn=!!v;try{localStorage.setItem('tinh-mi-lon-game-sound',soundOn?'on':'off')}catch(_){}}
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
  pixelRatio=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(d*pixelRatio);
  canvas.height=Math.round(d*(DESIGN_H/DESIGN_W)*pixelRatio);
  canvas.style.width=d+'px';
  canvas.style.height=(d*(DESIGN_H/DESIGN_W))+'px';
  const sc=d/DESIGN_W;
  // 8x8 board: the board always occupies exactly 8 cells across.
  // Keep a small side margin on narrow phones while preserving square cells.
  cell.s=Math.min(74*sc,(d-28*sc)/8);
  cell.x=(d-cell.s*8)/2;
  // Keep the 8x8 board below the compact HUD and above the lower controls.
  cell.y=220*sc;
  if(board.length)for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    board[r][c].tx=cellX(c);board[r][c].ty=cellY(r);
    if(state==='menu'||state==='gameover'){board[r][c].x=board[r][c].tx;board[r][c].y=board[r][c].ty}
  }
  ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
}
function makeCell(k){return {kind:k,special:'',matched:false,x:0,y:0,tx:0,ty:0,scale:1,alpha:1}}
function fill(){for(let r=0;r<N;r++){board[r]=[];for(let c=0;c<N;c++){let k;do{k=Math.floor(Math.random()*TYPES)}while((c>=2&&board[r][c-1].kind===k&&board[r][c-2].kind===k)||(r>=2&&board[r-1][c].kind===k&&board[r-2][c].kind===k));board[r][c]=makeCell(k)}}}
function reset(){score=0;moves=START_MOVES;level=1;progress=0;combo=0;selected=null;hint=null;particles=[];fill();while(!findMove()){fill()}for(let r=0;r<N;r++)for(let c=0;c<N;c++){board[r][c].x=board[r][c].tx=cellX(c);board[r][c].y=board[r][c].ty=cellY(r)}state='menu';banner='';}
function start(){reset();warningT=0;state='playing';banner='READY!';bannerT=.55}
function cellX(c){return cell.x+c*cell.s+cell.s/2}function cellY(r){return cell.y+r*cell.s+cell.s/2}
function inside(r,c){return r>=0&&r<N&&c>=0&&c<N}function adj(a,b){return Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1}
function inLine(r,c){const k=board[r][c].kind;let h=1,v=1;for(let x=c-1;x>=0&&board[r][x].kind===k;x--)h++;for(let x=c+1;x<N&&board[r][x].kind===k;x++)h++;for(let y=r-1;y>=0&&board[y][c].kind===k;y--)v++;for(let y=r+1;y<N&&board[y][c].kind===k;y++)v++;return h>=3||v>=3}
function swapValid(a,b){const A=board[a.r][a.c],B=board[b.r][b.c];if(A.special||B.special)return true;[A.kind,B.kind]=[B.kind,A.kind];const ok=inLine(a.r,a.c)||inLine(b.r,b.c);[A.kind,B.kind]=[B.kind,A.kind];return ok}
function findMove(){for(let r=0;r<N;r++)for(let c=0;c<N;c++){if(c+1<N&&swapValid({r,c},{r,c:c+1}))return [{r,c},{r,c:c+1}];if(r+1<N&&swapValid({r,c},{r:r+1,c}))return [{r,c},{r:r+1,c}]}return null}
function matches(){const m=Array.from({length:N},()=>Array(N).fill(false)),runs=[];for(let r=0;r<N;r++){let s=0;while(s<N){let e=s+1;while(e<N&&board[r][e].kind===board[r][s].kind)e++;if(e-s>=3){runs.push({r,c:s,len:e-s,h:true});for(let c=s;c<e;c++)m[r][c]=true}s=e}}for(let c=0;c<N;c++){let s=0;while(s<N){let e=s+1;while(e<N&&board[e][c].kind===board[s][c].kind)e++;if(e-s>=3){runs.push({r:s,c,len:e-s,h:false});for(let r=s;r<e;r++)m[r][c]=true}s=e}}let count=0;for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(m[r][c])count++;return {m,runs,count}}
function planSpecials(m){const p=Array.from({length:N},()=>Array(N).fill(''));const rank=s=>({row:1,col:1,bomb:2,rainbow:3}[s]||0);const put=(r,c,s)=>{if(rank(s)>rank(p[r][c]))p[r][c]=s};for(const h of m.runs)if(h.h)for(const v of m.runs)if(!v.h&&v.c>=h.c&&v.c<h.c+h.len&&h.r>=v.r&&h.r<v.r+v.len)put(h.r,v.c,'bomb');for(const run of m.runs){let i=Math.floor(run.len/2);if(selected&&Array.from({length:run.len},(_,q)=>run.h?[run.r,run.c+q]:[run.r+q,run.c]).some(x=>x[0]===selected.r&&x[1]===selected.c))i=Array.from({length:run.len},(_,q)=>run.h?[run.r,run.c+q]:[run.r+q,run.c]).findIndex(x=>x[0]===selected.r&&x[1]===selected.c);const r=run.h?run.r:run.r+i,c=run.h?run.c+i:run.c;if(run.len>=5)put(r,c,'rainbow');else if(run.len===4)put(r,c,run.h?'row':'col')}return p}
function resolve(fromSwap){const m=matches();const specialA=fromSwap&&board[swapInfo.a.r][swapInfo.a.c].special,specialB=fromSwap&&board[swapInfo.b.r][swapInfo.b.c].special;if(!m.count&&!specialA&&!specialB){combo=0;swapInfo=null;state='playing';if(!findMove())shuffle();return}combo++;const plan=planSpecials(m),clear=Array.from({length:N},()=>Array(N).fill(false)),stack=[];const add=(r,c)=>{if(inside(r,c)&&!clear[r][c]){clear[r][c]=true;stack.push([r,c])}};for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(m.m[r][c])add(r,c);if(specialA)add(swapInfo.a.r,swapInfo.a.c);if(specialB)add(swapInfo.b.r,swapInfo.b.c);const rbA=specialA==='rainbow',rbB=specialB==='rainbow';if(rbA||rbB){if(rbA&&rbB){for(let r=0;r<N;r++)for(let c=0;c<N;c++)add(r,c)}else{const rp=rbA?swapInfo.a:swapInfo.b,op=rbA?swapInfo.b:swapInfo.a,k=board[op.r][op.c].kind;for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(board[r][c].kind===k)add(r,c)}}while(stack.length){const [r,c]=stack.pop(),s=board[r][c].special;if(s==='row')for(let x=0;x<N;x++)add(r,x);else if(s==='col')for(let y=0;y<N;y++)add(y,c);else if(s==='bomb')for(let y=r-1;y<=r+1;y++)for(let x=c-1;x<=c+1;x++)add(y,x);else if(s==='rainbow'){const k=board[r][c].kind;for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(board[y][x].kind===k)add(y,x)}}for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(plan[r][c])clear[r][c]=false;let cleared=0;for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(clear[r][c]){cleared++;board[r][c].matched=true;spawn(cellX(c),cellY(r),7)}for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(plan[r][c]){board[r][c].special=plan[r][c];board[r][c].matched=false;board[r][c].scale=1.35}score+=cleared*30*Math.max(1,combo);
  progress+=cleared/levelTarget();while(progress>=1){progress--;level++;moves+=5;banner='LEVEL '+level;bannerT=1.5} 
  toastScore.push({x:cell.x+cell.s*4,y:cell.y+cell.s*4-8,text:'+'+(cleared*30*Math.max(1,combo)),life:.9,max:.9,scale:1});
  effects.push({type:combo>1?'combo':'match',x:cell.x+cell.s*4,y:cell.y+cell.s*4,life:combo>1?.82:.58,max:combo>1?.82:.58,combo,cleared});
  if(combo>1) effects.push({type:'banner',x:cell.x+cell.s*4,y:cell.y+cell.s*4,life:.95,max:.95,combo,cleared});if(!bannerT)banner=combo>1?'COMBO x'+combo:'MATCH!';bannerT=.8;sound(combo>=3?'combo':'match');if(cleared>=4||plan.flat().some(Boolean))sound('special');swapInfo=null;phase=.42;state='clearing'}
function collapse(){cascadeDrops=[];for(let c=0;c<N;c++){let wr=N-1;for(let r=N-1;r>=0;r--){if(board[r][c].matched)continue;if(wr!==r){const moved=board[r][c];cascadeDrops.push({x:cellX(c),y:moved.y,ty:cellY(wr),life:.34,max:.34});board[wr][c]=moved}board[wr][c].tx=cellX(c);board[wr][c].ty=cellY(wr);wr--}for(let r=wr;r>=0;r--){const x=makeCell(Math.floor(Math.random()*TYPES));x.x=cellX(c);x.y=cellY(r)-cell.s*(wr-r+1);x.tx=cellX(c);x.ty=cellY(r);board[r][c]=x;cascadeDrops.push({x:cellX(c),y:x.y,ty:x.ty,life:.46,max:.46})}}state='falling'}
function shuffle(){fill();while(!findMove())fill();selected=null;hint=null;combo=0;banner='NO MOVES • SHUFFLED';bannerT=1.2;sound('special')}
function doSwap(a,b){[board[a.r][a.c],board[b.r][b.c]]=[board[b.r][b.c],board[a.r][a.c]];board[a.r][a.c].tx=cellX(a.c);board[a.r][a.c].ty=cellY(a.r);board[b.r][b.c].tx=cellX(b.c);board[b.r][b.c].ty=cellY(b.r);sound('swap')}
function choose(q){if(state!=='playing')return;if(!selected){selected=q;sound('select');return}if(q.r===selected.r&&q.c===selected.c){selected=null;return}if(adj(selected,q)){if(!swapValid(selected,q)){sound('error');selected=null;return}moves--;swapInfo={a:selected,b:q};doSwap(selected,q);selected=null;phase=.22;state='swapping'}else{selected=q;sound('select')}}
function showHint(){const h=findMove();if(h){hint=h;hintT=2.2}}
function spawn(x,y,n){
  n=Math.min(n,14);
  for(let i=0;i<n;i++){
    if(particles.length>=MAX_PARTICLES) particles.shift();
    const a=Math.random()*Math.PI*2,s=40+Math.random()*130;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.45+Math.random()*.18,max:.63,size:2+Math.random()*4});
  }
}
function sound(n){
  if(!soundOn||!sounds[n])return;
  try{
    const a=sounds[n];
    a.currentTime=0;
    a.play().catch(()=>{});
  }catch(_){}
}
function drawBackground(w,h){
  if(!bg.complete){ctx.fillStyle='#20142b';ctx.fillRect(0,0,w,h);return}
  const scale=Math.max(w/bg.naturalWidth,h/bg.naturalHeight);
  const dw=bg.naturalWidth*scale,dh=bg.naturalHeight*scale;
  ctx.drawImage(bg,(w-dw)/2,(h-dh)/2,dw,dh);
}
function draw(){
  const w=parseFloat(canvas.style.width)||DESIGN_W,h=parseFloat(canvas.style.height)||DESIGN_H;
  ctx.clearRect(0,0,w,h); drawBackground(w,h);
  ctx.fillStyle='rgba(5,7,22,.22)';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#ffe299';ctx.font='800 24px system-ui';ctx.textAlign='center';ctx.fillText('BEJEWELED - MODERN EDITION',w/2,34);
  if(state==='menu'){menuDraw(w,h);return}
  hud(w);
  drawCrystalBoard();
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)drawGem(board[r][c],r,c);
  if(selected) {outline(selected.r,selected.c,'rgba(255,235,150,.98)',3); pulseSelected(selected.r,selected.c);}
  if(hint&&hintT>0){const a=.55+.45*Math.sin(performance.now()/100);outline(hint[0].r,hint[0].c,'rgba(255,255,255,'+a+')',3);outline(hint[1].r,hint[1].c,'rgba(255,255,255,'+a+')',3)}
  for(const e of effects){
    const p=1-e.life/e.max, a=Math.max(0,1-p);
    ctx.save();ctx.globalAlpha=a;
    if(e.type==='burst'){
      const rr=cell.s*(.16+p*.58);ctx.strokeStyle=e.combo>1?'#ffd86b':'rgba(255,255,255,.9)';ctx.lineWidth=Math.max(2,cell.s*.035);
      ctx.beginPath();ctx.arc(e.x,e.y,rr,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(e.x,e.y,rr*.58,0,Math.PI*2);ctx.stroke();
    }else if(e.type==='banner'){
      const rise=p*cell.s*.55;ctx.globalAlpha=a*(1-p*.25);ctx.font='900 '+Math.max(20,cell.s*(.34+Math.min(e.combo,6)*.025))+'px system-ui';ctx.textAlign='center';
      ctx.fillStyle='#fff4ae';ctx.shadowColor='#ffbd4a';ctx.shadowBlur=10;ctx.fillText('COMBO x'+e.combo,e.x,e.y-cell.s*.78-rise);ctx.shadowBlur=0;
    }else{
      ctx.strokeStyle=e.combo>1?'#ffd86b':'#ffffff';ctx.lineWidth=Math.max(2,cell.s*.025);ctx.beginPath();ctx.arc(e.x,e.y,cell.s*(.18+p*.78),0,Math.PI*2);ctx.stroke();
      if(e.combo>1){ctx.font='900 '+Math.max(18,cell.s*.42)+'px system-ui';ctx.fillStyle='#ffe38a';ctx.textAlign='center';ctx.fillText('COMBO x'+e.combo,e.x,e.y-cell.s*(.8+p*.18));}
    }
    ctx.restore();
  }
  for(const d of cascadeDrops){const p=1-d.life/d.max;ctx.save();ctx.globalAlpha=.16*(1-p);ctx.fillStyle='#bdeaff';ctx.beginPath();ctx.ellipse(d.x,d.y+(d.ty-d.y)*p,cell.s*.16,cell.s*.34*(1-p),0,0,Math.PI*2);ctx.fill();ctx.restore();}

  for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
  for(const t of toastScore){const p=1-t.life/t.max;ctx.globalAlpha=Math.max(0,1-p);ctx.fillStyle='#fff3b0';ctx.font='900 '+Math.max(14,cell.s*.28)+'px system-ui';ctx.textAlign='center';ctx.fillText(t.text,t.x,t.y-p*30)}ctx.globalAlpha=1;
  if(bannerT>0){ctx.fillStyle='#ffe29a';ctx.font='900 25px system-ui';ctx.fillText(banner,w/2,60)}
  if(state==='paused')overlay(w,h,'PAUSED',['RESUME','RESTART','MENU']);if(state==='gameover')overlay(w,h,'GAME OVER',['PLAY AGAIN','MENU']);
}
function drawCrystalBoard(){
  const bx=cell.x-BOARD_PAD,by=cell.y-BOARD_PAD;
  const bw=cell.s*N+BOARD_PAD*2,bh=cell.s*N+BOARD_PAD*2;
  // Soft external glow: low-cost shadow rather than a full-screen blur.
  ctx.save();
  ctx.shadowColor='rgba(113,191,255,.38)';
  ctx.shadowBlur=Math.max(8,cell.s*.20);
  ctx.fillStyle='rgba(8,18,44,.84)';
  round(bx,by,bw,bh,Math.max(16,cell.s*.22));
  ctx.restore();

  // Multi-layer crystal/glass frame.
  const frame=ctx.createLinearGradient(bx,by,bx+bw,by+bh);
  frame.addColorStop(0,'rgba(92,206,255,.34)');
  frame.addColorStop(.45,'rgba(31,83,145,.26)');
  frame.addColorStop(1,'rgba(163,92,255,.34)');
  ctx.fillStyle=frame;
  round(bx,by,bw,bh,Math.max(16,cell.s*.22));

  const inner=ctx.createLinearGradient(bx,by,bx,by+bh);
  inner.addColorStop(0,'rgba(255,255,255,.10)');
  inner.addColorStop(.18,'rgba(255,255,255,.025)');
  inner.addColorStop(1,'rgba(0,0,0,.20)');
  ctx.fillStyle=inner;
  round(bx+3,by+3,bw-6,bh-6,Math.max(14,cell.s*.18));

  // Individual glass cells make the 8×8 board readable without heavy grid lines.
  const gap=Math.max(2,cell.s*.055);
  const radius=Math.max(5,cell.s*.10);
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const x=cell.x+c*cell.s+gap*.5;
    const y=cell.y+r*cell.s+gap*.5;
    const cw=cell.s-gap,ch=cell.s-gap;
    const g=ctx.createLinearGradient(x,y,x,y+ch);
    g.addColorStop(0,'rgba(255,255,255,.075)');
    g.addColorStop(.42,'rgba(96,180,230,.055)');
    g.addColorStop(1,'rgba(7,16,38,.34)');
    ctx.fillStyle=g;
    round(x,y,cw,ch,radius);
    ctx.strokeStyle='rgba(205,239,255,.12)';
    ctx.lineWidth=Math.max(.7,cell.s*.009);
    ctx.stroke();
  }

  // No moving sweep/glint: keep the crystal board visually static and calm.

  ctx.strokeStyle='rgba(219,248,255,.34)';
  ctx.lineWidth=Math.max(1.2,cell.s*.018);
  round(bx,by,bw,bh,Math.max(16,cell.s*.22));
  ctx.stroke();

  ctx.strokeStyle='rgba(255,255,255,.10)';
  ctx.lineWidth=Math.max(.8,cell.s*.010);
  round(bx+4,by+4,bw-8,bh-8,Math.max(13,cell.s*.17));
  ctx.stroke();
}
function menuDraw(w,h){ctx.fillStyle='rgba(35,15,45,.88)';round(w*.16,h*.25,w*.68,h*.52,24);ctx.fillStyle='#ffe299';ctx.font='900 38px system-ui';ctx.fillText('BEJEWELED',w/2,h*.35);button(w*.25,h*.45,w*.5,52,'PLAY',true);button(w*.25,h*.55,w*.5,52,'SOUND: '+(soundOn?'ON':'OFF'));button(w*.25,h*.65,w*.5,52,'CLOSE')}
function hud(w){
  const u=cell.s/74;
  const top=Math.max(8*u, 18);
  const panelY=28*u;
  const panelH=112*u;
  // Compact crystal HUD: readable on iPhone 14 without crowding the 8x8 board.
  ctx.save();
  ctx.shadowColor='rgba(0,0,0,.30)';ctx.shadowBlur=12;
  ctx.fillStyle='rgba(22,12,40,.78)';
  round(12*u,panelY,w-24*u,panelH,18*u);
  ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(220,250,255,.25)';ctx.lineWidth=1.2;
  ctx.stroke();
  const colW=(w-44*u)/3;
  const stats=[['SCORE',score],['MOVES',moves],['LEVEL',level]];
  stats.forEach((it,i)=>{
    const cx=22*u+colW*i+colW/2;
    ctx.textAlign='center';
    ctx.fillStyle='rgba(226,244,255,.68)';
    ctx.font='800 '+Math.max(10,10.5*u)+'px system-ui';
    ctx.fillText(it[0],cx,panelY+25*u);
    ctx.fillStyle='#fff4d2';
    ctx.font='900 '+Math.max(18,21*u)+'px system-ui';
    ctx.fillText(String(it[1]),cx,panelY+49*u);
  });
  const barX=22*u,barY=panelY+70*u,barW=w-44*u,barH=7*u;
  ctx.fillStyle='rgba(255,255,255,.13)';round(barX,barY,barW,barH,4*u);
  const pw=barW*Math.min(1,Math.max(0,progress));
  if(pw>0){ctx.fillStyle='#ffd96a';round(barX,barY,pw,barH,4*u);}
  ctx.fillStyle='rgba(255,240,210,.70)';
  ctx.font='700 '+Math.max(9,10*u)+'px system-ui';
  ctx.textAlign='left';ctx.fillText('LEVEL '+level+' • '+Math.round(progress*levelTarget())+'/'+levelTarget(),barX,barY+18*u);
  ctx.textAlign='right';ctx.fillText(Math.round(progress*100)+'%',barX+barW,barY+18*u);

  // Action row sits below the board, with generous touch targets.
  const by=cell.y+cell.s*8+14*u;
  const bw=(w-54*u)/3;
  gameButton(18*u,by,bw,42*u,'💡','HINT');
  gameButton(27*u+bw,by,bw,42*u,soundOn?'🔊':'🔇','SOUND');
  gameButton(36*u+bw*2,by,bw,42*u,'☰','MENU');
  ctx.textAlign='right';ctx.fillStyle='rgba(255,255,255,.50)';
  ctx.font='700 '+Math.max(9,10*u)+'px system-ui';ctx.fillText(Math.round(fps)+' FPS',w-12*u,16*u);
  if(moves<=5){const a=.55+.45*Math.sin(performance.now()/150);ctx.globalAlpha=a;ctx.textAlign='center';ctx.fillStyle='#ffd86b';ctx.font='900 '+Math.max(11,12*u)+'px system-ui';ctx.fillText('⚠ '+moves+' MOVES LEFT',w/2,panelY+96*u);ctx.globalAlpha=1;}
  ctx.restore();
}
function overlay(w,h,title,buttons){ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(0,0,w,h);ctx.fillStyle='rgba(35,15,45,.96)';round(w*.18,h*.28,w*.64,h*.42,22);ctx.fillStyle='#ffe299';ctx.font='900 30px system-ui';ctx.fillText(title,w/2,h*.38);if(title==='GAME OVER'){ctx.fillStyle='#fff';ctx.font='700 16px system-ui';ctx.fillText('Score  '+score,w/2,h*.43)}buttons.forEach((b,i)=>button(w*.28,h*(.48+i*.1),w*.44,45,b,i===0))}
function button(x,y,w,h,t,p){ctx.fillStyle=p?'#d56cff':'rgba(255,255,255,.12)';round(x,y,w,h,13);ctx.strokeStyle='rgba(255,230,170,.35)';ctx.stroke();ctx.fillStyle='#fff';ctx.font='800 14px system-ui';ctx.fillText(t,x+w/2,y+h/2+5)}
function gameButton(x,y,w,h,icon,label){
  ctx.save();ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=8;ctx.fillStyle='rgba(35,17,52,.92)';round(x,y,w,h,14);ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(255,225,160,.28)';ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle='#ffe29a';ctx.font='900 '+Math.max(15,16*(w/112))+'px system-ui';ctx.textAlign='center';ctx.fillText(icon,x+22*(w/112),y+h/2+6);
  ctx.fillStyle='#fff';ctx.font='850 '+Math.max(11,12*(w/112))+'px system-ui';ctx.fillText(label,x+w*.62,y+h/2+5);ctx.restore();
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
  if(x.alpha<=0)return;
  const px=x.x,py=x.y;
  const sz=cell.s*GEM_RATIO*x.scale;
  const R=sz*.46;
  const palette=[
    ['#ff5a66','#a80f2e','#ffd9dc'],
    ['#ff9a3d','#bd3c08','#ffe0ad'],
    ['#ffe35a','#c58a08','#fff8bd'],
    ['#4fe78a','#087b4a','#d8ffe9'],
    ['#4db7ff','#1550b5','#d9f2ff'],
    ['#b66cff','#5520a8','#f0dcff'],
    ['#ffd5ef','#bd4f96','#fff7fc']
  ][x.kind]||['#fff','#777','#fff'];
  ctx.save();ctx.globalAlpha=x.alpha;
  const rot=x.kind===6?Math.PI/10:Math.PI/8;
  const pts=crystalPath(px,py,R,x.kind,rot);

  // Soft contact shadow gives the gem depth without a heavy blur cost.
  ctx.fillStyle='rgba(0,0,0,.28)';
  ctx.beginPath();ctx.ellipse(px,py+R*.58,R*.72,R*.18,0,0,Math.PI*2);ctx.fill();

  // Outer silhouette and body gradient.
  const g=ctx.createRadialGradient(px-R*.35,py-R*.48,R*.05,px,py,R*1.15);
  g.addColorStop(0,palette[2]);g.addColorStop(.22,palette[0]);g.addColorStop(.72,palette[0]);g.addColorStop(1,palette[1]);
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();ctx.fill();

  // Dark bevel underneath.
  ctx.save();ctx.globalAlpha*=.55;ctx.fillStyle=palette[1];
  ctx.beginPath();ctx.moveTo(px-R*.88,py+R*.02);ctx.lineTo(px,py+R*.72);ctx.lineTo(px+R*.88,py+R*.02);ctx.lineTo(px+R*.55,py+R*.62);ctx.lineTo(px-R*.55,py+R*.62);ctx.closePath();ctx.fill();ctx.restore();

  // Main upper facets.
  const facet=ctx.createLinearGradient(px-R,py-R,px+R,py+R);
  facet.addColorStop(0,palette[2]);facet.addColorStop(.32,palette[0]);facet.addColorStop(1,palette[1]);
  ctx.fillStyle=facet;
  ctx.beginPath();ctx.moveTo(px,py-R*.84);ctx.lineTo(px+R*.62,py-R*.16);ctx.lineTo(px,py+R*.18);ctx.lineTo(px-R*.62,py-R*.16);ctx.closePath();ctx.fill();

  // Side facets for a cut-crystal look.
  ctx.globalAlpha*=.72;
  ctx.fillStyle=palette[1];
  ctx.beginPath();ctx.moveTo(px-R*.62,py-R*.16);ctx.lineTo(px,py+R*.18);ctx.lineTo(px-R*.52,py+R*.54);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(px+R*.62,py-R*.16);ctx.lineTo(px,py+R*.18);ctx.lineTo(px+R*.52,py+R*.54);ctx.closePath();ctx.fill();
  ctx.globalAlpha=x.alpha;

  // Crisp rim.
  ctx.strokeStyle='rgba(255,255,255,.62)';ctx.lineWidth=Math.max(1.2,sz*.025);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=Math.max(1,sz*.012);
  ctx.beginPath();ctx.moveTo(px-R*.58,py-R*.22);ctx.lineTo(px,py-R*.78);ctx.lineTo(px+R*.58,py-R*.22);ctx.stroke();

  // Specular shine.
  const shine=ctx.createLinearGradient(px-R,py-R,px+R*.2,py+R*.2);
  shine.addColorStop(0,'rgba(255,255,255,.86)');shine.addColorStop(.16,'rgba(255,255,255,.30)');shine.addColorStop(.35,'rgba(255,255,255,0)');
  ctx.fillStyle=shine;ctx.beginPath();ctx.ellipse(px-R*.24,py-R*.30,R*.24,R*.12,-.55,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.72)';ctx.beginPath();ctx.arc(px-R*.30,py-R*.37,Math.max(1.3,sz*.035),0,Math.PI*2);ctx.fill();

  if(x.special){
    const ring=x.special==='rainbow'?'rgba(255,248,150,.95)':'rgba(255,255,255,.92)';
    ctx.strokeStyle=ring;ctx.lineWidth=Math.max(2,sz*.035);ctx.shadowColor=ring;ctx.shadowBlur=8;
    ctx.beginPath();ctx.arc(px,py,R*.82+Math.sin(performance.now()/160)*1.5,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
    ctx.fillStyle='#fff';ctx.font='900 '+Math.max(11,sz*.19)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(x.special==='row'?'↔':x.special==='col'?'↕':x.special==='bomb'?'✦':'★',px,py+sz*.02);
  }
  ctx.restore();
}
function update(dt){
  fpsFrames++;fpsTimer+=dt;if(fpsTimer>=.5){fps=Math.round(fpsFrames/fpsTimer);fpsFrames=0;fpsTimer=0}
  if(hintT>0)hintT-=dt;if(bannerT>0)bannerT-=dt;for(let r=0;r<N;r++)for(let c=0;c<N;c++){const x=board[r][c];if(x.matched){x.alpha=Math.max(0,x.alpha-dt*4);x.scale+=dt*2;continue}x.x+=(x.tx-x.x)*Math.min(1,dt*14);x.y+=(x.ty-x.y)*Math.min(1,dt*14);x.scale+=(1-x.scale)*Math.min(1,dt*10)}for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
  for(let i=toastScore.length-1;i>=0;i--){toastScore[i].life-=dt;toastScore[i].scale+=dt*1.8;if(toastScore[i].life<=0)toastScore.splice(i,1)}
  for(let i=effects.length-1;i>=0;i--){effects[i].life-=dt;if(effects[i].life<=0)effects.splice(i,1)}
  for(let i=cascadeDrops.length-1;i>=0;i--){cascadeDrops[i].life-=dt;if(cascadeDrops[i].life<=0)cascadeDrops.splice(i,1)}if(state==='swapping'){phase-=dt;if(phase<=0){if(matches().count===0){doSwap(swapInfo.a,swapInfo.b);moves++;sound('error');state='playing';swapInfo=null}else resolve(true)}}else if(state==='clearing'){phase-=dt;if(phase<=0)collapse()}else if(state==='falling'){let settled=true;for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(Math.abs(board[r][c].x-board[r][c].tx)>1||Math.abs(board[r][c].y-board[r][c].ty)>1)settled=false;if(settled)resolve(false)}else if(state==='playing'){if(moves<=5&&moves>0&&warningT<=0){warningT=.9;sound('error');}if(moves<=0)state='gameover'}}
function loop(t){
  if(!running)return;
  const dt=Math.min(.033,(t-last)/1000||0);
  last=t;
  update(dt);
  draw();
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
  if(!start)return;
  const dx=x-start.x,dy=y-start.y;
  const swipe=Math.hypot(dx,dy)>=Math.max(16,cell.s*.24);

  if(state==='menu'){
    const w=parseFloat(canvas.style.width)||DESIGN_W;
    const h=parseFloat(canvas.style.height)||DESIGN_H;
    if(hit({x:w*.25,y:h*.45,w:w*.5,h:52},x,y)){
      startGame();
    }else if(hit({x:w*.25,y:h*.55,w:w*.5,h:52},x,y)){
      setSound(!soundOn);
    }else if(hit({x:w*.25,y:h*.65,w:w*.5,h:52},x,y)){
      close();
    }
    return;
  }
  if(state==='paused'){
    const w=parseFloat(canvas.style.width)||DESIGN_W, h=parseFloat(canvas.style.height)||DESIGN_H;
    if(hit({x:w*.28,y:h*.48,w:w*.44,h:45},x,y)){state='playing';startLoop();}
    else if(hit({x:w*.28,y:h*.58,w:w*.44,h:45},x,y)){startGame();}
    else if(hit({x:w*.28,y:h*.68,w:w*.44,h:45},x,y)){close();}
    return;
  }
  if(state==='gameover'){
    const w=parseFloat(canvas.style.width)||DESIGN_W;
    const h=parseFloat(canvas.style.height)||DESIGN_H;
    if(hit({x:w*.28,y:h*.48,w:w*.44,h:45},x,y))startGame();
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
    const bw=(wScale(1)-54*u)/3;
    const pad=7*u;
    if(hit({x:18*u-pad,y:by-pad,w:bw+pad*2,h:42*u+pad*2},x,y))showHint();
    else if(hit({x:27*u+bw-pad,y:by-pad,w:bw+pad*2,h:42*u+pad*2},x,y))setSound(!soundOn);
    else if(hit({x:36*u+bw*2-pad,y:by-pad,w:bw+pad*2,h:42*u+pad*2},x,y)){state='paused';startLoop();}
  }
}

// iOS Safari can occasionally deliver a click without a complete pointer sequence.
// Keep a native click fallback for the menu buttons while avoiding double activation.
canvas.addEventListener('click',function(e){
  unlockAudio();
  if(state!=='menu')return;
  const rect=canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const x=(e.clientX-rect.left)*(parseFloat(canvas.style.width)||rect.width)/rect.width;
  const y=(e.clientY-rect.top)*(parseFloat(canvas.style.height)||rect.height)/rect.height;
  const w=parseFloat(canvas.style.width)||DESIGN_W;
  const h=parseFloat(canvas.style.height)||DESIGN_H;
  if(hit({x:w*.25,y:h*.45,w:w*.5,h:52},x,y))startGame();
  else if(hit({x:w*.25,y:h*.55,w:w*.5,h:52},x,y))setSound(!soundOn);
  else if(hit({x:w*.25,y:h*.65,w:w*.5,h:52},x,y))close();
},{passive:true});
function wScale(v){return (parseFloat(canvas.style.width)||DESIGN_W)*v}
function hScale(v){return (parseFloat(canvas.style.height)||DESIGN_H)*v}
function startGame(){start()}
function key(e){if(!modal.classList.contains('show'))return;if(e.key==='Escape'){if(state==='playing')state='paused';else close()}if((e.key==='h'||e.key==='H')&&state==='playing')showHint();if((e.key==='p'||e.key==='P'||e.key===' ')&&state==='playing'){state='paused';startLoop();}}
function close(){
  const wasPlaying=state==='playing'||state==='swapping'||state==='clearing'||state==='falling';
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
  document.body.classList.remove('game-open');
  if(wasPlaying)state='paused';
  stopLoop();
}
window.openBejeweled=function(){
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('game-open');
  fit();
  if(state==='menu')reset(); else if(state==='paused')state='playing';
  startLoop();
};
window.closeBejeweled=close;
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
fit();reset();
})();
