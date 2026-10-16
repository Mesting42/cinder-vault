// Encode the selected AI detail restoration at its verified native resolution.
// No invented 4K dimensions or interpolated upscale.
import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source=await readFile('public/last-verdict-hall-hd-v2.png');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const page=await browser.newPage();
  const result=await page.evaluate(async data=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d',{alpha:false}).drawImage(img,0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.97));const bytes=new Uint8Array(await blob.arrayBuffer());let raw='';for(let i=0;i<bytes.length;i+=32768)raw+=String.fromCharCode(...bytes.subarray(i,i+32768));return {width:canvas.width,height:canvas.height,data:btoa(raw)};},source.toString('base64'));
  const bytes=Buffer.from(result.data,'base64'),hash=createHash('sha256').update(bytes).digest('hex').slice(0,12),name='last-verdict-hall-hd-'+hash+'.webp';
  await writeFile('public/'+name,bytes);await writeFile('src/background-asset.js',`export const HD_BACKGROUND='/${name}';\nexport const HD_SIZE=[${result.width},${result.height}];\n`);
  console.log(JSON.stringify({name,width:result.width,height:result.height,bytes:bytes.length}));
}finally{await browser.close();}
