// Fase final: subida da montanha, combate contra o chefe e encerramento do jogo.
// O codigo mantem variaveis globais porque os botoes HTML chamam funcoes diretamente via onclick.
const W=800,H=450,WORLD_W=1850,WORLD_H=2350,GRAV=.5,PSPD=3.55,JUMP=-12.6,CLIMB_TOP=345,DEATH_Y=WORLD_H+130;
const IMG={},SPR={};
const assetList={
  bg:"assets/images/Pasted image 20260518093111.png", platforms:"assets/images/fase3_platforms_alpha.png", boss:"assets/images/fase3_boss_alpha.png",
  player:"assets/images/download.png", fruits:"assets/images/Pasted image 20260510124022.png", indigenous:"assets/images/Pasted image 20260510124143.png"
};
let canvas,ctx,keys={},frame=0,running=false,mode="climb",camX=0,camY=0,score=0,hp=5,maxHp=5,nextLife=1000,weapon="sword";
let atkCD=0,atkOn=false,atkT=0,atkDir=1,iframes=0,bgmT=null,bgmI=0,AC,won=false;
let platforms=[],fruits=[],natives=[],rocks=[],projs=[],bossShots=[],particles=[];
const P={x:105,y:2160,w:48,h:64,vx:0,vy:0,onGround:false,dir:1,state:"idle"};
const boss={x:1325,y:322,w:130,h:150,hp:2000,maxHp:2000,alive:true,cd:70,anim:0,flash:0,dir:-1,speed:1.15,castT:0};
function goToBegin(){
  window.location.href = "index.html";
}

function loadImg(key,src){return new Promise(r=>{const i=new Image();i.onload=()=>{IMG[key]=i;r()};i.onerror=r;i.src=src})}
function makeTransparent(img,thr=246){const c=document.createElement("canvas"),x=c.getContext("2d");c.width=img.width;c.height=img.height;x.drawImage(img,0,0);const d=x.getImageData(0,0,c.width,c.height),a=d.data;for(let i=0;i<a.length;i+=4){if(a[i]>thr&&a[i+1]>thr&&a[i+2]>thr)a[i+3]=0}x.putImageData(d,0,0);return c}
function aInit(){try{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume()}catch(e){}}
function tone(f,t="square",d=.1,v=.15,dl=0){try{aInit();const o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);o.type=t;o.frequency.setValueAtTime(f,AC.currentTime+dl);g.gain.setValueAtTime(v,AC.currentTime+dl);g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+dl+d);o.start(AC.currentTime+dl);o.stop(AC.currentTime+dl+d)}catch(e){}}
const sfx={jump:()=>{tone(340,"square",.1,.18);tone(520,"square",.07,.12,.07)},atk:()=>{tone(220,"sawtooth",.07,.28)},hit:()=>{tone(90,"sawtooth",.18,.45);tone(60,"sawtooth",.12,.3,.09)},coin:()=>{tone(700,"square",.07,.18);tone(920,"square",.07,.18,.07)},rock:()=>{tone(75,"sawtooth",.2,.3)},bossCast:()=>{tone(130,"triangle",.18,.18);tone(180,"triangle",.18,.14,.08);tone(240,"triangle",.22,.12,.17)},bossFire:()=>{tone(520,"sawtooth",.09,.28);tone(260,"sawtooth",.18,.22,.05);tone(90,"triangle",.22,.12,.08)},bossRock:()=>{tone(105,"sawtooth",.18,.28);tone(70,"sawtooth",.28,.18,.1)},bossHurt:()=>{tone(180,"square",.07,.24);tone(120,"sawtooth",.12,.2,.06)},boom:()=>{tone(70,"sawtooth",.16,.35);tone(45,"triangle",.28,.22,.06)},kill:()=>{[550,700,880].forEach((f,i)=>tone(f,"square",.09,.22,i*.08))},indig:()=>{[400,450,400,520].forEach((f,i)=>tone(f,"triangle",.13,.18,i*.13))},win:()=>{[550,700,880,1100,1320].forEach((f,i)=>tone(f,"square",.15,.28,i*.12))}};
function bgmStart(){bgmStop();const n=[165,196,220,247,220,196,175,147];bgmT=setInterval(()=>{tone(n[bgmI++%n.length],"triangle",.34,.045)},430)}
function bgmStop(){if(bgmT){clearInterval(bgmT);bgmT=null}}
function overlap(ax,ay,aw,ah,bx,by,bw,bh){return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by}
function showMsg(t,d=1700){const el=document.getElementById("msg");el.textContent=t;el.style.display="block";clearTimeout(showMsg.to);showMsg.to=setTimeout(()=>el.style.display="none",d)}

