'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {controllerFor}=require('./future-radar-test-helper');
for(const path of ['index.html','players/index.html','academies/index.html','rankings/index.html','matches/index.html','competitions/uefa-youth-league/index.html','competitions/fifa-u17-world-cup/index.html']){
 const controller=controllerFor(fs.readFileSync(path,'utf8'));
 assert(controller.includes('filterPlayers();renderAcademies();setupRankings();')||controller.includes('filterPlayers();const cats='),path+' should initialize player count via filterPlayers');
}
const css=fs.readFileSync('assets/future-radar-shell.css','utf8');
for(const rule of ['.ranking-table-wrap{overflow-x:auto','font-variant-numeric:tabular-nums','@media(max-width:600px)'])assert(css.includes(rule),rule);
console.log('Initial filter counts and responsive table/scoreboard rules checked.');
