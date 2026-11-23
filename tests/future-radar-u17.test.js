'use strict';
const assert=require('node:assert/strict');
const handler=require('../api/future-radar-u17');
function call(query={}){
 let code=200,headers={};
 const req={method:'GET',query};
 const res={setHeader(k,v){headers[k]=v;},status(n){code=n;return this;},json(body){return {status:code,body,headers};}};
 return handler(req,res);
}
const all=call();
assert.equal(all.status,200);
assert.equal(all.body.available,true);
assert.equal(all.body.matches.length,72);
assert.equal(new Set(all.body.matches.map(x=>x.id)).size,72);
assert.ok(all.body.coverage.officialReports>=20);
assert.ok(all.body.matches.some(x=>x.verifiedOfficial&&x.statisticsAvailable));
assert.ok(all.body.matches.every(x=>x.sourceType!=='official_fifa_report'||x.verifiedOfficial));
const health=call({health:'1'});
assert.equal(health.status,200);
assert.equal(health.body.coverage.fixtures,72);
const sample=call({date:'2026-11-19',home:'QAT',away:'PAN'});
assert.equal(sample.status,200);
assert.equal(sample.body.homeScore,2);
assert.equal(sample.body.awayScore,0);
assert.ok(sample.body.statistics.length>0);
assert.equal(call({date:'2026-11-19',home:'QAT'}).status,400);
assert.equal(call({date:'2026-11-19',home:'AAA',away:'BBB'}).status,404);
console.log('Future Radar U17 API: all assertions passed; coverage:',JSON.stringify(health.body.coverage));