function buildLevel(){
  platforms=[];fruits=[];natives=[];rocks=[];projs=[];bossShots=[];particles=[];score=0;hp=maxHp;nextLife=1000;weapon="sword";mode="climb";won=false;
  boss.hp=boss.maxHp;boss.alive=true;boss.cd=70;boss.flash=0;boss.dir=-1;boss.speed=1.15;boss.castT=0;
  platforms.push({x:40,y:2160,w:250,h:42,stable:true,kind:0});
  const defs=[
    [250,2045,150],[95,1930,150],[285,1815,150],[125,1700,150],
    [330,1585,160],[155,1470,150],[390,1355,160],[205,1240,150],
    [455,1125,160],[260,1010,150],[520,895,155],[330,780,150],
    [610,665,150],[410,550,160],[185,435,160],
    [65,322,720,"boss"]
  ];
  defs.forEach((d,i)=>platforms.push({x:d[0],y:d[1],w:d[2],h:i===defs.length-1?50:36,stable:i===defs.length-1,kind:i%4,touched:false,touchT:0,dead:false,breakP:0,noSprite:d[3]==="boss"}));
  platforms.push({x:780,y:322,w:880,h:50,stable:true,kind:1,noSprite:true});
  [360,170,455,235,540,330,145,455,690,390].forEach((v,i)=>{const p=platforms[1+i];fruits.push({x:p.x+p.w*.52,y:p.y-18,type:i%3,collected:false,bob:i*17})});
  natives.push({x:820,y:322,w:42,h:64,dir:-1,interacted:false});
}
function hudUpdate(){
  document.getElementById("hp-bar-fill").style.width=Math.max(0,hp/maxHp*100)+"%";
  const hearts=document.getElementById("hp-hearts");hearts.innerHTML="";for(let i=0;i<maxHp;i++){const s=document.createElement("span");s.className="heart";s.textContent=i<hp?"❤":"🖤";hearts.appendChild(s)}
  document.getElementById("score-el").textContent="PONTOS: "+score;
  document.getElementById("weapon-el").textContent=({sword:"ESPADA",boomerang:"BOOMERANG",whip:"CHICOTE"})[weapon];
  document.getElementById("boss-hud").style.display=(mode==="boss"&&boss.alive)?"block":"none";
  document.getElementById("boss-fill").style.width=Math.max(0,boss.hp/boss.maxHp*100)+"%";
}
function checkLifeUp(){while(score>=nextLife&&hp<maxHp){hp++;showMsg("+1 VIDA",1400);nextLife+=1000;hudUpdate()}if(score>=nextLife)nextLife=Math.ceil(score/1000)*1000+1000}

