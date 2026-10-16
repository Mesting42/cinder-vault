export const SETTINGS_KEY='cinder-settings-v1';
export const DEFAULT_BINDINGS={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',roll:'Space',reload:'KeyR',interact:'KeyE',skill:'KeyQ',active:'KeyC',blank:'KeyF',map:'KeyM',build:'KeyB'};
export const BINDING_NAMES={up:'向前移动',down:'向后移动',left:'向左移动',right:'向右移动',roll:'翻滚',reload:'换弹 / 聚能',interact:'交互',skill:'职业技能',active:'主动装置',blank:'空包弹',map:'地图',build:'装备详情'};
export const DEFAULT_SETTINGS={audio:{muted:false,master:100,music:100,effects:100,voices:100,voiceLines:true},graphics:{quality:'auto',resolution:'preset',shadows:'preset',bloom:'preset',ambient:'preset'},controls:{mouseSensitivity:1,stickSize:100,leftStickSize:100,rightStickSize:100,leftStickInset:0,rightStickInset:0,stickSensitivity:1,bindings:{...DEFAULT_BINDINGS}},accessibility:{reduceMotion:false,shake:100,damageFlash:true,damageNumbers:true}};
const clone=value=>JSON.parse(JSON.stringify(value));
const enums={quality:['auto','low','medium','high'],resolution:['preset','0.75','1','1.5','2'],shadows:['preset','off','1024','2048'],bloom:['preset','on','off'],ambient:['preset','on','off']};
const ranges={master:[0,100],music:[0,100],effects:[0,100],voices:[0,100],mouseSensitivity:[.25,2],stickSize:[75,125],leftStickSize:[75,125],rightStickSize:[75,125],leftStickInset:[0,48],rightStickInset:[0,48],stickSensitivity:[.5,2],shake:[0,100]};
export const validKey=code=>typeof code==='string'&&/^(Key[A-Z]|Space|ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(code);
export function keyLabel(code){return code==='Space'?'空格':({ShiftLeft:'左 Shift',ShiftRight:'右 Shift',ControlLeft:'左 Ctrl',ControlRight:'右 Ctrl',AltLeft:'左 Alt',AltRight:'右 Alt',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'}[code]||code.replace('Key',''));}
export function normalizeSettings(source,strict=false){
  if(!source||typeof source!=='object'||Array.isArray(source))throw Error('设置内容必须是 JSON 对象。');
  const result=clone(DEFAULT_SETTINGS);
  for(const group of Object.keys(result)){
    const data=source[group];if(data===undefined)continue;
    if(!data||typeof data!=='object'||Array.isArray(data)){if(strict)throw Error('设置分组格式不正确。');continue;}
    for(const [key,def] of Object.entries(result[group])){
      if(key==='bindings')continue;const value=data[key];if(value===undefined)continue;
      const valid=enums[key]?enums[key].includes(value):ranges[key]?typeof value==='number'&&Number.isFinite(value)&&value>=ranges[key][0]&&value<=ranges[key][1]:typeof value===typeof def;
      if(valid)result[group][key]=value;else if(strict)throw Error('设置值超出允许范围：'+key);
    }
  }
  // Old saves had one shared size. Adopt it only for sides absent from that save.
  for(const key of ['leftStickSize','rightStickSize'])if(source.controls?.[key]===undefined)result.controls[key]=result.controls.stickSize;
  const bindings=source.controls?.bindings;
  if(bindings!==undefined){
    if(!bindings||typeof bindings!=='object'||Array.isArray(bindings)){if(strict)throw Error('按键映射格式不正确。');}
    else for(const action of Object.keys(DEFAULT_BINDINGS)){if(bindings[action]===undefined)continue;if(validKey(bindings[action]))result.controls.bindings[action]=bindings[action];else if(strict)throw Error('按键不可用：'+action);}
  }
  if(new Set(Object.values(result.controls.bindings)).size!==Object.keys(DEFAULT_BINDINGS).length){if(strict)throw Error('多个操作不能使用同一个按键。');result.controls.bindings={...DEFAULT_BINDINGS};}
  return result;
}
function initial(){try{return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null'));}catch{return clone(DEFAULT_SETTINGS);}}
let current=initial();const listeners=new Set();
export function getSettings(){return clone(current);}
export function subscribeSettings(fn){listeners.add(fn);return ()=>listeners.delete(fn);}
export function replaceSettings(value){current=normalizeSettings(value,true);let saved=true;try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(current));}catch{saved=false;}for(const fn of listeners)fn(getSettings());return saved;}
export function updateSetting(group,key,value){const next=getSettings();next[group][key]=value;return replaceSettings(next);}
export function resetSettings(){return replaceSettings(DEFAULT_SETTINGS);}
export function importSettings(text){if(text.length>65536)throw Error('设置文件不能超过 64 KB。');let data;try{data=JSON.parse(text);}catch{throw Error('无法读取 JSON，请选择导出的设置文件。');}if(data?.app!=='cinder-vault'||data.version!==1||!data.settings)throw Error('此文件不是支持的游戏设置文件。');return replaceSettings(data.settings);}
export function exportSettings(){return JSON.stringify({app:'cinder-vault',version:1,settings:getSettings()},null,2);}
export function resolveGraphics(settings=getSettings(),touch=false,width=innerWidth,height=innerHeight){
  const phone=touch&&Math.min(width,height)<=540;
  const presets={low:{pixelRatio:.75,shadowSize:0,bloom:false,bloomStrength:0,particles:0},medium:{pixelRatio:1,shadowSize:1024,bloom:true,bloomStrength:.28,particles:120},high:{pixelRatio:2,shadowSize:2048,bloom:true,bloomStrength:.48,particles:240},auto:{pixelRatio:touch?(phone?1:1.25):1.5,shadowSize:touch?1024:2048,bloom:true,bloomStrength:touch?.28:.42,particles:touch?120:240}};
  const g=settings.graphics,q={...presets[g.quality],name:g.quality==='auto'?(touch?(phone?'phone':'tablet'):'desktop'):g.quality};
  if(g.resolution!=='preset')q.pixelRatio=Number(g.resolution);
  if(g.shadows!=='preset')q.shadowSize=g.shadows==='off'?0:Number(g.shadows);
  if(g.bloom!=='preset')q.bloom=g.bloom==='on';
  if(g.ambient!=='preset')q.particles=g.ambient==='on'?240:0;
  return q;
}
