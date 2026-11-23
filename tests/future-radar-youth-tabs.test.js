'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
new vm.Script(fs.readFileSync('assets/future-radar-youth-tabs.js','utf8'));
const pages=['index.html','players/index.html','academies/index.html','rankings/index.html','matches/index.html','competitions/uefa-youth-league/index.html','competitions/fifa-u17-world-cup/index.html'];
for(const path of pages)assert(fs.readFileSync(path,'utf8').includes('src="/assets/future-radar-youth-tabs.js"'),path);
const source=fs.readFileSync('assets/future-radar-youth-tabs.js','utf8');
for(const tab of ['stats','lineups','events','sources'])assert(source.includes("['"+tab+"'"),tab);
assert(source.includes('No disponible en el dataset actual'));
console.log('Four real-data match tabs integrated across all routes.');
