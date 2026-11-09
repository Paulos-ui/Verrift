import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');

test('Why 2026 section cites Base official strategy and marks network metric correctly', async()=>{
 const html=await read('public/index.html');
 assert.match(html,/id="why-2026"/);
 assert.match(html,/aria-labelledby="moment-title"/);
 assert.match(html,/\$17T<span>\+<\/span>/);
 assert.match(html,/Stablecoin volume that Base reported for 2025/);
 assert.match(html,/blog\.base\.org\/2026-mission-vision-and-strategy/);
 assert.match(html,/base\.org\/blog\/the-agentic-economy-is-here/);
 assert.match(html,/network-wide reported volume, not VERRIFT activity or revenue/);
 assert.match(html,/research a token/i);
 assert.match(html,/verify a change/i);
});

test('GitHub source links identify project and requested hub without using an account only source link',async()=>{
 const html=await read('public/index.html');
 const app=await read('public/workspace.html');
 assert.match(html,/https:\/\/github\.com\/paulos-ui\/verrift/);
 assert.match(html,/https:\/\/github\.com\/verrift/);
 assert.match(app,/https:\/\/github\.com\/paulos-ui\/verrift/);
});

test('Public copy centers on research, permissions, and chain evidence, not claiming safety',async()=>{
 const html=await read('public/index.html');const app=await read('public/app.js');
 assert.match(html,/ALLOWANCE BEFORE/);
 assert.match(html,/CHAIN RECEIPT \+ RECHECK/);
 assert.match(app,/THE VERRIFT METHOD/);
 assert.match(html,/not a blanket wallet-safety guarantee/i);
 assert.doesNotMatch(html,/—/);
 assert.doesNotMatch(app,/—/);
});

test('Why 2026 layout has mobile and reduced-motion handling',async()=>{
 const css=await read('public/ui-2026.css');
 const html=await read('public/index.html');
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.match(html,/href="\/ui-2026\.css"/);
});
