import fs from 'node:fs/promises';
import path from 'node:path';
import { uid } from './utils.js';

const emptyState=()=>({revision:uid('rev_'),projects:[],cases:[],runs:[],payouts:[],anchors:[],analyses:[],sandbox:{broken:false,version:0,updatedAt:null}});
const localQueues=new Map();

export class Store {
  constructor({file=path.join(process.cwd(),'data','verrift.json'),redisUrl=process.env.UPSTASH_REDIS_REST_URL,redisToken=process.env.UPSTASH_REDIS_REST_TOKEN}={}){
    this.file=file; this.redisUrl=redisUrl; this.redisToken=redisToken;
    if(Boolean(redisUrl)!==Boolean(redisToken)) throw Error('Both Upstash REST URL and token are required');
  }
  async redis(...args){
    const response=await fetch(this.redisUrl, {method:'POST',headers:{authorization:`Bearer ${this.redisToken}`,'content-type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(7000)});
    if(!response.ok) throw Error('Database unavailable');
    const parsed=await response.json();
    if(parsed.error) throw Error('Database unavailable: '+parsed.error);
    return parsed.result;
  }
  async read(){
    if(this.redisUrl){const val=await this.redis('GET','verrift:state:v1');return val?JSON.parse(val):emptyState();}
    try{return JSON.parse(await fs.readFile(this.file,'utf8'));}catch(err){if(err.code==='ENOENT')return emptyState();throw err;}
  }
  async mutate(fn){
    if(this.redisUrl){
      for(let i=0;i<6;i++){
        const old=await this.read();const next=structuredClone(old);const result=await fn(next);next.revision=uid('rev_');
        const lua="local old=redis.call('GET',KEYS[1]); if old then local v=cjson.decode(old); if v.revision~=ARGV[1] then return 0 end else if ARGV[1]~='ABSENT' then return 0 end end; redis.call('SET',KEYS[1],ARGV[2]); return 1";
        // Empty initial state uses a generated revision: treat absence as ABSENT.
        const present=await this.redis('EXISTS','verrift:state:v1');
        const updated=await this.redis('EVAL',lua,'1','verrift:state:v1',present?old.revision:'ABSENT',JSON.stringify(next));
        if(Number(updated)===1)return result;
      }
      throw Error('Database is busy; retry');
    }
    const key=this.file;
    const prior=localQueues.get(key)||Promise.resolve();
    let release; const nextInQueue=new Promise(resolve=>{release=resolve;});localQueues.set(key,nextInQueue);
    await prior;
    try{
      const state=await this.read();const result=await fn(state);state.revision=uid('rev_');
      await fs.mkdir(path.dirname(this.file),{recursive:true});const temp=`${this.file}.${process.pid}.${uid()}.tmp`;
      await fs.writeFile(temp,JSON.stringify(state,null,2),{mode:0o600});await fs.rename(temp,this.file);return result;
    }finally{release();if(localQueues.get(key)===nextInQueue)localQueues.delete(key);}
  }
}
