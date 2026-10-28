const {spawnSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const frontend = path.resolve(__dirname,'..');
const work = fs.mkdtempSync(path.join(os.tmpdir(),'bubli-sync-test-'));
fs.mkdirSync(path.join(work,'evidence','after'),{recursive:true});
const tests = ['shared-sync','response-contract','queue-security'].map(name=>path.join(__dirname,'sync-tests',`${name}.test.cjs`));
const result = spawnSync(process.execPath,['--test',...tests],{
  stdio:'inherit',cwd:frontend,
  env:{...process.env,SYNC_VARIANT:'after',BUBLI_SYNC_FRONTEND_ROOT:frontend,BUBLI_SYNC_WORK_ROOT:work},
});
console.log(`Test observations: ${work}`);
if(result.error) throw result.error;
process.exitCode=result.status??1;
