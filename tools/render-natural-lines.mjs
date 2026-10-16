import {EdgeTTS} from 'node-edge-tts';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {CHARACTER_LINES} from '../src/character-lines.js';
const profiles={shooter:{voice:'zh-CN-YunxiNeural',rate:'+3%',pitch:'-2Hz',description:'清晰利落的青年男声'},mage:{voice:'zh-CN-XiaoyiNeural',rate:'-5%',pitch:'+3Hz',description:'轻柔少女音'},warrior:{voice:'zh-CN-YunjianNeural',rate:'-8%',pitch:'-12Hz',description:'低沉有力量的男声'}};
await mkdir('public/audio',{recursive:true});
const lines={};
for(const [id,entries] of Object.entries(CHARACTER_LINES)){
 lines[id]=[];const profile=profiles[id],tts=new EdgeTTS({...profile,outputFormat:'audio-24khz-96kbitrate-mono-mp3',timeout:20000});
 for(const [i,line] of entries.entries()){
  const path=`test-artifacts/voice-${id}-${i+1}-natural.mp3`;await tts.ttsPromise(line.text,path);const data=await readFile(path),hash=createHash('sha256').update(data).digest('hex').slice(0,10),name=`voice-${id}-${i+1}-${hash}.mp3`;if(data.length<1000)throw Error('Speech output missing');await writeFile('public/audio/'+name,data);lines[id].push({text:line.text,audio:'/audio/'+name});console.log('Generated '+id+' line '+(i+1)+' with '+profile.voice);
 }
}
await writeFile('src/character-lines.js','// Pre-rendered natural speech; no online synthesis during gameplay.\nexport const CHARACTER_LINES='+JSON.stringify(lines,null,2)+';\nexport const VOICE_PROFILES='+JSON.stringify(profiles,null,2)+';\n');
await writeFile('test-artifacts/natural-voice-generation.json',JSON.stringify({status:'PASS',provider:'Microsoft Edge natural TTS, via node-edge-tts 1.2.10',profiles,lines},null,2));
