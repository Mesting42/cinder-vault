import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {WEAPONS,CLASSES,BOSSES} from '../src/data.js';

const checks=[],errors=[],consoleErrors=[],evidence={};
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
await mkdir('test-artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let page;
try{
  page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:5188');await page.click('#start-btn');await page.click('#class-confirm');await page.waitForFunction(()=>window.__game?.state==='playing');
  await page.evaluate(()=>{
    const g=window.__game;g.frame=()=>{};
    window.__damageHarness={
      reset(classId,weaponId){g.newGame(270021,classId);g.finishEntrance();g.state='paused';g.clearCombat();g.room.enemies=[];g.room.objects=[];g.room.sealed=false;g.player.x=0;g.player.z=0;g.player.invul=0;g.time=Math.max(1,g.time);g.transitionCd=999;g.input.keys.clear();g.input.down=false;g.gainWeapon(weaponId);g.player.weaponIndex=g.player.weapons.indexOf(weaponId);g.equip();g.player.combo=0;g.player.lastMelee=-10;g.updateHeroPose(0,0);},
      enemy(type,x,z){const e=g.spawnEnemy(type,x,z);e.x=x;e.z=z;e.hp=e.maxHp=1000;e.timer=1000;e.markUntil=0;e.model.position.set(x,0,z);return e;},
      muzzle(){g.hero.updateMatrixWorld(true);const gun=g.hero.userData.weapon.children[0];return gun.localToWorld(gun.userData.muzzleLocal.clone());},
      shadow(classId,weaponId){g.player.classId=classId;g.setHeroClass(classId,true);g.player.weapons=[weaponId];g.player.weaponIndex=0;g.player.ammo[weaponId]=g.weapon().mag;g.equip();g.updateHeroPose(0,0);},
      tickBullets(seconds){for(let t=0;t<seconds;t+=.02)g.updateBullets(.02,1);},
      snapshot(e){return{hp:e.hp,last:e.lastDamage&&{amount:e.lastDamage.amount,damageType:e.lastDamage.damageType,resistance:e.lastDamage.resistance,kind:e.lastDamage.kind,weaponId:e.lastDamage.weaponId}};}
    };
  });

  evidence.weapons=await page.evaluate(weapons=>{
    const g=window.__game,h=window.__damageHarness,rows=[];
    for(const w of weapons){h.reset(w.classOnly,w.id);const m=h.muzzle(),e=h.enemy('gunner',w.kind==='melee'?0:m.x,w.kind==='melee'?2.5:m.z+5);g.shoot(0);h.tickBullets(.60);rows.push({id:w.id,expected:w.classOnly==='mage'?'magic':'physical',...h.snapshot(e),projectileTypes:g.bullets.filter(b=>!b.enemy).map(b=>b.damageType)});}
    return rows;
  },WEAPONS);
  for(const row of evidence.weapons)check(row.id+' actual attack resolves the profession damage type',row.hp<1000&&row.last?.damageType===row.expected&&row.projectileTypes.every(t=>t===row.expected));

  evidence.attacks=await page.evaluate(()=>{
    const g=window.__game,h=window.__damageHarness,rows=[];
    for(const [classId,weaponId]of [['shooter','revolver'],['mage','froststaff'],['warrior','copperblade']])for(const type of ['gunner','turret','mage']){
      h.reset(classId,weaponId);const m=h.muzzle(),e=h.enemy(type,classId==='warrior'?0:m.x,classId==='warrior'?2.5:m.z+4);g.shoot(0);h.tickBullets(.35);rows.push({classId,type,damage:1000-e.hp,...h.snapshot(e)});
    }
    return rows;
  });
  for(const row of evidence.attacks){const expected={shooter:{gunner:14,turret:11,mage:15},mage:{gunner:18,turret:20,mage:14},warrior:{gunner:30,turret:24,mage:33}}[row.classId][row.type];check(row.classId+' starter hits '+row.type+' for the exact resisted attack damage',row.damage===expected);}

  evidence.skills=await page.evaluate(()=>{
    const g=window.__game,h=window.__damageHarness,rows=[];
    for(const classId of ['mage','warrior'])for(const type of ['gunner','turret','mage']){
      h.reset(classId,classId==='mage'?'froststaff':'copperblade');const e=h.enemy(type,0,classId==='warrior'?5:3);g.state='playing';g.aimPoint.set(0,.85,8);g.skill();g.state='paused';rows.push({classId,type,damage:1000-e.hp,...h.snapshot(e)});
    }
    h.reset('shooter','revolver');g.player.ammo.revolver=1;g.state='playing';g.skill();g.state='paused';const m=h.muzzle(),e=h.enemy('turret',m.x,m.z+4);g.shoot(0);h.tickBullets(.35);rows.push({classId:'shooter',type:'turret',damage:1000-e.hp,overload:g.player.overload,fireCd:g.player.fireCd,...h.snapshot(e)});
    return rows;
  });
  for(const row of evidence.skills){const expected=row.classId==='mage'?{gunner:22,turret:24,mage:18}[row.type]:row.classId==='warrior'?{gunner:70,turret:56,mage:77}[row.type]:11;check(row.classId+' skill path retains its type against '+row.type,row.damage===expected&&row.last?.damageType===(row.classId==='mage'?'magic':'physical'));}
  check('shooter overdrive retains standard physical damage while speeding the real attack cadence',evidence.skills.at(-1).overload===6&&Math.abs(evidence.skills.at(-1).fireCd-.23*.6)<1e-9);

  evidence.sources=await page.evaluate(()=>{
    const g=window.__game,h=window.__damageHarness,rows={};
    // Change both profession and equipped weapon after retaining a source
    // snapshot. This adversarial fixture detects reclassification at impact.
    h.reset('mage','stormrod');let e=h.enemy('gunner',0,5),secondary=h.enemy('mage',2,5);const magic={damageType:'magic',classId:'mage',weaponId:'stormrod'};h.shadow('shooter','revolver');g.fireBeam(0,0,0,20,19,0xffffff,true,false,1.6,'stormrod',magic);rows.magicChain={primary:h.snapshot(e),secondary:h.snapshot(secondary)};
    h.reset('shooter','laser');e=h.enemy('gunner',0,5);secondary=h.enemy('turret',2,5);const physical={damageType:'physical',classId:'shooter',weaponId:'laser'};h.shadow('mage','froststaff');g.fireBeam(0,0,0,20,13,0xffffff,true,false,1.6,'laser',physical);rows.physicalChain={primary:h.snapshot(e),secondary:h.snapshot(secondary)};
    h.reset('mage','embercodex');let m=h.muzzle();e=h.enemy('turret',m.x,m.z+6);g.shoot(0);const magicRocket={...g.bullets[0]};h.shadow('shooter','revolver');h.tickBullets(.50);rows.magicExplosion={source:{damageType:magicRocket.damageType,weaponId:magicRocket.weaponId},target:h.snapshot(e)};
    h.reset('shooter','rocket');m=h.muzzle();e=h.enemy('turret',m.x,m.z+6);g.shoot(0);h.shadow('mage','froststaff');h.tickBullets(.50);rows.physicalExplosion=h.snapshot(e);
    h.reset('shooter','bloodhowitzer');m=h.muzzle();e=h.enemy('mage',m.x,m.z+6);g.shoot(0);h.shadow('mage','froststaff');h.tickBullets(.50);const fire=g.hazards.find(n=>n.kind==='fire'),before=e.hp;g.updateHazards(.02);rows.physicalDot={source:fire&&{damageType:fire.damageType,classId:fire.classId,weaponId:fire.weaponId},tick:before-e.hp,target:h.snapshot(e)};
    h.reset('mage','embercodex');g.gainPassive('rollfire');m=h.muzzle();e=h.enemy('turret',m.x,m.z+6);g.shoot(0);h.tickBullets(.50);const arcaneFire=g.hazards.find(n=>n.kind==='fire'),beforeMagic=e.hp;h.shadow('shooter','revolver');g.updateHazards(.02);rows.magicDot={source:arcaneFire&&{damageType:arcaneFire.damageType,classId:arcaneFire.classId,weaponId:arcaneFire.weaponId},tick:beforeMagic-e.hp,target:h.snapshot(e)};
    h.reset('mage','froststaff');e=h.enemy('turret',0,3);g.state='playing';g.skill();g.state='paused';h.shadow('shooter','revolver');const beforeFrost=e.hp;g.updateHazards(.02);rows.magicField={tick:beforeFrost-e.hp,target:h.snapshot(e),source:g.hazards.find(n=>n.kind==='frostfield')?.damageType};
    h.reset('mage','ritualstaff');e=h.enemy('gunner',0,3);secondary=h.enemy('mage',1.2,3);h.shadow('shooter','revolver');g.relicBurst(e,1.7,8,false,{damageType:'magic',classId:'mage',weaponId:'ritualstaff'});rows.magicRelic=h.snapshot(secondary);
    h.reset('mage','froststaff');g.gainPassive('bloodSeal');e=h.enemy('gunner',0,3);secondary=h.enemy('mage',1.2,3);h.shadow('shooter','revolver');for(let i=0;i<5;i++)g.hitEnemy(e,1,'bullet',false,'froststaff',{damageType:'magic',classId:'mage',weaponId:'froststaff'});rows.inheritedBloodSeal=h.snapshot(secondary);
    h.reset('warrior','stormpike');g.gainPassive('ricochet');g.projectile({x:0,z:2,angle:Math.PI,speed:5,damage:1,range:10,enemy:true,kind:'enemy'});g.scatterBullets(3,0,1);const reflected=g.bullets.find(b=>!b.enemy);e=h.enemy('mage',reflected.x,reflected.z+2);h.shadow('mage','froststaff');h.tickBullets(.20);rows.reflection={source:{damageType:reflected.damageType,classId:reflected.classId},target:h.snapshot(e)};
    h.reset('mage','froststaff');e=h.enemy('turret',0,4);g.player.active='turret';g.player.activeCd=0;g.active();g.updateTurrets(0);const turretShot=g.bullets[0];h.shadow('mage','moonorb');h.tickBullets(.20);rows.turret={source:{damageType:turretShot.damageType,classId:turretShot.classId},target:h.snapshot(e)};
    h.reset('warrior','judgmenthammer');e=h.enemy('turret',0,4);g.aftershock(0,0,4.5,30,.42,{damageType:'physical',classId:'warrior',weaponId:'judgmenthammer'});h.shadow('mage','froststaff');g.updateHazards(.5);rows.aftershock=h.snapshot(e);
    h.reset('warrior','eclipseglaive');e=h.enemy('mage',0,6);g.player.combo=2;g.player.lastMelee=g.time;g.shoot(0);const blade=g.bullets.find(b=>b.weaponId==='eclipseglaive');h.shadow('mage','froststaff');h.tickBullets(.35);rows.returningBlade={source:{damageType:blade.damageType,spell:blade.spell,arcaneModel:!!blade.mesh.userData.spell},target:h.snapshot(e)};
    h.reset('mage','froststaff');e=h.enemy('turret',0,2);g.blank();rows.blank=h.snapshot(e);g.explode(0,2,45,false,3.4);rows.environment=h.snapshot(e);
    h.reset('shooter','revolver');e=h.enemy('turret',0,4);g.hitEnemy(e,1,'bullet',false,'revolver');rows.chip=h.snapshot(e);
    return rows;
  });
  const s=evidence.sources;
  check('magic beam and chain retain the original staff type after class and weapon changes',s.magicChain.primary.last?.damageType==='magic'&&s.magicChain.secondary.last?.damageType==='magic'&&s.magicChain.secondary.last.amount===10&&s.magicChain.secondary.last.weaponId==='stormrod');
  check('physical beam and chain remain physical after equipping a staff',s.physicalChain.secondary.last?.damageType==='physical'&&s.physicalChain.secondary.last.amount===7);
  check('magic projectile explosion inherits its captured staff source',s.magicExplosion.source.damageType==='magic'&&s.magicExplosion.target.last?.damageType==='magic'&&s.magicExplosion.target.last.amount===44&&s.magicExplosion.target.last.weaponId==='embercodex');
  check('physical rocket explosion does not become magical after a class change',s.physicalExplosion.last?.damageType==='physical'&&s.physicalExplosion.last.amount===38);
  check('physical burning damage retains the originating howitzer',s.physicalDot.source?.damageType==='physical'&&s.physicalDot.source.weaponId==='bloodhowitzer'&&s.physicalDot.target.last?.damageType==='physical'&&s.physicalDot.tick===7);
  check('magic burning damage retains its original spell source',s.magicDot.source?.damageType==='magic'&&s.magicDot.source.weaponId==='embercodex'&&s.magicDot.target.last?.damageType==='magic'&&s.magicDot.tick===7);
  check('frost field ticks retain magic and the original mage frozen-target multiplier',s.magicField.source==='magic'&&s.magicField.target.last?.damageType==='magic'&&s.magicField.tick===11);
  check('ritual staff secondary relic damage inherits magic source metadata',s.magicRelic.last?.damageType==='magic'&&s.magicRelic.last.amount===6&&s.magicRelic.last.weaponId==='ritualstaff');
  check('blood seal proc inherits the triggering hit type rather than current profession',s.inheritedBloodSeal.last?.damageType==='magic'&&s.inheritedBloodSeal.last.amount===10);
  check('warrior reflections remain physical after equipping a magic weapon',s.reflection.source.damageType==='physical'&&s.reflection.source.classId==='warrior'&&s.reflection.target.last?.damageType==='physical'&&s.reflection.target.last.amount===13);
  check('mage deployed turret still fires physical ammunition',s.turret.source.damageType==='physical'&&s.turret.target.last?.damageType==='physical'&&s.turret.target.last.amount===7);
  check('delayed warrior aftershock retains physical source and weapon id',s.aftershock.last?.damageType==='physical'&&s.aftershock.last.amount===24&&s.aftershock.last.weaponId==='judgmenthammer');
  check('returning warrior blade is physical in both visuals and damage despite legacy spell flag',s.returningBlade.source.damageType==='physical'&&s.returningBlade.source.spell&&!s.returningBlade.source.arcaneModel&&s.returningBlade.target.last?.damageType==='physical'&&s.returningBlade.target.last.amount===24);
  check('blank and environmental explosion bypass physical and magic resistance',s.blank.last?.damageType==='neutral'&&s.blank.last.amount===25&&s.environment.last?.damageType==='neutral'&&s.environment.last.amount===45);
  check('one point physical damage remains a real hit against armor',s.chip.last?.amount===1&&s.chip.hp===999);

  evidence.numbers=await page.evaluate(()=>{
    const g=window.__game,h=window.__damageHarness,rows=[];
    for(const [classId,weaponId,crit,color]of [['shooter','revolver',false,'#ff756b'],['shooter','revolver',true,'#ffa198'],['mage','froststaff',false,'#cd8bff'],['mage','froststaff',true,'#efd0ff']]){
      h.reset(classId,weaponId);g.settings.accessibility.damageNumbers=true;const e=h.enemy('gunner',0,4);g.hitEnemy(e,10,'bullet',crit,weaponId);const sprite=g.effects.find(f=>f.damageNumber)?.mesh,canvas=sprite.material.map.image,pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,expected=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));let exactPixel=false;
      for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]===255&&expected.every((v,c)=>pixels[i+c]===v)){exactPixel=true;break;}
      rows.push({classId,crit,color,actual:sprite.userData.damageNumber,exactPixel});
    }
    g.clearCombat();g.settings.accessibility.damageNumbers=false;g.damageNumber(0,2,0,50,false,'magic');const disabled=!g.effects.some(e=>e.damageNumber);g.settings.accessibility.damageNumbers=true;return{rows,disabled};
  });
  for(const row of evidence.numbers.rows)check(row.classId+(row.crit?' critical':' regular')+' damage sprite contains its exact type color',row.actual.color===row.color&&row.actual.damageType===(row.classId==='mage'?'magic':'physical')&&row.actual.crit===row.crit&&row.exactPixel);
  check('damage number accessibility switch suppresses the new colored numbers',evidence.numbers.disabled);

  evidence.details=[];
  for(const c of CLASSES){const row=await page.evaluate(c=>{const g=window.__game;window.__damageHarness.reset(c.id,c.weapon);g.ui.build();const text=document.getElementById('modal-content').innerText;g.ui.closeModal();return{id:c.id,text};},c);evidence.details.push(row);check(c.id+' equipment details explain damage type and counterplay',row.text.includes(c.id==='mage'?'魔法伤害':'物理伤害')&&row.text.includes('物理减伤 20%')&&row.text.includes('魔法减伤 20%')&&row.text.includes('易伤 10%')&&row.text.includes('空包弹无视'));}

  // These are controlled damage-viability checks, not survival playthroughs.
  // Boss AI is paused; real HP, player stats, standard cooldowns, magazines,
  // reloads, hit detection, status multipliers and skill damage remain active.
  evidence.bossViability=await page.evaluate(({classes,bosses})=>{
    const g=window.__game,rows=[],originalEnemies=g.updateEnemies;
    try{
      g.updateEnemies=dt=>{for(const e of g.room.enemies)if(!e.dead&&e.type==='boss'){e.age+=dt;e.phase=e.bossId==='guardian'?(e.hp/e.maxHp>.5?1:2):e.bossId==='eclipse'?(e.hp/e.maxHp>.68?1:e.hp/e.maxHp>.34?2:3):(e.hp/e.maxHp>.66?1:e.hp/e.maxHp>.33?2:3);}};
      for(const c of classes){
        g.newGame(270021,c.id);g.finishEntrance();
        for(let floor=1;floor<=3;floor++){
          if(floor>1){g.loadFloor(floor);g.finishEntrance();}g.enterRoom(g.dungeon.rooms.find(r=>r.type==='boss').id);const boss=g.boss,initialHp=boss.hp,initialMax=boss.maxHp,damage=g.weapon().damage,maxHp=g.player.maxHp,startShots=g.player.shots;let casts=0,steps=0;
          g.room.enemies=g.room.enemies.filter(e=>e===boss);g.input.keys.clear();g.input.down=false;g.transitionCd=999;
          while(!boss.dead&&steps<7200){
            const p=g.player,dt=.05,distance=c.id==='warrior'?3.1:6;p.x=boss.x;p.z=boss.z+distance;g.aimPoint.set(boss.x,.85,boss.z);const screen=g.screenPoint(boss.x,boss.z,.85);g.input.mx=screen.x;g.input.my=screen.y;g.updateHeroPose(Math.PI,0);g.state='playing';
            if(p.skillCd<=0){g.skill();casts++;}
            if(p.fireCd<=0&&p.reload<=0)g.shoot(Math.atan2(boss.x-p.x,boss.z-p.z));
            g.time+=dt;g.update(dt);g.updateEffects(dt);steps++;
          }
          rows.push({classId:c.id,floor,bossId:boss.bossId,initialHp,initialMax,expectedHp:bosses[floor-1].hp,dead:boss.dead,seconds:steps*.05,shots:g.player.shots-startShots,casts,weapon:g.weapon().id,damageUnchanged:g.weapon().damage===damage,playerMaxHpUnchanged:g.player.maxHp===maxHp,passives:g.player.passives.slice(),profession:g.player.classId,starterOnly:g.player.weapons.length===1&&g.player.weapons[0]===c.weapon,finite:steps<7200,bosses:g.stats.bosses});
        }
      }
    }finally{g.updateEnemies=originalEnemies;}
    return rows;
  },{classes:CLASSES,bosses:BOSSES});
  for(const row of evidence.bossViability){check(row.classId+' starter can defeat '+row.bossId+' with finite normal attack and skill damage',row.dead&&row.finite&&row.shots>0&&row.casts>0&&row.initialHp===row.expectedHp&&row.initialMax===row.expectedHp&&row.damageUnchanged&&row.playerMaxHpUnchanged&&row.passives.length===0&&row.starterOnly&&row.profession===row.classId);}
  check('all three starter professions retain independent three-Boss completion',['shooter','mage','warrior'].every(id=>evidence.bossViability.find(r=>r.classId===id&&r.floor===3)?.bosses===3));
  check('damage sessions have no browser runtime or console errors',errors.length===0&&consoleErrors.length===0);
  await writeFile('test-artifacts/damage-types-regression.json',JSON.stringify({status:'PASS',checks,errors,consoleErrors,evidence},null,2));
}catch(error){console.error(error);await page?.screenshot({path:'test-artifacts/damage-types-failure.png'}).catch(()=>{});await writeFile('test-artifacts/damage-types-regression.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,consoleErrors,evidence},null,2));process.exitCode=1;}finally{await browser.close();}
