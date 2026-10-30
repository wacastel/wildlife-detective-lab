'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),math=require('../ml_guide_interactions.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
test('99% frame accuracy can coexist with zero animal recall',()=>{
 const m=math.calculate(math.presets['all-empty']);assert.equal(m.total,100);close(m.accuracy,.99);assert.equal(m.recall,0);assert.equal(m.precision,null);assert.equal(m.f1,0);
});
test('known balanced confusion counts give the expected metrics',()=>{
 const m=math.calculate(math.presets.balanced);for(const key of ['accuracy','precision','recall','f1'])close(m[key],.8);
});
test('review and stricter examples preserve the same actual class balance',()=>{
 const review=math.calculate(math.presets['rare-recall']),strict=math.calculate(math.presets.stricter);
 assert.equal(review.animals,strict.animals);assert.equal(review.empty,strict.empty);assert.equal(review.total,strict.total);
 assert.ok(review.recall>strict.recall);assert.ok(review.precision<strict.precision);close(review.precision,8/23);close(strict.recall,.6);
});
test('absent denominator is undefined rather than a misleading perfect score',()=>{
 const empty=math.calculate({tp:0,fn:0,fp:0,tn:0});for(const key of ['accuracy','precision','recall','f1'])assert.equal(empty[key],null);
 const negatives=math.calculate({tp:0,fn:0,fp:0,tn:100});assert.equal(negatives.accuracy,1);assert.equal(negatives.recall,null);assert.equal(negatives.precision,null);assert.equal(negatives.f1,null);
 const wrong=math.calculate({tp:0,fn:10,fp:10,tn:0});assert.equal(wrong.accuracy,0);assert.equal(wrong.precision,0);assert.equal(wrong.recall,0);assert.equal(wrong.f1,0);
});
test('calculation is immutable and rejects malformed classroom counts',()=>{
 const sample={tp:3,fn:2,fp:1,tn:4},before={...sample};math.calculate(sample);assert.deepEqual(sample,before);
 for(const value of [-1,.5,NaN,Infinity,'3',100001])assert.throws(()=>math.calculate({...sample,tp:value}),RangeError);
 assert.throws(()=>math.calculate({tp:1}),RangeError);assert.throws(()=>math.calculate(null),TypeError);
});
