'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const files=['index.html','players/index.html','academies/index.html','rankings/index.html','matches/index.html','competitions/uefa-youth-league/index.html','competitions/fifa-u17-world-cup/index.html'];
const datasets=['future-radar-players.json','fifa-u17-world-cup-2026-squads.json','u17-world-cup-2026.json','uefa-youth-league-2026-27.json'];
for(const path of files){
 const html=fs.readFileSync(path,'utf8');
 for(const name of datasets)assert(!html.includes("'./"+name+"'")&&!html.includes('"./'+name+'"'),path+' uses relative '+name);
}
for(const name of datasets)assert(fs.existsSync(name),'missing root dataset: '+name);
console.log('All seven routes use root-relative paths to existing datasets.');
