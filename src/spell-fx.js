import * as THREE from 'three';
import {characterArt} from './npc.js';
import {glow} from './art.js';
const {cut,box,node}=characterArt;
const TAU=Math.PI*2;
const fxMaterial=(color,opacity=.8)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
function ribbon(points,width,color){
  const positions=[];for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz)||1,nx=-dz/len*width,nz=dx/len*width;
    positions.push(a[0]+nx,a[1],a[2]+nz,a[0]-nx,a[1],a[2]-nz,b[0]+nx,b[1],b[2]+nz,a[0]-nx,a[1],a[2]-nz,b[0]-nx,b[1],b[2]-nz,b[0]+nx,b[1],b[2]+nz);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return new THREE.Mesh(geometry,fxMaterial(color));
}
export function spellProjectile(kind,color,weaponId=null){
  const root=new THREE.Group(),core=node(root),details=node(root);root.name=kind==='frost'?'ice-shard':kind==='rocket'?'flame-comet':'lunar-wisp';
  if(kind==='frost'){
    const crystal=cut(core,[[0,.02,.02],[.16,.17,.15],[.51,.13,.10],[.84,.01,.01]],0,0,0,0xbdedff);crystal.rotation.x=Math.PI/2;
    box(core,.04,.04,.72,0,0,.40,0xe5fcff);
    for(const side of[-1,1]){const chip=cut(details,[[0,.03,.03],[.20,.07,.065],[.31,.01,.01]],side*.14,0,-.14,0x90d8ff);chip.rotation.x=Math.PI/2;chip.rotation.z=side*.25;}
    root.add(glow(color,1.0));
  }else if(kind==='rocket'){
    for(let i=0;i<3;i++){const flame=cut(core,[[-.27,.02,.02],[-.08,.35-i*.06,.28-i*.035],[.28,.18,.15],[.66,.01,.01]],(i-1)*.12,0,(i-1)*.08,i===1?0xffe0ac:color);flame.rotation.x=-Math.PI/2;flame.rotation.z=(i-1)*.25;}
    for(const side of[-1,1]){const tongue=cut(details,[[0,.03,.03],[.28,.11,.08],[.68,.02,.02]],side*.18,.03,.32,0xf77345);tongue.rotation.x=-Math.PI/2;}
    root.add(glow(0xffbb74,1.55));
  }else{
    cut(core,[[-.28,.01,.01],[-.11,.36,.33],[.18,.28,.25],[.34,.01,.01]],0,0,0,0xd9c2ff);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.29,.024,3,16,Math.PI*1.4),fxMaterial(0xf4d1ff));rim.rotation.x=Math.PI/2;rim.userData.ownedGeo=true;details.add(rim);
    for(let i=0;i<4;i++){const a=i*TAU/4;box(details,.05,.05,.12,Math.sin(a)*.39,.02,Math.cos(a)*.39,0xcab0ff).rotation.y=a;}
    root.add(glow(color,1.15));
  }
  const runes=new THREE.Mesh(new THREE.TorusGeometry(kind==='rocket'?.36:.30,.018,3,8),fxMaterial(0xb878f0,.65));runes.rotation.x=Math.PI/2;details.add(runes);
  if(weaponId==='sunorb'){const tint=new THREE.Color(0x241332);core.traverse(m=>{const colors=m.geometry?.attributes.color;if(colors){for(let i=0;i<colors.count;i++)colors.setXYZ(i,tint.r,tint.g,tint.b);colors.needsUpdate=true;}});root.name='black-sun-wisp';}
  root.traverse(mesh=>{if(mesh.isMesh)mesh.userData.ownedGeo=true;});
  root.userData.spell={kind,core,details};return root;
}
export const SpellFX={
  effectGroup(root,life,options={}){
    root.traverse(m=>{if(m.material?.transparent)m.userData.fxOpacity=m.material.opacity;});this.fxGroup.add(root);this.effects.push({mesh:root,life,maxLife:life,fadeTree:true,ownedGeo:true,...options});return root;
  },
  castSpellVisual(w,aim,muzzle){
    const p=this.player,root=new THREE.Group();root.name=`${w.id}-cast-sigil`;root.position.set(p.x,.12,p.z);root.rotation.y=-aim;
    const ring=new THREE.Mesh(new THREE.RingGeometry(1.10,1.16,32,1,0,TAU*.94),fxMaterial(0xa478ed,.48));ring.rotation.x=-Math.PI/2;root.add(ring);
    const inner=new THREE.Mesh(new THREE.RingGeometry(.76,.80,6),fxMaterial(w.color,.68));inner.rotation.x=-Math.PI/2;inner.position.y=.04;root.add(inner);
    const count=this.quality?.name==='low'?6:10;
    for(let i=0;i<count;i++){const a=i*TAU/count,points=[[Math.sin(a)*1.06,.03,Math.cos(a)*1.06],[Math.sin(a+.10)*1.45,.03,Math.cos(a+.10)*1.45],[Math.sin(a+.20)*1.06,.03,Math.cos(a+.20)*1.06]];root.add(ribbon(points,.035,0xc995ff));}
    this.effectGroup(root,this.reducedMotion?.28:.40,{grow:this.reducedMotion?.15:.7,spin:.8});
    const focus=new THREE.Group();focus.name='arcane-muzzle-crown';focus.position.copy(muzzle);focus.rotation.y=aim;
    for(let i=0;i<(this.reducedMotion?3:6);i++){const a=i*TAU/6;const shard=new THREE.Mesh(new THREE.OctahedronGeometry(.13,0),fxMaterial(i%2?w.color:0xd6b4ff,.72));shard.position.set(Math.cos(a)*.43,Math.sin(a)*.43,-.15);shard.scale.set(.65,1.7,.65);shard.rotation.z=-a;focus.add(shard);}
    this.effectGroup(focus,.20,{spin:2});
    const flash=glow(w.color,w.id==='embercodex'?2:1.4);flash.position.copy(muzzle);this.fxGroup.add(flash);this.effects.push({mesh:flash,life:.16,maxLife:.16,fade:true,grow:.7});
    const audio={froststaff:'icecast',stormrod:'thunder',embercodex:'flamecast',moonorb:'mooncast'};this.audio.play(audio[w.id]);
  },
  arcaneBeamVisual(x,z,tx,tz,color,height){
    const root=new THREE.Group();root.name='arcane-ritual-beam';root.userData.start=[x,height,z];root.userData.end=[tx,height,tz];
    root.add(ribbon([[x,height,z],[tx,height,tz]],.10,0xb56dff),ribbon([[x,height,z],[tx,height,tz]],.025,0xf6dfff));
    const dx=tx-x,dz=tz-z,length=Math.hypot(dx,dz),count=Math.min(this.quality?.name==='low'?3:7,Math.floor(length/2));
    for(let i=0;i<count;i++){const t=(i+1)/(count+1),r=.25+(i%2)*.10,halo=new THREE.Mesh(new THREE.TorusGeometry(r,.023,3,8),fxMaterial(i%2?color:0xbd8bff,.75));halo.position.set(x+dx*t,height,z+dz*t);halo.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(dx,0,dz).normalize());root.add(halo);}
    return this.effectGroup(root,.18);
  },
  lightning(x,z,tx,tz,color=0x9afde3,height=1.6){
    const dx=tx-x,dz=tz-z,length=Math.hypot(dx,dz);if(length<.08)return;
    const nx=-dz/length,nz=dx/length,segments=Math.max(3,Math.ceil(length/.65)),points=[];
    for(let i=0;i<=segments;i++){const t=i/segments,jitter=i===0||i===segments?0:Math.sin(i*7.31+this.time*13)*.21;points.push([x+dx*t+nx*jitter,height+Math.sin(i*4)*.07,z+dz*t+nz*jitter]);}
    const root=new THREE.Group();root.name='branching-lightning';root.add(ribbon(points,.07,color),ribbon(points,.021,0xe9ffff));
    for(let i=2;i<segments-1;i+=4){const a=points[i],side=i%2?1:-1,b=[a[0]+nx*.70*side+dx/length*.3,a[1]-.2,a[2]+nz*.70*side+dz/length*.3];root.add(ribbon([a,b,[b[0]+nx*.27*side,b[1]-.13,b[2]+nz*.27*side]],.032,color));}
    this.effectGroup(root,.19);
  },
  updateSpellProjectile(b){
    const spell=b.mesh.userData.spell;if(!spell)return;
    spell.core.rotation.z=b.age*(spell.kind==='rocket'?5:9);spell.details.rotation.z=-b.age*6;spell.details.rotation.y=b.age*4;
    if(spell.kind==='rocket')spell.core.scale.setScalar(1+Math.sin(b.age*25)*.12);
    b.trailTime=(b.trailTime||0)+this.lastSpellDt;if(b.trailTime<.045)return;b.trailTime=0;
    const spark=glow(b.color,spell.kind==='rocket'?.60:.32);spark.position.set(b.x,b.height,b.z);this.fxGroup.add(spark);this.effects.push({mesh:spark,life:spell.kind==='rocket'?.26:.16,maxLife:spell.kind==='rocket'?.26:.16,fade:true,grow:spell.kind==='rocket'?1.0:0});
  },
  spellImpact(b,x=b.x,z=b.z){
    if(!b.spell||b.damageType!=='magic')return;const color=b.color||0xb3e7ff;
    const ring=new THREE.Mesh(new THREE.RingGeometry(.20,.30,spellSegments(b.kind)),fxMaterial(color,.60));ring.rotation.x=-Math.PI/2;ring.position.set(x,.17,z);ring.name=`${b.kind}-spell-impact`;this.fxGroup.add(ring);this.effects.push({mesh:ring,life:.26,maxLife:.26,fade:true,grow:b.kind==='rocket'?7:2.4,ownedGeo:true});
    if(b.kind==='frost'){this.audio.play('icebreak');this.particles(x,.9,z,0xb1edff,9,2);}
    if(b.kind==='rocket'){
      const root=new THREE.Group();root.name='fireburst-sigil';root.position.set(x,.1,z);for(let i=0;i<8;i++){const a=i*TAU/8;root.add(ribbon([[0,.03,0],[Math.sin(a)*1.2,.03,Math.cos(a)*1.2],[Math.sin(a+.12)*2.1,.03,Math.cos(a+.12)*2.1]],.065,0xffb16f));}this.effectGroup(root,.42,{grow:1.5});
    }
  },
  meleeWeaponVisual(w,aim,radius,arc,heavy,quake,skill){
    const style=w.effect==='thrust'&&!skill?'thrust':w.effect==='quake'&&!skill?'quake':'slash';
    const root=this.warriorSlashVisual(aim,radius,arc,heavy,style);root.name=skill?'warrior-shockwave':`${w.id}-attack`;
    this.audio.play(style==='thrust'?'thrust':style==='quake'?'hammer':w.id==='oathaxe'?'axe':heavy?'cleave':'slash');
    this.shake=Math.max(this.shake,style==='quake'?(quake?.46:.25):heavy?.19:.095);
  }
};
const spellSegments=kind=>kind==='frost'?6:kind==='rocket'?16:12;
