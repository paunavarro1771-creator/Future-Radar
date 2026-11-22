'use strict';
// Fetch verified provider responses and persist them as a Git-tracked snapshot.
// Runs in GitHub Actions; no paid API or secret required.
const fs=require('node:fs/promises');
const path=require('node:path');
const ROOT='https://www.futureradar.es';
const OUT=path.join(__dirname,'../data/u17-2026-snapshot.json');
const start='2026-11-19',end='2026-12-13';
const day=86400000;
const dates=[];
for(let t=Date.parse(start+'T00:00:00Z');t<=Date.parse(end+'T00:00:00Z');t+=day)dates.push(new Date(t).toISOString().slice(0,10));
async function main(){
  // Smaller date windows avoid overloading the existing provider and allow
  // preserving successfully retrieved dates when another date fails.
  const batches=[];
  for(let i=0;i<dates.length;i+=5)batches.push(dates.slice(i,i+5));
  const allMatches=[];
  const failedBatches=[];
  for(const batch of batches){
    const url=ROOT+'/api/data-engine?competition=fifa-u17-world-cup-2026&dates='+batch.join(',');
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),18000);
    try{
      const response=await fetch(url,{signal:controller.signal,headers:{
        'Accept':'application/json','User-Agent':'FutureRadarFC-DataEngine-Archive/1.0'}});
      if(!response.ok)throw Error('HTTP '+response.status);
      const payload=await response.json();
      if(!payload.available||!Array.isArray(payload.matches)||payload.partial||
         payload.coveredDates!==batch.length)throw Error('Incomplete provider response');
      allMatches.push(...payload.matches);
    }catch(error){
      failedBatches.push({dates:batch,error:String(error.message).slice(0,100)});
    }finally{clearTimeout(timeout);}
  }
  if(!allMatches.length)throw Error('No complete date windows returned; keeping previous archive');
  // An incomplete collection is explicitly marked as partial, not "live".
  const payload={matches:allMatches,partial:failedBatches.length>0};
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
    if(JSON.stringify(old&&{...old,archivedAt:undefined})!==JSON.stringify(next)){
      changed++;
      map.set(match.id,{...next,archivedAt:new Date().toISOString()});
    }
  }
  if(!changed){console.log('No match changes; failed windows:',failedBatches.length);return;}
  const result={competitionId:'fifa-u17-world-cup-2026',schemaVersion:1,
    archivedAt:new Date().toISOString(),source:'Existing Future Radar provider aggregator',
    realtime:false,partial:payload.partial,failedDateWindows:failedBatches.map(b=>b.dates),matches:[...map.values()].sort((a,b)=>a.date.localeCompare(b.date))};
  await fs.mkdir(path.dirname(OUT),{recursive:true});
  await fs.writeFile(OUT,JSON.stringify(result,null,2)+'\n');
  console.log('Archived',result.matches.length,'matches');
}
main().catch(err=>{console.error(err.message);process.exitCode=1;});
