import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { DateTime } from 'luxon';
import { check, canonical, integer, object, text } from './errors.js';
import { dateValid, clockValid, interval, local, stamp, weekdays, minutes, clock, overlap } from './time.js';
import { empty } from './store.js';
const hash = (value: string) => { const salt=randomBytes(16).toString('hex'); return `${salt}:${scryptSync(value,salt,32).toString('hex')}`; };
function matches(value: string, stored: string) { const [salt,key]=stored.split(':'); const expected=Buffer.from(key,'hex'), actual=scryptSync(value,salt,32); return expected.length===actual.length && timingSafeEqual(expected,actual); }
/** Required fixture fields distinguish absence/invalid values from JSON type errors. */
function field(record: any,key: string,type: 'string'|'number'|'array') {
  check(record[key]!==undefined);
  check(type==='array' ? Array.isArray(record[key]) : typeof record[key]===type,400,'malformed_request');
  return record[key];
}
export class Domain {
  constructor(public s: any, public now = Date.now) {}
  timestamp() { return new Date(this.now()).toISOString(); }
  user(token: string) { const id=this.s.tokens.find(t=>t.token===token)?.user_id, u=this.s.users.find(u=>u.id===id); check(u,401,'unauthenticated'); return u; }
  restaurant(id: string) { const r=this.s.restaurants.find(r=>r.id===id); check(r,404,'not_found'); return r; }
  owned(reference: string,user: any) { const r=this.s.reservations.find(r=>r.reference===reference && r.user_id===user.id); check(r,404,'not_found'); return r; }
  view(r: any) { const {user_id,table_id,...v}=r; return structuredClone({...v,...(r.table_ids.length===1?{table_id:r.table_ids[0]}:{})}); }
  tableSet(restaurant: any,b: any): string[] {
    check(!(Object.hasOwn(b,'table_id') && Object.hasOwn(b,'table_ids')));
    let ids: string[];
    if(Object.hasOwn(b,'table_ids')){
      check(Array.isArray(b.table_ids),400,'malformed_request');
      check(b.table_ids.length>0);
      ids=b.table_ids.map(id=>text(id));
      check(new Set(ids).size===ids.length);
      check(ids.length<=2,422,'combination_not_allowed');
    }else ids=[text(b.table_id)];
    check(ids.every(id=>restaurant.tables.some(t=>t.id===id)),404,'not_found');
    if(ids.length===2){const pair=restaurant.combinable.find(pair=>pair.every(id=>ids.includes(id)));check(pair,422,'combination_not_allowed');ids=[...pair];}
    return ids;
  }
  signup(b: any) {
    for (const key of ['email','password','display_name']) { check(b[key]!==undefined); check(typeof b[key]==='string',400,'malformed_request'); }
    check(/^[^\s@]+@[^\s@]+$/.test(b.email) && b.password.length>=8);
    check(!this.s.users.some(u=>u.email===b.email),409,'email_taken');
    const u={id:randomUUID(),email:b.email,display_name:b.display_name,password_hash:hash(b.password)};
    this.s.users.push(u); return this.session(u);
  }
  login(b: any) {
    check(b.email!==undefined && b.password!==undefined); check(typeof b.email==='string' && typeof b.password==='string',400,'malformed_request');
    const u=this.s.users.find(u=>u.email===b.email); check(u && matches(b.password,u.password_hash),401,'unauthenticated'); return this.session(u);
  }
  session(u: any) { const token=randomBytes(32).toString('hex'); this.s.tokens.push({token,user_id:u.id}); return {user_id:u.id,display_name:u.display_name,token}; }
  idempotent(user: any,method: string,path: string,key: any,b: any,action: ()=>any) {
    check(typeof key==='string' && key.length>0,400,'missing_idempotency_key'); check(key.length<=255);
    const old=this.s.receipts.find(r=>r.user_id===user.id && r.method===method && r.path===path && r.key===key);
    if (old) { check(old.body===canonical(b),409,'idempotency_key_reuse'); return {status:200,body:structuredClone(old.response)}; }
    const response=action(); this.s.receipts.push({user_id:user.id,method,path,key,body:canonical(b),response:structuredClone(response)}); return {status:201,body:response};
  }
  candidate(user: any,restaurant: any,b: any,old?: any) {
    const table_ids=this.tableSet(restaurant,b), capacity=table_ids.reduce((n,id)=>n+restaurant.tables.find(t=>t.id===id).capacity,0);
    check(integer(b.party_size,1)); check(b.party_size<=capacity,422,'party_exceeds_capacity');
    const range=interval(b.starts_at_local,restaurant);
    return {reservation_id:old?.reservation_id || randomUUID(),reference:old?.reference || this.reference(),restaurant_id:restaurant.id,table_ids,party_size:b.party_size,status:'confirmed',...range,created_at:old?.created_at || this.timestamp(),user_id:user.id};
  }
  reference() { let ref; do { ref=randomBytes(6).toString('hex').toUpperCase(); } while(this.s.reservations.some(r=>r.reference===ref)); return ref; }
  assertFree(candidates: any[],excluded=new Set()) {
    const occupied=this.s.reservations.filter(r=>r.status==='confirmed' && !excluded.has(r.reference));
    for (const r of candidates) { if(r.status!=='confirmed')continue;check(!occupied.some(o=>o.restaurant_id===r.restaurant_id && o.table_ids.some(id=>r.table_ids.includes(id)) && overlap(o,r)),409,'table_unavailable'); occupied.push(r); }
  }
  availability(q: any) {
    text(q.restaurant_id); check(dateValid(q.date)); check(typeof q.party_size==='string' && /^\d+$/.test(q.party_size) && integer(Number(q.party_size),1));
    const r=this.restaurant(q.restaurant_id), h=r.opening_hours.find(h=>h.weekday===weekdays[DateTime.fromISO(q.date,{zone:'UTC'}).weekday-1]);
    const response={restaurant_id:r.id,date:q.date,timezone:r.timezone,slots:[]}; if(!h) return response;
    for(let m=minutes(h.opens);m<minutes(h.closes);m+=r.slot_minutes) {
      let range; try { range=interval(`${q.date}T${clock(m)}`,r); } catch(e) { if(['outside_opening_hours','invalid_local_time'].includes(e.code)) continue; throw e; }
      const options=[...r.tables.map(t=>[t.id]),...r.combinable].map(table_ids=>({table_ids:[...table_ids],capacity:table_ids.reduce((n,id)=>n+r.tables.find(t=>t.id===id).capacity,0)})).filter(option=>option.capacity>=Number(q.party_size) && !this.s.reservations.some(o=>o.status==='confirmed' && o.restaurant_id===r.id && o.table_ids.some(id=>option.table_ids.includes(id)) && overlap(o,range)));
      response.slots.push({starts_at_local:range.starts_at_local,starts_at:range.starts_at,available_table_ids:options.filter(o=>o.table_ids.length===1).map(o=>o.table_ids[0]),available_options:options});
    }
    return response;
  }
  create(user: any,b: any) { const restaurant=this.restaurant(text(b.restaurant_id)), r=this.candidate(user,restaurant,b); this.assertFree([r]); this.s.reservations.push(r); return this.view(r); }
  editable(r: any) { check(r.status==='confirmed',409,'reservation_cancelled'); check(this.now()<Date.parse(r.starts_at)-this.restaurant(r.restaurant_id).cancellation_cutoff_minutes*60000,409,'cutoff_passed'); }
  amend(user: any,moves: any[]) {
    check(Array.isArray(moves) && moves.length>=1 && moves.length<=8 && moves.every(object));
    check(moves.every(m=>typeof m.reference==='string') && new Set(moves.map(m=>m.reference)).size===moves.length);
    const olds=[], next=[];
    for (const move of moves) {
      const r=this.owned(move.reference,user); if(olds.length) check(r.restaurant_id===olds[0].restaurant_id);
      this.editable(r);
      const input: any={table_ids:r.table_ids,starts_at_local:r.starts_at_local,party_size:r.party_size};
      if(Object.hasOwn(move,'table_id') || Object.hasOwn(move,'table_ids')) {delete input.table_ids;for(const key of ['table_id','table_ids'])if(Object.hasOwn(move,key))input[key]=move[key];}
      for(const key of ['starts_at_local','party_size'])if(Object.hasOwn(move,key))input[key]=move[key];
      next.push(this.candidate(user,this.restaurant(r.restaurant_id),input,r)); olds.push(r);
    }
    this.assertFree(next,new Set(olds.map(r=>r.reference)));
    next.forEach((r,i)=>{this.s.reservations[this.s.reservations.indexOf(olds[i])]=r;}); return next.map(r=>this.view(r));
  }
  cancel(user: any,ref: string) { const r=this.owned(ref,user); if(r.status==='cancelled') return this.view(r); this.editable(r); r.status='cancelled'; return this.view(r); }
  hours(h: any) {
    check(h!==undefined); check(Array.isArray(h),400,'malformed_request');
    for(const v of h){check(object(v),400,'malformed_request'); field(v,'weekday','string'); field(v,'opens','string'); field(v,'closes','string'); check(weekdays.includes(v.weekday) && clockValid(v.opens) && clockValid(v.closes) && minutes(v.opens)<minutes(v.closes));}
    check(new Set(h.map(v=>v.weekday)).size===h.length);
  }
  reset(f: any) {
    for(const key of ['users','restaurants','reservations'])field(f,key,'array');
    const state=empty(), d=new Domain(state,this.now);
    for(const u of f.users) { check(object(u),400,'malformed_request'); text(u.id); for(const key of ['email','password','display_name'])field(u,key,'string'); check(!state.users.some(v=>v.id===u.id || v.email===u.email)); state.users.push({id:u.id,email:u.email,display_name:u.display_name,password_hash:hash(u.password)}); }
    for(const r of f.restaurants) {
      check(object(r),400,'malformed_request'); text(r.id); field(r,'name','string'); field(r,'timezone','string'); check(DateTime.now().setZone(r.timezone).isValid);
      for(const key of ['slot_minutes','reservation_duration_minutes','cancellation_cutoff_minutes'])field(r,key,'number');
      check(integer(r.slot_minutes,1) && integer(r.reservation_duration_minutes,1) && integer(r.cancellation_cutoff_minutes,0)); d.hours(r.opening_hours);
      field(r,'tables','array'); const ids=new Set();
      const tables=r.tables.map(t=>{check(object(t),400,'malformed_request'); text(t.id); field(t,'label','string'); field(t,'capacity','number'); check(!ids.has(t.id) && integer(t.capacity,1)); ids.add(t.id); return {id:t.id,label:t.label,capacity:t.capacity};});
      const combinable=r.combinable===undefined?[]:field(r,'combinable','array');
      for(const pair of combinable){check(Array.isArray(pair),400,'malformed_request');check(pair.length===2);pair.forEach(id=>text(id));check(pair[0]!==pair[1] && pair.every(id=>ids.has(id)));}
      check(!state.restaurants.some(v=>v.id===r.id));
      state.restaurants.push({id:r.id,name:r.name,timezone:r.timezone,slot_minutes:r.slot_minutes,reservation_duration_minutes:r.reservation_duration_minutes,cancellation_cutoff_minutes:r.cancellation_cutoff_minutes,opening_hours:structuredClone(r.opening_hours.map(({weekday,opens,closes})=>({weekday,opens,closes}))),tables,combinable:structuredClone(combinable)});
    }
    for(const b of f.reservations) {
      check(object(b),400,'malformed_request'); text(b.id); field(b,'reference','string'); check(/^[A-Z0-9]{6,12}$/.test(b.reference)); text(b.user_id); const u=state.users.find(u=>u.id===b.user_id); check(u);
      text(b.restaurant_id);const r=d.restaurant(b.restaurant_id),table_ids=d.tableSet(r,b);check(integer(b.party_size,1));
      if(b.status!==undefined){field(b,'status','string');check(['confirmed','cancelled'].includes(b.status));}
      const start=local(b.starts_at_local,r.timezone); const record={reservation_id:b.id,reference:b.reference,restaurant_id:r.id,table_ids,party_size:b.party_size,status:b.status || 'confirmed',starts_at_local:b.starts_at_local,starts_at:stamp(start),ends_at:stamp(start.plus({minutes:r.reservation_duration_minutes})),created_at:d.timestamp(),user_id:u.id};
      check(!state.reservations.some(v=>v.reference===b.reference || v.reservation_id===b.id)); d.assertFree([record]); state.reservations.push(record);
    }
    Object.assign(this.s,state);
  }
  export() { return {track:'tablekeeper',format_version:1,state:structuredClone(this.s)}; }
  import(b: any) {
    check(b.track==='tablekeeper' && b.format_version===1 && object(b.state));
    const next=structuredClone(b.state);
    try {
      if(next.implemented_stage===1){validateStage1State(next);next.implemented_stage=2;next.restaurants.forEach(r=>{r.combinable=[];});next.reservations.forEach(r=>{r.table_ids=[r.table_id];delete r.table_id;});}
      validateState(next);
    } catch { check(false); }
    Object.assign(this.s,next);
  }
}
/** Validate portable snapshots completely before replacing any live record. */
export function validateState(s: any) {
  check(s.implemented_stage===2 && ['users','tokens','restaurants','reservations','receipts'].every(k=>Array.isArray(s[k])));
  const ids=(rows,key)=>check(new Set(rows.map(r=>r[key])).size===rows.length);
  ids(s.users,'id'); ids(s.users,'email'); ids(s.restaurants,'id'); ids(s.tokens,'token'); ids(s.reservations,'reference'); ids(s.reservations,'reservation_id');
  for(const u of s.users) check(object(u) && typeof u.id==='string' && u.id.length>0 && u.id.length<=64 && typeof u.email==='string' && typeof u.display_name==='string' && typeof u.password_hash==='string' && /^[a-f0-9]{32}:[a-f0-9]{64}$/.test(u.password_hash));
  for(const t of s.tokens) check(object(t) && typeof t.token==='string' && t.token.length>0 && s.users.some(u=>u.id===t.user_id));
  const d=new Domain(s);
  for(const r of s.restaurants) { check(object(r) && typeof r.id==='string' && r.id.length>0 && r.id.length<=64 && typeof r.name==='string' && typeof r.timezone==='string' && DateTime.now().setZone(r.timezone).isValid); check(integer(r.slot_minutes,1) && integer(r.reservation_duration_minutes,1) && integer(r.cancellation_cutoff_minutes,0)); d.hours(r.opening_hours); check(Array.isArray(r.tables) && r.tables.every(t=>object(t) && typeof t.id==='string' && t.id.length>0 && t.id.length<=64 && typeof t.label==='string' && integer(t.capacity,1))); ids(r.tables,'id');check(Array.isArray(r.combinable) && r.combinable.every(pair=>Array.isArray(pair) && pair.length===2 && pair[0]!==pair[1] && pair.every(id=>r.tables.some(t=>t.id===id)))); }
  for(const r of s.reservations) { check(object(r) && typeof r.reservation_id==='string' && r.reservation_id.length>0 && r.reservation_id.length<=64 && typeof r.reference==='string' && /^[A-Z0-9]{6,12}$/.test(r.reference) && ['confirmed','cancelled'].includes(r.status) && integer(r.party_size,1)); const restaurant=s.restaurants.find(v=>v.id===r.restaurant_id); check(restaurant && Array.isArray(r.table_ids) && canonical(d.tableSet(restaurant,{table_ids:r.table_ids}))===canonical(r.table_ids) && s.users.some(u=>u.id===r.user_id)); check(typeof r.starts_at_local==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(r.starts_at_local)); const start=local(r.starts_at_local,restaurant.timezone); check(Date.parse(r.starts_at)===start.toMillis() && Date.parse(r.ends_at)===start.plus({minutes:restaurant.reservation_duration_minutes}).toMillis() && typeof r.created_at==='string' && Number.isFinite(Date.parse(r.created_at))); }
  const confirmed=s.reservations.filter(r=>r.status==='confirmed'); for(let i=0;i<confirmed.length;i++) check(!confirmed.slice(i+1).some(r=>r.restaurant_id===confirmed[i].restaurant_id && r.table_ids.some(id=>confirmed[i].table_ids.includes(id)) && overlap(r,confirmed[i])));
  const receiptIds=new Set(); for(const r of s.receipts) { check(object(r) && s.users.some(u=>u.id===r.user_id) && r.method==='POST' && ['/reservations','/reservation-moves'].includes(r.path) && typeof r.key==='string' && r.key.length>0 && r.key.length<=255 && typeof r.body==='string' && object(r.response)); let parsed; try{parsed=JSON.parse(r.body);}catch{check(false);} check(object(parsed) && canonical(parsed)===r.body); const id=canonical([r.user_id,r.method,r.path,r.key]); check(!receiptIds.has(id)); receiptIds.add(id); }
}

