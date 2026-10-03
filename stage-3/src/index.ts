import { createApp } from './app.js';
const app=await createApp({database:process.env.SQLITE_PATH || 'data/stage2.sqlite',seed:process.env.DEMO_SEED!=='0',logger:true});
await app.listen({host:'0.0.0.0',port:Number(process.env.PORT || 8080)});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});
