/** Read-only Base token research. External risk detectors supply observations, not guarantees.
 * No arbitrary destination URLs, no wallet signatures, no investment recommendations. */
import {hexAddress, fail} from './utils.js';

const BASE_CHAIN=8453;
const flag=(label,severity,source,detail)=>({label,severity,source,detail});
function truthy(v){return v===true||v==='1'||v===1;}
function boundedNumber(value){const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;}
async function getJSON(url,{transport=fetch,headers={}}={}){
 const response=await transport(url,{headers:{accept:'application/json',...headers},signal:AbortSignal.timeout(6500)});
 if(!response.ok)throw Error(`Provider returned HTTP ${response.status}`);
 return response.json();
}
function normalizeGoPlus(raw,address){
 const d=raw?.result?.[address.toLowerCase()];if(raw?.code!==1&&!d || !d)return null;
 const fields=[
  ['is_honeypot','Honeypot indicator','critical','Security provider flags possible restrictions on selling.'],
  ['cannot_sell_all','Selling restrictions','critical','Contract may restrict selling the full token balance.'],
  ['is_blacklisted','Blacklist controls','high','Contract supports account restrictions or blacklist logic.'],
  ['owner_change_balance','Owner balance control','high','Privileged contract logic may change account balances.'],
  ['hidden_owner','Undisclosed ownership control','high','Ownership privileges may not be obvious.'],
  ['is_mintable','Supply can be increased','review','Contract may permit new token issuance.'],
  ['transfer_pausable','Transfers can be paused','review','Token transfers may be pausable.'],
  ['is_proxy','Upgradeable contract','review','Proxy logic may permit future implementation changes.'],
 ];
 const signals=fields.filter(([key])=>truthy(d[key])).map(([key,label,severity,detail])=>flag(label,severity,'GoPlus',detail));
 if(d.is_open_source==='0')signals.push(flag('Source not verified','review','GoPlus','Source-code verification was not reported.'));
 const buyTax=boundedNumber(d.buy_tax),sellTax=boundedNumber(d.sell_tax);
 if(sellTax!==null&&sellTax>=0.1)signals.push(flag('Elevated sell tax','high','GoPlus',`Provider-reported sell tax: ${(sellTax*100).toFixed(1)}%.`));
 return {signals,contractOpenSource:d.is_open_source==='1'?true:d.is_open_source==='0'?false:null,holderCount:boundedNumber(d.holder_count),buyTax,sellTax,provider:'GoPlus'};
}
function normalizeHoneypot(raw){
 if(!raw||typeof raw!=='object')return null;
 const signals=[];const risk=raw.summary?.risk||'unknown';
 if(raw.honeypotResult?.isHoneypot===true)signals.push(flag('Honeypot sell restriction','critical','Honeypot.is',String(raw.honeypotResult.honeypotReason||'Sell simulation flagged a honeypot.').slice(0,180)));
 else if(risk==='high'||risk==='very_high'||risk==='honeypot')signals.push(flag('High simulation risk','high','Honeypot.is',`Provider risk category: ${risk}.`));
 if(raw.simulationSuccess===false)signals.push(flag('Sell simulation unavailable','info','Honeypot.is','Simulation did not complete; the absence of a honeypot flag is not proof of sellability.'));
 const sellTax=boundedNumber(raw.simulationResult?.sellTax),buyTax=boundedNumber(raw.simulationResult?.buyTax);
 if(sellTax!==null&&sellTax>=10)signals.push(flag('High sell tax','high','Honeypot.is',`Simulated sell tax: ${sellTax.toFixed(1)}%.`));
 const source=raw.contractCode?.rootOpenSource;
 if(source===false)signals.push(flag('Source verification incomplete','review','Honeypot.is','Root contract was not reported as open source.'));
 return {signals,simulationSuccess:raw.simulationSuccess===true,isHoneypot:raw.honeypotResult?.isHoneypot??null,risk, buyTax,sellTax,contractOpenSource:source??null};
}
function normalizePairs(raw,address){
 const data=Array.isArray(raw)?raw:[];
 const pairs=data.filter(p=>String(p.chainId).toLowerCase()==='base'&&(p.baseToken?.address?.toLowerCase()===address.toLowerCase()||p.quoteToken?.address?.toLowerCase()===address.toLowerCase()));
 pairs.sort((a,b)=>(Number(b?.liquidity?.usd)||0)-(Number(a?.liquidity?.usd)||0));
 const top=pairs[0];
 return {pairsFound:pairs.length,topPool:top?{dex:String(top.dexId||'Unknown').slice(0,40),liquidityUsd:boundedNumber(top.liquidity?.usd),volume24hUsd:boundedNumber(top.volume?.h24),pairAddress:top.pairAddress||null}:null,signals:top&&boundedNumber(top.liquidity?.usd)!==null&&Number(top.liquidity.usd)<10000?[flag('Limited reported liquidity','review','DEX Screener','Largest indexed pool reports less than $10,000 liquidity. Rapid price movement or difficult exits are possible.')]:[]};
}
export async function inspectBaseToken(address,{transport=fetch}={}){
 if(!hexAddress(address))fail('Enter a valid Base token contract address (0x + 40 hex characters).',400);
 const token=address.toLowerCase();
 const providers=[
  ['GoPlus',`https://api.gopluslabs.io/api/v1/token_security/${BASE_CHAIN}?contract_addresses=${token}`],
  ['Honeypot.is',`https://api.honeypot.is/v2/IsHoneypot?address=${token}&chainID=${BASE_CHAIN}`],
  ['DEX Screener',`https://api.dexscreener.com/token-pairs/v1/base/${token}`]
 ];
 const response=await Promise.allSettled(providers.map(async ([name,url])=>getJSON(url,{transport,headers:name==='GoPlus'&&process.env.GOPLUS_ACCESS_TOKEN?{authorization:`Bearer ${process.env.GOPLUS_ACCESS_TOKEN}`}:{}})));
 const sources=providers.map(([name],i)=>({name,status:response[i].status==='fulfilled'?'responded':'unavailable'}));
 let go=null,honey=null,pools=null;
 if(response[0].status==='fulfilled')try{go=normalizeGoPlus(response[0].value,token);}catch{}
 if(response[1].status==='fulfilled')try{honey=normalizeHoneypot(response[1].value);}catch{}
 if(response[2].status==='fulfilled')try{pools=normalizePairs(response[2].value,token);}catch{}
 sources[0].status=go?'available':'unavailable';sources[1].status=honey?'available':'unavailable';sources[2].status=pools?'available':'unavailable';
 const signals=[...(go?.signals||[]),...(honey?.signals||[]),...(pools?.signals||[])];
 const critical=signals.some(x=>x.severity==='critical'||x.severity==='high');
 const any=sources.some(x=>x.status==='available');
 const status=!any?'insufficient_evidence':critical?'elevated_risk':signals.some(x=>x.severity==='review')?'review_indicators':'no_critical_flags_observed';
 return {chainId:BASE_CHAIN,address:token,checkedAt:new Date().toISOString(),status,
  label:{insufficient_evidence:'Insufficient evidence',elevated_risk:'Elevated risk indicators',review_indicators:'Review indicators',no_critical_flags_observed:'No critical flags observed'}[status],
  signals,contract:{sourceVerified:go?.contractOpenSource??honey?.contractOpenSource??null,holderCount:go?.holderCount??null},
  saleSimulation:honey?{completed:honey.simulationSuccess,flaggedHoneypot:honey.isHoneypot,risk:honey.risk,buyTaxPercent:honey.buyTax,sellTaxPercent:honey.sellTax}:null,
  market:pools?{pairsFound:pools.pairsFound,topPool:pools.topPool}:null,sources,
  coverage:'Base Mainnet only. Provider scans can be partial, delayed, inaccurate or unavailable. Liquidity and contract configuration can change rapidly.',
  disclaimer:'This is not a safety certificate, scam determination, trading recommendation, endorsement, or guarantee that the token can be sold. Confirm the exact contract and independently research before taking risk.'};
}
