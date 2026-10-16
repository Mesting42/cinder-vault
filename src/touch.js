import {talentFor} from './expansion-data.js';
import {classById,ACTIVES} from './data.js';
import {hudIcon as icon} from './hud-icons.js';

const labels={roll:'翻滚',skill:'职业技能',device:'装置',interact:'交互',reload:'换弹',switch:'切武器',blank:'空包弹',build:'装备详情'};

/** Pointer IDs are independent, so moving, aiming and a third action can overlap. */
export class TouchControls {
  constructor(game){
    this.game=game;this.pointers=new Map();this.move={x:0,y:0};this.aim={x:0,y:-1};this.aimHeld=false;this.lastState=game.state;
    this.touchMode=matchMedia('(pointer:coarse)').matches||(navigator.maxTouchPoints>0&&matchMedia('(hover:none)').matches);
    this.root=document.createElement('div');this.root.id='touch-controls';this.root.className='hidden';this.root.setAttribute('aria-label','触屏战斗操作');
    this.root.innerHTML=`<div class="touch-tools">${this.button('build')}</div><div class="stick move-stick" data-stick="move" aria-label="左摇杆：移动"><div class="stick-lines"></div><div class="stick-thumb"></div><span>移动</span></div><div class="stick aim-stick" data-stick="aim" aria-label="右摇杆：瞄准并攻击"><div class="stick-lines"></div><div class="stick-thumb"></div><span>瞄准 / 攻击</span></div><div class="touch-actions">${['roll','skill','device','interact'].map(a=>this.button(a)).join('')}</div><div class="touch-utilities">${['reload','switch','blank'].map(a=>this.button(a)).join('')}</div>`;
    document.getElementById('app').append(this.root);
    this.rotate=document.getElementById('rotate-screen');
    if(!this.rotate){this.rotate=document.createElement('section');this.rotate.id='rotate-screen';this.rotate.className='hidden';this.rotate.setAttribute('aria-label','横屏游玩设置');this.rotate.innerHTML='<div class="rotate-phone" aria-hidden="true"><i>✣</i></div><div class="eyebrow">BELOW THE OATH / 横屏行动</div><h2>横屏，进入地牢</h2><p>横向握持手机，获得完整视野与双摇杆操作。<br>点按下方按钮以开启全屏并锁定横屏。</p><div class="rotate-actions"><button class="primary" id="rotate-fullscreen">横屏并全屏开始</button><button class="text-btn" id="rotate-continue">仍以当前方向继续</button></div><small id="rotate-status" role="status" aria-live="polite">支持时会自动切换横屏；你也可以手动旋转设备。</small>';document.getElementById('app').append(this.rotate);}
    this.buttons=Object.fromEntries([...this.root.querySelectorAll('[data-action]')].map(b=>[b.dataset.action,b]));
    this.pads=Object.fromEntries([...this.root.querySelectorAll('[data-stick]')].map(p=>[p.dataset.stick,p]));
    for(const pad of Object.values(this.pads)){
      pad.addEventListener('pointerdown',e=>this.startStick(e,pad));
      pad.addEventListener('pointermove',e=>this.moveStick(e));
      for(const name of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(name,e=>this.endStick(e.pointerId));
    }
    for(const b of Object.values(this.buttons)){
      b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(e.pointerType==='touch'||e.pointerType==='pen')this.setMode(true);this.action(b.dataset.action);});
      b.addEventListener('click',e=>{if(e.detail===0)this.action(b.dataset.action);});
    }
    addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.pointerType==='pen')this.setMode(true);else if(e.pointerType==='mouse')this.setMode(false);},{capture:true});
    addEventListener('keydown',()=>this.setMode(false),{capture:true});
    addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&e.isTrusted)this.setMode(false);});
    addEventListener('resize',()=>this.layout());
    addEventListener('blur',()=>this.reset());
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.reset();game.input.keys.clear();if(game.state==='playing')game.ui.pause();}});
    game.canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;e.preventDefault();game.audio.init();if(game.state==='intro'&&game.intro.elapsed>.45)game.finishEntrance();},{passive:false});
    const mini=document.getElementById('minimap-wrap');mini.setAttribute('role','button');mini.setAttribute('tabindex','0');mini.setAttribute('aria-label','打开探索地图');mini.onclick=()=>game.ui.toggleMap();mini.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();game.ui.toggleMap();}};
    this.layout();
  }
  button(action){return `<button class="touch-button touch-${action}" data-action="${action}" aria-label="${labels[action]}" title="${labels[action]}">${icon(action)}<span>${labels[action]}</span><small></small></button>`;}
  setMode(touch){if(this.touchMode===touch)return;this.reset();this.touchMode=touch;this.game.input.keys.clear();this.layout();this.game.ui.cache={};if(this.game.player)this.game.ui.update();document.dispatchEvent(new Event('cinder:input-mode'));}
  layout(){
    this.reset();const w=innerWidth,h=innerHeight;if(w>=h)window.__cinderPortraitContinue=false;this.allowPortrait=!!window.__cinderPortraitContinue;this.orientationBlocked=this.touchMode&&h>w&&!this.allowPortrait;
    document.body.classList.toggle('touch-input',this.touchMode);document.body.classList.toggle('compact-touch',this.touchMode&&h<=540);document.body.classList.toggle('orientation-blocked',this.orientationBlocked);
    this.rotate.classList.toggle('hidden',!this.orientationBlocked);this.root.classList.toggle('hidden',!this.touchMode||this.orientationBlocked||this.game.state!=='playing');
    this.game.applySettings();
    if(this.game.player&&['playing','paused','map','boss-intro'].includes(this.game.state))this.game.setCameraSize();
    this.layoutSettings();
  }
  layoutSettings(){
    if(this.root.classList.contains('hidden'))return;
    const s=this.game.settings.controls,base=innerHeight<=540?124:150,gap=innerHeight<=540?10:17;
    const tools=this.root.querySelector('.touch-utilities'),actions=this.root.querySelector('.touch-actions');
    for(const [kind,side]of [['move','left'],['aim','right']]){
      const pad=this.pads[kind];pad.style.width=pad.style.height=base*s[side+'StickSize']/100+'px';
      pad.style[side]=`calc(var(--safe-${side}) + ${s[side+'StickInset']}px)`;
    }
    const placeActions=()=>{const aim=this.pads.aim.getBoundingClientRect();actions.style.right=(innerWidth-aim.left+gap)+'px';};
    placeActions();tools.classList.add('utilities-column');
    let move=this.pads.move.getBoundingClientRect(),action=actions.getBoundingClientRect();
    const required=tools.getBoundingClientRect().width+20,missing=required-(action.left-move.right);
    if(missing>0){
      // Notched phones may have less usable width. Reduce insets before size so
      // no interactive target overlaps another, without rewriting saved choices.
      const sum=s.leftStickInset+s.rightStickInset,retain=sum?Math.max(0,1-missing/sum):0;
      this.pads.move.style.left=`calc(var(--safe-left) + ${s.leftStickInset*retain}px)`;
      this.pads.aim.style.right=`calc(var(--safe-right) + ${s.rightStickInset*retain}px)`;
      placeActions();move=this.pads.move.getBoundingClientRect();action=actions.getBoundingClientRect();
      const remaining=required-(action.left-move.right);
      if(remaining>0){for(const pad of Object.values(this.pads)){const size=pad.getBoundingClientRect().width;pad.style.width=pad.style.height=Math.max(90,size-remaining/2)+'px';}placeActions();}
    }
    move=this.pads.move.getBoundingClientRect();action=actions.getBoundingClientRect();
    tools.classList.remove('utilities-column');const horizontal=tools.getBoundingClientRect().width;
    const column=action.left-move.right<horizontal+20;tools.classList.toggle('utilities-column',column);
    tools.style.left=(action.left+move.right)/2+'px';
  }
  startStick(e,pad){
    e.preventDefault();e.stopPropagation();if(e.pointerType==='touch'||e.pointerType==='pen')this.setMode(true);
    if(this.game.state!=='playing'||this.orientationBlocked)return;
    const kind=pad.dataset.stick;if([...this.pointers.values()].some(p=>p.kind===kind))return;
    this.game.audio.init();const b=pad.getBoundingClientRect();this.pointers.set(e.pointerId,{kind,pad,cx:b.x+b.width/2,cy:b.y+b.height/2,radius:b.width*.33});pad.setPointerCapture(e.pointerId);pad.classList.add('held');this.moveStick(e);
  }
  moveStick(e){
    const p=this.pointers.get(e.pointerId);if(!p)return;e.preventDefault();const dx=e.clientX-p.cx,dy=e.clientY-p.cy,length=Math.hypot(dx,dy),strength=Math.min(1,length/p.radius*(this.game.settings?.controls.stickSensitivity||1)),dead=.16;
    const scale=strength<=dead?0:(strength-dead)/(1-dead),x=length?dx/length*scale:0,y=length?dy/length*scale:0;
    p.pad.querySelector('.stick-thumb').style.transform=`translate(${length?dx/length*Math.min(length,p.radius):0}px,${length?dy/length*Math.min(length,p.radius):0}px)`;
    if(p.kind==='move')this.move={x,y};else{this.aimHeld=scale>0;if(this.aimHeld)this.aim={x:dx/length,y:dy/length};this.game.input.down=this.aimHeld;}
  }
  endStick(id){const p=this.pointers.get(id);if(!p)return;this.pointers.delete(id);p.pad.classList.remove('held');p.pad.querySelector('.stick-thumb').style.transform='translate(0px,0px)';if(p.kind==='move')this.move={x:0,y:0};else{this.aimHeld=false;this.game.input.down=false;}if(p.pad.hasPointerCapture(id))p.pad.releasePointerCapture(id);}
  reset(){for(const id of [...this.pointers.keys()])this.endStick(id);this.move={x:0,y:0};this.aimHeld=false;this.game.input.down=false;}
  action(action){
    const g=this.game;if(g.state!=='playing'||this.orientationBlocked)return;g.audio.init();
    if(action==='build'){this.reset();g.ui.build();return;}
    if(action==='switch')g.switchWeapon((g.player.weaponIndex+1)%g.player.weapons.length);
    else g[{device:'active',interact:'interact',blank:'blank',reload:'reload',roll:'roll',skill:'skill'}[action]]();
    const b=this.buttons[action];b.classList.add('pressed');setTimeout(()=>b.classList.remove('pressed'),130);
  }
  update(){
    const g=this.game;if(this.lastState!==g.state){this.reset();this.lastState=g.state;this.root.classList.toggle('hidden',!this.touchMode||this.orientationBlocked||g.state!=='playing');this.layoutSettings();}
    if(!this.touchMode||g.state!=='playing'||this.orientationBlocked)return;
    g.input.down=this.aimHeld;
    if(g.time-(this.lastUI||0)<.1)return;this.lastUI=g.time;const p=g.player,c=classById(p.classId),a=ACTIVES.find(a=>a.id===p.active),w=g.weapon(),nearby=g.closestInteraction();
    this.root.style.setProperty('--touch-accent',c.color);
    this.setIcon('skill',p.classId);this.setIcon('device',p.active);this.setIcon('reload',w.classOnly==='mage'?'mana':'reload');
    this.status('roll',p.rollCd,.9,'翻滚');this.status('skill',p.skillCd,c.skillCd*(g.has('duskClock')?.75:1),talentFor(p)?talentFor(p).name+' '+['','I','II'][p.skillTier]:c.skill);this.status('device',p.activeCd,a.cd,a.name);
    this.buttons.interact.disabled=!nearby;this.buttons.interact.classList.toggle('ready',!!nearby);
    this.buttons.interact.querySelector('span').textContent=nearby?({chest:'开箱',table:'翻桌',offer:'购买',npc:'交谈',shrine:'赐福',exit:'下层',sarcophagus:'石棺',ascension:'强化'}[nearby.type]||'拾取'):'交互';
    this.buttons.interact.setAttribute('aria-label',nearby?g.interactionText(nearby):'交互，附近没有可交互对象');
    this.buttons.reload.disabled=w.kind==='melee'||p.reload>0||p.ammo[w.id]>=g.magSize(w);this.buttons.reload.querySelector('span').textContent=w.classOnly==='mage'?'聚能':'换弹';
    this.buttons.reload.setAttribute('aria-label',w.kind==='melee'?'近战武器无需换弹':w.classOnly==='mage'?'凝聚法力':'换弹');
    this.buttons.reload.querySelector('small').textContent=p.reload>0?Math.ceil(p.reload)+'s':'';
    this.buttons.reload.style.setProperty('--cooldown',p.reload>0?p.reload/p.reloadTotal*100+'%':'0%');
    this.buttons.switch.disabled=p.weapons.length<2;this.buttons.switch.querySelector('small').textContent=`${p.weaponIndex+1}/${p.weapons.length}`;
    this.buttons.switch.setAttribute('aria-label',`切换武器，当前 ${p.weaponIndex+1} / ${p.weapons.length}`);
    this.buttons.blank.disabled=p.blanks<=0;this.buttons.blank.querySelector('small').textContent=p.blanks;
    this.buttons.blank.setAttribute('aria-label',`空包弹，剩余 ${p.blanks}`);
  }
  setIcon(action,name){const b=this.buttons[action];if(b.dataset.icon===name)return;b.querySelector('svg').outerHTML=icon(name);b.dataset.icon=name;}
  status(action,cd,total,name){const b=this.buttons[action];b.disabled=cd>0;b.style.setProperty('--cooldown',`${Math.min(100,cd/(total||1)*100)}%`);b.querySelector('small').textContent=cd>0?`${Math.ceil(cd)}s`:'';b.setAttribute('aria-label',`${name}${cd>0?'，冷却 '+cd.toFixed(1)+' 秒':'，就绪'}`);b.title=name;}
}
