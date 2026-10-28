const {test}=require('node:test');
const assert=require('node:assert/strict');
const {harness,event}=require('./harness.cjs');

test('413 splits the same IDs and isolates the single permanently oversized item',async()=>{
  const h=harness({rows:[event('good'),event('large')]});
  h.onHttp=(body)=>{
    if(body.events.length>1 || body.events[0].localEventId==='large')throw new h.ApiClientError(413,{error:{message:'too large',code:'HTTP_413'}});
  };
  const result=await h.send();
  assert.equal(result.status,'ready');
  assert.deepEqual(h.rows.map(r=>r.status),['SYNCED','REJECTED']);
  assert.deepEqual(h.payloads.map(p=>p.events.map(e=>e.localEventId)),[['good','large'],['good'],['large']]);
  assert.equal(h.marks.length,1);
});

test('429 preserves retry guidance without completing the event',async()=>{
  const h=harness();
  h.onHttp=()=>{throw new h.ApiClientError(429,{error:{message:'busy',code:'HTTP_429'}},9000)};
  const start=Date.now();
  assert.equal((await h.send()).status,'failed');
  assert.equal(h.rows[0].status,'FAILED');
  assert(h.marks[0].results[0].nextRetryAt>=start+9000);
});

test('lost responses retain retryable state and the outgoing ID',async()=>{
  const h=harness();
  h.onHttp=()=>{throw new Error('connection lost after commit')};
  await h.send();
  assert.equal(h.rows[0].status,'FAILED');
  assert.equal(h.marks[0].results[0].localEventId,h.payloads[0].events[0].localEventId);
  assert.equal(typeof h.marks[0].results[0].nextRetryAt,'number');
});

test('Retry-After accepts seconds and dates, not invalid or overflowing numbers',()=>{
  const h=harness();
  assert.equal(h.parseRetryAfter('9',0),9000);
  assert.equal(h.parseRetryAfter('Thu, 01 Jan 1970 00:00:10 GMT',0),10000);
  for(const value of [null,'','-1','99999999999999999999999999999999','invalid'])assert.equal(h.parseRetryAfter(value,0),null);
});

test('caller limits larger than the server batch limit are split before sending',async()=>{
  const h=harness({rows:Array.from({length:101},(_,i)=>event(`file-${i}`))});
  h.onHttp=body=>assert(body.events.length<=100);
  const result=await h.send({limit:500});
  assert.equal(result.data.syncedCount,101);
  assert.deepEqual(h.payloads.map(p=>p.events.length),[100,1]);
});

test('real HTTP client preserves Retry-After even when the error body is not JSON',async()=>{
  const h=harness();
  const client=h.httpClient(async()=>({ok:false,status:429,headers:new Headers({'Retry-After':'9'}),json:async()=>{throw new SyntaxError('proxy HTML')}}));
  await assert.rejects(client.apiRequest('/api/local-file-events/sync',{skipAuth:true,skipAuthRefresh:true,method:'POST',body:{events:[]}}),error=>{
    assert.equal(error.status,429);
    assert.equal(error.retryAfterMs,9000);
    return true;
  });
});
