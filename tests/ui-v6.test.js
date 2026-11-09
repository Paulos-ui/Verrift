import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read = p => fs.readFile(p,'utf8');

test('Pine and Tide palette includes green navigation and blue accents',async()=>{
 const css=await read('public/ui-v6.css');
 const workspace=await read('public/workspace.html');
 const landing=await read('public/landing.css');
 assert.match(css,/\.rail\{background:#153f35/);
 assert.match(css,/--accent:#3177a5/);
 assert.match(landing, /\.entry-section\{[^}]*background:#143f35/);
 assert.match(workspace,/href="\/ui-v6\.css"/);
});

test('Unconnected visitors get home and a wallet picker, not the old guest-mode sign-in screen',async()=>{
 const [app,workspace,wallet]=await Promise.all([read('public/app.js'),read('public/workspace.html'),read('public/wallet.js')]);
 assert.match(app,/function renderPublicHome/);
 assert.match(app,/async function showWalletPicker/);
 assert.match(workspace, /id="wallet-picker"/);
 assert.match(workspace, /Connect wallet/);
 assert.doesNotMatch(workspace, /id="login-screen"|Continue exploring as guest|Sign in with wallet/);
 assert.doesNotMatch(app, /data-action="demo-case"|GUEST MODE/);
 assert.match(wallet,/eip6963:announceProvider/);
 assert.match(wallet,/wallet_switchEthereumChain/);
 assert.match(wallet,/MetaMask/);
 assert.match(wallet,/Coinbase Wallet/);
});

test('Public landing enters app before prompting the user to connect a wallet',async()=>{
 const html=await read('public/index.html');
 assert.match(html,/href="\/app"/);
 assert.match(html,/href="\/app"/);
 assert.match(html,/Check a Base token/);
 assert.match(html,/READ-ONLY TOKEN CHECKS ARE PUBLIC/);
 assert.doesNotMatch(html,/WALLET OPTIONAL FOR GUESTS|NO WALLET NEEDED TO EXPLORE/);
});