function drawBG(){
  const bg=IMG.bg;if(bg){const sx=Math.min(bg.width-W,Math.max(0,camX*.18));const sy=Math.min(bg.height-H,Math.max(0,camY*.22));ctx.drawImage(bg,sx,sy,W,H,0,0,W,H)}else{ctx.fillStyle="#9aa8b3";ctx.fillRect(0,0,W,H)}
  const fog=ctx.createLinearGradient(0,0,0,H);fog.addColorStop(0,"rgba(220,230,235,.10)");fog.addColorStop(.75,"rgba(180,200,210,.22)");fog.addColorStop(1,"rgba(40,45,50,.16)");ctx.fillStyle=fog;ctx.fillRect(0,0,W,H);
}
function sx(x){return x-camX}function sy(y){return y-camY}
function drawPlatform(p){
  if(p.dead)return;const dx=sx(p.x),dy=sy(p.y);if(dx+p.w<-80||dx>W+80||dy+p.h<-80||dy>H+80)return;
  if(p.noSprite){
    ctx.fillStyle="#6f6258";
    ctx.fillRect(dx,dy,p.w,p.h);
    ctx.fillStyle="#94877c";
    ctx.fillRect(dx,dy,p.w,8);
    ctx.fillStyle="rgba(0,0,0,.22)";
    for(let x=0;x<p.w;x+=38)ctx.fillRect(dx+x,dy+8,2,p.h-8);
  }else if(SPR.platforms){
    const stableCrops=[{x:28,y:412,w:324,h:136},{x:406,y:416,w:254,h:116},{x:734,y:424,w:194,h:102},{x:994,y:432,w:160,h:84},{x:1216,y:442,w:116,h:66}];
    const breakCrops=[{x:28,y:662,w:272,h:122},{x:334,y:662,w:226,h:112},{x:612,y:662,w:200,h:104},{x:862,y:662,w:92,h:78},{x:964,y:668,w:76,h:76},{x:1088,y:672,w:70,h:68},{x:1302,y:682,w:54,h:48}];
    let c=stableCrops[p.kind%stableCrops.length];
    if(p.breakP>.16)c=breakCrops[Math.min(breakCrops.length-1,Math.floor(p.breakP*breakCrops.length))];
    const vh=Math.max(58,p.w*(c.h/c.w));
    ctx.globalAlpha=p.breakP?Math.max(.38,1-p.breakP*.35):1;
    ctx.drawImage(SPR.platforms,c.x,c.y,c.w,c.h,dx,dy-8,p.w,vh);
    ctx.globalAlpha=1
  }
  else{ctx.fillStyle=p.breakP?"#8a6a4a":"#756558";ctx.fillRect(dx,dy,p.w,p.h)}
  if(!p.stable&&p.touched){ctx.fillStyle=p.breakP>.55?"#ff8060":"#ffe060";ctx.font="bold 10px Courier New";ctx.textAlign="center";ctx.fillText(Math.ceil((240-p.touchT)/60),dx+p.w/2,dy-10)}
}
function drawRocks(){
  rocks.forEach(r=>{const dx=sx(r.x),dy=sy(r.y);if(dx<-120||dx>W+120||dy<-170||dy>H+90)return;ctx.save();ctx.translate(dx,dy);ctx.rotate(r.rot);drawFallingRockSprite(r);ctx.restore()})
}
function drawRockShape(x,y,w,h){ctx.fillStyle="#574839";ctx.beginPath();ctx.moveTo(x+w*.25,y);ctx.lineTo(x+w*.78,y+h*.08);ctx.lineTo(x+w,y+h*.55);ctx.lineTo(x+w*.65,y+h);ctx.lineTo(x+w*.15,y+h*.85);ctx.lineTo(x,y+h*.35);ctx.closePath();ctx.fill();ctx.strokeStyle="#2b2420";ctx.stroke();ctx.fillStyle="rgba(255,230,180,.24)";ctx.fillRect(x+w*.25,y+h*.18,w*.25,h*.12)}
function drawFallingRockSprite(r){
  if(SPR.platforms){
    const crops=[{x:56,y:68,w:110,h:220},{x:250,y:66,w:88,h:220},{x:418,y:88,w:74,h:194},{x:578,y:100,w:62,h:182},{x:734,y:110,w:44,h:170},{x:872,y:146,w:28,h:134}];
    const c=crops[r.kind%crops.length];
    ctx.drawImage(SPR.platforms,c.x,c.y,c.w,c.h,-r.w*.75,-r.h*1.85,r.w*1.5,r.h*2.35);
  }else drawRockShape(-r.w/2,-r.h/2,r.w,r.h)
}
function drawPlayer(){
  if(iframes>0&&Math.floor(iframes/5)%2===0)return;const dx=sx(P.x),dy=sy(P.y-P.h+7),sp=IMG.player;ctx.save();if(P.dir<0){ctx.translate(dx+P.w,dy);ctx.scale(-1,1)}else ctx.translate(dx,dy);if(sp){const sw=sp.width/2,srx=(P.state==="run"||P.state==="jump")?sw:0;ctx.drawImage(sp,srx,0,sw,sp.height,0,0,P.w,P.h)}else{ctx.fillStyle="#d8a85c";ctx.fillRect(12,0,24,20);ctx.fillStyle="#296b28";ctx.fillRect(7,20,34,28)}drawWeapon();ctx.restore()}
