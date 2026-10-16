import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),checks=[],errors=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=(name,passed)=>{assert(passed,name);checks.push(name);console.log('PASS',name);};

try{
  await mkdir('test-artifacts',{recursive:true});await page.goto('http://127.0.0.1:5188');
  await page.waitForFunction(()=>window.__game?.menuEntrance?.finished,{timeout:30000});
  await page.click('#start-btn');await page.waitForFunction(()=>window.__game.state==='select');
  const sample=()=>page.evaluate(()=>{
    const g=window.__game,cloth=g.hero.userData.cape.userData.cloth,attribute=cloth.mesh.geometry.attributes.position;
    return {positions:Array.from(attribute.array),count:cloth.count,cols:cloth.cols,motion:{...cloth.motion},root:g.hero.position.toArray(),yaw:g.hero.rotation.y};
  });
  const a=await sample();await page.waitForTimeout(700);const b=await sample();
  const distance=(a,b,start,end)=>{let max=0;for(let i=start;i<end;i++)max=Math.max(max,Math.hypot(a[i*3]-b[i*3],a[i*3+1]-b[i*3+1],a[i*3+2]-b[i*3+2]));return max;};
  evidence.menu={movement:distance(a.positions,b.positions,(a.cols+1)*5,a.count),anchors:distance(a.positions,b.positions,0,a.cols+1)};
  check('class selection shows actual cloth deformation in its lower half',evidence.menu.movement>.015);
  check('selection cape shoulder vertices remain pinned',evidence.menu.anchors<1e-7);
  await page.click('#class-confirm');await page.evaluate(()=>{const g=window.__game;g.newGame(270021);g.finishEntrance();});
  await page.waitForFunction(()=>window.__game.state==='playing',{timeout:30000});
  const aim=await page.evaluate(()=>{const g=window.__game;g.player.x=-2;g.player.z=7;g.player.invul=0;g.followCamera(0,true);return g.screenPoint(g.player.x,g.player.z-6);});
  await page.mouse.move(aim.x,aim.y);await page.waitForTimeout(800);
  const resting=await sample();
  await page.keyboard.down('w');await page.waitForTimeout(750);const moving=await sample();await page.keyboard.up('w');
  evidence.walk={distance:Math.hypot(moving.root[0]-resting.root[0],moving.root[2]-resting.root[2]),deformation:distance(resting.positions,moving.positions,(a.cols+1)*6,a.count),motion:moving.motion,anchors:distance(resting.positions,moving.positions,0,a.cols+1)};
  check('real WASD movement lifts and trails the cloth rather than rotating a rigid panel',evidence.walk.distance>3&&evidence.walk.deformation>.10&&moving.motion.forward>2);
  check('movement keeps the shoulder attachment fixed in model space',evidence.walk.anchors<1e-7);
  const turn=await page.evaluate(()=>{const g=window.__game;return g.screenPoint(g.player.x+6,g.player.z+2);});await page.mouse.move(turn.x,turn.y);await page.waitForTimeout(140);const turned=await sample();
  evidence.turn={motion:turned.motion,difference:distance(moving.positions,turned.positions,(a.cols+1)*6,a.count)};
  check('mouse turn creates a delayed cloth response',Math.abs(turned.motion.turn)>.3&&evidence.turn.difference>.02);
  await page.waitForTimeout(1800);const stopped=await sample();
  check('cloth motion settles naturally after the character stops',stopped.motion.speed<.10&&Math.abs(stopped.motion.turn)<.10);

  evidence.rolls=await page.evaluate(()=>{
    const g=window.__game,p=g.player,rows=[],objects=g.room.objects,box=g.hero.userData.bounds;
    g.state='paused';g.input.down=false;g.clearCombat();g.room.enemies=[];g.room.objects=[];g.room.sealed=true;
    for(const dt of [.01,.04])for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[.707,.707],[-.707,.707],[.707,-.707],[-.707,-.707]]){
      p.x=-dx*6;p.z=-dz*6;p.rollTime=0;p.rollCd=0;p.invul=0;g.transitionCd=100;
      // Warm the same cloth solver with actual movement before the roll.
      for(let i=0;i<45;i++){p.x+=dx*.13;p.z+=dz*.13;g.time+=.016;g.updateHeroPose(Math.atan2(dx,dz),1);g.animateWorld(.016);}
      g.input.keys=new Set([...(dx>.1?['KeyD']:dx<-.1?['KeyA']:[]),...(dz>.1?['KeyS']:dz<-.1?['KeyW']:[])]);g.roll();g.input.keys.clear();
      let minY=Infinity,maxRadius=0,solid=false,frames=0;
      while(p.rollTime>0){g.update(dt);g.time+=dt;g.animateWorld(dt);g.hero.updateMatrixWorld(true);box.setFromObject(g.hero,true);minY=Math.min(minY,box.min.y);if(g.hero.userData.rolling)maxRadius=Math.max(maxRadius,Math.abs(box.min.x-p.x),Math.abs(box.max.x-p.x),Math.abs(box.min.z-p.z),Math.abs(box.max.z-p.z));solid||=g.isSolid(p.x,p.z,.39);frames++;}
      rows.push({dx,dz,dt,minY,maxRadius,solid,frames});
    }
    g.room.objects=objects;return rows;
  });
  check('moving cloth remains above ground throughout sixteen direction/frame-rate rolls',evidence.rolls.every(r=>r.minY>=.03&&r.frames>=11&&!r.solid));
  check('folded cloth stays inside the existing roll collision radius',evidence.rolls.every(r=>r.maxRadius<=1.02));
  check('cape animation reports no rendering or runtime errors',errors.length===0);
  await writeFile('test-artifacts/cape-regression.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){await page.screenshot({path:'test-artifacts/cape-regression-failure.png'}).catch(()=>{});await writeFile('test-artifacts/cape-regression.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,evidence},null,2));console.error(error);process.exitCode=1;}finally{await browser.close();}
