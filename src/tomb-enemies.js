import * as THREE from 'three';
import {characterArt} from './npc.js';
const {node,box,round,cut,batch}=characterArt;
const bone=0xc9c3a8,oldBone=0x9d9c87,ink=0x2b303b,cloth=0x4e405d,metal=0x626b62,glow=0xb6d49f;
function skull(parent,x,y,z,scale=1){const g=node(parent,x,y,z);g.scale.setScalar(scale);cut(g,[[-.22,.34,.28],[-.07,.47,.41],[.24,.42,.38],[.33,.24,.27]],0,0,0,bone);for(const side of[-1,1]){box(g,.12,.10,.05,side*.13,.065,-.22,ink);box(g,.075,.04,.065,side*.13,.065,-.25,glow);}box(g,.06,.095,.07,0,-.07,-.22,ink);for(let i=0;i<4;i++)box(g,.045,.11,.07,-.10+i*.068,-.21,-.20,bone);return g;}
function ribcage(parent,y,scale=1){const g=node(parent,0,y,0);g.scale.setScalar(scale);box(g,.11,.9,.15,0,0,.08,oldBone);for(let i=0;i<4;i++)for(const side of[-1,1]){const rib=box(g,.44-i*.04,.065,.14,side*(.22-i*.015),.30-i*.19,-.09,bone);rib.rotation.z=-side*.18;box(g,.07,.15,.23,side*(.40-i*.035),.25-i*.19,-.18,bone);}return g;}
export function tombEnemyModel(type){
  const g=node();g.name=`catacomb-${type}`;g.userData.type=type;
  if(type==='gunner'||type==='shotgun'||type==='mage'){
    for(const side of[-1,1]){const leg=node(g,side*.22,.45,0);box(leg,.14,.68,.16,0,0,0,oldBone);round(leg,.12,.12,0,-.05,0,bone);box(leg,.21,.12,.41,0,-.33,-.09,ink);box(g,.10,.70,.10,side*.49,1.18,0,bone).rotation.z=side*.15;round(g,.14,.17,side*.49,1.02,0,oldBone);}
    ribcage(g,1.16);round(g,.15,.22,0,1.72,0,oldBone);skull(g,0,2.00,0,1.1);
    if(type==='mage'){
      cut(g,[[.20,.95,.61],[.65,.76,.58],[1.55,.43,.41]],0,0,.12,cloth);for(const side of[-1,1])box(g,.16,.65,.28,side*.47,1.4,.12,cloth).rotation.z=side*.25;
      const crown=cut(g,[[0,.63,.56],[.54,.42,.39],[.90,.03,.03]],0,2.14,0,ink);crown.rotation.z=.10;
      box(g,.07,1.72,.07,.78,1.30,-.1,oldBone);cut(g,[[0,.03,.03],[.22,.22,.19],[.49,.03,.03]],.78,2.11,-.1,glow);for(const side of[-1,1])box(g,.055,.5,.04,side*.2,.93,-.32,bone);
    }else{
      cut(g,[[1.50,.68,.49],[1.79,.57,.43]],0,0,.09,cloth);box(g,.08,.89,.07,-.30,1.1,-.27,metal);
      const bow=node(g,.50,1.08,-.47);box(bow,.13,.13,.92,0,0,-.13,ink);for(const side of[-1,1]){box(bow,.57,.07,.10,side*.30,.05,-.51,oldBone).rotation.y=-side*.24;box(bow,.09,.09,.18,side*.50,.05,-.62,bone);}box(bow,1.0,.025,.025,0,.06,-.62,ink);box(bow,.04,.04,.9,0,.12,-.37,bone);
      if(type==='shotgun'){box(bow,.85,.08,.26,0,-.18,-.43,metal);for(const x of[-.23,0,.23])box(bow,.05,.05,.67,x,-.15,-.45,bone);}
    }
  }else if(type==='charger'){
    cut(g,[[.31,.73,1.33],[.81,.91,1.27],[1.02,.66,1.10]],0,0,.13,ink);ribcage(g,.72,1.0).rotation.x=Math.PI/2;
    for(const side of[-1,1])for(const z of[-.40,.57]){box(g,.13,.64,.14,side*.43,.36,z,oldBone).rotation.z=-side*.19;box(g,.23,.1,.37,side*.50,.07,z-.08,bone);}
    const head=skull(g,0,1.14,-.76,1.65);for(const side of[-1,1]){const horn=cut(head,[[0,.13,.17],[.48,.085,.12],[.72,.025,.025]],side*.30,.22,0,oldBone);horn.rotation.z=-side*.40;}
    box(g,.1,.85,.1,0,.98,.58,oldBone).rotation.x=.60;
  }else if(type==='turret'){
    for(let i=0;i<3;i++){const arm=node(g);arm.rotation.y=i*Math.PI*2/3;box(arm,.18,.19,1.34,0,.20,.37,oldBone);box(arm,.37,.20,.26,0,.16,1.04,ink);}
    round(g,.36,.82,0,.64,0,metal);skull(g,0,1.34,0,1.65);const bow=node(g,0,1.01,-.49);for(const side of[-1,1]){box(bow,.84,.12,.14,side*.47,.10,-.32,oldBone).rotation.y=-side*.28;box(bow,.1,.1,.42,side*.78,.10,-.51,bone);}box(bow,1.62,.035,.035,0,.1,-.71,ink);for(const x of[-.20,.20])box(bow,.07,.07,1.13,x,0,-.42,bone);
  }else if(type==='bat'){
    skull(g,0,1.2,0,.95);box(g,.10,.70,.1,0,.83,.09,oldBone);
    for(const side of[-1,1]){const wing=node(g,side*.29,1.13,0);const positions=[0,0,0,side*.95,.17,.12,side*.61,-.48,.14,0,0,0,side*.61,-.48,.14,side*.15,-.25,.04];const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();const skin=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x434637,side:THREE.DoubleSide,roughness:1}));wing.add(skin);for(const i of[0,1,2])box(wing,.07,.065,.82,side*(.24+i*.22),-.08-i*.08,.13,bone).rotation.y=side*(.88+i*.3);wing.userData.animated=true;batch(wing);g.userData[`wing${side}`]=wing;}
  }
  batch(g);return g;
}
