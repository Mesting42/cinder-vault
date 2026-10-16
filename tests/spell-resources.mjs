import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:800,height:520}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://127.0.0.1:5188');await page.waitForFunction(()=>window.__game?.menuEntrance?.finished);
  await page.evaluate(()=>{window.__game.frame=()=>{};});await page.waitForTimeout(60);
  const evidence=await page.evaluate(()=>{
    const g=window.__game;g.newGame(270021,'mage');g.finishEntrance();g.state='paused';g.clearCombat();g.room.enemies=[];g.room.objects=[];g.player.x=0;g.player.z=0;
    const weapons=['froststaff','stormrod','embercodex','moonorb'];for(const id of weapons.slice(1))g.gainWeapon(id);
    const cycle=()=>{for(const id of weapons){g.player.weaponIndex=g.player.weapons.indexOf(id);g.equip();g.player.ammo[id]=g.magSize(g.weapon());g.player.reload=0;g.shoot(Math.PI/2);g.composer.render();for(let i=0;i<70;i++){g.updateBullets(.04,1);g.updateEffects(.04);if(i%10===0)g.composer.render();}g.clearCombat();g.composer.render();}};
    cycle();const baseline={...g.renderer.info.memory},samples=[];for(let i=0;i<12;i++){cycle();samples.push({...g.renderer.info.memory});}
    return{casts:12*4,baseline,samples,bullets:g.bullets.length,effects:g.effects.length};
  });
  assert(evidence.samples.every(s=>s.geometries<=evidence.baseline.geometries&&s.textures<=evidence.baseline.textures),'Expired spells must release their geometry without losing shared textures');
  assert.equal(evidence.bullets,0);assert.equal(evidence.effects,0);assert.equal(errors.length,0);
  await writeFile('test-artifacts/spell-resources.json',JSON.stringify({status:'PASS',errors,evidence},null,2));
  console.log('PASS 48 spell casts expire without GPU geometry or texture growth',JSON.stringify(evidence.baseline));
}finally{await browser.close();}
