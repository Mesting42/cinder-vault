import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const roles={
  watcher:{name:'守夜者',coat:0x944d3e,trim:0xd6b789,cloth:0xb97a51,hair:0xaaa48d,skin:0xc49b79},
  merchant:{name:'铜币商人',coat:0x775277,trim:0xdeba75,cloth:0xbb8750,hair:0xe0d2aa,skin:0xd4a37b},
  forge:{name:'漂泊铸枪师',coat:0x596a80,trim:0xc49051,cloth:0x905939,hair:0x554133,skin:0xc59671},
  rescue:{name:'受困巡火者',coat:0x52788a,trim:0xd5b575,cloth:0x955c43,hair:0x544537,skin:0xcfa480},
  challenge:{name:'试炼引路人',coat:0x695780,trim:0xc79858,cloth:0xae5543,hair:0x504238,skin:0xcfa17c}
};
const base=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.87,metalness:.05,flatShading:true});
const fabricMap=(()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d');ctx.fillStyle='#f4eddf';ctx.fillRect(0,0,32,32);
  for(let y=0;y<32;y+=4)for(let x=0;x<32;x+=4){ctx.fillStyle=(x+y)%8?'#dfd8c8':'#fff8e8';ctx.fillRect(x,y,2,1);ctx.fillRect(x+1,y+2,1,2);}
  const texture=new THREE.CanvasTexture(canvas);texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.colorSpace=THREE.SRGBColorSpace;return texture;
})();
const fabric=new THREE.MeshStandardMaterial({map:fabricMap,vertexColors:true,roughness:1,flatShading:true});
const lightMaterial=new THREE.MeshStandardMaterial({color:0xffd995,emissive:0xffbd64,emissiveIntensity:1.3,roughness:.35});
const boxGeometry=new THREE.BoxGeometry(1,1,1),roundGeometry=new THREE.CylinderGeometry(1,1,1,8),ringGeometry=new THREE.TorusGeometry(.12,.025,4,8),prisms=new Map();
const dark=0x302c2e,leather=0x624936,steel=0x9b9c91,pants=0x384653;
function node(parent,x=0,y=0,z=0){const part=new THREE.Group();part.position.set(x,y,z);if(parent)parent.add(part);return part;}

// Chamfered cross sections create a jaw, shoulders, waist and bent limbs,
// rather than a cylinder or a stack with a uniform rectangular silhouette.
function prism(rows){
  const key=JSON.stringify(rows);if(prisms.has(key))return prisms.get(key);
  const positions=[],uv=[],indices=[],cross=[[-1,-.65],[-.65,-1],[.65,-1],[1,-.65],[1,.65],[.65,1],[-.65,1],[-1,.65]];
  for(const [y,w,d,cx=0,cz=0] of rows)for(const [x,z] of cross){positions.push(cx+x*w/2,y,cz+z*d/2);uv.push((x+1)/2,(y-rows[0][0])/(rows.at(-1)[0]-rows[0][0]));}
  for(let j=0;j<rows.length-1;j++)for(let i=0;i<8;i++){const a=j*8+i,b=j*8+(i+1)%8,c=(j+1)*8+i,d=(j+1)*8+(i+1)%8;indices.push(a,c,b,b,c,d);}
  for(let i=1;i<7;i++){indices.push(0,i,i+1);const t=(rows.length-1)*8;indices.push(t,t+i+1,t+i);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);const flat=geometry.toNonIndexed();geometry.dispose();flat.computeVertexNormals();prisms.set(key,flat);return flat;
}
function piece(parent,geometry,color,x=0,y=0,z=0,scale=[1,1,1],mat=base){
  const owned=geometry.index?geometry.toNonIndexed():geometry.clone(),rgb=new THREE.Color(color),colors=new Float32Array(owned.attributes.position.count*3);
  for(let i=0;i<colors.length;i+=3){colors[i]=rgb.r;colors[i+1]=rgb.g;colors[i+2]=rgb.b;}owned.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const mesh=new THREE.Mesh(owned,mat);mesh.position.set(x,y,z);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
const box=(p,w,h,d,x,y,z,c,mat=base)=>piece(p,boxGeometry,c,x,y,z,[w,h,d],mat);
const round=(p,r,h,x,y,z,c,mat=base)=>piece(p,roundGeometry,c,x,y,z,[r,h,r],mat);
const cut=(p,rows,x,y,z,c,mat=base)=>piece(p,prism(rows),c,x,y,z,[1,1,1],mat);
function batch(root){
  root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),buckets=new Map(),old=[];
  root.traverse(mesh=>{if(!mesh.isMesh||mesh.userData.batched)return;let p=mesh;while(p&&p!==root){if(p.userData.animated)return;p=p.parent;}const geometry=mesh.geometry.clone().applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));if(!buckets.has(mesh.material))buckets.set(mesh.material,[]);buckets.get(mesh.material).push(geometry);old.push(mesh);});
  for(const mesh of old){mesh.parent.remove(mesh);mesh.geometry.dispose();}
  for(const [mat,geometries] of buckets){const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,mat);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.batched=true;root.add(mesh);}
}
function nameBadge(name){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#16241eee';ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(248,0);ctx.lineTo(256,8);ctx.lineTo(256,56);ctx.lineTo(248,64);ctx.lineTo(8,64);ctx.lineTo(0,56);ctx.lineTo(0,8);ctx.closePath();ctx.fill();ctx.strokeStyle='#b9a276';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#e0c89b';ctx.fillRect(15,19,23,15);ctx.fillRect(18,32,5,7);ctx.fillStyle='#15231e';for(let i=0;i<3;i++)ctx.fillRect(19+i*6,24,3,3);
  ctx.font='bold 24px Microsoft YaHei';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#e0d7bd';ctx.fillText(name,147,33);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const badge=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));badge.position.y=3.36;badge.scale.set(2.0,.50,1);return badge;
}

