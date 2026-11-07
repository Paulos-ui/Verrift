import fs from 'node:fs/promises';
import path from 'node:path';
import { uid } from './utils.js';

const emptyState=()=>({revision:uid('rev_'),projects:[],cases:[],runs:[],payouts:[],anchors:[],analyses:[],sandboxes:{}});
const localQueues=new Map();

export class Store {
  constructor({file=path.join(process.cwd(),'data','verrift.json'),redisUrl=process.env.UPSTASH_REDIS_REST_URL,redisToken=process.env.UPSTASH_REDIS_REST_TOKEN,supabaseUrl=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL,supabaseSecret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY}={}){
    this.file=file; this.redisUrl=redisUrl; this.redisToken=redisToken;this.supabaseUrl=supabaseUrl;this.supabaseSecret=supabaseSecret;
    if(Boolean(supabaseUrl)!==Boolean(supabaseSecret))throw Error('Both SUPABASE_URL and SUPABASE_SECRET_KEY are required');
    if(process.env.VERCEL&&!supabaseUrl&&!redisUrl)throw Error('Production needs Supabase or Upstash persistence. Configure Supabase in Vercel.');
    if(Boolean(redisUrl)!==Boolean(redisToken)) throw Error('Both Upstash REST URL and token are required');
  }
  async redis(...args){
    const response=await fetch(this.redisUrl, {method:'POST',headers:{authorization:`Bearer ${this.redisToken}`,'content-type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(7000)});
    if(!response.ok) throw Error('Database unavailable');
    const parsed=await response.json();
    if(parsed.error) throw Error('Database unavailable: '+parsed.error);
    return parsed.result;
  }
  async supabase(api,method='GET',data){
    const response=await fetch(`${this.supabaseUrl.replace(/\/$/,'')}/rest/v1/${api}`,{method,headers:{apikey:this.supabaseSecret,...(this.supabaseSecret.startsWith('sb_secret_')?{}:{Authorization:`Bearer ${this.supabaseSecret}`}), 'Content-Type':'application/json',Accept:'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(10000)});
    if(!response.ok){console.error('VERRIFT Supabase persistence error:',response.status);throw Error('Supabase database unavailable. Run supabase/schema.sql and check integration credentials.');}
    return response.status===204?null:response.json();
  }
  async read(){
    if(this.supabaseUrl){const rows=await this.supabase('verrift_state?select=state&id=eq.main&limit=1');return rows?.[0]?.state||emptyState();}
    if(this.redisUrl){const val=await this.redis('GET','verrift:state:v1');return val?JSON.parse(val):emptyState();}
    try{return JSON.parse(await fs.readFile(this.file,'utf8'));}catch(err){if(err.code==='ENOENT')return emptyState();throw err;}
  }
  async mutate(fn){
    if(this.supabaseUrl){
      for(let i=0;i<8;i++){
        const old=await this.read();const next=structuredClone(old);const result=await fn(next);next.revision=uid('rev_');
        const answer=await this.supabase('rpc/verrift_cas_state','POST',{expected_revision:old.revision||'',next_state:next});
        if(answer===true)return result;
      }
      throw Error('Supabase busy, retry your action');
    }
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
