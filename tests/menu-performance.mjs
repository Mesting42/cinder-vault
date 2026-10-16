import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base=process.env.GAME_URL||'http://127.0.0.1:5188',checks=[],errors=[],evidence={profiles:{},functional:{}};
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 for(const profile of [{name:'4G',latency:70,bps:4000000},{name:'Fast3G',latency:150,bps:1600000}]){
  const context=await browser.newContext({viewport:{width:667,height:375},hasTouch:true,isMobile:true,deviceScaleFactor:1}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:profile.latency,downloadThroughput:profile.bps/8,uploadThroughput:profile.bps/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>window.__cinderBoot);
  await page.locator('#menu-quick-settings').tap();check(profile.name+': settings opens while hall resources are still loading',await page.locator('#settings-close').isVisible()&&await page.evaluate(()=>!window.__game));await page.click('#settings-close');
  await page.waitForFunction(()=>document.getElementById('menu').dataset.scene==='ready',null,{timeout:60000});
  const sample=await page.evaluate(()=>({interactive:window.__cinderBoot.metrics.interactive,hallReady:window.__cinderBoot.metrics.backgroundReady,documentBytes:performance.getEntriesByType('navigation')[0].transferSize,resources:performance.getEntriesByType('resource').filter(r=>!r.name.startsWith('data:')).map(r=>({name:r.name.split('/').pop(),bytes:r.transferSize})),battle:!!window.__game}));
  sample.bytes=sample.documentBytes+sample.resources.reduce((sum,r)=>sum+r.bytes,0);evidence.profiles[profile.name]={conditions:{...profile,cpu:4},...sample};
  check(profile.name+': complete interactive 3D menu stays below 1 MB',sample.bytes<1000000);
  check(profile.name+': controls become interactive within 2.5 seconds',sample.interactive<2500);
  check(profile.name+': no battle, image or audio download on menu',!sample.battle&&sample.resources.every(r=>!r.name.startsWith('game-')&&!/\.(png|webp|mp3)$/.test(r.name)));
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>window.__cinderMenuScene);
 await page.locator('#menu-settings').tap();await page.locator('#settings-audio').tap();await page.locator('#settings-close').tap();
 await page.locator('#guide-btn').tap();check('Archive opens before battle loading',await page.locator('#guide-close').isVisible()&&await page.evaluate(()=>!window.__game));await page.locator('#guide-close').tap();
 let release;const gate=new Promise(resolve=>{release=resolve;});await page.route('**/assets/game-*.js',async route=>{await gate;await route.continue();});
 await page.locator('#start-btn').tap();await page.locator('#start-btn').tap();check('repeated Start clicks share one loading state',await page.locator('#menu').getAttribute('aria-busy')==='true');await page.locator('#menu-settings').tap();await page.locator('#settings-close').tap();release();await page.waitForFunction(()=>window.__game?.controls);
 check('changing intent during loading keeps the user in the menu',await page.evaluate(()=>window.__game.state==='menu'));
 check('hydration preserves audio and avoids duplicate touch controls',await page.evaluate(()=>!window.__game.audio.enabled&&document.querySelectorAll('#touch-controls').length===1&&document.querySelectorAll('#menu-scene').length===1));
 await context.close();
 const recovery=await browser.newContext({viewport:{width:667,height:375},hasTouch:true,isMobile:true}),rp=await recovery.newPage();await rp.route('**/assets/game-*.js',route=>route.abort());await rp.goto(base);await rp.locator('#start-btn').tap();await rp.waitForFunction(()=>document.getElementById('menu').dataset.state==='error');
 check('battle load errors offer explicit recovery',await rp.locator('#menu-load-status button').isVisible());await rp.unroute('**/assets/game-*.js');await rp.locator('#menu-load-status button').tap();await rp.waitForFunction(()=>window.__game?.state==='select');check('reload recovery preserves the request to enter Classes',await rp.locator('#class-confirm').isVisible());await recovery.close();
 check('normal loading paths have no runtime errors',errors.length===0);
 await writeFile('test-artifacts/menu-performance.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){await writeFile('test-artifacts/menu-performance.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,evidence},null,2));console.error(error);process.exitCode=1;}
finally{await browser.close();}

