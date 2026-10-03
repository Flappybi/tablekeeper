import { DateTime } from 'luxon';
import { check } from './errors.js';
export const weekdays = ['mon','tue','wed','thu','fri','sat','sun'];
export const dateValid = (v: any) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && DateTime.fromISO(v, {zone:'UTC'}).isValid;
export const clockValid = (v: any) => typeof v === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
export const minutes = (v: string) => Number(v.slice(0,2))*60 + Number(v.slice(3));
export const clock = (v: number) => `${String(Math.floor(v/60)).padStart(2,'0')}:${String(v%60).padStart(2,'0')}`;
export const stamp = (d: DateTime) => d.toISO({suppressMilliseconds:true, includeOffset:true});
export function local(value: any, zone: string) {
  check(value !== undefined); check(typeof value === 'string', 400, 'malformed_request');
  check(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) && dateValid(value.slice(0,10)) && clockValid(value.slice(11)));
  const d = DateTime.fromISO(value, {zone});
  check(d.isValid && d.toFormat("yyyy-MM-dd'T'HH:mm") === value, 422, 'invalid_local_time');
  return d.getPossibleOffsets().sort((a,b) => a.toMillis()-b.toMillis())[0];
}
export function interval(value: any, restaurant: any) {
  const start = local(value, restaurant.timezone), day = weekdays[DateTime.fromISO(value.slice(0,10),{zone:'UTC'}).weekday-1];
  const h = restaurant.opening_hours.find(h => h.weekday === day); check(h,422,'outside_opening_hours');
  const wall = minutes(value.slice(11)); check(wall >= minutes(h.opens) && wall < minutes(h.closes),422,'outside_opening_hours');
  check((wall-minutes(h.opens))%restaurant.slot_minutes === 0,422,'not_on_slot_grid');
  const end = start.plus({minutes:restaurant.reservation_duration_minutes});
  const close = local(`${value.slice(0,10)}T${h.closes}`,restaurant.timezone);
  check(end.toMillis() <= close.toMillis(),422,'outside_opening_hours');
  return {starts_at_local:value, starts_at:stamp(start), ends_at:stamp(end)};
}
export const overlap = (a: any,b: any) => Date.parse(a.starts_at)<Date.parse(b.ends_at) && Date.parse(b.starts_at)<Date.parse(a.ends_at);
