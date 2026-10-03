/** Bundled reproducible local fixtures: synthetic restaurants and safe local accounts. */
export function demoFixture() {
  const configs=[
    {id:'r_sakura',name:'Sakura Japanese Kitchen',timezone:'Asia/Tokyo',opens:'17:00',closes:'23:00',duration:90,cutoff:120,capacities:[2,2,4,4]},
    {id:'r_oliva',name:'Oliva Family Trattoria',timezone:'Europe/Rome',opens:'12:00',closes:'22:00',duration:120,cutoff:60,capacities:[4,6,8]},
    {id:'r_tide',name:'High Tide Seafood',timezone:'America/New_York',opens:'18:00',closes:'23:00',duration:90,cutoff:180,capacities:[2,4,4]},
    {id:'r_commons',name:'The Commons Casual Dining',timezone:'Asia/Jakarta',opens:'11:00',closes:'23:00',duration:60,cutoff:30,capacities:[2,4,4,6]}
  ];
  return {
    users:[{id:'demo_customer',email:'customer@demo.invalid',password:'tablekeeper-demo',display_name:'Demo Customer'},{id:'demo_manager',email:'manager@demo.invalid',password:'tablekeeper-demo',display_name:'Demo Manager (customer permissions in Stage 1)'}],
    restaurants:configs.map(c=>({id:c.id,name:c.name,timezone:c.timezone,slot_minutes:30,reservation_duration_minutes:c.duration,cancellation_cutoff_minutes:c.cutoff,opening_hours:['mon','tue','wed','thu','fri','sat','sun'].map(weekday=>({weekday,opens:c.opens,closes:c.closes})),tables:c.capacities.map((capacity,i)=>({id:`${c.id}_t${i+1}`,label:`Table ${i+1}`,capacity})),combinable:c.capacities.length>=4?[[`${c.id}_t1`,`${c.id}_t2`],[`${c.id}_t3`,`${c.id}_t4`]]:[[`${c.id}_t1`,`${c.id}_t2`]]})),
    reservations:[...configs.map((c,i)=>({id:`demo_booking_${i+1}`,reference:`DEMO000${i+1}`,user_id:'demo_customer',restaurant_id:c.id,table_id:`${c.id}_t1`,party_size:2,starts_at_local:'2030-01-07T19:00'})),{id:'demo_cancelled_pair',reference:'DEMO0005',user_id:'demo_customer',restaurant_id:'r_sakura',table_ids:['r_sakura_t1','r_sakura_t2'],party_size:4,starts_at_local:'2030-01-07T19:00',status:'cancelled'}]
  };
}
