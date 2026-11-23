'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const code=fs.readFileSync('assets/future-radar-data.js','utf8');
new vm.Script(code);
const pages=['index.html','players/index.html','academies/index.html','rankings/index.html','matches/index.html','competitions/uefa-youth-league/index.html','competitions/fifa-u17-world-cup/index.html'];
for(const path of pages){const html=fs.readFileSync(path,'utf8');assert(html.includes('/assets/future-radar-data.js'),path);assert(html.includes("FutureRadarData.response('players')"),path);}
const cache=new Map();let calls=0;
const window={};
const fetch=async url=>{calls++;return {ok:true,json:async()=>({url})}};
vm.runInNewContext(code,{window,fetch,URLSearchParams,Map,Promise,Error,Object});
(async()=>{const a=await window.FutureRadarData.load('players');const b=await window.FutureRadarData.load('players');assert.equal(calls,1);assert.equal(a,b);console.log('Shared dataset gateway caches requests across pages.');})().catch(e=>{console.error(e);process.exitCode=1});
