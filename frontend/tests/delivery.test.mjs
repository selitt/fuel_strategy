import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../vite.config.ts';

test('production assets resolve relative to a reverse-proxy mount point',()=>{
 assert.equal(config.base,'./');
});
