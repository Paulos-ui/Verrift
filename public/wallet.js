// Ethereum EIP-1193 injected-wallet support, Base Sepolia only.
export const CHAIN_ID='0x14a34';
export const EXPLORER='https://sepolia.basescan.org/tx/';
let provider=null;
export function walletAvailable(){return Boolean(window.ethereum?.request);}
async function ensureChain(){
 const current=await provider.request({method:'eth_chainId'});
 if(current?.toLowerCase()===CHAIN_ID)return;
 try{await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:CHAIN_ID}]});}
 catch(error){
  if(error.code!==4902)throw error;
  await provider.request({method:'wallet_addEthereumChain',params:[{chainId:CHAIN_ID,chainName:'Base Sepolia',nativeCurrency:{name:'Sepolia Ether',symbol:'ETH',decimals:18},rpcUrls:['https://sepolia.base.org'],blockExplorerUrls:['https://sepolia.basescan.org']}]});
 }
 const verified=await provider.request({method:'eth_chainId'});if(verified?.toLowerCase()!==CHAIN_ID)throw new Error('Please switch to Base Sepolia');
}
export async function connectWallet(){
 if(!walletAvailable())throw new Error('Install or open a compatible EVM wallet (for example Coinbase Wallet or MetaMask).');
 provider=window.ethereum;
 const accounts=await provider.request({method:'eth_requestAccounts'});if(!accounts?.[0])throw new Error('Wallet did not return an address');
 await ensureChain();return accounts[0];
}
export async function currentWallet(){if(!walletAvailable())return null;provider=window.ethereum;const accounts=await provider.request({method:'eth_accounts'});return accounts?.[0]||null;}
export async function walletBalance(address){provider=window.ethereum;const amount=await provider.request({method:'eth_getBalance',params:[address,'latest']});return (Number(BigInt(amount)/10n**14n)/10000).toFixed(4);}
export async function sendEth({from,to,amountEth}){
 provider=window.ethereum;if(!provider)throw new Error('Connect a wallet first');await ensureChain();
 if(!/^0x[a-f\d]{40}$/i.test(to))throw new Error('Invalid recipient address');
 if(!/^\d+(\.\d{1,18})?$/.test(amountEth))throw new Error('Invalid amount');
 const [whole,frac='']=amountEth.split('.');const amount=BigInt(whole)*10n**18n+BigInt((frac+'0'.repeat(18)).slice(0,18));
 if(amount<10n**12n||amount>10n**17n)throw new Error('Reward must be 0.000001 to 0.1 test ETH');
 return await provider.request({method:'eth_sendTransaction',params:[{from,to,value:`0x${amount.toString(16)}`} ]});
}

export async function anchorEvidence({from,digest}){
 provider=window.ethereum;if(!provider)throw new Error('Connect a wallet first');await ensureChain();
 if(!/^0x[a-f\d]{64}$/i.test(digest))throw new Error('Invalid evidence digest');
 return await provider.request({method:'eth_sendTransaction',params:[{from,to:from,value:'0x0',data:'0x56455252494654'+digest.slice(2).toLowerCase()}]});
}
