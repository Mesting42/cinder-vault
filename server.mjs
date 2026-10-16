import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {networkInterfaces} from 'node:os';
const project=path.dirname(fileURLToPath(import.meta.url)),root=path.join(project,'dist'),arg=process.argv.indexOf('--port'),port=arg>=0?Number(process.argv[arg+1]):5188;
const hostArg=process.argv.indexOf('--host'),host=hostArg>=0?process.argv[hostArg+1]:'0.0.0.0';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.ico':'image/x-icon','.json':'application/json'};
await stat(path.join(root,'index.html')).catch(()=>{console.error('请先运行 npm install 和 npm run build，生成 dist。');process.exit(1);});
http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname),headers={'Cache-Control':'no-store, max-age=0, must-revalidate','Pragma':'no-cache'};
  if(pathname==='/version.json'){const html=await readFile(path.join(root,'index.html')),revision=createHash('sha256').update(html).digest('hex').slice(0,12);res.writeHead(200,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({game:'BELOW THE OATH',id:'cinder-vault',revision,url:`/?v=${revision}`}));return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}const body=await readFile(file);const immutable=/-[a-f0-9]{12}\.(webp|avif|png)$/i.test(path.basename(file));res.writeHead(200,{...(immutable?{'Cache-Control':'public, max-age=31536000, immutable'}:headers),'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':body.length});res.end(body);
}catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('文件不存在');}}).listen(port,host,()=>{console.log(`断誓之下 BELOW THE OATH 已启动：http://127.0.0.1:${port}`);if(host==='0.0.0.0')for(const entries of Object.values(networkInterfaces()))for(const address of entries||[])if(address.family==='IPv4'&&!address.internal&&!address.address.startsWith('169.254.'))console.log(`同一 Wi-Fi 的手机 / 平板：http://${address.address}:${port}`);});
