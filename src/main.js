import './menu.css';
import './classes.css';
import './menu-verdict.css';
import './responsive.css';
import './hud.css';
import './ui-theme.css';
import {AudioEngine} from './audio.js';
import {guide,settings} from './menu-info.js';
import {getSettings,subscribeSettings} from './settings.js';

const $=id=>document.getElementById(id);
const menu=$('menu'),status=$('menu-load-status');
const audio=new AudioEngine();
const motion=matchMedia('(prefers-reduced-motion:reduce)');
let touch=matchMedia('(pointer:coarse)').matches||(navigator.maxTouchPoints>0&&matchMedia('(hover:none)').matches);
let gamePromise=null,pending=false,lastFocus=null,requestId=0;
const metrics={interactive:null,backgroundReady:null,runtimeStarted:null,runtimeReady:null};
window.__cinderPortraitContinue=false;

function layout(){
  if(innerWidth>=innerHeight)window.__cinderPortraitContinue=false;
  const controls=window.__game?.controls;
  if(controls){controls.allowPortrait=window.__cinderPortraitContinue;controls.layout();return;}
  document.body.classList.toggle('touch-input',touch);
  document.body.classList.toggle('compact-touch',touch&&innerHeight<=540);
  const blocked=touch&&innerHeight>innerWidth&&!window.__cinderPortraitContinue;
  document.body.classList.toggle('orientation-blocked',blocked);
  $('rotate-screen').classList.toggle('hidden',!blocked);
}
layout();
addEventListener('resize',layout);
addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)screen.orientation?.unlock?.();layout();});
screen.orientation?.addEventListener?.('change',layout);
addEventListener('pointerdown',event=>{
  if(window.__game?.controls)return;
  touch=event.pointerType==='touch'||event.pointerType==='pen';layout();
},{capture:true});

function select(button){
  menu.querySelectorAll('.verdict-row').forEach(row=>row.classList.toggle('selected',row===button));
}
for(const row of menu.querySelectorAll('.verdict-row')){
  row.addEventListener('pointerenter',()=>{if(!touch)select(row);});
  row.addEventListener('focus',()=>select(row));
}
const isMenu=()=>!menu.classList.contains('hidden');
const modalOpen=()=>!$('modal').classList.contains('hidden');
const shell={game:{audio,controls:{get touchMode(){return touch;}}},
  modal(html){lastFocus=document.activeElement;$('modal-content').innerHTML=html;$('modal').classList.remove('hidden');menu.inert=true;$('modal-content').querySelector('button')?.focus();},
  closeModal(){$('modal').classList.add('hidden');menu.inert=false;lastFocus?.focus();},
};
function setState(state,message=''){
  menu.dataset.state=state;menu.setAttribute('aria-busy',state==='loading'?'true':'false');status.textContent=message;
}

