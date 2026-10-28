const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {harness,event,plain,variant,root}=require('./harness.cjs');
const changed=variant==='after', observations=[];
const result=e=>({eventType:e.eventType,localEventId:e.localEventId,resourceId:`resource-file-${e.localEventId}`,status:'SYNCED'});
after(()=>fs.writeFileSync(path.join(root,'evidence',variant,'response-observations.json'),JSON.stringify(observations,null,2)));
function record(name,h,value){observations.push({name,result:plain(value),...h.observation(),analysisCalls:h.analysisCalls});}

test('Reordered results bind both completion and analysis to the correct change ID',async()=>{
  const h=harness({rows:[event('first',undefined,{fileName:'first.txt'}),event('second',undefined,{fileName:'second.txt'})]});
  h.responseFactory=p=>({results:p.events.map(result).reverse()});
  const value=await h.send();assert.equal(value.status,'ready');
  const pairs=h.analysisCalls.map(a=>[a.localFileId,a.resourceId]);
  assert.deepEqual(pairs,changed?[['file-second','resource-file-second'],['file-first','resource-file-first']]
    :[['file-first','resource-file-second'],['file-second','resource-file-first']]);
  record('reverse-analysis',h,value);
});

const malformed={
  missingId:rs=>{delete rs[1].localEventId;return rs;},
  missingResult:rs=>rs.slice(0,1),
  duplicateId:rs=>[rs[0],{...rs[0]}],
  unknownStatus:rs=>[rs[0],{...rs[1],status:'DONE_MAYBE'}],
  wrongEventType:rs=>[rs[0],{...rs[1],eventType:'DELETED'}],
  missingResource:rs=>[rs[0],{...rs[1],resourceId:null}],
  unsafeSkip:rs=>[rs[0],{...rs[1],status:'SKIPPED'}],
  unsafeSuperseded:rs=>[rs[0],{...rs[1],status:'SUPERSEDED'}],
  malformedResource:rs=>[rs[0],{...rs[1],resourceId:{bad:true}}],
  malformedRetryable:rs=>[rs[0],{...rs[1],retryable:'false'}],
};
for(const [name,mutate]of Object.entries(malformed))test(`Invalid response ${name} cannot partially acknowledge a batch`,async()=>{
  const h=harness({rows:[event('first'),event('second')]});
  h.responseFactory=p=>({results:mutate(p.events.map(result))});
  const value=await h.send();
  assert.equal(value.status,changed?'failed':'ready');
  if(changed){assert(h.rows.every(r=>r.status==='FAILED'));assert(h.marks.every(m=>m.results.every(r=>r.status==='FAILED')));}
  record(name,h,value);
});

test('Unknown response IDs are rejected before reaching native persistence',async()=>{
  const h=harness();h.responseFactory=p=>({results:[{...result(p.events[0]),localEventId:'unrequested'}]});
  const value=await h.send();assert.equal(value.status,'failed');
  assert.equal(h.marks.some(m=>m.results.some(r=>r.localEventId==='unrequested')),!changed);
  record('unknown-response-id',h,value);
});

test('Processing response stays incomplete and is not described as reflected',async()=>{
  const h=harness();h.responseFactory=p=>({results:[{...result(p.events[0]),status:'PROCESSING',resourceId:null}]});
  const value=await h.send();assert.equal(value.status,'ready');assert.equal(h.rows[0].status,'APPROVED');
  assert.equal(value.message.includes('처리 중 1건'),changed);
  record('processing',h,value);
});

test('Permanent payload conflict blocks the change instead of scheduling the same payload again',async()=>{
  const h=harness();h.responseFactory=p=>({results:[{...result(p.events[0]),status:'FAILED',resourceId:null,errorCode:'EVENT_PAYLOAD_MISMATCH',retryable:false}]});
  const value=await h.send();assert.equal(h.rows[0].status,changed?'REJECTED':'FAILED');
  if(changed)assert.equal(h.marks[0].results[0].reason,'EVENT_PAYLOAD_MISMATCH');
  record('permanent-conflict',h,value);
});

for(const status of ['FAILED','SUPERSEDED','SKIPPED'])test(`Valid ${status} response retains its event meaning`,async()=>{
  const row=event('valid',undefined,{eventType:status==='SKIPPED'?'DELETED':'UPDATED',resourceId:'existing-resource'});
  const h=harness({rows:[row]});h.responseFactory=p=>({results:[{...result(p.events[0]),status,resourceId:row.resourceId,retryable:status==='FAILED'?true:null}]});
  const value=await h.send();assert.equal(value.status,'ready');assert.equal(h.rows[0].status,status);
  record(`valid-${status}`,h,value);
});