function drawWeapon(){const hx=P.w-8,hy=P.h*.45;ctx.save();ctx.translate(hx,hy);if(weapon==="sword"){const sw=atkOn?(18-atkT)/18:0;ctx.rotate(atkOn?(-1.1+sw*2.2):-.22);ctx.fillStyle="#d9f4ff";ctx.fillRect(0,-3,atkOn?44:34,6);ctx.fillStyle="#c88a16";ctx.fillRect(-5,-6,9,12)}else if(weapon==="boomerang"){ctx.rotate(frame*.18);ctx.strokeStyle="#c47a22";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-10,7);ctx.quadraticCurveTo(0,-10,14,6);ctx.stroke()}else{const len=atkOn?58:24;ctx.strokeStyle="#9b5b22";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(len*.55,Math.sin(frame*.16)*12,len,Math.sin(frame*.16+1)*12);ctx.stroke()}ctx.restore()}
function drawFruitSprite(f,dx,y){const sp=IMG.fruits,sz=32;if(sp){const crops=[{x:8,y:35,w:112,h:96},{x:126,y:38,w:112,h:92},{x:258,y:28,w:76,h:126}],c=crops[f.type]||crops[0];ctx.drawImage(sp,c.x,c.y,c.w,c.h,dx-sz/2,y-sz,sz,sz)}else{ctx.fillStyle=["#ff9a22","#ffe14a","#9c4ddd"][f.type];ctx.fillRect(dx-13,y-28,26,26)}}
function drawFruits(){fruits.forEach(f=>{if(f.collected)return;const dx=sx(f.x),dy=sy(f.y+Math.sin((frame+f.bob)*.07)*5);if(dx<-60||dx>W+60||dy<-60||dy>H+60)return;drawFruitSprite(f,dx,dy)})}
function drawNatives(){natives.forEach(n=>{if(n.interacted)return;const dx=sx(n.x),dy=sy(n.y-n.h+8);if(dx<-80||dx>W+80||dy<-80||dy>H+80)return;ctx.save();if(n.dir<0){ctx.translate(dx+n.w,dy);ctx.scale(-1,1)}else ctx.translate(dx,dy);const sp=IMG.indigenous;if(sp)ctx.drawImage(sp,0,0,sp.width,sp.height,0,0,n.w,n.h);else{ctx.fillStyle="#c28a45";ctx.fillRect(0,0,n.w,n.h)}ctx.restore();if(Math.abs(n.x-P.x)<100){ctx.fillStyle="#ffff62";ctx.font="bold 11px Courier New";ctx.textAlign="center";ctx.fillText("[G]",dx+n.w/2,dy-9)}})}
function drawBoss(){
  if(!boss.alive)return;const dx=sx(boss.x),dy=sy(boss.y-boss.h+8);if(dx<-180||dx>W+180||dy<-180||dy>H+180)return;ctx.save();if(boss.flash>0){ctx.globalAlpha=.55;boss.flash--}
  ctx.globalAlpha=.55;
  ctx.fillStyle=boss.castT>0?"#ff8a22":"#ffcf66";
  ctx.beginPath();ctx.ellipse(dx+boss.w/2,dy+boss.h*.62,56+Math.sin(frame*.12)*8,22+Math.sin(frame*.18)*4,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  if(SPR.boss){
    const idle=[{x:34,y:58,w:192,h:188},{x:260,y:56,w:206,h:190},{x:500,y:56,w:204,h:190},{x:740,y:56,w:204,h:190},{x:982,y:58,w:204,h:188},{x:1226,y:58,w:204,h:188}];
    const rock=[{x:36,y:324,w:228,h:186},{x:296,y:322,w:196,h:188},{x:518,y:328,w:216,h:182},{x:754,y:328,w:148,h:182},{x:1242,y:328,w:166,h:182}];
    const fire=[{x:38,y:594,w:216,h:184},{x:296,y:594,w:192,h:184},{x:526,y:594,w:238,h:184},{x:784,y:594,w:164,h:184},{x:1246,y:594,w:166,h:184}];
    const list=boss.anim===1?rock:(boss.anim===2?fire:idle);
    const c=list[(frame/8|0)%list.length];
    if(boss.face<0){ctx.translate(dx+boss.w,dy);ctx.scale(-1,1);ctx.drawImage(SPR.boss,c.x,c.y,c.w,c.h,0,0,boss.w,boss.h)}
    else ctx.drawImage(SPR.boss,c.x,c.y,c.w,c.h,dx,dy,boss.w,boss.h);
  }else{ctx.fillStyle="#b54b12";ctx.fillRect(dx,dy,boss.w,boss.h)}
  ctx.restore()
}
function drawShots(){bossShots.forEach(s=>{const dx=sx(s.x),dy=sy(s.y);if(s.type==="fire"){ctx.save();ctx.translate(dx,dy);ctx.rotate(Math.atan2(s.vy,s.vx));if(SPR.boss){const crops=[{x:506,y:908,w:102,h:56},{x:640,y:908,w:102,h:56},{x:764,y:910,w:100,h:54},{x:904,y:908,w:76,h:52},{x:1026,y:916,w:62,h:42},{x:1142,y:918,w:46,h:32}],c=crops[(frame/5|0)%crops.length];ctx.drawImage(SPR.boss,c.x,c.y,c.w,c.h,-s.w/2,-s.h/2,s.w,s.h)}else{ctx.fillStyle="#ff5a00";ctx.beginPath();ctx.ellipse(0,0,22,11,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#ffe044";ctx.beginPath();ctx.ellipse(6,0,11,6,0,0,Math.PI*2);ctx.fill()}ctx.restore()}else{ctx.save();ctx.translate(dx,dy);ctx.rotate(s.rot);drawFallingRockSprite(s);ctx.restore()}})}
function drawProjs(){projs.forEach(p=>{const dx=sx(p.x),dy=sy(p.y);ctx.save();ctx.translate(dx,dy);ctx.rotate(p.rot);ctx.strokeStyle="#c47a22";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-12,7);ctx.quadraticCurveTo(0,-10,14,6);ctx.stroke();ctx.restore()})}
function drawPFX(){particles.forEach(p=>{ctx.globalAlpha=p.life/p.max;ctx.fillStyle=p.col;ctx.fillRect(sx(p.x)|0,sy(p.y)|0,p.s,p.s)});ctx.globalAlpha=1}
function drawProgress(){const prog=mode==="climb"?Math.min(1,Math.max(0,(WORLD_H-P.y)/(WORLD_H-CLIMB_TOP))):1;ctx.fillStyle="rgba(0,0,0,.62)";ctx.fillRect(8,H-20,W-16,14);ctx.fillStyle="#b7c4cc";ctx.fillRect(8,H-20,(W-16)*prog,14);ctx.strokeStyle="#e4edf2";ctx.strokeRect(8,H-20,W-16,14);ctx.fillStyle="#fff";ctx.font="bold 9px Courier New";ctx.textAlign="left";ctx.fillText("Base",12,H-7);ctx.textAlign="right";ctx.fillText(mode==="boss"?"Boss":"Topo",W-10,H-7)}

function spawnPFX(x,y,col,n=8){for(let i=0;i<n;i++){const a=Math.PI*2*i/n;particles.push({x,y,vx:Math.cos(a)*(2+Math.random()*2.5),vy:Math.sin(a)*(2+Math.random()*2.5)-1,col,s:4+Math.random()*4,life:30,max:30})}}
function spawnTrail(x,y,col,n=2){for(let i=0;i<n;i++)particles.push({x:x+(Math.random()-.5)*18,y:y+(Math.random()-.5)*14,vx:(Math.random()-.5)*.7,vy:(Math.random()-.5)*.7,col,s:5+Math.random()*5,life:18,max:18})}
function updateCamera(){if(mode==="climb"){camX=Math.max(0,Math.min(P.x-W*.45,WORLD_W-W));camY=Math.max(0,Math.min(P.y-H*.55,WORLD_H-H))}else{camX=Math.max(0,Math.min(P.x-W*.36,WORLD_W-W));camY=0}}
function applyPhysics(){
  P.vy+=GRAV;P.y+=P.vy;P.onGround=false;
  platforms.forEach(p=>{if(p.dead)return;const prev=P.y-P.vy;if(P.vy>=0&&prev<=p.y+9&&P.y>=p.y&&P.x+P.w>p.x+8&&P.x<p.x+p.w-8){P.y=p.y;P.vy=0;P.onGround=true;if(!p.stable)p.touched=true}})
}
function updatePlayer(){
  if(keys.ArrowRight||keys.KeyD){P.vx=PSPD;P.dir=1}else if(keys.ArrowLeft||keys.KeyA){P.vx=-PSPD;P.dir=-1}else P.vx=0;
  P.x=Math.max(0,Math.min(P.x+P.vx,WORLD_W-40));applyPhysics();if((keys.ArrowUp||keys.KeyW||keys.Space)&&P.onGround){P.vy=JUMP;P.onGround=false;sfx.jump()}
  if(P.y>DEATH_Y&&!won){sfx.hit();setTimeout(doGameOver,450);won=true}
  if(atkCD>0)atkCD--;if(keys.KeyF&&atkCD===0){atkCD=32;atkOn=true;atkT=18;atkDir=P.dir;sfx.atk();if(weapon==="boomerang")projs.push({x:P.x+P.w/2,y:P.y-P.h/2,vx:P.dir*8,rot:0,life:78,ret:false})}
  if(atkT>0){atkT--;if(atkT===0)atkOn=false}P.state=atkT>0?"attack":(!P.onGround?"jump":(P.vx!==0?"run":"idle"));if(iframes>0)iframes--;
  if(mode==="climb"&&P.y<470){mode="boss";showMsg("O guardiao protege a prata!",2600);hudUpdate()}
}
function updatePlatforms(){platforms.forEach(p=>{if(p.stable||p.dead||!p.touched)return;p.touchT++;p.breakP=p.touchT/240;if(p.touchT>240){p.dead=true;spawnPFX(p.x+p.w/2,p.y+10,"#9c7b58",18);sfx.rock()}})}
let rockT=0;function updateRocks(){rockT++;if(mode==="climb"&&rockT>55&&Math.random()<.075){rockT=0;rocks.push({x:P.x-160+Math.random()*360,y:camY-110,w:36+Math.random()*24,h:36+Math.random()*24,vy:2.15+Math.random()*1.25,rot:0,rv:(Math.random()-.5)*.08,kind:(Math.random()*6)|0})}rocks=rocks.filter(r=>r.y<camY+H+160);rocks.forEach(r=>{r.y+=r.vy;r.vy+=.035;r.rot+=r.rv;if(iframes===0&&overlap(P.x+8,P.y-P.h+8,P.w-16,P.h-12,r.x-r.w/2,r.y-r.h/2,r.w,r.h))takeDmg()})}
function updateFruits(){fruits.forEach(f=>{if(f.collected)return;if(overlap(P.x,P.y-P.h,P.w,P.h,f.x-17,f.y-34,34,34)){f.collected=true;score+=100;sfx.coin();spawnPFX(f.x,f.y-18,"#ffdc54",7);showMsg("+100 PONTOS",900);checkLifeUp();hudUpdate()}})}
function updateNatives(){natives.forEach(n=>{if(n.interacted)return;n.dir=n.x>P.x?-1:1;if(keys.KeyG&&Math.abs(n.x-P.x)<100&&!n.lock){n.lock=true;n.interacted=true;sfx.indig();if(Math.random()<.5){const pool=["sword","boomerang","whip"].filter(w=>w!==weapon);weapon=pool[Math.floor(Math.random()*pool.length)];showMsg("Indigena deu: "+({sword:"Espada",boomerang:"Boomerang",whip:"Chicote"})[weapon],2400);spawnPFX(n.x,n.y-n.h/2,"#ffff66",12);hudUpdate()}else{takeDmg();showMsg("O indigena atacou! -1 VIDA",2000)}}})}
function damageBoss(amount){if(!boss.alive||mode!=="boss")return;boss.hp=Math.max(0,boss.hp-amount);boss.flash=8;sfx.bossHurt();spawnPFX(boss.x+boss.w/2,boss.y-boss.h/2,"#ffb347",18);spawnPFX(boss.x+boss.w/2,boss.y-boss.h+20,"#ff4a16",8);hudUpdate();if(boss.hp<=0){boss.alive=false;score+=1000;sfx.win();spawnPFX(boss.x+boss.w/2,boss.y-boss.h/2,"#ffee66",36);spawnPFX(boss.x+boss.w/2,boss.y-boss.h/2,"#ff5a16",24);setTimeout(doWin,900)}}
function updateBoss(){
  if(mode!=="boss"||!boss.alive)return;
  boss.face=(P.x+P.w/2)<(boss.x+boss.w/2)?-1:1;
  boss.x+=boss.dir*boss.speed;
  if(boss.x<1040){boss.x=1040;boss.dir=1}
  if(boss.x>1480){boss.x=1480;boss.dir=-1}
  if(frame%9===0)spawnTrail(boss.x+boss.w/2,boss.y-boss.h*.55,"#ff8a22",1);
  boss.cd--;if(boss.castT>0)boss.castT--;boss.anim=boss.castT>0?boss.anim:0;
  if(atkOn&&(weapon==="sword"||weapon==="whip")){
    const reach=weapon==="whip"?120:92;
    const ax=atkDir>0?P.x+P.w-4:P.x-reach+4;
    const hurt={x:boss.x-34,y:boss.y-boss.h-18,w:boss.w+68,h:boss.h+28};
    if(overlap(ax,P.y-P.h-8,reach,P.h+24,hurt.x,hurt.y,hurt.w,hurt.h)){
      if(!boss.hitLock){boss.hitLock=14;damageBoss(100);showMsg("-100 GUARDIAO",650)}
    }
  }
  if(boss.hitLock>0)boss.hitLock--;
  if(boss.cd<=0){
    boss.cd=48+Math.random()*45|0;boss.castT=28;
    sfx.bossCast();
    if(Math.random()<.5){boss.anim=1;bossShots.push({type:"rock",x:P.x-90+Math.random()*190,y:camY-95,w:46,h:46,vy:3.35,rot:0,rv:.065,kind:1});spawnPFX(P.x+P.w/2,camY+18,"#d0b08a",8);sfx.bossRock()}
    else{boss.anim=2;const sx=boss.x+boss.w*.18,sy=boss.y-92,tx=P.x+P.w/2,ty=P.y-P.h/2,ang=Math.atan2(ty-sy,tx-sx),spd=5.15;bossShots.push({type:"fire",x:sx,y:sy,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,w:62,h:34});spawnPFX(sx,sy,"#ff6a00",14);sfx.bossFire()}
  }
}
function updateShots(){bossShots=bossShots.filter(s=>s.x>-120&&s.x<WORLD_W+120&&s.y<camY+H+180);bossShots.forEach(s=>{if(s.type==="fire"){s.x+=s.vx;s.y+=s.vy+Math.sin(frame*.1)*.25;spawnTrail(s.x-s.vx*.8,s.y-s.vy*.8,"#ff6a00",2)}else{s.y+=s.vy;s.vy+=.04;s.rot+=s.rv;if(frame%4===0)spawnTrail(s.x,s.y,"#b09070",1)}if(iframes===0&&overlap(P.x+8,P.y-P.h+8,P.w-16,P.h-12,s.x-(s.w||42)/2,s.y-(s.h||22)/2,s.w||42,s.h||22)){spawnPFX(s.x,s.y,s.type==="fire"?"#ff5a16":"#b09070",16);sfx.boom();takeDmg();s.y=camY+H+999}})}
function updateProjs(){projs=projs.filter(p=>p.life>0);projs.forEach(p=>{p.x+=p.vx;p.life--;p.rot+=.32;if(p.life<40&&!p.ret){p.ret=true;p.vx*=-1.2}if(mode==="boss"&&boss.alive&&overlap(p.x-16,p.y-12,32,24,boss.x-34,boss.y-boss.h-18,boss.w+68,boss.h+28)){damageBoss(100);showMsg("-100 GUARDIAO",650);p.life=0}})}
function updatePFX(){particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.13;p.life--;p.s*=.96})}
function takeDmg(){if(iframes>0||won)return;hp--;iframes=105;sfx.hit();spawnPFX(P.x+P.w/2,P.y-P.h/2,"#ff5555",9);hudUpdate();if(hp<=0){hp=0;won=true;setTimeout(doGameOver,650)}}
function loop(){if(!running)return;frame++;ctx.clearRect(0,0,W,H);updateCamera();drawBG();platforms.forEach(drawPlatform);drawFruits();drawNatives();drawRocks();drawShots();drawBoss();drawProjs();drawPlayer();drawPFX();drawProgress();updatePlayer();updatePlatforms();updateRocks();updateFruits();updateNatives();updateBoss();updateShots();updateProjs();updatePFX();requestAnimationFrame(loop)}

function showIntro(){document.getElementById("s-menu").style.display="none";document.getElementById("s-intro").style.display="block";document.getElementById("intro-body").textContent=`No alto da cordilheira, o caminho de Peabiru chega ao seu teste final.\n\nAs plataformas da montanha cedem sob os pes de Pedro.\nPedras despencam do ceu.\n\nNo topo, o guardiao da prata aguarda.\nDerrote-o para encerrar a jornada e transformar a lenda em historia.`;aInit();tone(100,"triangle",1.6,.05);tone(150,"triangle",1.8,.04,.4)}
function showTutorial(){document.getElementById("s-intro").style.display="none";document.getElementById("s-tutorial").style.display="block"}
function startGame(){document.getElementById("overlay").classList.add("hidden");Object.assign(P,{x:105,y:2160,vx:0,vy:0,onGround:false,dir:1,state:"idle"});frame=0;camX=0;camY=1800;buildLevel();hudUpdate();running=true;bgmStart();loop();showMsg("Suba antes que as plataformas desabem!",3000)}
function hideScreens(){["s-menu","s-intro","s-tutorial","s-over","s-win"].forEach(id=>document.getElementById(id).style.display="none")}
function doGameOver(){running=false;bgmStop();hideScreens();document.getElementById("overlay").classList.remove("hidden");document.getElementById("s-over").style.display="block";document.getElementById("go-score").textContent="Pontuacao: "+score}
function doWin(){running=false;bgmStop();won=true;hideScreens();document.getElementById("overlay").classList.remove("hidden");document.getElementById("s-win").style.display="block";document.getElementById("win-score").textContent="Pontuacao Final: "+score}
function restartGame(){hideScreens();document.getElementById("s-menu").style.display="block";document.getElementById("overlay").classList.remove("hidden");running=false;bgmStop();keys={};won=false}
window.addEventListener("keydown",e=>{keys[e.code]=true;if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();aInit()});
window.addEventListener("keyup",e=>keys[e.code]=false);
async function boot(){canvas=document.getElementById("c");ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;await Promise.all(Object.entries(assetList).map(([k,v])=>loadImg(k,v)));SPR.platforms=IMG.platforms;SPR.boss=IMG.boss;buildLevel();updateCamera();drawBG();ctx.fillStyle="rgba(0,0,0,.45)";ctx.fillRect(0,0,W,H);ctx.fillStyle="#e6e9ec";ctx.font="bold 34px Courier New";ctx.textAlign="center";ctx.fillText("PEABIRU",W/2,H/2-12);ctx.fillStyle="#d8c070";ctx.font="12px Courier New";ctx.fillText("FASE 3 - A MONTANHA DE PRATA",W/2,H/2+16)}
window.addEventListener("load",boot);
