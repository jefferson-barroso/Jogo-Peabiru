// Fase 1: floresta de Peabiru, HUD, combate, coleta e transicao para a fase 2.
// O codigo mantem variaveis globais porque os botoes HTML chamam funcoes diretamente via onclick.
let AC;
function aInit(){ if(!AC) AC=new(window.AudioContext||window.webkitAudioContext)(); if(AC.state==='suspended') AC.resume(); }
function tone(f,t='square',d=.1,v=.15,dl=0){
  try{
    aInit();
    const o=AC.createOscillator(),g=AC.createGain();
    o.connect(g);g.connect(AC.destination);
    o.type=t;o.frequency.setValueAtTime(f,AC.currentTime+dl);
    g.gain.setValueAtTime(v,AC.currentTime+dl);
    g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+dl+d);
    o.start(AC.currentTime+dl);o.stop(AC.currentTime+dl+d);
  }catch(e){}
}
const sfx={
  jump:  ()=>{ tone(340,'square',.10,.18); tone(520,'square',.07,.12,.07); },
  atk:   ()=>{ tone(220,'sawtooth',.07,.28); tone(160,'sawtooth',.05,.18,.05); },
  hit:   ()=>{ tone(90,'sawtooth',.18,.45); tone(60,'sawtooth',.12,.3,.09); },
  coin:  ()=>{ tone(700,'square',.07,.18); tone(920,'square',.07,.18,.07); },
  die:   ()=>{ [380,280,190,110].forEach((f,i)=>tone(f,'sawtooth',.14,.38,i*.1)); },
  kill:  ()=>{ [550,700,880].forEach((f,i)=>tone(f,'square',.09,.22,i*.08)); },
  log:   ()=>{ tone(100,'sawtooth',.22,.45); tone(70,'sawtooth',.18,.32,.1); },
  indig: ()=>{ [400,450,400,520].forEach((f,i)=>tone(f,'triangle',.13,.18,i*.13)); },
  win:   ()=>{ [550,700,880,1100].forEach((f,i)=>tone(f,'square',.16,.3,i*.13)); },
};
const BGM=[262,294,330,349,392,349,330,294,262,247,262,330];
let bgmI=0,bgmT=null;
function bgmStart(){ bgmStop(); bgmT=setInterval(()=>{ tone(BGM[bgmI%BGM.length],'triangle',.32,.06); bgmI++; },360); }
function bgmStop(){ if(bgmT){clearInterval(bgmT);bgmT=null;} }


const IMG={};
function loadImg(key,src){ return new Promise(r=>{const i=new Image();i.onload=()=>{IMG[key]=i;r();};i.onerror=r;i.src=src;}); }


const W=800,H=450,GROUND=365,GRAV=0.52,PSPD=3.5,JUMP=-13;
const LEVEL_LEN=5400;
const FLAG_X=LEVEL_LEN-130;


let canvas,ctx,keys={},frame=0,running=false;
let camX=0,score=0,hp=5,maxHp=5,weapon='sword';
let atkCD=0,atkOn=false,atkT=0,atkDir=1,iframes=0;
let nextLife=1000;
let flagReached=false;


const P={x:110,y:GROUND,w:52,h:68,vx:0,vy:0,onGround:false,dir:1,state:'idle'};

const SWORD={angle:0,swinging:false,swingT:0};


let enemies=[],fruits=[],natives=[],fallingLogs=[],groundLogs=[],projs=[],particles=[],platforms=[];


