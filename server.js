import http from 'node:http';
import {createHandler} from './lib/app.js';
const handler=createHandler();
const port=Number(process.env.PORT||3000);
http.createServer(handler).listen(port,'0.0.0.0',()=>console.log(`VERRIFT running on http://localhost:${port}`));
