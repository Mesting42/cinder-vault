import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),checks=[],errors=[],consoleErrors=[],evidence={};
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
const check=(name,passed)=>{assert(passed,name);checks.push(name);console.log('PASS',name);};

try{
  await mkdir('test-artifacts',{recursive:true});
  await page.goto('http://127.0.0.1:5188');
  await page.waitForFunction(()=>window.__game?.menuEntrance?.finished,{timeout:30000});
  await page.screenshot({path:'test-artifacts/hero-menu.png'});
  await page.click('#start-btn');await page.click('#class-confirm');
  await page.evaluate(()=>window.__game.newGame(270021));
  await page.waitForFunction(()=>window.__game.state==='playing',{timeout:30000});
  await page.evaluate(()=>{
    const g=window.__game;
    window.__characterTest={
      near(target){
        g.state='playing';g.input.down=false;g.input.keys.clear();g.player.invul=0;
        for(const radius of [1.9,2.2,1.6])for(const i of [20,0,...Array.from({length:24},(_,i)=>i)]){
          const angle=i*Math.PI/12,x=target.x+Math.sin(angle)*radius,z=target.z+Math.cos(angle)*radius;
          if(g.isSolid(x,z,.55))continue;
          g.player.x=x;g.player.z=z;
          if(g.closestInteraction()!==target)continue;
          g.followCamera(0,true);g.ui.update();return g.screenPoint(x,z+5,.85);
        }
        throw Error('No legal interaction position for '+target.type);
      },
      meshBounds(root){
        root.updateMatrixWorld(true);const result=new g.hero.userData.bounds.constructor();
        root.traverse(mesh=>{if(mesh.isMesh)result.union(new result.constructor().setFromObject(mesh,true));});return result;
      },
      face(){const o=g.room.objects.find(o=>o.type==='npc'),d=o.model.userData;return {yaw:o.model.rotation.y,head:d.head.rotation.toArray(),body:d.body.position.y,arms:d.arms.map(a=>a.rotation.toArray()),lantern:d.lantern?.rotation.z,light:d.lanternLight?.intensity};}
    };
  });

  const aim=await page.evaluate(()=>window.__characterTest.near(window.__game.room.objects.find(o=>o.type==='npc')));
  await page.mouse.move(aim.x,aim.y);await page.waitForTimeout(500);
  evidence.silhouette=await page.evaluate(()=>{
    const g=window.__game,t=window.__characterTest,hero=t.meshBounds(g.hero),npc=g.room.objects.find(o=>o.type==='npc'),companion=t.meshBounds(npc.model),heads={hero:t.meshBounds(g.hero.userData.head),npc:t.meshBounds(npc.model.userData.head)};
    return {hero:{height:hero.max.y-hero.min.y,width:hero.max.x-hero.min.x,minY:hero.min.y,head:heads.hero.max.y},npc:{height:companion.max.y-companion.min.y,width:companion.max.x-companion.min.x,minY:companion.min.y,head:heads.npc.max.y},limbs:{heroLegs:g.hero.userData.legs.length,heroArms:g.hero.userData.arms.length,npcLegs:npc.model.userData.legs.length,npcArms:npc.model.userData.arms.length},size:g.camera.top,desired:g.playViewSize()};
  });
  check('actual protagonist geometry has a larger silhouette and higher head than the nightwatch',evidence.silhouette.hero.height>evidence.silhouette.npc.height*1.12&&evidence.silhouette.hero.head>evidence.silhouette.npc.head+.25);
  check('both models retain separate articulated arms and legs',Object.values(evidence.silhouette.limbs).every(count=>count===2));
  check('both standing characters have grounded geometry',evidence.silhouette.hero.minY>=.024&&evidence.silhouette.hero.minY<.15&&evidence.silhouette.npc.minY>=0&&evidence.silhouette.npc.minY<.07);
  check('the new characters preserve the complete-room overview',evidence.silhouette.size>=15&&Math.abs(evidence.silhouette.size-evidence.silhouette.desired)<.001);

  const before=await page.evaluate(()=>window.__characterTest.face());await page.waitForTimeout(450);
  const after=await page.evaluate(()=>window.__characterTest.face());evidence.idle={before,after};
  check('nightwatch breathing, head motion and lantern sway continue in the real scene',Math.abs(before.body-after.body)>.001&&Math.abs(before.head[0]-after.head[0])>.0001&&Math.abs(before.lantern-after.lantern)>.001&&Math.abs(before.light-after.light)>.01);
  await page.evaluate(()=>{document.getElementById('toast-stack').innerHTML='';document.getElementById('room-banner').style.visibility='hidden';});
  await page.keyboard.press('e');await page.waitForTimeout(300);
  evidence.watch=await page.evaluate(()=>{
    const g=window.__game,o=g.room.objects.find(o=>o.type==='npc'),d=o.model.userData,rect=document.getElementById('interaction').getBoundingClientRect(),bounds=window.__characterTest.meshBounds(o.model),top=g.screenPoint(o.x,o.z,bounds.max.y);
    return {response:d.responseBlend,arm:d.arms[1].rotation.x,badge:d.badge.visible,toast:document.getElementById('toast-stack').textContent,text:document.getElementById('interaction').textContent,rect:{x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom},top};
  });
  check('E triggers actual nightwatch dialogue and an animated response',evidence.watch.toast.includes('守夜者')&&evidence.watch.response>.5&&evidence.watch.arm<-.30&&evidence.watch.badge);
  check('NPC interaction prompt clears the head and stays within the screen',evidence.watch.text.includes('守夜者')&&evidence.watch.rect.bottom<evidence.watch.top.y&&evidence.watch.rect.x>=0&&evidence.watch.rect.right<=1600&&evidence.watch.rect.y>=0);
  await page.evaluate(()=>{document.getElementById('room-banner').style.opacity='0';});
  await page.screenshot({path:'test-artifacts/hero-npc-in-game.png'});

  evidence.weapons=await page.evaluate(()=>{
    const g=window.__game,p=g.player,t=window.__characterTest,ids=['revolver','shotgun','smg','rocket','laser','frost','orbit','rail'],rows=[];
    g.state='paused';p.weapons=ids;g.room.enemies=[];
    for(let i=0;i<ids.length;i++){
      p.weaponIndex=i;p.ammo[ids[i]]=g.magSize(g.weapon());p.reload=0;p.fireCd=0;g.equip();g.updateHeroPose(.48,0);g.hero.updateMatrixWorld(true);
      const gun=g.hero.userData.weapon.children[0],muzzle=gun.localToWorld(gun.userData.muzzleLocal.clone()),bounds=t.meshBounds(gun),shots=p.shots;
      g.shoot(.48);rows.push({id:ids[i],muzzle:muzzle.toArray(),light:g.muzzleLight.position.toArray(),error:g.muzzleLight.position.distanceTo(muzzle),bullets:g.bullets.filter(b=>!b.enemy).map(b=>b.height),minY:bounds.min.y,shots:p.shots-shots});
      g.clearCombat();
    }
    p.weapons=['revolver'];p.weaponIndex=0;p.ammo.revolver=6;p.fireCd=0;g.equip();g.state='playing';return rows;
  });
  check('all eight weapons mount above ground and emit muzzle light at the actual barrel',evidence.weapons.every(row=>row.shots===1&&row.minY>.2&&row.muzzle[1]>1&&row.error<1e-6));
  check('projectile lighting follows the new held-weapon height',evidence.weapons.filter(row=>row.bullets.length).every(row=>row.bullets.every(height=>Math.abs(height-row.muzzle[1])<1e-6)));
  await page.evaluate(()=>{window.__game.player.ammo.revolver=2;window.__game.player.reload=0;});
  await page.keyboard.press('r');await page.waitForTimeout(240);
  const reload=await page.evaluate(()=>{const g=window.__game;return {time:g.player.reload,left:g.hero.userData.arms[0].rotation.x,tilt:g.hero.userData.weapon.rotation.z};});
  check('keyboard reload animates the support arm and held weapon',reload.time>0&&reload.left>.25&&reload.tilt>.10);
  await page.waitForFunction(()=>{const g=window.__game;return g.player.reload===0&&Math.abs(g.hero.userData.weapon.rotation.z)<.001;},{timeout:10000});
  check('reload restores the magazine and the ready pose',await page.evaluate(()=>{const g=window.__game;return g.player.ammo.revolver===6&&Math.abs(g.hero.userData.arms[1].rotation.x-.42)<.015&&Math.abs(g.hero.userData.weapon.rotation.z)<.001;}));

  const shopAim=await page.evaluate(()=>{const g=window.__game;g.enterRoom(g.dungeon.rooms.find(r=>r.type==='shop').id);return window.__characterTest.near(g.room.objects.find(o=>o.type==='npc'));});
  await page.mouse.move(shopAim.x,shopAim.y);await page.keyboard.press('e');await page.waitForTimeout(250);
  check('merchant keeps backpack identity, dialogue and gesture in the shop',await page.evaluate(()=>{const o=window.__game.room.objects.find(o=>o.type==='npc');return o.model.userData.role==='merchant'&&o.model.userData.responseBlend>.5&&document.getElementById('toast-stack').textContent.includes('铜币商人');}));
  await page.evaluate(()=>{const g=window.__game,o=g.room.objects.find(o=>o.type==='offer'&&o.item.kind==='key');g.player.coins=60;g.player.x=o.x;g.player.z=o.z+1.2;g.ui.update();});
  const purchaseBefore=await page.evaluate(()=>({coins:window.__game.player.coins,keys:window.__game.player.keys}));await page.keyboard.press('e');
  check('redesigned merchant room still sells usable keys through E',await page.evaluate(before=>{const g=window.__game;return g.player.keys===before.keys+1&&g.player.coins===before.coins-12&&g.room.objects.some(o=>o.type==='offer'&&o.item.kind==='key'&&o.sold);},purchaseBefore));

  const found=await page.evaluate(()=>{
    const g=window.__game,roles={};
    for(let seed=1;seed<=16&&Object.keys(roles).length<3;seed++){
      g.newGame(seed);g.finishEntrance();g.state='paused';
      for(const room of g.dungeon.rooms.filter(r=>r.type==='event')){
        g.prepareRoom(room);const npc=room.objects.find(o=>o.type==='npc');if(!roles[npc.event])roles[npc.event]={seed,id:room.id};
      }
    }
    return roles;
  });evidence.eventSeeds=found;
  check('random events instantiate forge, rescue and challenge characters',Object.keys(found).length===3);
  for(const role of ['forge','rescue','challenge']){
    const target=found[role];
    const aim=await page.evaluate(({seed,id})=>{const g=window.__game;g.newGame(seed);g.finishEntrance();g.enterRoom(id);const npc=g.room.objects.find(o=>o.type==='npc');return window.__characterTest.near(npc);},target);
    await page.mouse.move(aim.x,aim.y);await page.waitForTimeout(100);
    if(role==='forge'){
      await page.evaluate(()=>{window.__game.player.coins=10;});await page.keyboard.press('e');
      check('forge rejects insufficient coins without consuming its event',await page.evaluate(()=>{const g=window.__game,o=g.room.objects.find(o=>o.type==='npc');return !o.used&&g.player.coins===10&&document.getElementById('toast-stack').textContent.includes('还差些');}));
      await page.evaluate(()=>{window.__game.player.coins=60;});
    }
    if(role==='rescue')await page.evaluate(()=>{window.__game.player.hp=3;});
    const before=await page.evaluate(()=>{const g=window.__game,p=g.player;return {coins:p.coins,weapons:p.weapons.length,hp:p.hp,keys:p.keys,blanks:p.blanks};});
    await page.keyboard.press('e');await page.waitForTimeout(250);
    const result=await page.evaluate(()=>{const g=window.__game,p=g.player,npc=g.room.objects.find(o=>o.type==='npc');return {role:npc.model.userData.role,used:npc.used,response:npc.model.userData.responseBlend,coins:p.coins,weapons:p.weapons.length,hp:p.hp,keys:p.keys,blanks:p.blanks,enemies:g.room.enemies.filter(e=>!e.dead).length,sealed:g.room.sealed,reward:g.room.pickups.some(p=>p.kind==='passive')};});evidence[role]={before,result};
    check(`${role} keeps its identity and animated E response`,result.role===role&&result.used&&result.response>.5);
    if(role==='forge')check('forge trade delivers an actual weapon and charges 20 coins',result.weapons===before.weapons+1&&result.coins===before.coins-20);
    if(role==='rescue')check('rescue supplies heal, a key and a blank',result.hp===6&&result.keys===before.keys+1&&result.blanks===before.blanks+1);
    if(role==='challenge')check('challenge summons four enemies, seals the doors and creates a relic reward',result.enemies===4&&result.sealed&&result.reward);
  }

  const grounds=await page.evaluate(()=>{
    const g=window.__game,t=window.__characterTest,rows=[];g.newGame(270021);g.finishEntrance();g.state='paused';
    for(const floor of [1,2]){g.loadFloor(floor);g.finishEntrance();g.state='paused';for(const room of g.dungeon.rooms.filter(r=>['start','shop','event'].includes(r.type))){g.enterRoom(room.id);g.state='paused';for(const o of room.objects.filter(o=>o.type==='npc')){
      const data=o.model.userData;let minY=Infinity,maxY=-Infinity;
      for(let i=0;i<35;i++){g.time+=.04;g.animateWorld(.04);const bounds=t.meshBounds(o.model);minY=Math.min(minY,bounds.min.y);maxY=Math.max(maxY,bounds.max.y);}
      rows.push({floor,room:room.id,role:data.role,minY,maxY});
    }}}
    return rows;
  });evidence.grounds=grounds;
  check('NPC mesh geometry stays above ground in both floor palettes while animated',grounds.length>=6&&grounds.every(row=>row.minY>=-.002&&row.maxY<3.6));
  check('character and scene batching emits no browser errors',errors.length===0&&consoleErrors.length===0);
  await writeFile('test-artifacts/characters-regression.json',JSON.stringify({status:'PASS',checks,errors,consoleErrors,evidence},null,2));
}catch(error){
  await page.screenshot({path:'test-artifacts/characters-regression-failure.png'}).catch(()=>{});
  await writeFile('test-artifacts/characters-regression.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,consoleErrors,evidence},null,2));
  console.error(error);process.exitCode=1;
}finally{await browser.close();}