/** One shared promise prevents duplicate renderers when loading overlaps a click. */
export function loadGame(){
  if(gamePromise)return gamePromise;
  metrics.runtimeStarted=performance.now();
  gamePromise=Promise.all([import('./game.js'),import('./touch.js')]).then(([{Game},{TouchControls}])=>{
    const game=new Game($('world'),{audio});
    game.version=document.querySelector('meta[name="game-view"]').content;
    // Attach controls before the animation frame loop runs.
    const modalWasOpen=modalOpen();game.init();game.controls=new TouchControls(game);window.__game=game;if(modalWasOpen){$('modal').classList.remove('hidden');menu.inert=true;game.ui.lastFocus=lastFocus;}
    metrics.runtimeReady=performance.now();document.dispatchEvent(new CustomEvent('cinder:ready'));
    return game;
  }).catch(error=>{gamePromise=null;throw error;});
  return gamePromise;
}
async function openClasses(){
  if(pending)return;
  const token=++requestId;pending=true;setState('loading','正在准备职业档案…');
  const displayReady=touch&&!document.fullscreenElement?mobileFullscreen():null;
  // AudioContext must start during the gesture, before asynchronous module loading.
  audio.init();
  try{if(displayReady)await displayReady;const game=await loadGame();if(token===requestId&&pending&&!modalOpen()){game.openClassSelection();setState('ready');}}
  catch(error){if(token!==requestId)return;console.error('职业档案载入失败',error);setState('error','载入未完成，请检查网络后重试。');const retry=document.createElement('button');retry.textContent='重新载入';retry.onclick=()=>{try{sessionStorage.setItem('cinder-retry-classes','1');}catch{}location.reload();};status.append(retry);}
  finally{if(token===requestId)pending=false;}
}
function toggleAudio(){
  audio.init();audio.toggle();$('audio-toggle').textContent='声音 '+(audio.enabled?'ON':'OFF');
  $('audio-toggle').setAttribute('aria-pressed',String(audio.enabled));
}
async function mobileFullscreen(){
  try{
    if(!document.fullscreenElement){if(!document.documentElement.requestFullscreen)throw new Error('fullscreen unavailable');await document.documentElement.requestFullscreen({navigationUI:'hide'});}
    try{await screen.orientation?.lock?.('landscape');$('rotate-status').textContent='已请求横屏与全屏。';}
    catch{$('rotate-status').textContent='浏览器已进入全屏，请横向旋转设备；也可以选择当前方向继续。';}
    return true;
  }catch{
    $('rotate-status').textContent='浏览器未允许自动全屏或锁定方向，请手动横屏，或选择当前方向继续。';
    return false;
  }
}
function fullscreen(){
  if(document.fullscreenElement){screen.orientation?.unlock?.();document.exitFullscreen?.().catch(()=>{status.textContent='请使用浏览器菜单退出全屏。';});return;}
  if(touch){mobileFullscreen();return;}
  document.documentElement.requestFullscreen?.().catch(()=>{status.textContent='请通过浏览器菜单开启全屏。';});
}
window.__cinderMobileDisplay={enter:mobileFullscreen};
$('rotate-fullscreen').addEventListener('click',mobileFullscreen);
$('rotate-continue').addEventListener('click',()=>{window.__cinderPortraitContinue=true;layout();});
const actions={'start-btn':openClasses,'menu-classes':openClasses,'menu-settings':()=>settings(window.__game?.ui||shell),'menu-quick-settings':()=>settings(window.__game?.ui||shell),'guide-btn':()=>guide(window.__game?.ui||shell),'audio-toggle':toggleAudio,'menu-fullscreen':fullscreen};
// Keep one menu handler before and after hydration; prevent the old UI handler from repeating the action.
addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target.closest('#menu button'):null;
  if(!target||!isMenu()||!actions[target.id])return;
  event.preventDefault();event.stopImmediatePropagation();if(target.classList.contains('verdict-row'))select(target);
  if(pending&&!['start-btn','menu-classes','audio-toggle'].includes(target.id)){requestId++;pending=false;setState('idle');}actions[target.id]();
},{capture:true});
addEventListener('keydown',event=>{
  if(!isMenu())return;
  if(modalOpen()){
    if($('modal-content').querySelector('.settings-panel'))return;
    if(event.code==='Tab'){const buttons=[...$('modal-content').querySelectorAll('button,a[href],input,[tabindex="0"]')].filter(el=>el.getClientRects().length);const first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}event.stopImmediatePropagation();return;}
    if(event.code==='Escape'){event.preventDefault();event.stopImmediatePropagation();(window.__game?.ui||shell).closeModal();}
    return;
  }
  if(event.code==='Tab'){event.stopImmediatePropagation();return;}
  const rows=[...menu.querySelectorAll('.verdict-row')].filter(row=>row.getClientRects().length);
  if(['ArrowUp','ArrowDown','Home','End'].includes(event.code)){
    event.preventDefault();event.stopImmediatePropagation();const i=Math.max(0,rows.indexOf(document.activeElement));
    const next=event.code==='Home'?0:event.code==='End'?rows.length-1:(i+(event.code==='ArrowUp'?-1:1)+rows.length)%rows.length;
    rows[next]?.focus();return;
  }
  if(event.code==='Escape'&&pending){event.preventDefault();event.stopImmediatePropagation();requestId++;pending=false;setState('idle');return;}
  if(event.code==='Enter'||(event.code==='Space'&&document.activeElement?.closest('#menu button'))){
    event.preventDefault();event.stopImmediatePropagation();if(event.repeat)return;
    const button=document.activeElement?.closest('#menu button');(button||$('start-btn')).click();
  }
},{capture:true});

// Start the independent hall after the menu has painted. Battle code stays deferred.
menu.dataset.background='procedural';
menu.dataset.scene='loading';
document.addEventListener('cinder:menu-scene',()=>{if(metrics.backgroundReady===null)metrics.backgroundReady=performance.now();});
requestAnimationFrame(()=>requestAnimationFrame(()=>{
  import('./menu-scene.js').then(({createMenuScene})=>{
    window.__cinderMenuScene=createMenuScene($('menu-scene'),menu);
  }).catch(error=>{console.warn('档案厅暂不可用，菜单仍可操作。',error);menu.dataset.scene='unavailable';});
}));

function atmosphericState(){
  const active=isMenu()&&!document.hidden&&!document.body.classList.contains('orientation-blocked');
  menu.classList.toggle('motion-paused',!active);
}
new MutationObserver(atmosphericState).observe(menu,{attributes:true,attributeFilter:['class']});
new MutationObserver(atmosphericState).observe(document.body,{attributes:true,attributeFilter:['class']});
document.addEventListener('visibilitychange',atmosphericState);atmosphericState();

function applyShellSettings(){const s=getSettings();document.body.classList.toggle('reduce-motion',s.accessibility.reduceMotion||motion.matches);$('audio-toggle').textContent='声音 '+(audio.enabled?'ON':'OFF');$('audio-toggle').setAttribute('aria-pressed',String(audio.enabled));}
subscribeSettings(applyShellSettings);motion.addEventListener('change',applyShellSettings);applyShellSettings();
window.__cinderBoot={loadGame,metrics,get state(){return menu.dataset.state;},get deferred(){return !window.__game;}};
metrics.interactive=performance.now();performance.mark('cinder-menu-interactive');
try{if(sessionStorage.getItem('cinder-retry-classes')){sessionStorage.removeItem('cinder-retry-classes');openClasses();}}catch{}
