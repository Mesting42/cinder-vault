import * as THREE from 'three';
import {RNG,TAU} from './data.js';

const cube=new THREE.BoxGeometry(1,1,1);
const drum=new THREE.CylinderGeometry(1,1,1,8);
const link=new THREE.TorusGeometry(.19,.038,4,8);
const valveWheel=new THREE.TorusGeometry(.665,.08,4,8);
const palettes=[null,
  {stone:0x3f514a,edge:0x5c6656,dark:0x1c302f,copper:0x6f5940,moss:0x354e39,light:0xeab977,haze:0x597e77,abyss:'#08191b'},
  {stone:0x49363e,edge:0x6c4c51,dark:0x281d2b,copper:0x795044,moss:0x41313e,light:0xe57960,haze:0x95516b,abyss:'#160e1b'}
];
const materialCache=new Map();
function surface(floor,style){
  const key=`${floor}/${style}`;
  if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({
    color:0xffffff,roughness:style==='metal'?.64:.96,metalness:style==='metal'?.52:.06,
    emissive:style==='light'?palettes[floor].light:0,emissiveIntensity:style==='light'?.32:0
  }));
  return materialCache.get(key);
}
function cloudTexture(){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;
  const ctx=canvas.getContext('2d');
  for(const [x,y,r,a] of [[36,34,30,.18],[60,29,31,.16],[88,35,25,.12]]){
    const gradient=ctx.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,`rgba(255,255,255,${a})`);gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,64);
  }
  return new THREE.CanvasTexture(canvas);
}
const mistMap=cloudTexture();
const lanternMap=(()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');
  const gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.08,'#ffffffcc');gradient.addColorStop(.3,'#ffffff20');gradient.addColorStop(1,'#ffffff00');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(canvas);
})();

