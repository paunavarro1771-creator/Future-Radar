'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const academy=fs.readFileSync('academies/index.html','utf8');
const ranking=fs.readFileSync('rankings/index.html','utf8');
for(const id of ['frAcademyCategory','frAcademySort','frAcademyCount'])assert(academy.includes('id="'+id+'"'),id);
assert(academy.includes("academyCategory(c)===category"));
assert(ranking.includes('fr-ranking-methodology'));
for(const [path,html] of [['academies/index.html',academy],['rankings/index.html',ranking]])for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1],{filename:path});
console.log('Academy filters and ranking methodology integrated.');
