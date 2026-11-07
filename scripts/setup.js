import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import crypto from 'node:crypto';
const file='.env';let vars=existsSync(file)?readFileSync(file,'utf8'):'';
if(!/^SESSION_SECRET=.{32,}$/m.test(vars)){
 vars=vars.replace(/^SESSION_SECRET=.*\n?/m,'');
 vars+=`\nSESSION_SECRET=${crypto.randomBytes(40).toString('base64url')}\n`;
}
if(!/^CLAUDE_MODEL=/m.test(vars))vars+='CLAUDE_MODEL=claude-sonnet-4-6\n';
if(!/^BASE_SEPOLIA_RPC=/m.test(vars))vars+='BASE_SEPOLIA_RPC=https://sepolia.base.org\n';
writeFileSync(file,vars,{mode:0o600});console.log('Private .env ready. No administrator password is needed. Add Supabase keys for live wallet sign-in.');
