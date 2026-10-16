import * as THREE from 'three';
import {group,box,cylinder,glow,batchStatic} from './art.js';
const dark=0x24212b,gold=0xbc9865,red=0x963f42,white=0xe4d6b7;
export function expansionWeapon(id,scale=1){
 const g=group();g.name=id;const mage=['sunorb','ritualstaff','bloodfrost'].includes(id),warrior=['eclipseglaive','bloodspear','judgmenthammer'].includes(id);
 if(!mage&&!warrior){box(g,.17,.27,.31,0,-.02,.12,dark);box(g,.29,.28,.65,0,.18,-.20,red);box(g,.05,.06,.53,0,.36,-.22,gold);const rocket=id==='bloodhowitzer';
  for(const x of id==='sunburst'?[-.13,0,.13]:[0]){const barrel=cylinder(g,rocket?.18:.065,rocket?.18:.065,id==='judgment'?1.1:.62,x,.17,-.70,dark,8);barrel.rotation.x=Math.PI/2;const rim=cylinder(g,rocket?.21:.09,rocket?.21:.09,.07,x,.17,id==='judgment'?-1.25:-1.02,gold,8);rim.rotation.x=Math.PI/2;}
  if(id==='judgment'){box(g,.11,.17,.37,0,.44,-.28,dark);box(g,.13,.035,.31,0,.54,-.28,gold);}g.userData.muzzleLocal=new THREE.Vector3(0,.17,id==='judgment'?-1.32:-1.06);
 }else if(id==='bloodfrost'){box(g,.65,.20,.80,0,.11,-.10,red);box(g,.56,.09,.72,0,.24,-.10,white);box(g,.63,.04,.79,0,.30,-.10,dark);box(g,.06,.035,.45,0,.33,-.10,gold);box(g,.30,.035,.06,0,.33,-.10,gold);cylinder(g,.14,.14,.19,0,.49,-.10,0xef92cd,6,.6);g.userData.muzzleLocal=new THREE.Vector3(0,.58,-.10);
 }else if(mage){cylinder(g,.075,.085,1.0,0,.05,0,dark,8);for(const y of[-.35,.05,.42])cylinder(g,.11,.11,.06,0,y,0,gold,8);const halo=new THREE.Mesh(new THREE.TorusGeometry(id==='sunorb'?.35:.25,.044,5,16),new THREE.MeshStandardMaterial({color:gold,roughness:.45}));halo.position.y=.75;g.add(halo);cylinder(g,.20,.20,.20,0,.75,0,red,8,.4).rotation.x=Math.PI/2;for(const x of[-.28,.28])box(g,.06,.44,.09,x,.75,0,gold);g.userData.muzzleLocal=new THREE.Vector3(0,.85,-.1);
 }else{cylinder(g,.055,.075,id==='bloodspear'?2.35:1.0,0,.12,-(id==='bloodspear'?.90:.25),dark,8).rotation.x=Math.PI/2;for(const z of[0,-.24,-.49])box(g,.16,.14,.05,0,.12,z,gold);
  if(id==='bloodspear'){cylinder(g,0,.18,.64,0,.12,-2.31,white,4).rotation.x=-Math.PI/2;box(g,.06,.08,.52,0,.15,-2.20,red);g.userData.muzzleLocal=new THREE.Vector3(0,.12,-2.65);}
  else if(id==='eclipseglaive'){const ring=new THREE.Mesh(new THREE.TorusGeometry(.50,.075,5,18),new THREE.MeshStandardMaterial({color:white,metalness:.5,roughness:.6}));ring.position.set(0,.15,-.90);ring.rotation.x=Math.PI/2;g.add(ring);for(const x of[-.40,.40])box(g,.10,.13,.25,x,.15,-.93,red);g.userData.muzzleLocal=new THREE.Vector3(0,.12,-1.5);}
  else{box(g,.95,.48,.47,0,.13,-.94,dark);for(const x of[-.43,.43])box(g,.12,.53,.53,x,.13,-.94,gold);box(g,.18,.12,.50,0,.40,-.94,red);g.userData.muzzleLocal=new THREE.Vector3(0,.13,-1.25);}}
 batchStatic(g);g.scale.setScalar(scale);return g;
}
export function eclipseEnemy(type){const g=group();g.name='eclipse-'+type;
 if(type==='bat'){cylinder(g,.20,.34,.64,0,.72,0,dark,6);for(const side of[-1,1]){const wing=group(g,side*.25,.90,0);box(wing,.75,.06,.40,side*.33,0,0,red);box(wing,.85,.05,.06,side*.35,.02,-.18,gold);wing.userData.animated=true;g.userData['wing'+side]=wing;}box(g,.10,.06,.09,0,.88,-.23,0xffbd95,.8);}
 else{for(const x of[-.25,.25]){box(g,.27,.47,.38,x,.24,0,dark);box(g,.32,.20,.43,x,.55,0,gold);}cylinder(g,.46,.38,1.05,0,1.05,0,type==='mage'?red:dark,8);box(g,.52,.11,.12,0,1.21,-.45,gold);cylinder(g,.32,.39,.45,0,1.81,0,white,8);for(const x of[-.12,.12])box(g,.07,.06,.07,x,1.81,-.33,0xff746f,.8);
  for(const x of[-.53,.53]){box(g,.32,.26,.42,x,1.54,0,gold);box(g,.24,.63,.27,x,1.10,0,red);}if(type==='charger')box(g,.83,1.06,.16,-.64,1.10,-.3,dark);if(type==='turret'){box(g,1.25,.30,1.12,0,.17,0,gold);cylinder(g,.12,.12,1.0,0,1.22,-.6,dark,8).rotation.x=Math.PI/2;}if(type==='mage'){const halo=new THREE.Mesh(new THREE.TorusGeometry(.54,.045,5,16),new THREE.MeshStandardMaterial({color:gold}));halo.position.set(0,2.12,.1);g.add(halo);}else{const gun=expansionWeapon(type==='shotgun'?'sunburst':'judgment',.55);gun.position.set(.52,1.02,-.38);g.add(gun);}}
 batchStatic(g);return g;
}
export function eclipseBossModel(){const g=group();g.name='black-sun-arbiter';
 for(const x of[-.48,.48]){box(g,.44,.68,.57,x,.34,0,dark);box(g,.48,.12,.67,x,.12,-.13,gold);}cylinder(g,.89,.65,2.0,0,1.7,0,dark,8);box(g,.46,1.6,.15,0,1.8,-.74,red);for(const x of[-.55,.55])box(g,.12,1.9,.20,x,1.7,-.53,gold);cylinder(g,.45,.58,.69,0,3.07,0,white,8);box(g,.55,.26,.17,0,3.10,-.42,dark);for(const x of[-.15,.15])box(g,.08,.07,.08,x,3.18,-.53,0xffb99d,1.1);
 const halo=group(g,0,3.44,.34);const ring=new THREE.Mesh(new THREE.TorusGeometry(1.26,.11,6,32),new THREE.MeshStandardMaterial({color:gold,emissive:0x542a1b,emissiveIntensity:.3}));halo.add(ring);cylinder(halo,1.03,1.03,.10,0,0,0,0x09090e,32).rotation.x=Math.PI/2;for(let i=0;i<12;i++){const a=i*Math.PI/6,s=box(halo,.10,.46,.12,Math.sin(a)*1.40,Math.cos(a)*1.40,0,gold);s.rotation.z=-a;}halo.userData.animated=true;g.userData.halo=halo;
 const arms=[];for(const side of[-1,1]){const arm=group(g,side*1.04,2.47,0);box(arm,.58,.48,.69,0,0,0,gold);box(arm,.40,1.3,.48,side*.1,-.67,0,red);box(arm,.44,.34,.40,side*.12,-1.37,-.2,white);arm.userData.animated=true;arms.push(arm);}g.userData.arms=arms;batchStatic(g);return g;
}
