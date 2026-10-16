import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),checks=[],errors=[];
page.on('pageerror',error=>errors.push(error.message));
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
try{
  await page.goto('http://127.0.0.1:5188');await page.waitForFunction(()=>window.__game?.menuEntrance?.finished);
  await page.click('#start-btn');await page.click('#class-confirm');await page.evaluate(()=>window.__game.newGame(270021));await page.waitForFunction(()=>window.__game.state==='playing');
  await page.evaluate(()=>{const g=window.__game,t=g.room.objects.find(o=>o.type==='table');g.player.x=t.x;g.player.z=t.z+t.hh+1.1;g.followCamera(0,true);g.ui.update();document.getElementById('room-banner').style.opacity='0';document.getElementById('toast-stack').innerHTML='';});
  await page.waitForTimeout(180);await page.waitForFunction(()=>window.__game.player.invul===0);
  const target=await page.evaluate(()=>{const g=window.__game,o=g.closestInteraction(),rect=document.getElementById('interaction').getBoundingClientRect(),point=g.screenPoint(o.x,o.z,0);return {type:o.type,text:document.getElementById('interaction').textContent,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},point};});
  check('nearby table receives its own interaction prompt',target.type==='table'&&target.text.includes('翻倒桌子'));
  check('interaction prompt is placed above the actual object',target.rect.y+target.rect.height<target.point.y-35);
  check('object interaction prompt remains within the viewport',target.rect.x>=0&&target.rect.y>=0&&target.rect.x+target.rect.width<=1440&&target.rect.y+target.rect.height<=900);
  await page.screenshot({path:'test-artifacts/fullscreen-map.png'});
  await page.keyboard.press('e');
  check('the displayed prompt activates real cover with E',await page.evaluate(()=>window.__game.room.objects.some(o=>o.type==='table'&&o.flipped&&o.shotBlock)));
  await page.evaluate(()=>{const g=window.__game,r=g.dungeon.rooms.find(r=>r.type==='combat');g.enterRoom(r.id);g.state='paused';const name=Object.keys(r.links)[0],d={east:[1,0],west:[-1,0],north:[0,-1],south:[0,1]}[name];g.player.x=d[0]*(r.w/2-2.7);g.player.z=d[1]*(r.h/2-2.7);g.hero.position.set(g.player.x,0,g.player.z);g.hero.visible=true;g.followCamera(0,true);g.ui.update();document.getElementById('room-banner').style.opacity='0';document.getElementById('toast-stack').innerHTML='';});
  await page.waitForTimeout(500);await page.screenshot({path:'test-artifacts/gateway-sealed.png'});
  check('combat gateways show red lamps and closed status',await page.evaluate(()=>Object.values(window.__game.roomVisual.doors).every(d=>d.progress<.01&&d.status.closed.visible&&!d.status.open.visible&&d.lamps[0].material.color.getHex()===0xf37d66)));
  check('production browser reports no runtime errors',errors.length===0);
  await writeFile('test-artifacts/interaction-ui.json',JSON.stringify({status:'PASS',checks,errors,target},null,2));
}catch(error){await page.screenshot({path:'test-artifacts/interaction-ui-failure.png'});await writeFile('test-artifacts/interaction-ui.json',JSON.stringify({status:'FAIL',checks,errors,error:error.message},null,2));console.error(error);process.exitCode=1;}finally{await browser.close();}
