import * as THREE from 'three';
import {containsRoom} from './rooms.js';

// Combat signatures use shared facets and instanced geometry, never textures.
// Each burst owns its instance buffers and materials; the shape cache outlives it.
const TAU=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>1-(1-clamp(v))**3;
const pose=new THREE.Object3D(),color=new THREE.Color(),axis=new THREE.Vector3(0,0,1),direction=new THREE.Vector3(),orientation=new THREE.Quaternion();
let shapes;
function bladeSegment(inner,thickness){
  const points=[[-.08,0,1],[.08,0,1],[-.08*inner,thickness,inner],[.08*inner,thickness,inner],[-.08,-thickness,1],[.08,-thickness,1],[-.08*inner,0,inner],[.08*inner,0,inner]];
  const faces=[[0,1,2],[1,3,2],[4,6,5],[5,6,7],[0,4,1],[1,4,5],[2,3,6],[3,7,6],[0,2,4],[2,6,4],[1,5,3],[3,5,7]],positions=[];
  for(const face of faces)for(const index of face)positions.push(...points[index]);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();return geo;
}
function geometry(){
  if(shapes)return shapes;
  const jet=new THREE.ConeGeometry(1,1,4);jet.rotateX(Math.PI/2);jet.translate(0,0,.5);
  shapes={box:new THREE.BoxGeometry(1,1,1),chip:new THREE.TetrahedronGeometry(1),core:new THREE.IcosahedronGeometry(1,0),jet,blade:bladeSegment(.76,.13),edge:bladeSegment(.972,.045)};
  return shapes;
}
function budget(game){
  const name=game.quality?.name||'desktop',quiet=!!game.reducedMotion;
  const tier=name==='low'?'low':['medium','phone','tablet'].includes(name)?'medium':'high';
  const result=tier==='low'?{tier,limit:12,impact:5,segments:16,crystals:12,sparks:8}:tier==='medium'?{tier,limit:18,impact:9,segments:24,crystals:20,sparks:14}:{tier,limit:28,impact:14,segments:32,crystals:30,sparks:22};
  if(quiet){result.impact=Math.ceil(result.impact*.55);result.crystals=Math.ceil(result.crystals*.55);result.sparks=Math.ceil(result.sparks*.5);}
  return {...result,quiet,motion:quiet?.42:1};
}
function instances(root,name,shape,count,tint,opacity=.85,additive=true){
  const material=new THREE.MeshBasicMaterial({color:tint,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending});
  material.userData.baseOpacity=opacity;
  const mesh=new THREE.InstancedMesh(shape,material,count);mesh.name=name;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(mesh);return mesh;
}
function write(mesh,i,x,y,z,sx,sy,sz,ry=0,rx=0,rz=0){
  pose.position.set(x,y,z);pose.scale.set(sx,sy,sz);pose.rotation.set(rx,ry,rz);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
}
function line(mesh,i,a,b,width,height=width){
  direction.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const length=direction.length();
  pose.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);pose.scale.set(width,height,length);
  if(length>.0001)orientation.setFromUnitVectors(axis,direction.normalize());else orientation.identity();
  pose.quaternion.copy(orientation);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
}
function tintInstances(mesh,colors){for(let i=0;i<mesh.count;i++)mesh.setColorAt(i,color.set(colors[i%colors.length]));}
function flush(...meshes){for(const mesh of meshes)if(mesh)mesh.instanceMatrix.needsUpdate=true;}
function fade(mesh,amount){if(mesh){mesh.material.opacity=mesh.material.userData.baseOpacity*clamp(amount);mesh.visible=amount>.001;}}
function begin(game,name,mode,life,x,y,z,b=budget(game)){
  const active=game.effects.filter(effect=>effect.classCombatFx);
  for(const old of active.slice(0,Math.max(0,active.length-b.limit+1))){game.fxGroup.remove(old.mesh);disposeClassCombatFx(old.mesh);game.effects.splice(game.effects.indexOf(old),1);}
  const root=new THREE.Group();root.name=name;root.position.set(x,y,z);
  const duration=life*(b.quiet?.72:1);root.userData.classCombatFx={mode,life:duration,...b};
  game.fxGroup.add(root);game.effects.push({mesh:root,life:duration,maxLife:duration,classCombatFx:true});return root;
}
function clearReach(game,origin,a,radius){
  const dx=Math.sin(a),dz=Math.cos(a);let reach=radius;
  // Exact slabs avoid a stepped ray skipping a column's corner at diagonal aim.
  for(const object of game.room?.objects||[]){
    if(object.destroyed||!object.shotBlock)continue;
    let enter=0,leave=reach;
    for(const [position,velocity,center,half] of [[origin.x,dx,object.x,object.hw+.06],[origin.z,dz,object.z,object.hh+.06]]){
      if(Math.abs(velocity)<1e-8){if(Math.abs(position-center)>half){leave=-1;break;}}
      else{const t0=(center-half-position)/velocity,t1=(center+half-position)/velocity;enter=Math.max(enter,Math.min(t0,t1));leave=Math.min(leave,Math.max(t0,t1));}
    }
    if(leave>=enter&&leave>=0)reach=Math.min(reach,Math.max(0,enter-.08));
  }
  if(game.room?.outline)for(let t=.08;t<=reach+.08;t+=.08)if(!containsRoom(game.room,origin.x+dx*Math.min(t,reach),origin.z+dz*Math.min(t,reach),.05,false)){reach=Math.max(0,t-.16);break;}
  return Math.max(0,reach-.06);
}
function elementColor(context){
  const id=context.weaponId||'',kind=context.kind||'';
  return /frost|ice|bloodfrost/.test(id)||kind==='frost'?0x98eaff:/ember|fire|sun/.test(id)||kind==='fire'||kind==='rocket'?0xffaa74:/storm|lightning/.test(id)||kind==='arc'||kind==='laser'?0xc3c2ff:0xe8b8ff;
}
function fracture(game,root,aim,radius,count){
  const geo=geometry(),dark=instances(root,'warrior-fracture-charred-core',geo.box,count,0x200a0c,.85,false),edge=instances(root,'warrior-fracture-red-seams',geo.box,count,0xdf2937,.74);
  const origin={x:root.position.x,z:root.position.z},lines=[];
  for(let i=0;i<count;i++){
    const branch=i%3!==0,a=aim+(branch?(i%2?1:-1)*(.34+(i%5)*.18):.08*Math.sin(i*2.7)),base=branch?radius*(.2+(i%4)*.14):0;
    const length=clearReach(game,origin,a,radius*(branch?.70:1)),r0=Math.min(base,length*.55),r1=Math.min(length,r0+radius*(branch?.30:.88));
    const bend=.09*Math.sin(i*5.17),start=[Math.sin(a)*r0,.045,Math.cos(a)*r0],end=[Math.sin(a+bend)*r1,.045,Math.cos(a+bend)*r1];
    lines.push({start,end,width:branch?.065:.12});line(dark,i,start,end,branch?.12:.20,.025);line(edge,i,start,end,branch?.028:.045,.016);
  }
  root.userData.classCombatFx.fracture={dark,edge,lines};flush(dark,edge);
}

