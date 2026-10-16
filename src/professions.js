import * as THREE from 'three';
import {classById} from './data.js';
import {talentLevel} from './expansion-data.js';
import {containsRoom} from './rooms.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a,b)=>Math.atan2(b.x-a.x,b.z-a.z);
const difference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

export const Professions={
  attackClear(from,to,ignore=null){
    const length=distance(from,to),steps=Math.ceil(length/.16);
    for(let i=1;i<steps;i++){
      const x=from.x+(to.x-from.x)*i/steps,z=from.z+(to.z-from.z)*i/steps;
      if(!containsRoom(this.room,x,z,0,false))return false;
      for(const o of this.room.objects)if(o!==ignore&&!o.destroyed&&o.shotBlock&&Math.abs(x-o.x)<o.hw+.025&&Math.abs(z-o.z)<o.hh+.025)return false;
    }
    return true;
  },
  scatterBullets(radius,aim=null,spread=Math.PI){
    const p=this.player,reflected=[];let count=0;
    this.bullets=this.bullets.filter(b=>{
      if(!b.enemy||distance(b,p)>radius||aim!==null&&Math.abs(difference(angle(p,b),aim))>spread||!this.attackClear(p,b))return true;
      if(p.classId==='warrior'&&aim!==null&&this.has('ricochet'))reflected.push({x:b.x,z:b.z,height:b.height,angle:aim,speed:26,damage:p.weapons.includes('stormpike')?12:8,range:22,kind:'bullet',color:0xff8d80,enemy:false,damageType:'physical',classId:'warrior'});
      this.particles(b.x,b.height||.9,b.z,aim===null?0x9ce9eb:0xffc382,2,.7);this.fxGroup.remove(b.mesh);this.disposeFx(b.mesh);count++;return false;
    });for(const b of reflected)this.projectile(b);return count;
  },
  slashVisual(aim,radius,color,life=.24,arc=1.05){
    const positions=[],p=this.player,segments=24;
    const point=(offset,r)=>{const a=aim+offset;return[Math.sin(a)*r,.77,Math.cos(a)*r];};
    for(let i=0;i<segments;i++){
      const a=-arc+i/segments*arc*2,b=-arc+(i+1)/segments*arc*2;
      let ra=radius,rb=radius;
      while(ra>.5&&!this.attackClear(p,{x:p.x+Math.sin(aim+a)*ra,z:p.z+Math.cos(aim+a)*ra}))ra-=.18;
      while(rb>.5&&!this.attackClear(p,{x:p.x+Math.sin(aim+b)*rb,z:p.z+Math.cos(aim+b)*rb}))rb-=.18;
      const innerA=point(a,Math.max(.3,ra-.30)),outerA=point(a,ra),innerB=point(b,Math.max(.3,rb-.30)),outerB=point(b,rb);
      positions.push(...innerA,...outerA,...innerB,...outerA,...outerB,...innerB);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.78,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));mesh.position.set(p.x,0,p.z);this.fxGroup.add(mesh);
    this.effects.push({mesh,life,maxLife:life,fade:true,ownedGeo:true});
  },
  meleeAttack(aim,skill=false){
    const p=this.player,w=this.weapon();
    if(!skill){p.combo=this.time-p.lastMelee<(this.has('mag')?1.35:1.05)?(p.combo||0)%3+1:1;p.lastMelee=this.time;p.fireCd=w.rate*(this.has('mag')?.80:1);p.shots++;p.swing=w.effect==='quake'?.52:w.id==='oathaxe'?.43:Math.min(.30,w.rate*.84);p.swingTotal=p.swing;p.swingAim=aim;}
    const heavy=skill||p.combo===3,quake=!skill&&heavy&&w.effect==='quake',radius=skill?4.6:quake?4.3:w.range,arc=skill?1.05:quake?Math.PI:w.arc??1.05,damage=(skill?(p.skillBranch==='breaker'?(talentLevel(p)===2?130:100):70):w.damage*(heavy?1.45:1))*(this.has('hot')?1.25:1);let hits=0;
    for(const e of this.room.enemies){
      if(e.dead||distance(p,e)>radius+e.radius*.45||Math.abs(difference(angle(p,e),aim))>arc||!this.attackClear(p,e))continue;
      const crit=this.has('crystal')&&this.rng.next()<.20;this.hitEnemy(e,damage*(crit?1.8:1),skill?'shock':'melee',crit,skill?null:w.id);hits++;
      const push=w.id==='oathaxe'||quake?(crit?1.25:.85):heavy?.60:.32;if(!e.dead&&e.type!=='boss')this.moveActor(e,Math.sin(angle(p,e))*push,Math.cos(angle(p,e))*push,e.radius,false);
    }
    for(const o of [...this.room.objects])if(!o.destroyed&&o.hp<9999&&distance(p,o)<radius+.25&&Math.abs(difference(angle(p,o),aim))<arc+.05&&this.attackClear(p,o,o))this.hitObject(o,damage);
    if(hits&&!skill)p.invul=Math.max(p.invul,.20);
    this.scatterBullets(radius+.30,aim,arc+.05);this.meleeWeaponVisual(w,aim,radius,arc,heavy,quake,skill);if(quake&&this.has('rollfire'))this.addHazard(p.x,p.z,3.2,2.5,0xd84638,true,{damageType:'physical',classId:'warrior',weaponId:w.id});this.afterMelee(w,aim,heavy,skill);
  },
  skill(){
    const p=this.player;if(this.state!=='playing'||p.rollTime>0)return;const profession=classById(p.classId);
    if(p.skillCd>0){this.ui.toast(`${profession.skill} · ${Math.ceil(p.skillCd)} 秒后就绪`,'',1000);return;}
    p.skillCd=profession.skillCd*(this.has('duskClock')?.75:1);p.skillFlash=.5;const branch=p.skillBranch,tier=talentLevel(p);
    if(p.classId==='shooter'){
      const w=this.weapon();p.ammo[w.id]=this.magSize(w);p.reload=0;p.fireCd=0;p.overload=branch==='barrage'?(tier===2?10:8):6;p.skillShots=0;const radius=branch==='bulwark'?(tier===2?8:6):3;if(branch==='bulwark'){this.grantSkillShield(tier);p.invul=Math.max(p.invul,tier===2?1.6:1);}this.scatterBullets(radius);this.classSkillVisual('overdrive',{radius:3});this.audio.play('overload');
      this.ui.toast('弹膛过载','立即装满；强化射速与装填，持续 '+p.overload+' 秒。',2200);
    }else if(p.classId==='mage'){
      const radius=branch==='glacier'?(tier===2?9:8):6,life=branch==='glacier'?(tier===2?6:5):4,damage=branch==='comet'?(tier===2?65:44):22,tickDamage=branch==='comet'?(tier===2?16:12):8;if(branch==='ward')this.grantSkillShield(tier);this.scatterBullets(radius);this.classSkillVisual('frostfield',{radius});this.audio.play('frost');
      const geometry=new THREE.RingGeometry(.22,radius,48),material=new THREE.MeshBasicMaterial({color:0x75cee9,transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),mesh=new THREE.Mesh(geometry,material);
      mesh.rotation.x=-Math.PI/2;mesh.position.set(p.x,.05,p.z);this.fxGroup.add(mesh);this.hazards.push({x:p.x,z:p.z,radius,life,damage:tickDamage,bulletSlow:branch==='ward'?(tier===2?.10:.20):.35,warning:0,kind:'frostfield',friendly:true,damageType:'magic',classId:'mage',tick:0,mesh,ownedGeo:true});
      for(const e of this.room.enemies)if(!e.dead&&distance(e,p)<radius+e.radius&&this.attackClear(p,e)){this.hitEnemy(e,damage,'frost');e.slow=life;if(e.type!=='boss')e.freeze=Math.max(e.freeze,1.25);}
      this.ui.toast('霜灯领域','冻结、减速与碎霜伤害，持续 '+life+' 秒。',2200);
    }else{
      const aim=angle(p,{x:this.aimPoint.x,z:this.aimPoint.z});p.invul=Math.max(p.invul,branch==='guardian'?(tier===2?2:1.5):1);if(branch==='guardian')this.grantSkillShield(tier);this.transitionCd=Math.max(this.transitionCd,.18);
      for(let i=0;i<Math.ceil((branch==='breaker'?(tier===2?5:4.2):3)/.12);i++){const moved=this.moveActor(p,Math.sin(aim)*.12,Math.cos(aim)*.12,.61,true);if(moved.blocked||moved.transitioned)break;}
      p.swing=.38;p.swingTotal=.38;p.swingAim=aim;p.fireCd=Math.max(p.fireCd,.30);this.scatterBullets(branch==='guardian'?(tier===2?11:9):7);this.meleeAttack(aim,true);this.classSkillVisual('cleave',{radius:4.6,aim});
      if(branch==='storm')for(let i=0;i<(tier===2?3:2);i++)this.aftershock(p.x,p.z,4.8+i*.55,tier===2?40:25,.45+i*.40);this.ui.toast('破阵震斩','突进、范围震斩与 1 秒保护。',1700);
    }
    this.ui.update();
  },
  skillRing(x,z,radius,color,life){
    const mesh=new THREE.Mesh(new THREE.RingGeometry(radius*.86,radius,48),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.1,z);this.fxGroup.add(mesh);this.effects.push({mesh,life,maxLife:life,fade:true,grow:1.2,ownedGeo:true});
  }
};
