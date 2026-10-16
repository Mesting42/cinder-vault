import * as THREE from 'three';
import {RNG,TAU,DIRECTIONS} from './data.js';
import {roomPoint} from './rooms.js';
import {group,box,cylinder,material,label,glow,glowTexture,roomGateway,objectModel,batchStatic} from './art.js';
const stone=0x8d8877,edge=0xbeb394,dark=0x252b31,bone=0xd1c5a5,iron=0x48474b,curse=0xa887d8;

function skull(parent,x,y,z,scale=1){
  const g=group(parent,x,y,z);g.scale.setScalar(scale);
  cylinder(g,.23,.28,.38,0,.08,0,bone,6);box(g,.39,.20,.18,0,-.06,-.16,bone);
  for(const side of [-1,1])box(g,.12,.10,.06,side*.11,.03,-.25,dark);
  const nose=box(g,.065,.08,.04,0,-.07,-.26,dark);nose.rotation.z=Math.PI/4;
  box(g,.28,.075,.10,0,-.19,-.17,bone);for(let i=0;i<4;i++)box(g,.025,.07,.03,-.10+i*.067,-.18,-.24,dark);return g;
}
function bones(parent,x,y,z,rotation=0){
  const g=group(parent,x,y,z);g.rotation.z=rotation;
  cylinder(g,.06,.07,.74,0,0,0,bone,5);for(const side of [-1,1])for(const dx of [-.04,.04])cylinder(g,.087,.087,.10,dx,side*.38,0,bone,5);return g;
}
function tombTexture(seed){
  const rng=new RNG(seed^0x51a9),c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#242c30';x.fillRect(0,0,128,128);
  for(let row=0;row<4;row++)for(let col=-1;col<4;col++){
    const px=col*44+(row%2)*22,py=row*32,n=rng.int(-6,6);x.fillStyle=`rgb(${96+n},${95+n},${84+n})`;x.fillRect(px+2,py+2,40,28);x.fillStyle='#a19b80';x.fillRect(px+3,py+3,38,1);x.fillStyle='#39443c';x.fillRect(px+2,py+27,40,2);
    for(let i=0;i<12;i++){x.fillStyle=i%2?'#bfb59e18':'#07171525';x.fillRect(px+rng.int(4,37),py+rng.int(4,27),rng.int(1,4),1);}
    if(rng.next()<.55){x.strokeStyle='#242d2e';x.beginPath();x.moveTo(px+5,py+1);x.lineTo(px+16,py+10);x.lineTo(px+13,py+17);x.lineTo(px+22,py+29);x.stroke();}
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=t.minFilter=THREE.NearestFilter;t.colorSpace=THREE.SRGBColorSpace;return t;
}
function coffinModel(){
  const g=group(),p=[[-.40,-1.38],[.40,-1.38],[.70,-.82],[.62,.86],[.35,1.35],[-.35,1.35],[-.62,.86],[-.70,-.82]],shape=new THREE.Shape();p.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const body=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.75,bevelEnabled:false}),material(stone));body.rotation.x=-Math.PI/2;body.position.y=.11;body.castShadow=body.receiveShadow=true;g.add(body);
  const lid=group(g,.62,.87,0),cap=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.14,bevelEnabled:false}),material(edge));cap.rotation.x=-Math.PI/2;cap.position.set(-.62,0,0);cap.castShadow=cap.receiveShadow=true;lid.add(cap);
  for(const z of[-1.07,.85])box(lid,.78,.05,.08,-.62,.17,z,iron);box(lid,.16,.07,1.65,-.62,.18,-.08,iron);box(lid,.74,.08,.12,-.62,.19,-.50,iron);skull(lid,-.62,.27,-.82,.78).rotation.x=-Math.PI/2;
  for(const side of [-1,1])for(const z of[-.75,.65]){box(g,.08,.18,.23,side*.68,.48,z,iron);box(g,.09,.06,.16,side*.73,.41,z,bone);}
  lid.userData.animated=true;batchStatic(lid);g.userData.lid=lid;batchStatic(g);return g;
}
function gravePillar(parent,x,z){
  const g=group(parent,x,0,z);box(g,1.3,.18,1.3,0,.09,0,edge);box(g,.93,2.5,.91,0,1.41,0,stone);
  for(const side of[-1,1]){box(g,.14,2.3,1.02,side*.43,1.37,0,edge);box(g,1.02,2.3,.14,0,1.37,side*.43,edge);}
  box(g,1.28,.19,1.18,0,2.70,0,edge);skull(g,0,2.41,-.54,1.12);box(g,.13,.55,.14,0,3.03,0,iron);box(g,.60,.11,.15,0,3.10,0,iron);return g;
}
function candle(parent,x,z){
  const g=group(parent,x,0,z);box(g,.42,.13,.45,0,.11,0,iron);
  const fire=group(g,0,1.0,0);for(let i=0;i<3;i++){const dx=(i-1)*.19,y=i===1?.94:.67;box(g,.10,y,.10,dx,y/2+.18,0,bone);cylinder(fire,0,.075,.24,dx,y-.78,0,0x9bdabb,5,2.3);}
  fire.userData.animated=true;const light=new THREE.PointLight(0xa2d9b5,20,9,2);light.position.set(0,1.6,0);g.add(light);g.userData={fire,light};return g;
}
function curseModel(){
  const g=group();cylinder(g,1.04,1.07,.08,0,.05,0,dark,8);for(let i=0;i<8;i++){const p=group(g);p.rotation.y=i*TAU/8;box(p,.20,.025,.11,0,.103,.81,bone);}
  const rune=group(g,0,.11,0),mat=new THREE.MeshBasicMaterial({color:curse,transparent:true,opacity:.25,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
  const circle=new THREE.Mesh(new THREE.RingGeometry(.66,.71,8),mat);circle.rotation.x=-Math.PI/2;rune.add(circle);
  for(let i=0;i<3;i++){const mark=new THREE.Mesh(new THREE.PlaneGeometry(1.07,.045),mat);mark.rotation.set(-Math.PI/2,0,i*TAU/3);rune.add(mark);}
  const flare=glow(0xb399df,2.2);flare.position.y=.24;flare.material.opacity=.12;rune.add(flare);rune.userData.animated=true;g.userData={rune,flare,material:mat};batchStatic(g);return g;
}
function boneWall(parent,length,height,doorOffset=null){
  for(let x=-length/2+1.2;x<length/2-.6;x+=2.1){if(doorOffset!==null&&Math.abs(x-doorOffset)<3)continue;
    box(parent,1.76,.13,.26,x,.48,.48,edge);box(parent,1.8,.10,.22,x,Math.min(height-.13,2.46),.49,edge);
    if(height>2)for(let row=0;row<2;row++)for(let i=0;i<3;i++){skull(parent,x+(i-1)*.48,.96+row*.68,.49,.8);if(i!==1)bones(parent,x+(i-1)*.51,1.18+row*.65,.47,i%2?.62:-.62);}
    else{skull(parent,x,.80,.44,.86);bones(parent,x-.45,.73,.45,.7);bones(parent,x+.45,.73,.45,-.7);}
  }
}
function arch(parent,x,z,width=4.6,yaw=0){
  const g=group(parent,x,0,z);g.rotation.y=yaw;
  for(const side of[-1,1]){box(g,.28,2.4,.42,side*width/2,1.27,0,edge);box(g,.58,.12,.65,side*width/2,.16,0,stone);skull(g,side*width/2,2.0,-.23,.75);}
  for(let i=0;i<9;i++){const a=i*Math.PI/8,p=box(g,.67,.39,.55,Math.cos(a)*width/2,2.5+Math.sin(a)*1.15,0,edge);p.rotation.z=a-Math.PI/2;}return g;
}

function graveExterior(room,rng){
  const root=group(),landmarks=[],lanterns=[],wisps=[],particleData=[],W=room.w/2,H=room.h/2;root.name='catacomb-exterior';root.userData.animated=true;root.userData.exterior=true;
  box(root,110,.12,100,0,-12,0,0x111923);
  for(const side of[-1,1]){
    for(let row=0;row<3;row++){
      const x=side*(W+4.6+row*7.7),z=(row-1)*H*.9,p=group(root,x,-2.2-row*2.1,z);p.rotation.y=side*.14;
      box(p,5.3,.6,8.3,0,-.5,0,dark);box(p,5.3,.12,8.3,0,-.13,0,stone);
      for(const sx of[-2.35,2.35]){box(p,.35,3.8,8.3,sx,1.65,0,stone);for(let dz=-2.8;dz<3;dz+=1.4){box(p,.05,.9,1.12,sx-side*.2,.9,dz,dark);skull(p,sx-side*.36,.78,dz,1.1);}}
      for(const dz of[-2.5,2.5])arch(p,0,dz,4.6);
      const sarcophagus=coffinModel();sarcophagus.position.set(.4,0,-.7);sarcophagus.rotation.y=Math.PI/2;p.add(sarcophagus);
      const lamp=glow(row%2?0xb6a1d6:0x99bea1,1.9);lamp.position.set(x,-.1-row*2.1,z-2);lamp.material.opacity=.28;root.add(lamp);lanterns.push({sprite:lamp,phase:rng.next()*TAU,base:.28});landmarks.push({kind:'sunken-burial-vault',x,y:p.position.y,z,tier:row});
    }
    const fog=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:0x718975,transparent:true,opacity:.13,depthWrite:false}));fog.position.set(side*(W+9),-2.4,0);fog.scale.set(22,10,1);root.add(fog);wisps.push({sprite:fog,x:fog.position.x,z:0,phase:rng.next()*TAU});
  }
  for(let i=0;i<48;i++)particleData.push({x:(i%2?1:-1)*(W+2+rng.next()*23),y:-1-rng.next()*7,z:(rng.next()-.5)*(room.h+12),speed:.07,phase:rng.next()*TAU});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(144),3));const particles=new THREE.Points(geo,new THREE.PointsMaterial({color:0xb9c4a1,size:.065,transparent:true,opacity:.35,depthWrite:false}));root.add(particles);particles.userData.animated=true;batchStatic(root);root.traverse(m=>{if(m.isMesh){m.castShadow=false;m.receiveShadow=false;}});return{group:root,theme:'buried-catacombs',landmarks,lanterns,wisps,particles,particleData,instances:0,drawBatches:0};
}

