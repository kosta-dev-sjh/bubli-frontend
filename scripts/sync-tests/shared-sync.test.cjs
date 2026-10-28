const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {harness,event,defer,until,plain,variant,root}=require('./harness.cjs');
const changed=true;
const observations=[];
const record=(name,h,extra={})=>observations.push({name,...h.observation(),...extra});
after(()=>{
  const dir=path.join(root,'evidence',variant);fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'observations.json'),JSON.stringify(observations,null,2));
});

test('Automatic sync plus 40 manual clicks shares one active transport',async()=>{
  const h=harness(),gate=defer();h.onHttp=()=>gate.promise;
  h.auto.startManagedFolderAutoSync();await until(()=>h.payloads.length===1);
  const clicks=Array.from({length:40},()=>h.send());
  await until(()=>changed?h.stages.length===1:h.payloads.length===41);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.payloads.length,changed?1:41);
  gate.resolve();const results=await Promise.all(clicks);await h.waitIdle();
  assert(results.every(result=>result.status==='ready'));
  assert.equal(h.observation().maxConcurrentHttp,changed?1:41);
  assert.equal(h.payloads.length,changed?1:41);
  if(changed)assert(results.every(result=>result.data.sentCount===0));
  record('automatic-and-40-clicks',h,{manualClicks:40});
});

test('50 simultaneous manual calls coalesce without disabling the button',async()=>{
  const h=harness(),gate=defer();h.onHttp=()=>gate.promise;
  const requests=Array.from({length:50},()=>h.send());
  await until(()=>h.payloads.length===(changed?1:50));
  gate.resolve();await Promise.all(requests);
  assert.equal(h.stages.length,changed?1:50);
  assert.equal(h.observation().maxConcurrentHttp,changed?1:50);
  record('50-manual-calls',h);
});

test('New edit added while sending is selected after first response is stored',async()=>{
  const initial=event('register-file'),h=harness({rows:[initial]}),gate=defer();
  h.onHttp=(_payload,index)=>index===1?gate.promise:undefined;
  const first=h.send({limit:20});await until(()=>h.payloads.length===1);
  h.rows.push(event('modify-file','folder-one',{localFileId:initial.localFileId,eventType:'UPDATED',localSequence:2,fileSizeBytes:25}));
  const second=h.send({limit:20});
  if(!changed)await until(()=>h.payloads.length===2);
  gate.resolve();await first;await second;
  if(!changed)await h.send({limit:20});
  const latest=h.payloads.at(-1).events[0];
  assert.equal(latest.localEventId,'modify-file');assert.equal(latest.localSequence,2);
  assert.equal(latest.syncDeviceId,'fixture-device');
  assert.equal(latest.resourceId,`resource-${initial.localFileId}`);
  if(changed)assert(h.trace.indexOf('mark-end:1')<h.trace.indexOf('stage:2'));
  record('edit-during-send',h);
});

test('Different folder scopes retain their own results and never send together',async()=>{
  const h=harness({rows:[event('one','folder-one'),event('two','folder-two')]}),gate=defer();
  h.onHttp=(_payload,index)=>index===1?gate.promise:undefined;
  const first=h.send({localFolderId:'folder-one'});await until(()=>h.payloads.length===1);
  const second=h.send({localFolderId:'folder-two'});
  if(!changed)await until(()=>h.payloads.length===2);
  gate.resolve();const [one,two]=await Promise.all([first,second]);
  assert.equal(one.data.syncedResourceIds[0],'resource-file-one');
  assert.equal(two.data.syncedResourceIds[0],'resource-file-two');
  assert.equal(h.observation().maxConcurrentHttp,changed?1:2);
  record('different-folder-scopes',h);
});

test('Full scope is not incorrectly resolved by an unrelated folder result',async()=>{
  const h=harness({rows:[event('one','folder-one'),event('two','folder-two')]}),gate=defer();
  h.onHttp=(_payload,index)=>index===1?gate.promise:undefined;
  const first=h.send({localFolderId:'folder-one'});await until(()=>h.payloads.length===1);
  const second=h.send();gate.resolve();await first;const result=await second;
  assert(result.data.syncedResourceIds.includes('resource-file-two'));
  if(changed)assert.deepEqual(plain(result.data.syncedResourceIds),['resource-file-two']);
  record('full-versus-folder',h);
});

