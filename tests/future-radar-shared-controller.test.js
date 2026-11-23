'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const shared=fs.readFileSync('assets/future-radar-page-core.js','utf8');
new vm.Script(shared,{filename:'assets/future-radar-page-core.js'});
const pages=['index.html','players/index.html','academies/index.html','rankings/index.html','matches/index.html','competitions/uefa-youth-league/index.html','competitions/fifa-u17-world-cup/index.html'];
for(const path of pages){
 const html=fs.readFileSync(path,'utf8');
 assert(html.includes('src="/assets/future-radar-data.js"'),path+' missing gateway');
 const controller=html.includes('src="/assets/future-radar-page-core.js"')?shared:html;
 for(const key of ['players','youth','u17','u17Squads'])assert(controller.includes("FutureRadarData.response('"+key+"')"),path+' not using cached '+key);
}
for(const path of ['players/index.html','rankings/index.html','competitions/uefa-youth-league/index.html']){
 const html=fs.readFileSync(path,'utf8');
 assert(html.includes('src="/assets/future-radar-page-core.js"'),path);
 assert(!html.includes('function renderRankings(){'),path+' still duplicates shared controller');
}
console.log('Three routes share a cached controller; all seven use the dataset gateway.');