function buildLevel(){
  enemies=[];fruits=[];natives=[];fallingLogs=[];groundLogs=[];
  projs=[];particles=[];platforms=[];flagReached=false;
  score=0;hp=maxHp;weapon='sword';iframes=0;atkCD=0;atkOn=false;nextLife=1000;

  platforms=[
    {x:340,y:285,w:110,h:18},{x:590,y:258,w:100,h:18},
    {x:850,y:218,w:120,h:18},{x:1110,y:270,w:105,h:18},
    {x:1380,y:242,w:118,h:18},{x:1670,y:210,w:125,h:18},
    {x:1970,y:260,w:115,h:18},{x:2260,y:228,w:118,h:18},
    {x:2550,y:250,w:105,h:18},{x:2840,y:218,w:135,h:18},
    {x:3130,y:238,w:128,h:18},{x:3450,y:208,w:128,h:18},
    {x:3770,y:250,w:115,h:18},{x:4090,y:228,w:128,h:18},
    {x:4410,y:240,w:115,h:18},{x:4740,y:215,w:138,h:18},
  ];

  const eDefs=[
    {t:'snake',x:470},{t:'snake',x:750},{t:'jaguar',x:1040},
    {t:'snake',x:1280},{t:'jaguar',x:1570},{t:'snake',x:1870},
    {t:'jaguar',x:2170},{t:'snake',x:2470},{t:'jaguar',x:2770},
    {t:'snake',x:3070},{t:'jaguar',x:3370},{t:'snake',x:3670},
    {t:'jaguar',x:3940},{t:'snake',x:4200},{t:'jaguar',x:4500},
    {t:'snake',x:4760},{t:'jaguar',x:5010},
  ];
  eDefs.forEach((d,i)=>{
    const isJ=d.t==='jaguar';
    enemies.push({
      type:d.t,x:d.x,y:GROUND,
      w:isJ?58:44,h:isJ?50:38,
      dir:i%2?-1:1,speed:isJ?2.0:1.2,
      alive:true,animT:i*7,animF:0,
    });
  });

  [310,530,760,990,1220,1470,1730,2000,2250,2510,
   2760,3020,3270,3480,3730,3990,4240,4500,4760,5010].forEach((x,i)=>{
    const plat=platforms[i%platforms.length];
    const onPlat=i%3!==0;
    fruits.push({
      type:['orange','banana','grapes'][i%3],
      x, y: onPlat?plat.y-2:GROUND,
      collected:false,bobT:i*23,
    });
  });

  [750,1550,2460,3360,4260].forEach((x,i)=>{
    natives.push({x,y:GROUND,w:42,h:64,dir:-1,interacted:false,animT:i*13});
  });
}


function hudUpdate(){
  const pct=Math.max(0,hp/maxHp*100);
  document.getElementById('hp-bar-fill').style.width=pct+'%';
  const hearts=document.getElementById('hp-hearts');
  hearts.innerHTML='';
for(let i=0;i<maxHp;i++){
  const s=document.createElement('span');
  s.className='heart';

  s.textContent = i < hp ? '🤍' : '🖤';

  hearts.appendChild(s);
}
  document.getElementById('score-el').textContent='PONTOS: '+score;
  const wn={sword:' ESPADA',boomerang:' BOOMERANG',whip:' CHICOTE'};
  document.getElementById('weapon-el').textContent=wn[weapon]||weapon;
}

let msgTO=null;
function showMsg(t,d=2000){
  const el=document.getElementById('msg');el.textContent=t;el.style.display='block';
  if(msgTO) clearTimeout(msgTO);
  msgTO=setTimeout(()=>el.style.display='none',d);
}


function drawBG(){
  const bg=IMG['bg_forest'];
  if(bg){
    
    
    const px=(camX*0.18)%800;
    ctx.drawImage(bg,0,0,bg.width,bg.height,-px,0,800,H);
    
    if(-px+800<W) ctx.drawImage(bg,0,0,bg.width,bg.height,-px+800,0,800,H);
    
    ctx.fillStyle='rgba(0,5,0,0.22)';
    ctx.fillRect(0,0,W,H);
  } else {
    
    const sky=ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#0a1f08');sky.addColorStop(0.5,'#143318');sky.addColorStop(1,'#0a1a08');
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  }
}


function drawGround(){
  
  
  
  ctx.fillStyle='rgba(0,0,0,0)'; 
  
  ctx.fillStyle='#1a6010';
  for(let i=0;i<50;i++){
    const gx=((i*160+30-camX*.98)%(W+200)+W+200)%(W+200)-100;
    const gh=6+i%4*3;
    ctx.fillRect(gx|0,GROUND-gh,2,gh);
    ctx.fillRect(gx+5|0,GROUND-gh-2,2,gh+2);
    ctx.fillRect(gx+10|0,GROUND-gh,2,gh);
  }
}