/** Validate accepted Stage 1 snapshots before migration; receipt payloads stay untouched. */
function validateStage1State(s: any) {
  check(s.implemented_stage===1 && ['users','tokens','restaurants','reservations','receipts'].every(k=>Array.isArray(s[k])));
  const ids=(rows,key)=>check(new Set(rows.map(r=>r[key])).size===rows.length);
  ids(s.users,'id'); ids(s.users,'email'); ids(s.restaurants,'id'); ids(s.tokens,'token'); ids(s.reservations,'reference'); ids(s.reservations,'reservation_id');
  for(const u of s.users) check(object(u) && typeof u.id==='string' && u.id.length>0 && u.id.length<=64 && typeof u.email==='string' && typeof u.display_name==='string' && typeof u.password_hash==='string' && /^[a-f0-9]{32}:[a-f0-9]{64}$/.test(u.password_hash));
  for(const t of s.tokens) check(object(t) && typeof t.token==='string' && t.token.length>0 && s.users.some(u=>u.id===t.user_id));
  const d=new Domain(s);
  for(const r of s.restaurants) { check(object(r) && typeof r.id==='string' && r.id.length>0 && r.id.length<=64 && typeof r.name==='string' && typeof r.timezone==='string' && DateTime.now().setZone(r.timezone).isValid); check(integer(r.slot_minutes,1) && integer(r.reservation_duration_minutes,1) && integer(r.cancellation_cutoff_minutes,0)); d.hours(r.opening_hours); check(Array.isArray(r.tables) && r.tables.every(t=>object(t) && typeof t.id==='string' && t.id.length>0 && t.id.length<=64 && typeof t.label==='string' && integer(t.capacity,1))); ids(r.tables,'id'); }
  for(const r of s.reservations) { check(object(r) && typeof r.reservation_id==='string' && r.reservation_id.length>0 && r.reservation_id.length<=64 && typeof r.reference==='string' && /^[A-Z0-9]{6,12}$/.test(r.reference) && ['confirmed','cancelled'].includes(r.status) && integer(r.party_size,1)); const restaurant=s.restaurants.find(v=>v.id===r.restaurant_id); check(restaurant && restaurant.tables.some(t=>t.id===r.table_id) && s.users.some(u=>u.id===r.user_id)); check(typeof r.starts_at_local==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(r.starts_at_local)); const start=local(r.starts_at_local,restaurant.timezone); check(Date.parse(r.starts_at)===start.toMillis() && Date.parse(r.ends_at)===start.plus({minutes:restaurant.reservation_duration_minutes}).toMillis() && typeof r.created_at==='string' && Number.isFinite(Date.parse(r.created_at))); }
  const confirmed=s.reservations.filter(r=>r.status==='confirmed'); for(let i=0;i<confirmed.length;i++) check(!confirmed.slice(i+1).some(r=>r.restaurant_id===confirmed[i].restaurant_id && r.table_id===confirmed[i].table_id && overlap(r,confirmed[i])));
  const receiptIds=new Set(); for(const r of s.receipts) { check(object(r) && s.users.some(u=>u.id===r.user_id) && r.method==='POST' && ['/reservations','/reservation-moves'].includes(r.path) && typeof r.key==='string' && r.key.length>0 && r.key.length<=255 && typeof r.body==='string' && object(r.response)); let parsed; try{parsed=JSON.parse(r.body);}catch{check(false);} check(object(parsed) && canonical(parsed)===r.body); const id=canonical([r.user_id,r.method,r.path,r.key]); check(!receiptIds.has(id)); receiptIds.add(id); }
}
