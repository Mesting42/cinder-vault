import * as THREE from 'three';
import {characterArt} from './npc.js';
const {node,box,round,cut,batch}=characterArt;
const metal=0x93724a,edge=0xd6ba79,iron=0x253b3c,cloth=0x4a6260,glow=0x9ae7d8;

export function guardianModel(){
  const root=node(),body=node(root),arms=[],legs=[];root.name='oathbell-guardian';
  for(const side of [-1,1]){
    const leg=node(body,side*.64,1.08,0);legs.push(leg);
    cut(leg,[[-.82,.69,.96],[-.66,.67,1.02],[-.42,.47,.63],[.20,.51,.60],[.66,.60,.65]],0,0,-.07,iron);
    cut(leg,[[-.32,.56,.68],[.28,.63,.68],[.47,.47,.52]],0,0,-.13,metal);
    box(leg,.53,.10,.72,0,.24,-.05,edge);box(leg,.43,.19,.12,0,-.38,-.46,edge);
    batch(leg);leg.userData.animated=true;
  }
  cut(body,[[1.45,1.52,1.06],[1.88,1.70,1.17],[2.60,2.20,1.38],[3.30,2.12,1.24],[3.48,1.42,1.05]],0,0,0,iron);
  cut(body,[[1.55,1.58,.27],[2.0,1.88,.27],[3.13,1.98,.30],[3.40,1.44,.26]],0,0,-.65,metal);
  for(const side of [-1,1]){box(body,.16,1.40,.16,side*.73,2.50,-.82,edge).rotation.z=side*.16;box(body,.30,.80,.16,side*.83,1.37,-.14,cloth).rotation.z=-side*.14;}
  const clock=node(body,0,2.65,-.86),rotor=node(clock);round(clock,.51,.12,0,0,0,edge).rotation.x=Math.PI/2;round(clock,.40,.14,0,0,-.06,iron).rotation.x=Math.PI/2;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;box(clock,.05,.12,.06,Math.sin(a)*.34,Math.cos(a)*.34,-.14,edge).rotation.z=-a;}
  box(rotor,.075,.60,.07,0,.13,-.19,glow);box(rotor,.42,.06,.07,.15,0,-.20,edge);rotor.userData.animated=true;batch(clock);
  cut(body,[[3.38,.68,.59],[3.67,1.09,.88],[4.20,1.02,.84],[4.43,.58,.61]],0,0,-.07,metal);
  box(body,.85,.23,.14,0,3.99,-.52,iron);for(const side of [-1,1])box(body,.21,.075,.12,side*.23,4.00,-.62,glow);
  box(body,.54,.13,.18,0,3.61,-.48,edge);for(let i=0;i<4;i++)box(body,.06,.20,.12,-.18+i*.12,3.56,-.55,iron);
  for(const side of [-1,1]){const horn=node(body,side*.45,4.34,.0);cut(horn,[[0,.22,.23],[.43,.17,.19],[.65,.05,.08]],0,0,0,edge);horn.rotation.z=-side*.45;}
  for(const side of [-1,1]){
    const arm=node(body,side*1.31,3.06,0);arms.push(arm);
    cut(arm,[[-1.40,.46,.59],[-.48,.64,.72],[.13,.91,.87],[.34,.65,.68]],side*.12,0,0,metal);box(arm,.79,.13,.80,side*.13,-.43,0,edge);
    if(side<0){
      const shield=node(arm,-.23,-.53,-.30);cut(shield,[[-1.03,.86,.24],[-.77,1.19,.24],[.45,1.19,.28],[.88,.72,.23]],0,0,0,iron);
      for(const x of [-.49,.49])box(shield,.09,1.56,.12,x,-.04,-.19,edge);
      box(shield,1.01,.13,.15,0,.57,-.19,edge);box(shield,.14,1.54,.13,0,-.12,-.24,metal);
      box(shield,.43,.43,.13,0,.17,-.34,glow).rotation.z=Math.PI/4;
    }else{
      const cannon=node(arm,.18,-.75,-.53);
      round(cannon,.43,1.43,0,0,-.56,iron).rotation.x=Math.PI/2;
      for(const z of [.05,-.48,-1.16])round(cannon,.49,.13,0,0,z,metal).rotation.x=Math.PI/2;
      for(const x of [-.24,.24])box(cannon,.11,.10,1.03,x,.36,-.50,edge);
      round(cannon,.30,.12,0,0,-1.27,glow).rotation.x=Math.PI/2;round(cannon,.17,.14,0,0,-1.35,iron).rotation.x=Math.PI/2;
    }
    batch(arm);arm.userData.animated=true;
  }
  const pendulum=node(body,0,1.85,.67);box(pendulum,.12,1.30,.14,0,-.55,0,edge);round(pendulum,.39,.12,0,-1.14,0,metal).rotation.x=Math.PI/2;pendulum.userData.animated=true;batch(pendulum);
  batch(body);root.userData={body,arms,legs,rotor,pendulum,type:'boss'};return root;
}
