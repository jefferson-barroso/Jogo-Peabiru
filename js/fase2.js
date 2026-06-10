// Fase 2: travessia do rio, plataformas aquaticas, coleta e transicao para a fase final.
// O codigo mantem variaveis globais porque os botoes HTML chamam funcoes diretamente via onclick.
const W=800,H=450,WATER_Y=330,PAD_TOP=318,ACTOR_SINK=10,GRAV=.48,PSPD=3.45,JUMP=-12.4,LEVEL_LEN=5900,FLAG_X=LEVEL_LEN-160;
const IMG={};
const assetList={
  bg:"assets/images/ChatGPT Image 11 de mai. de 2026, 09_58_30.png",
  player:"assets/images/download.png",
  fruits:"assets/images/Pasted image 20260510124022.png",
  indigenous:"assets/images/Pasted image 20260510124143.png",
  weapons:"assets/images/Pasted image 20260510124813.png",
  birds:"assets/images/Pasted image 20260511100835.png",
  fish:"assets/images/image-removebg-preview (12).png"
};
let canvas,ctx,keys={},frame=0,running=false,camX=0,score=0,hp=5,maxHp=5,nextLife=1000,weapon="sword";
let atkCD=0,atkOn=false,atkT=0,atkDir=1,iframes=0,flagReached=false,bgmT=null,bgmI=0,AC;
let pads=[],fruits=[],natives=[],birds=[],fish=[],projs=[],particles=[];
const P={x:90,y:302,w:48,h:64,vx:0,vy:0,onGround:false,dir:1,state:"idle"};

function loadImg(key,src){return new Promise(r=>{const i=new Image();i.onload=()=>{IMG[key]=i;r()};i.onerror=r;i.src=src})}
function aInit(){try{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume()}catch(e){}}
function tone(f,t="square",d=.1,v=.14,dl=0){try{aInit();const o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);o.type=t;o.frequency.setValueAtTime(f,AC.currentTime+dl);g.gain.setValueAtTime(v,AC.currentTime+dl);g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+dl+d);o.start(AC.currentTime+dl);o.stop(AC.currentTime+dl+d)}catch(e){}}
const sfx={
  jump:()=>{tone(360,"square",.08,.18);tone(560,"square",.07,.12,.06)},
  atk:()=>{tone(230,"sawtooth",.06,.25);tone(155,"sawtooth",.05,.16,.05)},
  hit:()=>{tone(95,"sawtooth",.16,.42);tone(60,"sawtooth",.12,.28,.08)},
  coin:()=>{tone(720,"square",.07,.18);tone(950,"square",.07,.16,.06)},
  splash:()=>{tone(70,"sawtooth",.25,.34);tone(42,"triangle",.3,.22,.08)},
  kill:()=>{[560,720,900].forEach((f,i)=>tone(f,"square",.08,.2,i*.07))},
  indig:()=>{[420,470,390,540].forEach((f,i)=>tone(f,"triangle",.12,.16,i*.12))},
  win:()=>{[560,720,880,1120].forEach((f,i)=>tone(f,"square",.15,.28,i*.13))}
};
function bgmStart(){bgmStop();const n=[196,247,294,330,294,247,220,196,165,196,247,294];bgmT=setInterval(()=>{tone(n[bgmI++%n.length],"triangle",.32,.045)},390)}
function bgmStop(){if(bgmT){clearInterval(bgmT);bgmT=null}}
function overlap(ax,ay,aw,ah,bx,by,bw,bh){return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by}
function showMsg(t,d=1800){const el=document.getElementById("msg");el.textContent=t;el.style.display="block";clearTimeout(showMsg.to);showMsg.to=setTimeout(()=>el.style.display="none",d)}

