import {readdir,readFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
async function visit(folder){for(const entry of await readdir(folder,{withFileTypes:true})){const name=`${folder}/${entry.name}`;if(entry.isDirectory())await visit(name);else if(name.endsWith('.js')){execFileSync(process.execPath,['--check',name]);}else if(name.endsWith('.json'))JSON.parse(await readFile(name,'utf8'));}}
for(const name of ['lib','api','public','scripts','tests'])await visit(name);
execFileSync(process.execPath,['--check','scripts/dev-server.js']);
try { await access('server.js'); throw Error('Legacy root server.js detected. Remove it with: rm -f server.js before deploying.'); } catch (error) { if(error.code !== 'ENOENT') throw error; }
const cfg=JSON.parse(await readFile('vercel.json','utf8'));
if(cfg.framework !== null || cfg.outputDirectory !== 'public') throw Error('Vercel must use the public folder and a separate api function.');
console.log('VERRIFT source syntax and JSON checks passed. (Not a TypeScript compilation.)');