function drawPlatforms(){
  platforms.forEach(p=>{
    const dx=p.x-camX;if(dx<-230||dx>W+30) return;
    
    ctx.fillStyle='#3d1e08';ctx.fillRect(dx|0,p.y,p.w,p.h);
    ctx.fillStyle='#2e7a18';ctx.fillRect(dx|0,p.y,p.w,5);
    ctx.fillStyle='#2a1006';
    for(let i=0;i<p.w;i+=16) ctx.fillRect(dx+i|0,p.y+5,2,p.h-5);
    ctx.fillStyle='#4a2a10';
    for(let i=6;i<p.w-8;i+=22) ctx.fillRect(dx+i|0,p.y+9,14,3);
  });
}


function drawFlag(){
  const dx=FLAG_X-camX;if(dx<-50||dx>W+50) return;
  ctx.fillStyle='#999';ctx.fillRect(dx|0,GROUND-90,5,90);
  const t=frame*.13;
  ctx.fillStyle='#ffdd00';
  ctx.beginPath();
  ctx.moveTo(dx+5,GROUND-90);
  ctx.quadraticCurveTo(dx+24,GROUND-83+Math.sin(t)*5,dx+40,GROUND-90+Math.sin(t+1)*3);
  ctx.lineTo(dx+40,GROUND-68+Math.sin(t+1)*3);
  ctx.quadraticCurveTo(dx+24,GROUND-61+Math.sin(t)*5,dx+5,GROUND-68);
  ctx.fill();
  ctx.fillStyle='#cc0000';ctx.fillRect(dx+9,GROUND-86,7,12);
  ctx.fillStyle='#fff';ctx.font='bold 9px Courier New';ctx.textAlign='center';
  ctx.fillText('RIO PEABIRU',dx+2,GROUND-97);
}


function drawPlayer(){
  if(iframes>0&&Math.floor(iframes/5)%2===0) return;
  const dx=P.x-camX, dy=P.y-P.h;
  const flip=P.dir<0;

  ctx.save();
  if(flip){ctx.translate(dx+P.w,dy);ctx.scale(-1,1);}
  else{ctx.translate(dx,dy);}

  const key=(P.state==='run'||P.state==='attack')?'player_run':'player_idle';
  const sp=IMG[key];
  if(sp) ctx.drawImage(sp,0,0,sp.width,sp.height,0,0,P.w,P.h);
  else{
    
    ctx.fillStyle='#f0c060';ctx.fillRect(12,0,28,22);
    ctx.fillStyle='#2d6a10';ctx.fillRect(6,22,40,28);
    ctx.fillStyle='#1a3a80';ctx.fillRect(6,50,18,18);ctx.fillRect(28,50,18,18);
  }
  drawWeaponInHand(dx, dy, flip);
  ctx.restore();
}

function drawWeaponInHand(dx,dy,flip){
  ctx.save();
  
   const hx = P.w - 10;
const hy = P.h * 0.44;
  const dir = 1; 

  if(weapon==='sword'){
    
    const swinging=atkOn&&atkT>0;
    const swingProgress=swinging?(18-atkT)/18:0;

    
    let angle= dir*(-0.25); 
    if(swinging) angle= dir*(-1.1 + swingProgress*2.2); 

    ctx.translate(hx,hy);
    ctx.rotate(angle);

    
    ctx.fillStyle='#cc9900';
    ctx.fillRect(-4,-5,8,10);
    
    ctx.fillStyle='#ddeeff';
    const bladeLen=swinging? 42:34;
    ctx.fillRect(0,-3,bladeLen,6);
    
    ctx.fillStyle='#ffffff';
    ctx.fillRect(4,3,bladeLen-8,2);
    
    ctx.fillStyle='#aa7700';
    ctx.fillRect(-8,-4,8,8);

    
    if(swinging&&atkT>6){
      ctx.restore();ctx.save();
      ctx.globalAlpha=0.45*(1-swingProgress);
      ctx.strokeStyle='#aaccff';ctx.lineWidth=3;
      ctx.beginPath();
      ctx.arc(hx,hy,48,dir*(-1.1),dir*(-1.1+swingProgress*2.2));
      ctx.stroke();
      ctx.globalAlpha=1;
      
      const tipX=hx+Math.cos(angle)*45;
      const tipY=hy+Math.sin(angle)*45;
      ctx.fillStyle='#ffffff';
      ctx.fillRect(tipX-3,tipY-3,6,6);
      ctx.fillRect(tipX-1,tipY-7,2,14);
      ctx.fillRect(tipX-7,tipY-1,14,2);
    }
  } else if(weapon==='boomerang'){
    ctx.translate(hx,hy);
    ctx.rotate(frame*.18*dir);
    const bi=IMG['boomerang'];
    if(bi) ctx.drawImage(bi,0,0,bi.width,bi.height,-13,-9,26,18);
    else{ctx.fillStyle='#cc8800';ctx.fillRect(-10,-6,20,12);}
  } else { 
    ctx.translate(hx,hy);
    const wlen=atkOn?55:20;
    ctx.strokeStyle='#884400';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(0,0);
    ctx.quadraticCurveTo(dir*wlen*.5,Math.sin(frame*.15)*10,dir*wlen,Math.sin(frame*.15+1)*14);
    ctx.stroke();
    ctx.fillStyle='#cc6600';
    const tx=dir*wlen,ty=Math.sin(frame*.15+1)*14;
    ctx.fillRect(tx-4,ty-4,8,8);
  }
  ctx.restore();
}


