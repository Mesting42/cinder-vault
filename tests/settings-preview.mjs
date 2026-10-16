import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks=[],errors=[],evidence={};
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
try{
 for(const [name,options] of Object.entries({desktop:{viewport:{width:1440,height:900}},phone:{viewport:{width:667,height:375},hasTouch:true,isMobile:true},tablet:{viewport:{width:1024,height:768},hasTouch:true,isMobile:true}})){
  const context=await browser.newContext(options),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:5188');await page.waitForFunction(()=>window.__cinderBoot&&document.getElementById('menu').dataset.background==='ready');
  if(name==='desktop'){await page.waitForFunction(()=>document.getElementById('menu').dataset.hd==='ready');await page.waitForFunction(()=>!window.__game||window.__game.menuEntrance?.finished);}
  check(name+': background choice suits the device',await page.evaluate(name=>document.getElementById('menu').dataset.hd===(name==='desktop'?'ready':'light'),name));
  evidence[name]={};await page.screenshot({path:'test-artifacts/settings-'+name+'-menu.png'});
  await page.locator('#menu-quick-settings')[name==='desktop'?'click':'tap']();
  for(const tab of ['audio','graphics','controls','accessibility','data']){
   await page.locator('#settings-tab-'+tab)[name==='desktop'?'click':'tap']();
   const layout=await page.evaluate(()=>{const panel=document.querySelector('.settings-panel').getBoundingClientRect(),footer=document.querySelector('.settings-footer').getBoundingClientRect(),header=document.querySelector('.settings-header').getBoundingClientRect(),pages=document.querySelector('.settings-pages');return {panel:[panel.x,panel.y,panel.width,panel.height],footerBottom:footer.bottom,headerTop:header.top,viewport:[innerWidth,innerHeight],pageOverflow:pages.scrollWidth>pages.clientWidth+1};});
   check(name+': '+tab+' header footer and content fit',layout.headerTop>=0&&layout.footerBottom<=layout.viewport[1]+1&&!layout.pageOverflow);evidence[name][tab]=layout;
   await page.screenshot({path:`test-artifacts/settings-${name}-${tab}.png`});
  }
  if(name==='phone'){
   await page.locator('#settings-tab-graphics').tap();await page.selectOption('[data-key=background]','hd');await page.waitForFunction(()=>document.getElementById('menu').dataset.hd==='ready');
   check('phone: explicit HD selection really loads the enhanced artwork',await page.locator('.verdict-hd').evaluate(img=>img.naturalWidth===1672&&!img.hidden));
   await page.selectOption('[data-key=background]','light');check('phone: light selection immediately hides HD',await page.locator('.verdict-hd').evaluate(img=>img.hidden));
   await page.selectOption('[data-key=background]','auto');await page.locator('#settings-close').tap();check('phone: returning settings keeps runtime deferred',await page.evaluate(()=>!window.__game));
   await page.locator('#start-btn').tap();await page.locator('#class-confirm').tap();await page.waitForFunction(()=>window.__game.state==='playing');
   for(const size of [75,100,125]){
    await page.locator('#pause-btn').tap();await page.locator('#pause-settings').tap();await page.locator('#settings-tab-controls').tap();await page.locator('[data-key=stickSize]').evaluate((el,size)=>{el.value=size;el.dispatchEvent(new Event('input',{bubbles:true}));},size);await page.locator('#settings-close').tap();await page.locator('#touch-controls').waitFor({state:'visible'});
    const overlap=await page.evaluate(()=>{const rect=el=>el.getBoundingClientRect(),targets=[...document.querySelectorAll('#touch-controls .stick,#touch-controls .touch-actions button')].map(rect);return [...document.querySelectorAll('#touch-controls .touch-utilities button')].some(el=>{const a=rect(el);return targets.some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top);});});check('phone: '+size+'% stick size keeps utility targets separate',!overlap);
   }
   await page.reload();await page.locator('#start-btn').tap();await page.locator('#class-confirm').tap();await page.waitForFunction(()=>window.__game.state==='playing');await page.locator('#touch-controls').waitFor({state:'visible'});
   check('phone: a saved large stick layout is positioned on first run',await page.evaluate(()=>window.__game.settings.controls.stickSize===125&&[...document.querySelectorAll('#touch-controls .touch-utilities button')].every(el=>{const b=el.getBoundingClientRect();return b.left>0&&b.right<innerWidth&&b.top>=0&&b.bottom<=innerHeight;})));
  }else await page.click('#settings-close');
  await context.close();
 }
 const keyboard=await browser.newPage({viewport:{width:1280,height:720}});await keyboard.goto('http://127.0.0.1:5188');await keyboard.click('#menu-quick-settings');await keyboard.keyboard.press('ArrowRight');check('keyboard: arrows navigate setting tabs',await keyboard.locator('#settings-tab-graphics').getAttribute('aria-selected')==='true');await keyboard.keyboard.press('Home');await keyboard.keyboard.press('Shift+Tab');await keyboard.keyboard.press('Shift+Tab');check('keyboard: focus stays inside the settings dialog',await keyboard.evaluate(()=>document.activeElement.closest('.settings-panel')!==null));await keyboard.keyboard.press('Escape');check('keyboard: Escape returns to the triggering button',await keyboard.evaluate(()=>document.activeElement.id==='menu-quick-settings'));await keyboard.close();
 check('all responsive settings pages have no browser errors',errors.length===0);await writeFile('test-artifacts/settings-preview.json',JSON.stringify({checks,errors,evidence},null,2));
}finally{await browser.close();}
