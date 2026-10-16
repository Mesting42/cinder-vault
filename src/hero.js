import * as THREE from 'three';
import {characterArt} from './npc.js';
import {createCape} from './cape.js';
const {node,cut,box,round,piece,batch,base,fabric}=characterArt;
const graphite=0x303640,ink=0x1c2830,copper=0xb58148,gold=0xe2b66e,red=0xc85340,scarlet=0xe16b4c,skin=0xd0a080,leather=0x684a39;
const capeMaterial=fabric.clone();capeMaterial.side=THREE.DoubleSide;
const eyeMaterial=new THREE.MeshStandardMaterial({color:0xb1e9df,emissive:0x68a99c,emissiveIntensity:.32,roughness:.55});

export function buildHero(makeGun){
  const root=node(),pivotHeight=1.50,rollPivot=node(root,0,pivotHeight,0),body=node(rollPivot,0,-pivotHeight,0),legs=[],arms=[];
  root.name='ember-gunslinger';
  cut(body,[[1.00,.74,.48],[1.22,.86,.55],[1.97,1.03,.61],[2.21,.70,.51]],0,0,0,graphite,fabric);
  cut(body,[[1.21,.77,.10],[1.88,.82,.13],[2.06,.56,.10]],0,0,-.315,ink);
  for(const side of[-1,1]){
    cut(body,[[1.58,.30,.12],[1.98,.40,.16],[2.12,.22,.10]],side*.30,0,-.34,copper);
    box(body,.24,.055,.07,side*.29,1.74,-.422,gold);box(body,.085,.12,.043,side*.28,1.88,-.421,ink);
    cut(body,[[1.00,.26,.15],[1.22,.29,.17],[1.49,.24,.10]],side*.48,0,.04,leather);
    box(body,.29,.11,.22,side*.46,1.25,.07,copper);box(body,.075,.15,.065,side*.47,1.11,-.10,gold);
    const leg=node(body,side*.27,.84,0);legs.push(leg);
    cut(leg,[[-.42,.28,.35],[.02,.36,.42],[.22,.37,.44]],0,0,0,graphite,fabric);
    cut(leg,[[-.65,.28,.33],[-.38,.29,.34],[-.22,.33,.35]],0,0,0,leather);
    cut(leg,[[-.815,.39,.62],[-.69,.39,.60],[-.48,.29,.40]],0,0,-.075,ink);box(leg,.39,.055,.59,0,-.79,-.073,leather);
    cut(leg,[[-.54,.27,.12],[-.29,.34,.16],[-.19,.25,.12]],0,0,-.208,copper);box(leg,.20,.055,.047,0,-.31,-.303,gold);box(leg,.15,.05,.047,0,-.41,-.282,gold);
    const arm=node(body,side*.66,2.00,.015);arms.push(arm);
    cut(arm,[[-.37,.27,.34],[.015,.34,.40],[.14,.39,.41]],0,0,0,graphite,fabric);
    cut(arm,[[.02,.36,.46],[.13,.51,.47],[.25,.35,.33]],0,0,0,copper);
    box(arm,.17,.10,.035,0,.18,-.26,gold);
    cut(arm,[[-.68,.24,.34],[-.47,.27,.36],[-.33,.29,.35]],0,0,-.035,ink);
    cut(arm,[[-.64,.22,.12],[-.43,.28,.13]],0,0,-.20,copper);
    cut(arm,[[-.77,.23,.26],[-.62,.28,.30]],0,0,-.23,leather);
    box(arm,.08,.13,.11,-side*.12,-.68,-.38,skin);
  }
  cut(body,[[1.06,.83,.56],[1.20,.88,.59]],0,0,0,ink);box(body,.23,.16,.065,0,1.14,-.328,gold);box(body,.11,.07,.025,0,1.14,-.374,ink);
  const band=node(body,-.16,1.76,-.405);band.rotation.z=-.50;box(band,.16,1.0,.07,0,0,0,leather,fabric);
  for(let i=0;i<5;i++){const cartridge=round(band,.063,.20,0,(i-2)*.165,-.055,gold);cartridge.rotation.z=Math.PI/2;box(band,.11,.027,.065,0,(i-2)*.165,-.089,ink);}
  const kit=node(body,.66,1.15,.10);cut(kit,[[-.24,.42,.26],[.31,.48,.32],[.44,.36,.28]],0,0,0,leather,fabric);box(kit,.11,.64,.36,0,.10,0,copper);
  round(body,.16,.26,0,2.24,0,skin);
  const head=node(body,0,2.52,-.025);
  cut(head,[[-.29,.44,.43],[-.13,.63,.57],[.16,.77,.65],[.30,.64,.53]],0,0,0,skin);
  for(const side of[-1,1]){
    cut(head,[[-.12,.13,.16],[.09,.16,.20]],side*.38,0,.01,skin);
    box(head,.18,.09,.055,side*.17,.055,-.346,0xe1d5ba);box(head,.072,.079,.035,side*.17,.06,-.385,ink);
    box(head,.20,.06,.07,side*.17,.16,-.345,0x483630).rotation.z=side*.14;
  }
  cut(head,[[-.09,.13,.15],[.03,.15,.18],[.11,.07,.07]],0,0,-.35,skin);
  box(head,.095,.08,.025,-.22,-.07,-.358,0x96543c).rotation.z=-.22;
  cut(head,[[-.27,.38,.10],[-.13,.62,.14],[-.06,.59,.09]],0,0,-.31,graphite);box(head,.28,.055,.035,0,-.17,-.399,copper);
  cut(head,[[.17,.80,.67],[.32,.76,.59],[.38,.51,.40]],0,0,.018,0x43352c);
  const brim=cut(head,[[.23,1.27,.94],[.29,1.43,1.00],[.37,1.21,.86]],0,0,.02,ink);brim.rotation.x=-.055;
  cut(head,[[.31,.87,.68],[.52,.77,.59],[.60,.53,.43]],0,0,.03,graphite,fabric);
  cut(head,[[.33,.89,.70],[.41,.85,.67]],0,0,.03,copper);box(head,.15,.18,.043,0,.39,-.328,gold);box(head,.048,.10,.028,0,.39,-.36,ink);
  box(head,.13,.045,.03,.175,.062,-.410,0xffffff,eyeMaterial);
  const scarf=node(body,0,2.16,-.27);
  cut(scarf,[[-.04,.76,.23],[.12,.99,.23],[.25,.61,.20]],0,0,0,red,fabric);box(scarf,.23,.44,.07,-.33,-.18,-.065,scarlet,fabric);box(scarf,.24,.12,.07,-.34,-.45,-.09,red,fabric).rotation.z=-.10;
  const cape=node(body,0,1.54,.35);createCape(cape,capeMaterial,red);
  const armHome=[.12,.42];arms.forEach((arm,i)=>arm.rotation.x=armHome[i]);
  const weaponHome=new THREE.Vector3(.57,1.43,-.47),weapon=node(body,...weaponHome.toArray());weapon.add(makeGun('revolver',1.12));weapon.userData.animated=true;
  for(const part of [...legs,...arms,head,scarf,cape,weapon])part.userData.animated=true;
  for(const part of [...legs,...arms,head,scarf,cape])batch(part);batch(body);
  root.userData={body,rollPivot,head,legs,arms,arm:arms[1],armHome,weapon,scarf,cape,bounds:new THREE.Box3(),pivotHeight,weaponHome,gunScale:1.12,height:3.17,rollScale:new THREE.Vector3(.78,.56,.56)};
  return root;
}
