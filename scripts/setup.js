import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import crypto from 'node:crypto';
const file='.env';let vars=existsSync(file)?readFileSync(file,'utf8'):'';
for(const [key,size] of [['ADMIN_PASSWORD',18],['SESSION_SECRET',36]]){
 if(!new RegExp(`^${key}=.+$`,'m').test(vars)){
  const value=crypto.randomBytes(size).toString('base64url'); vars+=`\n${key}=${value}\n`;
  if(key==='ADMIN_PASSWORD')console.log(`Your local admin password (save securely): ${value}`);
 }
}
if(!/^CLAUDE_MODEL=/m.test(vars))vars+='\nCLAUDE_MODEL=claude-sonnet-4-6\n';
if(!/^BASE_SEPOLIA_RPC=/m.test(vars))vars+='BASE_SEPOLIA_RPC=https://sepolia.base.org\n';
writeFileSync(file,vars,{mode:0o600});console.log('Private .env ready. Do not commit or share it.');
