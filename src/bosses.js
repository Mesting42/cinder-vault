import {TAU,bossForFloor,FLOORS} from './data.js';
import {bossModel,material} from './art.js';
import {guardianModel} from './guardian.js';
import {eclipseBossModel} from './expansion-models.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const aim=(a,b)=>Math.atan2(b.x-a.x,b.z-a.z);
export const Bosses={
  spawnBoss(){
    const profile=bossForFloor(this.floor),model=this.floor===1?guardianModel():this.floor===3?eclipseBossModel():bossModel(),e={id:`${profile.id}-${this.seed}`,bossId:profile.id,profile,type:'boss',x:0,z:-3,hp:profile.hp,maxHp:profile.hp,radius:profile.radius,timer:1.6,phase:1,age:0,pattern:0,hit:0,dead:false,model,freeze:0,slow:0,charge:0,windup:0};
    model.position.set(e.x,0,e.z);this.roomVisual.group.add(model);this.room.enemies.push(e);this.boss=e;this.audio.mode=this.floor===1?'guardian':this.floor===3?'eclipseBoss':'boss';this.player.invul=2;
  },
  defeatBoss(e){
    this.clearEnemyBullets();this.hazards=this.hazards.filter(h=>{if(h.friendly)return true;if(h.mesh){this.fxGroup.remove(h.mesh);this.disposeFx(h.mesh,true);}return false;});
    this.room.enemies.filter(n=>!n.dead&&n!==e).forEach(n=>this.killEnemy(n));this.explode(e.x,e.z,0,false,5);this.room.sealed=false;this.room.cleared=true;this.room.rewarded=true;this.updateDoors();
    this.floorBossDefeated[this.floor]=true;this.stats.bosses++;this.player.invul=Math.max(this.player.invul,2);this.shake=.85;this.hero.visible=true;
    if(this.floor<3){
      this.audio.mode=FLOORS[this.floor].music;this.audio.play('guardianBell');this.ui.banner(e.profile.name+'已倒下','靠近金色祭坛选择技能强化 / 下层升降机已解锁');this.ui.toast('技能强化祭坛已点亮','E 选择职业分支。带走战利品，进入'+FLOORS[this.floor+1].name+'。',6500);this.createAscension(e);
      this.player.hp=Math.min(this.player.maxHp,this.player.hp+2);this.player.keys++;if(this.player.classId==='warrior')this.player.shield=Math.min(2,this.player.shield+1);
      this.drop('weapon',this.availableWeapon(),e.x-1.6,e.z+1.3);this.drop('passive',this.availablePassive(),e.x+1.6,e.z+1.3);this.drop('coin',null,e.x,e.z+2.1,20);
      for(const r of this.dungeon.rooms)for(const o of r.objects)if(o.type==='exit'){o.locked=false;for(const lamp of o.model.userData.lamps||[])lamp.material=material(0x6ddfc9,.7);}
    }else{
      this.state='victory';this.ui.banner('黑日裁决者已陨落','RUN COMPLETE / 三位守关者已击败');this.audio.play('boss');this.shake=1.4;this.finish(true);
    }
    this.ui.update();
  },
  updateGuardian(e,dt){
    const old=e.phase;e.phase=e.hp/e.maxHp>.50?1:2;
    if(e.phase!==old){this.ui.banner('断誓狂钟','PHASE II / 钟卫的盾甲正在崩裂');this.audio.play('guardianBell');this.clearEnemyBullets();this.particles(e.x,2,e.z,0xa4e4ce,36,4);this.player.invul=.8;this.shake=.5;}
    if(e.windup>0){e.windup-=dt;if(e.windup<=0)e.charge=.55;}
    else if(e.charge>0){e.charge-=dt;this.moveActor(e,Math.sin(e.chargeAim)*12*dt,Math.cos(e.chargeAim)*12*dt,e.radius);this.particles(e.x,.2,e.z,0xc5bea2,2,1.3);}
    else{const tx=Math.sin(e.age*.43)*3.1,tz=-3+Math.sin(e.age*.32)*1.2;this.moveActor(e,(tx-e.x)*dt,(tz-e.z)*dt,e.radius);}
    e.model.position.set(e.x,.035+Math.sin(e.age*2)*.025,e.z);e.model.rotation.y=aim(e,this.player)+Math.PI;
    e.model.userData.rotor.rotation.z=-e.age*(e.phase===2?2.2:.85);e.model.userData.pendulum.rotation.z=Math.sin(e.age*3)*(e.phase===2?.42:.22);e.model.userData.arms.forEach((arm,i)=>arm.rotation.x=Math.sin(e.age*2.6+i)*.10);
    if(distance(e,this.player)<2.05)this.hurtPlayer(1);e.timer-=dt;if(e.timer>0||e.windup>0||e.charge>0)return;
    const a=aim(e,this.player),pattern=e.pattern++%4;
    if(pattern===0){this.enemyFan(e,a,e.phase===2?7:5,8.0,.20);if(e.phase===2)this.enemyFan(e,a+.32,3,5.4,.18);}
    if(pattern===1){const count=e.phase===2?24:18;for(let i=0;i<count;i++){const angle=e.age*.18+i*TAU/count;if(Math.abs(Math.atan2(Math.sin(angle-a),Math.cos(angle-a)))<.24)continue;this.projectile({x:e.x,z:e.z,angle,speed:e.phase===2?6.7:5.8,damage:1,range:45,enemy:true,color:0xa1d2b5});}}
    if(pattern===2){this.warningBlast(this.player.x,this.player.z,1.9,1.10,0xe5c27b);if(e.phase===2)this.warningBlast(this.player.x+3,this.player.z-1,1.6,1.35,0xe5c27b);this.ui.toast('钟鸣落击 · 离开金色预警圈','',1100);}
    if(pattern===3){e.windup=.78;e.chargeAim=a;this.beam(e.x,e.z,e.x+Math.sin(a)*7,e.z+Math.cos(a)*7,0xc9dfa9,.78,.055,.12);this.ui.toast('盾阵冲撞 · 避开钟卫正面','',1000);}
    e.timer=e.phase===2?1.65:2.10;this.audio.play('guardianBell');
  }
};
