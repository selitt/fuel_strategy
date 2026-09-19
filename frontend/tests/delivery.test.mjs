import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadConfigFromFile } from 'vite';

test('production assets resolve relative to a reverse-proxy mount point',async()=>{
 const loaded=await loadConfigFromFile(
  {command:'build',mode:'production'},
  fileURLToPath(new URL('../vite.config.ts',import.meta.url)),
 );
 assert.equal(loaded?.config.base,'./');
});
