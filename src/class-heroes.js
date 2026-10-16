import * as THREE from 'three';
import {characterArt} from './npc.js';
import {createCape} from './cape.js';
const {node,cut,box,round,piece,batch,fabric}=characterArt;
const navy=0x263947,dark=0x233039,ivory=0xd8d7c1,silver=0xbac9cc,teal=0x548c94,copper=0xbe6947,brass=0xd5a26e,skin=0xd1ab8d,leather=0x674b37;
const clothMaterial=fabric.clone();clothMaterial.side=THREE.DoubleSide;

function buildMageHero(makeWeapon){
  const root=node(),pivotHeight=1.50,rollPivot=node(root,0,pivotHeight,0),body=node(rollPivot,0,-pivotHeight,0),legs=[],arms=[];
  const robe=0x493064,robeShadow=0x302043,violet=0x8d61b7,lavender=0xd2b9ed,cloak=0x684889,
    hair=0x21182e,hairHi=0x382744,skinTone=0xe0b19c,lip=0xb96f91,metal=0xd6b56e;
  root.name='frost-lantern-sorceress';

  // A narrow waist and a long layered skirt establish the feminine silhouette
  // before any hair or colour cues are added.
  cut(body,[[.88,.34,.28],[1.12,.36,.30],[1.76,.45,.36],[2.08,.40,.34]],0,0,0,robe,fabric);
  cut(body,[[1.12,.31,.08],[1.78,.38,.10],[2.02,.34,.07]],0,0,-.29,violet,fabric);
  cut(body,[[.66,.25,.08],[.42,.43,.12],[-.20,.69,.17],[-.72,.91,.21],[-.86,.73,.17]],0,0,-.29,cloak,fabric);
  cut(body,[[.63,.07,.024],[.34,.11,.03],[-.46,.19,.04],[-.79,.14,.03]],0,0,-.405,lavender,fabric);
  // A second, brighter front layer flares from the waist to a visible hem;
  // this triangular line reads as a gown in the distant selection camera.
  cut(body,[[.72,.22,.035],[.38,.48,.05],[-.32,.86,.07],[-.78,1.10,.08]],0,0,-.475,0x79539f,fabric);
  cut(body,[[.70,.055,.018],[.31,.095,.022],[-.65,.15,.025]],0,0,-.535,lavender,fabric);
  for(const side of[-1,1]){
    const panel=cut(body,[[.62,.19,.07],[.31,.34,.11],[-.38,.53,.15],[-.77,.43,.13]],side*.25,0,-.12,robeShadow,fabric);
    panel.rotation.z=side*.04;panel.userData.animated=true;
  }
  box(body,.49,.085,.065,0,.72,-.38,lavender,fabric);
  box(body,.12,.23,.08,0,1.13,-.34,metal);
  box(body,.06,.16,.025,0,1.13,-.39,robeShadow);

  // Slender legs remain visible through the split robe and end in small boots.
  for(const side of[-1,1]){
    const leg=node(body,side*.19,.82,0);legs.push(leg);
    cut(leg,[[-.56,.17,.25],[-.08,.20,.28],[.35,.22,.30]],0,0,0,robeShadow,fabric);
    cut(leg,[[-.77,.20,.27],[-.57,.21,.28],[-.40,.20,.28]],0,0,0,hairHi,fabric);
    box(leg,.25,.06,.35,0,-.73,-.05,metal);
    cut(leg,[[-.54,.17,.10],[-.30,.20,.12],[-.18,.15,.10]],0,0,-.20,violet,fabric);
    box(leg,.25,.08,.36,0,-.47,-.02,lavender);
  }

  // Tapered sleeves, small hands and a narrow shoulder line replace the old
  // block-armour profile.  The forearms still use the existing pose system.
  for(const side of[-1,1]){
    const arm=node(body,side*.34,1.91,.01);arms.push(arm);
    cut(arm,[[-.40,.19,.25],[-.02,.22,.29],[.21,.25,.31]],0,0,0,robe,fabric);
    cut(arm,[[.03,.24,.31],[.22,.27,.33],[.34,.19,.25]],0,0,0,violet,fabric);
    box(arm,.10,.08,.025,0,.17,-.23,lavender);
    cut(arm,[[-.66,.16,.20],[-.42,.19,.23],[-.28,.18,.21]],0,0,-.08,cloak,fabric);
    box(arm,.18,.34,.23,0,-.53,-.02,lavender,fabric);
    box(arm,.08,.12,.08,-side*.10,-.72,-.23,skinTone);
  }

  // Neck, jaw and an open face are deliberately smaller than the old helmet-
  // like head.  The eyes, lashes and lips are kept on the front surface.
  round(body,.115,.22,0,2.19,0,skinTone);
  const head=node(body,0,2.54,-.025);head.scale.set(.88,.96,.88);
  cut(head,[[-.31,.24,.30],[-.17,.40,.42],[.10,.50,.47],[.28,.46,.38],[.34,.30,.28]],0,0,0,skinTone);
  // A small forward-facing face plate makes the eyes and jaw survive the
  // selector's low-poly lighting instead of collapsing into a dark helmet.
  cut(head,[[-.27,.18,.035],[-.12,.33,.045],[.10,.39,.05],[.25,.29,.04],[.30,.17,.03]],0,0,-.345,skinTone);
  for(const side of[-1,1]){
    cut(head,[[-.12,.10,.14],[.08,.12,.16]],side*.27,0,0,skinTone);
    const brow=box(head,.14,.022,.022,side*.14,.125,-.395,hair);brow.rotation.z=side*.15;
    const lash=box(head,.13,.020,.024,side*.14,.075,-.399,hair);lash.rotation.z=side*.15;
    round(head,.040,.020,side*.14,.067,-.419,0x9bd9e4);
  }
  cut(head,[[-.08,.10,.10],[.02,.13,.15],[.10,.08,.07]],0,0,-.325,skinTone);
  box(head,.10,.020,.024,0,-.155,-.402,lip);
  box(head,.06,.018,.022,0,-.176,-.408,0x713d62);
  // Back cap plus two long locks visibly reach the waist; they do not cover
  // the eyes and mouth like the former solid front hair block.
  const cap=cut(head,[[.08,.48,.39],[.31,.55,.44],[.48,.35,.32]],0,0,.08,hair,fabric);cap.name='sorceress-long-dark-hair';cap.userData.animated=true;
  for(const side of[-1,1]){
    const lock=cut(head,[[-1.10,.12,.14],[-.85,.20,.18],[-.22,.23,.20],[.24,.18,.15]],side*.29,0,.12,hairHi,fabric);
    lock.name=`sorceress-long-side-lock-${side<0?'l':'r'}`;lock.userData.animated=true;lock.rotation.z=side*.035;
    box(head,.10,.13,.06,side*.29,-1.10,.02,metal);
  }
  const braid=node(head,.33,-.09,.35);braid.name='sorceress-dark-braid';braid.userData.animated=true;
  for(let i=0;i<7;i++){
    const section=cut(braid,[[-.13,.07,.10],[0,.11,.14],[.12,.06,.10]],Math.sin(i*1.7)*.035,-i*.15,Math.sin(i)*.02,i%2?hairHi:hair);
    section.rotation.z=Math.sin(i*1.7)*.12;
  }
  box(braid,.10,.12,.06,0,-1.08,0,cloak,fabric);
  const circlet=box(head,.20,.024,.020,0,.25,-.39,0xc9a9df);circlet.rotation.z=.04;
  round(head,.045,.10,-.28,.12,-.33,0x9adbea);round(head,.045,.10,.28,.12,-.33,0x9adbea);

  const scarf=node(body,0,2.14,-.27);
  cut(scarf,[[0,.48,.14],[.18,.68,.16],[.31,.46,.13]],0,0,0,cloak,fabric);
  const ribbon=node(body,0,1.75,-.35);cut(ribbon,[[.12,.07,.025],[-.55,.13,.03],[-.94,.06,.02]],-.30,0,0,lavender,fabric);ribbon.userData.animated=true;
  const cape=node(body,0,1.55,.28);const capeMesh=createCape(cape,clothMaterial,cloak);capeMesh.scale.set(.70,1.16,.82);cape.rotation.z=-.08;
  const lamp=node(body,-.43,1.02,-.04);round(lamp,.15,.06,0,.16,0,metal);round(lamp,.16,.07,0,-.12,0,robeShadow);
  const lightMat=new THREE.MeshStandardMaterial({color:0xb5eff9,emissive:0x65cddd,emissiveIntensity:.9,roughness:.4,vertexColors:true,flatShading:true});
  cut(lamp,[[-.11,.14,.14],[.03,.19,.19],[.15,.12,.12]],0,0,0,0xc9f8ff,lightMat);for(const x of[-.12,.12])for(const z of[-.12,.12])box(lamp,.024,.30,.024,x,.03,z,metal);
  const weaponHome=new THREE.Vector3(.42,1.35,-.35),weapon=node(body,...weaponHome.toArray());weapon.add(makeWeapon('froststaff',.94));

  for(const part of[...legs,...arms,head,scarf,cape,weapon,ribbon])part.userData.animated=true;
  for(const part of[...legs,...arms,head,scarf,cape,weapon,ribbon])batch(part);
  batch(body);
  // The gown and long locks are wider than the old armored body.  Fold the
  // silhouette more tightly during the invulnerable roll so it stays inside
  // the same gameplay collision radius as the other two careers.
  root.userData={classId:'mage',gender:'female',body,rollPivot,head,legs,arms,arm:arms[1],armHome:[.18,.36],weapon,scarf,cape,bounds:new THREE.Box3(),pivotHeight,weaponHome,gunScale:.94,height:3.28,rollScale:new THREE.Vector3(.54,.39,.39)};
  return root;
}

