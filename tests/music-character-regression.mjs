import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {MUSIC_TRACKS} from '../src/music-assets.js';
import {CHARACTER_LINES} from '../src/character-lines.js';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks=[],errors=[],evidence={tracks:{},voices:{},devices:{}},base=process.env.GAME_URL||'http://127.0.0.1:5188';
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
await mkdir('test-artifacts',{recursive:true});
try{
 for(const [device,viewport,touch] of [['desktop',{width:1440,height:900},false],['phone',{width:844,height:390},true]]){
  const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,deviceScaleFactor:1}),page=await context.newPage(),audioRequests=[];
  const activate=selector=>touch?page.locator(selector==='#menu-settings'?'#menu-quick-settings':selector).tap():page.click(selector);
  page.on('pageerror',e=>errors.push(`${device}: ${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`${device}: ${m.text()}`);});page.on('request',r=>{if(r.url().includes('/audio/'))audioRequests.push(r.url());});
  await page.goto(base);await page.waitForTimeout(600);check(`${device} menu fetches no music or speech before a user gesture`,audioRequests.length===0);
  await activate('#start-btn');await page.waitForFunction(()=>window.__game?.state==='select'&&window.__game.audio.track?.mode==='menu'&&window.__game.audio.voiceSource);
  check(`${device} first gesture starts the menu score and selected character speech`,await page.evaluate(()=>{const a=window.__game.audio;return a.ctx.state==='running'&&a.track.source.loop&&a.track.source.loopEnd>a.track.source.loopStart&&!a.musicError&&!a.voiceError;}));
  if(device==='desktop'){
   for(const [id,track] of Object.entries(MUSIC_TRACKS)){
    const metrics=await page.evaluate(async({id,track})=>{const a=window.__game.audio,b=await a.decode(track.url);let sum=0,peak=0,signature=0;const data=b.getChannelData(0);for(let i=0;i<data.length;i++){sum+=data[i]**2;peak=Math.max(peak,Math.abs(data[i]));if(i%4093===0)signature+=data[i]*(i%61+1);}return{duration:b.duration,channels:b.numberOfChannels,sampleRate:b.sampleRate,rms:Math.sqrt(sum/data.length),peak,signature,title:track.title};},{id,track});
    evidence.tracks[id]=metrics;check(`${id} licensed score decodes to a non-silent stereo loop`,metrics.channels===2&&Math.abs(metrics.duration-track.duration)<.3&&metrics.rms>.05&&metrics.peak<1);
   }
   check('all seven licensed themes contain distinct actual PCM audio',new Set(Object.values(evidence.tracks).map(t=>t.signature.toFixed(5))).size===7);
   for(const [id,lines] of Object.entries(CHARACTER_LINES))for(const [i,line] of lines.entries()){
    const m=await page.evaluate(async line=>{const b=await window.__game.audio.decode(line.audio),d=b.getChannelData(0);let energy=0;for(const v of d)energy+=v*v;return{duration:b.duration,rms:Math.sqrt(energy/d.length),text:line.text};},line);evidence.voices[`${id}-${i+1}`]=m;check(`${id} line ${i+1} decodes to intelligible-length non-silent speech`,m.duration>2&&m.duration<12&&m.rms>.005);
   }
   const preview=await page.evaluate(async track=>{const b=await window.__game.audio.decode(track.url),rate=22050,n=rate*16,data=new Uint8Array(44+n*2),view=new DataView(data.buffer);const str=(offset,text)=>[...text].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));str(0,'RIFF');view.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,n*2,true);const l=b.getChannelData(0),r=b.getChannelData(1);for(let i=0;i<n;i++){const t=Math.floor(i*b.sampleRate/rate);view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,(l[t]+r[t])/2))*32767),true);}let binary='';for(let i=0;i<data.length;i+=32768)binary+=String.fromCharCode(...data.subarray(i,i+32768));return btoa(binary);},MUSIC_TRACKS.floor1);
   await writeFile('test-artifacts/music-floor1-preview.wav',Buffer.from(preview,'base64'));
  }
  for(const id of ['shooter','mage','warrior']){
   await activate(`[data-class="${id}"]`);await page.waitForFunction(id=>window.__game.audio.voiceLine&&window.__game.audio.duck.gain.value<.5&&window.__game.selectedClass===id,id);
   check(`${device} ${id} subtitle matches the actual speaking line`,await page.evaluate(()=>{const g=window.__game;return (Array.from(document.querySelectorAll('.class-voice-line')).find(el=>el.getClientRects().length)).textContent.includes(g.audio.voiceLine)&&g.audio.duck.gain.value<.5;}));
  }
  await activate('[data-class="mage"]');await page.waitForTimeout(220);
  evidence.devices[device]=await page.evaluate(()=>{const g=window.__game;return{gender:g.hero.userData.gender,model:g.hero.name,caption:(Array.from(document.querySelectorAll('.class-voice-line')).find(el=>el.getClientRects().length)).textContent,voiceCount:g.audio.voiceCache.size};});
  check(`${device} mage is the female model with visible long dark hair and purple robes`,await page.evaluate(()=>{const g=window.__game,colors=[];g.hero.traverse(o=>{if(o.geometry?.attributes.color)colors.push(...o.geometry.attributes.color.array);});const hair=g.hero.userData.head.children.find(o=>o.name==='sorceress-long-dark-hair');return g.hero.userData.gender==='female'&&g.hero.name==='frost-lantern-sorceress'&&!!hair&&document.querySelector('[data-class="mage"]').style.getPropertyValue('--class-color')==='#c29afa'&&colors.length>100;}));
  await page.screenshot({path:`test-artifacts/female-mage-selection-${device}.png`});
  // Rapid selection must cancel pending speech, not play all queued clips.
  await page.evaluate(()=>{const g=window.__game;for(const id of ['shooter','mage','warrior','mage'])g.previewClass(id);});
  await page.waitForFunction(()=>window.__game.audio.voiceLine?.includes('霜')&&window.__game.selectedClass==='mage');check(`${device} rapid switching leaves only the final character speaking`,await page.evaluate(()=>window.__game.audio.voiceSource?.buffer&&window.__game.audio.voiceLine===window.__game.ui.currentClassLine.text));
  await activate('#class-back');await page.waitForTimeout(50);check(`${device} returning to menu stops speech and restores the music bus`,await page.evaluate(()=>{const a=window.__game.audio;return !a.voiceSource&&!a.voiceLine;}));
  await activate('#start-btn');await activate('#class-confirm');await page.waitForFunction(()=>window.__game.audio.track?.mode==='floor1');
  check(`${device} entering the dungeon stops selection speech`,await page.evaluate(()=>!window.__game.audio.voiceSource&&!window.__game.audio.voiceLine));
  for(const [floor,theme,boss] of [[1,'floor1','guardian'],[2,'floor2','boss'],[3,'eclipse','eclipseBoss']]){
   await page.evaluate(floor=>{const g=window.__game;g.loadFloor(floor);g.state='paused';},floor);await page.waitForFunction(mode=>window.__game.audio.track?.mode===mode,theme);
   check(`${device} floor ${floor} selects its exploration theme`,await page.evaluate(mode=>window.__game.audio.mode===mode,theme));
   await page.evaluate(()=>{const g=window.__game;g.enterRoom(g.dungeon.rooms.find(r=>r.type==='boss').id);g.state='paused';});await page.waitForFunction(mode=>window.__game.audio.track?.mode===mode,boss);
   check(`${device} floor ${floor} Boss room plays its independent battle theme`,await page.evaluate(mode=>window.__game.audio.mode===mode,boss));
   await page.evaluate(()=>{const g=window.__game;g.enterRoom(0);g.state='paused';});await page.waitForFunction(mode=>window.__game.audio.track?.mode===mode,theme);
  }
  await page.waitForTimeout(1250);check(`${device} completed crossfades release outgoing sources and bound decoded memory`,await page.evaluate(()=>{const a=window.__game.audio;return a.musicCache.size<=2&&a.retiringTracks.size===0&&a.track.gain.gain.value>.99;}));
  await page.evaluate(()=>window.__game.menu());await activate('#menu-settings');
  await page.locator('[data-key="voices"]').evaluate(el=>{el.value=31;el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('[data-key="music"]').evaluate(el=>{el.value=27;el.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForTimeout(220);
  await activate('#settings-close');await activate('#start-btn');await page.waitForFunction(()=>window.__game.audio.voiceSource&&Math.abs(window.__game.audio.voices.gain.value-1.2*.31)<.005);
  check(`${device} music and voice volumes independently control real audio gains`,await page.evaluate(()=>{const a=window.__game.audio;return Math.abs(a.voices.gain.value-1.2*.31)<.005&&Math.abs(a.music.gain.value-.65*.27)<.005&&Math.abs(a.fx.gain.value-.5)<.005;}));
  await activate('#class-back');await activate('#menu-settings');await activate('[data-key="voiceLines"]');await activate('#settings-close');await activate('#start-btn');await page.waitForTimeout(350);
  check(`${device} disabling voice keeps the selected subtitle and suppresses speech`,await page.evaluate(()=>!window.__game.audio.voiceSource&&(Array.from(document.querySelectorAll('.class-voice-line')).find(el=>el.getClientRects().length)).textContent.length>10));
  await activate('#class-back');await activate('#menu-settings');await activate('[data-key="muted"]');await page.waitForTimeout(250);
  check(`${device} mute silences every bus and stops recorded music`,await page.evaluate(()=>{const a=window.__game.audio;return !a.enabled&&!a.track&&a.master.gain.value<.005&&!a.voiceSource;}));
  await page.reload();check(`${device} voice toggle and independent volume persist across reload`,await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('cinder-settings-v1'));return s.audio.voiceLines===false&&s.audio.voices===31&&s.audio.music===27;}));
  check(`${device} muted reload does not fetch audio assets`,audioRequests.length>0&&await page.evaluate(()=>!performance.getEntriesByType('resource').some(r=>r.name.includes('/audio/'))));
  await context.close();
 }
 check('music, voices and female character have no runtime or console errors',errors.length===0);
 await writeFile('test-artifacts/music-character-regression.json',JSON.stringify({status:'PASS',checks,errors,evidence},null,2));
}catch(error){await writeFile('test-artifacts/music-character-regression.json',JSON.stringify({status:'FAIL',checks,errors,evidence,message:error.message},null,2));throw error;}finally{await browser.close();}
