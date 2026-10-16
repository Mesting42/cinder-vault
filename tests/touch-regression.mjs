import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks=[],errors=[],evidence={};
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
const base='http://127.0.0.1:5188';
async function touchRig(page){
 const cdp=await page.context().newCDPSession(page),points=new Map();
 const send=type=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:[...points].map(([id,p])=>({id,x:p.x,y:p.y,radiusX:5,radiusY:5,force:1}))});
 return {async start(id,x,y){points.set(id,{x,y});await send('touchStart');},async move(id,x,y){points.set(id,{x,y});await send('touchMove');},async end(id){const p=points.get(id);points.delete(id);if(p)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{id,...p,radiusX:5,radiusY:5,force:1}]});},async reset(){points.clear();await send('touchCancel');},async tap(selector,id=9){const b=await page.locator(selector).boundingBox();assert(b,'Touch target missing '+selector);await this.start(id,b.x+b.width/2,b.y+b.height/2);await this.end(id);},async center(selector){const b=await page.locator(selector).boundingBox();return{x:b.x+b.width/2,y:b.y+b.height/2,width:b.width};}};
}
let page;
try{
 for(const [name,viewport,touch] of [['desktop',{width:1440,height:900},false],['phone-compact',{width:640,height:360},true],['phone-small',{width:667,height:375},true],['phone',{width:844,height:390},true],['tablet',{width:1024,height:768},true]]){
  const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,deviceScaleFactor:touch?3:1});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForFunction(()=>document.getElementById('menu').dataset.scene==='ready');await page.waitForTimeout(400);
  check(`${name} opens without portrait blocker`,await page.locator('#rotate-screen').isHidden());
  await page.screenshot({path:`test-artifacts/responsive-${name}-menu.png`});
  const start=await page.locator('#start-btn').boundingBox();check(`${name} start action is visible and reachable`,start.x>=0&&start.y>=0&&start.x+start.width<=viewport.width&&start.y+start.height<=viewport.height);
  if(touch)await page.locator('#start-btn').tap();else await page.click('#start-btn');
  await page.waitForFunction(()=>window.__game?.state==='select');await page.waitForTimeout(600);await page.screenshot({path:`test-artifacts/responsive-${name}-classes.png`});
  const buttons=await page.locator('.class-option, #class-confirm, #class-back').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}));
  check(`${name} all three class choices and confirmation fit viewport`,buttons.every(b=>b.x>=-1&&b.y>=-1&&b.x+b.w<=viewport.width+1&&b.y+b.h<=viewport.height+1&&(!touch||b.h>=44)));
  if(touch)await page.locator('[data-class=mage]').tap();else await page.click('[data-class=mage]');
  if(touch)await page.locator('#class-confirm').tap();else await page.click('#class-confirm');
  await page.waitForFunction(()=>window.__game.state==='playing');await page.waitForTimeout(750);
  await page.screenshot({path:`test-artifacts/responsive-${name}-game.png`});
  const data=await page.evaluate(()=>({mode:window.__game.controls.touchMode,quality:window.__game.quality,view:window.__game.camera.top,css:[innerWidth,innerHeight],canvas:[window.__game.renderer.domElement.width,window.__game.renderer.domElement.height],actions:[...document.querySelectorAll('#touch-controls button')].map(b=>{const r=b.getBoundingClientRect();return {action:b.dataset.action,x:r.x,y:r.y,w:r.width,h:r.height};})}));evidence[name]=data;
  check(`${name} uses correct input mode`,data.mode===touch);
  check(`${name} camera uses the requested device framing`,await page.evaluate(()=>Math.abs(window.__game.camera.top-window.__game.playViewSize())<.001)&&data.view>0);
  if(touch){
   check(`${name} action buttons meet 44px touch targets and fit screen`,data.actions.every(b=>b.w>=44&&b.h>=44&&b.x>=0&&b.y>=0&&b.x+b.w<=viewport.width&&b.y+b.h<=viewport.height));
   check(`${name} caps high-DPI rendering and shadow cost`,data.canvas[0]<=viewport.width*1.25&&data.quality.shadowSize===1024);
   const rig=await touchRig(page),left=await rig.center('[data-stick=move]'),right=await rig.center('[data-stick=aim]');
   // Move to a known clear patch without changing combat stats or abilities.
   await page.evaluate(()=>{const g=window.__game;for(let x=-7;x<5;x+=1)for(let z=-6;z<7;z+=1){if([0,.5,1,1.5,2,2.5,3].every(d=>!g.isSolid(x+d,z,.55))){g.player.x=x;g.player.z=z;g.followCamera(0,true);return;}}throw Error('No clear input test lane');});
   const before=await page.evaluate(()=>({x:window.__game.player.x,z:window.__game.player.z,shots:window.__game.player.shots}));
   await rig.start(1,left.x,left.y);await rig.move(1,left.x+left.width*.32,left.y);
   await rig.start(2,right.x,right.y-right.width*.32);await page.waitForTimeout(500);
   const during=await page.evaluate(()=>({x:window.__game.player.x,shots:window.__game.player.shots,pointers:window.__game.controls.pointers.size,down:window.__game.input.down}));
   check(`${name} real two-finger movement and sustained attacks run together`,during.x>before.x+1&&during.shots>before.shots&&during.pointers===2&&during.down);
   await rig.tap('[data-action=skill]',3);check(`${name} third-finger skill preserves both joysticks`,await page.evaluate(()=>window.__game.player.skillCd>0&&window.__game.controls.pointers.size===2));
   await rig.end(2);check(`${name} releasing only aim stops fire and keeps movement`,await page.evaluate(()=>!window.__game.input.down&&window.__game.controls.pointers.size===1&&window.__game.controls.move.x>.8));
   await rig.end(1);await page.waitForTimeout(100);
   check(`${name} releasing movement returns joystick to zero`,await page.evaluate(()=>window.__game.controls.move.x===0&&window.__game.controls.pointers.size===0));
   await rig.start(1,left.x-30,left.y);await rig.start(2,right.x+30,right.y);await rig.reset();
   check(`${name} pointer cancellation clears all held actions`,await page.evaluate(()=>window.__game.controls.pointers.size===0&&!window.__game.input.down&&window.__game.controls.move.x===0));
   await rig.tap('#minimap-wrap');check(`${name} tapping the minimap opens the full map and pauses gameplay`,await page.evaluate(()=>window.__game.state==='map'));await page.screenshot({path:`test-artifacts/responsive-${name}-map.png`});await page.locator('#close-map').tap();
   await rig.tap('[data-action=build]');check(`${name} touch equipment details opens readable scroll panel`,await page.evaluate(()=>window.__game.state==='paused')&&await page.locator('#build-close').isVisible());await page.locator('#build-close').tap();
   await page.setViewportSize({width:viewport.height,height:viewport.width});await page.waitForTimeout(200);const saved=await page.evaluate(()=>window.__game.stats.time);await page.waitForTimeout(300);
   check(`${name} portrait blocks controls and freezes run time`,await page.locator('#rotate-screen').isVisible()&&await page.evaluate(t=>window.__game.stats.time===t&&window.__game.controls.pointers.size===0,saved));await page.screenshot({path:`test-artifacts/responsive-${name}-rotate.png`});
   await page.setViewportSize(viewport);await page.waitForTimeout(350);check(`${name} returning to landscape resumes preserved run`,await page.evaluate(t=>window.__game.state==='playing'&&window.__game.stats.time>t&&!window.__game.input.down,saved));
   if(name==='phone'){
    await page.keyboard.down('d');await page.waitForTimeout(80);await page.keyboard.up('d');check('hybrid keyboard input switches safely to desktop',await page.evaluate(()=>!window.__game.controls.touchMode));
    await page.locator('#pause-btn').tap();await page.waitForTimeout(100);check('touch returns after keyboard without stale input',await page.evaluate(()=>window.__game.controls.touchMode&&window.__game.state==='paused'&&!window.__game.input.down));await page.locator('#resume-btn').tap();
    for(const id of ['shooter','mage','warrior']){
     await page.evaluate(id=>window.__game.newGame(270021,id),id);await page.waitForTimeout(120);await page.evaluate(()=>{if(window.__game.state==='intro')window.__game.finishEntrance();});await page.waitForFunction(()=>window.__game.state==='playing');await page.waitForTimeout(250);
     await page.evaluate(()=>{const g=window.__game;for(let x=-9;x<4;x++)for(let z=-7;z<8;z++){if([0,.5,1,1.5,2,2.5,3,3.5,4,4.5].every(d=>!g.isSolid(x+d,z,1.1))){g.player.x=x;g.player.z=z;return;}}throw Error('No safe roll test lane');});
     await rig.start(2,right.x+right.width*.33,right.y);await page.waitForTimeout(400);await rig.end(2);
     check(`${id} right stick attacks with the actual class weapon`,await page.evaluate(()=>window.__game.player.shots>0));
     await rig.tap('[data-action=device]');check(`${id} independent device button activates gadget`,await page.evaluate(()=>window.__game.player.activeCd>0));
     const blanks=await page.evaluate(()=>window.__game.player.blanks);await rig.tap('[data-action=blank]');check(`${id} blank button consumes a blank`,await page.evaluate(n=>window.__game.player.blanks===n-1,blanks));
     if(id!=='warrior'){await page.waitForTimeout(200);await rig.tap('[data-action=reload]');check(`${id} manual touch reload or mana recharge starts`,await page.evaluate(()=>window.__game.player.reload>0));await page.waitForFunction(()=>window.__game.player.reload===0);check(`${id} reload restores full capacity`,await page.evaluate(()=>window.__game.player.ammo[window.__game.weapon().id]===window.__game.magSize(window.__game.weapon())));}else check('warrior reload control stays disabled',await page.locator('[data-action=reload]').isDisabled());
     await page.evaluate(()=>document.querySelector('[data-action=roll]').addEventListener('pointerdown',()=>{window.__testRollStart={x:window.__game.player.x,z:window.__game.player.z};},{capture:true,once:true}));await rig.start(1,left.x+left.width*.33,left.y);const rollButton=await rig.center('[data-action=roll]');await rig.start(3,rollButton.x,rollButton.y);
     check(`${id} roll follows left stick and grants invulnerability`,await page.evaluate(()=>window.__game.player.rollTime>0&&window.__game.player.rollX>.95&&window.__game.player.invul>0));await rig.end(1);await rig.end(3);await page.waitForFunction(()=>window.__game.player.rollTime===0);
     const moved=await page.evaluate(()=>{const p=window.__testRollStart;return Math.hypot(window.__game.player.x-p.x,window.__game.player.z-p.z);});evidence[`${id}-roll`]={distance:moved};check(`${id} touch roll retains the shortened distance`,moved>3.8&&moved<4.7);
     await page.evaluate(()=>{const g=window.__game,c=g.room.objects.find(o=>o.type==='chest');g.player.x=c.x+.8;g.player.z=c.z;});await page.waitForTimeout(180);await rig.tap('[data-action=interact]');
     check(`${id} touch interaction opens starter chest`,await page.evaluate(()=>window.__game.room.objects.some(o=>o.type==='chest'&&o.opened)));
     await page.evaluate(()=>{const g=window.__game,w=g.room.pickups.find(p=>p.kind==='weapon'&&!p.taken);g.player.x=w.x;g.player.z=w.z;});await page.waitForTimeout(180);await rig.tap('[data-action=interact]');await page.waitForTimeout(180);
     check(`${id} touch pickup gives a second class weapon`,await page.evaluate(()=>window.__game.player.weapons.length===2));
     const index=await page.evaluate(()=>window.__game.player.weaponIndex);await rig.tap('[data-action=switch]');check(`${id} touch switch changes held weapon and model`,await page.evaluate(i=>window.__game.player.weaponIndex!==i&&window.__game.hero.userData.weapon.children.length===1,index));
    }
   }
   await page.evaluate(()=>{const g=window.__game;g.ui.result(true);g.state='result';});await page.waitForTimeout(100);await page.screenshot({path:`test-artifacts/responsive-${name}-result.png`});
   await page.locator('#home-btn').scrollIntoViewIfNeeded();await page.locator('#home-btn').tap();check(`${name} scrollable settlement returns to menu by touch`,await page.evaluate(()=>window.__game.state==='menu'));
  }else check('desktop does not show virtual controls',await page.locator('#touch-controls').isHidden());
  await context.close();
 }
  const portraitContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  page=await portraitContext.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.waitForFunction(()=>window.__cinderBoot);
  check('first portrait load shows rotation prompt before 3D loads',await page.locator('#rotate-screen').isVisible());
  await page.waitForTimeout(300);
  check('first portrait load keeps the 3D runtime deferred',await page.evaluate(()=>!window.__game));
  await page.setViewportSize({width:844,height:390});
  check('rotating reveals the lightweight menu',await page.locator('#rotate-screen').isHidden());
  await page.locator('#start-btn').tap();await page.waitForFunction(()=>window.__game?.state==='select');
  await page.locator('#class-back').tap();await page.waitForFunction(()=>window.__cinderMenuScene?.active);
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>!window.__cinderMenuScene.active);
  const menuFrames=await page.evaluate(()=>window.__cinderMenuScene.renderFrames);
  await page.waitForTimeout(300);
  check('portrait freezes the initialized archive hall',await page.evaluate(n=>window.__cinderMenuScene.renderFrames===n,menuFrames));
  await page.setViewportSize({width:844,height:390});
  await page.waitForFunction(n=>window.__cinderMenuScene.active&&window.__cinderMenuScene.renderFrames>n,menuFrames);
  check('archive hall resumes normally after rotation',await page.locator('#rotate-screen').isHidden());
  await portraitContext.close();
 check('responsive sessions have no browser runtime errors',errors.length===0);
 await writeFile('test-artifacts/touch-regression.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(e){console.error(e);await page?.screenshot({path:'test-artifacts/touch-regression-failure.png'}).catch(()=>{});await writeFile('test-artifacts/touch-regression.json',JSON.stringify({status:'FAIL',error:e.message,checks,errors,evidence},null,2));process.exitCode=1;}finally{await browser.close();}