export function buildTombRoom(room){
  const rng=new RNG(room.seed),g=group(),objects=[],lights=[],doors={},concealedDoors={},w=room.w,h=room.h;g.name='catacomb-room';
  const shape=new THREE.Shape();room.outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  for(const hole of room.holes){const p=new THREE.Path();hole.forEach(([x,z],i)=>i?p.lineTo(x,-z):p.moveTo(x,-z));p.closePath();shape.holes.push(p);}
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.52,bevelEnabled:false,steps:1}),uv=geometry.attributes.uv,position=geometry.attributes.position;
  for(let i=0;i<position.count;i++)uv.setXY(i,position.getX(i)/w+.5,-position.getY(i)/h+.5);
  const texture=tombTexture(room.seed);texture.repeat.set(w/7,h/7);const floor=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,roughness:.97,metalness:0}));floor.rotation.x=-Math.PI/2;floor.position.y=-.52;floor.receiveShadow=floor.castShadow=true;g.add(floor);
  for(let i=0;i<room.outline.length;i++){
    const a=room.outline[i],b=room.outline[(i+1)%room.outline.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2,p=group(g,mx,0,mz),height=-dx/length>.25?1.12:3.1;p.rotation.y=-Math.atan2(dz,dx);
    const d=DIRECTIONS.find(d=>{if(room.links[d.name]===undefined&&room.secret?.direction!==d.name)return false;const x=d.dx*w/2,z=d.dy*h/2,t=((x-a[0])*dx+(z-a[1])*dz)/(length*length);return t>=0&&t<=1&&Math.abs((x-a[0])*dz-(z-a[1])*dx)<.01;});
    const offset=d?((d.dx*w/2-mx)*dx+(d.dy*h/2-mz)*dz)/length:0;
    const section=(from,to)=>{if(to-from<.05)return;box(p,to-from,height,.68,(from+to)/2,height/2,0,stone);box(p,to-from,.18,.86,(from+to)/2,height+.05,0,edge);box(p,to-from,.17,.8,(from+to)/2,.20,0,iron);};
    if(d){section(-length/2,offset-2.4);section(offset+2.4,length/2);const hidden=room.links[d.name]===undefined,entry=roomGateway(p,offset,2,hidden,height,stone,edge,iron);if(hidden)concealedDoors[d.name]=entry;else doors[d.name]=entry.door;for(const side of[-1,1])skull(entry.door.group,side*2.55,3.1,.81,1.3);}else section(-length/2,length/2);
    boneWall(p,length,height,d?offset:null);
  }
  function add(type,x,z,rot=0,variant=0){
    const dimensions={column:[.66,.66],sarcophagus:[.76,1.44],curse:[1.07,1.07],table:[1.3,.65],chest:[.9,.58],npc:[1.1,.9],urn:[.32,.32],crate:[.55,.55],barrel:[.47,.47]},size=dimensions[type]||[.75,.75],hw=Math.abs(Math.cos(rot))*size[0]+Math.abs(Math.sin(rot))*size[1],hh=Math.abs(Math.cos(rot))*size[1]+Math.abs(Math.sin(rot))*size[0];
    const p=type==='crack'?{x,z}:roomPoint(room,x,z,Math.max(hw,hh)+.15,(a,b)=>objects.some(o=>o.solid&&Math.abs(a-o.x)<o.hw+hw+.25&&Math.abs(b-o.z)<o.hh+hh+.25));
    const model=type==='column'?gravePillar(group(),0,0):type==='sarcophagus'?coffinModel():type==='curse'?curseModel():objectModel(type,2,variant);
    model.position.set(p.x,0,p.z);model.rotation.y=rot+(type==='npc'?Math.PI:0);model.userData.animated=true;if(type==='npc')model.userData.homeYaw=model.rotation.y;g.add(model);
    const o={type,x:p.x,z:p.z,hw,hh,model,hp:type==='barrel'?12:type==='crate'?18:type==='urn'?6:9999,destroyed:false,flipped:false,solid:['column','sarcophagus','table','crate','barrel'].includes(type),shotBlock:['column','sarcophagus','crate','barrel'].includes(type)};objects.push(o);return o;
  }
  for(const side of[-1,1])for(const z of[-h/2+3.5,h/2-3.5]){const p=roomPoint(room,side*(w/2-2),z,.55);lights.push(candle(g,p.x,p.z));}
  for(const hole of room.holes){for(let i=0;i<hole.length;i++){const a=hole[i],b=hole[(i+1)%hole.length],dx=b[0]-a[0],dz=b[1]-a[1],p=group(g,(a[0]+b[0])/2,0,(a[1]+b[1])/2);p.rotation.y=-Math.atan2(dz,dx);box(p,Math.hypot(dx,dz),.22,.22,0,.02,0,edge);box(p,Math.hypot(dx,dz),2.2,.15,0,-1.1,0,dark);}const cx=hole.reduce((s,a)=>s+a[0],0)/hole.length,cz=hole.reduce((s,a)=>s+a[1],0)/hole.length,spirit=glow(0x88bba6,4.8);spirit.position.set(cx,-.9,cz);g.add(spirit);}
  if(['combat','event','secret','boss'].includes(room.type)){
    const coffins=room.type==='boss'?4:room.shape==='aisle'?4:2;
    for(let i=0;i<coffins;i++){const side=i%2?1:-1,o=add('sarcophagus',side*(w/2-3.5),(i<2?-1:1)*(h/2-4.3),room.shape==='aisle'&&w>h?Math.PI/2:0);o.cursed=room.type==='combat'&&rng.next()<.5;}
    if(room.type==='combat'){
      for(let i=0;i<2;i++){const o=add('curse',i?4:-4,i?3:-3);o.curseClock=rng.next()*5.4;}
      add('table',0,Math.min(5,h/2-3));if(rng.next()<.65)add('barrel',-5,3);
    }
    for(const side of[-1,1])add('urn',side*(w/2-2),0);
  }
  if(room.type==='start'){add('chest',-3,0).free=true;add('npc',3,0,0,'watcher');for(const side of[-1,1])add('sarcophagus',side*8,-5);}
  if(room.type==='exit')add('exit',0,0);
  if(room.type==='chest'){add('chest',-2,-1);add('chest',3,2).free=rng.next()<.3;for(const side of[-1,1])add('sarcophagus',side*7,-5);}
  if(room.type==='secret'){add('chest',0,0).free=true;add('chest',4,-2).free=true;}
  if(room.type==='shrine'){add('shrine',0,0);for(const side of[-1,1])add('sarcophagus',side*6,-3);}
  if(room.type==='event'){const event=rng.pick(['forge','rescue','challenge']),npc=add('npc',0,-2,0,event);npc.event=event;add('pedestal',0,1);}
  if(room.type==='shop'){const npc=add('npc',0,-h/2+3,0,'merchant');npc.shop=true;box(g,5.4,1,1.3,0,.5,-h/2+4.2,stone);for(const x of[-8,-4,0,4,8])add('pedestal',x,0);const sign=label('守墓人的交易所','#d7c5a7');sign.position.set(0,3,-h/2+.5);g.add(sign);}
  if(['aisle','ossuary'].includes(room.shape)&&room.type==='combat')for(const z of[-h*.18,h*.18])for(const side of[-1,1])add('column',side*w*.25,z);
  if(room.type==='boss'){
    for(const side of[-1,1]){add('column',side*10,-6);arch(g,side*7,-h/2+.3,4.4);}
    const altar=group(g,0,0,-h/2+3);box(altar,6,.26,2.8,0,.12,0,edge);for(let i=0;i<6;i++){skull(altar,(i-2.5)*.65,.51,-.4,1.25);bones(altar,(i-2.5)*.65,.60,.1,i%2?.7:-.7);}box(altar,.28,3.6,.35,0,2.2,.65,iron);box(altar,2.1,.25,.4,0,3.0,.65,iron);
    const light=new THREE.PointLight(0xb895e1,75,24,2);light.position.set(0,4,-3);g.add(light);const sign=label('大司铳 / 亡誓葬殿','#d1b4e7',512);sign.position.set(0,4.3,-h/2+.5);g.add(sign);
  }
  if(room.secret&&!room.secret.revealed){const d=DIRECTIONS.find(d=>d.name===room.secret.direction),o=add('crack',d.dx*(w/2-.55),d.dy*(h/2-.55),d.dx?Math.PI/2:0);o.hp=25;o.secretId=room.secret.id;o.dir=d.name;o.hw=d.dx?.5:1.5;o.hh=d.dx?1.5:.5;o.shotBlock=true;}
  // Ground-level tomb inscriptions replace the armory's carpets and clock crest.
  for(const z of[-h*.22,h*.22]){const p=roomPoint(room,0,z,.3);for(let i=0;i<5;i++)box(g,.08,.015,.44,(i-2)*.33+p.x,.014,p.z,0xb4aa90);box(g,2.1,.014,.08,p.x,.016,p.z-.42,0x333d3b);}
  const exterior=graveExterior(room,rng);g.add(exterior.group);batchStatic(g);return{group:g,objects,lights,doors,concealedDoors,exterior,theme:'catacombs'};
}
