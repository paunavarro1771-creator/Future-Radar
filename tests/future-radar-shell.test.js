'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const pages=['index.html','players/index.html','academies/index.html','rankings/index.html','competitions/uefa-youth-league/index.html','competitions/fifa-u17-world-cup/index.html','matches/index.html'];
const js=fs.readFileSync('assets/future-radar-shell.js','utf8');
new vm.Script(js,{filename:'future-radar-shell.js'});
const css=fs.readFileSync('assets/future-radar-shell.css','utf8');
assert(css.includes('@media(max-width:560px)'));
for(const path of pages){const s=fs.readFileSync(path,'utf8');assert(s.includes('/assets/future-radar-shell.css'),path);assert(s.includes('/assets/future-radar-shell.js'),path)}
const players=JSON.parse(fs.readFileSync('future-radar-players.json','utf8'));
const world=JSON.parse(fs.readFileSync('u17-world-cup-2026.json','utf8'));
assert(Array.isArray(players)&&players.length>0);
assert(Array.isArray(world.teams)&&world.teams.length>0);
console.log('Shell validated:',pages.length,'pages,',players.length,'real players,',world.teams.length,'teams');