test('Different caller limits are preserved instead of silently merged',async()=>{
  const h=harness({rows:[event('one'),event('two'),event('three')]}),gate=defer();
  h.onHttp=(_payload,index)=>index===1?gate.promise:undefined;
  const first=h.send({limit:1});await until(()=>h.payloads.length===1);
  const second=h.send({limit:2});gate.resolve();await first;await second;
  assert.deepEqual(h.stages.map(input=>input.limit),[1,2]);
  assert.equal(h.payloads[1].events.length,2);
  record('different-limits',h);
});

test('Queued input is a snapshot even if a caller later mutates its options',async()=>{
  const h=harness({rows:[event('one'),event('two','folder-two')]}),gate=defer();
  h.onHttp=(_payload,index)=>index===1?gate.promise:undefined;
  const first=h.send({localFolderId:'folder-one'});await until(()=>h.payloads.length===1);
  const input={consentGranted:true,localFolderId:'folder-two',limit:1};
  const second=h.client.syncPersonalLocalFileEventsToServer(input);input.localFolderId='folder-one';input.limit=9;
  gate.resolve();await first;await second;
  assert.deepEqual(h.stages[1],{context:{ownerId:h.ownerId,epoch:h.epoch},limit:1,localFolderId:'folder-two'});
  record('input-snapshot',h);
});

test('A click during the follow-up run requests another fresh query',async()=>{
  const h=harness(),firstGate=defer(),secondGate=defer();
  h.onHttp=(_payload,index)=>index===1?firstGate.promise:index===2?secondGate.promise:undefined;
  const first=h.send();await until(()=>h.payloads.length===1);
  h.rows.push(event('second-edit'));const second=h.send();
  firstGate.resolve();await first;
  await until(()=>h.payloads.length===2);
  h.rows.push(event('third-edit'));const third=h.send();secondGate.resolve();await second;await third;
  if(!changed && h.rows.some(row=>row.status!=='SYNCED'))await h.send();
  assert(h.rows.every(row=>row.status==='SYNCED'));
  if(changed)assert.equal(h.observation().maxConcurrentHttp,1);
  record('click-during-follow-up',h);
});

test('Consent and personal scope are checked before joining another request',async()=>{
  const h=harness(),gate=defer();h.onHttp=()=>gate.promise;
  const first=h.send();await until(()=>h.payloads.length===1);
  assert.equal((await h.send({consentGranted:false})).status,'blocked');
  assert.equal((await h.send({roomId:'room-one'})).status,'blocked');
  h.setRuntime(false);assert.equal((await h.send()).status,'unavailable');h.setRuntime(true);
  assert.equal(h.stages.length,1);gate.resolve();await first;
  record('trust-boundary',h);
});

test('Staging failure sends no HTTP and a later explicit call can retry',async()=>{
  const h=harness();h.onStage=(_input,index)=>{if(index===1)throw new Error('fixture-stage-failure');};
  assert.equal((await h.send()).status,'failed');assert.equal(h.payloads.length,0);
  assert.equal((await h.send()).status,'ready');assert.equal(h.payloads.length,1);
  record('staging-failure',h);
});

test('HTTP failure records failure before queued re-query starts',async()=>{
  const h=harness(),gate=defer();h.onHttp=async(_payload,index)=>{if(index===1){await gate.promise;throw new Error('fixture-network-failure');}};
  const first=h.send();await until(()=>h.payloads.length===1);const second=h.send();
  gate.resolve();const a=await first,b=await second;
  assert.equal(a.status,'failed');assert.equal(b.status,'ready');
  if(changed)assert(h.trace.indexOf('mark-end:1')<h.trace.indexOf('stage:2'));
  record('http-failure-before-requery',h);
});

test('Local completion persistence remains inside the shared execution boundary',async()=>{
  const h=harness(),gate=defer();h.onMark=(_input,index)=>index===1?gate.promise:undefined;
  const first=h.send();await until(()=>h.marks.length===1);const second=h.send();
  await new Promise(resolve=>setImmediate(resolve));assert.equal(h.stages.length,changed?1:2);
  gate.resolve();await first;await second;
  if(changed)assert.equal(h.payloads.length,1);
  record('local-mark-boundary',h);
});

test('Completion write and failure write errors do not poison later calls',async()=>{
  const h=harness();h.onMark=(_input,index)=>{if(index<=2)throw new Error('fixture-local-write-failure');};
  const result=await h.send();assert.equal(result.status,'failed');
  assert(result.message.includes('local failure mark failed'));
  const retry=await h.send();assert.equal(retry.status,'ready');
  record('both-local-writes-fail',h);
});

