/** Optional local presentation metadata, never used for availability or booking decisions. */
export const demoCatalog:Record<string,{image:string;cuisine:string;price:string;address:string;features:string[];story:string}>={
  r_sakura:{image:'/images/sora.png',cuisine:'Japanese',price:'$$$',address:'12 Lantern Lane, Sakura District (fictional)',features:['Indoor dining','Garden terrace'],story:'A calm Japanese kitchen where seasonal plates and good conversation share the table.'},
  r_oliva:{image:'/images/bella.png',cuisine:'Italian',price:'$$',address:'8 Olive Square, Old Town (fictional)',features:['Family friendly','Large tables'],story:'Fresh pasta, familiar faces, and room for the whole family.'},
  r_tide:{image:'/images/harbor.png',cuisine:'Seafood',price:'$$$$',address:'3 Ocean Walk, Harbor Quarter (fictional)',features:['Scenic setting','Intimate dining'],story:'A thoughtful seafood menu inspired by long evenings beside the water.'},
  r_commons:{image:'/images/hero.png',cuisine:'Casual dining',price:'$',address:'24 Commons Street, Central Quarter (fictional)',features:['Group friendly','Relaxed dining'],story:'An easygoing neighborhood gathering place for everyday celebrations.'}
};
