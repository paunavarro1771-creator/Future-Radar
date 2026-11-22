'use strict';
/**
 * Official source registry. Links to publicly accessible FIFA/UEFA pages.
 * This is NOT a scraper, data licence or official API partnership.
 */
const SOURCES={
 'fifa-u17-world-cup-2026':{
  organizer:'FIFA',name:'FIFA U-17 World Cup Qatar 2026',season:'2026',
  links:{
   fixtures:'https://www.fifa.com/es/tournaments/mens/u17worldcup/qatar-2026/scores-fixtures',
   teams:'https://www.fifa.com/es/tournaments/mens/u17worldcup/qatar-2026/teams',
   scheduleArticle:'https://www.fifa.com/es/tournaments/mens/u17worldcup/qatar-2026/articles/resultados-partidos-horarios-catar-2026-mundial-sub-17'
  },
  automatedIngestion:false,liveFeed:false,permission:'not_granted',
  note:'Official FIFA pages for manual verification and attribution; no automated reuse is assumed.'
 },
 'uefa-youth-league-2026-27':{
  organizer:'UEFA',name:'UEFA Youth League 2026/27',season:'2026/27',
  links:{
   fixtures:'https://es.uefa.com/uefayouthleague/fixtures-results/',
   standings:'https://es.uefa.com/uefayouthleague/standings/',
   competition:'https://es.uefa.com/uefayouthleague/'
  },
  automatedIngestion:false,liveFeed:false,permission:'not_granted',
  note:'UEFA terms prohibit automated scraping and systematic collection without authorization.'
 }
};
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','public, s-maxage=3600');
 if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
 const key=String(req.query?.competition||'');
 if(key&&!Object.prototype.hasOwnProperty.call(SOURCES,key))
  return res.status(404).json({error:'unknown_competition',supported:Object.keys(SOURCES)});
 return res.status(200).json({officialSources:key?{[key]:SOURCES[key]}:SOURCES,
  disclaimer:'Source links are not evidence of permission to scrape or a live API partnership.',
  updatedAt:'2026-11-22'});
};
