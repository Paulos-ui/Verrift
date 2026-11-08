import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const read=relative=>fs.readFile(path.join(root,relative),'utf8');

test('White Room identity keeps the homepage pure white and the app accessible',async()=>{
 const [landing,shared,workspace,refinement]=await Promise.all([
  read('public/landing.css'),read('public/styles.css'),read('public/workspace.html'),read('public/ui-v5.css')
 ]);
 assert.match(landing,/--paper:#ffffff/);
 assert.match(shared,/--paper:#ffffff/);
 assert.match(workspace,/href="\/ui-v5\.css"/);
 assert.match(refinement,/\.dashboard-columns/);
 assert.match(refinement,/\[hidden\]\s*\{\s*display:none!important/);
 assert.match(refinement,/@media\(max-width:640px\)/);
 assert.match(workspace,/href="\/ui-v6\.css"/);
});

test('Overview cards are built from actual user data and preserve working actions',async()=>{
 const source=await read('public/app.js');
 assert.match(source,/const \{cases,runs,sandbox,projects,payouts,anchors\}=state\.data/);
 assert.match(source,/const verifiedCases=cases\.filter/);
 assert.match(source,/const proofSteps=/);
 assert.match(source,/cases\.slice\(0,4\)\.map\(caseRow\)/);
 assert.match(source,/data-action="quick-start-case"/);
 assert.match(source,/data-action="set-sandbox"/);
 assert.match(source,/data-action="new-case"/);
 assert.match(source,/illustration only/gi);
});

test('Visitor navigation and browser title remain correctly branded',async()=>{
 const [landing,workspace]=await Promise.all([read('public/index.html'),read('public/workspace.html')]);
 assert.match(landing,/href="\/app"/);
 assert.match(workspace,/href="\/" aria-label="VERRIFT home"/);
 assert.match(workspace,/<title>VERRIFT \| The Proof-of-Fix Network<\/title>/);
 assert.match(workspace,/class="nav-mobile">Domains<\/span>/);
});

test('Customer-facing VERRIFT source has no em dashes',async()=>{
 const files=await fs.readdir(path.join(root,'public'));
 for(const name of files.filter(n=>/\.(html|css|js|svg)$/.test(n))){
  assert.equal((await read(`public/${name}`)).includes('—'),false,`${name} contains an em dash`);
 }
});
