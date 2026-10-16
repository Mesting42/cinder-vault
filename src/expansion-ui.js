import {TALENTS,talentFor} from './expansion-data.js';
import './expansion.css';
export const ExpansionUI={
  talents(altar){
    const p=this.game.player,choices=TALENTS[p.classId];if(altar.used)return;
    this.modal(`<section class="talent-panel" aria-labelledby="talent-title"><h2 id="talent-title">为技能刻下新的誓言。</h2><p>第 ${altar.rewardFloor} 次技能强化。${p.skillBranch?'再次选择当前分支可升至 II 阶；转向其他分支则获得该分支 I 阶。':'选择一条职业分支。本局继续深入时保留，第二位 Boss 后可再次强化。'}</p><div class="talent-choices">${choices.map((t,i)=>{const tier=p.skillBranch===t.id?Math.min(2,p.skillTier+1):1;return`<button class="talent-choice" data-talent="${t.id}"><span class="talent-copy"><strong>${t.name}<small>${p.skillBranch===t.id?'升级至 II 阶':'获得 I 阶'}</small></strong><span>${t.desc[tier-1]}</span></span><svg class="talent-arrow" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 18 18 6M6 6h12v12"/></svg></button>`;}).join('')}</div><p class="talent-note">选择后立即重置技能冷却。每个祭坛只能选择一次。</p><button class="text-btn" id="talent-later">稍后选择 · 保留祭坛奖励</button></section>`);
    const root=document.getElementById('modal-content');root.querySelectorAll('[data-talent]').forEach(button=>button.onclick=()=>this.game.chooseTalent(altar,button.dataset.talent));root.querySelector('#talent-later').onclick=()=>this.closeModal();
    // The touch that opened the altar can emit a compatibility click over a newly
    // revealed choice. Accept pointer clicks only after a press on that choice;
    // keyboard activation keeps its normal zero-detail click behavior.
    const panel=root.querySelector('.talent-panel'),pressed=new WeakSet();
    panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
    panel.addEventListener('pointerdown',e=>{const button=e.target.closest('button');if(button)pressed.add(button);});
    panel.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if((e.detail>0||e.sourceCapabilities?.firesTouchEvents)&&!pressed.has(button)){e.preventDefault();e.stopImmediatePropagation();}pressed.delete(button);},true);
    root.querySelector('.talent-panel').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const buttons=[...root.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
  }
};