export const ClassCombatFX={
  physicalMuzzle(muzzle,aim,weapon){
    const b=budget(this),geo=geometry(),root=begin(this,`${weapon.id}-physical-muzzle`,'muzzle',.24,muzzle.x,muzzle.y,muzzle.z,b);root.rotation.y=aim;
    const tech=weapon.kind==='laser'||weapon.kind==='rail',jet=instances(root,'ballistic-white-core-and-gold-jet',geo.jet,tech?2:4,0xffffff,.94);
    tintInstances(jet,[0xffefbc,0xe6a450,0xffe4a1,0xffffff]);
    const debris=instances(root,'ballistic-brass-casing-and-metal-sparks',geo.box,tech?2:b.quiet?3:5,0xffffff,.88);
    tintInstances(debris,[0xb58a45,0xffe4aa,0xa2bac4,0xf8eed1,0xcaa75a]);
    Object.assign(root.userData.classCombatFx,{jet,debris,tech,rocket:weapon.kind==='rocket',muzzle:muzzle.toArray(),weaponId:weapon.id});updateClassCombatFx(root,0);return root;
  },
  physicalBeamVisual(start,end,tint,life=.14,width=.07){
    if(start.distanceTo(end)<.01)return null;
    const root=begin(this,'physical-gun-tech-beam','beam',life,start.x,start.y,start.z),geo=geometry();
    const beam=instances(root,'gun-beam-white-core-gold-rails',geo.box,3,0xffffff,.92);tintInstances(beam,[0xfff6dd,0xd5a55b,0xd5a55b]);
    const delta=end.clone().sub(start),length=delta.length(),normal=new THREE.Vector3(-delta.z,0,delta.x).normalize();
    for(let i=0;i<3;i++){const offset=i===0?0:(i===1?-1:1)*width*1.8,a=normal.clone().multiplyScalar(offset),z=delta.clone().add(a);line(beam,i,a.toArray(),z.toArray(),i===0?width*.85:width*.27);}
    const sleeve=instances(root,'gun-beam-muzzle-sleeves',geo.box,2,0xe1bb76,.70);
    for(let i=0;i<2;i++){const offset=normal.clone().multiplyScalar((i?1:-1)*width*2.7),tip=delta.clone().normalize().multiplyScalar(Math.min(.45,length)).add(offset);line(sleeve,i,offset.toArray(),tip.toArray(),width*.44);}
    root.userData.start=start.clone();root.userData.end=end.clone();
    Object.assign(root.userData.classCombatFx,{beam,sleeve,start:start.toArray(),end:end.toArray(),requestedColor:tint,centerlineLength:length});flush(beam,sleeve);updateClassCombatFx(root,0);return root;
  },
  weaponHitVisual(enemy,context={}){
    const b=budget(this),magic=context.damageType==='magic',warrior=context.damageType==='physical'&&context.classId==='warrior',neutral=context.damageType==='neutral',geo=geometry();
    const root=begin(this,magic?'arcane-violet-hit':warrior?'warrior-bloodsteel-hit':neutral?'neutral-energy-hit':'ballistic-metal-impact','impact',magic?.46:.30,enemy.x,enemy.type==='boss'?2.0:1.05,enemy.z,b);
    const count=Math.ceil(b.impact*(context.crit?1.25:1)),chips=instances(root,magic?'arcane-shattered-crystals':warrior?'dark-red-cleave-chips':'physical-impact-metal-sparks',magic?geo.chip:geo.box,count,0xffffff,.9);
    tintInstances(chips,magic?[0xaf67f0,0xdbacff,0x7d37ba,elementColor(context)]:warrior?[0x8e1223,0xf14343,0x441018,0xff8b77]:neutral?[0xb8deef,0xe5f8ff]:[0xf9e6b6,0xc4d6db,0xd8a468,0xfff4d9]);
    const accents=instances(root,magic?'arcane-broken-rune-facets':warrior?'warrior-crossing-cut-edges':'impact-short-splinters',geo.box,magic?6:warrior?3:3,magic?0xc492ff:warrior?0xc62037:0xe6d0a7,magic?.72:.80);
    const core=magic?instances(root,'arcane-faceted-impact-core',geo.core,2,0xffffff,.64):null;if(core)tintInstances(core,[0xa976ef,0xf4d6ff]);
    Object.assign(root.userData.classCombatFx,{chips,accents,core,magic,warrior,neutral,context:{...context},aim:Math.atan2(enemy.x-this.player.x,enemy.z-this.player.z),crit:!!context.crit});updateClassCombatFx(root,0);return root;
  },
  warriorSlashVisual(aim,radius,arc,heavy=false,style='slash'){
    const b=budget(this),geo=geometry(),p=this.player,thrust=style==='thrust',quake=style==='quake';
    const root=begin(this,thrust?'warrior-dark-red-thrust':quake?'warrior-dark-red-groundbreak':heavy?'warrior-heavy-blood-cleave':'warrior-dark-red-blade-trail','slash',heavy||quake?.54:.34,p.x,0,p.z,b);
    const span=thrust?Math.min(.20,arc):arc,segments=b.segments,reach=[];
    for(let i=0;i<segments;i++){const a=aim-span+(i+.5)/segments*span*2;reach.push(Math.min(clearReach(this,p,a,radius),clearReach(this,p,a-span/segments,radius),clearReach(this,p,a+span/segments,radius)));}
    const body=instances(root,'cleave-dimensional-blood-shell',geo.blade,segments,0x9a1829,.84,false),ink=instances(root,'cleave-near-black-core',geo.blade,segments,0x24090f,.90,false),edge=instances(root,'cleave-hot-red-cutting-edge',geo.edge,segments,0xf34b4e,.88);
    const motes=instances(root,'cleave-torn-red-steel-fragments',geo.chip,b.sparks,0xffffff,.83);tintInstances(motes,[0xa11825,0xf2504b,0x4b1019,0xff997f]);
    Object.assign(root.userData.classCombatFx,{body,ink,edge,motes,aim,radius,arc:span,reach,heavy,thrust,quake,segments,clippedReach:[...reach]});
    if(heavy||quake||thrust)fracture(this,root,aim,radius,Math.ceil(b.sparks*.65));updateClassCombatFx(root,0);return root;
  },
  classSkillVisual(kind,options={}){
    const p=this.player,aim=options.aim??Math.atan2((this.aimPoint?.x??p.x)-p.x,(this.aimPoint?.z??p.z+1)-p.z),b=budget(this),geo=geometry();
    if(kind==='cleave')return this.warriorSlashVisual(aim,options.radius??4.6,options.arc??1.05,true,'quake');
    if(kind==='dash')return this.warriorSlashVisual(aim,options.radius??3.4,.18,true,'thrust');
    const target=options.target||options.to||p,x=options.x??target.x,z=options.z??target.z;
    const root=begin(this,kind==='arcane-burst'?'mage-violet-fireball-shatter':kind==='aftershock'?'warrior-dark-red-aftershock':kind==='frostfield'?'mage-glacial-crystal-eruption':kind==='teleport'?'mage-violet-rift-transit':kind==='guard'?'warrior-bloodsteel-guard':kind==='mark'?'shooter-precision-target-lock':'shooter-overpressure-release','skill',options.life??(kind==='frostfield'?1.05:kind==='teleport'?.64:.72),x,.08,z,b);
    const magic=['frostfield','teleport','arcane-burst'].includes(kind),guard=kind==='guard',mark=kind==='mark',aftershock=kind==='aftershock';
    const pieces=instances(root,magic?'skill-rising-arcane-crystals':aftershock?'aftershock-rising-bloodsteel-fragments':guard?'guard-dimensional-dark-red-plates':mark?'precision-lock-brackets':'overdrive-mechanical-gold-plates',magic||aftershock?geo.chip:geo.box,magic?b.crystals:aftershock?b.sparks:8,0xffffff,magic?.72:.78,!guard);
    tintInstances(pieces,magic?(kind==='arcane-burst'?[0x8b39d2,0xe2b5ff,0xaf66ee,0xffb888]:[0x94eaff,0xbaa0ff,0x7341b3,0xe1f9ff]):guard||aftershock?[0x5e0c1e,0x9c1930,0xe13c49,0x381017]:[0xf0c885,0xdca55f,0xffedc2,0x8b9c9f]);
    const rays=instances(root,magic?'skill-arcane-orbit-strokes':aftershock?'aftershock-hot-red-fracture-rays':guard?'guard-red-metal-ribs':mark?'precision-lock-reticle-strokes':'overdrive-hot-exhaust-streaks',geo.box,b.sparks,magic?0xbb8aee:guard||aftershock?0xda2c43:0xffd392,.70);
    const core=magic?instances(root,'skill-arcane-crystal-heart',geo.core,2,0xffffff,.60):null;if(core)tintInstances(core,[0x994fe1,0xe9c7ff]);
    const radius=options.radius??(magic?6:guard?1.6:mark?1.15:2.2),origin={x,z},reach=[];
    for(let i=0;i<pieces.count;i++){const a=i/pieces.count*TAU;reach.push(clearReach(this,origin,a,radius));}
    Object.assign(root.userData.classCombatFx,{kind,pieces,rays,core,radius,reach,aim,magic,guard,mark,aftershock,from:options.from?{x:options.from.x-x,z:options.from.z-z}:null});
    if(aftershock)fracture(this,root,aim,radius,Math.ceil(b.sparks*.72));updateClassCombatFx(root,0);return root;
  },
};

