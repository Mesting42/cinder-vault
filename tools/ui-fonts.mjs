/** Self-host licensed Google Fonts, with the menu glyphs in a small first subset. */
import {readFile,readdir,writeFile,mkdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),out=new URL('public/fonts/',root);
await mkdir(out,{recursive:true});
const html=await readFile(new URL('index.html',root),'utf8');
const sources=await Promise.all((await readdir(new URL('src/',root))).filter(f=>/\.(js|css)$/.test(f)).map(f=>readFile(new URL('src/'+f,root),'utf8')));
const ascii=Array.from({length:95},(_,i)=>String.fromCodePoint(32+i)).join('');
const chinese=t=>[...new Set(t.match(/[\u3000-\u9fff]/gu)||[])].sort().join('');
const menu=chinese(html)+ascii,used=new Set(menu);
// Settings is usable before Three loads; do not make it download all combat glyphs.
const settingsGlyphs=[...chinese((await Promise.all(['src/settings-ui.js','src/settings.js'].map(f=>readFile(new URL(f,root),'utf8')))).join('\n'))].filter(c=>!used.has(c)).join('');
for(const c of settingsGlyphs)used.add(c);
const remaining=[...chinese(sources.join('\n'))].filter(c=>!used.has(c));
const chunks=[menu,settingsGlyphs,...Array.from({length:Math.ceil(remaining.length/350)},(_,i)=>remaining.slice(i*350,(i+1)*350).join(''))];
const ua='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const evidence=[],rules=[];
async function fetchFont(family,glyphs,name,range){
 const url='https://fonts.googleapis.com/css2?family='+family+'&display=swap&text='+encodeURIComponent(glyphs);
 const response=await fetch(url,{headers:{'User-Agent':ua}});if(!response.ok)throw new Error(`${name}: CSS ${response.status}`);
 const css=await response.text(),remote=css.match(/url\((https:[^)]+)\)/)?.[1];if(!remote)throw new Error(`${name}: missing WOFF2`);
 const asset=await fetch(remote);if(!asset.ok)throw new Error(`${name}: font ${asset.status}`);
 const bytes=Buffer.from(await asset.arrayBuffer());if(bytes.toString('ascii',0,4)!=='wOF2')throw new Error(`${name}: invalid WOFF2`);
 const hash=createHash('sha256').update(bytes).digest('hex'),file=name+'-'+hash.slice(0,12)+'.woff2';
 await writeFile(new URL(file,out),bytes);
 rules.push(`@font-face{font-family:"${family.startsWith('Teko')?'Cinder Display':'Cinder Sans'}";font-style:normal;font-weight:${family.startsWith('Teko')?'400 700':'400 800'};font-display:swap;src:url('/fonts/${file}') format('woff2');${range?'unicode-range:'+range+';':''}}`);
 evidence.push({file,source:remote,cssSource:url,bytes:bytes.length,sha256:hash,glyphs:glyphs.length});
}
for(let i=0;i<chunks.length;i++)await fetchFont('Noto+Sans+SC:wght@400..800',chunks[i],'cinder-sans-'+i,[...chunks[i]].map(c=>'U+'+c.codePointAt(0).toString(16).toUpperCase()).join(','));
await fetchFont('Teko:wght@400..700',ascii,'cinder-display');
for(const [family,dir] of [['Noto Sans SC','notosanssc'],['Teko','teko']]){
 const url=`https://api.github.com/repos/google/fonts/contents/ofl/${dir}/OFL.txt`,r=await fetch(url);if(!r.ok)throw new Error('License unavailable');
 const license=await r.json();await writeFile(new URL(dir+'-OFL.txt',out),Buffer.from(license.content,'base64'));
}
await writeFile(new URL('src/fonts.css',root),rules.join('\n')+'\n');
await writeFile(new URL('manifest.json',out),JSON.stringify({license:'SIL Open Font License 1.1',note:'Self-hosted WOFF2 subsets supplied by Google Fonts. No runtime external requests.',fonts:evidence},null,2));
const current=new Set(evidence.map(f=>f.file));for(const file of await readdir(out))if(/^cinder-(?:sans-\d+|display)(?:-[a-f0-9]+)?\.woff2$/.test(file)&&!current.has(file))await unlink(new URL(file,out));
console.log(JSON.stringify(evidence.map(({file,bytes,glyphs})=>({file,bytes,glyphs})),null,2));
