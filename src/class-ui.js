import {CLASSES,classById,weaponById} from './data.js';
import {CHARACTER_LINES} from './character-lines.js';
const $=id=>document.getElementById(id);
const icons={shooter:'M13 12h38v12H36v17h-9V24H13zm38 3h8v6h-8zM17 28h7v11h-7z',mage:'M32 3 42 16 32 30 22 16zm-3 29h6v27h-6zM13 13h5v8h-5zm33 0h5v8h-5zM10 35h7v3h-7zm38 0h7v3h-7z',warrior:'M32 3 39 13 36 37h10v6H18v-6h10l-3-24zm-3 42h6v12h-6zM9 21l12-3v23L9 49 3 37V25z'};
export const ClassUI={
  initClasses(){
    this.classTouchLine=document.createElement('p');this.classTouchLine.className='class-touch-line class-voice-line';this.classTouchLine.setAttribute('aria-live','polite');$('class-screen').querySelector('.class-footer').prepend(this.classTouchLine);
    $('class-options').innerHTML=CLASSES.map((c,i)=>`<button class="class-option" data-class="${c.id}" aria-pressed="false" style="--class-color:${c.color}"><span class="class-number">0${i+1}</span><svg viewBox="0 0 64 64" aria-hidden="true"><path d="${icons[c.id]}"/></svg><span class="class-option-copy"><small><span class="class-role">${c.role}</span><span class="class-english"> / ${c.en}</span></small><b>${c.name}</b><em>${c.tag}</em></span><span class="class-check">◇</span></button>`).join('');
    for(const button of $('class-options').children)button.onclick=()=>this.game.previewClass(button.dataset.class);
    $('class-back').onclick=()=>this.game.menu();$('class-confirm').onclick=()=>this.game.newGame(undefined,this.game.selectedClass);
  },
  selectClass(id){
    const c=classById(id),w=weaponById(c.weapon),index=CLASSES.indexOf(c);$('class-screen').style.setProperty('--class-color',c.color);
    for(const button of $('class-options').children){const selected=button.dataset.class===c.id;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));button.querySelector('.class-check').textContent=selected?'◆':'◇';}
    $('class-preview-number').textContent=['I','II','III'][index];$('class-preview-name').textContent=c.name;$('class-preview-en').textContent=c.en;
    const lines=CHARACTER_LINES[c.id];this.classLineIndex??={};const line=lines[(this.classLineIndex[c.id]||0)%lines.length];this.classLineIndex[c.id]=(this.classLineIndex[c.id]||0)+1;this.currentClassLine=line;
    const caption=$('class-screen').querySelector('.class-model-caption p');caption.textContent='“'+line.text+'”';caption.classList.add('class-voice-line');caption.setAttribute('aria-live','polite');this.classTouchLine.textContent=caption.textContent;
    $('class-confirm').innerHTML=`以${c.name}深入 <span>ENTER ↘</span>`;
    const attack=c.id==='warrior'?'挥斩 · 无需弹药':c.id==='mage'?'双霜晶 · 凝聚法力':'六发左轮 · 无限备弹';
    $('class-details').innerHTML=`<div class="eyebrow">COMBAT DOSSIER / ${c.role}</div><h3>${c.tag.replace(' · ','<br>')}</h3><p class="class-description">${c.desc}</p><div class="class-statline"><span><b>${c.hp}</b>初始生命</span><span><b>${c.shield}</b>初始护盾</span><span><b>${c.skillCd}s</b>技能冷却</span></div><div class="class-loadout"><small>起始武器 / 左键</small><h4>${w.name}</h4><p>${attack} · ${w.damage} 伤害${c.id==='warrior'?' · 第三斩强化':' / '+w.mag+' '+(c.id==='mage'?'法力':'弹匣')}</p></div><div class="class-skill"><small><kbd>Q</kbd>专属技能</small><h4>${c.skill}</h4><p>${c.skillDesc}</p></div><div class="class-passive"><small>固有被动 · ${c.passive}</small><p>${c.passiveDesc}</p></div><div class="class-shared">宝箱、商店与铸枪师提供当前职业武器。<br><kbd>C</kbd>独立装置槽 · 开局携带驱弹脉冲</div>`;
  }
};
