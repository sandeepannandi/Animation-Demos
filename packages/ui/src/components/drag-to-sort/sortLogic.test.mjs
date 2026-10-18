import { test } from 'node:test';
import assert from 'node:assert/strict';
import { move, clamp, indexAt, edgeSpeed, slotFor } from './sortLogic.ts';
test('move is immutable and preserves all items', () => { const a = ['a','b','c','d']; assert.deepEqual(move(a,0,3),['b','c','d','a']); assert.deepEqual(move(a,3,0),['d','a','b','c']); assert.deepEqual(a,['a','b','c','d']); });
test('bounds and invalid sources are safe', () => { assert.deepEqual(move([1,2],0,99),[2,1]); assert.deepEqual(move([1,2],-1,0),[1,2]); assert.equal(clamp(NaN,0,4),0); assert.equal(indexAt(100,0,3),0); });
test('crossing requires passing the midpoint', () => { assert.equal(indexAt(40,82,10),0); assert.equal(indexAt(42,82,10),1); assert.equal(indexAt(-100,82,10),0); assert.equal(indexAt(99999,82,10),9); });
test('gap slots form a permutation forward and backward', () => { for(let from=0;from<8;from++) for(let to=0;to<8;to++) { const slots=Array.from({length:8},(_,i)=>slotFor(i,from,to)); assert.deepEqual([...slots].sort((a,b)=>a-b),[0,1,2,3,4,5,6,7]); assert.equal(slots[from],to); } });
test('edge scroll is zero centrally, grows quadratically, caps outside', () => { assert.equal(edgeSpeed(150,350),0); assert.equal(edgeSpeed(0,350),-520); assert.equal(edgeSpeed(350,350),520); assert.equal(edgeSpeed(-100,350),-520); assert.ok(Math.abs(edgeSpeed(16,350))>Math.abs(edgeSpeed(32,350))); assert.equal(edgeSpeed(10,0),0); });
test('empty lists and no-op moves', () => { assert.deepEqual(move([],0,1),[]); assert.deepEqual(move([1],0,0),[1]); assert.equal(indexAt(10,82,0),0); });