function drawEnemies(){
  enemies.forEach(e=>{
    if(!e.alive) return;
    const dx=e.x-camX;if(dx<-130||dx>W+130) return;
    ctx.save();
   const flip = e.type === 'jaguar' ? e.dir < 0 : e.dir < 0;
    if(flip){ctx.translate(dx+e.w,e.y-e.h);ctx.scale(-1,1);}
    else{ctx.translate(dx,e.y-e.h);}

    if(e.type==='snake'){
      const key=e.animF%2===0?'snake_coil':'snake_attack';
      const sp=IMG[key];
      if(sp) ctx.drawImage(sp,0,0,sp.width,sp.height,0,0,e.w,e.h);
      else{ctx.fillStyle='#2d8b00';ctx.fillRect(0,0,e.w,e.h);}
    } else {
      
      const fi=e.animF%6;
      const key=`jag_${fi}`;
      const sp=IMG[key]||IMG['jaguar'];
      if(sp) ctx.drawImage(sp,0,0,sp.width,sp.height,0,0,e.w,e.h);
      else{ctx.fillStyle='#cc8800';ctx.fillRect(0,0,e.w,e.h);}
    }
    ctx.restore();
  });
}


function drawFruits(){
  fruits.forEach(f=>{
    if(f.collected) return;
    const dx=f.x-camX;if(dx<-70||dx>W+70) return;
    const bob=Math.sin(f.bobT*.06)*5;
    const sp=IMG[f.type];
    const sz=34;
    if(sp) ctx.drawImage(sp,0,0,sp.width,sp.height,(dx-sz/2)|0,(f.y-sz+bob)|0,sz,sz);
    else{
      const fc={orange:'#ff8800',banana:'#ffee00',grapes:'#9900cc'}[f.type]||'#ff0';
      ctx.fillStyle=fc;ctx.fillRect((dx-14)|0,(f.y-28+bob)|0,28,28);
    }
    f.bobT++;
  });
}


function drawNatives(){
  natives.forEach(n=>{
    if(n.interacted) return;
    const dx=n.x-camX;if(dx<-90||dx>W+90) return;
    const sp=IMG['indigenous'];
    ctx.save();
    const flip=n.dir<0;
    if(flip){ctx.translate(dx+n.w,n.y-n.h);ctx.scale(-1,1);}
    else{ctx.translate(dx,n.y-n.h);}
    if(sp) ctx.drawImage(sp,0,0,sp.width,sp.height,0,0,n.w,n.h);
    else{ctx.fillStyle='#cc9944';ctx.fillRect(0,0,n.w,n.h);}
    ctx.restore();
    if(Math.abs(n.x-P.x)<100){
      ctx.fillStyle='#ffff44';ctx.font='bold 11px Courier New';ctx.textAlign='center';
      ctx.fillText('[G]',dx+n.w/2,n.y-n.h-10);
    }
  });
}