for(const status of ['PROCESSING','FAILED','SUPERSEDED'])test(`Automatic drain retains ${status} rules`,async()=>{
  const h=harness({rows:[event('first',undefined,status==='SUPERSEDED'?{eventType:'UPDATED',resourceId:'existing-resource'}:{})]});h.responseStatus=status;h.auto.startManagedFolderAutoSync();await h.waitIdle();
  assert.equal(h.payloads.length,1);
  if(status==='PROCESSING')assert.equal(h.rows[0].status,'APPROVED');
  if(status==='FAILED')assert.equal(h.auto.getManagedFolderAutoSyncStatus().lastStatus,'failed');
  if(status==='SUPERSEDED')assert.equal(h.rows[0].status,'SUPERSEDED');
  record(`drain-${status}`,h);
});

test('Consent withdrawal while staging prevents a not-yet-started HTTP request',async()=>{
  const h=harness(),gate=defer();h.onStage=()=>gate.promise;
  const request=h.send();await until(()=>h.stages.length===1);h.setConsent(false);gate.resolve();
  const result=await request;assert.equal(result.status,changed?'failed':'ready');
  assert.equal(h.payloads.length,changed?0:1);
  record('withdraw-during-stage',h);
});

test('Consent withdrawal cancels queued sends but keeps an in-flight result durable',async()=>{
  const h=harness(),gate=defer();h.onHttp=()=>gate.promise;
  const first=h.send();await until(()=>h.payloads.length===1);const second=h.send();
  h.setConsent(false);gate.resolve();const results=await Promise.all([first,second]);
  assert.equal(results[0].status,'ready');assert.equal(results[1].status,changed?'failed':'ready');
  assert.equal(h.payloads.length,changed?1:2);assert.equal(h.rows[0].status,'SYNCED');
  record('withdraw-with-pending',h);
});

test('Stop cancels pending work without releasing the active transport lock',async()=>{
  const h=harness(),gate=defer();h.onHttp=()=>gate.promise;
  const first=h.send();await until(()=>h.payloads.length===1);const second=h.send();
  await h.auto.stopManagedFolderAutoSync();
  const stopped=h.send();gate.resolve();const results=await Promise.all([first,second,stopped]);
  assert.equal(results[0].status,'ready');
  if(changed){assert.equal(results[1].status,'failed');assert.equal(results[2].status,'blocked');}
  assert.equal(h.payloads.length,changed?1:3);
  record('stop-with-pending',h);
});

test('Re-enable after revocation starts fresh work, not a cancelled pending result',async()=>{
  const h=harness(),gate=defer();h.onHttp=(_payload,index)=>index===1?gate.promise:undefined;
  const first=h.send();await until(()=>h.payloads.length===1);const old=h.send();
  h.setConsent(false);h.rows.push(event('new-file'));h.setConsent(true);
  const fresh=h.send();gate.resolve();await Promise.all([first,old,fresh]);await h.waitIdle();
  assert.equal(h.rows.find(row=>row.localEventId==='new-file').status,'SYNCED');
  if(changed)assert.equal(h.observation().maxConcurrentHttp,1);
  record('re-enable',h);
});

test('Watch events and periodic calls still trigger automatic re-query',async()=>{
  const h=harness(),gate=defer();h.onHttp=(_payload,index)=>index===1?gate.promise:undefined;
  h.auto.startManagedFolderAutoSync();await until(()=>h.payloads.length===1);
  h.rows.push(event('second-file','folder-two'));h.watch('folder-two');h.fireDebounce();h.fireInterval();
  gate.resolve();await h.waitIdle();
  assert(h.rows.every(row=>row.status==='SYNCED'));
  assert(h.stages.some(input=>!input.localFolderId));
  record('watch-and-timer',h);
});

test('Flush on stop waits for the in-flight send and remaining re-query',async()=>{
  const h=harness(),gate=defer();h.onHttp=(_payload,index)=>index===1?gate.promise:undefined;
  h.auto.startManagedFolderAutoSync();await until(()=>h.payloads.length===1);
  h.rows.push(event('last-file'));const stopped=h.auto.stopManagedFolderAutoSync({flush:true});
  gate.resolve();await stopped;
  assert(h.rows.every(row=>row.status==='SYNCED'));
  assert.equal(h.auto.getManagedFolderAutoSyncStatus().lastStatus,'stopped');
  record('flush-stop',h);
});
