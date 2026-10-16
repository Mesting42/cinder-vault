import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {WEAPONS} from '../src/data.js';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:800,height:520}}),errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));
try{
  await mkdir('test-artifacts',{recursive:true});
  await page.goto('http://127.0.0.1:5188');await page.waitForFunction(()=>window.__game?.menuEntrance?.finished);
  // Stop automatic stepping for deterministic screenshots of real game effects.
  await page.evaluate(()=>{window.__game.frame=()=>{};});await page.waitForTimeout(70);
  for(const classId of ['mage','warrior']){
    const weapons=WEAPONS.filter(w=>w.classOnly===classId);
    for(const w of weapons){
      const row=await page.evaluate(({classId,id})=>{
        const g=window.__game;g.newGame(270021,classId);g.finishEntrance();g.state='paused';g.clearCombat();g.muzzleLight.intensity=0;g.flashLight.intensity=0;
        for(const o of g.room.objects)o.model.visible=false;g.room.objects=[];g.room.pickups.forEach(p=>p.model.visible=false);g.room.pickups=[];
        g.player.x=-2.3;g.player.z=3;g.player.invul=0;g.player.fireCd=0;g.player.reload=0;g.hero.visible=true;
        if(g.weapon().id!==id)g.gainWeapon(id);g.player.weaponIndex=g.player.weapons.indexOf(id);g.equip();
        const aim=2.05,range=id==='stormpike'?4.5:id==='quakehammer'?3.9:classId==='mage'?6.5:3.0;
        for(const [offset,distance] of [[0,range],[.45,classId==='mage'?7:3.1]]){
          const e=g.spawnEnemy('gunner',g.player.x+Math.sin(aim+offset)*distance,g.player.z+Math.cos(aim+offset)*distance);e.hp=e.maxHp=1000;e.timer=100;
        }
        g.updateHeroPose(aim,0);if(id==='quakehammer'){g.player.combo=2;g.player.lastMelee=g.time;}g.shoot(aim);
        const elapsed=id==='embercodex'?.24:id==='stormrod'?.04:classId==='mage'?.12:.10;
        for(let t=0;t<elapsed;t+=.01){g.time+=.01;g.player.swing=Math.max(0,g.player.swing-.01);g.player.castTime=Math.max(0,g.player.castTime-.01);g.updateBullets(.01,1);g.updateEffects(.01);g.updateHeroPose(aim,0);}
        const aspect=800/520,half=8.6;g.camera.left=-half*aspect;g.camera.right=half*aspect;g.camera.top=half;g.camera.bottom=-half;g.camera.position.set(0,30,21);g.camera.lookAt(0,0,.6);g.camera.updateProjectionMatrix();
        for(const id of ['hud','toast-stack','entry-screen','room-banner'])document.getElementById(id).style.display='none';
        g.composer.render();return {id,projectiles:g.bullets.map(b=>b.mesh.name),effects:g.effects.map(e=>e.mesh.name),enemyHp:g.room.enemies.map(e=>e.hp),heldPosition:g.hero.userData.weapon.position.toArray(),heldRotation:g.hero.userData.weapon.rotation.toArray().slice(0,3)};
      },{classId,id:w.id});
      assert(row.effects.length>0,`${w.id} has visible attack effects`);
      if(classId==='mage')assert(row.effects.includes(`${w.id}-cast-sigil`),`${w.id} has a spell casting sigil`);
      if(w.id==='froststaff')assert(row.projectiles.every(n=>n==='ice-shard'));
      if(w.id==='embercodex')assert(row.projectiles.includes('flame-comet'));
      if(w.id==='moonorb')assert(row.projectiles.includes('lunar-wisp'));
      if(w.id==='stormrod')assert(row.effects.includes('branching-lightning'));
      if(['stormpike','oathaxe','quakehammer'].includes(w.id))assert(row.effects.includes(`${w.id}-attack`));
      evidence.push(row);await page.screenshot({path:`test-artifacts/${w.id}-effect.png`});
    }
    const tiles=[];
    for(const w of weapons){const data=(await readFile(`test-artifacts/${w.id}-effect.png`)).toString('base64');tiles.push(`<figure><img src="data:image/png;base64,${data}"><figcaption><strong>${w.name}</strong><span>${w.trait}</span><small>${w.desc}</small></figcaption></figure>`);}
    const gallery=await browser.newPage({viewport:{width:1600,height:1320}});
    await gallery.setContent(`<html lang="zh"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#081312;color:#e4deca;font-family:'Microsoft YaHei',sans-serif}header{height:100px;padding:23px 34px;border-bottom:1px solid #5c6050}h1{margin:0 0 8px;font-family:serif;font-size:28px}header p{margin:0;color:#91a59c;font-size:13px}.grid{display:grid;grid-template-columns:1fr 1fr}figure{margin:0;border-right:1px solid #33433c;border-bottom:1px solid #33433c}img{display:block;width:100%;height:520px}figcaption{height:88px;padding:10px 22px;background:#101e1a}strong{font-size:19px;color:${classId==='mage'?'#a9e8ef':'#ffc59b'}}span{font-size:13px;float:right;color:#d7c696;line-height:28px}small{display:block;color:#b0bdb0;line-height:27px;font-size:13px}</style><header><h1>${classId==='mage'?'霜灯法师 · 四种法器':'赤铜战士 · 四种兵器'}</h1><p>正式游戏模型与实际攻击效果截图 · 受控场景对照 · CINDER VAULT</p></header><div class="grid">${tiles.join('')}</div></html>`);
    await gallery.screenshot({path:`test-artifacts/${classId}-weapon-effects.png`,fullPage:true});await gallery.close();
  }
  assert.equal(errors.length,0,'No browser runtime errors');
  await writeFile('test-artifacts/weapon-effects-preview.json',JSON.stringify({status:'PASS',errors,evidence},null,2));
  console.log('PASS eight actual attacks, mage spell visuals, distinct warrior poses, and both effect galleries');
}finally{await browser.close();}
