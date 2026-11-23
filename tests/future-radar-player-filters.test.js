'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
for(const path of ['index.html','players/index.html','academies/index.html','rankings/index.html','matches/index.html','competitions/uefa-youth-league/index.html','competitions/fifa-u17-world-cup/index.html']){
 const html=fs.readFileSync(path,'utf8');
 const code=html.includes('src="/assets/future-radar-page-core.js"')?fs.readFileSync('assets/future-radar-page-core.js','utf8'):html;
 assert(html.includes('id="frAgeFilter"')&&html.includes('id="frPlayerSort"')&&html.includes('id="frPlayerCount"'),path);
 assert(code.includes("addEventListener('change',filterPlayers)"),path);
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 for(const [i,match] of scripts.entries())new vm.Script(match[1],{filename:path+':script'+i});
}
const players=JSON.parse(fs.readFileSync('future-radar-players.json','utf8'));
assert(players.some(p=>Number.isFinite(Number(p.age))));
console.log('Player filters and inline script syntax validated on all 7 pages');
