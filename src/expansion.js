import {TAU,FLOORS} from './data.js';
import {TALENTS,talentFor,talentLevel} from './expansion-data.js';
import {roomPoint} from './rooms.js';
import {ascensionModel} from './eclipse.js';
import {damageContext} from './damage.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const aim=(a,b)=>Math.atan2(b.x-a.x,b.z-a.z);
const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export const Expansion={
  createAscension(enemy){
    if(this.room.objects.some(o=>o.type==='ascension'))return;
    const point=roomPoint(this.room,enemy.x,enemy.z+4,.9,(x,z)=>this.room.objects.some(o=>o.solid&&!o.destroyed&&Math.abs(x-o.x)<o.hw+1&&Math.abs(z-o.z)<o.hh+1));
    const model=ascensionModel();model.position.set(point.x,0,point.z);this.roomVisual.group.add(model);
    this.room.objects.push({type:'ascension',...point,model,rewardFloor:this.floor,hw:.9,hh:.9,hp:9999,solid:false,shotBlock:false,used:false});
  },
  chooseTalent(altar,id){
    const p=this.player,choice=TALENTS[p.classId].find(t=>t.id===id);
    if(!choice||!['playing','paused'].includes(this.state)||!this.room.objects.includes(altar)||altar.type!=='ascension'||altar.used||!this.floorBossDefeated[altar.rewardFloor]||p.skillRewards.includes(altar.rewardFloor))return false;
    p.skillTier=p.skillBranch===id?Math.min(2,p.skillTier+1):1;p.skillBranch=id;p.skillRewards.push(altar.rewardFloor);p.skillCd=0;altar.used=true;altar.model.scale.setScalar(.85);
    this.ui.closeModal();this.ui.update();this.ui.toast(choice.name+' · '+['','I','II'][p.skillTier],choice.desc[p.skillTier-1],5500);this.audio.play('loot');return true;
  },
  overloadRate(){const p=this.player;if(p.overload<=0)return 1;return p.skillBranch==='barrage'?(talentLevel(p)===2?.38:.48):.60;},
  grantSkillShield(count){this.player.shield=Math.min(6,this.player.shield+count);},
  extraShot(angle){const p=this.player;if(p.overload<=0||p.skillBranch!=='marksman')return;p.skillShots=(p.skillShots||0)+1;if(p.skillShots%4===0){this.hero.updateMatrixWorld(true);const gun=this.hero.userData.weapon.children[0],muzzle=gun.localToWorld(gun.userData.muzzleLocal.clone()),source=damageContext({classId:'shooter',weaponId:this.weapon().id,damageType:'physical'});this.fireBeam(muzzle.x,muzzle.z,angle,32,(talentLevel(p)===2?40:24)*(this.has('hot')?1.25:1),0xffc59b,false,false,muzzle.y,source.weaponId,source);}},
  afterWeaponHit(e,kind,weaponId,source={}){
    const p=this.player,origin=damageContext({classId:p.classId,weaponId,kind,...source});if(weaponId==='judgment'){e.markUntil=this.time+(this.has('eclipseLens')?4:2.5);this.skillRing(e.x,e.z,e.radius+.3,0xff918c,.2);}
    if(weaponId==='ritualstaff')this.relicBurst(e,1.7,8,false,origin);
    if(weaponId==='bloodspear'){p.bloodHits++;if(p.bloodHits%(this.has('bloodSeal')?3:6)===0){p.hp=Math.min(p.maxHp,p.hp+1);this.skillRing(p.x,p.z,1.2,0xff9390,.3);}}
    if(this.has('bloodSeal')&&kind!=='relic'){p.bloodSealHits++;if(p.bloodSealHits%5===0)this.relicBurst(e,2.2,12,true,origin);}
  },
  relicBurst(source,radius,damage,includeSource=false,context={damageType:'neutral'}){const origin=damageContext(context);this.skillRing(source.x,source.z,radius,0xffaaa0,.28);for(const n of this.room.enemies)if((includeSource||n!==source)&&!n.dead&&distance(source,n)<radius+n.radius&&this.attackClear(source,n))this.hitEnemy(n,damage,'relic',false,origin.weaponId,origin);},
  detonateProjectile(b){const source=damageContext(b);this.explode(b.x,b.z,b.damage,b.enemy,3.4,source);if(!b.enemy&&b.weaponId==='bloodhowitzer')this.addHazard(b.x,b.z,this.has('bloodSeal')?3.8:2.7,3,0xff7567,true,source);},
  pullSun(b,dt){if(b.weaponId!=='sunorb')return;const radius=this.has('eclipseLens')?5:3;for(const e of this.room.enemies)if(!e.dead&&distance(e,b)<radius&&this.attackClear(b,e)){e.slow=Math.max(e.slow,.3);if(e.type!=='boss'&&distance(e,b)>.6){const a=aim(e,b);this.moveActor(e,Math.sin(a)*dt*2.1,Math.cos(a)*dt*2.1,e.radius);}}},
  afterMelee(w,angle,heavy,skill){if(skill)return;const p=this.player;
    if(w.id==='eclipseglaive'&&heavy)this.projectile({x:p.x+Math.sin(angle),z:p.z+Math.cos(angle),angle,speed:22,damage:22*(this.has('hot')?1.25:1),range:28,kind:'orbit',spell:true,color:0xffc399,weaponId:w.id,damageType:'physical',classId:'warrior',enemy:false});
    if(w.id==='judgmenthammer'&&heavy){const source=damageContext({classId:p.classId,weaponId:w.id,damageType:'physical'});this.aftershock(p.x,p.z,4.5,30,.42,source);if(this.has('eclipseLens'))this.aftershock(p.x,p.z,5.3,30,.82,source);}
  },
  aftershock(x,z,radius,damage,delay,source={damageType:'physical',classId:'warrior'}){const origin=damageContext(source);this.skillRing(x,z,radius,0xffc698,delay);this.hazards.push({x,z,radius,damage:damage*(this.has('hot')?1.25:1),warning:delay,life:delay+.08,kind:'aftershock',friendly:true,...origin});},
  releaseAftershock(h){const source=damageContext(h);this.classSkillVisual('aftershock',{x:h.x,z:h.z,radius:h.radius});this.audio.play('hammer');for(const e of this.room.enemies)if(!e.dead&&distance(h,e)<h.radius+e.radius&&this.attackClear(h,e))this.hitEnemy(e,h.damage,'shock',false,source.weaponId,source);},
  updateEclipseEnvironment(dt){if(this.floor!==3)return;
    const dark=Math.sin(this.time*.48)>0;this.eclipseDark=dark;this.hemi.intensity=dark?1.35:2.0;
    for(const o of this.room.objects)if(o.type==='eclipseRune'){
      o.ritualClock=(o.ritualClock+dt)%6.4;o.warning=o.ritualClock>=4.4&&o.ritualClock<5.5;o.active=o.ritualClock>=5.5;
      const rune=o.model.userData.rune;rune.material.opacity=o.active?.95:o.warning?.55+Math.sin(this.time*22)*.20:.16;rune.material.color.setHex(o.active?0xff5c66:o.warning?0xffc07e:0xbf9b77);rune.position.y=o.active?.13:.05;
      if(o.active&&distance(this.player,o)<1.05)this.hurtPlayer(1);
    }
  },
  updateEclipseBoss(e,dt){
    const old=e.phase;e.phase=e.hp/e.maxHp>.68?1:e.hp/e.maxHp>.34?2:3;
    if(old!==e.phase){this.clearEnemyBullets();this.player.invul=Math.max(this.player.invul,1.2);this.ui.banner(e.profile.phases[e.phase-1],e.phase===2?'赤祭军团苏醒 / 金圈预警后爆发':'黑日降临 / 寻找日冕弹幕中的空隙');this.audio.play('boss');this.shake=.65;}
    const tx=Math.sin(e.age*.36)*4,tz=-3+Math.sin(e.age*.27)*2;this.moveActor(e,(tx-e.x)*dt,(tz-e.z)*dt,e.radius);
    e.model.position.set(e.x,.08+Math.sin(e.age*2)*.05,e.z);e.model.rotation.y=aim(e,this.player)+Math.PI;e.model.userData.halo.rotation.z=e.age*(e.phase===3?1.4:.4);e.model.userData.arms.forEach((a,i)=>a.rotation.x=Math.sin(e.age*3+i)*.15);
    if(distance(e,this.player)<2.1)this.hurtPlayer(1);e.timer-=dt;if(e.timer>0)return;
    const angle=aim(e,this.player),pattern=e.pattern++%4;
    if(pattern===0){const count=20+e.phase*4;for(let i=0;i<count;i++){const a=e.age*.22+i*TAU/count;if(Math.abs(delta(a,angle))<.30)continue;this.projectile({x:e.x,z:e.z,angle:a,speed:5.5+e.phase*.6,damage:1,range:50,enemy:true,color:0xffc184});}if(e.phase===3)this.enemyFan(e,angle,3,9,.18);}
    if(pattern===1){const n=e.phase+1;for(let i=0;i<n;i++){const point=roomPoint(this.room,this.player.x+(i-(n-1)/2)*3.8,this.player.z+(i%2?2:-1),2);this.warningBlast(point.x,point.z,2.3,1.2+i*.12,0xffbe8a);}this.ui.toast('赤祭爆发 · 离开金色预警圈','',1400);}
    if(pattern===2){for(let i=0;i<e.phase+1;i++)this.warningLaser(e.x,e.z,angle+(i-e.phase/2)*.33,1.15);this.ui.toast('终审光束 · 避开红色射线','',1400);}
    if(pattern===3){this.enemyFan(e,angle,5+e.phase*2,8.5,.16);if(e.phase>=2&&this.room.enemies.filter(n=>!n.dead&&n.type!=='boss').length<3){for(const side of[-1,1])this.spawnEnemy(e.phase===3?'mage':'charger',side*8,-7);}}
    e.timer=e.phase===1?2.3:e.phase===2?1.95:1.65;this.audio.play('rocket');
  }
};
