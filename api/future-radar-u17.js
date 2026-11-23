'use strict';
/**
 * Future Radar FC owned, free U17 match API.
 * GET /api/future-radar-u17                 all fixtures
 * GET /api/future-radar-u17?date=YYYY-MM-DD date filter
 * GET /api/future-radar-u17?date=...&home=QAT&away=PAN detailed match
 * GET /api/future-radar-u17?health=1        coverage & freshness
 * Official FIFA reports override unofficial archive; missing values stay null.
 * This API serves collected evidence, not invented real-time information.
 */
const fixtures=require('../u17-world-cup-2026.json');
const reports=require('../data/fifa-u17-2026-official-match-reports.json');
const snapshot=require('../data/u17-2026-snapshot.json');
const fifaResults=require('../data/fifa-u17-2026-official-results.json');
const clean=x=>String(x||'').trim().toUpperCase();
const key=(d,h,a)=>[d,clean(h),clean(a)].join(':');
const official=new Map(reports.reports.map(x=>[key(x.date,x.homeCode,x.awayCode),x]));
const archived=new Map(snapshot.matches.map(x=>[key(x.date,x.home?.code,x.away?.code),x]));
const verifiedResults=new Map(fifaResults.results.map(x=>[x.matchKey,x]));
function normalize(f){
 const id=key(f.date,f.home,f.away),o=official.get(id),a=archived.get(id),v=verifiedResults.get(id);
 const hasArchivedScore=Number.isInteger(a?.home?.score)&&Number.isInteger(a?.away?.score);
 const hasOfficialScore=Number.isInteger(o?.homeScore)&&Number.isInteger(o?.awayScore);
 const scoreSource=hasOfficialScore?'official_fifa_report':v?'official_fifa_article':hasArchivedScore?'unofficial_archive':null;
 const status=hasOfficialScore||v?'FT':(a?.status||'SCHEDULED');
 return {id,matchKey:id,competitionId:'fifa-u17-world-cup-2026',
  date:f.date,matchNumber:f.number,stage:f.stage,group:f.group||null,
  homeCode:f.home,awayCode:f.away,
  homeScore:hasOfficialScore?o.homeScore:v?v.homeScore:hasArchivedScore?a.home.score:null,
  awayScore:hasOfficialScore?o.awayScore:v?v.awayScore:hasArchivedScore?a.away.score:null,
  status:status==='SCHEDULED'?'SCHEDULED':status,
  statusDescription:status==='FT'?'Finalizado':status,
  timeQatar:f.timeQatar,pitch:f.pitch,
  statistics:o?.statistics||null,lineups:o?.lineups||null,incidents:o?.incidents||[],
  source:o?.sourceUrl||v?.sourceUrl||a?.source||null,sourceType:scoreSource,
  verifiedOfficial:!!(o||v),statisticsAvailable:!!o?.statistics?.length,
  lineupsAvailable:!!(o?.lineups?.home?.length===11&&o?.lineups?.away?.length===11),
  archiveTimestamp:a?.archivedAt||snapshot.archivedAt||null,
  officialReportUrl:o?.sourceUrl||null,
  event:{homeScore:hasOfficialScore?o.homeScore:v?v.homeScore:hasArchivedScore?a.home.score:null,
    awayScore:hasOfficialScore?o.awayScore:v?v.awayScore:hasArchivedScore?a.away.score:null,
    status,statusDescription:status==='FT'?'Finalizado':status},
  updatedAt:a?.archivedAt||null};
}
module.exports=(req,res)=>{
 res.setHeader('Cache-Control','public, s-maxage=120, stale-while-revalidate=300');
 if(req.method!=='GET')return res.status(405).json({available:false,error:'method_not_allowed'});
 const matches=fixtures.matches.map(normalize);
 const coverage={fixtures:matches.length,officialReports:matches.filter(m=>m.statisticsAvailable).length,
  verifiedOfficialScores:matches.filter(m=>m.verifiedOfficial&&m.homeScore!==null).length,
  completeLineups:matches.filter(m=>m.lineupsAvailable).length,
  archiveWithScores:matches.filter(m=>m.homeScore!==null&&m.awayScore!==null).length,
  archiveTimestamp:snapshot.archivedAt,realtime:false};
 if(req.query?.health==='1')return res.status(200).json({available:true,coverage});
 const date=String(req.query?.date||''),home=clean(req.query?.home),away=clean(req.query?.away);
 if(home||away){
  if(!date||!home||!away)return res.status(400).json({available:false,error:'date_home_away_required'});
  const match=matches.find(m=>m.date===date&&m.homeCode===home&&m.awayCode===away);
  return match?res.status(200).json({available:true,...match}):res.status(404).json({available:false,error:'match_not_found'});
 }
 return res.status(200).json({available:true,coverage,matches:date?matches.filter(m=>m.date===date):matches});
};
