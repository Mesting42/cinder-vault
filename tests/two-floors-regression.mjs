import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),checks=[],errors=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));
const check=(name,ok)=>{assert(ok,name);checks.push(name);console.log('PASS',name);};
async function shot(name){await page.evaluate(()=>{const g=window.__game;g.state='paused';g.ui.update();document.getElementById('room-banner').style.opacity=0;document.getElementById('toast-stack').innerHTML='';});await page.waitForTimeout(450);await page.screenshot({path:`test-artifacts/${name}.png`});}

try{
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:5188');await page.click('#start-btn');await page.click('#class-confirm');
  for(const classId of ['shooter','mage','warrior']){
    await page.evaluate(classId=>{const g=window.__game;g.newGame(270021,classId);g.finishEntrance();const r=g.dungeon.rooms.find(r=>r.type==='exit');g.enterRoom(r.id);const o=g.room.objects.find(o=>o.type==='exit');g.player.x=o.x;g.player.z=o.z+1.8;g.player.invul=0;g.ui.update();},classId);
    await page.keyboard.press('e');
    check(`${classId}: locked elevator refuses early descent`,await page.evaluate(()=>{const g=window.__game;return g.floor===1&&g.state==='playing'&&!g.floorBossDefeated[1]&&g.room.objects.find(o=>o.type==='exit').locked;}));
    const guardian=await page.evaluate(()=>{const g=window.__game;g.enterRoom(g.dungeon.rooms.find(r=>r.type==='boss').id);g.state='paused';g.updateBoss(g.boss,0);g.ui.update();const e=g.boss;return{hp:e.maxHp,id:e.bossId,model:e.model.name,phases:e.profile.phases.length,sealed:g.room.sealed};});
    check(`${classId}: independent two-phase guardian seals the room`,guardian.hp===680&&guardian.id==='guardian'&&guardian.model==='oathbell-guardian'&&guardian.phases===2&&guardian.sealed);
    if(classId==='shooter'){evidence.guardian=guardian;await shot('guardian-floor1');}
    const patterns=await page.evaluate(()=>{
      const g=window.__game,e=g.boss;g.player.x=0;g.player.z=7;g.clearEnemyBullets();e.hp=e.maxHp*.4;g.updateBoss(e,.01);const phase=e.phase===2;
      const results=[];for(let n=0;n<4;n++){g.clearEnemyBullets();g.hazards=[];e.pattern=n;e.timer=0;e.charge=e.windup=0;g.updateBoss(e,.01);results.push(n<2?g.bullets.length>=8:n===2?g.hazards.filter(h=>h.kind==='blast').length===2:e.windup>0&&e.chargeAim!==undefined);}
      e.x=g.room.w/2-2;e.z=0;e.windup=0;e.charge=.6;e.chargeAim=Math.PI/2;g.updateBoss(e,.55);return{phase,patterns:results,wall:e.x<g.room.w/2-e.radius};
    });
    check(`${classId}: guardian phase change and four attack patterns`,patterns.phase&&patterns.patterns.every(Boolean));
    check(`${classId}: shield charge stops at the wall`,patterns.wall);
    const reward=await page.evaluate(()=>{const g=window.__game,p=g.player;p.hp=3;g.state='playing';const e=g.boss;g.hitEnemy(e,10000);const gate=g.dungeon.rooms.find(r=>r.type==='exit').objects.find(o=>o.type==='exit');return{state:g.state,bosses:g.stats.bosses,unlocked:!gate.locked,lamps:gate.model.userData.lamps.every(l=>l.parent&&l.material.color.getHex()===0x6ddfc9),cleared:g.room.cleared&&!g.room.sealed,hp:p.hp,loot:g.room.pickups.filter(p=>p.kind==='weapon').map(p=>p.id),classId:p.classId};});
    check(`${classId}: first Boss continues the run, heals and unlocks elevator`,reward.state==='playing'&&reward.bosses===1&&reward.unlocked&&reward.cleared&&reward.hp>=5);
    check(`${classId}: unlocked elevator lamps render green`,reward.lamps);
    // Use game-supplied weapon metadata through a real pickup, rather than relying on names in this fixture.
    const ownLoot=await page.evaluate(()=>{const g=window.__game;for(const p of g.room.pickups.filter(p=>p.kind==='weapon'))g.gainWeapon(p.id);return g.player.weapons.length>1;});
    check(`${classId}: guardian drops a usable class weapon`,reward.loot.length===1&&ownLoot);
    await page.evaluate(()=>{const g=window.__game;g.enterRoom(g.dungeon.rooms.find(r=>r.type==='exit').id);const o=g.room.objects.find(o=>o.type==='exit');g.player.x=o.x;g.player.z=o.z+1.8;});await page.keyboard.press('e');
    check(`${classId}: real E unlocks second-floor entrance`,await page.evaluate(()=>window.__game.floor===2&&window.__game.state==='intro'));
    await page.evaluate(()=>window.__game.finishEntrance());
    check(`${classId}: class, build and first victory persist`,await page.evaluate(classId=>{const g=window.__game;return g.player.classId===classId&&g.player.weapons.length>1&&g.floorBossDefeated[1]&&!g.floorBossDefeated[2]&&g.stats.bosses===1;},classId));
    if(classId==='shooter'){
      await shot('tomb-floor2');
      evidence.tomb=await page.evaluate(()=>{const g=window.__game;return{theme:g.roomVisual.theme,exterior:g.roomVisual.exterior.theme,shapes:[...new Set(g.dungeon.rooms.map(r=>r.shape))],coffins:g.room.objects.filter(o=>o.type==='sarcophagus').length};});
      check('tomb uses independent geometry, six shapes and burial exterior',evidence.tomb.theme==='catacombs'&&evidence.tomb.exterior==='buried-catacombs'&&evidence.tomb.shapes.length>=6&&evidence.tomb.coffins===2);
      const coffin=await page.evaluate(()=>{const g=window.__game,o=g.room.objects.find(o=>o.type==='sarcophagus');g.state='playing';g.player.x=o.x-1.6;g.player.z=o.z;return{x:o.x,z:o.z};});await page.keyboard.press('e');
      check('real E opens a stone coffin and releases burial loot',await page.evaluate(({x,z})=>{const g=window.__game,o=g.room.objects.find(o=>o.x===x&&o.z===z);return o.opened&&Math.abs(o.model.userData.lid.rotation.z)>1&&g.room.pickups.some(p=>p.kind==='coin');},coffin));
      const room=await page.evaluate(()=>{const g=window.__game;g.enterRoom(g.dungeon.rooms.find(r=>r.type==='combat'&&r.shape==='sepulcher').id);g.room.enemies.forEach(e=>{e.dead=true;e.model.visible=false;if(e.bar)e.bar.visible=false;});g.room.sealed=false;g.room.cleared=true;g.clearCombat();g.player.x=0;g.player.z=7;g.updateDoors();g.state='paused';return{holes:g.room.holes.length,curse:g.room.objects.filter(o=>o.type==='curse').length,skulls:g.room.objects.filter(o=>o.type==='sarcophagus').length};});
      check('double-well crypt has two physical pits, coffins and curse traps',room.holes===2&&room.curse===2&&room.skulls===2);await shot('tomb-sepulcher');
      const curse=await page.evaluate(()=>{const g=window.__game,o=g.room.objects.find(o=>o.type==='curse'),p=g.player;g.state='playing';p.x=o.x;p.z=o.z;p.hp=p.maxHp;p.shield=0;p.invul=0;o.curseClock=4.1;g.updateHazards(.02);const warning=o.warning&&!o.active&&p.hp===p.maxHp;const hp=p.hp;o.curseClock=4.91;g.updateHazards(.02);const damages=o.active&&p.hp===hp-1;p.invul=.48;o.curseClock=4.91;const before=p.hp;g.updateHazards(.02);return{warning,damages,invulnerable:p.hp===before};});
      for(const [name,value]of Object.entries(curse))check(`curse trap: ${name}`,value);
      const cursed=await page.evaluate(()=>{const g=window.__game,o=g.room.objects.find(o=>o.type==='sarcophagus');o.cursed=true;g.player.x=o.x-1.6;g.player.z=o.z;g.player.invul=2;g.interact();const e=g.room.enemies.find(e=>!e.dead);return{sealed:g.room.sealed,enemy:e?.model.name,opened:o.opened};});
      check('cursed coffin awakens a skeletal enemy and seals exits',cursed.sealed&&cursed.opened&&cursed.enemy?.startsWith('catacomb-'));
      await page.evaluate(()=>{const g=window.__game;for(const e of g.room.enemies)if(!e.dead)g.hitEnemy(e,10000);g.updateEnemies(.01,.01);});
      check('clearing awakened undead reopens the crypt',await page.evaluate(()=>!window.__game.room.sealed));
    }
    const final=await page.evaluate(()=>{const g=window.__game;g.enterRoom(g.dungeon.rooms.find(r=>r.type==='boss').id);g.state='paused';const e=g.boss;e.hp=e.maxHp*.5;g.updateBoss(e,.01);const p2=e.phase;e.hp=e.maxHp*.2;g.updateBoss(e,.01);g.ui.update();return{id:e.bossId,hp:e.maxHp,phases:e.profile.phases.length,p2,p3:e.phase,sealed:g.room.sealed};});
    check(`${classId}: final crypt Boss retains three distinct phases`,final.id==='bishop'&&final.hp===1450&&final.phases===3&&final.p2===2&&final.p3===3&&final.sealed);
    if(classId==='shooter')await shot('bishop-floor2');
    await page.evaluate(()=>{const g=window.__game;g.state='playing';g.hitEnemy(g.boss,10000);});
    check(`${classId}: second Boss continues toward the mandatory final floor`,await page.evaluate(()=>{const g=window.__game;return g.state==='playing'&&g.floorBossDefeated[1]&&g.floorBossDefeated[2]&&g.stats.bosses===2&&!g.bullets.some(b=>b.enemy)&&g.room.objects.some(o=>o.type==='ascension');}));
  }
  check('no browser runtime errors',errors.length===0);
  await writeFile('test-artifacts/two-floors-regression.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){await page.screenshot({path:'test-artifacts/two-floors-failure.png'});await writeFile('test-artifacts/two-floors-regression.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,evidence},null,2));console.error(error);process.exitCode=1;}finally{await browser.close();}
