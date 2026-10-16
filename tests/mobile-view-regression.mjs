import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const checks=[],errors=[],evidence={};
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let page;
try{
  for(const [name,width,height]of [['compact',640,360],['small',667,375],['phone',844,390],['tablet',1024,768]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,deviceScaleFactor:2});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5188');await page.locator('#start-btn').tap();await page.waitForFunction(()=>window.__game?.state==='select');
    await page.evaluate(()=>{const g=window.__game;g.newGame(270021,'mage');g.finishEntrance();g.shake=0;});await page.waitForTimeout(300);
    if(name==='phone')await page.screenshot({path:'test-artifacts/mobile-view-after.png',scale:'css'});
    const result=await page.evaluate(()=>{
      const g=window.__game,p=g.player,rooms=[],quality=()=>({buffer:[g.canvas.width,g.canvas.height],ratio:g.renderer.getPixelRatio(),shadows:g.sun.shadow.mapSize.x,bloom:g.bloom.enabled,particles:g.dust.geometry.drawRange.count});
      const initialQuality=quality(),originalSize=g.camera.top,desktopSize=Math.max(15,g.room.h*.66+2,(g.room.w+8)/(2*innerWidth/innerHeight));
      const fits=q=>q.x>=1&&q.x<=innerWidth-1&&q.y>=1&&q.y<=innerHeight-1;
      const directions={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]};
      for(const floor of [1,2,3]){
        g.loadFloor(floor);g.finishEntrance();g.state='paused';g.shake=0;g.clearCombat();
        // Exercise the real camera against every generated footprint. Changing
        // room data here isolates projection from combat and mesh construction.
        for(const room of g.dungeon.rooms){
          g.room=room;p.x=p.z=0;g.setCameraSize();g.followCamera(0,true);g.camera.updateMatrixWorld(true);
          const overview=Math.max(15,room.h*.66+2,(room.w+8)/(2*innerWidth/innerHeight));
          const samples=room.outline.flatMap(([x,z])=>[g.screenPoint(x,z,0),g.screenPoint(x,z,3.6)]),offscreen=[],doorOffscreen=[],playerOffscreen=[];
          for(const [x,z]of [[0,0],...room.outline.map(([x,z])=>[x*.9,z*.9])]){
            p.x=x;p.z=z;g.followCamera(0,true);g.camera.updateMatrixWorld(true);
            for(const [bx,bz]of room.outline)for(const y of [0,3.6]){const q=g.screenPoint(bx,bz,y);if(!fits(q))offscreen.push({x:bx,z:bz,y,q});}
            for(const [dir,[dx,dz]]of Object.entries(directions))if(room.links[dir]!==undefined){
              // The rendered gateway reaches 4.45 units above the floor; its
              // platform projects 1.6 units beyond the doorway threshold.
              for(const offset of [-3,3])for(const depth of [-1.6,1.6])for(const y of [0,4.45]){const bx=dx*(room.w/2+depth)+(dx===0?offset:0),bz=dz*(room.h/2+depth)+(dz===0?offset:0),q=g.screenPoint(bx,bz,y);if(!fits(q))doorOffscreen.push({dir,bx,bz,y,q});}
            }
            if(!fits(g.screenPoint(x,z,.15))||!fits(g.screenPoint(x,z,g.hero.userData.height)))playerOffscreen.push({x,z});
          }
          const xs=samples.map(q=>q.x),ys=samples.map(q=>q.y);
          rooms.push({floor,id:room.id,shape:room.shape,type:room.type,w:room.w,h:room.h,view:g.camera.top,overview,magnification:overview/g.camera.top,coverageX:(Math.max(...xs)-Math.min(...xs))/innerWidth,coverageY:(Math.max(...ys)-Math.min(...ys))/innerHeight,offscreen,doorOffscreen,playerOffscreen});
        }
      }
      const finalQuality=quality();
      g.newGame(270021,'mage');g.finishEntrance();g.state='paused';g.shake=0;
      const before=g.camera.top;g.controls.setMode(false);const desktop=g.camera.top;g.controls.setMode(true);const returned=g.camera.top;
      return {rooms,originalSize,desktopSize,initialQuality,finalQuality,inputModes:{before,desktop,returned},shapes:[...new Set(rooms.map(r=>r.shape))]};
    });evidence[name]=result;
    check(name+' standard room is about 18 percent larger',Math.abs(result.desktopSize/result.originalSize-1.18)<.001);
    check(name+' zoom preserves the drawing buffer and rendering features',JSON.stringify(result.initialQuality)===JSON.stringify(result.finalQuality));
    check(name+' all three floors retain complete room walls',result.rooms.every(r=>r.offscreen.length===0));
    check(name+' all doorway frames remain visible near room edges',result.rooms.every(r=>r.doorOffscreen.length===0));
    check(name+' player head and feet remain visible',result.rooms.every(r=>r.playerOffscreen.length===0));
    check(name+' wide rooms limit magnification to keep their framing',result.rooms.every(r=>r.magnification>=1-1e-9&&r.magnification<=1.18001));
    check(name+' switching keyboard and touch updates the camera immediately',result.inputModes.desktop>result.inputModes.before&&Math.abs(result.inputModes.before-result.inputModes.returned)<.001);
    check(name+' projection covers all eighteen room outlines',result.shapes.length===18);
    if(name==='phone'){
      const values=await page.evaluate(()=>{
        const g=window.__game,p=g.player;g.state='paused';
        const read=()=>({health:document.getElementById('player-health-value').textContent,shield:document.getElementById('player-shield-value').textContent});
        p.maxHp=9;p.hp=8;p.shield=3;g.ui.update();const fractions=read();
        p.hp=0;p.shield=0;g.ui.update();const empty=read();
        p.hp=9;p.shield=3;g.ui.update();const full=read();
        p.shield=2;g.ui.update();const partial=read();
        p.shield=8;g.ui.update();const acquired=read();p.shield=4;g.ui.update();const half=read();
        g.newGame(270021,'mage');g.finishEntrance();g.state='paused';g.ui.update();const reset=read();
        return {fractions,empty,full,partial,acquired,half,reset};
      });evidence.percentages=values;
      check('health rounds 8 of 9 to 89 percent',values.fractions.health==='89%');
      check('empty health and shield both display zero percent',values.empty.health==='0%'&&values.empty.shield==='0%');
      check('full health and shield both display 100 percent',values.full.health==='100%'&&values.full.shield==='100%');
      check('remaining shield rounds two of three to 67 percent',values.partial.shield==='67%');
      check('newly acquired shield updates its reference and consumption',values.acquired.shield==='100%'&&values.half.shield==='50%');
      check('new run resets the shield percentage reference',values.reset.shield==='100%');
    }
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:1440,height:900}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5188');await page.locator('#start-btn').click();await page.waitForFunction(()=>window.__game?.state==='select');
  await page.evaluate(()=>{const g=window.__game;g.newGame(270021,'mage');g.finishEntrance();g.state='paused';g.player.maxHp=9;g.player.hp=8;g.player.shield=0;g.ui.update();});await page.screenshot({path:'test-artifacts/mobile-view-desktop-percent.png'});
  check('desktop retains its original full room framing',await page.evaluate(()=>{const g=window.__game;return Math.abs(g.camera.top-Math.max(15,g.room.h*.66+2,(g.room.w+8)/(2*innerWidth/innerHeight)))<.001;}));
  check('desktop uses the same percentage labels',await page.locator('#player-health-value').textContent()==='89%'&&await page.locator('#player-shield-value').textContent()==='0%');
  await context.close();check('mobile framing and percentage sessions have no browser errors',errors.length===0);
  await writeFile('test-artifacts/mobile-view-regression.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){console.error(error);await page?.screenshot({path:'test-artifacts/mobile-view-failure.png'}).catch(()=>{});await writeFile('test-artifacts/mobile-view-regression.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,evidence},null,2));process.exitCode=1;}finally{await browser.close();}
