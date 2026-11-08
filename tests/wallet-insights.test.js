import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectWallet,summarizeTransactions} from '../lib/wallet-insights.js';
const A='0x'+'1'.repeat(40),B='0x'+'2'.repeat(40),C='0x'+'3'.repeat(40);
const tx=(from,to,hash,value='1000000000000000')=>({from:{hash:from},to:{hash:to},hash:'0x'+hash.repeat(64),value,gas_used:'21000',gas_price:'1000000000',status:'ok',timestamp:'2026-11-08T00:00:00Z'});
const rpc=async(method)=>({eth_chainId:'0x2105',eth_getBalance:'0x16345785d8a0000',eth_getTransactionCount:'0x2a'})[method];
test('mainnet wallet inspection shows real RPC fields even without indexer',async()=>{
 const data=await inspectWallet(A,{rpcCall:rpc,key:''});
 assert.equal(data.chainId,8453);assert.equal(data.balanceEth,'0.100000');assert.equal(data.outgoingNonce,42);
 assert.equal(data.indexed,false);assert.equal(data.history,null);assert.match(data.limitNote,/unavailable/);
});
test('indexed recent activity calculates outgoing native ETH, gas, and repeating counterparties',async()=>{
 const items=[tx(A,B,'a'),tx(A,B,'b'),tx(C,A,'c')];
 const summary=summarizeTransactions(A,items);
 assert.equal(summary.outgoing,2);assert.equal(summary.incoming,1);assert.equal(summary.sentEth,'0.002000');
 assert.equal(summary.gasEth,'0.000042');assert.equal(summary.counterparties[0].address,B);
 assert.equal(summary.counterparties[0].interactions,2);
 const read=await inspectWallet(A,{rpcCall:rpc,key:'test-secret',transport:async(url)=>{
  const u=new URL(url);assert.equal(u.searchParams.get('apikey'),'test-secret');return {ok:true,json:async()=>({items,next_page_params:{block_number:5}})};
 }});
 assert.equal(read.indexed,true);assert.equal(read.history.sampled,3);assert.equal(read.historyHasMore,true);
 assert.match(read.limitNote,/sample totals/);
});
test('indexed data errors never fabricate spending or fabricate past transactions',async()=>{
 const read=await inspectWallet(A,{rpcCall:rpc,key:'test-secret',transport:async()=>({ok:false,status:429})});
 assert.equal(read.balanceEth,'0.100000');assert.equal(read.history,null);
 assert.match(read.limitNote,/could not be retrieved/);
});
test('refuse wrong RPC chain and addresses before querying an indexer',async()=>{
 await assert.rejects(inspectWallet('not-wallet',{rpcCall:rpc}));
 await assert.rejects(inspectWallet(A,{rpcCall:async m=>m==='eth_chainId'?'0x1':'0x1'}),/not Base Mainnet/);
});
