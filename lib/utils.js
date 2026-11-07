import crypto from 'node:crypto';

export function uid(prefix = '') { return prefix + crypto.randomUUID().replaceAll('-', '').slice(0, 20); }
export function now() { return new Date().toISOString(); }
export function hash(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }
export function safeEquals(a, b) { const x=Buffer.from(String(a)); const y=Buffer.from(String(b)); return x.length===y.length && crypto.timingSafeEqual(x,y); }
export function fail(message, status=400) { const error = new Error(message); error.status = status; throw error; }
export function bounded(value, max, label='Input') { if(typeof value !== 'string') fail(`${label} must be text`); const t=value.trim(); if(!t || t.length>max) fail(`${label} must be 1 to ${max} characters`); return t; }
export function hexAddress(value) { return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value); }
export function isHexHash(value) { return typeof value==='string' && /^0x[a-fA-F0-9]{64}$/.test(value); }
export function publicCase(item) { const { verificationToken, ...rest }=item; return {...rest, verificationToken: item.verifiedAt ? undefined : verificationToken}; }
export function parseCookies(header='') { return Object.fromEntries(header.split(';').map(p=>p.trim().split('=').map((s,i)=>i ? s : s)).filter(parts=>parts.length===2)); }
export function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
