import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('V10 topbar exposes real points check-in and live VIBES read',async()=>{
 const ui=await read('public/app.js');const page=await read('public/workspace.html');
 assert.match(ui,/function renderActivityBar/);assert.match(ui,/v10-activity-bar/);assert.match(page,/id="v10-activity-bar"/);assert.match(ui,/data-action="daily-checkin"/);assert.match(ui,/state\.vibes\?e\(state\.vibes\.balance\)/);
 assert.match(page,/data-view="swap"/);assert.match(page,/ui-v9\.css/);
 assert.match(ui,/No VIBES reward distribution is currently funded or enabled/);
});
test('mainnet quote calls remain authenticated and never silently submit funds',async()=>{
 const app=await read('lib/app.js');const wallet=await read('public/wallet.js');
 assert.match(app,/\'\/api\/wallet\/swap\/quote\'/);assert.match(app,/\'\/api\/wallet\/swap\/verify\'/);
 assert.match(wallet,/executeVibesSwap/);assert.match(wallet,/wallet_switchEthereumChain/);assert.match(wallet,/eth_sendTransaction/);
 assert.match(app,/tokenRewardsFunded:false/);assert.match(wallet,/if\(Date\.now\(\)>Date\.parse\(quote\.quoteExpiresAt\)\)/);
});