function buildLevel(){
  pads=[];fruits=[];natives=[];birds=[];fish=[];projs=[];particles=[];flagReached=false;
  score=0;hp=maxHp;weapon="sword";nextLife=1000;iframes=0;atkCD=0;atkOn=false;
  const padXs=[70,315,575,850,1125,1390,1665,1930,2205,2490,2780,3055,3335,3620,3910,4200,4490,4785,5080,5380,5660];
  padXs.forEach((x,i)=>pads.push({x,y:PAD_TOP,w:i%4===0?150:118,h:34,bob:i*19,kind:i%3}));
  [360,690,1030,1320,1700,2040,2370,2700,3090,3450,3790,4140,4510,4860,5220].forEach((x,i)=>{
    const p=pads[(i+1)%pads.length];
    fruits.push({x,y:p.y-20,type:i%3,collected:false,bob:i*17});
  });
  [1040,2600,4210].forEach((x,i)=>{
    const p=pads.find(q=>Math.abs(q.x-x)<140)||pads[i+4];
    natives.push({x:p.x+p.w*.45,y:p.y,w:42,h:64,dir:-1,interacted:false});
  });
  [760,1260,1860,2440,3180,3770,4630,5260].forEach((x,i)=>birds.push({x,y:125+i%2*28,w:46,h:34,dir:i%2?-1:1,speed:1.55+i%3*.25,phase:i*24,alive:true,anim:0}));
  [520,900,1480,2150,2860,3560,4320,5000,5520].forEach((x,i)=>fish.push(makeFish(x,i*23)));
}
function makeFish(x,phase){return {x,y:WATER_Y+42,w:42,h:24,vy:-9-Math.random()*3,baseX:x,phase,alive:true,rot:0,wait:phase%90}}

function hudUpdate(){
  document.getElementById("hp-bar-fill").style.width=Math.max(0,hp/maxHp*100)+"%";
  const hearts=document.getElementById("hp-hearts");hearts.innerHTML="";
  for(let i=0;i<maxHp;i++){const s=document.createElement("span");s.className="heart";s.textContent=i<hp?"❤":"🖤";hearts.appendChild(s)}
  document.getElementById("score-el").textContent="PONTOS: "+score;
  document.getElementById("weapon-el").textContent=({sword:"ESPADA",boomerang:"BOOMERANG",whip:"CHICOTE"})[weapon];
}
function checkLifeUp(){while(score>=nextLife&&hp<maxHp){hp++;showMsg("+1 VIDA",1500);nextLife+=1000;hudUpdate()}if(score>=nextLife)nextLife=Math.ceil(score/1000)*1000+1000}

