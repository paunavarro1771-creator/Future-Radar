'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const pages=['index.html','players/index.html','academies/index.html','rankings/index.html','matches/index.html','competitions/uefa-youth-league/index.html','competitions/fifa-u17-world-cup/index.html'];
for(const path of pages){
 const html=fs.readFileSync(path,'utf8');
 assert(html.includes('data-youth-match="'+idx+'),path+' no modal trigger');
 assert(html.includes("openYouthMatch(Number(card.dataset.youthMatch))"),path+' no handler');
 assert(html.includes("fetch('/uefa-youth-league-2026-27.json')"),path+' incorrect JSON path');
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 for(const [i,match] of scripts.entries())new vm.Script(match[1],{filename:path+':script'+i});
}
const matches=JSON.parse(fs.readFileSync('uefa-youth-league-2026-27.json','utf8')).matches;
assert(matches.length>0);
console.log('Youth League modal, source path, scripts validated across',pages.length,'routes; matches:',matches.length);
