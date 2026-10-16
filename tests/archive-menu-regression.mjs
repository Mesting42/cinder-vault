import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readdir} from 'node:fs/promises';
const base=process.env.GAME_URL||'http://127.0.0.1:5188';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks=[],errors=[],evidence={devices:{}};
const check=(name,result)=>{assert(result,name);checks.push(name);console.log('PASS',name);};
await mkdir('test-artifacts',{recursive:true});
try{
 for(const [name,width,height,touch] of [['desktop',1440,900,false],['phone',844,390,true],['phone-small',667,375,true],['tablet',1024,768,true]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:1});
  const page=await context.newPage(),requests=[];page.on('pageerror',e=>errors.push(`${name}: ${e.message}`));page.on('request',r=>requests.push(r.url()));
  await page.goto(base);await page.waitForFunction(()=>document.getElementById('menu').dataset.scene==='ready');await page.waitForTimeout(1050);
  check(`${name}: realtime hall appears without loading battle code`,await page.evaluate(()=>!!window.__cinderMenuScene&&!window.__game));
  check(`${name}: homepage requests no background image or audio`,requests.every(r=>!r.includes('last-verdict')&&!r.includes('/audio/')&&!/\.(webp|png|avif)(\?|$)/.test(r)));
  check(`${name}: menu targets fit and stay usable`,await page.locator('.verdict-row').evaluateAll(els=>els.filter(el=>el.getClientRects().length).every(el=>{const b=el.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.bottom<innerHeight&&b.height>=44;})));
  await page.screenshot({path:`test-artifacts/archive-menu-${name}.png`});
  evidence.devices[name]=await page.evaluate(()=>{const s=window.__cinderMenuScene;return{resolution:[s.renderer.domElement.width,s.renderer.domElement.height],sceneTime:window.__cinderBoot.metrics.backgroundReady,interactive:window.__cinderBoot.metrics.interactive,transfer:performance.getEntriesByType('resource').reduce((sum,r)=>sum+r.transferSize,0),meshCount:(()=>{let n=0;s.scene.traverse(o=>n+=Number(o.isMesh===true));return n;})(),camera:s.camera.position.toArray()};});
  const open=()=>touch?page.locator('#menu-quick-settings').tap():page.click('#menu-settings');
  await open();await page.click('#settings-tab-graphics');
  check(`${name}: retired image quality option is absent`,await page.locator('[data-key=background]').count()===0&&!(await page.locator('#settings-page-graphics').textContent()).includes('高清图'));
  await page.locator('[data-key=quality]').selectOption('low');
  check(`${name}: low preset changes actual menu rendering`,await page.evaluate(()=>{const s=window.__cinderMenuScene;return s.renderer.getPixelRatio()===.75&&!s.renderer.shadowMap.enabled&&!s.bloom.enabled&&s.quality.particles===0;}));
  await page.locator('[data-key=quality]').selectOption('high');
  check(`${name}: high preset restores crisp shadows and real bloom`,await page.evaluate(()=>{const s=window.__cinderMenuScene;return s.renderer.getPixelRatio()===2&&s.renderer.shadowMap.enabled&&s.bloom.enabled&&s.renderer.domElement.width===innerWidth*2;}));
  await page.locator('[data-key=quality]').selectOption('auto');
  await page.click('#settings-tab-accessibility');await page.click('[data-key=reduceMotion]');await page.waitForTimeout(180);
  const stopped=await page.evaluate(()=>({frames:window.__cinderMenuScene.renderFrames,time:window.__cinderMenuScene.time}));await page.waitForTimeout(250);
  check(`${name}: reduced motion freezes scene time and redundant rendering`,await page.evaluate(s=>window.__cinderMenuScene.time===s.time&&window.__cinderMenuScene.renderFrames===s.frames,stopped));
  await page.click('[data-key=reduceMotion]');await page.click('#settings-close');
  await page.locator('#start-btn').focus();await page.keyboard.press('ArrowDown');check(`${name}: arrow keys retain menu navigation`,await page.locator('#menu-classes').evaluate(el=>el===document.activeElement));
  await page.keyboard.press('Enter');await page.waitForFunction(()=>window.__game?.state==='select');await page.waitForTimeout(120);
  const hiddenFrames=await page.evaluate(()=>window.__cinderMenuScene.renderFrames);await page.waitForTimeout(250);
  check(`${name}: hall stops drawing behind class selection`,await page.evaluate(n=>window.__cinderMenuScene.renderFrames===n,hiddenFrames));
  await page.click('#class-back');await page.waitForFunction(n=>window.__cinderMenuScene.renderFrames>n,hiddenFrames);
  const gameFrames=await page.evaluate(()=>window.__game.renderFrames);await page.waitForTimeout(200);
  check(`${name}: returning to menu reuses one hall and suspends battle renderer`,await page.evaluate(n=>document.querySelectorAll('#menu-scene').length===1&&window.__game.renderFrames===n,gameFrames));
  if(touch){
   await page.evaluate(()=>window.__game.controls.setMode(true));
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);const frames=await page.evaluate(()=>window.__cinderMenuScene.renderFrames);await page.waitForTimeout(200);
   check(`${name}: portrait orientation suspends menu rendering`,await page.evaluate(n=>!document.getElementById('rotate-screen').classList.contains('hidden')&&window.__cinderMenuScene.renderFrames===n,frames));
  }
  await context.close();
 }
 const reduced=await browser.newContext({viewport:{width:1280,height:720},reducedMotion:'reduce'}),rp=await reduced.newPage();await rp.goto(base);await rp.waitForFunction(()=>window.__cinderMenuScene?.renderFrames>0);const frames=await rp.evaluate(()=>window.__cinderMenuScene.renderFrames);await rp.waitForTimeout(250);check('system reduced-motion also renders a stationary hall',await rp.evaluate(n=>window.__cinderMenuScene.reducedMotion&&window.__cinderMenuScene.renderFrames===n,frames));await reduced.close();
 const noScene=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true}),fp=await noScene.newPage();await fp.route('**/assets/menu-scene-*.js',route=>route.abort());await fp.goto(base);await fp.waitForFunction(()=>document.getElementById('menu').dataset.scene==='unavailable');await fp.locator('#menu-quick-settings').tap();check('a scene load failure leaves settings usable',await fp.locator('#settings-close').isVisible());await fp.click('#settings-close');await fp.click('#start-btn');await fp.waitForFunction(()=>window.__game?.state==='select');check('a scene load failure leaves Start usable',await fp.locator('#class-confirm').isVisible());await noScene.close();
 check('old AI assets are absent from production resources',!(await readdir('dist')).some(f=>f.startsWith('last-verdict')));
 check('no runtime errors across menu, settings and selection',errors.length===0);
 await writeFile('test-artifacts/archive-menu-regression.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){await writeFile('test-artifacts/archive-menu-regression.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,evidence},null,2));console.error(error);process.exitCode=1;}
finally{await browser.close();}
