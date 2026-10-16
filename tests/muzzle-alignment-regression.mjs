import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {WEAPONS} from '../src/data.js';

const baseline=process.argv.includes('--baseline');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks=[],errors=[],evidence={};
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
await mkdir('test-artifacts',{recursive:true});
try{
  for(const [device,viewport,touch] of [['desktop',{width:1440,height:900},false],['phone',{width:844,height:390},true]]){
    const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,deviceScaleFactor:1});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(`${device}: ${e.message}`));
    await page.goto(process.env.GAME_URL||'http://127.0.0.1:5188');
    await page.locator('#start-btn').click();await page.waitForFunction(()=>window.__game?.state==='select');
    await page.evaluate(()=>window.__game.frame=()=>{});await page.waitForTimeout(60);
    const rows=await page.evaluate(({weapons,baseline})=>{
      const g=window.__game,rows=[];
      const vec=()=>g.hero.position.clone(),distance=(a,b)=>a.distanceTo(b);
      const originalBeam=g.fireBeam;
      let beamCalls=[];
      g.fireBeam=function(...args){beamCalls.push(args);return originalBeam.apply(this,args);};
      const reset=classId=>{
        g.newGame(270021,classId);g.finishEntrance();g.state='paused';g.clearCombat();
        g.room.objects=[];g.room.enemies=[];g.room.sealed=false;g.player.x=0;g.player.z=0;
        g.player.invul=0;g.transitionCd=100;g.time=3;g.player.passives=[];
        g.player.weapons=weapons.filter(w=>w.classOnly===classId).map(w=>w.id);
        for(const w of weapons)g.player.ammo[w.id]=w.mag;
      };
      const snapshot=()=>{
        g.hero.updateMatrixWorld(true);
        const gun=g.hero.userData.weapon.children[0];
        return gun.localToWorld(gun.userData.muzzleLocal.clone());
      };
      const renderedBeamErrors=muzzle=>{
        const results=[];g.fxGroup.updateMatrixWorld(true);
        for(const effect of g.effects){
          effect.mesh.traverse(mesh=>{
            if(mesh.geometry?.type==='CylinderGeometry'&&mesh.geometry.parameters.height>2){
              const length=mesh.geometry.parameters.height;
              const a=mesh.localToWorld(vec().set(0,-length/2,0)),b=mesh.localToWorld(vec().set(0,length/2,0));
              results.push(Math.min(distance(a,muzzle),distance(b,muzzle)));
            }
          });
          const instanceBeam=effect.mesh.userData.classCombatFx?.beam;
          if(instanceBeam?.isInstancedMesh){
            const matrix=new instanceBeam.matrixWorld.constructor();instanceBeam.getMatrixAt(0,matrix);
            const a=instanceBeam.localToWorld(vec().set(0,0,-.5).applyMatrix4(matrix));
            const b=instanceBeam.localToWorld(vec().set(0,0,.5).applyMatrix4(matrix));
            results.push(Math.min(distance(a,muzzle),distance(b,muzzle)));
          }
          if(['branching-lightning','arcane-ritual-beam'].includes(effect.mesh.name)){
            const mesh=effect.mesh.children.find(m=>m.geometry?.attributes.position);
            if(mesh){const p=mesh.geometry.attributes.position;
              const a=vec().fromBufferAttribute(p,0),b=vec().fromBufferAttribute(p,1);
              results.push(distance(mesh.localToWorld(a.add(b).multiplyScalar(.5)),muzzle));
            }
          }
        }
        return results;
      };
      const shootCase=(w,aim,pose)=>{
        g.clearCombat();g.player.rollTime=0;g.player.reload=0;g.player.ammo[w.id]=w.mag;
        g.player.castTime=pose==='casting'?.12:0;g.player.castTotal=.24;
        g.player.fireCd=pose==='recoil'?.25:0;g.time=pose==='walking'?3.11:3;
        g.updateHeroPose(aim,pose==='walking'?1:0);
        const gun=g.hero.userData.weapon.children[0];
        if(pose==='scaled'){gun.scale.setScalar(g.hero.userData.gunScale*.74);g.hero.scale.setScalar(1.13);}
        const muzzle=snapshot(),bounds=new g.hero.userData.bounds.constructor().setFromObject(gun,true);
        const old=vec().set(g.player.x+Math.sin(aim)*.8,muzzle.y,g.player.z+Math.cos(aim)*.8);
        const before=g.player.shots;beamCalls=[];g.shoot(aim);g.fxGroup.updateMatrixWorld(true);
        const packets=w.kind==='laser'||w.kind==='rail'
          ?beamCalls.map(args=>vec().set(args[0],args[8]??.95,args[1]))
          :g.bullets.filter(b=>!b.enemy).map(b=>vec().set(b.x,b.height,b.z));
        const meshErrors=g.bullets.filter(b=>!b.enemy).map(b=>distance(b.mesh.getWorldPosition(vec()),muzzle));
        const sprites=[];for(const e of g.effects){
          e.mesh.traverse(m=>{if(m.isSprite)sprites.push(distance(m.getWorldPosition(vec()),muzzle));});
          if(e.mesh.userData.classCombatFx?.mode==='muzzle')sprites.push(distance(e.mesh.getWorldPosition(vec()),muzzle));
        }
        const mp=g.screenPoint(muzzle.x,muzzle.z,muzzle.y),op=g.screenPoint(old.x,old.z,old.y);
        const result={id:w.id,classId:w.classOnly,angle:aim,pose,muzzle:muzzle.toArray(),oldOrigin:old.toArray(),oldMismatch:distance(muzzle,old),oldScreenMismatch:Math.hypot(mp.x-op.x,mp.y-op.y),
          shots:g.player.shots-before,packetErrors:packets.map(v=>distance(v,muzzle)),projectileMeshErrors:meshErrors,
          lightError:distance(g.muzzleLight.getWorldPosition(vec()),muzzle),flashError:sprites.length?Math.min(...sprites):null,
          renderedBeamErrors:renderedBeamErrors(muzzle),slotScale:g.hero.userData.weapon.scale.x,gunMinY:bounds.min.y,
          finite:[...muzzle.toArray(),...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite)};
        gun.scale.setScalar(g.hero.userData.gunScale);g.hero.scale.setScalar(1);
        rows.push(result);return result;
      };
      try{
        for(const classId of ['shooter','mage']){
          reset(classId);
          for(const w of weapons.filter(w=>w.classOnly===classId)){
            g.player.weaponIndex=g.player.weapons.indexOf(w.id);g.equip();
            for(let i=0;i<8;i++)shootCase(w,i*Math.PI/4,'idle');
          }
        }
        if(!baseline){
          for(const id of ['laser','rail','revolver','stormrod','froststaff','embercodex']){
            const w=weapons.find(w=>w.id===id);reset(w.classOnly);g.player.weaponIndex=g.player.weapons.indexOf(id);g.equip();
            for(const pose of ['walking','recoil','scaled',...(w.classOnly==='mage'?['casting']:[])])for(let i=0;i<8;i++)shootCase(w,i*Math.PI/4,pose);
          }
          for(const id of ['laser','rail','revolver','stormrod','froststaff']){
            const w=weapons.find(w=>w.id===id);reset(w.classOnly);g.player.weaponIndex=g.player.weapons.indexOf(id);g.equip();
            for(let i=0;i<8;i++){
              const aim=i*Math.PI/4;g.player.x=-Math.sin(aim)*1.71;g.player.z=-Math.cos(aim)*1.71;
              g.room.objects=[{type:'column',x:0,z:0,hw:.7,hh:.7,solid:true,shotBlock:true,hp:9999,destroyed:false}];
              shootCase(w,aim,'cover-fit');
            }
          }
          for(const id of ['laser','froststaff']){
            const w=weapons.find(w=>w.id===id);reset(w.classOnly);g.player.weaponIndex=g.player.weapons.indexOf(id);g.equip();g.state='playing';
            g.input.down=true;g.input.keys.add('KeyD');if(g.controls?.touchMode)g.controls.move.x=1;
            const originalShoot=g.shoot,before=g.player.x;let moving=null;
            g.shoot=function(aim){const muzzle=snapshot();beamCalls=[];originalShoot.call(this,aim);
              const packets=w.kind==='laser'?beamCalls.map(args=>vec().set(args[0],args[8]??.95,args[1])):this.bullets.filter(b=>!b.enemy).map(b=>vec().set(b.x,b.height,b.z));
              moving={id:`moving-${id}`,moved:this.player.x-before,packetErrors:packets.map(v=>distance(v,muzzle))};
            };
            try{g.update(.01);}finally{g.shoot=originalShoot;g.input.down=false;g.input.keys.clear();if(g.controls?.touchMode)g.controls.move.x=0;}
            rows.push(moving);
          }
          reset('shooter');g.player.weaponIndex=g.player.weapons.indexOf('laser');g.equip();g.player.overload=3;g.player.skillBranch='marksman';g.player.skillTier=2;g.player.skillShots=3;
          const marksman=shootCase(weapons.find(w=>w.id==='laser'),Math.PI*.73,'marksman-extra');
          marksman.beamCount=beamCalls.length;
          for(const id of ['laser','stormrod']){
            const w=weapons.find(w=>w.id===id);reset(w.classOnly);g.player.weaponIndex=g.player.weapons.indexOf(id);g.equip();g.player.passives=['crystal'];
            const aim=Math.PI/2;g.updateHeroPose(aim,0);const muzzle=snapshot();
            const first=g.spawnEnemy('gunner',muzzle.x+4,muzzle.z),second=g.spawnEnemy('gunner',muzzle.x+4,muzzle.z+2);
            for(const [enemy,x,z]of [[first,muzzle.x+4,muzzle.z],[second,muzzle.x+4,muzzle.z+2]]){enemy.x=x;enemy.z=z;enemy.model.position.set(x,0,z);enemy.hp=enemy.maxHp=1000;}
            g.shoot(aim);g.fxGroup.updateMatrixWorld(true);const endpoints=[];
            for(const effect of g.effects){
              const mesh=effect.mesh.userData.classCombatFx?.beam;
              if(mesh?.isInstancedMesh){const matrix=new mesh.matrixWorld.constructor();mesh.getMatrixAt(0,matrix);endpoints.push([mesh.localToWorld(vec().set(0,0,-.5).applyMatrix4(matrix)).toArray(),mesh.localToWorld(vec().set(0,0,.5).applyMatrix4(matrix)).toArray()]);}
              if(effect.mesh.name==='branching-lightning'){
                const ribbon=effect.mesh.children[0],p=ribbon.geometry.attributes.position;
                endpoints.push([ribbon.localToWorld(vec().fromBufferAttribute(p,0).add(vec().fromBufferAttribute(p,1)).multiplyScalar(.5)).toArray(),ribbon.localToWorld(vec().fromBufferAttribute(p,p.count-2).add(vec().fromBufferAttribute(p,p.count-1)).multiplyScalar(.5)).toArray()]);
              }
            }
            const near=(point,target)=>Math.hypot(point[0]-target.x,point[2]-target.z)<1e-5;
            rows.push({id:`chain-${id}`,firstHp:first.hp,secondHp:second.hp,primaryFromMuzzle:endpoints.some(pair=>pair.some(point=>vec().fromArray(point).distanceTo(muzzle)<1e-5)),secondaryBetweenTargets:endpoints.some(pair=>(near(pair[0],first)&&near(pair[1],second))||(near(pair[1],first)&&near(pair[0],second))),beamCount:endpoints.length});
          }
          // A true gun muzzle is lateral to the player's center. Its trajectory
          // must converge on the intended target, rather than run parallel and
          // narrowly miss a normal gunner whose collision radius is unchanged.
          for(const id of ['laser','rail','judgment','stormrod','ritualstaff','revolver','froststaff']){
            const w=weapons.find(w=>w.id===id);reset(w.classOnly);g.player.weaponIndex=g.player.weapons.indexOf(id);g.equip();
            for(let i=0;i<8;i++){
              g.clearCombat();for(const e of g.room.enemies){e.model.removeFromParent();e.bar?.removeFromParent();}g.room.enemies=[];
              const aim=i*Math.PI/4,tx=Math.sin(aim)*4.5,tz=Math.cos(aim)*4.5;
              const enemy=g.spawnEnemy('gunner',tx,tz);enemy.x=tx;enemy.z=tz;enemy.hp=enemy.maxHp=1000;enemy.model.position.set(tx,0,tz);
              g.player.fireCd=0;g.player.reload=0;g.player.ammo[id]=w.mag;g.player.castTime=0;g.aimPoint.set(tx,.85,tz);g.updateHeroPose(aim,0);
              const muzzle=snapshot();beamCalls=[];g.shoot(aim);
              const packets=w.kind==='laser'||w.kind==='rail'?beamCalls.map(args=>({x:args[0],z:args[1],angle:args[2]})):g.bullets.filter(b=>!b.enemy);
              const crossTrack=packets.map(b=>Math.abs((tx-b.x)*Math.cos(b.angle)-(tz-b.z)*Math.sin(b.angle)));
              for(let t=0;t<.4;t+=.01)g.updateBullets(.01,1);
              rows.push({id:`center-${id}`,angle:aim,hp:enemy.hp,radius:enemy.radius,crossTrack,muzzle:muzzle.toArray(),marked:(enemy.markUntil||0)>g.time});
            }
          }
          for(const id of ['laser','judgment']){
            const w=weapons.find(w=>w.id===id);reset('shooter');g.player.weaponIndex=g.player.weapons.indexOf(id);g.equip();
            const enemy=g.spawnEnemy('gunner',0,4.5);enemy.x=0;enemy.z=4.5;enemy.hp=enemy.maxHp=1000;enemy.model.position.set(0,0,4.5);
            g.aimPoint.set(9,.85,9);g.updateHeroPose(0,0);g.shoot(0);
            rows.push({id:`fallback-${id}`,hp:enemy.hp,radius:enemy.radius,marked:(enemy.markUntil||0)>g.time});
          }
          reset('shooter');g.player.weaponIndex=g.player.weapons.indexOf('laser');g.equip();g.player.fireCd=0;
          const pointerEnemy=g.spawnEnemy('gunner',0,4.5);pointerEnemy.x=0;pointerEnemy.z=4.5;pointerEnemy.hp=pointerEnemy.maxHp=1000;pointerEnemy.model.position.set(0,0,4.5);
          g.shake=0;g.followCamera(0,true);g.camera.updateMatrixWorld(true);
          const target=g.screenPoint(0,4.5,.85),center=g.screenPoint(g.player.x,g.player.z,.85);
          g.input.mx=target.x;g.input.my=target.y;if(g.controls?.touchMode){g.controls.aim.x=(target.x-center.x)/120;g.controls.aim.y=(target.y-center.y)/120;}
          g.state='playing';g.input.down=true;const pointerBefore=g.player.shots;g.update(0);g.input.down=false;
          rows.push({id:'input-center-laser',shots:g.player.shots-pointerBefore,hp:pointerEnemy.hp,aimPoint:g.aimPoint.toArray()});
          reset('shooter');g.player.weaponIndex=g.player.weapons.indexOf('revolver');g.equip();g.state='playing';
          g.input.down=true;g.player.fireCd=0;g.player.rollTime=.25;g.player.rollX=1;g.player.rollZ=0;
          const before=g.player.shots;g.update(.01);rows.push({id:'rolling-input',shots:g.player.shots-before,bullets:g.bullets.length});
          g.player.rollTime=0;g.player.fireCd=0;g.player.reload=0;g.player.ammo.revolver=6;
          const originalShoot=g.shoot;let resume=null;
          g.shoot=function(aim){const muzzle=snapshot();originalShoot.call(this,aim);resume={id:'roll-resume',muzzle:muzzle.toArray(),packetErrors:this.bullets.filter(b=>!b.enemy).map(b=>distance(vec().set(b.x,b.height,b.z),muzzle))};};
          try{g.update(.01);}finally{g.shoot=originalShoot;g.input.down=false;}
          rows.push(resume);
        }
      }finally{g.fireBeam=originalBeam;g.clearCombat();}
      return rows;
    },{weapons:WEAPONS.filter(w=>w.kind!=='melee'),baseline});
    evidence[device]=rows;
    if(!baseline){
      for(const w of WEAPONS.filter(w=>w.kind!=='melee')){
        const shots=rows.filter(r=>r.id===w.id),idle=shots.filter(r=>r.pose==='idle');
        check(`${device} ${w.id}: all eight directions launch from the actual muzzle`,idle.length===8&&shots.every(r=>r.shots===1&&r.packetErrors.length>0&&r.packetErrors.every(e=>e<1e-6)));
        check(`${device} ${w.id}: projectile visuals, flash and light share the muzzle`,shots.every(r=>r.projectileMeshErrors.every(e=>e<1e-6)&&r.lightError<1e-6&&r.flashError!==null&&r.flashError<1e-6));
        if(w.kind==='laser'||w.kind==='rail')check(`${device} ${w.id}: rendered beam begins at the muzzle`,shots.every(r=>r.renderedBeamErrors.length>0&&r.renderedBeamErrors.some(e=>e<1e-5)));
        check(`${device} ${w.id}: muzzle and held bounds remain finite above ground`,shots.every(r=>r.finite&&r.gunMinY>.20));
      }
      check(`${device} cover-fit retracts obstructed guns and matches every fitted muzzle`,rows.filter(r=>r.pose==='cover-fit').length===40&&rows.filter(r=>r.pose==='cover-fit'&&r.classId==='shooter').every(r=>r.slotScale<1)&&rows.filter(r=>r.pose==='cover-fit').every(r=>r.packetErrors.every(e=>e<1e-6)));
      check(`${device} simultaneous movement and fire read the updated model muzzle`,['laser','froststaff'].every(id=>{const r=rows.find(r=>r.id===`moving-${id}`);return r?.moved>0&&r.packetErrors.length>0&&r.packetErrors.every(e=>e<1e-6);}));
      check(`${device} marksman extra beam shares the barrel origin`,rows.find(r=>r.pose==='marksman-extra')?.beamCount===2&&rows.find(r=>r.pose==='marksman-extra').packetErrors.every(e=>e<1e-6));
      check(`${device} chained gun and spell beams start at muzzle, then connect actual enemies`,['laser','stormrod'].every(id=>{const r=rows.find(r=>r.id===`chain-${id}`);return r?.firstHp<1000&&r.secondHp<1000&&r.primaryFromMuzzle&&r.secondaryBetweenTargets&&r.beamCount>=2;}));
      for(const id of ['laser','rail','judgment','stormrod','ritualstaff','revolver','froststaff']){
        const centered=rows.filter(r=>r.id===`center-${id}`),w=WEAPONS.find(w=>w.id===id),allowed=w.kind==='laser'||w.kind==='rail'?1e-5:.25;
        check(`${device} ${id}: eight centered targets take hits with unchanged collision radius`,centered.length===8&&centered.every(r=>r.hp<1000&&r.radius===.56&&r.crossTrack.length>0&&r.crossTrack.every(error=>error<allowed)));
      }
      check(`${device} direct-angle fixtures with stale cursor still hit and mark centered enemies`,['laser','judgment'].every(id=>{const r=rows.find(r=>r.id===`fallback-${id}`);return r?.hp<1000&&r.radius===.56&&(id!=='judgment'||r.marked);}));
      check(`${device} actual input/update aiming converges on the pointer target`,rows.find(r=>r.id==='input-center-laser')?.shots===1&&rows.find(r=>r.id==='input-center-laser').hp<1000);
      check(`${device} rolling blocks fire and the ready pose resumes from its new muzzle`,rows.find(r=>r.id==='rolling-input').shots===0&&rows.find(r=>r.id==='rolling-input').bullets===0&&rows.find(r=>r.id==='roll-resume')?.packetErrors.length>0&&rows.find(r=>r.id==='roll-resume').packetErrors.every(e=>e<1e-6));
    }
    await context.close();
  }
  if(!baseline)check('no browser runtime errors',errors.length===0);
  await writeFile(`test-artifacts/${baseline?'muzzle-alignment-before':'muzzle-alignment-regression'}.json`,JSON.stringify({status:baseline?'BASELINE':'PASS',checks,errors,evidence},null,2));
  console.log(baseline?'Recorded actual pre-fix origins without asserting success.':`PASS ${checks.length} muzzle alignment checks.`);
}catch(error){
  await writeFile('test-artifacts/muzzle-alignment-regression.json',JSON.stringify({status:'FAIL',message:error.message,checks,errors,evidence},null,2));throw error;
}finally{await browser.close();}
