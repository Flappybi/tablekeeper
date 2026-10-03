import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import { ApiError, body, check } from './errors.js';
import { Store } from './store.js';
import { Domain } from './domain.js';
import { demoFixture } from './demo.js';
export async function createApp({database=':memory:',seed=false,now=Date.now,logger=false,staticRoot=fileURLToPath(new URL('../client/',import.meta.url))}={}) {
  const store=new Store(database), app=Fastify({logger,bodyLimit:16*1024*1024});
  const run=(fn: (d: Domain)=>any,write=false)=>store.transaction(s=>fn(new Domain(s,now)),write);
  if(seed) run(d=>{if(['users','tokens','restaurants','reservations','receipts'].every(k=>d.s[k].length===0))d.reset(demoFixture());},true);
  app.addHook('onClose',async()=>store.close());
  app.setErrorHandler((error: any,request,reply)=>{
    if(error instanceof ApiError)return reply.code(error.status).send({error:{code:error.code,message:error.message}});
    if(error.statusCode===400 || (typeof error.code==='string' && error.code.startsWith('FST_ERR_CTP')))return reply.code(400).send({error:{code:'malformed_request',message:'Send valid JSON.'}});
    request.log.error(error); return reply.code(500).send({error:{code:'internal_error',message:'Operation failed.'}});
  });
  const token=(req: any)=>typeof req.headers.authorization==='string' && /^Bearer [^\s]+$/.test(req.headers.authorization) ? req.headers.authorization.slice(7):undefined;
  const read=(fn: any)=>(req: any)=>run(d=>fn(d,d.user(token(req)),req));
  const write=(fn: any)=>(req: any)=>{const b=body(req.body??{});return run(d=>fn(d,d.user(token(req)),req,b),true);};
  const idem=(fn: any)=>async(req: any,reply: any)=>{
    const b=body(req.body); const result=run(d=>{const u=d.user(token(req));return d.idempotent(u,req.method,req.url.split('?')[0],req.headers['idempotency-key'],b,()=>fn(d,u,req,b));},true);
    return reply.code(result.status).send(result.body);
  };
  app.get('/health',()=>run(()=>({status:'ok'})));
  app.post('/_test/reset',async(req,reply)=>{run(d=>d.reset(body(req.body)),true);return reply.code(204).send();});
  app.get('/_test/export',()=>run(d=>d.export()));
  app.post('/_test/import',async(req,reply)=>{run(d=>d.import(body(req.body)),true);return reply.code(204).send();});
  app.post('/auth/signup',async(req,reply)=>reply.code(201).send(run(d=>d.signup(body(req.body)),true)));
  app.post('/auth/login',req=>run(d=>d.login(body(req.body)),true));
  app.get('/restaurants',()=>run(d=>({restaurants:d.s.restaurants.map(({id,name,timezone})=>({id,name,timezone}))})));
  app.get<{Params:{id:string}}>('/restaurants/:id',req=>run(d=>structuredClone(d.restaurant(req.params.id))));
  app.get('/availability',req=>run(d=>d.availability(req.query)));
  app.post('/reservations',idem((d,u,req,b)=>d.create(u,b)));
  app.get('/reservations',read((d,u)=>({reservations:d.s.reservations.filter(r=>r.user_id===u.id).sort((a,b)=>Date.parse(b.starts_at)-Date.parse(a.starts_at)).map(r=>d.view(r))})));
  app.get('/reservations/:reference',read((d,u,req)=>d.view(d.owned(req.params.reference,u))));
  app.post('/reservations/:reference/cancel',write((d,u,req)=>d.cancel(u,req.params.reference)));
  app.patch('/reservations/:reference',write((d,u,req,b)=>d.amend(u,[{...b,reference:req.params.reference}])[0]));
  app.post('/reservation-moves',idem((d,u,req,b)=>({reservations:d.amend(u,b.moves)})));
  if(existsSync(staticRoot)){
    await app.register(fastifyStatic,{root:staticRoot,prefix:'/',wildcard:false,index:false});
    for(const route of ['/','/signup','/login','/lookup'])app.get(route,(req,reply)=>reply.header('Cache-Control','no-store').sendFile('index.html'));
  }
  app.setNotFoundHandler((req,reply)=>reply.code(404).send({error:{code:'not_found',message:'Resource not found.'}}));
  await app.ready(); return app;
}