function drawLogs(){
  
  fallingLogs.forEach(l=>{
    if(l.landed) return;
    const dx=l.x-camX;
    const sp=IMG['log1'];
    ctx.save();
    ctx.translate((dx+l.w/2)|0,(l.y+l.h/2)|0);ctx.rotate(l.rot);
    if(sp) ctx.drawImage(sp,0,0,sp.width,sp.height,-l.w/2,-l.h/2,l.w,l.h);
    else{ctx.fillStyle='#8b4513';ctx.fillRect(-l.w/2,-l.h/2,l.w,l.h);}
    ctx.restore();
    
    const shadowX=(dx+l.w/2)|0;
    ctx.globalAlpha=0.35;
    ctx.fillStyle='#000';
    ctx.beginPath();ctx.ellipse(shadowX,GROUND,l.w/2,8,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  });
  
  groundLogs.forEach(l=>{
    const dx=l.x-camX;
    const sp=IMG['log2']||IMG['log1'];
    ctx.save();
    ctx.translate((dx+l.w/2)|0,(GROUND+l.h/2-8)|0);
    if(sp) ctx.drawImage(sp,0,0,sp.width,sp.height,-l.w/2,-l.h/2,l.w,l.h);
    else{ctx.fillStyle='#7a3d10';ctx.fillRect(-l.w/2,-l.h/2,l.w,l.h);}
    ctx.restore();
  });
}


function drawProjs(){
  projs.forEach(p=>{
    const dx=p.x-camX;
    ctx.save();ctx.translate(dx|0,p.y|0);ctx.rotate(p.rot||0);
    const sp=IMG['boomerang'];
    if(sp) ctx.drawImage(sp,0,0,sp.width,sp.height,-14,-10,28,20);
    else{ctx.fillStyle='#cc8800';ctx.fillRect(-12,-8,24,16);}
    ctx.restore();
  });
}


function drawParticles(){
  particles.forEach(p=>{
    ctx.globalAlpha=p.life/p.maxLife;
    ctx.fillStyle=p.color;
    ctx.fillRect(((p.x-camX)-p.s/2)|0,(p.y-p.s/2)|0,p.s|0,p.s|0);
  });
  ctx.globalAlpha=1;
}
function spawnPFX(wx,wy,col,n=8){
  for(let i=0;i<n;i++){
    const a=(Math.PI*2/n)*i;
    particles.push({x:wx,y:wy,vx:Math.cos(a)*(2+Math.random()*3),vy:Math.sin(a)*(2+Math.random()*3)-1,
      color:col,s:5+Math.random()*5,life:32,maxLife:32});
  }
}


function drawCanvasHUD(){
  const prog=Math.min(1,Math.max(0,(P.x-100)/(LEVEL_LEN-200)));
  
  ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(8,H-20,W-16,14);
  
  const grad=ctx.createLinearGradient(8,0,W-8,0);
  grad.addColorStop(0,'#226622');grad.addColorStop(0.7,'#33aa33');grad.addColorStop(1,'#88ff44');
  ctx.fillStyle=grad;ctx.fillRect(8,H-20,(W-16)*prog,14);
  
  ctx.fillStyle='rgba(0,0,0,.2)';
  for(let i=0;i<W-16;i+=12) ctx.fillRect(8+i,H-20,1,14);
  
  ctx.strokeStyle='#44aa44';ctx.lineWidth=1;ctx.strokeRect(8,H-20,W-16,14);
  
  const mx=8+(W-16)*prog;
  ctx.fillStyle='#ffdd00';ctx.fillRect(mx-4,H-23,8,18);
  ctx.fillStyle='#fff';ctx.font='bold 9px Courier New';
  ctx.textAlign='left';ctx.fillText('Início',12,H-7);
  ctx.textAlign='right';ctx.fillText('Rio Peabiru',W-10,H-7);
}


function overlap(ax,ay,aw,ah,bx,by,bw,bh){return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;}

function applyPhysics(obj){
  obj.vy+=GRAV; obj.y+=obj.vy;
  obj.onGround=false;
  if(obj.y>=GROUND){obj.y=GROUND;obj.vy=0;obj.onGround=true;}
  platforms.forEach(p=>{
    const prev=obj.y-obj.vy;
    if(obj.vy>=0&&prev<=p.y&&obj.y>=p.y&&obj.x+obj.w>p.x+4&&obj.x<p.x+p.w-4){
      obj.y=p.y;obj.vy=0;obj.onGround=true;
    }
  });
}


function updatePlayer(){
  if(keys['ArrowRight']||keys['KeyD']){P.vx=PSPD;P.dir=1;}
  else if(keys['ArrowLeft']||keys['KeyA']){P.vx=-PSPD;P.dir=-1;}
  else P.vx=0;
  P.x=Math.max(0,Math.min(P.x+P.vx,LEVEL_LEN));
  applyPhysics(P);
  if((keys['ArrowUp']||keys['KeyW']||keys['Space'])&&P.onGround){P.vy=JUMP;P.onGround=false;sfx.jump();}

  if(atkCD>0) atkCD--;
  if(keys['KeyF']&&atkCD===0){
    atkCD=32;atkOn=true;atkT=18;atkDir=P.dir;P.state='attack';sfx.atk();
    if(weapon==='boomerang'){
      projs.push({x:P.x+P.w/2,y:P.y-P.h/2,vx:P.dir*8,vy:0,rot:0,life:75,ret:false});
    }
  }
  if(atkT>0){atkT--;if(atkT===0){atkOn=false;}}

  P.state=atkT>0?'attack':(!P.onGround?'jump':(P.vx!==0?'run':'idle'));
  camX=Math.max(0,Math.min(P.x-W/3.5,LEVEL_LEN-W));
  if(iframes>0) iframes--;
}


function updateEnemies(){
  enemies.forEach(e=>{
    if(!e.alive) return;
    
    const rate=e.type==='jaguar'?10:38;
    if(frame%rate===0) e.animF=(e.animF+1)%(e.type==='jaguar'?6:2);

    e.x+=e.dir*e.speed;
    if(e.x<10){e.x=10;e.dir=1;}
    if(e.x>LEVEL_LEN-60){e.dir=-1;}
    platforms.forEach(p=>{
      if(e.y<=p.y+4&&e.y>=p.y-4&&e.x+e.w>p.x&&e.x<p.x+p.w){
        if(e.x<=p.x+4) e.dir=1;
        else if(e.x+e.w>=p.x+p.w-4) e.dir=-1;
      }
    });

    
    if(atkOn&&(weapon==='sword'||weapon==='whip')){
      const reach=weapon==='whip'?60:46;
      const ax=atkDir>0?P.x+P.w:P.x-reach;
      if(overlap(ax,P.y-P.h,reach,P.h,e.x,e.y-e.h,e.w,e.h)) killEnemy(e);
    }

    
    if(iframes===0&&overlap(P.x+6,P.y-P.h+6,P.w-12,P.h-12,e.x,e.y-e.h,e.w,e.h)){
      const stomp=P.vy>0&&P.y<=e.y-e.h+16&&P.y>e.y-e.h-10;
      if(stomp){P.vy=JUMP*.55;killEnemy(e);}
      else takeDmg();
    }
  });
}
function killEnemy(e){
  e.alive=false;score+=50;
  spawnPFX(e.x+e.w/2,e.y-e.h/2,'#88ff88',10);
  sfx.kill();showMsg('⚔ +50 PONTOS!',900);
  checkLifeUp();hudUpdate();
}


function updateFruits(){
  fruits.forEach(f=>{
    if(f.collected) return;
    if(overlap(P.x,P.y-P.h,P.w,P.h,f.x-17,f.y-32,34,32)){
      f.collected=true;score+=100;
      sfx.coin();spawnPFX(f.x,f.y-16,'#ffcc00',6);
      showMsg('🍊 +100 PONTOS!',900);
      checkLifeUp();hudUpdate();
    }
  });
}

function checkLifeUp(){
  while(score>=nextLife&&hp<maxHp){hp=Math.min(hp+1,maxHp);showMsg('❤ +1 VIDA!',2000);nextLife+=1000;hudUpdate();}
  if(score>=nextLife) nextLife=Math.ceil(score/1000)*1000+1000;
}


function updateNatives(){
  natives.forEach(n=>{
    if(n.interacted) return;
    n.dir=n.x>P.x?-1:1;
    if(keys['KeyG']&&Math.abs(n.x-P.x)<100&&!n._lock){
      n._lock=true;n.interacted=true;sfx.indig();
      if(Math.random()<0.5){
        const pool=['sword','boomerang','whip'].filter(w=>w!==weapon);
        weapon=pool[Math.floor(Math.random()*pool.length)];
        const nm={sword:'Espada',boomerang:'Boomerang',whip:'Chicote'}[weapon];
        showMsg(`🎁 Indígena deu: ${nm}!`,2500);
        spawnPFX(n.x,n.y-n.h/2,'#ffff00',12);hudUpdate();
      } else{takeDmg();showMsg('💀 O indígena atacou! -1 VIDA',2000);}
    }
  });
}


let logSpawnT=0;
function updateLogs(){
  logSpawnT++;
  if(logSpawnT>220&&P.x>300&&Math.random()<0.012){
    logSpawnT=0;
    const lx=P.x+220+Math.random()*380;
    fallingLogs.push({x:lx,y:-40,w:66,h:22,vy:2.6,rot:0,rotV:(Math.random()-.5)*.07,landed:false});
    sfx.log();
  }

  fallingLogs.forEach(l=>{
    if(l.landed) return;
    l.vy+=.28;l.y+=l.vy;l.rot+=l.rotV;
    if(l.y>=GROUND){
      l.y=GROUND;l.landed=true;
      spawnPFX(l.x+l.w/2,GROUND,'#8b4513',5);
      
      groundLogs.push({x:l.x,w:l.w,h:l.h});
      if(groundLogs.length>10) groundLogs.shift();
    }
    
    
    const hitW=l.w*0.55, hitH=l.h*0.7;
    const hitX=l.x+l.w/2-hitW/2, hitY=l.y-hitH;
    if(iframes===0&&overlap(P.x+6,P.y-P.h+6,P.w-12,P.h-12,hitX,hitY,hitW,hitH)){
      takeDmg();
    }
  });

  
  fallingLogs=fallingLogs.filter(l=>!l.landed);
}


function updateProjs(){
  projs=projs.filter(p=>p.life>0);
  projs.forEach(p=>{
    p.x+=p.vx;p.y+=p.vy;p.life--;p.rot+=.32;
    if(p.life<38&&!p.ret){p.ret=true;p.vx*=-1.2;}
    enemies.forEach(e=>{
      if(!e.alive) return;
      if(overlap(p.x-13,p.y-10,26,20,e.x,e.y-e.h,e.w,e.h)){killEnemy(e);p.life=0;}
    });
  });
}


function updatePFX(){
  particles=particles.filter(p=>p.life>0);
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.14;p.life--;p.s*=.96;});
}


