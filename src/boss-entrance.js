import './boss-entrance.css';
const marks={guardian:'M17 43h30L42 33V22a10 10 0 0 0-20 0v11zm11 5a4 4 0 0 0 8 0M32 6v7M9 24l6 3M55 24l-6 3',bishop:'M29 8h6v13h13v6H35v29h-6V27H16v-6h13zm-9 31-7 7m31-7 7 7',eclipse:'M32 17a15 15 0 1 0 0 30 15 15 0 0 0 0-30M32 4v8m0 40v8M4 32h8m40 0h8M12 12l6 6m28 28 6 6M52 12l-6 6M18 46l-6 6'};
export const BossEntrance={
  beginBossEntrance(){
    if(!this.boss||this.boss.dead||this.room.bossEntranceShown)return;
    this.room.bossEntranceShown=true;this.bossEntrance={elapsed:0,duration:1.8,roomId:this.room.id};this.state='boss-intro';document.body.classList.add('boss-introduction');this.input.down=false;this.input.keys.clear();this.controls?.reset();this.player.invul=Math.max(this.player.invul,.4);
    let panel=document.getElementById('boss-warning');if(!panel){panel=document.createElement('div');panel.id='boss-warning';panel.setAttribute('role','alert');panel.setAttribute('aria-live','assertive');document.body.append(panel);}
    const profile=this.boss.profile;panel.dataset.boss=profile.id;panel.style.setProperty('--warning-color','#'+profile.color.toString(16).padStart(6,'0'));panel.style.setProperty('--warning-progress','0%');panel.innerHTML=`<div class="boss-warning-band"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="${marks[profile.id]}"/></svg><div><span>守关者苏醒</span><strong>${profile.name}</strong><p>${({guardian:'断誓之钟已鸣',bishop:'墓钟圣咏将至',eclipse:'黑日终审降临'})[profile.id]}</p></div></div>`;panel.classList.remove('hidden');panel.classList.toggle('warning-reduced',this.reducedMotion);document.getElementById('room-banner').style.opacity='0';this.ui.show('interaction',false);this.audio.playBossWarning(profile.id);
  },
  updateBossEntrance(dt){
    const entrance=this.bossEntrance;if(!entrance||this.room?.id!==entrance.roomId){this.clearBossEntrance();return;}
    entrance.elapsed+=dt;document.getElementById('boss-warning')?.style.setProperty('--warning-progress',Math.min(100,entrance.elapsed/entrance.duration*100)+'%');
    if(entrance.elapsed>=entrance.duration){this.clearBossEntrance();this.state='playing';this.input.keys.clear();this.input.down=false;this.controls?.reset();this.player.invul=Math.max(this.player.invul,.4);this.ui.update();}
  },
  clearBossEntrance(){this.bossEntrance=null;document.body.classList.remove('boss-introduction');document.getElementById('boss-warning')?.classList.add('hidden');if(this.state==='boss-intro')this.state='playing';}
};
