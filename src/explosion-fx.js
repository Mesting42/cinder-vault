import * as THREE from 'three';

// Shared facets, five instanced draws per burst, no bitmap or per-particle lights.
let shapes;
const pose=new THREE.Object3D(),tint=new THREE.Color(),hot=new THREE.Color(0xffe4ad),orange=new THREE.Color(0xff9d37),red=new THREE.Color(0xc43f20);
const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>1-(1-clamp(v))**3;
const random=(min,max)=>min+Math.random()*(max-min);
function geometry(){
  if(shapes)return shapes;
  const cloud=new THREE.IcosahedronGeometry(1,1),p=cloud.attributes.position,colors=[];
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),rough=1+.08*Math.sin(x*8+y*5)+.06*Math.cos(z*9-y*4);
    p.setXYZ(i,x*rough,y*rough,z*rough);
  }
  cloud.computeVertexNormals();
  for(let i=0;i<p.count;i+=3){
    const brightness=.78+.22*(.5+.5*Math.sin(i*1.37));
    for(let j=0;j<3;j++)colors.push(brightness,brightness*.99,brightness*.96);
  }
  cloud.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  shapes={cloud,spark:new THREE.BoxGeometry(1,1,1),shard:new THREE.TetrahedronGeometry(1)};
  return shapes;
}
function instances(root,name,geo,material,count){
  const mesh=new THREE.InstancedMesh(geo,material,count);mesh.name=name;
  mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(mesh);return mesh;
}
function write(mesh,i,x,y,z,sx,sy,sz,rotation=0){
  pose.position.set(x,y,z);pose.scale.set(sx,sy,sz);pose.rotation.set(rotation*.7,rotation,rotation*.4);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
}
function seeds(count){
  return Array.from({length:count},(_,i)=>{const a=i/count*Math.PI*2+random(-.3,.3);return{dx:Math.cos(a),dz:Math.sin(a),size:random(.75,1.15),delay:random(0,.06),spin:random(-3,3),speed:random(.7,1.25)};});
}
function budget(game){
  const name=game.quality?.name||'desktop';
  return name==='low'?{tier:'low',fire:6,smoke:4,spark:7,shard:3,dust:3,limit:3}:
    ['phone','tablet','medium'].includes(name)?{tier:'medium',fire:10,smoke:6,spark:12,shard:5,dust:5,limit:4}:
    {tier:'high',fire:14,smoke:9,spark:18,shard:8,dust:7,limit:6};
}
export function spawnExplosion(game,x,z,radius){
  const b=budget(game),quiet=game.reducedMotion;
  if(quiet){b.spark=Math.ceil(b.spark*.5);b.shard=Math.ceil(b.shard*.5);}
  // Chains can replace the oldest visual without skipping any gameplay damage.
  const active=game.effects.filter(e=>e.explosion);
  for(const old of active.slice(0,Math.max(0,active.length-b.limit+1))){
    game.fxGroup.remove(old.mesh);disposeExplosion(old.mesh);game.effects.splice(game.effects.indexOf(old),1);
  }
  const root=new THREE.Group();root.name='volumetric-explosion';root.position.set(x,.06,z);
  const geo=geometry();
  const fire=instances(root,'fireball-lobes',geo.cloud,new THREE.MeshBasicMaterial({color:0xffffff,vertexColors:true,transparent:true,depthWrite:false}),b.fire);
  const smoke=instances(root,'rising-smoke',geo.cloud,new THREE.MeshStandardMaterial({color:0x696354,roughness:1,metalness:0,flatShading:true,transparent:true,opacity:0,depthWrite:false}),b.smoke);
  const spark=instances(root,'flying-embers',geo.spark,new THREE.MeshBasicMaterial({color:0xffc36e,transparent:true,depthWrite:false}),b.spark);
  const shard=instances(root,'ballistic-debris',geo.shard,new THREE.MeshStandardMaterial({color:0x716451,roughness:1,metalness:0,flatShading:true,transparent:true,depthWrite:false}),b.shard);
  const dust=instances(root,'ground-dust',geo.cloud,new THREE.MeshStandardMaterial({color:0x9b8d6b,roughness:1,metalness:0,flatShading:true,transparent:true,opacity:0,depthWrite:false}),b.dust);
  const life=quiet?1.2:1.65;
  root.userData.explosion={radius:Math.max(1,Math.min(radius,5.5)),life,tier:b.tier,quiet,fire,smoke,spark,shard,dust,seeds:{fire:seeds(b.fire),smoke:seeds(b.smoke),spark:seeds(b.spark),shard:seeds(b.shard),dust:seeds(b.dust)}};
  game.fxGroup.add(root);game.effects.push({mesh:root,life,maxLife:life,explosion:true});updateExplosion(root,0);return root;
}
export function updateExplosion(root,age){
  const e=root.userData.explosion;if(!e||e.disposed)return;
  const {radius:r,fire,smoke,spark,shard,dust,quiet}=e,motion=quiet?.7:1;
  fire.visible=age<.64;fire.material.opacity=1-clamp((age-.36)/.28);
  for(let i=0;i<fire.count;i++){
    const s=e.seeds.fire[i],t=Math.max(0,age-s.delay),p=ease(t/.22),fade=1-clamp((t-.22)/.40),center=i>=fire.count-2;
    const size=r*(center?.27:.23)*s.size*(.18+p*.92)*fade;
    const spread=center?.08:r*(.13+p*.25);
    write(fire,i,s.dx*spread,.35+p*r*.17+t*r*.34*motion,s.dz*spread,size,size*(1+t*.9),size*.9,s.spin*.2+t*s.spin*.4);
    const heat=clamp(t/.42+(center?-.20:i/fire.count*.12));
    tint.copy(heat<.45?hot:orange).lerp(heat<.45?orange:red,heat<.45?heat/.45:(heat-.45)/.55);fire.setColorAt(i,tint);
  }
  fire.instanceMatrix.needsUpdate=true;fire.instanceColor.needsUpdate=true;

  const smokeAge=Math.max(0,age-.10),smokeFade=clamp(smokeAge/.25)*(1-clamp((age-.65)/(e.life-.65)));
  smoke.visible=age>.10;smoke.material.opacity=smokeFade*(e.tier==='high'?.46:.36);
  for(let i=0;i<smoke.count;i++){
    const s=e.seeds.smoke[i],rise=smokeAge*s.speed*motion,spread=r*(.18+ease(smokeAge/.7)*.22),size=r*(.17+ease(smokeAge/.8)*.15)*s.size;
    write(smoke,i,s.dx*spread,.5+rise*(1.3+r*.18)+(i%3)*r*.10,s.dz*spread,size,size*(1.05+rise*.12),size,s.spin*.15+rise*.17);
  }
  smoke.instanceMatrix.needsUpdate=true;

  const airborne=(mesh,list,speed,lift,gravity,base)=>{
    mesh.material.opacity=1-clamp((age-.25)/.65);mesh.visible=age<.9;
    for(let i=0;i<mesh.count;i++){
      const s=list[i],t=Math.max(0,age-s.delay),v=r*speed*s.speed*motion,travel=v*(1-Math.exp(-t*2.8))/2.8;
      const y=.5+t*(lift*s.speed*motion)-.5*gravity*t*t;
      const size=y<=.12?0:base*s.size*(1-clamp((t-.30)/.60));
      write(mesh,i,s.dx*travel,Math.max(.10,y),s.dz*travel,size,size*(mesh===spark?2.7:1),size,s.spin+t*s.spin*4);
    }
    mesh.instanceMatrix.needsUpdate=true;
  };
  airborne(spark,e.seeds.spark,3.2,4.6,9.8,.045+r*.008);
  airborne(shard,e.seeds.shard,2.3,3.9,12,.07+r*.02);

  dust.visible=age<.62;dust.material.opacity=.22*clamp(age/.06)*(1-clamp(age/.62));
  for(let i=0;i<dust.count;i++){
    const s=e.seeds.dust[i],spread=r*(.18+ease(age/.48)*.67),size=r*(.11+ease(age/.3)*.08)*s.size;
    write(dust,i,s.dx*spread,.12,s.dz*spread,size,size*.23,size*1.15,s.spin);
  }
  dust.instanceMatrix.needsUpdate=true;
}
export function disposeExplosion(root){
  const e=root.userData.explosion;if(!e||e.disposed)return;e.disposed=true;
  // Instancing owns GPU buffers; cached shape geometry belongs to the module.
  root.traverse(mesh=>{if(mesh.isInstancedMesh){mesh.dispose();mesh.material.dispose();}});
}
