'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {controllerFor}=require('./future-radar-test-helper');
const routes=['index.html','players/index.html','academies/index.html','rankings/index.html','matches/index.html','competitions/uefa-youth-league/index.html','competitions/fifa-u17-world-cup/index.html'];
for(const path of routes){
 const html=fs.readFileSync(path,'utf8'),script=controllerFor(html);
 assert(script.includes('function renderRankings(){'),path+' missing page controller');
 new vm.Script(script,{filename:path+':controller'});
 assert(!/<script>\s*let allRadarPlayers/.test(html),path+' still has inline page controller');
}
console.log('All seven external page controllers pass syntax validation.');
