import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {CLASSES,WEAPONS,weaponPool} from '../src/data.js';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),checks=[],errors=[],consoleErrors=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
const check=(name,passed)=>{assert(passed,name);checks.push(name);console.log('PASS',name);};
try{
  await mkdir('test-artifacts',{recursive:true});await page.goto('http://127.0.0.1:5188');await page.waitForFunction(()=>window.__game?.menuEntrance?.finished);
  for(const c of CLASSES){
    await page.evaluate(id=>{const g=window.__game;g.newGame(270021,id);g.finishEntrance();const o=g.room.objects.find(o=>o.type==='chest');g.player.x=o.x;g.player.z=o.z+1.35;g.player.invul=0;g.ui.update();},c.id);
    await page.keyboard.press('e');await page.waitForTimeout(100);
    const loot=await page.evaluate(()=>(()=>{const p=window.__game.room.pickups.find(p=>p.kind==='weapon');return {id:p.id,kind:p.kind};})());
    check(`${c.id} actual E chest interaction yields a profession weapon`,weaponPool(c.id).some(w=>w.id===loot.id));
    await page.evaluate(()=>{const g=window.__game,p=g.room.pickups.find(p=>p.kind==='weapon');g.player.x=p.x;g.player.z=p.z;});await page.keyboard.press('e');
    check(`${c.id} picked-up weapon mounts and retains the profession skill`,await page.evaluate(({id,weapon})=>{const g=window.__game;return g.player.classId===id&&g.weapon().id===weapon&&g.hero.userData.weapon.children.length===1&&g.player.weapons.includes(weapon);},{id:c.id,weapon:loot.id}));
    await page.mouse.move(1000,500);await page.waitForTimeout(120);await page.screenshot({path:`test-artifacts/${c.id}-class-loot.png`});
  }
  evidence.sources=await page.evaluate(({classes,weapons})=>{
    const g=window.__game,rows=[];
    for(const c of classes){const allowed=weapons.filter(w=>w.classOnly===c.id&&w.id!==c.weapon).map(w=>w.id),found=new Set();let chests=0,shops=0,forges=0;
      for(const seed of [1,2,3,4,13,21,270021,91731])for(const floor of [1,2,3]){
        g.newGame(seed,c.id);if(floor>1)g.loadFloor(floor);g.finishEntrance();g.state='paused';
        for(const r of g.dungeon.rooms.filter(r=>['start','chest','shop','event'].includes(r.type))){g.enterRoom(r.id);g.state='playing';g.player.coins=300;g.player.keys=8;
          for(const chest of g.room.objects.filter(o=>o.type==='chest')){g.player.x=chest.x;g.player.z=chest.z+1.2;g.interact();if(!chest.opened)throw Error('Fixture could not open chest');const drops=g.room.pickups.filter(p=>p.kind==='weapon');for(const item of drops){if(!allowed.includes(item.id))throw Error(`${c.id} chest gave ${item.id}`);found.add(item.id);}chests++;}
          for(const o of g.room.objects.filter(o=>o.type==='offer'&&o.item.kind==='weapon')){if(!allowed.includes(o.item.id))throw Error(`${c.id} shop offered ${o.item.id}`);shops++;g.player.x=o.x;g.player.z=o.z+1.2;g.interact();if(!o.sold)throw Error('Fixture did not purchase');}
          for(const o of g.room.objects.filter(o=>o.type==='npc'&&o.event==='forge')){const before=[...g.player.weapons],coins=g.player.coins;g.player.x=o.x;g.player.z=o.z+1.3;g.interact();if(!o.used||g.player.coins>coins-2)throw Error('Forge transaction did not execute');if(g.player.weapons.some(id=>id!==c.weapon&&!allowed.includes(id)))throw Error('Forge gave foreign weapon');forges++;}
          g.state='paused';
        }
        for(let i=0;i<50;i++){const id=g.availableWeapon();if(!allowed.includes(id))throw Error('Reward pool leaked');found.add(id);}
      }
      g.newGame(270021,c.id);g.finishEntrance();const before=g.player.weapons.length;g.gainWeapon(c.id==='shooter'?'froststaff':'revolver');const rejectsForeign=g.player.weapons.length===before;
      rows.push({id:c.id,allowed,seen:[...found],chests,shops,forges,rejectsForeign});
    }
    return rows;
  },{classes:CLASSES,weapons:WEAPONS});
  for(const r of evidence.sources){check(`${r.id} chest/shop/forge pools remain exclusive across 24 floors`,r.chests>=72&&r.shops===24&&r.forges>0&&r.rejectsForeign);check(`${r.id} can obtain every distinct reward weapon`,r.allowed.length===r.seen.length);}

  evidence.mechanics=await page.evaluate(()=>{
    const g=window.__game,rows={};
    const reset=(id,weapon)=>{g.newGame(270021,id);g.finishEntrance();g.state='paused';g.clearCombat();g.room.enemies=[];g.room.objects=[];g.player.x=0;g.player.z=0;g.player.invul=0;g.transitionCd=100;g.gainWeapon(weapon);g.equip();g.player.combo=0;g.player.lastMelee=-10;};
    const enemy=(x,z)=>{const e=g.spawnEnemy('gunner',x,z);e.x=x;e.z=z;e.hp=e.maxHp=1000;e.timer=100;e.model.position.set(x,0,z);return e;};
    reset('warrior','stormpike');const a=enemy(0,4.9),b=enemy(.12,3.9),side=enemy(3,2);g.shoot(0);rows.pikeReach=a.hp===975&&b.hp===975&&side.hp===1000;
    reset('warrior','oathaxe');const wide=enemy(2,1.8),old=wide.x;g.shoot(0);rows.axeWide=wide.hp===952&&wide.x>old+.5;
    reset('warrior','quakehammer');const rear=enemy(0,-3.5);g.shoot(0);const first=rear.hp;g.time+=.9;g.shoot(0);g.time+=.9;g.shoot(0);rows.hammerQuake=first===1000&&rear.hp===916;
    reset('warrior','stormpike');g.gainPassive('mag');g.shoot(0);rows.warriorSpeed=Math.abs(g.player.fireCd-.224)<1e-6;
    g.gainPassive('ricochet');g.projectile({x:0,z:2,angle:Math.PI,speed:5,damage:1,range:10,enemy:true});g.shoot(0);rows.reflection=g.bullets.some(b=>!b.enemy&&b.damage===12)&&g.bullets.every(b=>!b.enemy);
    reset('warrior','quakehammer');g.gainPassive('rollfire');g.player.combo=2;g.player.lastMelee=g.time;g.shoot(0);rows.hammerFlames=g.hazards.some(h=>h.kind==='fire'&&h.friendly);
    reset('mage','stormrod');const primary=enemy(0,6),secondary=enemy(2,6);g.shoot(0);rows.lightningChain=primary.hp===981&&secondary.hp===988;
    reset('mage','embercodex');const target=enemy(0,6),near=enemy(1.8,6);g.gainPassive('rollfire');g.shoot(0);rows.flameProjectile=g.bullets[0].kind==='rocket'&&g.bullets[0].spell;for(let i=0;i<40;i++)g.updateBullets(.02,1);rows.flameExplosion=target.hp===960&&near.hp===960&&g.hazards.some(h=>h.kind==='fire');
    reset('mage','moonorb');g.gainPassive('mag');g.shoot(0);rows.twinnedOrbit=g.bullets.length===2&&g.bullets.every(b=>b.kind==='orbit')&&g.magSize(g.weapon())===15;
    return rows;
  });for(const [name,passed] of Object.entries(evidence.mechanics))check(name,passed);

  evidence.weaponPoses=await page.evaluate(({classes,weapons})=>{
    const g=window.__game,Box=g.hero.userData.bounds.constructor,rows=[];
    for(const c of classes){g.newGame(270021,c.id);g.finishEntrance();g.state='paused';g.clearCombat();g.room.enemies=[];g.room.objects=[];g.room.sealed=false;g.transitionCd=100;
      for(const w of weapons.filter(w=>w.classOnly===c.id)){if(w.id!==c.weapon)g.gainWeapon(w.id);g.player.weaponIndex=g.player.weapons.indexOf(w.id);g.equip();g.player.x=0;g.player.z=0;g.player.rollTime=0;g.updateHeroPose(0,0);const gun=g.hero.userData.weapon.children[0],box=new Box().setFromObject(gun,true);let rollGround=Infinity,rollRadius=0;
        for(const dt of [.01,.04])for(let dir=0;dir<8;dir++){g.player.x=0;g.player.z=0;g.player.rollTime=0;g.player.rollCd=0;g.player.fireCd=0;g.input.keys.clear();g.aimPoint.set(Math.sin(dir*Math.PI/4)*6,.85,Math.cos(dir*Math.PI/4)*6);g.roll();while(g.player.rollTime>0){g.update(dt);g.time+=dt;g.animateWorld(dt);if(g.player.rollTime===0)continue;const bounds=new Box().setFromObject(g.hero,true);rollGround=Math.min(rollGround,bounds.min.y);g.hero.traverse(m=>{if(!m.isMesh)return;const attr=m.geometry.attributes.position;for(let i=0;i<attr.count;i++){const v=g.aimPoint.clone().fromBufferAttribute(attr,i).applyMatrix4(m.matrixWorld);rollRadius=Math.max(rollRadius,Math.hypot(v.x-g.player.x,v.z-g.player.z));}});}}
        rows.push({classId:c.id,weapon:w.id,standingMin:box.min.y,rollGround,rollRadius});
      }
    }
    return rows;
  },{classes:CLASSES,weapons:WEAPONS});for(const r of evidence.weaponPoses)check(`${r.weapon} mounts and rolls without ground or cover clipping`,r.standingMin>.15&&r.rollGround>=.02&&r.rollRadius<=1);
  evidence.weaponCover=await page.evaluate(({classes,weapons})=>{
    const g=window.__game,Box=g.hero.userData.bounds.constructor,rows=[];
    for(const c of classes){g.newGame(270021,c.id);g.finishEntrance();g.state='paused';g.clearCombat();g.room.enemies=[];g.room.objects=[];
      for(const w of weapons.filter(w=>w.classOnly===c.id)){if(!g.player.weapons.includes(w.id))g.gainWeapon(w.id);g.player.weaponIndex=g.player.weapons.indexOf(w.id);g.equip();g.player.rollTime=0;g.player.swing=0;g.player.castTime=0;let coverClips=0,wallClips=0;
        for(let dir=0;dir<8;dir++){const aim=dir*Math.PI/4,column={type:'column',x:0,z:0,hw:.65,hh:.65,hp:9999,solid:true,shotBlock:true};g.room.objects=[column];g.player.x=-Math.sin(aim)*1.8;g.player.z=-Math.cos(aim)*1.8;g.updateHeroPose(aim,0);const obstacle=new Box();obstacle.min.set(-.65,0,-.65);obstacle.max.set(.65,4,.65);g.hero.userData.weapon.traverse(m=>{if(m.isMesh&&new Box().setFromObject(m,true).intersectsBox(obstacle))coverClips++;});}
        g.room.objects=[];for(const [aim,x,z]of[[Math.PI/2,g.room.w/2-.95,0],[-Math.PI/2,-g.room.w/2+.95,0],[0,0,g.room.h/2-.95],[Math.PI,0,-g.room.h/2+.95]]){g.player.x=x;g.player.z=z;g.updateHeroPose(aim,0);g.hero.userData.weapon.traverse(m=>{if(!m.isMesh)return;const attr=m.geometry.attributes.position;for(let i=0;i<attr.count;i++){const v=g.aimPoint.clone().fromBufferAttribute(attr,i).applyMatrix4(m.matrixWorld);if(Math.abs(v.x)>g.room.w/2-.02||Math.abs(v.z)>g.room.h/2-.02)wallClips++;}});}
        rows.push({weapon:w.id,coverClips,wallClips});
      }
    }return rows;
  },{classes:CLASSES,weapons:WEAPONS});for(const r of evidence.weaponCover)check(`${r.weapon} retracts safely beside pillars and four walls`,r.coverClips===0&&r.wallClips===0);
  check('production browser reports no runtime or rendering errors',errors.length===0&&consoleErrors.length===0);
  await writeFile('test-artifacts/class-loot-regression.json',JSON.stringify({status:'PASS',checks,errors,consoleErrors,evidence},null,2));
}catch(e){console.error(e);await page.screenshot({path:'test-artifacts/class-loot-failure.png'}).catch(()=>{});await writeFile('test-artifacts/class-loot-regression.json',JSON.stringify({status:'FAIL',error:e.message,checks,errors,consoleErrors,evidence},null,2));process.exitCode=1;}finally{await browser.close();}
