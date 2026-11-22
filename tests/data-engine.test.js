'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const enginePath=path.resolve(__dirname,'../api/data-engine.js');
const upstreamPath=path.resolve(__dirname,'../api/u17-world-cup-live.js');
function run(query,upstreamReply){
  const oldUpstream=require.cache[upstreamPath];
  const oldEngine=require.cache[enginePath];
  require.cache[upstreamPath]={id:upstreamPath,filename:upstreamPath,loaded:true,exports:async(_req,res)=>{
    res.status(upstreamReply.status||200).json(upstreamReply.body);
  }};
  delete require.cache[enginePath];
  const engine=require(enginePath);
  const result={status:200,body:null};
  const res={setHeader(){return this;},status(n){result.status=n;return this;},json(body){result.body=body;return this;}};
  return Promise.resolve(engine({method:'GET',query},res)).then(()=>result).finally(()=>{
    delete require.cache[enginePath];
    if(oldEngine)require.cache[enginePath]=oldEngine;
    if(oldUpstream)require.cache[upstreamPath]=oldUpstream;else delete require.cache[upstreamPath];
  });
}
test('official schedule survives upstream outage without fake scores',async()=>{
  const out=await run({competition:'fifa-u17-world-cup-2026',dates:'2026-11-19'},
    {status:502,body:{available:false}});
  assert.equal(out.status,200);
  assert.equal(out.body.matches.length,8);
  assert.equal(out.body.partial,true);
  assert.ok(out.body.matches.every(m=>m.scheduleOnly&&m.home.score===null&&m.away.score===null));
});
test('provider match merges with official schedule instead of duplicating',async()=>{
  const out=await run({competition:'fifa-u17-world-cup-2026',dates:'2026-11-19'},
    {body:{available:true,matches:[{
      date:'2026-11-19',homeCode:'QAT',awayCode:'PAN',
      matchKey:'vendor:123',home:'Qatar',away:'Panama',
      homeScore:2,awayScore:1,status:'FT',sourceType:'provider'
    }],partial:false,coveredDates:1,requestedDates:1}});
  assert.equal(out.body.matches.length,8);
  const match=out.body.matches.find(m=>m.id==='2026-11-19:QAT:PAN');
  assert.equal(match.home.score,2);
  assert.equal(match.away.score,1);
  assert.equal(match.matchNumber,1);
  assert.equal(match.scheduleOnly,false);
});
test('upstream events missing date do not crash sorting',async()=>{
  const out=await run({competition:'fifa-u17-world-cup-2026',dates:'2026-11-19'},
    {body:{available:true,matches:[{matchKey:'orphan',home:'Unknown',away:'Unknown',status:'FT'}],
      partial:true,coveredDates:1,requestedDates:1}});
  assert.equal(out.status,200);
  assert.equal(out.body.matches.length,9);
});
test('rejects invalid team identity',async()=>{
  const out=await run({competition:'fifa-u17-world-cup-2026',date:'2026-11-19',home:'QAT',away:'QAT'},
    {body:{available:true}});
  assert.equal(out.status,400);
});
