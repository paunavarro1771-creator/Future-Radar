'use strict';
const reports=require('../data/fifa-u17-2026-official-match-reports.json');
module.exports=(req,res)=>{
 res.setHeader('Cache-Control','public, s-maxage=3600');
 if(req.method!=='GET')return res.status(405).json({available:false,error:'method_not_allowed'});
 const date=String(req.query?.date||''),home=String(req.query?.home||'').toUpperCase(),away=String(req.query?.away||'').toUpperCase();
 const match=reports.reports.find(m=>m.date===date&&m.homeCode===home&&m.awayCode===away);
 if(!match)return res.status(404).json({available:false,error:'official_report_not_imported'});
 return res.status(200).json({available:true,...match,event:{homeScore:match.homeScore,awayScore:match.awayScore,status:match.status,statusDescription:'Finalizado'},updatedAt:null});
};