function takeDmg(){
  if(iframes>0) return;
  hp--;iframes=110;sfx.hit();hudUpdate();
  spawnPFX(P.x+P.w/2,P.y-P.h/2,'#ff4444',8);
  if(hp<=0){hp=0;sfx.die();setTimeout(doGameOver,700);}
}


function checkWin(){
  if(flagReached) return;
  if(P.x+P.w>FLAG_X-10){flagReached=true;sfx.win();bgmStop();setTimeout(doWin,700);}
}


function loop(){
  if(!running) return;
  frame++;
  ctx.clearRect(0,0,W,H);

  drawBG();
  drawGround();
  drawPlatforms();
  drawFlag();
  drawFruits();
  drawNatives();
  drawLogs();
  drawEnemies();
  drawProjs();
  drawPlayer();
  drawParticles();
  drawCanvasHUD();

  updatePlayer();
  updateEnemies();
  updateFruits();
  updateNatives();
  updateLogs();
  updateProjs();
  updatePFX();
  checkWin();

  requestAnimationFrame(loop);
}


function showTrailer(){
  document.getElementById('s-menu').style.display='none';
  document.getElementById('s-trailer').style.display='block';
  document.getElementById('trailer-body').textContent=
`Século XVI. O Brasil recém descoberto esconde segredos
que a Europa ainda mal imagina...

Uma lenda corria entre os exploradores:
O Caminho de Peabiru — rota sagrada dos indígenas,
que levava até as terras dos Incas...
e à lendária Montanha de Prata.

Pedro, único sobrevivente de sua expedição,
vaga sozinho pela floresta com um único objetivo:
chegar a Potosí e testemunhar a lenda com seus próprios olhos.

A floresta é perigosa. Cobras e onças espreitam.
Tribos indígenas podem ajudar... ou atacar.

Sobreviva. Avance. A prata aguarda.`;
  aInit();
  tone(110,'triangle',2,.05);tone(165,'triangle',2,.04,.6);
}

