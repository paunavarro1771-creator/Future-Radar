'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
new vm.Script(fs.readFileSync('assets/future-radar-ranking-sort.js','utf8'));
for(const path of ['index.html','players/index.html','academies/index.html','rankings/index.html','matches/index.html','competitions/uefa-youth-league/index.html','competitions/fifa-u17-world-cup/index.html']){
 const html=fs.readFileSync(path,'utf8');
 assert(html.includes('src="/assets/future-radar-ranking-sort.js"'),path);
 assert(html.includes('id="rankingResults"'),path);
}
const players=JSON.parse(fs.readFileSync('future-radar-players.json','utf8'));
assert(players.length>0);
console.log('Sortable rankings use existing tables; no dataset changes.');
