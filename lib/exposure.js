/**
 * VERRIFT V12: reproducible, same-block read-only Base permission exposure.
 * Evidence describes ERC-20 allowance and currently held token units; it is not
 * token safety certification, ownership proof, spendability proof or a trade.
 */
import {hexAddress,fail} from './utils.js';
import {mainnetCall, BASE_MAINNET_CHAIN} from './wallet-safety.js';

const pad = address => address.slice(2).toLowerCase().padStart(64,'0');
const NONZERO = /^0x(?!0{40}$)[a-f\d]{40}$/i;
function uintHex(value,label){
 if(typeof value!=='string'||!/^0x[\da-f]{1,64}$/i.test(value))fail(`${label} is not a standard uint256 ERC-20 response`,422);
 return BigInt(value);
}
export function delegationFromCode(code){
 if(typeof code!=='string'||!/^0x(?:[a-f\d]{2})*$/i.test(code))return {kind:'unknown',delegate:null};
 if(/^0xef0100[a-f\d]{40}$/i.test(code))return {kind:'eip7702',delegate:'0x'+code.slice(8).toLowerCase()};
 return {kind:code==='0x'?'no_code':'contract_code',delegate:null};
}
function displayAmount(value,decimals){
 if(decimals===null)return null;
 const power=10n**BigInt(decimals);const whole=value/power;
 const fraction=(value%power).toString().padStart(decimals,'0').slice(0,6).replace(/0+$/,'');
 return whole.toString()+(fraction?'.'+fraction:'');
}
export async function inspectPermissionExposure({owner,token,spender},{call=mainnetCall}={}){
 for(const [label,value] of Object.entries({owner,token,spender})){
  if(!hexAddress(value)||!NONZERO.test(value))fail(`Enter a valid nonzero ${label} address`,400);
 }
 const normalized={owner:owner.toLowerCase(),token:token.toLowerCase(),spender:spender.toLowerCase()};
 const chain=await call('eth_chainId',[]);
 if(String(chain).toLowerCase()!==BASE_MAINNET_CHAIN)fail('RPC is not connected to Base Mainnet',502);
 const blockHex=await call('eth_blockNumber',[]);
 if(!/^0x[\da-f]+$/i.test(String(blockHex)))fail('Unable to pin a Base block for consistent reads',502);
 const blockNumber=BigInt(blockHex);
 const tag='0x'+blockNumber.toString(16);
 // Every state read below uses the same block. A fast moving chain can otherwise
 // produce contradictory wallet balance and allowance observations.
 const [block,balanceAnswer,allowanceAnswer,ownerCode,spenderCode,decimalsResult]=await Promise.all([
  call('eth_getBlockByNumber',[tag,false]),
  call('eth_call',[{to:normalized.token,data:'0x70a08231'+pad(normalized.owner)},tag]),
  call('eth_call',[{to:normalized.token,data:'0xdd62ed3e'+pad(normalized.owner)+pad(normalized.spender)},tag]),
  call('eth_getCode',[normalized.owner,tag]),
  call('eth_getCode',[normalized.spender,tag]),
  call('eth_call',[{to:normalized.token,data:'0x313ce567'},tag]).catch(()=>null)
 ]);
 if(!block||!/^0x[\da-f]{64}$/i.test(String(block.hash))||BigInt(block.number)!==blockNumber)fail('Base block evidence could not be verified',502);
 const balance=uintHex(balanceAnswer,'balanceOf');
 const allowance=uintHex(allowanceAnswer,'allowance');
 let decimals=null;
 if(decimalsResult!==null){
  try{const d=uintHex(decimalsResult,'decimals');if(d<=36n)decimals=Number(d);}catch{/* Optional metadata; do not invent decimals. */}
 }
 const delegated=delegationFromCode(ownerCode);
 const spenderType=delegationFromCode(spenderCode);
 const active=allowance>0n;
 const held=balance>0n;
 const unlimited=allowance>=2n**255n;
 const atMost=allowance<balance?allowance:balance;
 return {chainId:8453,checkedAt:new Date().toISOString(),blockNumber:Number(blockNumber),blockHash:block.hash.toLowerCase(),
  ...normalized,balanceRaw:balance.toString(),allowanceRaw:allowance.toString(),
  potentiallyExposedRaw:atMost.toString(),decimals,balanceFormatted:displayAmount(balance,decimals),
  allowanceFormatted:unlimited?'Unlimited or effectively unlimited':displayAmount(allowance,decimals),
  potentiallyExposedFormatted:displayAmount(atMost,decimals),activeAllowance:active,unlimitedAllowance:unlimited,
  ownerCode:delegated,spenderCode:spenderType,
  interpretation:!active?'No standard ERC-20 allowance for this exact spender at the recorded block.':
   !held?'Allowance exists even though this wallet held zero of this token at the recorded block. Future receipts of the token could be exposed.':
   'This spender has a nonzero allowance and the wallet holds tokens. The displayed amount is an upper bound from standard ERC-20 reads, not a loss estimate.',
  limits:'Only one ERC-20 token, wallet and spender on Base Mainnet. Permit2 subpermissions, NFT approvals, delegated wallet/session-key policies, token transfer taxes and historical approval enumeration are not covered. EIP-7702 detection inspects the wallet bytecode pattern but does not audit delegate logic. A contract can change after this block. The presence of code does not imply a malicious actor.',
  explorer:`https://basescan.org/address/${normalized.owner}`};
}
