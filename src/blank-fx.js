import * as THREE from 'three';

let shapes;
const pose=new THREE.Object3D(),clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>1-(1-clamp(v))**2;
function geometry(){
  if(shapes)return shapes;
  const blade=new THREE.BufferGeometry();
  blade.setAttribute('position',new THREE.Float32BufferAttribute([
    -.025,0,.78, .035,.02,.88, .015,.70,1.06,
    .035,.02,.88, .040,.17,1.02, .015,.70,1.06,
    .040,.17,1.02, -.032,.16,.97, .015,.70,1.06,
    -.032,.16,.97, -.025,0,.78, .015,.70,1.06,
  ],3));blade.computeVertexNormals();
  shapes={blade,core:new THREE.IcosahedronGeometry(1,0),chip:new THREE.TetrahedronGeometry(1),ray:new THREE.BoxGeometry(1,1,1)};return shapes;
}
function instanced(root,name,geo,count,color,opacity){
  const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide});
  const mesh=new THREE.InstancedMesh(geo,material,count);mesh.name=name;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(mesh);return mesh;
}
function write(mesh,i,x,y,z,sx,sy,sz,angle=0,tilt=0){
  pose.position.set(x,y,z);pose.scale.set(sx,sy,sz);pose.rotation.set(tilt,angle,tilt*.6);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
}
export function spawnBlank(game,x,z,bullets){
  const tier=game.quality?.name==='low'?'low':['phone','tablet','medium'].includes(game.quality?.name)?'medium':'high';
  const density=tier==='low'?{wave:12,rays:12,samples:16}:tier==='medium'?{wave:18,rays:20,samples:32}:{wave:24,rays:28,samples:48};
  const quiet=game.reducedMotion;if(quiet){density.wave=Math.ceil(density.wave*.65);density.rays=Math.ceil(density.rays*.5);density.samples=Math.ceil(density.samples*.5);}
  const old=game.effects.filter(e=>e.blankBurst);for(const effect of old.slice(0,Math.max(0,old.length-(tier==='low'?0:1)))){game.fxGroup.remove(effect.mesh);disposeBlank(effect.mesh);game.effects.splice(game.effects.indexOf(effect),1);}
  const samples=Array.from({length:Math.min(bullets.length,density.samples)},(_,i)=>bullets[Math.floor(i*bullets.length/Math.min(bullets.length,density.samples))]);
  const root=new THREE.Group();root.name='blank-energy-burst';root.position.set(x,.10,z);const geo=geometry();
  const core=instanced(root,'blank-volume-core',geo.core,3,0xd4f7ff,.65);
  const wave=instanced(root,'blank-lifted-wave',geo.blade,density.wave,0xffffff,.48);
  const rays=instanced(root,'blank-light-streaks',geo.ray,density.rays,0xd2f4ff,.70);
  const fragments=instanced(root,'enemy-bullet-fragments',geo.chip,samples.length*3,0xa1e7ff,.85);
  wave.material.blending=rays.material.blending=fragments.material.blending=THREE.AdditiveBlending;
  const color=new THREE.Color();for(let i=0;i<wave.count;i++)wave.setColorAt(i,color.set(i%3?0x7bcce8:0xdaf8ff));
  const extent=Math.max(12,...(game.room?.outline||[[15,12]]).map(([a,b])=>Math.hypot(a-x,b-z)))*1.08;
  const life=quiet?.65:.95;
  root.userData.blankBurst={tier,quiet,life,extent,core,wave,rays,fragments,cleared:bullets.length,samples:samples.map(b=>({x:b.x-x,y:b.height??.9,z:b.z-z,angle:Math.atan2(b.x-x,b.z-z)}))};
  game.fxGroup.add(root);game.effects.push({mesh:root,life,maxLife:life,blankBurst:true});updateBlank(root,0);return root;
}
export function updateBlank(root,age){
  const e=root.userData.blankBurst;if(!e||e.disposed)return;const {core,wave,rays,fragments,quiet}=e;
  const speed=quiet?.65:1,progress=ease(age/(quiet?.45:.62)),radius=.75+e.extent*progress;
  core.visible=age<.32;core.material.opacity=.65*(1-clamp(age/.32));
  for(let i=0;i<3;i++){const s=(.40+i*.32)*(1+ease(age/.10)*1.6)*(1-clamp(age/.34));write(core,i,0,.80+i*.12,0,s,s*(i===1?1.8:1),s,age*(i-1)*2);}
  core.instanceMatrix.needsUpdate=true;
  wave.visible=age<.68;wave.material.opacity=.48*(1-clamp((age-.12)/.56));
  for(let i=0;i<wave.count;i++){const a=i/wave.count*Math.PI*2,spread=radius*(.84+(i%5)*.035),height=(quiet?.7:1.3)*(.65+(i%3)*.3);write(wave,i,0,.12,0,spread,height,spread,a);}
  wave.instanceMatrix.needsUpdate=true;
  rays.visible=age<.70;rays.material.opacity=.70*(1-clamp(age/.70));
  for(let i=0;i<rays.count;i++){
    const a=i/rays.count*Math.PI*2+.17,travel=.8+progress*e.extent*(.44+(i%4)*.09),length=(.5+progress*1.9)*(1-clamp(age/.72));
    write(rays,i,Math.sin(a)*travel,.4+Math.sin(i*3.7)*.12,Math.cos(a)*travel,.035,.05,length,a);
  }
  rays.instanceMatrix.needsUpdate=true;
  fragments.visible=age<e.life;fragments.material.opacity=.85*(1-clamp(age/e.life));
  for(let i=0;i<fragments.count;i++){
    const sample=e.samples[Math.floor(i/3)],a=sample.angle+(i%3-1)*.8,t=age,travel=t*(1.8+(i%3)*.8)*speed,size=.11*(1-clamp(age/e.life));
    write(fragments,i,sample.x+Math.sin(a)*travel,sample.y+t*(1.5+(i%3)*.6)*speed-1.8*t*t,sample.z+Math.cos(a)*travel,size,size*1.8,size,a+t*(i%2?5:-5),t*4);
  }
  fragments.instanceMatrix.needsUpdate=true;
}
export function disposeBlank(root){
  const e=root.userData.blankBurst;if(!e||e.disposed)return;e.disposed=true;
  root.traverse(mesh=>{if(mesh.isInstancedMesh){mesh.dispose();mesh.material.dispose();}});
}
