'use strict';
// Optional, server-side-only API-Football adapter. Requires API_FOOTBALL_KEY and
// API_FOOTBALL_U17_LEAGUE_ID in Vercel. Never expose the key in client code.
// Coverage is verified from provider responses, never assumed.
const ROOT='https://v3.football.api-sports.io';
const key=()=>process.env.API_FOOTBALL_KEY||'';
const leagueId=()=>Number(process.env.API_FOOTBALL_U17_LEAGUE_ID)||0;
const cache=new Map();
async function request(path,params={}){
  if(!key())throw new Error('API_FOOTBALL_KEY not configured');
  const cacheKey=path+JSON.stringify(params),cached=cache.get(cacheKey);
  if(cached&&cached.expires>Date.now())return cached.data;
  const u=new URL(ROOT+path);
  Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null)u.searchParams.set(k,String(v))});
  const r=await fetch(u,{headers:{'x-apisports-key':key()}});
  if(!r.ok)throw new Error('API-Football HTTP '+r.status);
  const data=await r.json();
  if(data.errors && Object.keys(data.errors).length)throw new Error('API-Football provider error');
  const result=data.response||[];
  const ttl=path==='/fixtures'?60*60*1000:path==='/fixtures/lineups'?60*60*1000:15*60*1000;
  cache.set(cacheKey,{data:result,expires:Date.now()+ttl});
  return result;
}
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/u\s*-?\s*17/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function toMatch(row,codeForTeam){
  const homeCode=codeForTeam(row.teams?.home?.name||''),awayCode=codeForTeam(row.teams?.away?.name||'');
  if(!homeCode||!awayCode)return null;
  const date=String(row.fixture?.date||'').slice(0,10),short=row.fixture?.status?.short||'';
  const status=['FT','AET','PEN'].includes(short)?'FT':['1H','2H','HT','ET','BT','P','LIVE'].includes(short)?'LIVE':'SCHEDULED';
  return {id:String(row.fixture.id),date,homeCode,awayCode,matchKey:`${date}:${homeCode}:${awayCode}`,
    competitionId:'fifa-u17-world-cup-2026',homeTeamId:`national:${homeCode}:u17`,awayTeamId:`national:${awayCode}:u17`,
    home:row.teams.home.name,away:row.teams.away.name,homeScore:row.goals?.home??null,awayScore:row.goals?.away??null,
    status,statusDescription:row.fixture?.status?.long||'',minute:row.fixture?.status?.elapsed??null,
    startTimestamp:row.fixture?.timestamp??null,sourceType:'api_football'};
}
async function fixtures(dates,codeForTeam){
  if(!leagueId()||!key())return {configured:false,matches:[]};
  // A single season query covers all dates; cache at the edge and avoid per-date requests.
  const rows=await request('/fixtures',{league:leagueId(),season:2026});
  const wanted=new Set(dates);
  const matches=rows.map(row=>toMatch(row,codeForTeam)).filter(row=>row&&wanted.has(row.date));
  return {configured:true,matches,coverageCount:matches.length};
}
async function details(id){
  if(!key()||!/^\d+$/.test(String(id)))return null;
  const [stats,xi,events]=await Promise.allSettled([
    request('/fixtures/statistics',{fixture:id}),
    request('/fixtures/lineups',{fixture:id}),
    request('/fixtures/events',{fixture:id})
  ]);
  const get=r=>r.status==='fulfilled'?r.value:[];
  const statRows=get(stats),lineupRows=get(xi),eventRows=get(events);
  const byTeam=statRows.map(t=>Object.fromEntries((t.statistics||[]).map(s=>[s.type,s.value])));
  const statistics=byTeam.length===2?[...new Set([...Object.keys(byTeam[0]),...Object.keys(byTeam[1])])].map(name=>({name,home:byTeam[0][name]??null,away:byTeam[1][name]??null})).filter(s=>s.home!==null||s.away!==null):null;
  const players=team=>(team?.startXI||[]).map(x=>({name:x.player?.name||'',number:x.player?.number??null,position:x.player?.pos||''})).filter(x=>x.name);
  const lineups=lineupRows.length===2?{home:players(lineupRows[0]),away:players(lineupRows[1]),homeFormation:lineupRows[0].formation||null,awayFormation:lineupRows[1].formation||null}:null;
  const incidents=eventRows.map(e=>({type:e.type||'',name:e.player?.name||'',minute:e.time?.elapsed??null,detail:e.detail||''}));
  return {statistics,lineups,incidents,source:'API-Football',sourceType:'api_football',updatedAt:new Date().toISOString()};
}
module.exports={fixtures,details,configured:()=>Boolean(key()&&leagueId())};