function drawBG(){
  const bg=IMG.bg;
  if(bg){
    const sx=(camX*.16)%(bg.width/2);
    ctx.drawImage(bg,sx,0,bg.width/2,bg.height,0,0,W,H);
    ctx.fillStyle="rgba(0,30,45,.18)";ctx.fillRect(0,0,W,H);
  }else{
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#06435a");g.addColorStop(.7,"#0a4d5b");g.addColorStop(1,"#032a3b");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
  const water=ctx.createLinearGradient(0,WATER_Y-12,0,H);
  water.addColorStop(0,"rgba(19,151,177,.78)");
  water.addColorStop(.45,"rgba(5,93,127,.88)");
  water.addColorStop(1,"rgba(2,42,67,.96)");
  ctx.fillStyle=water;
  ctx.fillRect(0,WATER_Y-16,W,H-WATER_Y+16);
  ctx.fillStyle="rgba(180,250,255,.55)";
  for(let i=0;i<24;i++){const x=((i*86-frame*1.5-camX*.7)%(W+130)+W+130)%(W+130)-90;ctx.fillRect(x,WATER_Y+8+(i%5)*18,58,2)}
  ctx.fillStyle="rgba(0,36,58,.22)";
  for(let i=0;i<18;i++){const x=((i*110+frame*.7-camX*.4)%(W+160)+W+160)%(W+160)-110;ctx.fillRect(x,WATER_Y+24+(i%4)*24,74,3)}
}
function drawPadShape(x,y,w,h,bob){
  const dy=Math.sin((frame+bob)*.045)*2;
  ctx.save();ctx.translate(x,y+dy);
  ctx.globalAlpha=.45;
  ctx.fillStyle="#d7ffff";
  ctx.beginPath();ctx.ellipse(w/2,h/2+15,w*.56,h*.32,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  ctx.fillStyle="#073d23";ctx.beginPath();ctx.ellipse(w/2,h/2+7,w*.52,h*.55,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#39a832";ctx.beginPath();ctx.ellipse(w/2,h/2,w*.48,h*.5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#8ee33b";ctx.beginPath();ctx.ellipse(w/2,h/2-3,w*.4,h*.34,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#1d7a24";ctx.beginPath();ctx.moveTo(w/2,h/2);ctx.lineTo(w*.9,h*.2);ctx.lineTo(w*.77,h*.52);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#145b20";ctx.lineWidth=2;
  for(let a=-.9;a<=.9;a+=.3){ctx.beginPath();ctx.moveTo(w/2,h/2);ctx.lineTo(w/2+Math.cos(a)*w*.42,h/2+Math.sin(a)*h*.43);ctx.stroke()}
  ctx.restore();
}
function drawPlatforms(){pads.forEach(p=>{const dx=p.x-camX;if(dx<-220||dx>W+120)return;drawPadShape(dx,p.y,p.w,p.h,p.bob)})}
function drawFlag(){
  const dx=FLAG_X-camX;if(dx<-80||dx>W+80)return;
  ctx.fillStyle="#ddd";ctx.fillRect(dx,WATER_Y-90,5,90);
  ctx.fillStyle="#ffdf4d";ctx.beginPath();ctx.moveTo(dx+5,WATER_Y-90);ctx.lineTo(dx+48,WATER_Y-78);ctx.lineTo(dx+5,WATER_Y-62);ctx.fill();
  ctx.fillStyle="#083d4f";ctx.font="bold 9px Courier New";ctx.textAlign="center";ctx.fillText("MONTANHA",dx+26,WATER_Y-75);
}
function drawPlayer(){
  if(iframes>0&&Math.floor(iframes/5)%2===0)return;
  const dx=P.x-camX,dy=P.y-P.h+ACTOR_SINK,flip=P.dir<0,sp=IMG.player;
  ctx.save();if(flip){ctx.translate(dx+P.w,dy);ctx.scale(-1,1)}else ctx.translate(dx,dy);
  if(sp){const sw=sp.width/2,sx=(P.state==="run"||P.state==="jump")?sw:0;ctx.drawImage(sp,sx,0,sw,sp.height,0,0,P.w,P.h)}
  else{ctx.fillStyle="#d8a85c";ctx.fillRect(12,0,24,20);ctx.fillStyle="#296b28";ctx.fillRect(7,20,34,28);ctx.fillStyle="#684018";ctx.fillRect(8,48,12,16);ctx.fillRect(28,48,12,16)}
  drawWeaponInHand();ctx.restore();
}
function drawWeaponInHand(){
  const hx=P.w-8,hy=P.h*.45,dir=1;
  ctx.save();ctx.translate(hx,hy);
  if(weapon==="sword"){
    const swing=atkOn?((18-atkT)/18):0;ctx.rotate(atkOn?(-1.1+swing*2.2):-.22);
    ctx.fillStyle="#d9f4ff";ctx.fillRect(0,-3,atkOn?44:34,6);ctx.fillStyle="#fff";ctx.fillRect(4,2,26,2);ctx.fillStyle="#c88a16";ctx.fillRect(-5,-6,9,12);
  }else if(weapon==="boomerang"){
    ctx.rotate(frame*.18);ctx.strokeStyle="#c47a22";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-10,7);ctx.quadraticCurveTo(0,-10,14,6);ctx.stroke();
  }else{
    const len=atkOn?58:24;ctx.strokeStyle="#9b5b22";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(dir*len*.55,Math.sin(frame*.16)*12,dir*len,Math.sin(frame*.16+1)*12);ctx.stroke();
  }
  ctx.restore();
}
function drawFruitSprite(f,dx,y){
  const sp=IMG.fruits,sz=34;
  if(sp){
    const crops=[
      {x:8,y:35,w:112,h:96},
      {x:126,y:38,w:112,h:92},
      {x:258,y:28,w:76,h:126}
    ];
    const c=crops[f.type]||crops[0];
    ctx.drawImage(sp,c.x,c.y,c.w,c.h,dx-sz/2,y-sz,sz,sz);
  }
  else{ctx.fillStyle=["#ff9a22","#ffe14a","#9c4ddd"][f.type];ctx.fillRect(dx-13,y-28,26,26)}
}
function drawFruits(){fruits.forEach(f=>{if(f.collected)return;const dx=f.x-camX;if(dx<-70||dx>W+70)return;drawFruitSprite(f,dx,f.y+Math.sin((frame+f.bob)*.07)*5)})}
function drawNatives(){
  natives.forEach(n=>{if(n.interacted)return;const dx=n.x-camX;if(dx<-90||dx>W+90)return;ctx.save();if(n.dir<0){ctx.translate(dx+n.w,n.y-n.h+ACTOR_SINK);ctx.scale(-1,1)}else ctx.translate(dx,n.y-n.h+ACTOR_SINK);const sp=IMG.indigenous;if(sp)ctx.drawImage(sp,0,0,sp.width,sp.height,0,0,n.w,n.h);else{ctx.fillStyle="#c28a45";ctx.fillRect(0,0,n.w,n.h)}ctx.restore();if(Math.abs(n.x-P.x)<100){ctx.fillStyle="#ffff62";ctx.font="bold 11px Courier New";ctx.textAlign="center";ctx.fillText("[G]",dx+n.w/2,n.y-n.h+ACTOR_SINK-9)}})
}
function drawBirds(){
  const sp=IMG.birds;
  birds.forEach(b=>{if(!b.alive)return;const dx=b.x-camX;if(dx<-120||dx>W+120)return;ctx.save();if(b.dir<0){ctx.translate(dx+b.w,b.y-b.h/2);ctx.scale(-1,1)}else ctx.translate(dx,b.y-b.h/2);if(sp){const cols=6,rows=2,sw=sp.width/cols,sh=sp.height/rows,sx=(b.anim%6)*sw;ctx.drawImage(sp,sx,0,sw,sh,0,0,b.w,b.h)}else{ctx.fillStyle="#1aa6df";ctx.fillRect(0,8,b.w,16);ctx.fillStyle="#ffd15a";ctx.fillRect(30,14,12,8)}ctx.restore()})
}
function drawFish(){
  const sp=IMG.fish;
  fish.forEach(f=>{if(!f.alive)return;const dx=f.x-camX;if(dx<-90||dx>W+90)return;ctx.save();ctx.translate(dx,f.y);ctx.rotate(f.rot);if(sp){const crops=[{x:2,y:6,w:72,h:34},{x:82,y:8,w:68,h:33},{x:7,y:54,w:76,h:38}],c=crops[f.phase%3];ctx.drawImage(sp,c.x,c.y,c.w,c.h,-f.w/2,-f.h/2,f.w,f.h)}else{ctx.fillStyle="#f08a23";ctx.fillRect(-f.w/2,-f.h/2,f.w,f.h)}ctx.restore()})
}
function drawProjs(){projs.forEach(p=>{const dx=p.x-camX;ctx.save();ctx.translate(dx,p.y);ctx.rotate(p.rot);ctx.strokeStyle="#c47a22";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-12,7);ctx.quadraticCurveTo(0,-10,14,6);ctx.stroke();ctx.restore()})}
function drawPFX(){particles.forEach(p=>{ctx.globalAlpha=p.life/p.max;ctx.fillStyle=p.col;ctx.fillRect((p.x-camX)|0,p.y|0,p.s,p.s)});ctx.globalAlpha=1}
function drawProgress(){
  const prog=Math.min(1,Math.max(0,(P.x-80)/(LEVEL_LEN-180)));
  ctx.fillStyle="rgba(0,0,0,.62)";ctx.fillRect(8,H-20,W-16,14);
  const g=ctx.createLinearGradient(8,0,W-8,0);g.addColorStop(0,"#0e7890");g.addColorStop(.7,"#32c6df");g.addColorStop(1,"#ffee66");
  ctx.fillStyle=g;ctx.fillRect(8,H-20,(W-16)*prog,14);ctx.strokeStyle="#66f0ff";ctx.strokeRect(8,H-20,W-16,14);
  const mx=8+(W-16)*prog;ctx.fillStyle="#ffe45a";ctx.fillRect(mx-4,H-23,8,18);
  ctx.fillStyle="#fff";ctx.font="bold 9px Courier New";ctx.textAlign="left";ctx.fillText("Rio",12,H-7);ctx.textAlign="right";ctx.fillText("Montanha",W-10,H-7);
}

function spawnPFX(x,y,col,n=8){for(let i=0;i<n;i++){const a=Math.PI*2*i/n;particles.push({x,y,vx:Math.cos(a)*(2+Math.random()*2.5),vy:Math.sin(a)*(2+Math.random()*2.5)-1,col,s:4+Math.random()*4,life:30,max:30})}}
function applyPhysics(){
  P.vy+=GRAV;P.y+=P.vy;P.onGround=false;
  pads.forEach(p=>{
    const py=p.y;
    const prev=P.y-P.vy;
    if(P.vy>=0&&prev<=py+8&&P.y>=py&&P.x+P.w>p.x+10&&P.x<p.x+p.w-10){P.y=py;P.vy=0;P.onGround=true}
  });
}
function updatePlayer(){
  if(keys.ArrowRight||keys.KeyD){P.vx=PSPD;P.dir=1}else if(keys.ArrowLeft||keys.KeyA){P.vx=-PSPD;P.dir=-1}else P.vx=0;
  P.x=Math.max(0,Math.min(P.x+P.vx,LEVEL_LEN));applyPhysics();
  if((keys.ArrowUp||keys.KeyW||keys.Space)&&P.onGround){P.vy=JUMP;P.onGround=false;sfx.jump()}
  if(P.y>WATER_Y+70&&!flagReached){waterDeath();return}
  if(atkCD>0)atkCD--;if(keys.KeyF&&atkCD===0){atkCD=32;atkOn=true;atkT=18;atkDir=P.dir;sfx.atk();if(weapon==="boomerang")projs.push({x:P.x+P.w/2,y:P.y-P.h/2,vx:P.dir*8,rot:0,life:78,ret:false})}
  if(atkT>0){atkT--;if(atkT===0)atkOn=false}
  P.state=atkT>0?"attack":(!P.onGround?"jump":(P.vx!==0?"run":"idle"));
  camX=Math.max(0,Math.min(P.x-W/3.5,LEVEL_LEN-W));if(iframes>0)iframes--;
}
function killEnemy(e,x,y){e.alive=false;score+=50;spawnPFX(x,y,"#a8ff8a",10);sfx.kill();showMsg("+50 PONTOS",900);checkLifeUp();hudUpdate()}
function updateBirds(){
  birds.forEach(b=>{if(!b.alive)return;b.anim=(frame/8|0)%6;const dist=Math.abs((b.x+20)-P.x);const swoop=dist<270?Math.sin((270-dist)/270*Math.PI)*88:0;b.y=120+Math.sin((frame+b.phase)*.04)*22+swoop;b.x+=b.dir*b.speed;if(b.x<120)b.dir=1;if(b.x>LEVEL_LEN-80)b.dir=-1;
    if(atkOn&&(weapon==="sword"||weapon==="whip")){const reach=weapon==="whip"?66:46,ax=atkDir>0?P.x+P.w:P.x-reach;if(overlap(ax,P.y-P.h,reach,P.h,b.x,b.y-b.h/2,b.w,b.h))killEnemy(b,b.x+b.w/2,b.y)}
    if(iframes===0&&overlap(P.x+7,P.y-P.h+8,P.w-14,P.h-12,b.x,b.y-b.h/2,b.w,b.h))takeDmg();
  })
}
function updateFish(){
  fish.forEach((f,i)=>{if(!f.alive)return;if(f.wait>0){f.wait--;return}f.vy+=.32;f.y+=f.vy;f.rot=Math.sin(frame*.12+f.phase)*.2;f.x=f.baseX+Math.sin((frame+f.phase)*.028)*48;
    if(f.y>WATER_Y+60){Object.assign(f,makeFish(f.baseX+120+Math.random()*80,frame+i*13));f.baseX=Math.min(f.baseX,LEVEL_LEN-120)}
    if(atkOn&&(weapon==="sword"||weapon==="whip")){const reach=weapon==="whip"?64:46,ax=atkDir>0?P.x+P.w:P.x-reach;if(overlap(ax,P.y-P.h,reach,P.h,f.x-f.w/2,f.y-f.h/2,f.w,f.h))killEnemy(f,f.x,f.y)}
    if(iframes===0&&overlap(P.x+7,P.y-P.h+8,P.w-14,P.h-12,f.x-f.w/2,f.y-f.h/2,f.w,f.h)){const stomp=P.vy>0&&P.y-P.h/2<f.y;if(stomp){P.vy=JUMP*.55;killEnemy(f,f.x,f.y)}else takeDmg()}
  })
}
function updateFruits(){fruits.forEach(f=>{if(f.collected)return;if(overlap(P.x,P.y-P.h,P.w,P.h,f.x-17,f.y-34,34,34)){f.collected=true;score+=100;sfx.coin();spawnPFX(f.x,f.y-18,"#ffdc54",7);showMsg("+100 PONTOS",900);checkLifeUp();hudUpdate()}})}
function updateNatives(){
  natives.forEach(n=>{if(n.interacted)return;n.dir=n.x>P.x?-1:1;if(keys.KeyG&&Math.abs(n.x-P.x)<100&&!n.lock){n.lock=true;n.interacted=true;sfx.indig();if(Math.random()<.5){const pool=["sword","boomerang","whip"].filter(w=>w!==weapon);weapon=pool[Math.floor(Math.random()*pool.length)];showMsg("Indigena deu: "+({sword:"Espada",boomerang:"Boomerang",whip:"Chicote"})[weapon],2400);spawnPFX(n.x,n.y-n.h/2,"#ffff66",12);hudUpdate()}else{takeDmg();showMsg("O indigena atacou! -1 VIDA",2000)}}})
}
function updateProjs(){
  projs=projs.filter(p=>p.life>0);projs.forEach(p=>{p.x+=p.vx;p.life--;p.rot+=.32;if(p.life<40&&!p.ret){p.ret=true;p.vx*=-1.2}
    birds.concat(fish).forEach(e=>{if(!e.alive)return;const ex=e.y?e.x:e.baseX,ey=e.y||WATER_Y;if(overlap(p.x-14,p.y-10,28,20,(e.x||ex)-e.w/2,ey-e.h/2,e.w,e.h)){killEnemy(e,e.x||ex,ey);p.life=0}})
  })
}
function updatePFX(){particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.13;p.life--;p.s*=.96})}
function takeDmg(){if(iframes>0)return;hp--;iframes=105;sfx.hit();spawnPFX(P.x+P.w/2,P.y-P.h/2,"#ff5555",9);hudUpdate();if(hp<=0){hp=0;setTimeout(doGameOver,650)}}
function waterDeath(){if(flagReached)return;flagReached=true;sfx.splash();spawnPFX(P.x+P.w/2,WATER_Y+28,"#8df4ff",18);showMsg("A agua levou Pedro!",900);setTimeout(doGameOver,650)}
function checkWin(){if(flagReached)return;if(P.x+P.w>FLAG_X){flagReached=true;sfx.win();bgmStop();setTimeout(doWin,650)}}
function loop(){
  if(!running)return;frame++;ctx.clearRect(0,0,W,H);
  drawBG();drawPlatforms();drawFlag();drawFruits();drawNatives();drawFish();drawBirds();drawProjs();drawPlayer();drawPFX();drawProgress();
  updatePlayer();if(!running)return;updateBirds();updateFish();updateFruits();updateNatives();updateProjs();updatePFX();checkWin();
  requestAnimationFrame(loop);
}