export function buildClassHero(id,makeWeapon){
  if(id==='mage')return buildMageHero(makeWeapon);
  const mage=false,root=node(),pivotHeight=1.50,rollPivot=node(root,0,pivotHeight,0),body=node(rollPivot,0,-pivotHeight,0),legs=[],arms=[];
  root.name=mage?'frost-lantern-sorceress':'copper-vanguard';
  const robeColor=0x44305f,mageAccent=0x806499,mageTrim=0xc6b2d9,mageCloak=0x654783;
  // The mage uses a visibly narrower, higher-waisted silhouette than the
  // armored warrior.  Keep the proportions readable at the distant selector
  // camera instead of relying on color alone to communicate her identity.
  const broad=mage?.60:1.03,accent=mage?mageAccent:copper,trim=mage?mageTrim:brass;
  cut(body,[[1.03,mage?.62:.69,.40],[1.22,mage?.54:.79,mage?.43:.53],[1.92,broad,mage?.47:.59],[2.18,mage?.50:.65,.42]],0,0,0,mage?robeColor:dark,fabric);
  cut(body,[[1.26,mage?.45:.70,.11],[1.92,broad*.83,.12],[2.11,mage?.42:.60,.09]],0,0,-.315,accent);
  box(body,.20,.18,.045,0,1.74,-.414,trim).rotation.z=Math.PI/4;
  box(body,.09,.09,.025,0,1.74,-.451,mage?0xa978d8:dark).rotation.z=Math.PI/4;
  cut(body,[[1.06,mage?.61:.78,mage?.42:.57],[1.21,mage?.67:.84,mage?.46:.59]],0,0,0,leather);box(body,.21,.15,.06,0,1.14,-.33,trim);box(body,.095,.065,.02,0,1.14,-.371,dark);
  for(const side of[-1,1]){
    const leg=node(body,side*(mage?.205:.265),mage?.88:.84,0);legs.push(leg);
    cut(leg,mage?[[-.45,.19,.28],[.06,.235,.32],[.34,.25,.34]]:[[-.45,.26,.35],[.02,.32,.40],[.24,.35,.44]],0,0,0,mage?robeColor:dark,fabric);
    cut(leg,mage?[[-.69,.21,.27],[-.39,.24,.30],[-.20,.25,.31]]:[[-.69,.27,.33],[-.40,.30,.35],[-.25,.31,.36]],0,0,0,leather);
    cut(leg,mage?[[-.80,.29,.47],[-.68,.30,.51],[-.47,.23,.36]]:[[-.80,.37,.59],[-.68,.38,.62],[-.47,.28,.41]],0,0,-.06,dark);
    box(leg,mage?.29:.37,.052,mage?.47:.57,0,-.797,-.057,leather);
    cut(leg,mage?[[-.50,.18,.10],[-.32,.23,.13],[-.19,.18,.11]]:[[-.50,.23,.11],[-.32,.31,.16],[-.19,.22,.13]],0,0,-.22,accent);box(leg,.15,.042,.045,0,-.35,-.319,trim);
    box(leg,mage?.26:.33,.082,mage?.34:.41,0,-.53,-.02,trim);box(leg,.072,.13,.047,side*.12,-.53,-.245,accent);
    const arm=node(body,side*(mage?.43:.66),2.0,.02);arms.push(arm);
    cut(arm,[[-.37,mage?.20:.26,.26],[.03,mage?.25:.32,.32],[.15,mage?.27:.36,.34]],0,0,0,mage?robeColor:dark,fabric);
    cut(arm,[[.02,mage?.27:.34,.35],[.15,mage?.31:.41,.39],[.26,mage?.24:.29,.29]],0,0,0,accent);box(arm,.11,.082,.025,0,.11,-.254,trim);
    cut(arm,[[-.68,mage?.18:.23,.27],[-.42,mage?.20:.25,.29],[-.31,mage?.22:.27,.30]],0,0,-.045,mage?robeColor:dark,fabric);
    cut(arm,[[-.67,mage?.19:.24,.11],[-.43,mage?.24:.30,.13]],0,0,-.215,mage?mageCloak:copper);box(arm,mage?.21:.27,.09,mage?.30:.36,0,-.54,-.02,trim);
    cut(arm,[[-.81,mage?.18:.23,.20],[-.65,mage?.20:.26,.24]],0,0,-.22,leather);box(arm,.08,.12,.10,-side*.13,-.71,-.34,skin);
  }
  round(body,mage?.12:.15,mage?.20:.24,0,2.28,0,skin);
  const head=node(body,0,mage?2.66:2.54,-.03);
  cut(head,[[-.29,mage?.27:.29,.34],[-.16,mage?.43:.47,.46],[.14,mage?.58:.64,.54],[.28,mage?.53:.59,.47]],0,0,0,skin);
  for(const side of[-1,1]){
    cut(head,[[-.11,.12,.17],[.11,.14,.19]],side*.35,0,.0,skin);
    box(head,.17,.10,.037,side*.15,.048,-.338,0xe7ddca);box(head,.074,.087,.034,side*.16,.047,-.372,mage?0x72529a:dark);
    box(head,mage?.18:.20,mage?.025:.050,.051,side*.155,.151,-.328,mage?0x2a2138:0x4b3931).rotation.z=side*.16;
    if(mage){box(head,.19,.023,.034,side*.15,.087,-.373,0x3b304b).rotation.z=side*.08;box(head,.088,.018,.029,side*.22,-.08,-.326,0xd19493);}
  }
  cut(head,[[-.10,.11,.12],[.02,.14,.17],[.11,.06,.06]],0,0,-.335,skin);box(head,.12,.028,.039,0,-.20,-.31,0x956a57);
  if(mage){
    // Keep the forehead and jaw visible: the previous solid hair mass read as
    // a helmet at the selector distance.  Side locks frame the face instead.
    cut(head,[[.02,.46,.38],[.27,.54,.43],[.43,.40,.34],[.51,.18,.16]],0,0,.055,0x2a2038);
    for(const [x,y,w,depth,tilt] of [[-.28,.06,.14,.16,-.18],[-.15,.18,.15,.14,-.30],[.15,.18,.15,.14,.30],[.28,.06,.14,.16,.18]]){
      const lock=cut(head,[[-.25,w*.30,depth*.60],[0,w,depth],[.26,w*.93,depth*.9]],x,y,-.16,0x342842);lock.rotation.z=tilt;
    }
    for(const side of[-1,1]){
      const lock=cut(head,[[-.58,.10,.14],[-.34,.17,.20],[.02,.20,.24],[.20,.17,.27]],side*.30,0,.10,0x261e36);lock.rotation.z=side*.08;
      round(head,.048,.15,side*.33,-.24,-.05,silver);round(head,.054,.055,side*.33,-.19,-.05,0x9adbea);
    }
    const longHair=cut(head,[[-.85,.32,.16],[-.58,.42,.21],[-.20,.54,.24],[.27,.57,.26]],0,0,.28,0x201b32);longHair.name='sorceress-long-dark-hair';longHair.userData.animated=true;
    // Two long front locks fall from the temples to the waist.  They create a
    // distinctly feminine frame around the face even at the small preview
    // scale, while the rear hair remains a separate animated object.
    for(const side of[-1,1]){
      const fall=cut(head,[[-1.18,.13,.13],[-.88,.20,.18],[-.30,.24,.22],[.18,.18,.16]],side*.34,0,.14,0x261e36,fabric);
      fall.name=`sorceress-long-side-lock-${side<0?'l':'r'}`;fall.userData.animated=true;fall.rotation.z=side*.035;
      box(head,.12,.14,.06,side*.34,-1.17,.03,mageCloak,fabric);
    }
    const braid=node(head,.25,-.12,.42);braid.name='sorceress-dark-braid';
    for(let i=0;i<7;i++){const section=cut(braid,[[-.14,.08,.11],[0,.12,.15],[.13,.065,.11]],Math.sin(i*1.8)*.045,-i*.16,Math.sin(i*.9)*.025,i%2?0x382848:0x241d34);section.rotation.z=Math.sin(i*1.8)*.14;}
    box(braid,.10,.12,.07,0,-.99,0,mageCloak,fabric);
    // Small lashes, iris highlights and a muted rose lip make the face read
    // as a woman without leaving the low-poly art direction.
    for(const side of[-1,1]){
      const lash=box(head,.15,.022,.025,side*.15,.095,-.401,0x20152a);lash.rotation.z=side*.18;
      round(head,.035,.018,side*.15,.086,-.419,0x9adbea);
    }
    box(head,.11,.022,.024,0,-.20,-.374,0xb77998);
    box(head,.10,.19,.046,.34,.14,-.22,brass).rotation.z=-.18;box(head,.075,.086,.048,.34,.14,-.25,0x7ed5dd);
  }else{
    cut(head,[[-.29,.37,.085],[-.20,.55,.10],[-.095,.48,.07]],0,0,-.279,0x62473a);
    cut(head,[[.18,.85,.72],[.36,.80,.64],[.47,.52,.42]],0,0,.055,0x343232);
    for(let i=0;i<4;i++){const hair=cut(head,[[0,.18,.28],[.16,.20,.25],[.30,.02,.05]],-.24+i*.16,.29,.06,0x494241);hair.rotation.z=-.27+i*.10;}
    cut(head,[[.13,.88,.74],[.29,.91,.76],[.40,.78,.60]],0,0,.022,copper);box(head,.72,.042,.057,0,.19,-.38,brass);
    for(const side of[-1,1]){cut(head,[[-.14,.14,.36],[.26,.18,.41]],side*.39,0,.035,dark);const rivet=round(head,.105,.056,side*.48,.02,.03,brass);rivet.rotation.z=Math.PI/2;}
    box(head,.13,.15,.035,0,.27,-.378,brass);
  }
  const scarf=node(body,0,2.15,-.27),cape=node(body,0,mage?1.57:1.02,mage?.34:-.34);
  if(mage){
    cut(scarf,[[0,.70,.22],[.16,.91,.22],[.27,.59,.18]],0,0,0,mageCloak,fabric);box(scarf,.18,.31,.074,-.28,-.12,-.037,0x987cac,fabric);
    const mantle=cut(body,[[2.14,.82,.37],[2.31,.62,.34],[2.40,.31,.22]],0,0,.23,mageCloak,fabric);
    // A layered skirt gives the lower silhouette a clear robe line instead
    // of reading as a short armored tunic over square trousers.
    const frontRobe=cut(body,[[.68,.34,.08],[.45,.48,.11],[-.10,.68,.15],[-.70,.92,.18]],0,0,-.355,mageCloak,fabric);
    frontRobe.name='sorceress-long-front-robe';frontRobe.userData.animated=true;
    const frontTrim=cut(body,[[.67,.08,.025],[.38,.13,.03],[-.48,.20,.04],[-.68,.16,.03]],0,0,-.465,0xa978d8,fabric);
    frontTrim.name='sorceress-robe-trim';frontTrim.userData.animated=true;
    for(const side of[-1,1]){
      const panel=cut(body,[[.54,.20,.07],[.25,.34,.10],[-.37,.48,.14],[-.66,.38,.12]],side*.25,0,-.22,robeColor,fabric);
      panel.rotation.z=side*.055;panel.userData.animated=true;
    }
    box(body,.52,.075,.055,0,.71,-.35,mageTrim,fabric);
    const capeMesh=createCape(cape,clothMaterial,mageCloak);capeMesh.scale.set(.74,1.12,.86);cape.rotation.z=-.09;
    for(const side of[-1,1]){const robe=cut(body,[[.58,.22,.06],[.91,.31,.07],[1.14,.22,.055]],side*.21,0,-.29,robeColor,fabric);robe.rotation.z=side*.06;box(body,.035,.33,.025,side*.31,.77,-.333,mageTrim);}
    const sling=node(body,.13,1.76,-.419);sling.rotation.z=.40;box(sling,.12,.91,.045,0,0,0,leather);box(sling,.17,.16,.035,0,.07,-.038,brass);
    for(let i=0;i<3;i++){const gem=round(body,.065,.21,.20+i*.12,1.33,-.31,0x92dfe4);gem.rotation.x=.10;round(body,.076,.056,.20+i*.12,1.23,-.32,brass);}
    const lamp=node(body,-.50,1.04,-.045);round(lamp,.16,.065,0,.17,0,brass);round(lamp,.17,.07,0,-.12,0,dark);
    const lightMat=new THREE.MeshStandardMaterial({color:0xb5eff9,emissive:0x65cddd,emissiveIntensity:.9,roughness:.4,vertexColors:true,flatShading:true});cut(lamp,[[-.12,.15,.15],[.04,.20,.20],[.17,.13,.13]],0,0,0,0xc9f8ff,lightMat);
    for(const x of[-.13,.13])for(const z of[-.13,.13])box(lamp,.025,.31,.025,x,.03,z,brass);
  }else{
    // A short split tabard and arm shield replace the old artillery silhouette.
    for(const side of[-1,1]){const panel=cut(cape,[[-.23,.28,.064],[.22,.35,.080],[.33,.27,.062]],side*.19,0,0,0x9d4c37,fabric);panel.rotation.z=side*.10;box(cape,.10,.084,.024,side*.19,-.13,-.061,brass);}
    const shield=node(arms[0],-.055,-.43,-.18);cut(shield,[[-.39,.24,.13],[-.20,.43,.16],[.20,.47,.16],[.36,.25,.13]],0,0,0,copper);box(shield,.08,.58,.033,0,-.025,-.106,brass);box(shield,.25,.05,.036,0,-.04,-.12,brass);
    for(const side of[-1,1]){const shell=node(body,side*.26,1.74,.36);round(shell,.13,.61,0,0,0,dark);round(shell,.15,.084,0,-.17,0,brass);round(shell,.15,.10,0,.19,0,copper);cut(shell,[[.23,.26,.26],[.42,.02,.02]],0,0,0,copper);}
    for(const x of[-.47,.47]){cut(body,[[1.04,.22,.16],[1.35,.26,.19]],x,0,0,leather,fabric);box(body,.11,.07,.022,x,1.22,-.11,brass);}
  }
  const armHome=mage?[.18,.36]:[.16,.40];arms.forEach((arm,i)=>arm.rotation.x=armHome[i]);
  const weaponHome=new THREE.Vector3(mage?.53:.53,mage?1.39:1.36,mage?-.40:-.46),weapon=node(body,...weaponHome.toArray());weapon.add(makeWeapon(mage?'froststaff':'copperblade',mage?.94:.91));
  for(const part of[...legs,...arms,head,scarf,cape,weapon])part.userData.animated=true;
  for(const part of[...legs,...arms,head,scarf,cape])batch(part);batch(body);
  root.userData={classId:id,gender:mage?'female':'male',body,rollPivot,head,legs,arms,arm:arms[1],armHome,weapon,scarf,cape,bounds:new THREE.Box3(),pivotHeight,weaponHome,gunScale:mage?.94:.91,height:3.17,rollScale:new THREE.Vector3(mage?.78:.73,.55,.54)};
  return root;
}
