import * as THREE from 'three';
import {characterArt} from './npc.js';
const {node,cut,box,round,piece,batch,fabric}=characterArt;
const metal=0xb78b55,dark=0x25323d,leather=0x624336;

export function classWeaponModel(id,scale=1){
  const root=node();root.name=id;
  if(id==='froststaff'||id==='stormrod'){
    const lightning=id==='stormrod';
    cut(root,[[-.59,.105,.13],[.05,.13,.16],[.61,.115,.15]],0,0,0,leather,fabric);
    for(const y of[-.43,-.16,.10,.44])round(root,.092,.10,0,y,0,metal);
    const crown=node(root,0,.83,-.045);
    cut(crown,[[-.20,.24,.22],[-.11,.37,.34],[.04,.23,.21]],0,0,0,metal);
    for(const side of[-1,1]){const tine=cut(crown,[[-.06,.07,.11],[.38,.09,.12],[.53,.04,.07]],side*.21,0,0,0xd6c293);tine.rotation.z=-side*.19;box(crown,.08,.09,.12,side*.15,.16,-.19,dark);}
    const crystalMaterial=new THREE.MeshStandardMaterial({color:lightning?0x9ef8de:0x9adfff,emissive:lightning?0x4edac2:0x69bdde,emissiveIntensity:.7,roughness:.38,metalness:.15,flatShading:true,vertexColors:true});
    cut(crown,[[0,.19,.17],[.12,.29,.27],[.33,.24,.22],[.49,.015,.015]],0,0,-.025,lightning?0xc4ffe1:0xcaf7ff,crystalMaterial);
    if(lightning){for(const side of[-1,1]){const branch=cut(crown,[[-.15,.055,.10],[.24,.065,.09],[.39,.03,.05]],side*.35,0,.02,0x8caa93);branch.rotation.z=-side*.45;box(root,.045,.34,.035,side*.12,.17,-.10,0x83eed5);}}
    box(root,.20,.06,.11,0,.48,-.025,0xc8d6ca);round(root,.13,.05,0,-.55,0,0xabc4cb);
    root.userData.muzzleLocal=new THREE.Vector3(0,1.19,-.07);
  }else if(id==='copperblade'){
    const blade=node(root,0,.10,-.20);blade.rotation.x=-Math.PI/2;
    cut(blade,[[0,.14,.11],[.14,.38,.13],[1.22,.46,.13],[1.46,.28,.11],[1.59,.02,.02]],0,0,0,0xbdb9a2);
    cut(blade,[[.07,.12,.14],[1.18,.16,.15],[1.35,.08,.12]],0,0,0,0xb6633c);
    for(const side of[-1,1])box(blade,.045,1.16,.038,side*.16,.67,-.085,0xe3c17c);
    cut(root,[[.01,.69,.25],[.12,.71,.27],[.20,.55,.23]],0,0,-.18,metal);
    const grip=round(root,.086,.42,0,.10,.14,leather);grip.rotation.x=Math.PI/2;for(const z of[.0,.10,.20,.30])round(root,.094,.032,0,.10,z,0xc79358).rotation.x=Math.PI/2;
    cut(root,[[.015,.21,.16],[.15,.24,.20],[.22,.13,.13]],0,0,.36,0xa95937);
    root.userData.muzzleLocal=new THREE.Vector3(0,.10,-1.74);
  }else if(id==='oathaxe'){
    const shaft=node(root,0,.10,-.12);shaft.rotation.x=-Math.PI/2;
    cut(shaft,[[-.35,.11,.15],[.12,.12,.16],[1.05,.10,.13]],0,0,0,leather,fabric);
    for(const y of[-.28,-.12,.05,.35,.81])round(shaft,.092,.06,0,y,0,metal);
    for(const side of[-1,1]){const edge=cut(shaft,[[.65,.34,.13],[.82,.55,.16],[1.19,.64,.15],[1.42,.43,.10]],side*.27,0,0,side>0?0xd4c19a:0xbb7950);edge.rotation.z=-side*.25;box(shaft,.035,.43,.18,side*.50,1.01,0,0xf1d9a9).rotation.z=-side*.25;}
    cut(shaft,[[.75,.20,.23],[1.27,.24,.26],[1.40,.13,.12]],0,0,0,0x6e4b38);round(shaft,.13,.14,0,-.30,0,0xc69458);root.userData.muzzleLocal=new THREE.Vector3(0,.10,-1.56);
  }else if(id==='stormpike'){
    const shaft=node(root,0,.10,-.08);shaft.rotation.x=-Math.PI/2;round(shaft,.064,2.40,0,.91,0,0x74604a);
    for(const y of[-.18,0,.18,.87,1.86])round(shaft,.085,.11,0,y,0,metal);box(shaft,.036,1.25,.06,0,1.14,-.063,0xd1be88);
    cut(shaft,[[1.97,.14,.15],[2.16,.28,.20],[2.56,.13,.12],[2.77,.01,.01]],0,0,0,0xd7ddc0);
    for(const side of[-1,1]){const hook=cut(shaft,[[1.88,.06,.13],[2.23,.10,.17],[2.39,.03,.08]],side*.24,0,0,0xc49357);hook.rotation.z=-side*.18;}box(shaft,.09,.28,.035,0,2.19,-.119,0x8ccab5);root.userData.muzzleLocal=new THREE.Vector3(0,.10,-2.88);
  }else if(id==='quakehammer'){
    const shaft=node(root,0,.10,-.10);shaft.rotation.x=-Math.PI/2;cut(shaft,[[-.26,.13,.16],[.31,.14,.17],[.89,.11,.16]],0,0,0,leather,fabric);
    for(const y of[-.16,.04,.25,.70])round(shaft,.10,.08,0,y,0,metal);
    cut(shaft,[[.68,.79,.44],[.80,1.07,.59],[1.09,1.07,.59],[1.25,.77,.44]],0,0,0,0x4a4943);
    for(const side of[-1,1]){cut(shaft,[[.77,.18,.52],[.92,.24,.65],[1.10,.18,.52]],side*.47,0,0,0xc58652);box(shaft,.05,.30,.28,side*.37,.95,-.32,0xe0ac6b);}
    box(shaft,.30,.34,.08,0,.95,-.36,0xb74f38);box(shaft,.055,.21,.04,0,.96,-.409,0xffc486);root.userData.muzzleLocal=new THREE.Vector3(0,.10,-1.40);
  }else if(id==='embercodex'){
    cut(root,[[.00,.72,.98],[.05,.79,1.07],[.11,.76,1.01]],0,0,-.15,0x653e34);
    cut(root,[[.10,.64,.86],[.24,.64,.86]],0,0,-.15,0xd9c9a2);cut(root,[[.24,.76,1.01],[.29,.79,1.05]],0,0,-.15,0x814735);
    for(const x of[-.28,.28])box(root,.07,.025,.82,x,.31,-.15,metal);box(root,.045,.03,.53,0,.32,-.15,0xe3a455);box(root,.29,.03,.045,0,.32,-.15,0xe3a455);box(root,.05,.03,.16,0,.32,-.40,0xefc48e);
    const flameMaterial=new THREE.MeshStandardMaterial({color:0xffc689,emissive:0xff8a45,emissiveIntensity:1,vertexColors:true,flatShading:true});cut(root,[[.38,.17,.16],[.54,.28,.25],[.76,.11,.09],[.96,.01,.01]],0,0,-.20,0xffd89a,flameMaterial);root.userData.muzzleLocal=new THREE.Vector3(0,.78,-.20);
  }else if(id==='moonorb'){
    cut(root,[[-.41,.16,.18],[-.02,.20,.22],[.16,.31,.28]],0,0,0,0x67507b);round(root,.17,.065,0,-.32,0,metal);round(root,.25,.06,0,.12,0,metal);
    const gemMaterial=new THREE.MeshStandardMaterial({color:0xc8b4ef,emissive:0x826ac0,emissiveIntensity:.75,vertexColors:true,flatShading:true});cut(root,[[.22,.11,.11],[.38,.40,.36],[.65,.31,.29],[.84,.04,.03]],0,0,0,0xddc5ff,gemMaterial);
    for(let i=0;i<16;i++){const a=i*Math.PI/8,ring=box(root,.052,.08,.19,Math.sin(a)*.39,.53+Math.cos(a)*.39,-.035,0xbca277);ring.rotation.z=-a;}
    for(const side of[-1,1]){box(root,.044,.12,.52,side*.17,.54,0,0xd9bf8a).rotation.y=side*.65;round(root,.068,.12,side*.39,.53,0,0xf0dab7);}root.userData.muzzleLocal=new THREE.Vector3(0,.54,-.20);
  }
  batch(root);root.scale.setScalar(scale);return root;
}
