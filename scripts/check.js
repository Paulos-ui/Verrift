import {readdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
async function visit(folder){for(const entry of await readdir(folder,{withFileTypes:true})){const name=`${folder}/${entry.name}`;if(entry.isDirectory())await visit(name);else if(name.endsWith('.js')){execFileSync(process.execPath,['--check',name]);}else if(name.endsWith('.json'))JSON.parse(await readFile(name,'utf8'));}}
for(const name of ['lib','api','public','scripts','tests'])await visit(name);
execFileSync(process.execPath,['--check','server.js']);
console.log('VERRIFT source syntax and JSON checks passed. (Not a TypeScript compilation.)');
