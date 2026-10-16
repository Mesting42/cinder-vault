import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),checks=[],errors=[],evidence={};
const check=(name,ok)=>{assert(ok,name);checks.push(name);console.log('PASS',name);};
try{
 await mkdir('test-artifacts',{recursive:true});
 for(const [name,viewport,touch]of [['desktop',{width:1600,height:1000},false],['phone',{width:844,height:390},true]]){
  const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:5188');await page.locator('#start-btn')[touch?'tap':'click']();await page.locator('#class-confirm')[touch?'tap':'click']();await page.waitForFunction(()=>window.__game.state==='playing');
  const roomResults=await page.evaluate(()=>{
   const g=window.__game;g.seed=270021;g.loadFloor(3);g.finishEntrance();g.state='paused';g.shake=0;const reports=[];
   for(const r of g.dungeon.rooms){g.enterRoom(r.id);g.state='paused';g.shake=0;g.followCamera(0,true);g.camera.updateMatrixWorld(true);const points=r.outline.map(([x,z])=>g.screenPoint(x,z,0));reports.push({shape:r.shape,visible:points.every(p=>p.x>=0&&p.x<=innerWidth&&p.y>=0&&p.y<=innerHeight)});}
   g.enterRoom(g.dungeon.rooms.find(r=>r.type==='boss').id);g.state='playing';g.boss.timer=9999;g.player.invul=9999;g.player.x=0;g.player.z=7;g.ui.update();document.getElementById('room-banner').style.opacity=0;document.getElementById('toast-stack').innerHTML='';return reports;
  });check(`${name}: all final-floor footprints fit the overview camera`,roomResults.every(r=>r.visible));
  await page.waitForTimeout(550);await page.screenshot({path:`test-artifacts/black-sun-${name}.png`});
  if(!touch){await page.evaluate(()=>{const g=window.__game;g.enterRoom(g.dungeon.rooms.find(r=>r.shape==='crucible'&&r.type==='combat').id);g.state='paused';g.ui.update();document.getElementById('room-banner').style.opacity=0;document.getElementById('toast-stack').innerHTML='';});await page.waitForTimeout(350);await page.screenshot({path:'test-artifacts/black-sun-crucible.png'});}
  await page.evaluate(()=>{const g=window.__game;g.newGame(270021,'mage');g.finishEntrance();g.enterRoom(g.dungeon.rooms.find(r=>r.type==='boss').id);g.hitEnemy(g.boss,10000);const o=g.room.objects.find(o=>o.type==='ascension');g.player.x=o.x;g.player.z=o.z+1.2;g.ui.update();document.getElementById('toast-stack').innerHTML='';});
  if(touch){await page.waitForTimeout(250);check('phone: altar exposes an explicit strengthening action',await page.locator('[data-action="interact"] span').innerText().then(t=>t==='强化'));await page.locator('[data-action="interact"]').tap();}else await page.keyboard.press('e');
  const panel=await page.evaluate(()=>{const p=document.querySelector('.talent-panel'),box=document.getElementById('modal-content').getBoundingClientRect(),buttons=[...p.querySelectorAll('button')];return{fits:box.left>=0&&box.right<=innerWidth&&box.top>=0&&box.bottom<=innerHeight,minButton:Math.min(...buttons.map(b=>b.getBoundingClientRect().height)),scrolls:document.getElementById('modal-content').scrollHeight>document.getElementById('modal-content').clientHeight,choices:buttons.filter(b=>b.dataset.talent).map(b=>b.textContent),bg:getComputedStyle(document.getElementById('modal-content')).backgroundColor,text:getComputedStyle(p.querySelector('.talent-copy>span')).color};});
  evidence[name]={roomResults,panel};check(`${name}: talent dialog stays inside the screen with 44px actions`,panel.fits&&panel.minButton>=44);
  await page.screenshot({path:`test-artifacts/black-sun-talents-${name}.png`});
  await page.locator('[data-talent="ward"]')[touch?'tap':'click']();check(`${name}: selecting a talent resumes gameplay and updates the HUD`,await page.evaluate(()=>window.__game.state==='playing'&&window.__game.player.skillBranch==='ward'&&document.getElementById('skill-name').textContent==='霜壁守誓 I'));
  if(touch){await page.waitForTimeout(250);await page.locator('[data-action="skill"]').tap();check('phone: strengthened skill works from the real touch button',await page.evaluate(()=>window.__game.player.shield===2&&window.__game.hazards.some(h=>h.bulletSlow===.20)));}
  await context.close();
 }
 check('no runtime errors in desktop and phone rendering',errors.length===0);await writeFile('test-artifacts/black-sun-preview.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){await writeFile('test-artifacts/black-sun-preview.json',JSON.stringify({status:'FAIL',checks,errors,error:error.message,evidence},null,2));console.error(error);process.exitCode=1;}finally{await browser.close();}
