// Wallet selection: discover injected EIP-6963 providers instead of assuming one default wallet.
// Base Sepolia is used only for testnet proof and rewards. No private keys are requested.
export const CHAIN_ID = '0x14a34';
export const EXPLORER = 'https://sepolia.basescan.org/tx/';
const announced = new Map();
let provider = null;
let walletEvents = null;

if (typeof window !== 'undefined') {
 window.addEventListener('eip6963:announceProvider', event => {
  const info = event.detail?.info;
  const injected = event.detail?.provider;
  if (!injected || typeof injected.request !== 'function' || !info?.name) return;
  const uuid = String(info.uuid || info.rdns || info.name).slice(0, 150);
  announced.set(uuid, {id:uuid, name:String(info.name).slice(0, 55), provider:injected});
 });
 window.dispatchEvent(new Event('eip6963:requestProvider'));
}

const walletName = p => p?.isRabby ? 'Rabby Wallet' : p?.isCoinbaseWallet ? 'Coinbase Wallet' : p?.isMetaMask ? 'MetaMask' : p?.isBraveWallet ? 'Brave Wallet' : 'Browser wallet';
function discovered() {
 const wallets = [...announced.values()];
 const seen = new Set(wallets.map(item => item.provider));
 const legacy = Array.isArray(window.ethereum?.providers) ? window.ethereum.providers : window.ethereum ? [window.ethereum] : [];
 for (const item of legacy) {
  if (typeof item?.request !== 'function' || seen.has(item)) continue;
  wallets.push({id:`legacy-${wallets.length}`,name:walletName(item),provider:item});
  seen.add(item);
 }
 return wallets;
}
export async function availableWallets() {
 if (typeof window === 'undefined') return [];
 window.dispatchEvent(new Event('eip6963:requestProvider'));
 // EIP-6963 wallet announcements may arrive asynchronously after the request.
 await new Promise(resolve => setTimeout(resolve, 140));
 return discovered();
}
export function walletAvailable() { return typeof window !== 'undefined' && discovered().length > 0; }

async function ensureChain() {
 if (!provider) throw Error('Choose a wallet first.');
 const current = await provider.request({method:'eth_chainId'});
 if (String(current).toLowerCase() === CHAIN_ID) return;
 try { await provider.request({method:'wallet_switchEthereumChain', params:[{chainId:CHAIN_ID}]}); }
 catch (error) {
  if (error.code !== 4902) throw error;
  await provider.request({method:'wallet_addEthereumChain',params:[{chainId:CHAIN_ID,chainName:'Base Sepolia',nativeCurrency:{name:'Sepolia Ether',symbol:'ETH',decimals:18},rpcUrls:['https://sepolia.base.org'],blockExplorerUrls:['https://sepolia.basescan.org']}]});
 }
 const verified = await provider.request({method:'eth_chainId'});
 if (String(verified).toLowerCase() !== CHAIN_ID) throw Error('Switch to Base Sepolia in your wallet to continue.');
}
export async function connectWallet(choice) {
 if (!choice?.provider?.request) throw Error('Select a detected wallet from the list.');
 provider = choice.provider;
 const accounts = await provider.request({method:'eth_requestAccounts'});
 if (!accounts?.[0]) throw Error('Your wallet did not return an account.');
 // Do not force a network switch for read-only wallet analytics or SIWE login.
 // Only explicit Base Sepolia proof transactions call ensureChain().
 return accounts[0];
}
export async function currentWallet(preferAddress) {
 if (typeof window === 'undefined') return null;
 const choices = provider ? [{provider},...discovered().filter(x => x.provider!==provider)] : discovered();
 for (const item of choices) {
  try {
   const accounts = await item.provider.request({method:'eth_accounts'});
   if (accounts?.[0] && (!preferAddress || accounts.some(x => x.toLowerCase() === preferAddress.toLowerCase()))) {
    provider=item.provider;
    return preferAddress || accounts[0];
   }
  } catch { /* Continue to the next injected wallet. */ }
 }
 return null;
}
export async function walletBalance(address) {
 if (!provider) throw Error('Connect your wallet.');
 const amount=await provider.request({method:'eth_getBalance',params:[address,'latest']});
 return (Number(BigInt(amount)/10n**14n)/10000).toFixed(4);
}
export async function sendEth({from,to,amountEth}) {
 if (!provider) throw Error('Connect a wallet first.');
 await ensureChain();
 if (!/^0x[a-f\d]{40}$/i.test(to)) throw Error('Invalid recipient address');
 if (!/^\d+(\.\d{1,18})?$/.test(amountEth)) throw Error('Invalid amount');
 const [whole,frac='']=amountEth.split('.');
 const amount=BigInt(whole)*10n**18n+BigInt((frac+'0'.repeat(18)).slice(0,18));
 if (amount<10n**12n||amount>10n**17n) throw Error('Reward must be 0.000001 to 0.1 test ETH');
 return await provider.request({method:'eth_sendTransaction',params:[{from,to,value:`0x${amount.toString(16)}`}]});
}
export async function anchorEvidence({from,digest}) {
 if (!provider) throw Error('Connect a wallet first.');
 await ensureChain();
 if (!/^0x[a-f\d]{64}$/i.test(digest)) throw Error('Invalid evidence digest');
 return await provider.request({method:'eth_sendTransaction',params:[{from,to:from,value:'0x0',data:'0x56455252494654'+digest.slice(2).toLowerCase()}]});
}
export async function signInMessage(message) {
 if (!provider) throw Error('Choose a wallet first.');
 const accounts=await provider.request({method:'eth_accounts'});
 if (!accounts?.[0]) throw Error('Wallet disconnected.');
 const hex='0x'+Array.from(new TextEncoder().encode(message),b=>b.toString(16).padStart(2,'0')).join('');
 return await provider.request({method:'personal_sign',params:[hex,accounts[0]]});
}
export function watchWalletChanges(fn) {
 walletEvents=fn;
 if (provider?.on) {
  provider.on('accountsChanged', fn);
  provider.on('chainChanged', fn);
 }
}

