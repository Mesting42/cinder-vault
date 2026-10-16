import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {getSettings,subscribeSettings,resolveGraphics} from './settings.js';

// BLACK IRON ARCHIVE — an actual low-poly room, built from geometry, not an image.
// The left rail stays where it was; the suspended vault seal owns the right side.
const palette={black:0x0b1015,iron:0x222c34,edge:0x3e4a50,slate:0x171e24,gold:0xb99d68,red:0xa13224};
export function createMenuScene(canvas,menu){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setClearColor(palette.black);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(palette.black,.034);
  const camera=new THREE.OrthographicCamera(-12,12,7,-7,.1,80);
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.24,.35,.85);composer.addPass(bloom);composer.addPass(new OutputPass());
  camera.position.set(7,6.9,17);camera.lookAt(0,3.4,-2.6);
  const staticRoot=new THREE.Group();scene.add(staticRoot);
  const materials=new Map(),geometryCache=new Map();
  const mat=(color,metalness=.55,emissive=0)=>{const key=[color,metalness,emissive].join('-');if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,metalness,roughness:.57,emissive:emissive?color:0,emissiveIntensity:emissive}));return materials.get(key);};
  const cube=(root,w,h,d,x,y,z,color=palette.iron,emit=0)=>{const key=[w,h,d].join('-');if(!geometryCache.has(key))geometryCache.set(key,new THREE.BoxGeometry(w,h,d));const mesh=new THREE.Mesh(geometryCache.get(key),mat(color,.55,emit));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;};
  const cylinder=(root,r1,r2,h,x,y,z,color,sides=8,emit=0)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,sides),mat(color,.55,emit));mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;};
  const ring=(root,radius,tube,color)=>{const mesh=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,4,12),mat(color));mesh.castShadow=true;root.add(mesh);return mesh;};
  const floor= cube(staticRoot,38,.4,26,0,-.3,0,palette.slate);
  // Actual slab seams and cabinet drawers, batched by material below.
  for(let x=-16;x<=16;x+=4)cube(staticRoot,.022,.01,24,x,-.092,0,0x080c10);
  for(let z=-10;z<=10;z+=3)cube(staticRoot,36,.01,.025,0,-.091,z,0x080c10);
  cube(staticRoot,32,10,.8,0,4.9,-7.7,palette.slate);
  for(const x of[-12,-6,6,12]){
    cube(staticRoot,1.4,.35,1.35,x,.08,-6.5,palette.edge);
    cube(staticRoot,.85,9.5,1,x,4.9,-6.5,palette.iron);
    cube(staticRoot,.1,8.2,.14,x-.25,4.8,-5.96,palette.edge);
    cube(staticRoot,1.3,.4,1.4,x,9.4,-6.5,palette.edge);
    cube(staticRoot,1.2,.06,1.2,x,1.0,-6.5,palette.gold);
  }
  for(const x of[-9,9]){
    cube(staticRoot,4.8,6.3,.6,x,3.45,-7.05,palette.black);
    for(let i=0;i<5;i++)for(let j=0;j<3;j++){
      cube(staticRoot,1.34,.92,.12,x+(j-1)*1.48,.98+i*1.08,-6.66,i%2?0x273038:0x202830);
      cube(staticRoot,.32,.045,.12,x+(j-1)*1.48,1+i*1.08,-6.56,palette.gold);
    }
  }
  cube(staticRoot,29,.38,1,0,9.4,-6.8,palette.edge);
  cube(staticRoot,18,.07,.1,0,8.85,-6.20,palette.gold);
  // An octagonal dais and recessed floor inlay give the seal weight in the room.
  cylinder(staticRoot,3.8,4.05,.22,0,.03,-1.7,palette.black);
  cylinder(staticRoot,3.67,3.8,.1,0,.19,-1.7,palette.edge);
  cylinder(staticRoot,3.45,3.6,.04,0,.26,-1.7,palette.slate);
  const floorInlay=ring(staticRoot,3.1,.023,palette.gold);floorInlay.rotation.x=-Math.PI/2;floorInlay.position.set(0,.30,-1.7);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;const tick=cube(staticRoot,.055,.022,.3,Math.sin(a)*2.94,.31,-1.7+Math.cos(a)*2.94,palette.gold);tick.rotation.y=a;}
  const base=cylinder(staticRoot,1.4,1.8,.42,0,.47,-1.7,palette.black);
  cylinder(staticRoot,1.35,1.4,.08,0,.71,-1.7,palette.gold);
  cylinder(staticRoot,.75,1.05,.5,0,.98,-1.7,palette.iron);
  // Suspended mechanical seal: segmented octagon, gold facets and a crimson ember.
  const seal=new THREE.Group();seal.position.set(0,4.4,-1.7);scene.add(seal);
  const outer=new THREE.Group();seal.add(outer);
  ring(outer,1.98,.095,palette.edge);ring(outer,1.77,.035,palette.gold);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;const spoke=cube(outer,.09,.36,.13,Math.sin(a)*1.96,Math.cos(a)*1.96,.03,i%3===0?palette.gold:palette.edge);spoke.rotation.z=-a;}
  const crest=new THREE.Group();seal.add(crest);
  // Diamond profile is an extrusion with visible side faces, not a billboard.
  const shape=new THREE.Shape();shape.moveTo(0,1.3);shape.lineTo(.51,.24);shape.lineTo(.22,-.12);shape.lineTo(.12,-1.04);shape.lineTo(-.12,-1.04);shape.lineTo(-.22,-.12);shape.lineTo(-.51,.24);shape.closePath();
  const blade=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:true,bevelSize:.06,bevelThickness:.05,bevelSegments:1,steps:1}),mat(palette.gold,.75));blade.castShadow=true;crest.add(blade);
  cube(crest,.07,1.55,.04,0,.12,.32,palette.red,2.1);
  for(const side of[-1,1]){const arm=cube(crest,.13,.80,.15,side*.71,-.08,.14,palette.gold);arm.rotation.z=-side*.62;}
  // A few hanging links imply the black iron archive without covering the buttons.
  for(const [x,z] of[[-4.6,-3.0],[5.1,-4.0]])for(let i=0;i<12;i++){
    const link=new THREE.Mesh(new THREE.TorusGeometry(.13,.038,4,6),mat(palette.edge));link.position.set(x,8.7-i*.25,z);link.rotation.y=i%2?Math.PI/2:0;staticRoot.add(link);
  }
  const hemi=new THREE.HemisphereLight(0x8cabb8,0x151010,1.9);scene.add(hemi);
  const key=new THREE.DirectionalLight(0xc0d6dd,2.6);key.position.set(-5,10,8);key.castShadow=true;Object.assign(key.shadow.camera,{left:-15,right:15,top:12,bottom:-12,near:1,far:40});key.shadow.normalBias=.045;key.shadow.bias=-.0002;scene.add(key);
  const rim=new THREE.DirectionalLight(0xd4b67a,1.75);rim.position.set(4,6,-6);scene.add(rim);
  const sealLight=new THREE.PointLight(0xe8c68b,20,9,2);sealLight.position.set(0,4,-.7);scene.add(sealLight);
  const fires=[];
  for(const [x,z] of[[-4,-.5],[4.4,-3]]){
    cube(staticRoot,.9,.22,.9,x,.05,z,palette.edge);
    cylinder(staticRoot,.29,.4,1.25,x,.79,z,palette.iron);
    cylinder(staticRoot,.58,.4,.28,x,1.53,z,palette.gold);
    cylinder(staticRoot,.5,.49,.06,x,1.69,z,palette.black);
    const flame=new THREE.Group();flame.position.set(x,1.83,z);scene.add(flame);
    cylinder(flame,.02,.27,.65,0,.15,0,0xa93a22,5,1.8);
    cylinder(flame,.01,.14,.54,.07,.18,.04,0xf5aa52,5,2.2);
    cylinder(flame,.01,.09,.38,-.08,.11,.08,0xffd17a,4,2.1);
    const light=new THREE.PointLight(0xef7545,26,8,2);light.position.set(x,2.14,z);scene.add(light);fires.push({flame,light,phase:x});
  }
  // Consolidate all static architecture into one draw per material.
  staticRoot.updateMatrixWorld(true);const buckets=new Map();
  staticRoot.traverse(o=>{if(!o.isMesh)return;const b=buckets.get(o.material)||[];b.push(o.geometry.clone().applyMatrix4(o.matrixWorld).toNonIndexed());buckets.set(o.material,b);});
  const cachedGeometries=new Set(geometryCache.values()),uniqueSource=new Set();staticRoot.traverse(o=>{if(o.geometry&&!cachedGeometries.has(o.geometry))uniqueSource.add(o.geometry);});
  staticRoot.clear();for(const [material,geometries] of buckets){const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.castShadow=mesh.receiveShadow=true;staticRoot.add(mesh);for(const geo of geometries)geo.dispose();}for(const geo of uniqueSource)geo.dispose();
  const dustGeo=new THREE.BufferGeometry(),positions=new Float32Array(80*3);
  for(let i=0;i<80;i++){positions[i*3]=Math.sin(i*12.989)*7;positions[i*3+1]=.3+(i%23)/23*7;positions[i*3+2]=-5+Math.cos(i*6.33)*5;}
  dustGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xbd9f6b,size:.026,transparent:true,opacity:.36,depthWrite:false}));scene.add(dust);
  // Texture-free ground mist. Two broad waves, low opacity, no full-screen blur.
  const mistMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform float time;void main(){vec2 p=vUv-.5;float edge=1.-smoothstep(.16,.55,length(p));float wave=.5+.5*sin(vUv.x*10.+sin(vUv.y*7.+time*.12)+time*.08);gl_FragColor=vec4(.34,.41,.44,edge*wave*.10);}'});
  const mist=new THREE.Mesh(new THREE.PlaneGeometry(22,16),mistMaterial);mist.rotation.x=-Math.PI/2;mist.position.set(0,.34,-1.7);scene.add(mist);
  let quality,signature='',reduced=false,dirty=true,last=0,time=0,lastDraw=-Infinity,active=false,raf=0,disposed=false,contextLost=false,renderFrames=0;
  const visible=()=>!document.hidden&&!menu.classList.contains('hidden')&&!document.body.classList.contains('orientation-blocked');
  function resize(){if(disposed)return;const w=innerWidth,h=innerHeight;renderer.setSize(w,h);composer.setSize(w,h);const aspect=w/h,s=aspect<1.4?7.1:6.8,offset=-s*aspect*(aspect<1.4?.18:.30);camera.left=-s*aspect+offset;camera.right=s*aspect+offset;camera.top=s;camera.bottom=-s;camera.updateProjectionMatrix();dirty=true;}
  function settings(){const s=getSettings(),touch=document.body.classList.contains('touch-input');quality=resolveGraphics(s,touch);const pixelRatio=s.graphics.quality==='auto'&&s.graphics.resolution==='preset'?Math.min(devicePixelRatio,quality.pixelRatio):quality.pixelRatio;const next=JSON.stringify([pixelRatio,quality.shadowSize]);if(next!==signature){signature=next;renderer.setPixelRatio(pixelRatio);composer.setPixelRatio(pixelRatio);renderer.shadowMap.enabled=!!quality.shadowSize;key.castShadow=!!quality.shadowSize;if(quality.shadowSize){key.shadow.map?.dispose();key.shadow.map=null;key.shadow.mapSize.set(quality.shadowSize,quality.shadowSize);}scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});resize();}reduced=s.accessibility.reduceMotion||matchMedia('(prefers-reduced-motion:reduce)').matches;dust.visible=quality.particles>0;dust.geometry.setDrawRange(0,Math.min(80,quality.particles));mist.visible=quality.particles>0;bloom.enabled=quality.bloom;bloom.strength=Math.min(.32,quality.bloomStrength);dirty=true;}
  function draw(timestamp){raf=0;if(disposed)return;const dt=last?Math.min((timestamp-last)/1000,.05):0;last=timestamp;
    active=visible()&&!contextLost;if(active){if(!reduced){time+=dt;seal.position.y=4.4+Math.sin(time*.48)*.055;seal.rotation.y=Math.sin(time*.24)*.065;outer.rotation.z=Math.sin(time*.13)*.035;for(const f of fires){f.flame.scale.y=1+Math.sin(time*6+f.phase)*.065;f.flame.rotation.y=Math.sin(time*2+f.phase)*.08;f.light.intensity=26*(1+Math.sin(time*5+f.phase)*.045);}sealLight.intensity=20+Math.sin(time*.7)*.65;mistMaterial.uniforms.time.value=time;dust.rotation.y=Math.sin(time*.04)*.035;dirty=true;}
      // Ambient scenes need at most 30 FPS. Reduced motion draws only after changes.
      if(dirty&&(reduced||timestamp-lastDraw>=1000/30)){composer.render();renderFrames++;lastDraw=timestamp;dirty=false;if(menu.dataset.scene!=='ready'){menu.dataset.scene='ready';document.dispatchEvent(new Event('cinder:menu-scene'));}}
    }raf=requestAnimationFrame(draw);
  }
  const observer=new MutationObserver(()=>{dirty=true;});observer.observe(menu,{attributes:true,attributeFilter:['class']});observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  const motion=matchMedia('(prefers-reduced-motion:reduce)'),unsubscribe=subscribeSettings(settings);
  addEventListener('resize',resize);document.addEventListener('visibilitychange',onVisibility);document.addEventListener('cinder:input-mode',settings);motion.addEventListener('change',settings);
  function onVisibility(){last=0;dirty=true;}
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;menu.dataset.scene='unavailable';});canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;signature='';settings();dirty=true;});
  settings();raf=requestAnimationFrame(draw);
  const api={renderer,scene,camera,seal,fires,bloom,get renderFrames(){return renderFrames;},get active(){return active;},get reducedMotion(){return reduced;},get time(){return time;},get quality(){return quality;},dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();unsubscribe();removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVisibility);document.removeEventListener('cinder:input-mode',settings);motion.removeEventListener('change',settings);const geometries=new Set(),mats=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)mats.add(o.material);});for(const geo of new Set([...geometries,...geometryCache.values()]))geo.dispose();for(const m of new Set([...mats,...materials.values()]))m.dispose();key.shadow.map?.dispose();bloom.dispose();composer.dispose();renderer.dispose();}};
  return api;
}
