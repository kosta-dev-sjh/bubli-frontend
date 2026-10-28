const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = process.env.BUBLI_SYNC_WORK_ROOT ?? path.resolve(__dirname, '..');
const frontend = process.env.BUBLI_SYNC_FRONTEND_ROOT ?? path.join(root, 'frontend');
const ts = require(require.resolve('typescript', { paths: [frontend] }));
const variant = process.env.SYNC_VARIANT;
assert(['before','after'].includes(variant));
const plain = value => JSON.parse(JSON.stringify(value));
const defer = () => {
  let resolve, reject;
  const promise = new Promise((yes,no) => { resolve=yes; reject=no; });
  return {promise,resolve,reject};
};
async function until(predicate) {
  for(let i=0;i<300;i++) {
    if(predicate())return;
    await new Promise(resolve=>setImmediate(resolve));
  }
  assert.fail('Expected condition did not become true');
}

function harness(options={}) {
  const rows = (options.rows ?? [event('add-file')]).map(row=>({...row}));
  const trace=[], payloads=[], stages=[], marks=[], cache=new Map();
  const timers=new Map();
  let timerId=0, runtime=true, consent=true, activeHttp=0, maxHttp=0, watchHandler;
  const h={rows,trace,payloads,stages,marks,timers,variant,analysisCalls:[],extractions:[],ownerId:'10000000-0000-4000-8000-000000000001',epoch:'fixture-epoch'};
  let lease;
  const tauriCommands={
    async getLocalFileSyncContext(input) {
      assert.equal(input.ownerId,h.ownerId,'Fixture account changed');
      return {ownerId:h.ownerId,epoch:h.epoch};
    },
    async renewLocalFileSyncLease(input) { assert.equal(input.token,lease?.token); return input; },
    async releaseLocalFileSyncLease(input) { if(lease?.token===input.token)lease=undefined; },
    async stageLocalFileEventsForSync(input={}) {
      stages.push(plain(input));
      trace.push(`stage:${stages.length}`);
      if(h.onStage)await h.onStage(input,stages.length);
      const files=new Set();
      const selected=rows.filter(row=>{
        if(['SYNCED','SUPERSEDED','SKIPPED','REJECTED'].includes(row.status))return false;
        if(input.localFolderId && row.localFolderId!==input.localFolderId)return false;
        if(files.has(row.localFileId))return false;
        files.add(row.localFileId);
        return true;
      }).slice(0,input.limit ?? 20);
      if(selected.length)lease={context:{ownerId:h.ownerId,epoch:h.epoch},token:`lease-${stages.length}`,expiresAt:Date.now()+60000};
      return {lease,busy:false,events:selected.map(row=>{
        row.status='APPROVED';
        return {...row};
      }),stagedAt:'fixture-time'};
    },
    async markLocalFileEventsSynced(input) {
      assert.equal(input.lease?.context.ownerId,h.ownerId,'Fixture account changed');
      assert.equal(input.lease?.context.epoch,h.epoch,'Fixture login generation changed');
      assert.equal(input.lease?.token,lease?.token,'Fixture sender lease changed');
      marks.push(plain(input));
      trace.push(`mark-start:${marks.length}`);
      if(h.onMark)await h.onMark(input,marks.length);
      let syncedCount=0,failedCount=0;
      for(const result of input.results) {
        const row=rows.find(row=>row.localEventId===result.localEventId);
        assert(row,'Unknown event result');
        if(result.status==='SYNCED'||result.status==='SUPERSEDED'||result.status==='SKIPPED') {
          row.status=result.status;
          if(result.status==='SYNCED')syncedCount++;
          if(result.resourceId)for(const change of rows)if(change.localFileId===row.localFileId)change.resourceId=result.resourceId;
        } else if(['FAILED','REJECTED'].includes(result.status) && row.status!=='SYNCED') {
          row.status=result.status; failedCount++;
        }
      }
      trace.push(`mark-end:${marks.length}`);
      return {syncedCount,failedCount,completedAt:'fixture-time'};
    },
    watchAllManagedFolders:async()=>({watchedCount:0,watchedFolderIds:[],skippedCount:0,skippedFolderIds:[]}),
    unwatchAllManagedFolders:async()=>undefined,
    listManagedFolders:async()=>({folders:[]}),
    stageLocalFileAnalysisBackfill:async()=>({candidates:[],stagedAt:'fixture-time'}),
    reconcileLocalFilesWithServer:async()=>({resetCount:0}),
    extractLocalFileKeySentences:async input=>{
      h.extractions.push(plain(input));
      const row=rows.find(r=>r.localFileId===input.localFileId);
      return {status:'READY',localFileId:input.localFileId,fileName:row.fileName,checksum:'fixture-checksum',
        analyzedCharCount:1,combinedText:'x',extractionMethod:'fixture',keySentences:[],mimeType:'text/plain',sourceCharCount:1,truncated:false};
    },
    markLocalFileAnalysesSent:async()=>({syncedCount:1,failedCount:0,completedAt:'fixture-time'}),
  };
  const stubs={
    '@/lib/auth/auth-session':{getStoredAuthSession:()=>({user:{id:h.ownerId}}),getAuthAccessToken:()=>null,getAuthClientType:()=> 'TAURI',getAuthRefreshToken:()=>null,clearStoredAuthSession:()=>{},setStoredAuthSession:()=>{},setStoredAuthSessionAndWaitForTauriMirror:async()=>{}},
    '@/lib/tauri/commands':{TAURI_COMMANDS:new Proxy({}, {get:(_,key)=>String(key)}),tauriCommands},
    '@/lib/tauri/is-tauri':{isTauriRuntime:()=>runtime},
    '@/features/managed-folder/api/managedFolderApi':{managedFolderApi:{async syncApprovedLocalFileEvents(payload) {
      const index=payloads.push(plain(payload));
      activeHttp++;maxHttp=Math.max(maxHttp,activeHttp);trace.push(`http-start:${index}`);
      try {
        if(h.onHttp)await h.onHttp(payload,index);
        if(h.responseFactory)return h.responseFactory(payload,index);
        return {results:payload.events.map(row=>({
          eventType:row.eventType,
          localEventId:row.localEventId,
          resourceId:row.resourceId??`resource-${rows.find(change=>change.localEventId===row.localEventId).localFileId}`,
          status:h.responseStatus??'SYNCED',
        }))};
      } finally {activeHttp--;trace.push(`http-end:${index}`);}
    }}},
    '@/features/managed-folder/api/localFileAnalysisApi':{localFileAnalysisApi:{create:async input=>{h.analysisCalls.push(plain(input));return {id:'fixture-job',status:'PENDING'};}}},
    '@/features/resources/api/resourcesApi':{resourcesApi:{listPersonalPage:async()=>({items:[],hasNext:false})}},
    '@/features/settings/api/settingsApi':{settingsApi:{getPrivacyConsents:async()=>({localFolderEnabled:consent})}},
    '@/lib/data-changed':{notifyDataChanged:()=>undefined},
    '@/lib/i18n/translate':{translate:key=>key},
    '@/lib/tauri/events':{listenManagedFolderWatchEvents:async handler=>{watchHandler=handler;return()=>{watchHandler=undefined;};}},
  };
  const context=vm.createContext({console,Date,Promise,Map,Set,Error,Headers,AbortController,FormData,setTimeout,clearTimeout,process:{env:{NODE_ENV:'development'}},window:{
    setInterval:callback=>{const id=++timerId;timers.set(id,{callback,interval:true});return id;},
    clearInterval:id=>timers.delete(id),
    setTimeout:callback=>{const id=++timerId;timers.set(id,{callback,interval:false});return id;},
    clearTimeout:id=>timers.delete(id),
    dispatchEvent:()=>true,
  },CustomEvent:class {constructor(type,input){this.type=type;this.detail=input.detail;}}});
  function load(name) {
    if(stubs[name])return stubs[name];
    if(cache.has(name))return cache.get(name).exports;
    assert(name.startsWith('@/'),`Unexpected import ${name}`);
    const file=path.join(frontend,'src',name.slice(2)+'.ts');
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{
      compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true,fileName:file,
    });
    assert.equal((code.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
    const module={exports:{}};cache.set(name,module);
    vm.runInContext(`(function(require,module,exports){${code.outputText}\n})`,context,{filename:file})(load,module,module.exports);
    return module.exports;
  }
  h.client=load('@/lib/local/managed-folder-client');
  h.ApiClientError=load('@/lib/api/errors').ApiClientError;
  h.parseRetryAfter=load('@/lib/api/errors').parseRetryAfter;
  h.httpClient=fetcher=>{
    Object.assign(context,{fetch:fetcher,Headers,AbortController,setTimeout,clearTimeout,process:{env:{NODE_ENV:'development'}}});
    stubs['@/lib/auth/auth-session']={getAuthAccessToken:()=>null};
    return load('@/lib/api/client');
  };
  h.auto=load('@/lib/local/managed-folder-auto-sync');
  h.send=input=>h.client.syncPersonalLocalFileEventsToServer({consentGranted:true,...input});
  h.setRuntime=value=>{runtime=value;};
  h.setConsent=value=>{consent=value;h.auto.notifyManagedFolderConsentChanged(value);};
  h.watch=folder=>{assert(watchHandler);watchHandler({localFolderId:folder});};
  h.fireInterval=()=>{for(const timer of timers.values())if(timer.interval)timer.callback();};
  h.fireDebounce=()=>{for(const [id,timer] of [...timers])if(!timer.interval){timers.delete(id);timer.callback();}};
  h.waitIdle=async()=>{
    await until(()=>['synced','failed','stopped'].includes(h.auto.getManagedFolderAutoSyncStatus().lastStatus));
    for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
  };
  h.observation=()=>({stages:plain(stages),httpRequests:payloads.length,maxConcurrentHttp:maxHttp,payloads:plain(payloads),marks:plain(marks),rows:plain(rows),trace:[...trace],scope:'Actual full TypeScript modules; Tauri commands, HTTP, local persistence and timers are controlled test doubles, not DB/UI integration'});
  return h;
}
function event(id,folder='folder-one',extra={}) {
  return {localEventId:id,localFileId:`file-${id}`,localFolderId:folder,eventType:'CREATED',fileName:`${id}.bin`,fileSizeBytes:10,resourceId:null,syncDeviceId:'fixture-device',localSequence:1,status:'PENDING',...extra};
}
module.exports={harness,event,defer,until,plain,variant,root,ts};
