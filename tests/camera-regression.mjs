import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],checks=[],evidence={viewports:[]};
page.on('pageerror',error=>errors.push(error.message));
const check=(name,passed)=>{assert(passed,name);checks.push(name);console.log('PASS',name);};

try{
  await mkdir('test-artifacts',{recursive:true});
  await page.goto('http://127.0.0.1:5188');
  await page.waitForFunction(()=>window.__game?.menuEntrance?.finished,{timeout:15000});
  await page.click('#start-btn');await page.click('#class-confirm');
  evidence.introStart=await page.evaluate(()=>({state:window.__game.state,size:window.__game.camera.top,heroY:window.__game.hero.position.y}));
  await page.waitForFunction(()=>window.__game.state==='playing',{timeout:15000});
  evidence.introEnd=await page.evaluate(()=>({state:window.__game.state,size:window.__game.camera.top,desired:window.__game.playViewSize(),heroY:window.__game.hero.position.y}));
  check('start entrance blends into the full-room overview camera',evidence.introStart.state==='intro'&&evidence.introStart.size>evidence.introEnd.size*1.5&&evidence.introEnd.size>=15&&Math.abs(evidence.introEnd.size-evidence.introEnd.desired)<.001);

  for(const viewport of [{width:1280,height:720},{width:1440,height:900},{width:2048,height:1034},{width:720,height:1280},{width:2560,height:720}]){
    await page.setViewportSize(viewport);
    await page.waitForFunction(({width,height})=>{const g=window.__game,rect=g.canvas.getBoundingClientRect(),ratio=g.renderer.getPixelRatio();return innerWidth===width&&innerHeight===height&&rect.width===width&&rect.height===height&&Math.round(g.canvas.width/ratio)===width&&Math.round(g.canvas.height/ratio)===height;},viewport,{timeout:15000});
    const result=await page.evaluate(async()=>{
      const g=window.__game,p=g.player;
      g.state='paused';g.shake=0;g.input.down=false;g.input.keys.clear();g.seed=270021;
      const rooms=[],size=g.renderer.getSize(g.mouseVector.clone()),canvas=g.canvas.getBoundingClientRect();
      const projectionAspect=(g.camera.right-g.camera.left)/(g.camera.top-g.camera.bottom);
      const aspect=innerWidth/innerHeight;
      const inside=(point)=>point.x>=-1&&point.x<=innerWidth+1&&point.y>=-1&&point.y<=innerHeight+1;
      const samplePlayer=()=>{g.camera.updateMatrixWorld(true);return {feet:g.screenPoint(p.x,p.z,.15),head:g.screenPoint(p.x,p.z,g.hero.userData.height)};};
      for(const floor of [1,2,3]){
        g.loadFloor(floor);g.finishEntrance();g.state='paused';g.shake=0;g.clearCombat();
        for(const room of g.dungeon.rooms){
          g.enterRoom(room.id);g.state='paused';g.shake=0;p.x=0;p.z=0;g.followCamera(0,true);g.camera.updateMatrixWorld(true);
          const projected=room.outline.map(([x,z])=>g.screenPoint(x,z,0));
          const extent={minX:Math.min(...projected.map(q=>q.x)),maxX:Math.max(...projected.map(q=>q.x)),minY:Math.min(...projected.map(q=>q.y)),maxY:Math.max(...projected.map(q=>q.y))};
          const row={floor,id:room.id,type:room.type,shape:room.shape,w:room.w,h:room.h,size:g.camera.top,coverageX:(extent.maxX-extent.minX)/innerWidth,coverageY:(extent.maxY-extent.minY)/innerHeight,gridPoints:0,offscreen:[],doorPoints:0,aimChecks:0,aimError:0,continuousFrames:0,continuousOffscreen:[],followMotion:0};
          const points=[];
          for(let x=-room.w/2+1.3;x<=room.w/2-1.2;x+=2.4)for(let z=-room.h/2+1.3;z<=room.h/2-1.2;z+=2.4){
            if(!g.isSolid(x,z,.39))points.push({x,z});
          }
          for(const point of points){
            p.x=point.x;p.z=point.z;g.followCamera(0,true);const screen=samplePlayer();row.gridPoints++;
            if(!inside(screen.feet)||!inside(screen.head))row.offscreen.push({point,screen});
          }
          // Check both sides of each threshold while room transitions are held.
          for(const direction of Object.keys(room.links)){
            const d={east:{x:1,z:0},west:{x:-1,z:0},north:{x:0,z:-1},south:{x:0,z:1}}[direction];
            for(const inset of [1.3,.35]){
              p.x=d.x*(room.w/2-inset);p.z=d.z*(room.h/2-inset);g.followCamera(0,true);const screen=samplePlayer();row.doorPoints++;
              if(!inside(screen.feet)||!inside(screen.head))row.offscreen.push({door:direction,inset,screen});
            }
          }
          // Walk at actual normal movement speed and allow the real camera
          // smoothing to respond each frame, rather than teleporting the view.
          const center=points.reduce((best,q)=>!best||Math.hypot(q.x,q.z)<Math.hypot(best.x,best.z)?q:best,null);
          if(center){
            p.x=center.x;p.z=center.z;g.transitionCd=100;g.followCamera(0,true);
            for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]]){
              const before=g.camera.position.clone();
              for(let i=0;i<105;i++){
                const length=Math.hypot(dx,dz);g.moveActor(p,dx/length*8.2/60,dz/length*8.2/60,.39,true);g.followCamera(1/60);row.continuousFrames++;
                const screen=samplePlayer();if(!inside(screen.feet)||!inside(screen.head))row.continuousOffscreen.push({x:p.x,z:p.z,screen});
              }
              row.followMotion=Math.max(row.followMotion,g.camera.position.distanceTo(before));
            }
            g.followCamera(0,true);g.camera.updateMatrixWorld(true);
            for(const [dx,dz]of [[0,0],[1,1],[-1,1],[1,-1],[-1,-1]]){
              const world={x:p.x+dx,z:p.z+dz},screen=g.screenPoint(world.x,world.z,.85),normalized=g.mouseVector.clone().set(screen.x/innerWidth*2-1,1-screen.y/innerHeight*2),hit=g.aimPoint.clone();
              g.raycaster.setFromCamera(normalized,g.camera);g.raycaster.ray.intersectPlane(g.aimPlane,hit);row.aimChecks++;row.aimError=Math.max(row.aimError,Math.hypot(hit.x-world.x,hit.z-world.z));
            }
          }
          rooms.push(row);
        }
      }
      return {viewport:{width:innerWidth,height:innerHeight},aspect,projectionAspect,renderer:{width:size.x,height:size.y},canvas:{width:canvas.width,height:canvas.height},rooms};
    });
    evidence.viewports.push(result);
    const label=`${viewport.width} x ${viewport.height}`;
    check(`${label} resize keeps canvas and renderer at viewport dimensions`,result.renderer.width===viewport.width&&result.renderer.height===viewport.height&&result.canvas.width===viewport.width&&result.canvas.height===viewport.height);
    check(`${label} camera projection retains the viewport aspect ratio`,Math.abs(result.aspect-result.projectionAspect)<1e-9);
    check(`${label} every complete floor footprint fits inside the viewport`,result.rooms.every(room=>room.coverageX<.98&&room.coverageY<.98));
    check(`${label} settled camera keeps player feet and head onscreen across walkable room points and thresholds`,result.rooms.every(room=>room.gridPoints>0&&room.offscreen.length===0));
    check(`${label} actual walking preserves the overview and player visibility`,result.rooms.every(room=>room.continuousFrames>0&&room.continuousOffscreen.length===0)&&result.rooms.every(room=>room.followMotion<5));
    check(`${label} projected mouse aim roundtrips accurately to the world aiming plane`,result.rooms.every(room=>room.aimChecks===5&&room.aimError<1e-6));
  }

  const production=await browser.newPage({viewport:{width:1440,height:900}});
  production.on('pageerror',error=>errors.push(error.message));
  await production.goto('http://127.0.0.1:5188');
  await production.waitForFunction(()=>window.__game?.menuEntrance?.finished,{timeout:15000});
  await production.click('#start-btn');await production.click('#class-confirm');
  await production.waitForFunction(()=>window.__game.state==='playing',{timeout:15000});
  await production.waitForTimeout(800);
  evidence.production=await production.evaluate(()=>({state:window.__game.state,size:window.__game.camera.top,desired:window.__game.playViewSize?.(),viewport:{width:innerWidth,height:innerHeight},room:{w:window.__game.room.w,h:window.__game.room.h},focus:window.__game.cameraFocus}));
  check('production build uses the full-room overview view',evidence.production.state==='playing'&&evidence.production.size>=15&&Math.abs(evidence.production.size-evidence.production.desired)<.001);
  await production.screenshot({path:'test-artifacts/room-overview.png'});
  await production.close();
  check('camera regression produces no browser runtime errors',errors.length===0);
  await writeFile('test-artifacts/camera-regression.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){
  await page.screenshot({path:'test-artifacts/camera-regression-failure.png'}).catch(()=>{});
  await writeFile('test-artifacts/camera-regression.json',JSON.stringify({status:'FAIL',error:error.message,checks,errors,evidence},null,2));
  console.error(error);process.exitCode=1;
}finally{await browser.close();}
