import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),checks=[],errors=[],evidence={};
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};await mkdir('test-artifacts',{recursive:true});
try{
 for(const [device,viewport,touch] of [['desktop',{width:1440,height:900},false],['phone',{width:844,height:390},true]]){
  const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const activate=selector=>touch?page.locator(selector).tap():page.click(selector);
  await page.goto('http://127.0.0.1:5188');await activate('#start-btn');await activate('#class-confirm');await page.waitForFunction(()=>window.__game.state==='playing');
  for(const [floor,id,name] of [[1,'guardian','断誓钟卫'],[2,'bishop','大司铳'],[3,'eclipse','黑日裁决者']]){
   const before=await page.evaluate(floor=>{const g=window.__game;g.loadFloor(floor);g.finishEntrance();g.enterRoom(g.dungeon.rooms.find(r=>r.type==='boss').id);return{state:g.state,timer:g.boss.timer,age:g.boss.age,hp:g.player.hp,shots:g.player.shots,skill:g.player.skillCd,time:g.stats.time,x:g.player.x,z:g.player.z,warning:g.audio.lastWarning,room:g.room.id};},floor);
   check(`${device} floor ${floor} begins the 1.8 second Boss introduction`,before.state==='boss-intro'&&await page.locator('#boss-warning').isVisible());
   check(`${device} ${name} warning shows the correct name, mark and sound`,await page.evaluate(({id,name})=>{const panel=document.getElementById('boss-warning'),a=window.__game.audio;return panel.dataset.boss===id&&panel.textContent.includes(name)&&panel.querySelector('svg path').getAttribute('d').length>20&&a.lastWarning.id===id;},{id,name}));
   if(touch){await page.touchscreen.tap(420,250);await page.waitForTimeout(320);}else{await page.keyboard.down('w');await page.keyboard.press('q');await page.mouse.move(420,250);await page.mouse.down();await page.waitForTimeout(320);await page.mouse.up();await page.keyboard.up('w');}
   const during=await page.evaluate(()=>{const g=window.__game;return{state:g.state,timer:g.boss.timer,age:g.boss.age,hp:g.player.hp,shots:g.player.shots,skill:g.player.skillCd,time:g.stats.time,x:g.player.x,z:g.player.z,bullets:g.bullets.length,sealed:g.room.sealed};});evidence[device+'-'+floor]={before,during};
   check(`${device} ${name} warning freezes Boss AI and all battle clocks`,during.state==='boss-intro'&&during.timer===before.timer&&during.age===before.age&&during.time===before.time);
   check(`${device} ${name} cannot damage the player or consume input during warning`,during.hp===before.hp&&during.shots===before.shots&&during.skill===before.skill&&during.x===before.x&&during.z===before.z&&during.bullets===0&&during.sealed);
   if(floor===3)await page.screenshot({path:`test-artifacts/boss-warning-${device}.png`});
   await page.waitForFunction(()=>window.__game.state==='playing');await page.waitForTimeout(150);
   check(`${device} ${name} battle resumes with warning removed and clean input`,await page.evaluate(()=>{const g=window.__game;return document.getElementById('boss-warning').classList.contains('hidden')&&!g.input.down&&g.input.keys.size===0&&g.boss.age>0;}));
   await page.evaluate(()=>{const g=window.__game,id=g.room.id;g.enterRoom(0);g.enterRoom(id);});check(`${device} ${name} repeat entry does not replay the introduction`,await page.evaluate(()=>window.__game.state==='playing'&&!window.__game.bossEntrance));
  }
  await page.evaluate(()=>{const g=window.__game;g.newGame(450042,'shooter');g.finishEntrance();g.ui.settings();});await activate('[data-tab="accessibility"]');await activate('[data-key="reduceMotion"]');await activate('#settings-close');await page.evaluate(()=>{const g=window.__game;g.enterRoom(g.dungeon.rooms.find(r=>r.type==='boss').id);});
  check(`${device} reduced motion keeps the warning and preparation time without entrance motion`,await page.evaluate(()=>document.getElementById('boss-warning').classList.contains('warning-reduced')&&window.__game.state==='boss-intro'));
  if(touch){await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>window.__game.controls.orientationBlocked);const start=await page.evaluate(()=>window.__game.bossEntrance.elapsed);await page.waitForTimeout(250);check('phone portrait pauses the Boss warning countdown',await page.evaluate(start=>Math.abs(window.__game.bossEntrance.elapsed-start)<.05,start));await page.setViewportSize(viewport);}
  await page.evaluate(()=>window.__game.menu());check(`${device} returning to menu clears a pending warning`,await page.evaluate(()=>!window.__game.bossEntrance&&document.getElementById('boss-warning').classList.contains('hidden')));
  await context.close();
 }
 check('Boss introduction sessions have no browser runtime errors',errors.length===0);await writeFile('test-artifacts/boss-entrance-regression.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){await writeFile('test-artifacts/boss-entrance-regression.json',JSON.stringify({status:'FAIL',checks,errors,evidence,message:error.message},null,2));throw error;}finally{await browser.close();}
