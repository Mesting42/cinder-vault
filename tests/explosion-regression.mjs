import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';

const checks=[],errors=[],evidence={};
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let page;
try{
  for(const [device,viewport,touch]of [['desktop',{width:1440,height:900},false],['phone',{width:844,height:390},true]]){
    const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,deviceScaleFactor:1});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5188');if(touch)await page.locator('#start-btn').tap();else await page.locator('#start-btn').click();
    await page.waitForFunction(()=>window.__game?.state==='select');
    await page.evaluate(()=>window.__game.frame=()=>{});await page.waitForTimeout(80);
    await page.evaluate(()=>{const g=window.__game;g.newGame(270021,'shooter');g.finishEntrance();g.clearCombat();g.player.x=-7;g.player.z=4;g.hero.position.set(-7,0,4);g.hero.visible=true;g.followCamera(0,true);g.gainWeapon('rocket');g.player.weaponIndex=g.player.weapons.indexOf('rocket');g.equip();g.ui.update();g.controls.update();g.state='paused';document.getElementById('room-banner').style.opacity='0';document.getElementById('toast-stack').innerHTML='';});
    await page.waitForTimeout(450);
    const visual=await page.evaluate(()=>{const g=window.__game;g.explode(0,0,0);const fx=g.effects.find(e=>e.explosion),e=fx.mesh.userData.explosion;return{tier:e.tier,children:fx.mesh.children.map(m=>({name:m.name,count:m.count,instanced:m.isInstancedMesh})),radius:e.radius,ring:fx.mesh.children.some(m=>m.geometry?.type==='RingGeometry')};});
    check(device+' explosion has volume, smoke, embers, debris and ground dust',visual.children.length===5&&visual.children.every(m=>m.instanced)&&!visual.ring);
    const fireCount=visual.children[0].count;evidence[device]={visual};
    for(const [time,label]of [[.06,'ignition'],[.22,'fireball'],[.60,'smoke'],[1.1,'dissipation']]){
      await page.evaluate(time=>{const g=window.__game,e=g.effects.find(e=>e.explosion),age=e.maxLife-e.life;g.updateEffects(time-age);g.flashLight.intensity=Math.max(0,85-time*170);g.composer.render();},time);
      await page.screenshot({path:`test-artifacts/explosion-${device}-${label}.png`});
    }
    const stages=await page.evaluate(()=>{const e=window.__game.effects.find(e=>e.explosion).mesh.userData.explosion;return{fireVisible:e.fire.visible,smokeVisible:e.smoke.visible,smokeOpacity:e.smoke.material.opacity};});
    check(device+' fire expires before translucent smoke dissipates',!stages.fireVisible&&stages.smokeVisible&&stages.smokeOpacity>0&&stages.smokeOpacity<.46);
    await page.evaluate(()=>{window.__game.updateEffects(2);window.__game.composer.render();});
    check(device+' expiry removes the burst from scene and effect queue',await page.evaluate(()=>!window.__game.effects.some(e=>e.explosion)&&!window.__game.fxGroup.children.some(m=>m.name==='volumetric-explosion')));

    const memory=await page.evaluate(()=>{
      const g=window.__game;g.clearCombat();g.room.enemies=[];g.room.objects=[];g.explode(0,0,0);g.composer.render();g.updateEffects(2);g.composer.render();const baseline={...g.renderer.info.memory},samples=[];
      for(let n=0;n<24;n++){g.explode(0,0,0);g.updateEffects(.18);g.composer.render();g.updateEffects(2);g.composer.render();samples.push({...g.renderer.info.memory});}
      g.explode(0,0,0);g.composer.render();const root=g.effects.find(e=>e.explosion).mesh;let buffersReleased=0;root.traverse(m=>{if(m.isInstancedMesh)m.addEventListener('dispose',()=>buffersReleased++);});g.clearCombat();g.composer.render();
      return{baseline,samples,afterClear:{...g.renderer.info.memory},disposed:root.userData.explosion.disposed,buffersReleased,effects:g.effects.length,attached:root.parent!==null};
    });evidence[device].memory=memory;
    check(device+' repeated rendered bursts do not grow GPU geometry or texture use',memory.samples.every(s=>s.geometries===memory.baseline.geometries&&s.textures===memory.baseline.textures));
    check(device+' room cleanup releases every instancing buffer without deleting shared shapes',memory.disposed&&memory.buffersReleased===5&&!memory.attached&&memory.effects===0&&memory.afterClear.geometries===memory.baseline.geometries);

    const overlap=await page.evaluate(()=>{const g=window.__game,roots=[];for(let i=0;i<20;i++){g.explode((i%3)-1,0,0);roots.push(g.effects.findLast(e=>e.explosion).mesh);}const bursts=g.effects.filter(e=>e.explosion);g.composer.render();return{count:bursts.length,draws:bursts.reduce((n,e)=>n+e.mesh.children.length,0),retired:roots.slice(0,20-bursts.length).every(r=>r.userData.explosion.disposed&&!r.parent),finite:bursts.every(e=>e.mesh.children.every(m=>[...m.instanceMatrix.array].every(Number.isFinite)))};});evidence[device].overlap=overlap;
    check(device+' simultaneous explosion cost is bounded and retired visuals release resources',overlap.count===(touch?4:6)&&overlap.draws<=30&&overlap.finite&&overlap.retired);
    await page.evaluate(()=>window.__game.clearCombat());

    await page.evaluate(()=>window.__game.ui.settings());await page.locator('#settings-tab-graphics').click();await page.locator('[data-key=quality]').selectOption('low');await page.locator('#settings-close').click();
    const low=await page.evaluate(()=>{const g=window.__game;g.state='paused';g.explode(0,0,0);const e=g.effects.find(e=>e.explosion).mesh.userData.explosion;return{tier:e.tier,fire:e.fire.count,smoke:e.smoke.count,spark:e.spark.count};});evidence[device].low=low;
    check(device+' low quality reduces actual instance density while preserving fire and smoke',low.tier==='low'&&low.fire<fireCount&&low.smoke>0&&low.spark>0);
    await page.evaluate(()=>window.__game.clearCombat());
    await page.evaluate(()=>window.__game.ui.settings());await page.locator('#settings-tab-accessibility').click();await page.locator('[data-key=reduceMotion]').click();await page.locator('#settings-close').click();
    const quiet=await page.evaluate(()=>{const g=window.__game;g.state='paused';g.explode(0,0,0);const e=g.effects.find(e=>e.explosion).mesh.userData.explosion;return{quiet:e.quiet,spark:e.spark.count,life:e.life,flash:g.flashLight.intensity};});
    check(device+' reduced motion lowers flash, airborne density and duration',quiet.quiet&&quiet.spark<low.spark&&quiet.life===1.2&&quiet.flash===35);
    await context.close();
  }

  const context=await browser.newContext({viewport:{width:1280,height:800}});page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5188');await page.click('#start-btn');await page.waitForFunction(()=>window.__game?.state==='select');await page.evaluate(()=>window.__game.frame=()=>{});await page.waitForTimeout(80);
  const mechanics=await page.evaluate(()=>{
    const g=window.__game;g.newGame(270021,'shooter');g.finishEntrance();g.state='paused';g.clearCombat();g.room.objects=[];g.room.enemies=[];g.player.x=-9;g.player.z=-7;g.player.passives=[];
    const a=g.spawnEnemy('gunner',0,0),b=g.spawnEnemy('gunner',5,0);a.hp=a.maxHp=b.hp=b.maxHp=100;g.explode(0,0,24);const friendly=a.hp===76&&b.hp===100;
    g.player.x=g.player.z=0;g.player.shield=0;g.player.hp=g.player.maxHp;g.player.invul=0;g.state='playing';const hp=g.player.hp;g.explode(0,0,1,true);const enemy=g.player.hp===hp-1;
    g.player.invul=0;const bossHp=g.player.hp;g.explode(0,0,0,true);const harmless=g.player.hp===bossHp;g.state='paused';
    g.clearCombat();g.player.passives=['hot'];g.explode(0,0,0);const enhanced=g.effects.find(e=>e.explosion).mesh.userData.explosion.radius===4.25;g.player.passives=[];g.clearCombat();
    g.room.objects=[{type:'barrel',x:0,z:0,hp:1,model:{visible:true}},{type:'barrel',x:2,z:0,hp:1,model:{visible:true}}];g.hitObject(g.room.objects[0],1);const chain=g.room.objects.every(o=>o.destroyed)&&g.effects.filter(e=>e.explosion).length===2;
    g.clearCombat();g.room.objects=[];g.warningBlast(0,0,2.1,.15,0xff5e6f);const warning=g.hazards[0].mesh.geometry.type==='RingGeometry'&&!g.effects.some(e=>e.explosion);g.updateHazards(.16);const warnedBlast=g.effects.some(e=>e.explosion);
    g.clearCombat();g.projectile({x:0,z:0,angle:0,speed:1,damage:10,range:.001,kind:'rocket',enemy:false,color:0xff7946});g.updateBullets(.04,1);const rocket=g.effects.some(e=>e.explosion);
    g.clearCombat();g.detonateProjectile({x:0,z:0,damage:0,enemy:false,weaponId:'embercodex'});const fireball=g.effects.some(e=>e.explosion);
    g.clearCombat();g.detonateProjectile({x:0,z:0,damage:0,enemy:false,weaponId:'bloodhowitzer'});const howitzer=g.effects.some(e=>e.explosion)&&g.hazards.some(h=>h.kind==='fire');
    g.clearCombat();g.enterRoom(g.dungeon.rooms.find(r=>r.type==='boss').id);g.state='paused';g.killEnemy(g.boss);const boss=g.effects.some(e=>e.explosion)&&g.floorBossDefeated[1];
    return{friendly,enemy,harmless,enhanced,chain,warning,warnedBlast,rocket,fireball,howitzer,boss};
  });evidence.mechanics=mechanics;
  for(const [name,value]of Object.entries(mechanics))check('explosion integration: '+name,value);
  check('all explosion sessions remain free of browser errors',errors.length===0);

  // Native browser storyboard: frames are captures of the real effect in game.
  const images=[];for(const [label,title]of [['ignition','0.06 秒 · 点火'],['fireball','0.22 秒 · 火球喷发'],['smoke','0.60 秒 · 烟尘与碎片'],['dissipation','1.10 秒 · 余烟消散']])images.push({title,data:(await readFile(`test-artifacts/explosion-desktop-${label}.png`)).toString('base64')});
  const gallery=await browser.newPage({viewport:{width:1440,height:1020},deviceScaleFactor:1});
  await gallery.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#0b1719;color:#ded6b8;font:16px 'Microsoft YaHei',sans-serif}main{display:grid;grid-template-columns:1fr 1fr;gap:18px}figure{margin:0}img{display:block;width:100%;height:auto}figcaption{padding:12px 0}h1{font-size:24px;font-weight:400;margin:0 0 18px}</style><h1>烬藏 · 低多边形爆炸实际效果</h1><main>${images.map(i=>`<figure><img src="data:image/png;base64,${i.data}"><figcaption>${i.title}</figcaption></figure>`).join('')}</main>`);
  await gallery.screenshot({path:'test-artifacts/explosion-storyboard.png',fullPage:true});await gallery.close();
  await writeFile('test-artifacts/explosion-regression.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){console.error(error);await page?.screenshot({path:'test-artifacts/explosion-failure.png'}).catch(()=>{});await writeFile('test-artifacts/explosion-regression.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,evidence},null,2));process.exitCode=1;}finally{await browser.close();}
