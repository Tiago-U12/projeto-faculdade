import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const root = process.argv.includes('--dist') ? path.join(projectRoot,'dist') : projectRoot;
const port = Number(process.env.PORT || 5173);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server = http.createServer(async(req,res)=>{
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const candidate = path.resolve(root, '.'+pathname);
    if (candidate !== root && !candidate.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
    const target=(await stat(candidate)).isDirectory()?path.join(candidate,'index.html'):candidate;
    const body=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  } catch {res.writeHead(404);res.end('Arquivo não encontrado');}
});
server.listen(port,'0.0.0.0',()=>console.log(`Aysha Park: http://localhost:${port}`));
