import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
fs.rmSync('.test-build', {recursive:true,force:true});
for (const folder of ['lib','api']) {
 const dir=path.join(root,'src',folder); if (!fs.existsSync(dir)) continue;
 for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith('.ts') || name.endsWith('.d.ts')) continue;
  const out=ts.transpileModule(fs.readFileSync(path.join(dir,name),'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022},fileName:name,reportDiagnostics:true});
  const errors=(out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  if(errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors,{getCanonicalFileName:x=>x,getCurrentDirectory:()=>root,getNewLine:()=>"\n"}));
  fs.mkdirSync(path.join('.test-build',folder),{recursive:true}); fs.writeFileSync(path.join('.test-build',folder,name.replace(/\.ts$/,'.js')),out.outputText);
 }
}
const run=spawnSync(process.execPath,['--test',...fs.readdirSync('tests').filter(n=>n.endsWith('.test.mjs')).map(n=>'tests/'+n)],{stdio:'inherit'});
process.exit(run.status??1);