function showTutorial(){
  document.getElementById('s-trailer').style.display='none';
  document.getElementById('s-tutorial').style.display='block';
}

function startGame(){
  document.getElementById('overlay').classList.add('hidden');
  Object.assign(P,{x:110,y:GROUND,vx:0,vy:0,onGround:false,dir:1,state:'idle'});
  frame=0;camX=0;logSpawnT=0;
  buildLevel();hudUpdate();
  running=true;bgmStart();loop();
  showMsg('⚔ Que comece a jornada! Chegue à bandeira!',3000);
}

function hideOverlayScreens(){
  ['s-over','s-win','s-menu','s-trailer','s-tutorial'].forEach(id=>document.getElementById(id).style.display='none');
}

function doGameOver(){
  running=false;bgmStop();
  hideOverlayScreens();
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('s-over').style.display='block';
  document.getElementById('go-score').textContent='Pontuação: '+score;
}

function doWin(){
  running=false;bgmStop();
  hideOverlayScreens();
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('s-win').style.display='block';
}

function restartGame(){
  ['s-over','s-win','s-menu','s-trailer','s-tutorial'].forEach(id=>document.getElementById(id).style.display='none');
  document.getElementById('s-menu').style.display='block';
  document.getElementById('overlay').classList.remove('hidden');
  running=false;bgmStop();keys={};
}