// Base Mainnet remediation. Never switches chains at sign-in or for read-only reports.
export async function sendERC20Revoke({owner,token,spender}) {
 if (!provider) throw Error('Select the wallet linked to your VERRIFT account.');
 if (![owner,token,spender].every(a => /^0x[0-9a-f]{40}$/i.test(a))) throw Error('Invalid token, spender or wallet address.');
 const accounts=await provider.request({method:'eth_accounts'});
 if (!accounts.some(a=>a.toLowerCase()===owner.toLowerCase()))throw Error('Wallet account no longer matches your authenticated profile.');
 let network=String(await provider.request({method:'eth_chainId'})).toLowerCase();
 if(network!=='0x2105'){
  try{await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x2105'}]});}
  catch(err){if(err.code!==4902)throw err;await provider.request({method:'wallet_addEthereumChain',params:[{chainId:'0x2105',chainName:'Base',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},rpcUrls:['https://mainnet.base.org'],blockExplorerUrls:['https://basescan.org']}]});}
  network=String(await provider.request({method:'eth_chainId'})).toLowerCase();
  if(network!=='0x2105')throw Error('Switch to Base Mainnet before authorizing revocation.');
 }
 const data='0x095ea7b3'+spender.slice(2).toLowerCase().padStart(64,'0')+'0'.repeat(64);
 return provider.request({method:'eth_sendTransaction',params:[{from:owner,to:token,value:'0x0',data}]});
}

// ETH -> VIBES swap. The signed quote is supplied by VERRIFT server after an actual
// 0x API response. It must be executed only after deliberate user confirmation.
export async function executeVibesSwap({owner,quote}) {
 if(!provider)throw Error('Select the wallet linked to your VERRIFT account.');
 if(!/^0x[0-9a-f]{40}$/i.test(owner)||!quote?.tx||quote.chainId!==8453)throw Error('Invalid Base Mainnet swap quote.');
 const accounts=await provider.request({method:'eth_accounts'});
 if(!accounts?.some(a=>a.toLowerCase()===owner.toLowerCase()))throw Error('Connected wallet differs from the signed-in wallet.');
 if(Date.now()>Date.parse(quote.quoteExpiresAt))throw Error('Quote expired. Request a fresh quote before swapping.');
 let chain=String(await provider.request({method:'eth_chainId'})).toLowerCase();
 if(chain!=='0x2105'){
  try{await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x2105'}]});}
  catch(error){if(error.code!==4902)throw error;await provider.request({method:'wallet_addEthereumChain',params:[{chainId:'0x2105',chainName:'Base',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},rpcUrls:['https://mainnet.base.org'],blockExplorerUrls:['https://basescan.org']}]});}
  chain=String(await provider.request({method:'eth_chainId'})).toLowerCase();
  if(chain!=='0x2105')throw Error('Switch your wallet to Base Mainnet before swapping.');
 }
 if(!/^0x[0-9a-f]{40}$/i.test(quote.tx.to)||!/^0x(?:[0-9a-f]{2})+$/i.test(quote.tx.data)||!/^0x[0-9a-f]+$/i.test(quote.tx.value))throw Error('Malformed provider transaction.');
 return provider.request({method:'eth_sendTransaction',params:[{from:owner,to:quote.tx.to,data:quote.tx.data,value:quote.tx.value}]});
}
