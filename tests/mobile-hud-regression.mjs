import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {normalizeSettings} from '../src/settings.js';
const checks=[],errors=[],evidence={};
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
const legacy=normalizeSettings({controls:{stickSize:120}},true);
check('old shared joystick size migrates to both sides',legacy.controls.leftStickSize===120&&legacy.controls.rightStickSize===120);
const mixed=normalizeSettings({controls:{stickSize:120,leftStickSize:75}},true);
check('explicit side size takes precedence during migration',mixed.controls.leftStickSize===75&&mixed.controls.rightStickSize===120);
for(const [key,value]of [['leftStickInset',49],['rightStickSize',126]]){
  check('invalid '+key+' is rejected',(()=>{try{normalizeSettings({controls:{[key]:value}},true);return false;}catch{return true;}})());
}
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let page;
const slider=(key,value)=>page.locator('input[data-key='+key+']').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));
const layout=()=>page.evaluate(()=>{
  const elements=[...document.querySelectorAll('#touch-controls button,#touch-controls .stick')];
  return elements.map(el=>{const r=el.getBoundingClientRect();return{name:el.dataset.action||el.dataset.stick,x:r.x,y:r.y,w:r.width,h:r.height};});
});
const fits=(list,w,h)=>list.every(r=>r.w>=44&&r.h>=44&&r.x>=-.1&&r.y>=-.1&&r.x+r.w<=w+.1&&r.y+r.h<=h+.1);
const noOverlap=list=>list.every((a,i)=>list.slice(i+1).every(b=>a.x+a.w<=b.x+.1||b.x+b.w<=a.x+.1||a.y+a.h<=b.y+.1||b.y+b.h<=a.y+.1));
async function configure(values){await page.evaluate(()=>window.__game.ui.settings());await page.locator('#settings-tab-controls').tap();await page.waitForFunction(()=>document.getElementById('settings-tab-controls').getAttribute('aria-selected')==='true');for(const [key,value]of Object.entries(values))await slider(key,value);await page.locator('#settings-close').tap();await page.waitForFunction(()=>window.__game.state==='playing'&&!document.getElementById('touch-controls').classList.contains('hidden'));await page.waitForTimeout(120);}
try{
  for(const [name,width,height,touch]of [['phone',844,390,true],['compact',640,360,true],['small',667,375,true],['tablet',1024,768,true],['desktop',1440,900,false]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:1});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5188');
    if(name==='phone'){
      await page.locator('#menu-quick-settings').tap();await page.locator('#settings-tab-controls').tap();
      check('four independent joystick sliders work before 3D loads',await page.locator('input[data-key$=StickSize],input[data-key$=StickInset]').count()===4&&await page.evaluate(()=>!window.__game));
      for(const [key,value]of Object.entries({leftStickSize:125,rightStickSize:75,leftStickInset:32,rightStickInset:48}))await slider(key,value);
      await page.reload();await page.locator('#menu-quick-settings').tap();await page.locator('#settings-tab-controls').tap();
      check('all four layout values survive reload',await page.locator('[data-key=leftStickSize]').inputValue()==='125'&&await page.locator('[data-key=rightStickSize]').inputValue()==='75'&&await page.locator('[data-key=leftStickInset]').inputValue()==='32'&&await page.locator('[data-key=rightStickInset]').inputValue()==='48');
      await page.locator('#settings-reset-touch').tap();check('layout reset restores only joystick layout',await page.locator('[data-key=leftStickSize]').inputValue()==='100'&&await page.locator('[data-key=rightStickInset]').inputValue()==='0');await page.locator('#settings-close').tap();
    }
    if(touch)await page.locator('#start-btn').tap();else await page.locator('#start-btn').click();await page.waitForFunction(()=>window.__game?.state==='select');
    await page.evaluate(()=>window.__game.newGame(270021,'mage'));await page.waitForFunction(()=>window.__game.state==='playing');await page.waitForTimeout(300);
    check(name+' removes hearts and decorative HUD labels',await page.evaluate(()=>!document.querySelector('#hearts,.heart,#hud .brand-small')&&!document.getElementById('hud').innerText.includes('VITALS')&&!document.getElementById('hud').innerText.includes('右键 /')));
    check(name+' merges a single-line weapon readout below both bars',await page.evaluate(()=>{const w=document.getElementById('weapon-hud'),r=w.getBoundingClientRect(),s=document.getElementById('player-shield-track').getBoundingClientRect(),a=document.getElementById('ammo').getBoundingClientRect(),n=document.getElementById('weapon-name').getBoundingClientRect();return w.parentElement.classList.contains('vitals')&&r.top>s.bottom&&Math.abs(a.top-n.top)<8&&r.height<40&&r.width<=240;}));
    check(name+' health bar uses actual class health percentage',await page.locator('#player-health-value').textContent()==='100%'&&await page.locator('#player-health-track').getAttribute('aria-valuemax')==='7'&&await page.locator('#player-health-fill').evaluate(el=>el.style.width==='100%'));
    check(name+' shield is a white horizontal bar',await page.locator('#player-shield-fill').evaluate(el=>getComputedStyle(el).backgroundImage.includes('255, 255, 255')));
    if(name==='phone'||name==='desktop')await page.screenshot({path:'test-artifacts/mobile-hud-'+name+'.png'});
    if(touch){
      const original=await layout();evidence[name]={default:original};check(name+' default controls fit without overlaps',fits(original,width,height)&&noOverlap(original));
      for(const [label,values]of [['maximum',{leftStickSize:125,rightStickSize:125,leftStickInset:48,rightStickInset:48}],['asymmetric',{leftStickSize:75,rightStickSize:125,leftStickInset:32,rightStickInset:48}],['minimum',{leftStickSize:75,rightStickSize:75,leftStickInset:0,rightStickInset:0}]]){
        await configure(values);const boxes=await layout();evidence[name][label]=boxes;
        check(name+' '+label+' controls fit with no shared touch targets',fits(boxes,width,height)&&noOverlap(boxes));
      }
      if(name==='compact'){
        await page.evaluate(()=>{document.documentElement.style.setProperty('--safe-left','44px');document.documentElement.style.setProperty('--safe-right','44px');});
        await configure({leftStickSize:125,rightStickSize:125,leftStickInset:48,rightStickInset:48});const safe=await layout();evidence[name].notched=safe;
        check('notched compact screen avoids collisions at maximum settings',fits(safe,width,height)&&noOverlap(safe));
      }
      if(name==='phone'){
        await configure({leftStickSize:125,rightStickSize:75,leftStickInset:32,rightStickInset:48});const boxes=await layout(),left=boxes.find(x=>x.name==='move'),right=boxes.find(x=>x.name==='aim');
        check('independent sizes alter actual touch target diameters',left.w===155&&right.w===93);
        check('independent insets move each actual pad',left.x===46&&width-right.x-right.w===62);
        // A real browser touch sequence verifies pointer capture and the resized radius.
        const cdp=await page.context().newCDPSession(page);await page.evaluate(()=>window.__game.controls.reset());
        const cx=left.x+left.w/2,cy=left.y+left.h/2;
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:cx,y:cy,radiusX:5,radiusY:5,force:1}]});
        check('resized pad computes its real input radius',await page.evaluate(()=>Math.abs([...window.__game.controls.pointers.values()][0].radius-155*.33)<.01));
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:cx+155*.33,y:cy,radiusX:5,radiusY:5,force:1}]});
        check('full resized radius still gives full movement',await page.evaluate(()=>window.__game.controls.move.x>.99));
        await page.waitForTimeout(100);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{id:1,x:cx+155*.33,y:cy,radiusX:5,radiusY:5,force:1}]});check('release clears held movement after resizing',await page.evaluate(()=>window.__game.controls.pointers.size===0&&window.__game.controls.move.x===0));
        // Allow Chrome's post-drag tap suppression to expire before a separate
        // gesture on the opposite screen edge; this is not a gameplay cooldown.
        await cdp.detach();await page.waitForTimeout(250);await page.locator('#pause-btn').tap();await page.locator('#pause-settings').tap();await page.locator('#settings-tab-controls').tap();await page.waitForFunction(()=>document.getElementById('settings-tab-controls').getAttribute('aria-selected')==='true');await page.screenshot({path:'test-artifacts/mobile-hud-settings.png'});await page.locator('#settings-close').tap();
        const before=await page.evaluate(()=>({hp:window.__game.player.hp,shield:window.__game.player.shield}));
        await page.evaluate(()=>{const g=window.__game;g.player.invul=0;g.hurtPlayer(1);g.ui.update();});
        check('real hit consumes shield and empties the white bar first',await page.evaluate(hp=>window.__game.player.hp===hp&&document.getElementById('player-shield-value').textContent==='0%'&&document.getElementById('player-shield-fill').style.width==='0%',before.hp));
        await page.evaluate(()=>{const g=window.__game;g.player.invul=0;g.hurtPlayer(1);g.ui.update();});
        check('subsequent hit updates actual health percentage and its fill',await page.evaluate(hp=>window.__game.player.hp===hp-1&&document.getElementById('player-health-value').textContent===`${Math.round((hp-1)/hp*100)}%`&&Math.abs(parseFloat(document.getElementById('player-health-fill').style.width)-(hp-1)/hp*100)<.01,before.hp));
        await page.evaluate(()=>{const g=window.__game;g.grantSkillShield(3);g.ui.update();});
        check('gained shield updates its actual amount and percentage',await page.locator('#player-shield-value').textContent()==='100%'&&await page.locator('#player-shield-track').getAttribute('aria-valuenow')==='3'&&await page.locator('#player-shield-fill').evaluate(el=>el.style.width==='100%'));
        await page.evaluate(()=>{const g=window.__game;g.player.invul=0;g.hurtPlayer(1);g.ui.update();});
        check('shield loss is proportional to acquired capacity',await page.locator('#player-shield-fill').evaluate(el=>Math.abs(parseFloat(el.style.width)-200/3)<.01));
        const icons=[];
        for(const id of ['shooter','mage','warrior']){
          await page.evaluate(id=>{const g=window.__game;g.newGame(270021,id);if(g.state==='intro')g.finishEntrance();g.ui.update();g.controls.lastUI=-1;g.controls.update();},id);await page.waitForTimeout(150);
          icons.push(await page.locator('[data-action=skill] svg path').getAttribute('d'));
          check(id+' button has a meaningful accessible action name',!(await page.locator('[data-action=skill]').getAttribute('aria-label')).includes('undefined'));
        }
        check('each profession gets a distinct skill symbol',new Set(icons).size===3);
        check('buttons hide labels while retaining cooldown and quantity badges',await page.locator('[data-action=roll]>span').isHidden()&&await page.locator('[data-action=blank]>small').isVisible());
      }
    }else check('desktop hides touch controls',await page.locator('#touch-controls').isHidden());
    await context.close();
  }
  check('HUD and layout sessions have no browser errors',errors.length===0);
  await writeFile('test-artifacts/mobile-hud-regression.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){console.error(error);await page?.screenshot({path:'test-artifacts/mobile-hud-failure.png'}).catch(()=>{});await writeFile('test-artifacts/mobile-hud-regression.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,evidence},null,2));process.exitCode=1;}finally{await browser.close();}
