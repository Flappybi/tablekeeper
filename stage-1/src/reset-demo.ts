import { createApp } from './app.js';
import { demoFixture } from './demo.js';
const origin=process.env.BASE_URL || 'http://127.0.0.1:8080';
if(process.env.BASE_URL){const r=await fetch(`${origin}/_test/reset`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(demoFixture())});if(r.status!==204)throw new Error(`Reset failed: HTTP ${r.status}`);}
else {const app=await createApp({database:process.env.SQLITE_PATH || 'data/stage1.sqlite'});const r=await app.inject({method:'POST',url:'/_test/reset',payload:demoFixture()});if(r.statusCode!==204)throw new Error(`Reset failed: HTTP ${r.statusCode}`);await app.close();}
console.log('Local demo reset complete.');
