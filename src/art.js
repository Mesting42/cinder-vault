import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RNG,TAU,DIRECTIONS,weaponById} from './data.js';
import {containsRoom,roomPoint} from './rooms.js';
import {buildExterior} from './exterior.js';
import {npcModel} from './npc.js';
import {buildHero} from './hero.js';
import {buildClassHero} from './class-heroes.js';
import {classWeaponModel} from './class-weapons.js';
import {buildTombRoom} from './tomb.js';
import {tombEnemyModel} from './tomb-enemies.js';
import {guardianModel} from './guardian.js';
import {buildEclipseRoom} from './eclipse.js';
import {expansionWeapon,eclipseEnemy} from './expansion-models.js';
import {NEW_WEAPONS} from './expansion-data.js';
const expansionIds=new Set(NEW_WEAPONS.map(w=>w.id));
const mats=new Map(),geos=new Map();
export function batchStatic(root){
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),buckets=new Map();
  root.traverse(m=>{
    if(!m.isMesh||m.userData.batched)return;let p=m;while(p&&p!==root){if(p.userData.animated)return;p=p.parent;}
    if(!m.geometry.attributes.normal||!m.geometry.attributes.uv||Array.isArray(m.material))return;
    const transformed=m.geometry.clone().applyMatrix4(inverse.clone().multiply(m.matrixWorld)),geom=transformed.index?transformed.toNonIndexed():transformed;if(geom!==transformed)transformed.dispose();
    const bucket=buckets.get(m.material.uuid)||{material:m.material,geometries:[],originals:[]};bucket.geometries.push(geom);bucket.originals.push(m);buckets.set(m.material.uuid,bucket);
  });
  for(const b of buckets.values()){
    const geometry=mergeGeometries(b.geometries);b.geometries.forEach(g=>g.dispose());if(!geometry)continue;
    for(const m of b.originals)m.parent.remove(m);const mesh=new THREE.Mesh(geometry,b.material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.batched=true;root.add(mesh);
  }
  return root;
}
export function material(color,emissive=0,metalness=.1){const key=`${color}-${emissive}-${metalness}`;if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,emissive:emissive?color:0,emissiveIntensity:emissive,roughness:.78,metalness}));return mats.get(key);}
export function box(parent,w,h,d,x,y,z,color,emit=0){const key=`b${w}-${h}-${d}`;if(!geos.has(key))geos.set(key,new THREE.BoxGeometry(w,h,d));const m=new THREE.Mesh(geos.get(key),material(color,emit));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function cylinder(parent,r1,r2,h,x,y,z,color,sides=8,emit=0){const key=`c${r1}-${r2}-${h}-${sides}`;if(!geos.has(key))geos.set(key,new THREE.CylinderGeometry(r1,r2,h,sides));const m=new THREE.Mesh(geos.get(key),material(color,emit,.3));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function group(parent,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);if(parent)parent.add(g);return g;}
export function label(text,color='#ead7a0',size=256){const c=document.createElement('canvas');c.width=size;c.height=size/4;const ctx=c.getContext('2d');ctx.fillStyle='#152527';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#8b7c4e';ctx.lineWidth=3;ctx.strokeRect(4,4,c.width-8,c.height-8);ctx.font=`bold ${size/11}px Microsoft YaHei`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,size/2,size/8);const texture=new THREE.CanvasTexture(c);texture.magFilter=THREE.NearestFilter;texture.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(3.6,.9),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));return mesh;}
function floorTexture(floor,seed){const rng=new RNG(seed),c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=floor===1?'#36433b':'#352c3b';ctx.fillRect(0,0,128,128);for(let y=0;y<4;y++)for(let x=0;x<4;x++){const n=rng.int(0,9);ctx.fillStyle=floor===1?`rgb(${48+n},${62+n},${56+n})`:`rgb(${54+n},${43+n},${57+n})`;ctx.fillRect(x*32+1,y*32+1,30,30);ctx.fillStyle=floor===1?'#556052':'#65535c';ctx.fillRect(x*32+2,y*32+2,28,1);ctx.fillStyle='#222f2e';ctx.fillRect(x*32+2,y*32+29,28,1);for(let i=0;i<7;i++){ctx.fillStyle=rng.next()<.5?'#ffffff09':'#00000015';ctx.fillRect(x*32+rng.int(3,28),y*32+rng.int(3,27),rng.int(1,3),1);}if(rng.next()<.25){ctx.strokeStyle='#202d2b';ctx.beginPath();ctx.moveTo(x*32+5,y*32+3);ctx.lineTo(x*32+13,y*32+12);ctx.lineTo(x*32+10,y*32+17);ctx.stroke();}}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,3);t.magFilter=t.minFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;return t;}
function clothTexture(){const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');x.fillStyle='#815332';x.fillRect(0,0,32,32);x.fillStyle='#b48546';x.fillRect(2,0,2,32);x.fillRect(28,0,2,32);x.fillRect(0,3,32,2);x.fillRect(0,27,32,2);x.fillStyle='#c19557';for(let i=0;i<4;i++){x.fillRect(14-i*2,8+i*2,4+i*4,2);x.fillRect(14-i*2,22-i*2,4+i*4,2);}const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;return t;}
const rug=new THREE.MeshStandardMaterial({map:clothTexture(),roughness:1});
export function gunModel(id='revolver',scale=1){if(expansionIds.has(id))return expansionWeapon(id,scale);if(weaponById(id)?.classOnly!=='shooter')return classWeaponModel(id,scale);const g=group();const dark=0x283738,steel=0x80928b,gold=0xc19b52;box(g,.18,.24,.28,0,-.03,.18,dark);box(g,.20,.22,.65,0,.13,-.10,steel);box(g,.12,.12,.40,0,.14,-.49,dark);box(g,.14,.10,.15,0,.14,-.69,gold);box(g,.06,.07,.07,0,.31,-.35,gold);box(g,.18,.08,.20,0,.25,.16,0x627970);
  if(id==='shotgun'){box(g,.32,.24,.8,0,.13,-.25,0x8d7560);box(g,.30,.20,.55,0,.14,-.70,dark);box(g,.33,.09,.28,0,-.05,-.25,gold);box(g,.30,.13,.06,0,.13,-.98,0x141f22);}
  if(id==='smg'){box(g,.28,.29,.58,0,.16,-.15,dark);box(g,.18,.5,.17,0,-.17,-.09,gold);box(g,.08,.1,.8,.16,.14,-.35,steel);for(let i=0;i<4;i++)box(g,.32,.03,.05,0,.20,-.30-i*.10,0x54665e);}
  if(id==='rocket'){cylinder(g,.23,.23,1.1,0,.15,-.30,0x747c46,8).rotation.x=Math.PI/2;cylinder(g,.29,.26,.18,0,.15,.24,gold,8).rotation.x=Math.PI/2;box(g,.19,.30,.19,0,-.12,.12,dark);box(g,.10,.04,.8,0,.38,-.35,dark);}
  if(id==='laser'||id==='frost'){box(g,.33,.28,.65,0,.16,-.12,id==='laser'?0xd3d3b8:0x7496a1);box(g,.14,.13,.62,0,.17,-.40,id==='laser'?0x72e2d8:0x9ddeff,.8);for(let i=0;i<3;i++)box(g,.37,.32,.045,0,.16,-.1-i*.18,dark);box(g,.08,.24,.2,.2,.16,.09,0x77f1ed,.7);}
  if(id==='orbit'){const ring=cylinder(g,.34,.34,.08,0,.13,-.44,0xb79ade,8,.3);ring.rotation.x=Math.PI/2;cylinder(g,.17,.17,.1,0,.13,-.45,dark,8).rotation.x=Math.PI/2;box(g,.12,.12,.58,0,.15,-.18,0xd2b085);}
  if(id==='rail'){box(g,.26,.24,1.3,0,.14,-.46,steel);box(g,.22,.1,.65,0,.32,-.32,dark);box(g,.11,.11,1.0,0,.14,-.55,0xd25a7b,.4);box(g,.32,.35,.19,0,.11,.14,gold);}
  batchStatic(g);g.scale.setScalar(scale);g.userData.muzzleLocal=new THREE.Vector3(0,.14,({shotgun:-1.05,smg:-.83,rocket:-.88,laser:-.77,frost:-.77,orbit:-.60,rail:-1.18}[id]??-.77));return g;
}
export function heroModel(classId='shooter'){return classId==='shooter'?buildHero(gunModel):buildClassHero(classId,gunModel);}
export function enemyModel(type,floor=1){if(floor===3)return eclipseEnemy(type);if(floor===2)return tombEnemyModel(type);const g=group(),c=0xa27d4f;
  if(type==='gunner'||type==='shotgun'){cylinder(g,.42,.45,1.25,0,.97,0,c,8);box(g,.68,.17,.63,0,.38,0,0x333a36);for(const x of[-.28,.28])box(g,.23,.34,.34,x,.18,-.06,0x283736);cylinder(g,.46,.48,.26,0,1.68,0,0xd0b277,8);cylinder(g,.35,.45,.34,0,1.95,0,0x655c43,8);box(g,.70,.18,.10,0,1.33,-.40,0x272f2e);for(const x of[-.17,.17])box(g,.1,.07,.12,x,1.35,-.46,0xffbc67,.7);box(g,.17,.13,.13,0,1.02,-.45,0x44392f);for(const x of[-.57,.57]){box(g,.22,.6,.24,x,.90,0,c);box(g,.25,.20,.30,x,.57,-.12,0x41413b);}const gun=gunModel(type==='shotgun'?'shotgun':'revolver',.8);gun.position.set(.55,.77,-.5);g.add(gun);box(g,.10,1.05,.02,0,1.04,.45,0xe1bc68);}
  if(type==='bat'){cylinder(g,.40,.55,.70,0,1.2,0,0x617879,6);box(g,.47,.36,.30,0,1.47,-.25,0xb1c3af);for(const x of[-.14,.14])box(g,.13,.14,.08,x,1.47,-.44,0xf27a65,.7);box(g,.1,.26,.08,0,1.20,-.40,0xc5b994);for(const side of[-1,1]){const wing=group(g,side*.42,1.26,0);box(wing,.62,.12,.32,side*.2,0,0,0x44585a);box(wing,.40,.10,.65,side*.54,-.08,.06,0x2f4148);box(wing,.08,.1,.72,side*.71,-.13,.03,0xad9a70);wing.rotation.z=side*.2;g.userData[`wing${side}`]=wing;}}
  if(type==='turret'){cylinder(g,.78,.88,.20,0,.12,0,0x4c5853,8);for(let i=0;i<4;i++){const p=group(g);p.rotation.y=i*Math.PI/2;box(p,.16,.2,1,0,.24,.4,0x828171);}cylinder(g,.5,.65,.70,0,.55,0,0x616d62,8);box(g,1.1,.55,.72,0,1.07,0,0x536259);box(g,.80,.20,.81,0,1.42,0,c);for(const x of[-.31,.31]){box(g,.20,.22,1.10,x,1.02,-.50,0x293b3c);box(g,.12,.10,.06,x,1.05,-1.08,0xff7d6a,.8);}box(g,.19,.13,.07,0,1.24,-.44,0xff9f65,.6);}
  if(type==='mage'){cylinder(g,.30,.66,1.2,0,.88,0,0x68394f,6);cylinder(g,.30,.35,.45,0,1.62,0,0x927868,6);cylinder(g,0,.55,.9,0,2.13,0,0x303e48,5);box(g,.48,.18,.11,0,1.67,-.30,0x141f26);for(const x of[-.13,.13])box(g,.08,.08,.1,x,1.69,-.38,0xeb91f1,1);for(const side of[-1,1]){const p=box(g,.29,.63,.3,side*.51,1.1,0,0x573b53);p.rotation.z=side*.3;}box(g,.08,1.8,.08,.76,1.05,-.07,0xa9a078);cylinder(g,.20,.20,.37,.76,2,-.07,0xc379ff,5,1);for(let i=0;i<3;i++)box(g,.09,.65,.03,(i-1)*.20,.92,-.48,0xb59063);}
  if(type==='charger'){box(g,.95,.82,.8,0,.73,0,0x634a43);box(g,1.02,.19,.86,0,1.08,0,c);box(g,.76,.37,.30,0,1.3,-.25,0x998973);for(const x of[-.25,.25]){box(g,.12,.11,.08,x,1.32,-.43,0xff7152,.8);const horn=box(g,.14,.58,.16,x*1.4,1.55,-.07,0xc5b789);horn.rotation.z=-Math.sign(x)*.25;box(g,.30,.40,.44,x*1.4,.22,-.04,0x3b3835);}box(g,.49,.18,.12,0,1.13,-.50,0xddd2ad);for(let i=0;i<4;i++)box(g,.06,.2,.10,-.19+i*.13,1.0,-.53,0xc7be95);}
  for(const side of[-1,1])if(g.userData[`wing${side}`]){batchStatic(g.userData[`wing${side}`]);g.userData[`wing${side}`].userData.animated=true;}batchStatic(g);g.userData.type=type;return g;
}
export function bossModel(){const g=group(),body=group(g),bronze=0xa07753,dark=0x403747,red=0xad4859;const robe=cylinder(body,1.05,1.70,2.40,0,1.6,0,dark,8);for(let i=0;i<8;i++){const p=group(body);p.rotation.y=i*TAU/8;box(p,.30,2.2,.12,0,1.68,1.32,i%2?bronze:red);box(p,.38,.13,.15,0,.64,1.48,0xe0b172);}cylinder(body,1.20,1.30,.45,0,2.9,0,bronze,8);box(body,.65,1.65,.17,0,2.0,-1.4,0xcbaf7a);box(body,1.4,.24,.20,0,2.4,-1.42,0xe1c185);cylinder(body,.70,.83,1.1,0,3.63,0,0x897b73,8);box(body,1.20,.42,.15,0,3.61,-.73,0x282931);for(const x of[-.32,.32])box(body,.21,.14,.12,x,3.64,-.85,0xff725c,1.4);box(body,.70,.34,.15,0,3.25,-.78,0x514452);for(let i=0;i<5;i++)box(body,.10,.26,.15,-.28+i*.14,3.24,-.88,0xc8b39a);cylinder(body,.88,.86,.29,0,4.3,0,bronze,8);for(let i=0;i<8;i++){const p=group(body);p.rotation.y=i*TAU/8;box(p,.18,.62,.19,0,4.66,.73,0xd3b180);cylinder(p,.09,.13,.32,0,5.09,.73,0xff6b5e,5,.3);}box(body,.16,1.1,.15,0,5.02,0,0xd5b980);box(body,.7,.14,.18,0,5.35,0,0xd5b980);
  const arms=[];for(const side of[-1,1]){const a=group(body,side*1.8,2.9,0);cylinder(a,.55,.55,.65,0,0,0,bronze,8);box(a,.80,.96,.83,side*.27,-.61,0,red);box(a,.88,.25,.92,side*.27,-1.08,0,bronze);for(let i=0;i<3;i++){const barrel=cylinder(a,.19,.19,1.48,side*.27+(i-1)*.32,-.68,-.9,0x4f5d59,8);barrel.rotation.x=Math.PI/2;cylinder(a,.15,.15,.10,side*.27+(i-1)*.32,-.68,-1.68,0xff8b66,8,1).rotation.x=Math.PI/2;}batchStatic(a);a.userData.animated=true;arms.push(a);}const halo=group(body,0,3.45,.6);for(let i=0;i<16;i++){const p=group(halo,Math.sin(i*TAU/16)*2.20,Math.cos(i*TAU/16)*2.20,0);p.rotation.z=-i*TAU/16;box(p,.14,.36,.15,0,0,0,0xe1b87a,.3);}batchStatic(halo);halo.userData.animated=true;batchStatic(body);g.userData={body,arms,halo,type:'boss'};return g;
}
function column(g,x,z,floor){const c=floor===1?0x697266:0x73616a;const p=group(g,x,0,z);box(p,1.45,.24,1.45,0,.12,0,c);box(p,1.20,.24,1.20,0,.34,0,0x8a8871);box(p,.94,3.0,.94,0,1.95,0,c);for(const a of[-1,1]){box(p,.12,2.5,.99,a*.32,1.95,0,0x4e5b53);box(p,.99,2.5,.12,0,1.95,a*.32,0x4e5b53);}box(p,1.15,.24,1.15,0,3.5,0,0x98896d);box(p,1.4,.25,1.4,0,3.75,0,c);box(p,1.03,.18,1.03,0,2.9,0,0xa88b55);return p;}
function torch(g,x,z,floor){const p=group(g,x,0,z);box(p,.32,1.45,.28,0,1.05,0,0x4c5b50);cylinder(p,.31,.16,.4,0,1.87,0,0xb99760,6);const fire=group(p,0,2.17,0);cylinder(fire,0,.18,.58,0,0,0,floor===1?0xffc26f:0xff7272,5,2);cylinder(fire,0,.11,.45,.06,-.10,-.03,0xffebac,5,3);fire.userData.animated=true;const light=new THREE.PointLight(floor===1?0xffb95e:0xff526c,23,9,2);light.position.set(0,2.6,0);p.add(light);p.userData={fire,light};return p;}
export function objectModel(type,floor=1,variant=0){const g=group();switch(type){
  case'column':return column(g,0,0,floor);
  case'table':{const top=group(g,0,.92,0);box(top,2.6,.18,1.2,0,0,0,0x947149);for(let i=0;i<5;i++)box(top,.40,.02,1.1,(i-2)*.48,.1,0,0xa18050);for(const x of[-1,1])for(const z of[-.42,.42])box(g,.17,.9,.17,x,.45,z,0x544d3d);box(top,2.6,.22,.07,0,-.10,-.57,0x504b3b);g.userData.top=top;break;}
  case'crate':box(g,1.05,1.07,1.05,0,.55,0,0x806b4c);for(const side of[-1,1]){box(g,1.1,.10,1.1,0,.13,0,0x4b5143);box(g,1.1,.10,1.1,0,1.01,0,0x4b5143);box(g,.1,1.1,1.1,side*.36,.56,0,0xc09a65);}box(g,.44,.22,.07,0,.6,-.57,0xb79b67);box(g,.12,.14,.08,0,.6,-.62,0x414e47);break;
  case'barrel':cylinder(g,.45,.45,1.2,0,.65,0,0xb5503b,10);for(const y of[.16,1.1])cylinder(g,.49,.49,.13,0,y,0,0x555b4d,10);box(g,.47,.33,.08,0,.68,-.46,0xdab269);box(g,.08,.25,.1,0,.68,-.52,0x3c4035);cylinder(g,.12,.12,.13,.19,1.3,0,0x716444,8);break;
  case'urn':cylinder(g,.19,.38,.75,0,.48,0,0x8da08b,6);cylinder(g,.3,.2,.16,0,.94,0,0xb8b799,6);cylinder(g,.37,.27,.35,0,.20,0,0x62786f,6);box(g,.30,.23,.05,0,.55,-.3,0xc2ae72);break;
  case'chest':{box(g,1.8,.72,1.02,0,.40,0,0x635244);const lid=group(g,0,.83,.45);box(lid,1.84,.31,1.06,0,0,-.45,0x927748);for(const x of[-.61,.61]){box(g,.13,.87,1.1,x,.51,0,0xc5a964);box(lid,.14,.36,1.11,x,.01,-.45,0xc5a964);}box(g,.31,.34,.11,0,.65,-.56,0xd7bd7d);box(g,.07,.16,.12,0,.63,-.64,0x293934);g.userData.lid=lid;break;}
  case'shrine':cylinder(g,1.0,1.4,.4,0,.2,0,0x506259,8);cylinder(g,.62,.8,1.4,0,1.07,0,0x7c8874,6);box(g,.36,1.4,.26,0,2.48,0,0xc3af7b);box(g,1.3,.3,.30,0,2.7,0,0xc3af7b);const gem=cylinder(g,0,.30,.65,0,1.94,-.48,0x80f2cf,4,1.6);gem.rotation.z=Math.PI;g.userData.gem=gem;break;
  case'exit':{box(g,3,.16,3,0,.08,0,0x738778);for(let i=0;i<5;i++)box(g,2.7,.04,.18,0,.18,-1.1+i*.52,0x1e3336);for(const x of[-1.2,1.2]){box(g,.20,2.9,.2,x,1.55,1.3,0x788272);const lamp=box(g,.10,2.3,.1,x,1.55,1.13,0xd88362,.7);lamp.userData.animated=true;(g.userData.lamps??=[]).push(lamp);}box(g,2.6,.28,.35,0,3.02,1.3,0xb19a63);const sign=label('02 / 地下墓陵');sign.position.set(0,2.6,1.15);g.add(sign);break;}
  case'npc':return npcModel(variant,floor);
  case'trap':{box(g,1.5,.06,1.5,0,.04,0,0x433e3d);for(let i=0;i<4;i++)for(let j=0;j<4;j++)cylinder(g,0,.085,.45,-.48+i*.32,.2,-.48+j*.32,0xbaaf92,4);break;}
  case'pedestal':cylinder(g,.7,.9,.35,0,.2,0,0x52665e,8);cylinder(g,.54,.54,.7,0,.7,0,0x647269,8);box(g,1.2,.13,1.2,0,1.1,0,0x9ba38b);break;
  case'crack':{box(g,2.8,2.6,.5,0,1.3,0,floor===1?0x596759:0x66515e);for(let i=0;i<6;i++){const c=box(g,.08,.4,.04,Math.sin(i*1.7)*.3,.4+i*.32,-.28,0x99d6c4,.22);c.rotation.z=(i%2?1:-1)*.6;}break;}
}for(const part of ['top','lid','gem'])if(g.userData[part])g.userData[part].userData.animated=true;batchStatic(g);return g;}
function doorBadge(text,color){
  const canvas=document.createElement('canvas');canvas.width=320;canvas.height=80;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#101c19';ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(306,0);ctx.lineTo(320,40);ctx.lineTo(306,80);ctx.lineTo(14,80);ctx.lineTo(0,40);ctx.closePath();ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();ctx.fillStyle=color;ctx.font='bold 27px Microsoft YaHei';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,160,41);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.scale.set(2.9,.72,1);sprite.position.set(0,4.42,.15);return sprite;
}
export function stoneGateway(parent,offset,floor){
  const g=group(parent,offset),stone=floor===1?0x747d69:0x806c72,edge=floor===1?0xa5a383:0xb2998a,copper=0xa47548,dark=0x293b35;
  for(const side of[-1,1]){
    const x=side*2.55;box(g,.88,.22,1.5,x,.11,0,edge);box(g,.72,3.55,1.1,x,1.97,0,stone);box(g,.84,.22,1.32,x,3.7,0,edge);
    for(const y of[.62,1.5,2.4,3.15])box(g,.78,.07,1.15,x,y,0,dark);
    box(g,.27,2.65,.14,x,2.05,.65,copper);box(g,.11,2.4,.07,x,2.06,.75,0xd2b679);
    for(const y of[.82,3.15]){const rivet=cylinder(g,.085,.085,.1,x,y,.79,0xd5bd85,6);rivet.rotation.x=Math.PI/2;}
    box(g,.49,.71,.34,x,2.2,.78,dark);box(g,.34,.55,.10,x,2.2,.99,copper);
  }
  box(g,5.82,.45,1.25,0,3.94,0,stone);box(g,5.98,.12,1.39,0,4.23,0,edge);box(g,4.5,.12,.17,0,3.72,.71,copper);
  const crest=group(g,0,4.03,.76);box(crest,.58,.58,.18,0,0,0,copper).rotation.z=Math.PI/4;box(crest,.22,.36,.08,0,0,.13,0xd5bb7b);
  box(g,4.2,.065,3.2,0,.01,-.17,0x4f5d50);for(const z of[-1.58,1.2])box(g,4.16,.08,.13,0,.025,z,copper);for(const x of[-1.98,1.98])box(g,.1,.08,2.9,x,.03,-.17,edge);
  const arrows=group(g,0,.075,.36);for(let i=0;i<3;i++)for(const side of[-1,1]){const p=box(arrows,.08,.018,.48,side*.16,0,-.28-i*.44,0x86c4a5,.3);p.rotation.y=side*Math.PI/4;}arrows.userData.animated=true;
  const seal=group(g,0,.05,0);for(let i=0;i<9;i++){box(seal,.17,3.55,.22,(i-4)*.46,1.7,0,copper);cylinder(seal,0,.14,.30,(i-4)*.46,.06,0,0x524738,4).rotation.z=Math.PI;}for(const y of[.6,1.55,2.65,3.42])box(seal,4.17,.16,.27,0,y,0,0x674a32);box(seal,.52,.55,.16,0,1.57,.21,0xb98d51).rotation.z=Math.PI/4;seal.userData.animated=true;
  const lamps=[];for(const side of[-1,1]){const lens=box(g,.20,.36,.12,side*2.55,2.2,1.06,0x83f4b4,1.2);lens.userData.animated=true;lamps.push(lens);}
  const status={open:doorBadge('↟  可通行','#a1dfb8'),closed:doorBadge('╳  战斗封锁','#f0a08b')};for(const badge of Object.values(status)){badge.userData.animated=true;g.add(badge);}status.closed.visible=false;
  seal.visible=false;batchStatic(g);g.userData.animated=true;return {group:g,seal,lamps,status,arrows,progress:1,targetOpen:1};
}
export function roomGateway(parent,offset,floor,hidden,height,stone,edge,base){
  const door=stoneGateway(parent,offset,floor);if(!hidden)return{door};
  // The full wall patch stays outside static batching so revealing it removes
  // real wall geometry instead of painting a doorway on an intact wall.
  const cover=group(parent,offset);cover.userData.animated=true;cover.name='concealed-door-wall';
  box(cover,4.8,height,.70,0,height/2,0,stone);box(cover,4.8,.18,.86,0,height+.04,0,edge);box(cover,4.8,.14,.81,0,.22,0,base);
  door.group.visible=false;return{door,cover};
}
export function revealRoomGateway(visual,direction){
  const hidden=visual.concealedDoors?.[direction];if(!hidden)return;
  hidden.cover.visible=false;hidden.door.group.visible=true;visual.doors[direction]=hidden.door;delete visual.concealedDoors[direction];
}
export function buildRoom(room,floor){if(floor===3)return buildEclipseRoom(room);if(floor===2)return buildTombRoom(room);const rng=new RNG(room.seed),g=group(),lights=[],doors={},concealedDoors={};const tint=0x647063,metal=0x899174,w=room.w,h=room.h;
  const objects=[],outline=room.outline||[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
  const shape=new THREE.Shape();outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();for(const hole of room.holes||[]){const path=new THREE.Path();hole.forEach(([x,z],i)=>i?path.lineTo(x,-z):path.moveTo(x,-z));path.closePath();shape.holes.push(path);}
  function slab(depth,y,mat,scale=1){const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1,curveSegments:1});const uv=geo.attributes.uv,p=geo.attributes.position;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/w+.5,-p.getY(i)/h+.5);const mesh=new THREE.Mesh(geo,mat);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.scale.set(scale,scale,1);mesh.receiveShadow=true;mesh.castShadow=true;g.add(mesh);return mesh;}
  const texture=floorTexture(floor,room.seed);texture.repeat.set(w/6,h/6);slab(.35,-.35,new THREE.MeshStandardMaterial({map:texture,roughness:.94,metalness:.08}));slab(.28,-.69,material(0x243332),1.025);slab(.10,-.41,material(metal),1.013);
  for(let edge=0;edge<outline.length;edge++){const a=outline[edge],b=outline[(edge+1)%outline.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
    const wall=group(g,mx,0,mz);wall.rotation.y=-Math.atan2(dz,dx);const wallheight=-dx/length>.25?1.25:3.4;
    const d=DIRECTIONS.find(d=>{if(room.links[d.name]===undefined&&room.secret?.direction!==d.name)return false;const x=d.dx*w/2,z=d.dy*h/2;const t=((x-a[0])*dx+(z-a[1])*dz)/(length*length);return t>=0&&t<=1&&Math.abs((x-a[0])*dz-(z-a[1])*dx)<.01;});
    const doorOffset=d?((d.dx*w/2-mx)*dx+(d.dy*h/2-mz)*dz)/length:0;
    function wallPart(from,to){if(to-from<.05)return;box(wall,to-from,wallheight,.7,(from+to)/2,wallheight/2,0,tint);box(wall,to-from,.16,.84,(from+to)/2,wallheight+.03,0,metal);box(wall,to-from,.1,.81,(from+to)/2,.25,0,0x3d4d44);}
    if(d){wallPart(-length/2,doorOffset-2.4);wallPart(doorOffset+2.4,length/2);const hidden=room.links[d.name]===undefined,entry=roomGateway(wall,doorOffset,floor,hidden,wallheight,tint,metal,0x3d4d44);if(hidden)concealedDoors[d.name]=entry;else doors[d.name]=entry.door;}else wallPart(-length/2,length/2);
    for(let x=-length/2+1.1;x<length/2-.5;x+=2.5){if(d&&Math.abs(x-doorOffset)<3)continue;box(wall,1.8,.06,.05,x,.62,.40,0x92a18a);if(wallheight>2){box(wall,.88,1.38,.10,x,2.05,.40,0x45544c);box(wall,.65,.08,.14,x,2.61,.49,0x9a9467);for(let i=0;i<3;i++)box(wall,.07,.72,.14,x+(i-1)*.21,2.08,.49,0x84907b);}}
    if(floor===2&&length>5){const pipe=cylinder(wall,.13,.13,length-.6,0,1.6,.57,0x755465,8);pipe.rotation.z=Math.PI/2;for(let x=-length/2+1;x<length/2;x+=3)box(wall,.16,.38,.29,x,1.6,.56,0x96736c);}
  }
  for(const [x,z] of outline){const point=roomPoint(room,x*.93,z*.93,.85);if(objects.some(o=>Math.hypot(o.x-point.x,o.z-point.z)<1.8))continue;const model=column(g,point.x,point.z,floor);objects.push({type:'column',x:point.x,z:point.z,hw:.60,hh:.60,hp:9999,solid:true,shotBlock:true,model,destroyed:false});}
  for(const x of[-w/2+1.8,w/2-1.8])for(const z of[-h/2+3.4,h/2-3.4]){const p=roomPoint(room,x,z,.55);lights.push(torch(g,p.x,p.z,floor));}
  for(const hole of room.holes||[]){for(let i=0;i<hole.length;i++){const a=hole[i],b=hole[(i+1)%hole.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]),p=group(g,(a[0]+b[0])/2,0,(a[1]+b[1])/2);p.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);box(p,l,.30,.22,0,-.05,0,0x4e6258);box(p,l,.05,.31,0,.13,0,0x9d8f69);box(p,l,1.9,.14,0,-1.1,0,0x172c2d);}const pit=glow(floor===1?0x58b18e:0xff3865,6.2);pit.position.set(0,-1.7,0);g.add(pit);cylinder(g,2.5,2.5,.1,0,-2.5,0,0x091c20,12);}
  const carpet=new THREE.Mesh(new THREE.PlaneGeometry(4.8,h-2.4),rug);carpet.rotation.x=-Math.PI/2;carpet.position.y=.005;carpet.receiveShadow=true;if(['start','boss','shrine','shop'].includes(room.type))g.add(carpet);
  const crestGroup=group(g,0,0,room.holes?.length?-h*.31:0);const crest=cylinder(crestGroup,2.4,2.4,.025,0,.025,0,floor===1?0x75816a:0x8f5c69,12);const inner=cylinder(crestGroup,2.08,2.08,.027,0,.045,0,floor===1?0x354c46:0x352e3c,12);if(room.type==='boss'){crest.scale.set(2,1,2);inner.scale.set(2,1,2);}for(let i=0;i<8;i++){const p=group(crestGroup);p.rotation.y=i*TAU/8;box(p,.12,.03,.58,0,.07,1.80,0xb49b6f);}
  function add(type,x,z,rot=0,variant=0){const sizes={column:[.65,.65],table:[1.30,.65],crate:[.55,.55],barrel:[.47,.47],urn:[.32,.32],trap:[.75,.75],npc:[1.15,1.05]};const s=sizes[type]||[.75,.75];if(type!=='crack'){const point=roomPoint(room,x,z,Math.max(...s)+.15,(a,b)=>objects.some(o=>o.solid&&Math.abs(a-o.x)<o.hw+s[0]+.2&&Math.abs(b-o.z)<o.hh+s[1]+.2));x=point.x;z=point.z;}const model=objectModel(type,floor,variant);model.userData.animated=true;model.position.set(x,0,z);model.rotation.y=rot+(type==='npc'?Math.PI:0);if(type==='npc')model.userData.homeYaw=model.rotation.y;g.add(model);const obj={type,x,z,hw:Math.abs(Math.cos(rot))*s[0]+Math.abs(Math.sin(rot))*s[1],hh:Math.abs(Math.cos(rot))*s[1]+Math.abs(Math.sin(rot))*s[0],hp:type==='barrel'?12:type==='crate'?18:type==='urn'?6:9999,model,destroyed:false,flipped:false,solid:['column','table','crate','barrel'].includes(type),shotBlock:['column','crate','barrel'].includes(type)};objects.push(obj);return obj;}
  if(['combat','boss','start','event','secret'].includes(room.type)){
    const templates=[[["column",-6,-3],["column",6,3],["table",0,4],["barrel",-5,4],["crate",5,-4]],[["column",-5,0],["column",5,0],["table",0,-4],["crate",-6,5],["barrel",6,5]],[["table",-5,-3],["table",5,3],["crate",-6,-5],["crate",6,-5],["barrel",0,5]],[["column",-6,-4],["column",6,-4],["column",-6,4],["column",6,4],["table",0,4],["barrel",5,0]],[["crate",-5,-3],["crate",-6,-3],["crate",5,3],["table",0,-4],["barrel",-4,4],["column",6,-4]]];
    for(const [type,x,z] of templates[room.layout])if(room.type!=='boss'||type!=='column')add(type,x,z,type==='table'&&rng.next()<.4?Math.PI/2:0);
    for(let i=0;i<rng.int(4,8);i++)add('urn',rng.pick([-w/2+2.2,w/2-2.2]),rng.int(-h/2+3,h/2-3));
    if(floor===2&&room.type==='combat')for(let i=0;i<rng.int(2,4);i++){const o=add('trap',rng.pick([-3,3,7,-7]),rng.pick([-5,-2,2,5]));o.offset=rng.next()*TAU;}
  }
  if(room.type==='start'){add('chest',-3,0).free=true;add('npc',3,0,0,'watcher');}
  if(room.type==='chest'){add('chest',0,-1);add('chest',4,2).free=rng.next()<.32;for(const x of[-7,7])add('column',x,0);}
  if(room.type==='secret'){add('chest',0,0).free=true;add('chest',4,-2).free=true;}
  if(room.type==='exit')add('exit',0,0);
  if(room.type==='shrine'){add('shrine',0,0);for(const x of[-5,5])add('column',x,-3);}
  if(room.type==='event'){const event=rng.pick(['forge','rescue','challenge']),n=add('npc',0,-2,0,event);n.event=event;add('pedestal',0,1);}
  if(room.type==='shop'){
    const npc=add('npc',0,-h/2+3,0,'merchant');npc.shop=true;box(g,5.5,1.0,1.25,0,.5,-h/2+4.2,0x745f41);for(let i=0;i<5;i++)box(g,.65,.07,1.3,(i-2)*1.05,1.03,-h/2+4.2,0xa88b51);const sign=label('铜币交易所 / ARMORY');sign.position.set(0,3,-h/2+.42);g.add(sign);for(const x of[-8,-4,0,4,8])add('pedestal',x,0);
    for(let i=0;i<6;i++)add('crate',rng.pick([-w/2+2,w/2-2]),-h/2+2.8+i*.45);
  }
  if(room.type==='boss'){for(const x of[-10,10])for(const z of[-7,7])add('column',x,z);for(const x of[-6,6]){const p=group(g,x,0,-h/2+1);box(p,2.0,4.8,.40,0,2.4,0,0x6a3549);box(p,.24,4.3,.43,0,2.4,-.05,0xc59069);box(p,1.4,.20,.44,0,3.8,-.05,0xc59069);}const text=label('OATHBELL GUARDIAN','#bce0c9',512);text.position.set(0,3.4,-h/2+.5);g.add(text);const light=new THREE.PointLight(0x89d7b9,72,22,2);light.position.set(0,5,-4);g.add(light);}
  if(room.secret&&!room.secret.revealed){const d=DIRECTIONS.find(d=>d.name===room.secret.direction);const crack=add('crack',d.dx*(w/2-.55),d.dy*(h/2-.55),d.dx?Math.PI/2:0);crack.hp=25;crack.secretId=room.secret.id;crack.dir=d.name;crack.hw=d.dx?.5:1.5;crack.hh=d.dx?1.5:.5;crack.shotBlock=true;}
  // Atmospheric pipework, chains and floor markings are distinct between the two floors.
  if(floor===2)for(let i=0;i<8;i++){const p=roomPoint(room,-3.5+i,-h/2+2.6,.2),m=box(g,.7,.02,.14,p.x,.08,p.z,0xc8a36b);m.rotation.y=-.7;}
  for(let i=0;i<8;i++){const p=roomPoint(room,rng.int(-w/2+2,w/2-2),rng.int(-h/2+2,h/2-2),.2);box(g,.12,.04,.30,p.x,.04,p.z,0xa18b59);}
  for(const x of[-w/2+4,w/2-4]){const shaft=new THREE.Mesh(new THREE.ConeGeometry(2.2,7.5,16,1,true),new THREE.MeshBasicMaterial({color:floor===1?0xc8ddb2:0xff6b94,transparent:true,opacity:room.type==='boss'?.036:.022,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));shaft.position.set(x,3.8,-h/2+4);shaft.rotation.z=x>0?.22:-.22;shaft.userData.animated=true;g.add(shaft);}
  const exterior=buildExterior(room,floor);g.add(exterior.group);
  for(const door of Object.values(doors))door.seal.userData.animated=true;batchStatic(g);return {group:g,objects,lights,doors,concealedDoors,exterior};
}
export function pickupModel(kind,id){const g=group();if(kind==='weapon'){const weapon=gunModel(id,1.4);if(id==='stormrod'||id==='froststaff')weapon.rotation.x=Math.PI/2;g.add(weapon);g.rotation.z=-.18;}else if(kind==='coin'){const m=cylinder(g,.16,.16,.09,0,.1,0,0xe2bd6b,8,.3);m.rotation.x=Math.PI/2;box(g,.05,.13,.12,0,.1,-.06,0x8c733e);}else if(kind==='health'){box(g,.18,.60,.18,0,.3,0,0xfe9181,.5);box(g,.58,.18,.18,0,.3,0,0xfe9181,.5);}else if(kind==='key'){cylinder(g,.15,.15,.07,0,.20,0,0xf1cf83,8,.4).rotation.x=Math.PI/2;box(g,.065,.35,.07,0,-.04,0,0xe3c684);box(g,.15,.05,.07,.06,-.16,0,0xe3c684);}else{cylinder(g,.36,.36,.15,0,.18,0,kind==='active'?0x91d8e3:0xc6a3df,6,.4);box(g,.12,.48,.20,0,.2,-.11,0xdad6b4);box(g,.4,.12,.20,0,.2,-.12,0xe0cca2);}return g;}
export const glowTexture=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),a=x.createRadialGradient(32,32,0,32,32,32);a.addColorStop(0,'#fff');a.addColorStop(.15,'#ffffffef');a.addColorStop(.4,'#ffffff50');a.addColorStop(1,'#ffffff00');x.fillStyle=a;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})();
export function glow(color,size){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));s.scale.set(size,size,1);return s;}
