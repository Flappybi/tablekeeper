export interface User {user_id:string;display_name:string;token:string}
export interface DiningTable {id:string;label:string;capacity:number}
export interface Restaurant {id:string;name:string;timezone:string;tables:DiningTable[];combinable:string[][];opening_hours:{weekday:string;opens:string;closes:string}[];reservation_duration_minutes:number;cancellation_cutoff_minutes:number;slot_minutes:number}
export interface Reservation {reservation_id:string;reference:string;restaurant_id:string;table_id?:string;table_ids?:string[];party_size:number;status:'confirmed'|'cancelled';starts_at_local:string;starts_at:string;ends_at:string;created_at:string}
export interface Slot {starts_at_local:string;starts_at:string;available_table_ids:string[];available_options:{table_ids:string[];capacity:number}[]}
export interface Availability {restaurant_id:string;date:string;timezone:string;slots:Slot[]}
export class ApiError extends Error {constructor(public status:number,public code:string,message:string){super(message)}}
export class Uncertain extends Error {}
export async function api<T>(path:string,{method='GET',body,token,key}:{method?:string;body?:unknown;token?:string;key?:string}={}):Promise<T>{
  let response:Response;
  try{response=await fetch(path,{method,headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:`Bearer ${token}`} : {}),...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});}
  catch{throw new Uncertain('The connection was interrupted. Your request may have reached the restaurant.');}
  let value:unknown;
  try{value=await response.json();}catch{if(response.ok)throw new Uncertain('The response could not be read. Your request may have reached the restaurant.');throw new ApiError(response.status,'request_failed','The request was refused. Please try again.');}
  if(!response.ok){const error=(value as {error?:{code?:string;message?:string}})?.error;throw new ApiError(response.status,error?.code || 'request_failed',error?.message || 'The request was refused.');}
  return value as T;
}
export const reservationTables=(r:Reservation)=>r.table_ids || (r.table_id?[r.table_id]:[]);
export const errorMessage=(e:unknown)=>e instanceof Error?e.message:'Something went wrong. Please try again.';
export function loadUser():User|null{try{const u=JSON.parse(localStorage.getItem('tablekeeper.stage2.auth') || 'null');return u && typeof u.token==='string' && typeof u.display_name==='string'?u:null;}catch{return null;}}
/** getRandomValues works on plain HTTP judging hostnames; UUID secure-context support is unnecessary. */
export function requestKey(){const bytes=new Uint8Array(16);globalThis.crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
