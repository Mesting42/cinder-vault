import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],checks=[],evidence={floors:[]};
page.on('pageerror',e=>errors.push(e.message));
const check=(name,result)=>{assert(result,name);checks.push(name);console.log('PASS',name);};
try{
  await mkdir('test-artifacts',{recursive:true});
  await page.goto('http://127.0.0.1:5188');
  await page.waitForFunction(()=>window.__game?.menuEntrance?.finished);
  check('first-load animation completes with exterior scenery',await page.evaluate(()=>!!window.__game.roomVisual.exterior&&window.__game.menuEntrance.finished));
  await page.screenshot({path:'test-artifacts/ruins-menu.png'});
  await page.click('#start-btn');await page.click('#class-confirm');
  check('starting a run still plays the descent animation',await page.evaluate(()=>window.__game.state==='intro'));
  await page.waitForFunction(()=>window.__game.state==='playing');
  for(const floor of[1,2]){
    const result=await page.evaluate(async floor=>{
      const g=window.__game,THREE={Vector3:g.hero.position.constructor,Vector2:g.mouseVector.constructor,Raycaster:g.raycaster.constructor};
      g.newGame(270021);if(floor===2)g.loadFloor(2);g.finishEntrance();g.state='paused';g.shake=0;g.input.down=false;g.input.keys.clear();
      const rooms=[];
      for(const room of g.dungeon.rooms){
        g.enterRoom(room.id);g.state='paused';g.shake=0;g.player.x=0;g.player.z=0;g.followCamera(0,true);g.camera.updateMatrixWorld(true);g.scene.updateMatrixWorld(true);
        const exterior=g.roomVisual.exterior,root=exterior.group,points=[];
        for(let x=-room.w/2+1.2;x<room.w/2-1;x+=2.3)for(let z=-room.h/2+1.2;z<room.h/2-1;z+=2.3){
          if(!g.isSolid(x,z,.45))points.push({x,z});
        }
        const solidBefore=points.map(p=>g.isSolid(p.x,p.z,.45));root.visible=false;
        const solidAfter=points.map(p=>g.isSolid(p.x,p.z,.45));root.visible=true;
        const blocked=[],ray=new THREE.Raycaster();
        for(const point of points){
          const world=new THREE.Vector3(point.x,.12,point.z),projected=world.clone().project(g.camera);
          ray.setFromCamera(new THREE.Vector2(projected.x,projected.y),g.camera);
          const distance=world.clone().sub(ray.ray.origin).dot(ray.ray.direction),hit=ray.intersectObject(root,true)[0];
          if(hit&&hit.distance<distance-.03)blocked.push({point,distance,hit:hit.distance});
        }
        let active=0;g.scene.traverse(o=>{if(o.userData.exterior)active++;});
        const instances=root.children.filter(o=>o.isInstancedMesh);
        rooms.push({id:room.id,shape:room.shape,theme:exterior.theme,size:g.camera.top,desired:g.playViewSize(),instances:exterior.instances,batches:exterior.drawBatches,landmarks:exterior.landmarks.length,occluded:blocked,checkedPoints:points.length,collisionUnchanged:JSON.stringify(solidBefore)===JSON.stringify(solidAfter),activeExteriors:active,castShadows:instances.some(m=>m.castShadow),fingerprint:JSON.stringify(exterior.landmarks)});
      }
      const target=g.dungeon.rooms.find(r=>r.shape==='wing')||g.dungeon.rooms.find(r=>r.type==='combat');g.enterRoom(target.id);g.state='paused';g.shake=0;g.hero.visible=true;g.hero.position.set(g.player.x,0,g.player.z);g.followCamera(0,true);
      g.ui.update();document.getElementById('room-banner').style.animation='none';document.getElementById('room-banner').style.opacity='0';document.getElementById('hud').classList.remove('hud-enter');document.getElementById('toast-stack').innerHTML='';
      const exterior=g.roomVisual.exterior;
      const particleBefore=Array.from(exterior.particles.geometry.attributes.position.array),fogBefore=exterior.wisps[0].sprite.position.x;
      g.time+=6;g.animateWorld(0);const animated=particleBefore.some((v,i)=>Math.abs(v-exterior.particles.geometry.attributes.position.array[i])>.0001)&&Math.abs(exterior.wisps[0].sprite.position.x-fogBefore)>.001;
      g.renderer.info.autoReset=false;g.renderer.info.reset();exterior.group.visible=false;g.composer.render();const baseCalls=g.renderer.info.render.calls;
      exterior.group.visible=true;g.renderer.info.reset();g.composer.render();const decoratedCalls=g.renderer.info.render.calls;g.renderer.info.autoReset=true;
      return{floor,rooms,animated,baseCalls,decoratedCalls,extraCalls:decoratedCalls-baseCalls};
    },floor);
    evidence.floors.push(result);
    check(`floor ${floor}: exterior built for every random room`,result.rooms.length>=11&&result.rooms.every(r=>r.landmarks>20&&r.instances>1000));
    check(`floor ${floor}: full-room camera scale remains unchanged`,result.rooms.every(r=>r.size===r.desired&&r.size>=15));
    check(`floor ${floor}: decoration never changes movement collision`,result.rooms.every(r=>r.checkedPoints>0&&r.collisionUnchanged));
    check(`floor ${floor}: decoration never covers the walkable combat surface`,result.rooms.every(r=>r.occluded.length===0));
    check(`floor ${floor}: room switches show only the current exterior`,result.rooms.every(r=>r.activeExteriors===1));
    check(`floor ${floor}: static scenery uses <= 6 instance batches and no extra shadow pass`,result.rooms.every(r=>r.batches<=6&&!r.castShadows));
    check(`floor ${floor}: scenery adds no more than 26 draw calls`,result.extraCalls>0&&result.extraCalls<=26);
    check(`floor ${floor}: mist and particles animate`,result.animated);
    check(`floor ${floor}: room exteriors vary with their seed`,new Set(result.rooms.map(r=>r.fingerprint)).size===result.rooms.length);
    await page.waitForTimeout(180);
    await page.screenshot({path:`test-artifacts/ruins-floor${floor}.png`});
  }
  check('the two floors have different environment themes',evidence.floors[0].rooms.every(r=>r.theme==='verdigris-ruins')&&evidence.floors[1].rooms.every(r=>r.theme==='cinder-chasm'));
  const revisit=await page.evaluate(()=>{const g=window.__game,id=g.room.id,e=g.roomVisual.exterior,fingerprint=JSON.stringify(e.landmarks),other=g.dungeon.rooms.find(r=>r.id!==id);g.enterRoom(other.id);g.enterRoom(id);g.state='paused';return e===g.roomVisual.exterior&&JSON.stringify(g.roomVisual.exterior.landmarks)===fingerprint;});
  check('revisiting a room preserves its original environment',revisit);
  await page.setViewportSize({width:2560,height:720});
  await page.waitForFunction(()=>innerWidth===2560&&innerHeight===720&&window.__game.renderer.domElement.width===2560);
  await page.evaluate(()=>{const g=window.__game;g.hero.visible=true;g.shake=0;g.followCamera(0,true);});
  await page.waitForTimeout(120);await page.screenshot({path:'test-artifacts/ruins-ultrawide.png'});
  const wide=await page.evaluate(()=>{const g=window.__game;return{size:g.camera.top,expected:g.playViewSize(),canvas:{width:g.canvas.clientWidth,height:g.canvas.clientHeight},exterior:!!g.roomVisual.exterior};});
  check('ultrawide windows retain the overview and exterior',wide.size===wide.expected&&wide.canvas.width===2560&&wide.canvas.height===720&&wide.exterior);
  check('production browser has no runtime errors',errors.length===0);
  await writeFile('test-artifacts/exterior-regression.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){
  await page.screenshot({path:'test-artifacts/exterior-failure.png'}).catch(()=>{});
  await writeFile('test-artifacts/exterior-regression.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,evidence},null,2));
  console.error(error);process.exitCode=1;
}finally{await browser.close();}
