/** Explicit portable fallback, NOT Vite and NOT a semantic typecheck.
 * Reuses the React 18.2 runtime distributed in the previous project snapshot.
 * Full product build: npm run build (tsc + Vite).
 * Fallback: node scripts/build-portable.mjs (requires installed TypeScript).
 * Does actual source compilation and records provenance + hashes, not just a manifest rewrite.
 */
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const repo=path.resolve(root,'..');
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)]).sort();
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const sourceFiles=files(path.join(root,'src'));
const factories=[];
for(const file of sourceFiles.filter(n=>/\.tsx?$/.test(n)&&!n.endsWith('.d.ts'))){
 const input=fs.readFileSync(file,'utf8'),name=path.relative(root,file).split(path.sep).join('/');
 const compiled=ts.transpileModule(input,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,jsxFactory:'__React.createElement',jsxFragmentFactory:'__React.Fragment',esModuleInterop:true}});
 const errors=(compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 if(errors.length)throw new Error(ts.formatDiagnosticsWithColorAndContext(errors,{getCanonicalFileName:n=>n,getCurrentDirectory:()=>root,getNewLine:()=>"\n"}));
 factories.push(`${JSON.stringify(name)}:(module,exports,require)=>{\nconst __React=require('react');\n${compiled.outputText}\n}`);
}
const prefix=fs.readFileSync(path.join(root,'vendor/react18-prefix.txt'),'utf8');
const loader=fs.readFileSync(path.join(root,'vendor/module-loader.txt'),'utf8');
const js=prefix+'const __modules={'+factories.join(',\n')+'};\n'+loader;
const css=fs.readFileSync(path.join(root,'src/styles.css'),'utf8');
const output=path.join(root,'prebuilt');
fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(path.join(output,'assets'),{recursive:true});
const jsName=`app.${hash(js).slice(0,12)}.js`,cssName=`app.${hash(css).slice(0,12)}.css`;
fs.writeFileSync(path.join(output,'assets',jsName),js);fs.writeFileSync(path.join(output,'assets',cssName),css);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<script type="module" src="/src/main.tsx"></script>',`<script defer src="/assets/${jsName}"></script>`).replace('</head>',`<link rel="stylesheet" href="/assets/${cssName}"/></head>`);
fs.writeFileSync(path.join(output,'index.html'),html);
fs.cpSync(path.join(root,'public'),output,{recursive:true});
fs.copyFileSync(path.join(root,'vendor/THIRD_PARTY_NOTICES.txt'),path.join(output,'THIRD_PARTY_NOTICES.txt'));
const map=paths=>Object.fromEntries(paths.map(f=>[path.relative(repo,f).split(path.sep).join('/'),hash(fs.readFileSync(f))]));
const manifest={build_method:`TypeScript ${ts.version} transpileModule + CommonJS assembly; NOT Vite or semantic tsc validation`,runtime:'React 18.2.0 runtime copied from previous supplied project; see vendor/THIRD_PARTY_NOTICES.txt',command:'cd frontend && node scripts/build-portable.mjs',source_sha256:map([...sourceFiles,...files(path.join(root,'vendor')),...files(path.join(root,'public')),path.join(root,'index.html'),path.join(root,'scripts/build-portable.mjs')]),asset_sha256:map(files(output))};
fs.writeFileSync(path.join(output,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Portable browser package built: ${factories.length} modules, ${js.length} JS characters. This is not Vite.`);
