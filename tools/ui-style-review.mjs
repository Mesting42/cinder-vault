/** Capture the real production UI in desktop and landscape phone viewports. */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const evidence={screens:[],errors:[],devices:{},verification:{}};
await mkdir('test-artifacts',{recursive:true});
try{
 for(const [device,width,height,touch] of [['desktop',1440,900,false],['phone',844,390,true],['phone-small',667,375,true]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:1});
  const page=await context.newPage();page.on('pageerror',e=>evidence.errors.push(`${device}: ${e.message}`));
  const activate=selector=>touch?page.locator(selector).tap():page.click(selector);
  await page.goto('http://127.0.0.1:5188');await page.waitForFunction(()=>document.getElementById('menu').dataset.scene==='ready');
  async function capture(screen){
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(screen==='class'?500:150);
   const path=`test-artifacts/ui-${device}-${screen}.png`;await page.screenshot({path});
   evidence.screens.push({device,screen,path,geometry:await page.evaluate(()=>[...document.querySelectorAll('button,h1,h2,#class-details,#modal-content')].filter(el=>el.getClientRects().length).map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{id:el.id,text:el.textContent.trim().slice(0,35),x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontFamily,color:s.color,bg:s.backgroundColor};}))});
  }
  await page.waitForTimeout(950);await capture('menu');
  evidence.devices[device]=await page.evaluate(()=>({fonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),requests:performance.getEntriesByType('resource').filter(r=>r.name.includes('/fonts/')).map(r=>({url:r.name,bytes:r.transferSize})),buttons:[...document.querySelectorAll('.verdict-row')].filter(e=>e.getClientRects().length).every(e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.right<=innerWidth&&r.bottom<=innerHeight;})}));
  await activate(touch?'#menu-quick-settings':'#menu-settings');await activate('#settings-tab-controls');await capture('settings');await activate('#settings-close');
  await (touch?page.locator('#start-btn').tap():page.click('#start-btn'));await page.waitForFunction(()=>window.__game?.state==='select');
  await page.evaluate(()=>window.__game.previewClass('mage'));await capture('class');
  evidence.verification[device]={classCopyFits:await page.locator('.class-option-copy').evaluateAll(els=>els.every(el=>{const r=el.getBoundingClientRect(),b=el.closest('button').getBoundingClientRect();return r.top>=b.top+3&&r.bottom<=b.bottom-3;}))};
  await page.evaluate(touch=>{const g=window.__game;g.newGame(90210,'mage');g.controls.setMode(touch);g.finishEntrance();},touch);
  await page.waitForFunction(()=>window.__game.state==='playing');await page.waitForTimeout(250);await capture('hud');
  await page.evaluate(()=>window.__game.ui.pause());await capture('pause');
  await activate('#build-btn');await capture('equipment');
  evidence.verification[device].equipmentStartsAtHeading=await page.evaluate(()=>{const c=document.getElementById('modal-content'),h=c.querySelector('h2');return c.scrollTop===0&&h.getBoundingClientRect().top>=c.getBoundingClientRect().top&&h.textContent.includes('装备详情');});
  await page.evaluate(()=>{const g=window.__game;g.player.weapons.push('moonorb');g.player.passives=['mag','crystal'];g.ui.build();});await capture('equipment-populated');
  evidence.verification[device].synergyUsesColdInk=await page.locator('.build-synergy').evaluate(el=>getComputedStyle(el).color==='rgb(210, 222, 239)');
  evidence.verification[device].longEquipmentScrolls=await page.evaluate(()=>{const c=document.getElementById('modal-content');c.scrollTop=c.scrollHeight;return c.scrollHeight>c.clientHeight?c.scrollTop>0:true;});
  await activate('#build-close');await page.evaluate(()=>window.__game.ui.toggleMap());await capture('map');
  await activate('#close-map');await page.evaluate(()=>window.__game.ui.result(false));await capture('result');
  evidence.verification[device].resultActionsFit=await page.locator('.result-actions button').evaluateAll(els=>els.every(el=>{const r=el.getBoundingClientRect(),p=el.closest('#result-content').getBoundingClientRect();return r.height>=44&&r.top>=p.top&&r.bottom<=Math.min(p.bottom,innerHeight);}));
  await page.evaluate(()=>window.__game.menu());await activate('#guide-btn');await capture('guide');
  evidence.verification[device].guideUsesColdInk=await page.locator('.guide-advice').evaluate(el=>getComputedStyle(el).color==='rgb(210, 222, 239)');
  await context.close();
 }
 await writeFile('test-artifacts/ui-style-review.json',JSON.stringify(evidence,null,2));
 console.log(JSON.stringify({screens:evidence.screens.length,errors:evidence.errors,verification:evidence.verification,menuTargets:Object.fromEntries(Object.entries(evidence.devices).map(([k,v])=>[k,v.buttons]))},null,2));
}finally{await browser.close();}
