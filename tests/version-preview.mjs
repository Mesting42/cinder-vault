import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='http://127.0.0.1:5188',checks=[],errors=[],evidence={};
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
const versionResponse=await fetch(base+'/version.json'),version=await versionResponse.json();
const localHtml=await readFile('dist/index.html'),expected=createHash('sha256').update(localHtml).digest('hex').slice(0,12);
check('server publishes the new game name and exact built revision',version.game==='BELOW THE OATH'&&version.id==='cinder-vault'&&version.revision===expected);
const entry=base+version.url,htmlResponse=await fetch(entry),html=await htmlResponse.text(),script=html.match(/<script[^>]*src="([^"]+)"/)[1],scriptResponse=await fetch(base+script);
check('latest entry serves the current built HTML',html===localHtml.toString());
check('HTML, version and executable assets cannot remain cached', [versionResponse,htmlResponse,scriptResponse].every(response=>response.headers.get('cache-control')?.includes('no-store')));
evidence.entry=entry;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:2560,height:1410}});page.on('pageerror',error=>errors.push(error.message));
try{
  await page.goto(entry);await page.click('#start-btn');await page.click('#class-confirm');await page.waitForFunction(()=>window.__game.state==='playing');await page.waitForFunction(()=>window.__game.player.invul===0);
  evidence.default=await page.evaluate(()=>{const g=window.__game,p=g.room.outline.map(([x,z])=>g.screenPoint(x,z,0));return {viewport:[innerWidth,innerHeight],view:g.camera.top,version:g.version,room:[g.room.w,g.room.h],floorWidth:Math.max(...p.map(q=>q.x))-Math.min(...p.map(q=>q.x)),floorHeight:Math.max(...p.map(q=>q.y))-Math.min(...p.map(q=>q.y))};});
  check('real browser runs the restored overview build',evidence.default.version==='music-heroes-20261005-17'&&evidence.default.view>=15);
  check('the whole room fits inside the user-sized viewport',evidence.default.floorWidth<2560*.9&&evidence.default.floorHeight<1410*.9);
  check('the unrequested zoom controls have been removed',await page.locator('#view-controls').count()===0);
  await page.screenshot({path:'test-artifacts/map-user-resolution.png'});
  await page.keyboard.press('Equal');await page.keyboard.press('Minus');
  check('old zoom shortcuts no longer enlarge the scene',await page.evaluate(()=>window.__game.camera.top)===evidence.default.view);
  await page.evaluate(()=>window.__game.newGame(270021));await page.waitForFunction(()=>window.__game.state==='playing');
  check('new runs also use the full-room overview',await page.evaluate(()=>window.__game.camera.top>=15));
  check('browser remains free of runtime errors',errors.length===0);
  await writeFile('test-artifacts/version-preview.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){await page.screenshot({path:'test-artifacts/version-preview-failure.png'});await writeFile('test-artifacts/version-preview.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,evidence},null,2));console.error(error);process.exitCode=1;}finally{await browser.close();}

