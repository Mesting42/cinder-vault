import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {generateFloor} from '../src/data.js';
import {containsRoom} from '../src/rooms.js';
import {TALENTS} from '../src/expansion-data.js';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),checks=[],errors=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
try{
 await mkdir('test-artifacts',{recursive:true});
 for(let seed=1;seed<=500;seed++){
  const d=generateFloor(seed,3),shapes=new Set(d.rooms.filter(r=>r.type==='combat').map(r=>r.shape));assert.equal(shapes.size,6);
  for(const r of d.rooms){assert(containsRoom(r,0,4,.61),`entrance ${seed}/${r.id}`);for(const dir of Object.keys(r.links)){const x=dir==='east'?r.w/2-2:dir==='west'?-r.w/2+2:0,z=dir==='south'?r.h/2-2:dir==='north'?-r.h/2+2:0;assert(containsRoom(r,x,z,.61),`door ${seed}/${r.id}/${dir}`);}}
 }
 check('500 final-floor seeds provide all six shapes and safe room entrances',true);
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5188');await page.click('#start-btn');await page.click('#class-confirm');await page.waitForFunction(()=>window.__game?.state==='playing');
 for(const classId of ['shooter','mage','warrior']){
  const branch=TALENTS[classId][0].id;
  await page.evaluate(classId=>{const g=window.__game;g.newGame(270021,classId);g.finishEntrance();g.player.invul=999;},classId);
  for(const floor of [1,2]){
   await page.evaluate(()=>{const g=window.__game;g.enterRoom(g.dungeon.rooms.find(r=>r.type==='exit').id);const o=g.room.objects.find(o=>o.type==='exit');g.player.x=o.x;g.player.z=o.z+1.8;});
   await page.keyboard.press('e');check(`${classId}: floor ${floor} elevator requires its own Boss`,await page.evaluate(f=>window.__game.floor===f&&!window.__game.floorBossDefeated[f],floor));
   await page.evaluate(()=>{const g=window.__game;g.enterRoom(g.dungeon.rooms.find(r=>r.type==='boss').id);g.hitEnemy(g.boss,10000);const o=g.room.objects.find(o=>o.type==='ascension');g.player.x=o.x;g.player.z=o.z+1.2;g.ui.update();});
   check(`${classId}: Boss ${floor} leaves a reachable skill altar and continues the run`,await page.evaluate(()=>{const g=window.__game;return g.state==='playing'&&g.closestInteraction()?.type==='ascension'&&!g.room.sealed;}));
   await page.keyboard.press('e');check(`${classId}: E opens three class-specific branch choices`,await page.locator('[data-talent]').count().then(n=>n===3));
   if(floor===1){await page.keyboard.press('Shift+Tab');check(`${classId}: talent keyboard focus wraps inside the dialog`,await page.evaluate(()=>document.activeElement.id==='talent-later'));await page.keyboard.press('Escape');check(`${classId}: postponing keeps the unclaimed altar`,await page.evaluate(()=>window.__game.state==='playing'&&!window.__game.room.objects.find(o=>o.type==='ascension').used));await page.keyboard.press('e');}
   await page.click(`[data-talent="${branch}"]`);
   check(`${classId}: reward ${floor} applies tier ${floor} once and resets skill cooldown`,await page.evaluate(({floor,branch})=>{const g=window.__game,p=g.player,o=g.room.objects.find(o=>o.type==='ascension');return p.skillBranch===branch&&p.skillTier===floor&&o.used&&p.skillCd===0&&!g.chooseTalent(o,branch);},{floor,branch}));
   await page.evaluate(()=>{const g=window.__game;g.enterRoom(g.dungeon.rooms.find(r=>r.type==='exit').id);const o=g.room.objects.find(o=>o.type==='exit');g.player.x=o.x;g.player.z=o.z+1.8;});await page.keyboard.press('e');
   check(`${classId}: unlocked elevator enters mandatory floor ${floor+1}`,await page.evaluate(f=>window.__game.floor===f+1&&window.__game.state==='intro',floor));
   await page.evaluate(()=>window.__game.finishEntrance());
  }
  check(`${classId}: floor 3 retains class, two rewards and upgraded skill`,await page.evaluate(c=>{const g=window.__game;return g.floor===3&&g.player.classId===c&&g.player.skillTier===2&&g.player.skillRewards.length===2&&g.roomVisual.theme==='black-sun'&&!g.dungeon.rooms.some(r=>r.type==='exit');},classId));
  const floorEvidence=await page.evaluate(()=>{const g=window.__game;g.enterRoom(g.dungeon.rooms.find(r=>r.type==='combat').id);g.state='paused';const enemies=g.room.enemies.every(e=>e.model.name.startsWith('eclipse-'));const o=g.room.objects.find(o=>o.type==='eclipseRune'),p=g.player;g.state='playing';p.x=o.x;p.z=o.z;p.hp=p.maxHp;p.shield=0;p.invul=0;o.ritualClock=4.5;g.updateHazards(.02);const warning=o.warning&&!o.active&&p.hp===p.maxHp;const hp=p.hp;o.ritualClock=5.6;g.updateHazards(.02);const active=o.active&&p.hp===hp-1;p.invul=.48;const before=p.hp;g.updateHazards(.02);const invulnerable=p.hp===before;g.time=0;g.updateEclipseEnvironment(0);const light=g.hemi.intensity;g.time=3;g.updateEclipseEnvironment(0);g.state='paused';return{enemies,warning,active,invulnerable,lighting:g.hemi.intensity<light&&g.hemi.intensity>=1.3};});
  for(const [name,value]of Object.entries(floorEvidence))check(`${classId}: final-floor ${name}`,value);
  const bossEvidence=await page.evaluate(()=>{const g=window.__game;g.enterRoom(g.dungeon.rooms.find(r=>r.type==='boss').id);g.state='paused';const e=g.boss;const model=e.model.name==='black-sun-arbiter'&&e.maxHp===2100&&e.profile.phases.length===3;const phases=[];for(const hp of [.9,.5,.2]){e.hp=e.maxHp*hp;g.updateBoss(e,0);phases.push(e.phase);}const patterns=[];for(let i=0;i<4;i++){g.clearEnemyBullets();g.hazards=[];e.timer=0;e.pattern=i;g.updateBoss(e,.01);patterns.push(i===0?g.bullets.length>15:i===1?g.hazards.filter(h=>h.kind==='blast').length===4:i===2?g.hazards.filter(h=>h.kind==='laser').length===4:g.room.enemies.some(n=>n.type!=='boss'&&!n.dead));}return{model,phases:phases.join(',')==='1,2,3',patterns:patterns.every(Boolean)};});
  for(const [name,value]of Object.entries(bossEvidence))check(`${classId}: final Boss ${name}`,value);
  await page.evaluate(()=>{const g=window.__game;g.state='playing';g.hitEnemy(g.boss,10000);});check(`${classId}: third Boss alone completes the run`,await page.evaluate(()=>window.__game.state==='victory'&&window.__game.stats.bosses===3));await page.waitForFunction(()=>window.__game.state==='result');
  check(`${classId}: final settlement names the third Boss and shows 3/3`,await page.locator('#result-content').innerText().then(s=>s.includes('黑日裁决者')&&s.includes('3 / 3')&&s.includes('三层通关')));
 }
 evidence.weapons=await page.evaluate(()=>{
  const g=window.__game,rows={};
  const reset=(id,w)=>{g.newGame(270021,id);g.finishEntrance();g.state='paused';g.clearCombat();g.room.objects=[];g.room.enemies=[];g.room.sealed=false;g.player.x=g.player.z=0;g.transitionCd=100;g.gainWeapon(w);g.aimPoint.set(0,0,10);g.updateHeroPose(0,0);};
  const enemy=(x,z)=>{const e=g.spawnEnemy('gunner',x,z);e.x=x;e.z=z;e.hp=e.maxHp=1000;e.model.position.set(x,0,z);e.timer=100;return e;};
  reset('shooter','sunburst');g.shoot(0);rows.sunburst=g.bullets.length===3;g.clearCombat();g.gainPassive('mag');g.shoot(0);rows.sunburstSynergy=g.bullets.length===6;
  reset('shooter','judgment');let e=enemy(0,4);g.shoot(0);const before=e.hp;g.hitEnemy(e,10);rows.judgment=e.markUntil>g.time&&before-e.hp===12;g.gainPassive('eclipseLens');g.player.ammo.judgment=5;g.shoot(0);const marked=e.hp;g.hitEnemy(e,20);rows.judgmentSynergy=e.markUntil===g.time+4&&marked-e.hp===27;
  reset('shooter','bloodhowitzer');e=enemy(0,3);g.shoot(0);g.updateBullets(.25,1);rows.bloodhowitzer=e.hp<1000&&g.hazards.some(h=>h.kind==='fire'&&h.life===3);g.clearCombat();g.gainPassive('bloodSeal');g.shoot(0);g.updateBullets(.25,1);rows.bloodhowitzerSynergy=g.hazards.some(h=>h.radius===3.8);
  reset('mage','sunorb');e=enemy(2,2);g.shoot(0);const x=e.x;g.updateBullets(.1,1);rows.sunorb=e.x<x&&e.slow>0;g.clearCombat();g.gainPassive('eclipseLens');e.x=4.4;e.z=1;g.shoot(0);g.updateBullets(.1,1);rows.sunorbSynergy=e.x<4.4;
  reset('mage','ritualstaff');e=enemy(0,4);let near=enemy(1.2,4);g.shoot(0);rows.ritualstaff=e.hp===983&&near.hp===992;g.gainPassive('crystal');const old=near.hp;g.shoot(0);rows.ritualstaffSynergy=near.hp<old-8;
  reset('mage','bloodfrost');e=enemy(0,3);near=enemy(1.5,3);g.hitEnemy(e,16,'frost',false,'bloodfrost');g.hitEnemy(e,16,'frost',false,'bloodfrost');rows.bloodfrost=e.freeze>0&&near.hp===988;g.gainPassive('bloodSeal');e.freeze=e.frost=0;near.hp=1000;g.hitEnemy(e,16,'frost',false,'bloodfrost');g.hitEnemy(e,16,'frost',false,'bloodfrost');rows.bloodfrostSynergy=near.hp===980;
  reset('warrior','eclipseglaive');e=enemy(0,-3);g.shoot(0);rows.eclipseglaive=e.hp<1000;g.time+=.55;g.shoot(0);g.time+=.55;g.shoot(0);rows.glaiveReturn=g.bullets.some(b=>b.weaponId==='eclipseglaive'&&b.kind==='orbit');g.gainPassive('ricochet');g.clearCombat();g.projectile({x:0,z:-2,angle:0,speed:5,damage:1,range:10,enemy:true});g.shoot(0);rows.glaiveSynergy=g.bullets.some(b=>!b.enemy)&&g.bullets.every(b=>!b.enemy);
  reset('warrior','bloodspear');e=enemy(0,5);g.player.hp=3;for(let i=0;i<6;i++){e.z=5;g.shoot(0);g.time+=.4;}rows.bloodspear=e.hp<1000&&g.player.hp===4;g.gainPassive('bloodSeal');for(let i=0;i<3;i++){e.z=5;g.shoot(0);g.time+=.4;}rows.bloodspearSynergy=g.player.hp===5;
  reset('warrior','judgmenthammer');e=enemy(0,-4.7);for(let i=0;i<3;i++){g.shoot(0);g.time+=1;}const hp=e.hp;g.updateHazards(.5);rows.judgmenthammer=hp===1000&&e.hp===970;g.clearCombat();g.gainPassive('eclipseLens');for(let i=0;i<3;i++){g.shoot(0);g.time+=1;}rows.hammerSynergy=g.hazards.filter(h=>h.kind==='aftershock').length===2;
  reset('shooter','sunburst');g.gainPassive('bloodSeal');e=enemy(0,3);for(let i=0;i<5;i++)g.hitEnemy(e,10);rows.bloodSeal=e.hp===938;
  g.gainPassive('duskClock');g.state='playing';g.skill();g.state='paused';rows.duskClock=g.player.skillCd===9.75;
  return rows;
 });for(const [name,value]of Object.entries(evidence.weapons))check(`new weapon/relic mechanic: ${name}`,value);
 evidence.talents=await page.evaluate(()=>{
  const g=window.__game,rows={};
  const reset=(c,branch,tier)=>{g.newGame(270021,c);g.finishEntrance();g.state='paused';g.clearCombat();g.room.objects=[];g.room.enemies=[];g.player.x=g.player.z=0;g.player.invul=0;g.transitionCd=100;g.player.skillBranch=branch;g.player.skillTier=tier;g.aimPoint.set(0,0,10);g.updateHeroPose(0,0);};
  const enemy=(x,z)=>{const e=g.spawnEnemy('gunner',x,z);e.x=x;e.z=z;e.hp=e.maxHp=1000;return e;};
  const cast=()=>{g.state='playing';g.skill();g.state='paused';};
  for(const tier of [1,2]){
   reset('shooter','barrage',tier);cast();g.shoot(0);rows[`barrage${tier}`]=g.player.overload===(tier===2?10:8)&&Math.abs(g.player.fireCd-.23*(tier===2?.38:.48))<.001;
   reset('shooter','marksman',tier);const e=enemy(0,4);cast();for(let i=0;i<4;i++)g.shoot(0);rows[`marksman${tier}`]=e.hp===1000-(tier===2?40:24);
   reset('shooter','bulwark',tier);const shield=g.player.shield;g.projectile({x:0,z:tier===2?7:5,angle:0,speed:5,damage:1,range:20,enemy:true});cast();rows[`bulwark${tier}`]=g.player.shield===shield+tier&&g.player.invul===(tier===2?1.6:1)&&g.bullets.every(b=>!b.enemy);
   reset('mage','glacier',tier);const far=enemy(0,tier===2?8.5:7.5);cast();const h=g.hazards.find(h=>h.kind==='frostfield');rows[`glacier${tier}`]=h.radius===(tier===2?9:8)&&h.life===(tier===2?6:5)&&far.hp===978;
   reset('mage','comet',tier);const target=enemy(0,3);cast();const initial=target.hp;g.updateHazards(.01);rows[`comet${tier}`]=initial===1000-(tier===2?65:44)&&target.hp===initial-Math.round((tier===2?16:12)*1.3);
   reset('mage','ward',tier);const initialShield=g.player.shield;cast();g.projectile({x:0,z:2,angle:0,speed:10,damage:1,range:20,enemy:true});g.updateBullets(.1,1);rows[`ward${tier}`]=g.player.shield===initialShield+tier&&Math.abs(g.bullets[0].z-(tier===2?2.1:2.2))<.001;
   reset('warrior','breaker',tier);const victim=enemy(0,7);cast();rows[`breaker${tier}`]=g.player.z>=(tier===2?4.9:4.1)&&victim.hp===1000-(tier===2?130:100);
   reset('warrior','guardian',tier);const guardShield=g.player.shield;g.projectile({x:tier===2?9:0,z:tier===2?4:10,angle:0,speed:5,damage:1,range:30,enemy:true});cast();rows[`guardian${tier}`]=g.player.shield===guardShield+tier&&g.player.invul===(tier===2?2:1.5)&&g.bullets.every(b=>!b.enemy);
   reset('warrior','storm',tier);const rear=enemy(0,0);cast();const old=rear.hp;const waves=g.hazards.length;g.updateHazards(1.3);rows[`storm${tier}`]=waves===(tier===2?3:2)&&old-rear.hp===(tier===2?120:50);
  }
  reset('warrior','guardian',2);g.player.shield=5;cast();g.player.skillCd=0;cast();rows.shieldCap=g.player.shield===6;
  g.newGame(123,'mage');g.finishEntrance();g.enterRoom(g.dungeon.rooms.find(r=>r.type==='boss').id);g.hitEnemy(g.boss,10000);let altar=g.room.objects.find(o=>o.type==='ascension');const invalid=!g.chooseTalent(altar,'guardian')&&!altar.used;g.chooseTalent(altar,'ward');g.loadFloor(2);g.finishEntrance();g.enterRoom(g.dungeon.rooms.find(r=>r.type==='boss').id);g.hitEnemy(g.boss,10000);altar=g.room.objects.find(o=>o.type==='ascension');g.chooseTalent(altar,'comet');const shield=g.player.shield;g.skill();g.state='paused';rows.switchBranch=invalid&&g.player.skillBranch==='comet'&&g.player.skillTier===1&&g.player.shield===shield&&g.hazards.some(h=>h.kind==='frostfield'&&h.damage===12&&h.bulletSlow===.35);
  g.newGame(123,'warrior');g.finishEntrance();rows.newRunResets=g.player.skillBranch===null&&g.player.skillTier===0&&g.player.skillRewards.length===0;
  return rows;
 });for(const [name,value]of Object.entries(evidence.talents))check(`skill branch: ${name}`,value);
 check('no browser runtime errors',errors.length===0);
 await writeFile('test-artifacts/black-sun-regression.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){await writeFile('test-artifacts/black-sun-regression.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,evidence},null,2));console.error(error);process.exitCode=1;}finally{await browser.close();}