window.addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  aInit();
});
window.addEventListener('keyup',e=>keys[e.code]=false);


async function boot(){
  canvas=document.getElementById('c');
  ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  if(typeof ASSETS!=='undefined'){
    await Promise.all(Object.entries(ASSETS).map(([k,v])=>loadImg(k,v)));
  }
  
  ctx.fillStyle='#0a1a08';ctx.fillRect(0,0,W,H);
  const bg=IMG['bg_forest'];
  if(bg){ctx.globalAlpha=.6;ctx.drawImage(bg,0,0,bg.width,bg.height,0,0,W,H);ctx.globalAlpha=1;}
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#f0c040';ctx.font='bold 38px Courier New';ctx.textAlign='center';
  ctx.fillText('✦ PEABIRU ✦',W/2,H/2-10);
  ctx.fillStyle='#c8a040';ctx.font='12px Courier New';
  ctx.fillText('O CAMINHO DA PRATA',W/2,H/2+18);
  ctx.fillStyle='#aaaaaa';ctx.font='11px Courier New';
  ctx.fillText('Pressione qualquer tecla para começar',W/2,H/2+55);
}
window.addEventListener('load',boot);

function goToNextPhase(){
  window.location.href = "fase2.html";
}



const ASSETS = {
  "banana": "assets/images/index-banana.png",
  "bg_forest": "assets/images/index-bg_forest.png",
  "bg_forest_wide": "assets/images/index-bg_forest_wide.png",
  "boomerang": "assets/images/index-boomerang.png",
  "enemies": "assets/images/index-enemies.png",
  "fruits": "assets/images/index-fruits.png",
  "grapes": "assets/images/index-grapes.png",
  "indigenous": "assets/images/index-indigenous.png",
  "jag_0": "assets/images/index-jag_0.png",
  "jag_1": "assets/images/index-jag_1.png",
  "jag_2": "assets/images/index-jag_2.png",
  "jag_3": "assets/images/index-jag_3.png",
  "jag_4": "assets/images/index-jag_4.png",
  "jag_5": "assets/images/index-jag_5.png",
  "jaguar": "assets/images/index-jaguar.png",
  "jaguar_f0": "assets/images/index-jaguar_f0.png",
  "jaguar_f1": "assets/images/index-jaguar_f1.png",
  "jaguar_f2": "assets/images/index-jaguar_f2.png",
  "jaguar_f3": "assets/images/index-jaguar_f3.png",
  "jaguar_frame0": "assets/images/index-jaguar_frame0.png",
  "jaguar_frame1": "assets/images/index-jaguar_frame1.png",
  "log1": "assets/images/index-log1.png",
  "log2": "assets/images/index-log2.png",
  "logs": "assets/images/index-logs.png",
  "orange": "assets/images/index-orange.png",
  "player": "assets/images/index-player.png",
  "player_idle": "assets/images/index-player_idle.png",
  "player_run": "assets/images/index-player_run.png",
  "player_walk": "assets/images/index-player_walk.png",
  "scenario_ref": "assets/images/index-scenario_ref.png",
  "snake_attack": "assets/images/index-snake_attack.png",
  "snake_coil": "assets/images/index-snake_coil.png",
  "sword": "assets/images/index-sword.png",
  "weapons": "assets/images/index-weapons.png",
  "whip": "assets/images/index-whip.png",
};

