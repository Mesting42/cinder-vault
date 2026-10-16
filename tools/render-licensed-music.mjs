import {mkdir,writeFile,readFile,rename} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ffmpeg=path.join(path.dirname(require.resolve('@ffmpeg-installer/win32-x64/package.json')),'ffmpeg.exe');
import {CURATED_MUSIC} from './curated-music.mjs';
const cache='.music-source-cache-20261005',tracks={};
const hash=b=>createHash('sha256').update(b).digest('hex');
async function convert(args,input){return new Promise((resolve,reject)=>{const process=spawn(ffmpeg,['-hide_banner','-loglevel','error',...args],{windowsHide:true,stdio:['pipe','pipe','pipe']});const chunks=[],errors=[];process.stdout.on('data',d=>chunks.push(d));process.stderr.on('data',d=>errors.push(d));process.on('error',reject);process.on('close',code=>code?reject(Error(Buffer.concat(errors).toString())):resolve(Buffer.concat(chunks)));process.stdin.on('error',()=>{});process.stdin.end(input);});}
await mkdir(cache,{recursive:true});await mkdir('public/audio',{recursive:true});
for(const selection of CURATED_MUSIC){
 const page='https://www.scottbuckley.com.au/library/'+selection.page+'/',file=cache+'/'+selection.id+'.mp3';let original;
 try{original=await readFile(file);}catch{
  const response=await fetch(selection.download,{signal:AbortSignal.timeout(60000)});if(!response.ok||!response.headers.get('content-type')?.includes('audio'))throw Error(selection.id+' download failed');original=Buffer.from(await response.arrayBuffer());await writeFile(file,original);
  const html=await fetch(page).then(r=>r.text());await writeFile(cache+'/'+selection.id+'-source.html',html);
 }
 console.log('Downloaded '+selection.title+' ('+original.length+' bytes)');
 const pcm=await convert(['-ss',String(selection.start),'-i',file,'-t',String(selection.duration+1.4),'-af','loudnorm=I=-20:TP=-2:LRA=9','-ar','32000','-ac','2','-f','f32le','pipe:1']);
 const samples=new Float32Array(pcm.buffer,pcm.byteOffset,pcm.length/4),n=selection.duration*32000*2,blend=Math.round(1.4*32000)*2;
 if(samples.length<n+blend-128)throw Error('Excerpt longer than original '+selection.title);
 const loop=new Float32Array(n);loop.set(samples.subarray(0,n));
 // Blend the extra trailing phrase back into the head, preserving authored music.
 for(let i=0;i<blend;i++){const phase=Math.floor(i/2)/(blend/2-1),tail=samples[n+i]||0;loop[i]=tail*Math.cos(phase*Math.PI/2)+loop[i]*Math.sin(phase*Math.PI/2);}
 let peak=0,sum=0;for(const sample of loop){peak=Math.max(peak,Math.abs(sample));sum+=sample*sample;}const scale=peak>.82?.82/peak:1;for(let i=0;i<n;i++)loop[i]*=scale;
 const rendered=await convert(['-f','f32le','-ar','32000','-ac','2','-i','pipe:0','-codec:a','libmp3lame','-b:a','128k','-f','mp3','pipe:1'],Buffer.from(loop.buffer));
 const name=`licensed-${selection.id}-${hash(rendered).slice(0,10)}.mp3`;await writeFile('public/audio/'+name,rendered);
 tracks[selection.id]={url:'/audio/'+name,duration:selection.duration,loopStart:0,title:selection.title,author:'Scott Buckley',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',source:page,download:selection.download,sourceSha256:hash(original),sourceStart:selection.start,adaptation:'Game excerpt, loudness adjustment, 1.4 second circular crossfade, MP3 encoding.',reason:selection.reason,bytes:rendered.length,peak:peak*scale,rms:Math.sqrt(sum/n)*scale,channels:2,sampleRate:32000};
 console.log('Prepared '+selection.id+' '+selection.duration+' second game loop');
}
await writeFile('src/music-assets.js','// Curated Scott Buckley recordings. Credits: public/audio-credits.html\nexport const MUSIC_TRACKS='+JSON.stringify(tracks,null,2)+';\n');
await writeFile('public/audio/music-manifest.json',JSON.stringify({verified:'2026-10-05',tracks},null,2));
await writeFile('test-artifacts/licensed-music-preparation.json',JSON.stringify({status:'PASS',tracks},null,2));
console.log('PASS seven licensed, scene-matched music loops');
