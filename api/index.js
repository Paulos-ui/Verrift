import {createHandler} from '../lib/app.js';
const handle=createHandler();
export default function handler(req,res){
 const url=new URL(req.url,'http://internal');
 const routed=url.searchParams.get('__route');
 if(routed){
   url.searchParams.delete('__route');
   req.url=(routed==='__healthz'?'/healthz':'/api/'+routed)+(url.search||'');
 }
 return handle(req,res);
}
