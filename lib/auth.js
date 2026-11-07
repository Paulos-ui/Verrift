import crypto from 'node:crypto';
import {hexAddress,safeEquals,fail,parseCookies} from './utils.js';

const SESSION_HOURS=8;
function sign(payload,secret){const value=Buffer.from(JSON.stringify(payload)).toString('base64url');return `${value}.${crypto.createHmac('sha256',secret).update(value).digest('base64url')}`;}
function verify(token,secret){
 if(typeof token!=='string'||token.length>2500)return null;
 const parts=token.split('.');if(parts.length!==2)return null;
 const mac=crypto.createHmac('sha256',secret).update(parts[0]).digest('base64url');
 if(!safeEquals(parts[1],mac))return null;
 try{const data=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));return data.exp>Date.now()?data:null;}catch{return null;}
}
export function signedCookie(req,name,secret){return verify(parseCookies(req.headers.cookie||'')[name],secret);}
export function cookie(name,value,req,maxAge){
 const secure=(process.env.PUBLIC_ORIGIN||'').startsWith('https:')||req.headers['x-forwarded-proto']==='https';
 return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure?'; Secure':''}`;
}
export function newGuest(secret){return sign({type:'guest',id:`guest_${crypto.randomUUID()}`,exp:Date.now()+24*3600000},secret);}
export function newSession(userId,address,secret){return sign({type:'user',id:`user_${userId}`,wallet:address.toLowerCase(),exp:Date.now()+SESSION_HOURS*3600000},secret);}
export function challenge(address,origin,secret){
 if(!hexAddress(address))fail('Enter a valid wallet address');
 const host=new URL(origin).host;
 const issuedAt=new Date().toISOString();
 const nonce=crypto.randomBytes(12).toString('hex');
 const message=`${host} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to VERRIFT to manage your own repair cases.\n\nURI: ${origin}/\nVersion: 1\nChain ID: 84532\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
 const proof=sign({type:'challenge',digest:crypto.createHash('sha256').update(message).digest('hex'),address:address.toLowerCase(),exp:Date.now()+5*60000},secret);
 return {message,proof};
}
export function verifyChallenge({message,signature,proof},secret){
 const payload=verify(proof,secret);
 if(!payload||payload.type!=='challenge')fail('Sign-in challenge expired. Try again.',401);
 if(typeof message!=='string'||message.length>1400||!/^0x[a-f\d]{130}$/i.test(signature||''))fail('Invalid wallet signature',400);
 const digest=crypto.createHash('sha256').update(message).digest('hex');
 if(!safeEquals(digest,payload.digest))fail('Sign-in message was altered',403);
 if(!message.includes(`\n${payload.address}\n`)&&!message.toLowerCase().includes(`\n${payload.address}\n`))fail('Wallet address mismatch',403);
 return payload.address;
}
export function actorFor(req,secret){
 const session=signedCookie(req,'verrift_auth',secret);
 if(session?.type==='user'&&/^user_[\w-]{10,90}$/.test(session.id)&&hexAddress(session.wallet))return {id:session.id,role:'user',wallet:session.wallet};
 const guest=signedCookie(req,'verrift_guest',secret);
 if(guest?.type==='guest'&&/^guest_[\w-]{36}$/.test(guest.id))return {id:guest.id,role:'guest',wallet:null};
 return null;
}
export function requireUser(actor){if(actor?.role!=='user')fail('Sign in with your wallet to use this feature',401);}
export function requireOwner(actor,resource){if(!resource||resource.ownerId!==actor.id)fail('Record not found',404);}
export async function exchangeWeb3({message,signature},options={}){
 const url=options.url||process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=options.key||process.env.SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)fail('Wallet sign-in is not configured. Connect Supabase in Vercel.',503);
 const resp=await fetch(`${url.replace(/\/$/,'')}/auth/v1/token?grant_type=web3`,{
  method:'POST',headers:{apikey:key,'content-type':'application/json'},body:JSON.stringify({chain:'ethereum',message,signature}),signal:AbortSignal.timeout(12000)
 });
 const result=await resp.json().catch(()=>({}));
 if(!resp.ok||!result.user?.id||!result.access_token)fail('Supabase rejected the wallet signature. Check Web3 provider, domain allowlist and wallet.',401);
 if(!/^[\w-]{10,90}$/.test(result.user.id))fail('Unexpected Supabase identity',502);
 return {id:result.user.id};
}
