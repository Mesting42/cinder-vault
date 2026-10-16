import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';

const html=await readFile('dist/index.html');
const revision=createHash('sha256').update(html).digest('hex').slice(0,12);
const version={game:'BELOW THE OATH',id:'cinder-vault',revision,url:`/?v=${revision}`};
await writeFile('dist/version.json',JSON.stringify(version)+'\n');
console.log(`Static Pages version ready: ${revision}`);