// Scenery uses its own seed and instanced meshes. It never enters the room's
// collision, interaction or reward lists, and keeps the overview camera intact.
export function buildExterior(room,floor){
  const rng=new RNG((room.seed^0x61c88647^Math.imul(floor,0x45d9f3b))>>>0),palette=palettes[floor];
  const root=new THREE.Group();root.name='ruins-exterior';root.userData.animated=true;
  const buckets=new Map(),landmarks=[],lanterns=[],wisps=[],W=room.w/2,H=room.h/2;
  function anchor(kind,x,y,z,yaw=0,tier=0){
    const node=new THREE.Group();node.position.set(x,y,z);node.rotation.y=yaw;root.add(node);node.updateWorldMatrix(true,false);
    node.userData.tier=tier;landmarks.push({kind,x,y,z,tier});return node;
  }
  function put(frame,geometry,style,x,y,z,sx,sy,sz,color,rx=0,ry=0,rz=0){
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(sx,sy,sz)).premultiply(frame.matrixWorld);
    const shade=new THREE.Color(color).multiplyScalar([.56,.33,.18][frame.userData.tier||0]);
    const key=`${geometry.uuid}/${style}`;if(!buckets.has(key))buckets.set(key,{geometry,style,items:[]});buckets.get(key).items.push({matrix,color:shade});
  }
  const stone=(p,w,h,d,x,y,z,color=palette.stone,rz=0)=>put(p,cube,'stone',x,y,z,w,h,d,color,0,0,rz);
  const metal=(p,w,h,d,x,y,z,color=palette.copper,rx=0,ry=0,rz=0)=>put(p,cube,'metal',x,y,z,w,h,d,color,rx,ry,rz);
  const round=(p,r,h,x,y,z,color=palette.copper,rx=0,rz=0)=>put(p,drum,'metal',x,y,z,r,h,r,color,rx,0,rz);
  function beam(p,a,b,width,depth,color=palette.copper){
    const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),middle=new THREE.Vector3(...a).addScaledVector(delta,.5);
    const rotation=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize()));
    put(p,cube,'metal',middle.x,middle.y,middle.z,width,delta.length(),depth,color,rotation.x,rotation.y,rotation.z);
  }
  function platform(p,w,d,broken=true){
    stone(p,w,.75,d,0,-.48,0,palette.dark);stone(p,w+.15,.16,d+.14,0,-.06,0,palette.edge);
    for(let x=-w/2+.55;x<w/2;x+=1.1)for(let z=-d/2+.55;z<d/2;z+=1.1){
      if(broken&&z>d/2-1.25&&rng.next()<.4)continue;
      stone(p,1.04,.10,1.04,x,.06,z,rng.next()<.22?palette.moss:palette.stone);
      if(rng.next()<.14)stone(p,.035,.015,.62,x+.18,.12,z,palette.dark,rng.next()*.6);
    }
    for(const side of[-1,1]){
      stone(p,.42,1.2,d*.86,side*(w/2-.5),-.98,0,palette.dark);
      for(let z=-d/2+.4;z<d/2;z+=1.35)stone(p,.46,.28,.82,side*(w/2+.11),-.64,z,palette.stone);
    }
  }
  function pillar(p,x,z,height=3.4){
    stone(p,1.45,.25,1.35,x,.2,z,palette.edge);stone(p,1.13,.2,1.02,x,.42,z,palette.dark);
    const courses=Math.max(2,Math.round(height/.52));
    for(let i=0;i<courses;i++){
      const shift=i===courses-1?(rng.next()-.5)*.2:0;
      stone(p,.85+(i%2)*.05,.48,.82,x+shift,.68+i*.52,z,palette.stone);
      stone(p,.13,.42,.04,x-.25,.68+i*.52,z-.43,palette.edge);
    }
    stone(p,1.02,.16,.98,x,courses*.52+.45,z,palette.edge);
    metal(p,1.05,.10,1.01,x,1.05,z);
  }
  function lantern(p,x,y,z,small=false){
    const s=small?.66:1;
    metal(p,.45*s,.1,.42*s,x,y-.31*s,z,palette.dark);metal(p,.45*s,.12,.42*s,x,y+.29*s,z);
    for(const side of[-1,1])metal(p,.055,.52*s,.38*s,x+side*.17*s,y,z);
    put(p,cube,'light',x,y,z,.22*s,.38*s,.22*s,palette.light);
    const pos=new THREE.Vector3(x,y,z).applyMatrix4(p.matrixWorld),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:lanternMap,color:palette.light,transparent:true,opacity:p.userData.tier===2?.32:.56,depthWrite:false,blending:THREE.AdditiveBlending}));
    sprite.position.copy(pos);sprite.scale.setScalar(small?1.7:2.4);root.add(sprite);lanterns.push({sprite,phase:rng.next()*TAU,base:sprite.material.opacity});
  }
  function chain(p,x,y,z,length){
    for(let i=0;i<Math.floor(length/.3);i++)put(p,link,'metal',x,y-i*.30,z,1,1,1,palette.copper,0,i%2?Math.PI/2:0);
    round(p,.11,.35,x,y-length-.12,z,palette.dark);
  }
  function arcade(p,width=6.4,intact=false){
    platform(p,width+3,4.3);pillar(p,-width/2,0,3.6);pillar(p,width/2,0,intact?3.6:2.5);
    for(let row=0;row<3;row++)for(let i=0;i<Math.floor(width/1.05);i++){
      if(row>0&&rng.next()<.36||row===2&&i>width/2)continue;
      stone(p,.98,.43,.48,-width/2+.48+i*1.04+(row%2)*.20,.3+row*.46,-1.30,palette.stone);
      if(rng.next()<.21)stone(p,.28,.05,.52,-width/2+.48+i*1.04,.55+row*.46,-1.3,palette.moss);
    }
    const radius=width/2,start=intact?0:.37,end=intact?Math.PI:2.72;
    for(let angle=start;angle<end;angle+=.22){
      if(!intact&&angle>.95&&angle<1.63)continue;
      stone(p,.94,.58,1.02,Math.cos(angle)*radius,3.7+Math.sin(angle)*1.65,0,palette.edge,angle-Math.PI/2);
      stone(p,.61,.13,1.12,Math.cos(angle)*radius,3.7+Math.sin(angle)*1.65+.3,0,palette.stone,angle-Math.PI/2);
    }
    for(const x of[-width/2,width/2])metal(p,.14,3.1,.08,x,1.92,-.46);
    for(let i=0;i<5;i++)stone(p,.9,.5,.7,(rng.next()-.5)*width,.3,-1.2+rng.next()*.6,palette.stone,(rng.next()-.5)*.55);
    chain(p,-width/2,3.2,.7,4.2);lantern(p,-width/2,2.8,.85,true);
  }
  function pipework(p,length=6){
    round(p,.27,length,0,.68,0,palette.copper,0,Math.PI/2);
    for(let x=-length/2+.2;x<length/2;x+=1.55){
      round(p,.36,.14,x,.68,0,palette.edge,0,Math.PI/2);metal(p,.12,.95,.82,x,.39,0,palette.dark);
      for(const z of[-.3,.3])round(p,.055,.13,x,.73,z,palette.copper,Math.PI/2);
    }
    round(p,.28,2.45,-length/2,-.57,0);round(p,.40,.16,-length/2,-1.76,0,palette.dark);
    round(p,.38,.22,length/2+.05,.68,0,palette.dark,0,Math.PI/2);
    put(p,valveWheel,'metal',length*.15,1.35,-.40,1,1,1,palette.copper);
    for(const angle of[0,Math.PI/2])metal(p,.9,.06,.06,length*.15,1.35,-.40,palette.edge,0,0,angle);
    round(p,.095,.66,length*.15,1.06,0);
  }
  function brokenBridge(p,length=5.4){
    const count=Math.floor(length/.75);
    for(let i=0;i<count;i++){
      const x=-length/2+.37+i*.75,z=i===count-1?.20:0;
      stone(p,.70,.3,2.45,x,-i*.045,z,i%3?palette.stone:palette.edge,(i===count-1?.18:0));
      if(i<count-2)for(const side of[-1,1])metal(p,.09,.88,.10,x,.46,side*1.05);
    }
    for(const side of[-1,1]){
      beam(p,[-length/2,.88,side*1.05],[length/2-1.5,.68,side*1.05],.07,.07);
      beam(p,[-length/2,-.5,side*.87],[length/2-1.25,-.64,side*.87],.18,.16,palette.dark);
    }
    chain(p,length/2-1.25,.55,1.05,3.6);
  }

  // A deep, textured bed makes the void read as a shaft below the room.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
  ctx.fillStyle=palette.abyss;ctx.fillRect(0,0,256,256);
  for(let i=0;i<32;i++){
    const x=rng.int(0,256),y=rng.int(0,256),radius=rng.int(12,65),gradient=ctx.createRadialGradient(x,y,0,x,y,radius);
    gradient.addColorStop(0,floor===1?'#49706b20':'#853f5924');gradient.addColorStop(1,'#00000000');ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const bed=new THREE.Mesh(new THREE.PlaneGeometry(180,160),new THREE.MeshBasicMaterial({map:texture,fog:false}));bed.rotation.x=-Math.PI/2;bed.position.y=-13;root.add(bed);

  // Buttresses follow the actual footprint, including concave room shapes.
  const outline=room.outline;
  for(let i=0;i<outline.length;i++){
    const a=outline[i],b=outline[(i+1)%outline.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    const p=anchor('foundation',(a[0]+b[0])/2,-.72,(a[1]+b[1])/2,-Math.atan2(dz,dx));
    stone(p,length,1.65,.56,0,-.88,0,palette.dark);stone(p,length,.16,.75,0,-.13,0,palette.stone);
    for(let x=-length/2+1.4;x<length/2-.5;x+=3.1){
      stone(p,.70,3.05,.88,x,-1.5,-.17,palette.stone);stone(p,.91,.22,1.05,x,-.35,-.20,palette.edge);stone(p,1.09,.24,1.15,x,-2.91,-.23,palette.dark);
      stone(p,.22,2.4,.09,x,-1.6,-.64,palette.dark);
    }
  }

  for(const side of[-1,1]){
    const arch=anchor('broken-arcade',side*(W+6.0),-2.5,-H*.64+(rng.next()-.5)*2,(rng.next()-.5)*.22);
    arcade(arch,rng.next()<.5?5.0:6.4);
    const nearZ=H*.48+(rng.next()-.5)*1.5,near=anchor('pipe-landing',side*(W+5.5),-2.0,nearZ,-side*.09);
    platform(near,4.0,4.6);pipework(near,4.9);pillar(near,side*1.4,-1.5,1.6);lantern(near,-side*1.25,1.42,-1.1,true);
    const bridge=anchor('broken-bridge',side*(W+2.8),-1.0,nearZ+(side<0?2.0:-2.0),side<0?Math.PI:0);
    brokenBridge(bridge,4.8+rng.next());
    const ruin=anchor('sunken-arcade',side*(W+13.8),-6.4,-H*.18+(rng.next()-.5)*5,side*.12,1);
    arcade(ruin,7.0,true);pipework(ruin,6.4);lantern(ruin,2.8,1.0,1.0,true);
    const rear=anchor('distant-vault',side*(W+24),-9,-H*.85+(rng.next()-.5)*8,0,2);
    platform(rear,11,5);for(const x of[-4.5,0,4.5])pillar(rear,x,0,3.7+rng.next()*2.0);
    stone(rear,11,.58,.95,0,5.5,0,palette.stone);lantern(rear,0,3.0,-.55,true);
    for(let i=0;i<5;i++){
      const rubble=anchor('fallen-masonry',side*(W+8+i*4.9),-3.8-rng.next()*4,H*.80+(rng.next()-.5)*7,rng.next()*TAU,i>2?2:1);
      platform(rubble,2.2+rng.next()*2.3,2+rng.next()*1.6);
      for(let j=0;j<4;j++)stone(rubble,.9+rng.next(),.4+rng.next()*.4,.7+rng.next(),(rng.next()-.5)*2,.3+j*.1,(rng.next()-.5)*1.5,palette.stone,(rng.next()-.5)*.5);
    }
    for(let i=0;i<3;i++){
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:mistMap,color:palette.haze,transparent:true,opacity:i===0?.72:.94,depthWrite:false}));
      sprite.position.set(side*(W+10.5+i*8),-3.0-i*2.1,-H*.55+i*H*.72);sprite.scale.set(18+i*3,7+i,1);root.add(sprite);wisps.push({sprite,x:sprite.position.x,z:sprite.position.z,phase:rng.next()*TAU});
    }
  }
  for(const side of[-1,1]){
    const rear=anchor('rear-buttress',side*(W*.66),-4.7,-H-5.0,0,1);
    platform(rear,4.3,3.0);pillar(rear,0,0,3.0);pipework(rear,4.3);chain(rear,1.1,2.0,0,5.5);
  }
  const particleData=[];
  for(let i=0;i<84;i++){
    const side=i%2?1:-1;particleData.push({x:side*(W+3+rng.next()*28),y:-2.7-rng.next()*7,z:(rng.next()-.5)*(room.h+20),speed:.08+rng.next()*.1,phase:rng.next()*TAU});
  }
  const positions=new Float32Array(particleData.length*3),particleGeometry=new THREE.BufferGeometry();particleGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const particles=new THREE.Points(particleGeometry,new THREE.PointsMaterial({color:floor===1?0x719689:0xc08473,size:floor===1?.05:.065,transparent:true,opacity:.30,depthWrite:false}));root.add(particles);
  let instances=0;
  for(const bucket of buckets.values()){
    const mesh=new THREE.InstancedMesh(bucket.geometry,surface(floor,bucket.style),bucket.items.length);
    bucket.items.forEach((item,i)=>{mesh.setMatrixAt(i,item.matrix);mesh.setColorAt(i,item.color);});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=false;mesh.receiveShadow=false;root.add(mesh);instances+=bucket.items.length;
  }
  const exterior={group:root,floor,theme:floor===1?'verdigris-ruins':'cinder-chasm',landmarks,lanterns,wisps,particles,particleData,instances,drawBatches:buckets.size};
  root.userData.exterior=true;animateExterior(exterior,0);return exterior;
}

export function animateExterior(exterior,time){
  if(!exterior)return;
  if(exterior.theme==='eclipsed-sanctuary')return;
  for(const lamp of exterior.lanterns)lamp.sprite.material.opacity=lamp.base*(.90+.10*Math.sin(time*2.6+lamp.phase));
  for(const fog of exterior.wisps){fog.sprite.position.x=fog.x+Math.sin(time*.085+fog.phase)*1.2;fog.sprite.position.z=fog.z+Math.cos(time*.065+fog.phase)*.7;}
  const attribute=exterior.particles.geometry.attributes.position;
  exterior.particleData.forEach((p,i)=>{attribute.setXYZ(i,p.x+Math.sin(time*.18+p.phase)*.32,p.y+(time*p.speed%2),p.z+Math.sin(time*.07+p.phase)*.4);});attribute.needsUpdate=true;
}