export function updateClassCombatFx(root,age){
  const e=root.userData.classCombatFx;if(!e||e.disposed)return;const t=Math.max(0,age),progress=clamp(t/e.life),out=1-progress;
  if(e.mode==='beam'){fade(e.beam,out**.75);fade(e.sleeve,out);return;}
  if(e.mode==='muzzle'){
    const flash=1-clamp(t/(e.quiet?.07:.11));fade(e.jet,flash);fade(e.debris,out);
    for(let i=0;i<e.jet.count;i++){const l=(e.tech?.28:e.rocket?1.35:.78)*(i===0?1:.6),width=(e.tech?.04:e.rocket?.19:.12)*(i===0?.65:1);write(e.jet,i,(i-1)*.034,i%2*.024,0,width*flash,width*flash,l*(.7+ease(t/.035)*.3));}
    for(let i=0;i<e.debris.count;i++){
      if(i===0&&!e.tech&&!e.rocket){const travel=t*2.8*e.motion;write(e.debris,i,.15+travel,.05+t*1.5*e.motion-3.8*t*t,-.22-t*.65,.045,.045,.15,.4+t*12,t*8,t*5);}
      else{const a=i*2.1,travel=t*(2.3+i*.32)*e.motion,s=.025*out;write(e.debris,i,Math.sin(a)*travel,.04+Math.cos(a)*travel*.35,.05+travel,s,s,.12*out,a,t*3);}
    }flush(e.jet,e.debris);return;
  }
  if(e.mode==='impact'){
    fade(e.chips,out**.75);fade(e.accents,out);fade(e.core,out*1.1);
    const travel=ease(t/.25)*(e.crit?1.55:1)*e.motion;
    for(let i=0;i<e.chips.count;i++){
      const a=e.aim+i/e.chips.count*TAU,spread=(.18+(i%4)*.16)*travel,size=(e.magic?.065:.025)*(e.crit?1.25:1)*out;
      write(e.chips,i,Math.sin(a)*spread,(e.magic?.04:.01)+Math.sin(i*3.7)*spread*.55-t*t*1.4,Math.cos(a)*spread,size,e.magic?size*(2+i%3):size*.8,e.magic?size:Math.max(.02,.24*out),a+t*(i%2?4:-4),t*5);
    }
    for(let i=0;i<e.accents.count;i++){
      const a=(e.magic?i/6*TAU:i*1.03)+t*(e.magic?1.7:0),r=e.magic?.22+travel*.40:0;
      write(e.accents,i,Math.sin(a)*r,Math.cos(a)*r,0,e.magic?.022:.035,e.magic?.20*out:e.warrior?.72*out:.24*out,.022,a,0,a+(e.warrior?.6:0));
    }
    if(e.core)for(let i=0;i<2;i++){const size=(i?.12:.25)*(1+ease(t/.07)*.45)*out;write(e.core,i,0,0,0,size,size*1.2,size,t*(i?4:-3));}
    flush(e.chips,e.accents,e.core);return;
  }
  if(e.mode==='slash'){
    const sweep=clamp(t/(e.quiet?.07:e.heavy?.15:.11)),tail=1-clamp((t-.10)/(e.life-.10)),depth=e.heavy?1.45:1;
    fade(e.body,tail);fade(e.ink,tail);fade(e.edge,tail);fade(e.motes,out);
    for(let i=0;i<e.segments;i++){
      const a=e.aim-e.arc+(i+.5)/e.segments*e.arc*2,phase=i/e.segments,visible=phase<=sweep+.14,r=e.reach[i]*Math.cos(e.arc/e.segments),taper=.50+.5*Math.sin(phase*Math.PI),scale=visible?1:0;
      const sx=r*Math.tan(e.arc/e.segments)/.08,sy=depth*taper,y=e.quake?.34:.85+Math.sin(phase*Math.PI)*.19;
      write(e.body,i,0,y,0,sx*scale,sy,r,a);write(e.ink,i,0,y+.005,0,sx*.91*scale,sy*.55,r*.978,a);write(e.edge,i,0,y+.02,0,sx*scale,sy*.65,r*1.001,a);
    }
    for(let i=0;i<e.motes.count;i++){
      const phase=i/e.motes.count,a=e.aim-e.arc+phase*e.arc*2,r=e.reach[Math.min(e.segments-1,Math.floor(phase*e.segments))],distance=r*(.72+ease(t/.24)*.20),size=.045*out*(e.heavy?1.4:1),delay=phase*.08;
      write(e.motes,i,Math.sin(a)*distance,(e.quake?.2:.8)+Math.max(0,t-delay)*(1.9+(i%3)*.5)*e.motion-2*t*t,Math.cos(a)*distance,size,size*(1.5+i%2),size,a+t*6,t*4);
    }
    if(e.fracture){fade(e.fracture.dark,1-clamp((t-.2)/(e.life-.2)));fade(e.fracture.edge,out);}
    flush(e.body,e.ink,e.edge,e.motes);return;
  }
  if(e.mode==='skill'){
    const grow=ease(t/.17),fadeOut=1-clamp((t-e.life*.3)/(e.life*.7));fade(e.pieces,fadeOut);fade(e.rays,fadeOut);fade(e.core,fadeOut);
    for(let i=0;i<e.pieces.count;i++){
      const a=i/e.pieces.count*TAU+(e.kind==='teleport'?t*1.5*e.motion:0),reach=e.reach[i],spread=e.magic?reach*(.32+(i%4)*.14)*(e.kind==='teleport'?.3:e.kind==='arcane-burst'?.5+grow*.7:1):e.aftershock?reach*(.35+grow*.48):e.guard?1.1:e.mark?.92:1.1+grow*.55;
      if(e.mark){const side=i%4,corner=Math.floor(i/4),x=(side<2?-1:1)*.65,z=(side%2?-1:1)*.65;write(e.pieces,i,x,.95,z,.035,.08,.42,grow*.15+(corner?Math.PI/2:0));}
      else if(e.magic||e.aftershock){const offset=e.from&&i%2?e.from:{x:0,z:0},height=(e.kind==='teleport'?2.3:e.kind==='arcane-burst'?.42+(i%4)*.18:e.aftershock?.35+(i%3)*.2:1.2+(i%4)*.38)*grow;write(e.pieces,i,offset.x+Math.sin(a)*spread,.12+height*.35,offset.z+Math.cos(a)*spread,(.10+(i%3)*.04)*fadeOut,height*(e.kind==='teleport'?.7:1),(.10+(i%2)*.055)*fadeOut,a,-.22*Math.cos(a),.22*Math.sin(a));}
      else{write(e.pieces,i,Math.sin(a)*spread,.90+Math.sin(i*2.3)*.15,Math.cos(a)*spread,e.guard?.35:.055,e.guard?.8:.46,e.guard?.08:.10,a+(e.guard?0:.3),-.14,.10*Math.sin(i));}
    }
    for(let i=0;i<e.rays.count;i++){
      const a=i/e.rays.count*TAU+(e.magic?t*.75*e.motion:0),r=e.magic?(e.kind==='teleport'?.8:e.radius*.20)*(1+grow*.2):e.aftershock?e.radius*(.3+grow*.5):e.guard?1.25:.8+grow*1.3;
      const lift=e.magic?.22+Math.sin(i*2.1)*.15:e.guard?1.5:1.05+(i%3)*.16;
      write(e.rays,i,Math.sin(a)*r,e.aftershock?.14:lift,Math.cos(a)*r,e.magic?.027:.045,e.guard?.45:.035,e.magic?.38:e.aftershock?.7:e.guard?.10:.6*(1-progress*.5),a+.55*(e.magic?1:0),e.magic?.25:0);
    }
    if(e.core)for(let i=0;i<2;i++){const size=(i?.3:.54)*grow*fadeOut;write(e.core,i,0,.8+i*.28,0,size,size*(e.kind==='teleport'?2:1),size,t*(i?2:-2)*e.motion);}
    if(e.fracture){fade(e.fracture.dark,fadeOut);fade(e.fracture.edge,out);}flush(e.pieces,e.rays,e.core);
  }
}

export function disposeClassCombatFx(root){
  const e=root.userData.classCombatFx;if(!e||e.disposed)return;e.disposed=true;
  root.traverse(mesh=>{if(mesh.isInstancedMesh){mesh.dispose();mesh.material.dispose();}});
}