export function npcModel(role='watcher',floor=1){
  if(!roles[role])role='watcher';const palette=roles[role],root=node(),body=node(root,0,1.23,0),head=node(body,0,1.14,-.015),legs=[],arms=[],elbows=[];
  root.name=`npc-${role}`;root.rotation.y=Math.PI;root.scale.setScalar(.90);root.userData.animated=true;
  const broad=role==='merchant'?1.12:.94;
  cut(body,[[-.17,.73,.46],[.03,.82,.49],[.76,broad,.55],[.93,.65,.49]],0,0,0,palette.coat,fabric);
  cut(body,[[-.17,.75,.49],[-.02,.79,.5]],0,0,0,dark);box(body,.17,.15,.07,.07,-.085,-.275,palette.trim);box(body,.07,.08,.09,.07,-.085,-.31,leather);
  round(body,.16,.22,0,1.04,0,palette.skin);
  for(const side of[-1,1]){
    const leg=node(root,side*.285,.91,side<0?.04:-.02);legs.push(leg);
    cut(leg,[[-.49,.25,.32],[-.05,.31,.39],[.10,.34,.39]],0,0,0,pants);
    cut(leg,[[-.79,.29,.35],[-.52,.27,.33],[-.40,.28,.33]],0,0,0,leather);
    cut(leg,[[-.88,.35,.60],[-.78,.35,.61],[-.64,.30,.41]],0,0,-.10,dark);box(leg,.35,.065,.57,0,-.85,-.10,leather);
    box(leg,.32,.07,.39,0,-.55,-.04,palette.trim);box(leg,.09,.16,.05,side*.10,-.48,-.22,steel);
    const arm=node(body,side*(broad/2+.14),.73,0),forearm=node(arm,0,-.40,-.025);arms.push(arm);elbows.push(forearm);
    cut(arm,[[-.39,.28,.33],[.02,.33,.36],[.13,.39,.39]],0,0,0,palette.coat,fabric);
    cut(arm,[[.02,.36,.40],[.16,.38,.41],[.23,.24,.31]],0,0,0,role==='challenge'?palette.trim:palette.cloth);
    cut(forearm,[[-.40,.22,.27],[-.03,.24,.29],[.08,.27,.30]],0,0,0,role==='forge'?palette.skin:palette.coat,role==='forge'?base:fabric);
    box(forearm,.28,.13,.32,0,-.27,-.01,palette.cloth);
    cut(forearm,[[-.55,.22,.24],[-.36,.25,.28],[-.28,.20,.22]],0,0,-.045,palette.skin);
    box(forearm,.08,.13,.09,side<0?.14:-.14,-.43,-.075,palette.skin);
  }
  // The face has its own jaw contour, ears, nose, brows and visible pupils.
  cut(head,[[-.28,.44,.39],[-.16,.63,.57],[.12,.78,.66],[.30,.74,.59],[.36,.49,.42]],0,0,0,palette.skin);
  for(const side of[-1,1]){
    cut(head,[[-.11,.14,.18],[.10,.15,.20],[.15,.10,.12]],side*.39,0,0,palette.skin);
    box(head,.18,.105,.05,side*.18,.04,-.344,0xe5d6b5);box(head,.078,.087,.04,side*.17,.047,-.383,0x2c2929);
    box(head,.19,.055,.063,side*.18,.155,-.344,palette.hair).rotation.z=side*.07;
  }
  cut(head,[[-.12,.12,.12],[-.02,.16,.19],[.10,.095,.075]],0,0,-.342,palette.skin);
  box(head,.18,.025,.05,0,-.20,-.294,0x8b5545);
  cut(head,[[.18,.80,.68],[.32,.78,.63],[.43,.54,.46]],0,0,.014,palette.hair);
  for(let i=0;i<3;i++)box(head,.19,.12,.08,-.20+i*.20,.235,-.31,palette.hair);
  const lids=[];for(const side of[-1,1]){const lid=box(head,.195,.113,.033,side*.18,.046,-.407,palette.skin);lid.userData.animated=true;lid.scale.y=.001;lids.push(lid);}
  const scarf=node(body,0,.75,-.30);cut(scarf,[[0,.87,.18],[.19,.65,.17]],0,0,0,palette.trim,fabric);box(scarf,.18,.56,.08,-.28,-.23,-.035,palette.trim,fabric);
  let lantern=null,lanternLight=null,cape=null;
  if(role==='watcher'){
    cut(head,[[.22,.88,.72],[.40,.79,.67],[.54,.51,.48]],0,0,.025,palette.coat,fabric);
    for(const side of[-1,1])cut(head,[[-.16,.13,.34],[.31,.20,.56]],side*.38,0,.05,palette.coat,fabric);
    cut(head,[[-.36,.28,.13],[-.18,.48,.15],[-.10,.54,.12]],0,0,-.245,palette.hair);
    cape=node(body,0,.19,.31);cut(cape,[[-.20,.77,.13],[.58,1.03,.16],[.78,.65,.10]],0,0,0,palette.coat,fabric);box(cape,.20,.14,.07,.20,-.12,.10,palette.trim);
    const hand=elbows[0];lantern=node(hand,0,-.61,-.065);
    piece(lantern,ringGeometry,steel,0,.03,0,[1.2,1.2,1.2]);round(lantern,.20,.08,0,-.19,0,palette.trim);round(lantern,.21,.10,0,-.60,0,dark);
    for(const x of[-.15,.15])for(const z of[-.15,.15])box(lantern,.045,.36,.045,x,-.40,z,palette.trim);
    const flame=round(lantern,.11,.29,0,-.40,0,0xffffff,lightMaterial);flame.userData.animated=true;
    round(lantern,.14,.13,0,-.10,0,leather);
    lanternLight=new THREE.PointLight(0xffc478,4.5,3.0,2);lanternLight.position.set(0,-.39,0);lantern.add(lanternLight);
  }else if(role==='merchant'){
    cut(head,[[.25,.88,.74],[.50,.81,.70],[.60,.51,.50]],0,0,.03,palette.trim,fabric);box(head,.82,.10,.73,0,.27,.018,palette.cloth);
    for(const side of[-1,1])cut(head,[[-.21,.22,.06],[-.12,.30,.08],[-.06,.17,.07]],side*.14,0,-.308,palette.hair);
    const pack=node(body,0,.17,.53);cut(pack,[[-.23,1.07,.53],[.42,1.22,.73],[.80,1.09,.69]],0,0,0,leather,fabric);cut(pack,[[.76,1.13,.74],[.90,1.08,.68]],0,0,0,palette.cloth,fabric);
    for(const side of[-1,1]){box(pack,.13,1.05,.77,side*.37,.36,0,palette.trim);box(body,.12,.92,.08,side*.33,.44,-.31,palette.trim);box(pack,.10,.14,.09,side*.37,.08,.40,steel);}
    const roll=round(pack,.24,1.4,0,1.08,0,0x678189,fabric);roll.rotation.z=Math.PI/2;for(const x of[-.46,.46])round(pack,.255,.08,x,1.08,0,palette.cloth).rotation.z=Math.PI/2;
    cut(body,[[0,.42,.23],[.44,.44,.29]],-.57,.04,-.02,palette.cloth,fabric);round(elbows[1],.14,.08,0,-.48,-.12,palette.trim).rotation.x=Math.PI/2;
  }else if(role==='forge'){
    const apron=node(body,0,.09,-.32);cut(apron,[[-.10,.72,.07],[.12,.89,.11],[.76,.69,.10]],0,0,0,palette.cloth,fabric);box(apron,.57,.20,.04,0,.24,-.065,leather);box(apron,.12,.20,.05,-.17,.24,-.093,palette.trim);
    for(const side of[-1,1])box(body,.12,.46,.08,side*.23,.82,-.27,leather).rotation.z=side*.15;
    for(const x of[-.18,.18]){const lens=round(head,.14,.09,x,.26,-.344,steel);lens.rotation.x=Math.PI/2;round(head,.102,.1,x,.26,-.37,0x486e78).rotation.x=Math.PI/2;}
    box(head,.14,.045,.07,0,.26,-.395,leather);box(head,.78,.08,.68,0,.31,.015,leather);
    const hammer=node(elbows[1],0,-.47,-.10);box(hammer,.075,.70,.075,0,-.12,0,leather);cut(hammer,[[-.10,.48,.28],[.11,.54,.31],[.19,.42,.25]],0,.22,0,steel);box(hammer,.16,.21,.33,.22,.27,0,0xb8b2a0);
  }else if(role==='rescue'){
    cut(head,[[.19,.83,.71],[.32,.83,.69]],0,0,.006,0xd8d0b2,fabric);box(head,.20,.17,.04,.18,.255,-.365,0x95624d);
    cut(body,[[-.10,.43,.21],[.39,.48,.27]],.56,.01,-.01,leather,fabric);box(body,.12,1.16,.055,.07,.41,-.328,palette.trim).rotation.z=-.47;
    const bandage=box(elbows[0],.27,.14,.32,0,-.16,-.02,0xdcd5b7,fabric);bandage.rotation.z=.05;
    box(body,.31,.18,.06,-.18,.44,-.34,0xcdbf98);box(body,.06,.11,.02,-.18,.44,-.383,palette.cloth);
  }else{
    for(const side of[-1,1])cut(body,[[.55,.29,.22],[.82,.43,.27],[.92,.24,.24]],side*.47,0,.01,palette.trim);
    box(scarf,.22,.68,.08,.23,-.28,-.045,palette.cloth,fabric);
    const staff=node(elbows[0],0,-.46,-.06);box(staff,.075,1.35,.075,0,-.13,0,leather);piece(staff,ringGeometry,palette.trim,0,.58,0,[2.3,2.3,2.3]);box(staff,.08,.49,.09,0,.61,0,palette.trim);box(staff,.32,.08,.10,0,.60,0,palette.trim);
  }
  const badge=nameBadge(palette.name);root.add(badge);
  const animated=[head,...legs,...arms,...elbows,scarf,...(cape?[cape]:[]),...(lantern?[lantern]:[])];
  for(const part of animated)part.userData.animated=true;
  for(const part of [...elbows,...arms,...legs,head,scarf,...(cape?[cape]:[]),...(lantern?[lantern]:[])])batch(part);
  batch(body);body.userData.animated=true;
  root.userData={animated:true,role,name:palette.name,body,head,legs,arms,elbows,lids,scarf,cape,lantern,lanternLight,badge,homeYaw:Math.PI,phase:Object.keys(roles).indexOf(role)*1.77,interactionHeight:3.65,responseUntil:-1,responseBlend:0,floor};
  return root;
}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function animateNPC(object,time,dt,player){
  const root=object.model,data=root.userData;if(!data.body)return;
  const phase=time+data.phase,near=player&&Math.hypot(player.x-object.x,player.z-object.z)<6.5,target=near?Math.atan2(player.x-object.x,player.z-object.z)+Math.PI:data.homeYaw;
  root.rotation.y+=angleDiff(target,root.rotation.y)*(1-Math.exp(-dt*3.2));
  const talking=time<data.responseUntil;data.responseBlend+=(Number(talking)-data.responseBlend)*(1-Math.exp(-dt*7));
  const response=data.responseBlend;
  data.body.position.y=1.23+Math.sin(phase*2.0)*.022;
  data.body.rotation.z=Math.sin(phase*.8)*.017*(1-response);
  data.head.rotation.y=near?clamp(angleDiff(target,root.rotation.y),-.65,.65)*.7:Math.sin(phase*.55)*.06;
  data.head.rotation.x=Math.sin(phase*.9)*.018+Math.sin((time-data.responseUntil)*9)*.13*response;
  data.arms.forEach((arm,i)=>{const side=i===0?-1:1;arm.rotation.z=-side*(.12+Math.sin(phase*1.5+i)*.025);arm.rotation.x=(i===1?-.72*response:0)+Math.sin(phase*1.3+i)*.035;});
  data.elbows.forEach((arm,i)=>{arm.rotation.x=-.13-(i===1?.45*response:0);});
  data.scarf.rotation.z=Math.sin(phase*1.25)*.03;
  if(data.cape)data.cape.rotation.x=.05+Math.sin(phase*1.1)*.025;
  if(data.lantern){data.lantern.rotation.z=Math.sin(phase*1.8)*.085;data.lanternLight.intensity=4.1+Math.sin(phase*8)*.4;}
  const blink=(phase%4.6)<.10;for(const lid of data.lids)lid.scale.y=blink?.113:.001;
  data.badge.visible=!!near||talking;data.badge.material.opacity=talking?1:.84;
}

export const characterArt={node,cut,box,round,piece,batch,base,fabric};
