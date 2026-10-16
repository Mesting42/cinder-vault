import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[],checks=[],evidence={};
page.on('pageerror',error=>errors.push(error.message));
const check=(name,passed)=>{assert(passed,name);checks.push(name);console.log('PASS',name);};
const sampleMenu=()=>page.evaluate(()=>{const g=window.__game;return {state:g.state,animation:g.menuEntrance&&{...g.menuEntrance},camera:g.camera.position.toArray(),projection:g.camera.top,room:g.roomVisual.group.position.toArray(),scale:g.roomVisual.group.scale.toArray(),hero:g.hero.position.toArray()};});

try{
  await mkdir('test-artifacts',{recursive:true});
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:5188');
  await page.waitForFunction(()=>window.__game?.roomVisual);
  evidence.menuStart=await sampleMenu();
  check('first page load starts an independent menu entrance',evidence.menuStart.state==='menu'&&evidence.menuStart.animation&&!evidence.menuStart.animation.finished);
  await page.waitForTimeout(700);
  evidence.menuMid=await sampleMenu();
  await page.screenshot({path:'test-artifacts/menu-arrival-mid.png'});
  const moved=(a,b)=>a.some((value,index)=>Math.abs(value-b[index])>.05);
  check('initial entrance moves the actual 3D scene or camera',moved(evidence.menuStart.camera,evidence.menuMid.camera)||moved(evidence.menuStart.room,evidence.menuMid.room)||moved(evidence.menuStart.scale,evidence.menuMid.scale));
  await page.waitForFunction(()=>window.__game.menuEntrance?.finished,{timeout:12000});
  evidence.menuSettled=await sampleMenu();
  check('menu entrance settles to an unscaled room at floor height',Math.abs(evidence.menuSettled.room[1])<.001&&evidence.menuSettled.scale.every(value=>Math.abs(value-1)<.001));
  await page.screenshot({path:'test-artifacts/menu-arrival-settled.png'});
  await page.click('#start-btn');await page.click('#class-confirm');
  evidence.runStart=await page.evaluate(()=>({state:window.__game.state,elapsed:window.__game.intro?.elapsed,visible:!document.getElementById('entry-screen').classList.contains('hidden')}));
  check('start button begins a fresh run entrance after the menu animation',evidence.runStart.state==='intro'&&evidence.runStart.elapsed<.4&&evidence.runStart.visible);
  await page.waitForTimeout(260);
  evidence.runMid=await page.evaluate(()=>({state:window.__game.state,heroY:window.__game.hero.position.y,cameraY:window.__game.camera.position.y}));
  check('run entrance has visible character descent and camera motion',evidence.runMid.state==='intro'&&evidence.runMid.heroY>1&&evidence.runMid.cameraY>30);
  await page.screenshot({path:'test-artifacts/run-arrival-mid.png'});
  await page.waitForFunction(()=>window.__game.state==='playing',{timeout:12000});
  check('run entrance finishes with grounded character and visible HUD',await page.evaluate(()=>Math.abs(window.__game.hero.position.y)<.01&&!document.getElementById('hud').classList.contains('hidden')));
  await page.screenshot({path:'test-artifacts/start-room-door-redesign.png'});

  evidence.rolls=await page.evaluate(async()=>{
    const Box3=window.__game.hero.userData.bounds.constructor;
    const g=window.__game,p=g.player,originalObjects=g.room.objects;
    g.state='paused';g.input.down=false;g.clearCombat();g.room.enemies=[];g.room.sealed=true;g.updateDoors();g.room.objects=[];
    const samples=[],box=new Box3();
    const dirs=[['east',['KeyD']],['west',['KeyA']],['south',['KeyS']],['north',['KeyW']],['southeast',['KeyD','KeyS']],['northeast',['KeyD','KeyW']],['southwest',['KeyA','KeyS']],['northwest',['KeyA','KeyW']]];
    for(const dt of [.01,.04])for(const [direction,keys]of dirs){
      p.x=0;p.z=0;p.rollTime=0;p.rollCd=0;p.invul=0;p.passives=[];g.transitionCd=100;
      g.hero.visible=true;g.input.keys=new Set(keys);g.roll();g.input.keys.clear();
      const before={x:p.x,z:p.z},frames=[];
      while(p.rollTime>0){g.update(dt);g.time+=dt;g.animateWorld(dt);g.hero.updateMatrixWorld(true);box.setFromObject(g.hero,true);frames.push({x:p.x,z:p.z,minY:box.min.y,maxY:box.max.y,rollTime:p.rollTime,solid:g.isSolid(p.x,p.z,.39)});}
      samples.push({direction,dt,distance:Math.hypot(p.x-before.x,p.z-before.z),minimumY:Math.min(...frames.map(f=>f.minY)),frames:frames.length,solidFrames:frames.filter(f=>f.solid).length});
    }
    g.room.objects=originalObjects;return samples;
  });
  for(const roll of evidence.rolls){
    check(`${roll.direction} roll (${roll.dt*1000} ms frames) stays within the shorter distance`,roll.distance>3.6&&roll.distance<4.6);
    check(`${roll.direction} roll (${roll.dt*1000} ms frames) keeps all character geometry above ground`,roll.minimumY>=-.03);
    check(`${roll.direction} roll (${roll.dt*1000} ms frames) remains inside the room`,roll.solidFrames===0);
  }

  evidence.contacts=await page.evaluate(async()=>{
    const Box3=window.__game.hero.userData.bounds.constructor;
    const g=window.__game,p=g.player,objects=g.room.objects;
    const heroBox=new Box3(),objectBox=new Box3(),results=[];
    const reset=(x,z,keys)=>{p.x=x;p.z=z;p.rollTime=0;p.rollCd=0;p.invul=0;g.transitionCd=100;g.input.keys=new Set(keys);g.roll();g.input.keys.clear();};
    for(const kind of ['table','column']){
      let object=objects.find(o=>o.type===kind&&o.model.children.length>0),created=false;
      if(!object)throw Error(`Start room is missing the real ${kind} collision fixture`);
      const original={x:object.x,z:object.z,position:object.model.position.clone()};
      object.x=0;object.z=0;object.model.position.set(0,0,0);g.room.objects=[object];
      for(const [direction,x,z,keys]of [['east',-object.hw-2,0,['KeyD']],['south',0,-object.hh-2,['KeyS']]]){
        reset(x,z,keys);let penetrated=false,visualOverlap=0,minimumY=Infinity;
        while(p.rollTime>0){
          g.update(.04);g.time+=.04;g.animateWorld(.04);g.hero.updateMatrixWorld(true);object.model.updateMatrixWorld(true);heroBox.setFromObject(g.hero,true);objectBox.setFromObject(object.model,true);
          penetrated||=g.isSolid(p.x,p.z,.39);minimumY=Math.min(minimumY,heroBox.min.y);
          // Test individual animated mesh volumes so an elevated barrel or hat
          // cannot count as intersecting a low table through the root AABB.
          const partBox=new Box3();g.hero.traverse(mesh=>{if(!mesh.isMesh)return;partBox.setFromObject(mesh,true);
            if(partBox.max.y<=objectBox.min.y||partBox.min.y>=objectBox.max.y)return;
            const overlapX=Math.min(partBox.max.x,objectBox.max.x)-Math.max(partBox.min.x,objectBox.min.x),overlapZ=Math.min(partBox.max.z,objectBox.max.z)-Math.max(partBox.min.z,objectBox.min.z);
            if(overlapX>0&&overlapZ>0)visualOverlap=Math.max(visualOverlap,Math.min(overlapX,overlapZ));
          });
        }
        results.push({kind,direction,penetrated,visualOverlap,minimumY,end:{x:p.x,z:p.z},footprint:{hw:object.hw,hh:object.hh}});
      }
      object.x=original.x;object.z=original.z;object.model.position.copy(original.position);
      if(created)g.roomVisual.group.remove(object.model);
    }
    g.room.objects=[];
    for(const [direction,x,z,keys]of [['east',g.room.w/2-2,0,['KeyD']],['west',-g.room.w/2+2,0,['KeyA']],['south',0,g.room.h/2-2,['KeyS']],['north',0,-g.room.h/2+2,['KeyW']]]){
      g.room.sealed=true;reset(x,z,keys);let penetrated=false;
      // Keep the controlled closed-wall fixture authoritative while update()
      // naturally clears an empty room after each sampled movement.
      while(p.rollTime>0){g.room.sealed=true;g.update(.04);penetrated||=g.isSolid(p.x,p.z,.39);}
      results.push({kind:'wall',direction,penetrated,distance:Math.hypot(p.x-x,p.z-z),end:{x:p.x,z:p.z}});
    }
    // A single large movement request must be swept, even across a thin collider.
    g.room.objects=[{type:'column',x:1,z:0,hw:.05,hh:2,solid:true,shotBlock:true,destroyed:false}];
    p.x=-4;p.z=0;g.moveActor(p,12,0,.39,true);
    results.push({kind:'thin-collider-sweep',x:p.x,passed:p.x<=.57&&!g.isSolid(p.x,p.z,.39)});
    g.room.objects=objects;return results;
  });
  for(const contact of evidence.contacts){
    check(`${contact.kind} ${contact.direction||''} collision blocks movement without tunneling`,contact.kind==='thin-collider-sweep'?contact.passed:!contact.missing&&!contact.penetrated);
    if(contact.visualOverlap!==undefined)check(`${contact.kind} ${contact.direction} contact keeps the rolled silhouette out of cover`,contact.visualOverlap<.04);
    if(contact.kind==='wall')check(`${contact.direction} sealed wall stops the short roll`,contact.distance<1.6);
  }

  evidence.doors=await page.evaluate(()=>{
    const g=window.__game,rows=[];g.state='paused';g.room.enemies=[];g.room.sealed=true;g.updateDoors();
    for(let i=0;i<45;i++)g.animateWorld(.04);
    for(const [direction,door]of Object.entries(g.roomVisual.doors))rows.push({direction,closed:{progress:door.progress,target:door.targetOpen,visible:door.seal.visible},metadata:{lamps:door.lamps?.length||0,status:!!door.status,meshes:0}});
    g.room.sealed=false;g.updateDoors();for(let i=0;i<45;i++)g.animateWorld(.04);
    for(const row of rows){const door=g.roomVisual.doors[row.direction];row.open={progress:door.progress,target:door.targetOpen,visible:door.seal.visible};door.group.traverse(o=>{if(o.isMesh)row.metadata.meshes++;});}
    return rows;
  });
  check('generated room contains redesigned gateways',evidence.doors.length>0);
  for(const door of evidence.doors){
    check(`${door.direction} gateway has a sculpted frame, lamps and status display`,door.metadata.meshes>=8&&door.metadata.lamps>=2&&door.metadata.status);
    check(`${door.direction} gateway seals the room for combat`,door.closed.target===0&&door.closed.progress<.02&&door.closed.visible);
    check(`${door.direction} gateway opens after combat`,door.open.target===1&&door.open.progress>.98);
  }
  await page.screenshot({path:'test-artifacts/door-redesign.png'});
  check('browser reports no runtime exceptions',errors.length===0);
  await writeFile('test-artifacts/animation-regression.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){
  await page.screenshot({path:'test-artifacts/animation-regression-failure.png'}).catch(()=>{});
  await writeFile('test-artifacts/animation-regression.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,evidence},null,2));
  console.error(error);process.exitCode=1;
}finally{await browser.close();}
