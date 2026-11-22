'use strict';
// Fetch verified provider responses and persist them as a Git-tracked snapshot.
// Runs in GitHub Actions; no paid API or secret required.
const fs=require('node:fs/promises');
const path=require('node:path');
const ROOT='https://www.futureradar.es';
const OUT=path.join(__dirname,'../data/u17-2026-snapshot.json');
const start='2026-11-19',end='2026-11-27';
const day=86400000;
const dates=[];
for(let t=Date.parse(start+'T00:00:00Z');t<=Date.parse(end+'T00:00:00Z');t+=day)dates.push(new Date(t).toISOString().slice(0,10));
async function main(){
  const url=ROOT+'/api/data-engine?competition=fifa-u17-world-cup-2026&dates='+dates.join(',');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  let payload;
  try{
    const response=await fetch(url,{signal:controller.signal,headers:{'Accept':'application/json','User-Agent':'FutureRadarFC-DataEngine-Archive/1.0'}});
    if(!response.ok)throw Error('HTTP '+response.status);
    payload=await response.json();
  }finally{clearTimeout(timeout);}
  if(!payload.available||!Array.isArray(payload.matches)||!payload.matches.length)
    throw Error('No valid matches received; preserving previous snapshot');
  if(payload.partial)throw Error('Provider coverage partial; preserving previous snapshot');
  let previous={matches:[]};
  try{previous=JSON.parse(await fs.readFile(OUT,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  // Preserve historical matches absent from latest feed, but never replace a known
  // score with an unknown score. An older snapshot is not represented as live.
  const map=new Map((previous.matches||[]).filter(m=>m&&m.id).map(m=>[m.id,m]));
  let changed=0;
  for(const match of payload.matches){
    if(!match||!match.id||!match.date||!match.home||!match.away)continue;
    const old=map.get(match.id);
    const next={...match};
    if(old){
      if(next.home.score==null&&old.home?.score!=null)next.home.score=old.home.score;
      if(next.away.score==null&&old.away?.score!=null)next.away.score=old.away.score;
    }
    if(JSON.stringify(old?.match)!==JSON.stringify(next))changed++;
    map.set(match.id,{...next,archivedAt:new Date().toISOString()});
  }
  if(!changed){console.log('No changes');return;}
  const result={competitionId:'fifa-u17-world-cup-2026',schemaVersion:1,
    archivedAt:new Date().toISOString(),source:'Existing Future Radar provider aggregator',
    realtime:false,matches:[...map.values()].sort((a,b)=>a.date.localeCompare(b.date))};
  await fs.mkdir(path.dirname(OUT),{recursive:true});
  await fs.writeFile(OUT,JSON.stringify(result,null,2)+'\n');
  console.log('Archived',result.matches.length,'matches');
}
main().catch(err=>{console.error(err.message);process.exitCode=1;});
