/* Future Radar FC shared data gateway. Reuses in-flight requests and immutable snapshots. */
(function(global){'use strict';
 const cache=new Map();
 const routes=Object.freeze({players:'/future-radar-players.json',u17:'/u17-world-cup-2026.json',u17Squads:'/fifa-u17-world-cup-2026-squads.json',youth:'/uefa-youth-league-2026-27.json'});
 function load(key,{refresh=false}={}){
  const url=routes[key];if(!url)return Promise.reject(new Error('Unknown dataset '+key));
  if(!refresh&&cache.has(key))return cache.get(key);
  const promise=fetch(url).then(r=>{if(!r.ok)throw new Error('Dataset '+key+': HTTP '+r.status);return r.json()}).catch(err=>{cache.delete(key);throw err});
  cache.set(key,promise);return promise;
 }
 function response(key){return load(key).then(data=>({ok:true,json:async()=>data}));}
 function match(competition,params){
  const path=competition==='u17'?'/api/future-radar-u17':competition==='youth'?'/api/youth-match-stats':null;
  if(!path)return Promise.reject(new Error('Unknown competition'));
  return fetch(path+'?'+new URLSearchParams(params),{cache:'no-store'}).then(r=>r.json().then(data=>{if(!r.ok)throw new Error(data?.message||data?.error||'HTTP '+r.status);return data}));
 }
 global.FutureRadarData=Object.freeze({load,response,match,routes});
})(window);
