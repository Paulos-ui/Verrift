import dns from 'node:dns/promises';
import net from 'node:net';
import https from 'node:https';
import {fail} from './utils.js';
const blockedSuffixes=['.local','.localhost','.internal','.test','.invalid','.example','.onion','.home','.lan'];
function publicIp(value){
 if(net.isIP(value)===4){ const x=value.split('.').map(Number);return !(x[0]===0||x[0]===10||x[0]===127||x[0]>=224||(x[0]===169&&x[1]===254)||(x[0]===172&&x[1]>=16&&x[1]<=31)||(x[0]===192&&[0,168].includes(x[1]))||(x[0]===100&&x[1]>=64&&x[1]<=127)||(x[0]===198&&x[1]>=18&&x[1]<=19)||(x[0]===192&&x[1]===88)||(x[0]===255)); }
 if(net.isIP(value)===6){const s=value.toLowerCase();return !(s==='::1'||s==='::'||s.startsWith('fe8')||s.startsWith('fe9')||s.startsWith('fea')||s.startsWith('feb')||s.startsWith('fc')||s.startsWith('fd')||s.startsWith('ff')||s.startsWith('2001:db8')||s.startsWith('::ffff:'));}
 return false;
}
export function domainName(input){
 let url;try{url=new URL(input.includes('://')?input:`https://${input}`);}catch{fail('Enter a valid public domain');}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||url.pathname!=='/')fail('Use a public HTTPS domain only (no paths, ports, or credentials)');
 const host=url.hostname.toLowerCase().replace(/\.$/,'');
 if(host.length>253||host.split('.').length<2||!host.split('.').every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))||blockedSuffixes.some(s=>host.endsWith(s))||net.isIP(host))fail('A public DNS hostname is required');
 return host;
}
export function allowedPath(input){
 if(typeof input!=='string'||!input.startsWith('/')||input.length>240||input.startsWith('//')||/[\\#\r\n\x00-\x1f]/.test(input)) fail('Use a short relative path beginning with /');
 let url;try{url=new URL(input,'https://probe.invalid');}catch{fail('Invalid path');}
 if(url.origin!=='https://probe.invalid'||url.username||url.password||url.hash) fail('Only same-host paths are permitted');
 return url.pathname+url.search;
}
export async function resolvePublic(host){
 const records=await dns.lookup(host,{all:true,verbatim:true});
 if(!records.length||records.some(r=>!publicIp(r.address)))fail('Domain resolves to a private or blocked network',403);
 return records[0];
}
export async function verifyDomain(host,token,{resolver=dns,fetchText}={}){
 let txt=[];try{txt=await resolver.resolveTxt(`_verrift-challenge.${host}`);}catch{}
 if(txt.some(parts=>parts.join('')===`verrift=${token}`))return 'dns-txt';
 // A verified domain may optionally publish a HTTPS proof file.
 try{
   const response=fetchText ? await fetchText(host,`/.well-known/verrift/${token}.txt`) : await probe(host,`/.well-known/verrift/${token}.txt`);
   if(response.status===200 && response.body.trim()===token)return 'https-file';
 }catch{}
 return null;
}
export async function probe(host,requestPath,{lookup=resolvePublic,timeout=8000}={}){
 const record=await lookup(host);
 if(!publicIp(record.address))fail('Non-public destination blocked',403);
 const path=allowedPath(requestPath);
 const options={protocol:'https:',hostname:host,serverName:host,port:443,path,method:'GET',timeout,rejectUnauthorized:true,headers:{'User-Agent':'VERRIFT-Authorized-Checker/1.0','Accept':'text/html,text/plain,application/json;q=0.9','Accept-Encoding':'identity','Connection':'close'},lookup:(_host,_options,callback)=>callback(null,record.address,record.family),maxRedirects:0};
 return await new Promise((resolve,reject)=>{
  const started=Date.now(); const request=https.request(options,response=>{
    const chunks=[];let length=0; let complete=false;
    response.on('data',chunk=>{length+=chunk.length;if(length>120000){complete=true;request.destroy(new Error('Response exceeds 120 KB limit'));} else chunks.push(chunk);});
    response.on('end',()=>{if(complete)return;resolve({status:response.statusCode,body:Buffer.concat(chunks).toString('utf8'),headers:response.headers,durationMs:Date.now()-started,checkedUrl:`https://${host}${path}`});});
  });
  request.on('timeout',()=>request.destroy(new Error('Request timed out')));
  request.on('error',reject);request.end();
 });
}
export function checkResponse(response,expectedStatus,expectedText){
 const checks=[{label:`HTTP status equals ${expectedStatus}`,pass:response.status===expectedStatus,detail:`Observed HTTP ${response.status}`}];
 if(expectedText)checks.push({label:`Response contains “${expectedText}”`,pass:response.body.includes(expectedText),detail:response.body.includes(expectedText)?'Expected evidence present':'Expected evidence missing'});
 const passed=checks.every(c=>c.pass);
 return {passed,checks,observation:{url:response.checkedUrl,status:response.status,durationMs:response.durationMs,contentType:String(response.headers?.['content-type']||'not provided'),observedAt:new Date().toISOString()}};
}
export {publicIp};
