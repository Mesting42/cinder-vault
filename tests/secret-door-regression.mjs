import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {generateFloor,DIRECTIONS} from '../src/data.js';

const cases=[];
for(const floor of[1,2,3])for(const dir of DIRECTIONS){let match;for(let seed=1;seed<=500&&!match;seed++){const r=generateFloor(seed,floor).rooms.find(r=>r.secret?.direction===dir.name);if(r)match={seed,floor,id:r.id,dir:dir.name};}assert(match,'A hidden host exists in '+dir.name);cases.push(match);}
const checks=[],errors=[],evidence=[];
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://127.0.0.1:5188');await page.click('#start-btn');await page.waitForFunction(()=>window.__game?.state==='select');await page.evaluate(()=>window.__game.frame=()=>{});await page.waitForTimeout(80);
  for(const row of cases){
    const result=await page.evaluate(({seed,floor,id,dir})=>{
      const g=window.__game;g.newGame(seed);if(floor>1)g.loadFloor(floor);g.finishEntrance();g.enterRoom(id);g.room.enemies.forEach(e=>{e.dead=true;e.model.visible=false;if(e.bar)e.bar.visible=false;});g.room.sealed=false;g.updateDoors();g.animateWorld(1);g.state='paused';
      const r=g.room,crack=r.objects.find(o=>o.type==='crack'),hidden=r.visual.concealedDoors[dir],target=g.dungeon.rooms[r.secret.id];
      const before=!!hidden&&hidden.cover.visible&&!hidden.door.group.visible&&r.links[dir]===undefined&&target.hidden&&!r.visual.doors[dir];
      g.hitObject(crack,30);const door=r.visual.doors[dir];
      const revealed=r.links[dir]===target.id&&r.secret.revealed&&!target.hidden&&door===hidden.door&&door.group.visible&&!hidden.cover.visible&&!r.visual.concealedDoors[dir];
      g.room.sealed=true;g.updateDoors();g.animateWorld(1);const combatSeal=door.status.closed.visible&&!door.status.open.visible&&door.progress===0;g.room.sealed=false;g.updateDoors();g.animateWorld(1);
      const vectors={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]},[dx,dz]=vectors[dir],origin=g.hero.position.clone().set(dx*(r.w/2-1.2),1.6,dz*(r.h/2-1.2)),direction=g.hero.position.clone().set(dx,0,dz);g.raycaster.set(origin,direction);
      const solidVisible=m=>{if(!m.isMesh||m.material?.transparent)return false;let p=m;while(p){if(!p.visible)return false;p=p.parent;}return true;};
      r.visual.group.updateMatrixWorld(true);const surfaces=[];r.visual.group.traverse(m=>{if(solidVisible(m))surfaces.push(m);});
      const openingClear=!g.raycaster.intersectObjects(surfaces).some(hit=>hit.distance<1.8);
      g.player.x=dx*(r.w/2-1.8);g.player.z=dz*(r.h/2-1.8);g.transitionCd=0;const through=g.moveActor(g.player,dx*3,dz*3,.42,true).transitioned&&g.room.id===target.id;
      const [bx,bz]=[-dx,-dz],secret=g.room;g.animateWorld(1);g.player.x=bx*(secret.w/2-1.8);g.player.z=bz*(secret.h/2-1.8);g.transitionCd=0;const back=g.moveActor(g.player,bx*3,bz*3,.42,true).transitioned&&g.room.id===r.id&&g.roomVisual.doors[dir]===door&&!hidden.cover.visible;
      return{...{seed,floor,id,dir},before,revealed,combatSeal,openingClear,through,back};
    },row);evidence.push(result);
    for(const [field,label]of [['before','stays concealed before discovery'],['revealed','reveals a registered visible gateway'],['combatSeal','obeys combat sealing'],['openingClear','removes real wall geometry in the passage'],['through','allows actual movement into the secret room'],['back','allows movement back with the gateway still visible']])check('floor '+row.floor+' '+row.dir+' '+label,result[field]);
  }
  await page.evaluate(()=>{const g=window.__game;g.newGame(3185);g.finishEntrance();g.enterRoom(11);g.room.enemies.forEach(e=>{e.dead=true;e.model.visible=false;e.bar.visible=false;});g.room.sealed=false;g.updateDoors();g.animateWorld(1);g.hitObject(g.room.objects.find(o=>o.type==='crack'),30);const id=g.room.id;g.enterRoom(g.room.secret.id);g.enterRoom(id);g.player.x=-12;g.player.z=0;g.hero.position.set(-12,0,0);g.hero.visible=true;g.followCamera(0,true);g.state='paused';g.ui.update();document.getElementById('room-banner').style.opacity=0;g.clearCombat();g.composer.render();});await page.waitForTimeout(450);await page.screenshot({path:'test-artifacts/secret-door-after.png'});
  check('the reported cross-shaped room registers its west gateway after discovery',await page.evaluate(()=>window.__game.room.name==='沉默铸坊'&&window.__game.roomVisual.doors.west.group.visible));
  check('secret-door sessions have no browser runtime errors',errors.length===0);
  await writeFile('test-artifacts/secret-door-regression.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){console.error(error);await page.screenshot({path:'test-artifacts/secret-door-failure.png'}).catch(()=>{});await writeFile('test-artifacts/secret-door-regression.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,evidence},null,2));process.exitCode=1;}finally{await browser.close();}