function showRiverIntro(){
  document.getElementById("s-menu").style.display="none";document.getElementById("s-intro").style.display="block";
  document.getElementById("intro-body").textContent=
`Depois da floresta, Pedro encontra o trecho alagado do Peabiru.

Nao ha estrada firme: apenas vitorias-regias balancando sobre a correnteza.

Peixes saltam do rio. Passaros descem em rasantes.
E alguns encontros nas margens podem ser ajuda... ou emboscada.

Uma queda na agua encerra a travessia.
Pule com precisao. Ataque quando for necessario. Alcance a outra margem.`;
  aInit();tone(105,"triangle",1.6,.05);tone(175,"triangle",1.8,.04,.4);
}
function showTutorial(){document.getElementById("s-intro").style.display="none";document.getElementById("s-tutorial").style.display="block"}
function startGame(){
  document.getElementById("overlay").classList.add("hidden");
  Object.assign(P,{x:95,y:PAD_TOP,vx:0,vy:0,onGround:true,dir:1,state:"idle"});
  frame=0;camX=0;buildLevel();hudUpdate();running=true;bgmStart();loop();showMsg("Atravesse o rio sem cair na agua!",2800);
}
function doGameOver(){running=false;bgmStop();document.getElementById("overlay").classList.remove("hidden");hideScreens();document.getElementById("s-over").style.display="block";document.getElementById("go-score").textContent="Pontuacao: "+score}
function doWin(){running=false;bgmStop();document.getElementById("overlay").classList.remove("hidden");hideScreens();document.getElementById("s-win").style.display="block";document.getElementById("win-score").textContent="Pontuacao Final: "+score}
function hideScreens(){["s-menu","s-intro","s-tutorial","s-over","s-win"].forEach(id=>document.getElementById(id).style.display="none")}
function restartGame(){hideScreens();document.getElementById("s-menu").style.display="block";document.getElementById("overlay").classList.remove("hidden");running=false;bgmStop();keys={};flagReached=false}
function goToFinalPhase(){window.location.href="fase3.html"}
window.addEventListener("keydown",e=>{keys[e.code]=true;if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();aInit()});
window.addEventListener("keyup",e=>keys[e.code]=false);
async function boot(){
  canvas=document.getElementById("c");ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;
  await Promise.all(Object.entries(assetList).map(([k,v])=>loadImg(k,v)));
  drawBG();ctx.fillStyle="rgba(0,0,0,.48)";ctx.fillRect(0,0,W,H);ctx.fillStyle="#6ee7ff";ctx.font="bold 34px Courier New";ctx.textAlign="center";ctx.fillText("PEABIRU",W/2,H/2-12);ctx.fillStyle="#f3d37a";ctx.font="12px Courier New";ctx.fillText("FASE 2 - RIO DE PEABIRU",W/2,H/2+16);
}
window.addEventListener("load",boot);
