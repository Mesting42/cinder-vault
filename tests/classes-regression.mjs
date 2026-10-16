import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),checks=[],errors=[],consoleErrors=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
try{
  await mkdir('test-artifacts',{recursive:true});await page.goto(process.env.GAME_URL||'http://127.0.0.1:5188');await page.waitForFunction(()=>document.getElementById('menu').dataset.scene==='ready');
  await page.click('#start-btn');await page.waitForFunction(()=>window.__game?.state==='select');check('start opens a dedicated class selector',await page.evaluate(()=>window.__game.state==='select'&&!document.getElementById('class-screen').classList.contains('hidden')));
  for(const [index,id] of ['shooter','mage','warrior'].entries()){
    await page.keyboard.press(String(index+1));await page.waitForTimeout(350);
    check(`${id} keyboard selection shows its actual model and starting weapon`,await page.evaluate(id=>{const g=window.__game;return g.selectedClass===id&&g.hero.userData.classId===id&&document.querySelector(`[data-class=${id}]`).getAttribute('aria-pressed')==='true'&&g.hero.userData.weapon.children.length===1;},id));
    await page.screenshot({path:`test-artifacts/class-selection-${id}.png`});
  }
  await page.keyboard.press('Escape');check('class selection can return to the animated main menu',await page.evaluate(()=>window.__game.state==='menu'&&window.__cinderMenuScene&&document.getElementById('class-screen').classList.contains('hidden')));
  await page.click('#start-btn');await page.keyboard.press('2');await page.click('#class-confirm');check('class confirmation retains the descent entrance',await page.evaluate(()=>window.__game.state==='intro'&&window.__game.player.classId==='mage'));
  await page.waitForFunction(()=>window.__game.state==='playing');check('mage starts with its own health, mana and skill HUD',await page.evaluate(()=>{const g=window.__game,p=g.player;return p.hp===7&&p.shield===1&&p.weapons[0]==='froststaff'&&p.ammo.froststaff===12&&document.getElementById('skill-name').textContent==='霜灯领域'&&document.getElementById('ammo').textContent.includes('法力');}));
  await page.keyboard.press('q');check('Q triggers the frost field independently of the gadget',await page.evaluate(()=>{const g=window.__game;return g.hazards.some(h=>h.kind==='frostfield')&&g.player.skillCd>15&&g.player.activeCd===0;}));
  await page.keyboard.press('c');check('C triggers a separate gadget while the class skill cools down',await page.evaluate(()=>window.__game.player.activeCd>13&&window.__game.player.skillCd>14));
  await page.keyboard.press('b');check('build dossier shows the permanent skill and separate gadget',await page.locator('#modal-content').innerText().then(s=>s.includes('霜灯领域')&&s.includes('碎霜')&&s.includes('驱弹脉冲')));await page.keyboard.press('Escape');

  evidence.combat=await page.evaluate(async()=>{
    const g=window.__game;
    const reset=id=>{g.newGame(270021,id);g.finishEntrance();g.state='paused';g.clearCombat();g.room.objects=[];g.room.enemies=[];g.room.sealed=false;g.player.x=0;g.player.z=0;g.player.invul=0;g.transitionCd=100;g.input.keys.clear();g.input.down=false;};
    const enemy=(x,z)=>{const e=g.spawnEnemy('gunner',x,z);e.x=x;e.z=z;e.hp=e.maxHp=1000;e.timer=100;e.model.position.set(x,0,z);return e;};
    const bullet=(x,z)=>{g.projectile({x,z,angle:Math.PI/2,speed:10,damage:1,range:30,kind:'enemy',color:0xff7777,enemy:true});return g.bullets.at(-1);};
    const rows={};
    reset('shooter');g.player.ammo.revolver=1;g.reload();rows.reloadPassive=Math.abs(g.player.reloadTotal-.68)<1e-6;g.player.reload=0;g.state='playing';g.skill();rows.overloadFull=g.player.ammo.revolver===6&&g.player.overload===6;g.shoot(0);rows.overloadRate=Math.abs(g.player.fireCd-.138)<1e-6;g.player.ammo.revolver=1;g.reload();rows.overloadReload=Math.abs(g.player.reloadTotal-.442)<1e-6;
    reset('mage');const e=enemy(0,4.5);g.shoot(0);rows.dualIce=g.bullets.length===2&&g.bullets.every(b=>b.kind==='frost')&&g.player.ammo.froststaff===11;
    for(let i=0;i<3;i++)g.hitEnemy(e,9,'frost');rows.freeze=e.freeze>1;const before=e.hp;g.hitEnemy(e,10,'frost');rows.shatter=before-e.hp===13;
    const freezePos={x:e.x,z:e.z};g.updateEnemies(.08,.08);rows.freezeStops=e.x===freezePos.x&&e.z===freezePos.z;
    g.clearCombat();g.player.skillCd=0;g.state='playing';g.skill();rows.field=g.hazards.length===1&&g.hazards[0].kind==='frostfield'&&e.slow>=4&&e.freeze>=1.2;
    const b=bullet(4,1);const bx=b.x;g.updateBullets(.1,1);rows.fieldBulletSlow=Math.abs(b.x-bx-.35)<.001;
    const hp=e.hp;g.updateHazards(.1);rows.fieldDamage=e.hp<hp;g.updateHazards(4.1);rows.fieldExpires=!g.hazards.some(h=>h.kind==='frostfield');
    g.player.ammo.froststaff=0;g.player.reload=0;g.reload();g.update(1);rows.manaRestores=g.player.ammo.froststaff===12;
    reset('mage');g.loadFloor(2);g.finishEntrance();g.enterRoom(g.dungeon.rooms.find(r=>r.type==='boss').id);g.clearBossEntrance();g.room.objects=[];g.player.x=0;g.player.z=0;g.player.skillCd=0;g.skill();rows.bossResists=g.boss.freeze===0&&g.boss.slow===4;const timer=g.boss.timer;g.updateEnemies(.1,.1);rows.bossSlows=Math.abs(timer-g.boss.timer-.072)<.001;
    reset('warrior');const front=enemy(0,2.7),back=enemy(0,-2.7),far=enemy(0,5.7);const fb=bullet(1,2),bb=bullet(0,-2);g.shoot(0);rows.slashCone=front.hp===970&&back.hp===1000&&far.hp===1000;rows.slashBullets=!g.bullets.includes(fb)&&g.bullets.includes(bb);rows.hitProtection=g.player.invul>=.2;g.time+=.43;g.shoot(0);g.time+=.43;g.shoot(0);rows.thirdHit=front.hp===896&&g.player.combo===3;rows.noAmmo=g.player.ammo.copperblade===1;g.reload();rows.noReload=g.player.reload===0;
    reset('warrior');const cover={type:'column',x:0,z:1.4,hw:1,hh:.25,solid:true,shotBlock:true,hp:9999,destroyed:false};g.room.objects=[cover];const behind=enemy(0,2.7);g.shoot(0);rows.coverBlocks=behind.hp===1000;g.state='playing';g.player.skillCd=0;g.aimPoint.set(0,.85,6);g.skill();rows.dashBlocks=g.player.z<.55&&!g.isSolid(g.player.x,g.player.z,.39)&&behind.hp===1000;
    reset('warrior');const target=enemy(0,5.1);g.state='playing';g.aimPoint.set(0,.85,6);g.skill();rows.dash3m=Math.abs(g.player.z-3)<.001;rows.shock=target.hp===930&&g.player.invul>=1;
    reset('warrior');g.player.shield=0;g.room.sealed=true;g.update(.01);rows.shieldOnClear=g.player.shield===1;g.update(.01);rows.shieldDoesNotRepeat=g.player.shield===1;g.room.sealed=true;g.room.rewarded=false;g.update(.01);g.room.sealed=true;g.room.rewarded=false;g.update(.01);rows.shieldCap=g.player.shield===2;
    reset('mage');g.grant('active','turret',1);g.gainWeapon('stormrod');rows.lootPreservesClass=g.player.classId==='mage'&&g.player.weapons[0]==='froststaff'&&g.player.active==='turret';g.switchWeapon(0);rows.starterRecoverable=g.weapon().id==='froststaff';
    reset('shooter');g.room.objects=[{type:'column',x:0,z:0,hw:.7,hh:.7,solid:true,shotBlock:true,hp:9999,destroyed:false}];g.player.z=-1.71;g.updateHeroPose(0,0);const gunBox=new g.hero.userData.bounds.constructor().setFromObject(g.hero.userData.weapon.children[0],true);rows.weaponRetracts=gunBox.max.z<-.70&&g.hero.userData.weapon.scale.x<1;reset('mage');
    rows.exclusiveLoot=Array.from({length:120},()=>g.availableWeapon()).every(id=>id!=='froststaff'&&id!=='copperblade');
    g.enterRoom(g.dungeon.rooms.find(r=>r.type==='shop').id);rows.shopExclusive=g.room.objects.filter(o=>o.type==='offer').every(o=>o.item.id!=='froststaff'&&o.item.id!=='copperblade');
    for(const id of ['shooter','mage','warrior']){reset(id);g.player.skillCd=5;g.player.activeCd=8;g.loadFloor(2);g.finishEntrance();rows[`floor2_${id}`]=g.player.classId===id&&g.player.skillCd===5&&g.player.activeCd===8;}
    return rows;
  });for(const [name,passed] of Object.entries(evidence.combat))check(name,passed);

  evidence.models=await page.evaluate(async()=>{
    const g=window.__game,Box=g.hero.userData.bounds.constructor,rows=[],ROLL=.48;
    for(const id of ['shooter','mage','warrior']){
      g.newGame(270021,id);g.finishEntrance();g.state='paused';g.room.enemies=[];g.room.objects=[];g.room.sealed=false;g.transitionCd=100;g.player.x=0;g.player.z=0;g.hero.visible=true;g.updateHeroPose(0,0);
      for(let i=0;i<60;i++)g.animateWorld(.016);const bounds=new Box().setFromObject(g.hero,true),base={id,height:bounds.max.y-bounds.min.y,ground:bounds.min.y,legs:g.hero.userData.legs.length,arms:g.hero.userData.arms.length,cloth:!!g.hero.userData.cape.userData.cloth};
      let ground=Infinity,radius=0;
      for(const dt of [.01,.04])for(let direction=0;direction<8;direction++){
        const a=direction*Math.PI/4;g.player.x=0;g.player.z=0;g.player.rollCd=0;g.player.rollTime=0;g.aimPoint.set(Math.sin(a)*5,.85,Math.cos(a)*5);g.roll();
        while(g.player.rollTime>0){g.update(dt);g.time+=dt;g.animateWorld(dt);g.hero.updateMatrixWorld(true);if(g.player.rollTime<=0)continue;const box=new Box().setFromObject(g.hero,true);ground=Math.min(ground,box.min.y);g.hero.traverse(mesh=>{if(!mesh.isMesh)return;const attr=mesh.geometry.attributes.position;for(let i=0;i<attr.count;i++){const v=g.aimPoint.clone().fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld);radius=Math.max(radius,Math.hypot(v.x-g.player.x,v.z-g.player.z));}});}
      }
      rows.push({...base,rollGround:ground,rollRadius:radius});
    }
    return rows;
  });for(const row of evidence.models){check(`${row.id} has articulated anatomy and a grounded standing pose`,row.height>2.9&&row.ground>=.024&&row.legs===2&&row.arms===2);check(`${row.id} roll geometry stays above the floor`,row.rollGround>=.02);check(`${row.id} rolled silhouette fits the collision radius`,row.rollRadius<=1.0);}
  check('shooter and mage retain animated cloth',evidence.models.filter(r=>r.id!=='warrior').every(r=>r.cloth));
  await page.evaluate(()=>window.__game.openClassSelection());await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(300);
  check('desktop selection actions stay within the viewport',await page.locator('#class-confirm').evaluate(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}));await page.screenshot({path:'test-artifacts/class-selection-1280.png'});
  await page.setViewportSize({width:600,height:900});await page.waitForTimeout(300);check('narrow selection exposes all three choices and confirmation',await page.locator('#class-options').evaluate(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.bottom<innerHeight;}));await page.screenshot({path:'test-artifacts/class-selection-narrow.png'});
  check('no browser or rendering errors',errors.length===0&&consoleErrors.length===0);
  await writeFile('test-artifacts/classes-regression.json',JSON.stringify({status:'PASS',checks,errors,consoleErrors,evidence},null,2));
}catch(error){console.error(error);await page.screenshot({path:'test-artifacts/classes-failure.png'}).catch(()=>{});await writeFile('test-artifacts/classes-regression.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,consoleErrors,evidence},null,2));process.exitCode=1;}finally{await browser.close();}
