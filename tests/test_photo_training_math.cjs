'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const math=require('../photo_training_math.js');
const close=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected}`);
const examples=[{features:[1,0],label:0},{features:[0,1],label:1},{features:[-1,-1],label:2}];

test('zero initialization and the first complete batch update have known values',()=>{
 const model=math.createModel(2,3),prediction=math.predict(model,[1,0]);
 prediction.probabilities.forEach(value=>close(value,1/3));
 close(math.loss(model,examples),Math.log(3));
 const result=math.step(model,examples,.3);
 const expected=[[.1,0],[0,.1],[-.1,-.1]];
 result.model.weights.forEach((row,c)=>row.forEach((value,i)=>close(value,expected[c][i])));
 result.model.biases.forEach(value=>close(value,0));
 assert.equal(result.model.steps,1);assert.equal(model.steps,0);
 assert.ok(result.after.loss<result.before.loss);
 close(result.deltaNorm,.3*result.gradientNorm);
});

test('analytical gradients agree with finite differences for every weight and bias',()=>{
 const model=math.createModel(2,3);
 model.weights=[[.21,-.31],[.07,.19],[-.2,.11]];model.biases=[.13,-.04,.03];
 const gradient=math.gradients(model,examples),epsilon=1e-5;
 for(let c=0;c<3;c++)for(let i=0;i<2;i++){
  const old=model.weights[c][i];model.weights[c][i]=old+epsilon;const above=math.loss(model,examples);
  model.weights[c][i]=old-epsilon;const below=math.loss(model,examples);model.weights[c][i]=old;
  close(gradient.weights[c][i],(above-below)/(2*epsilon),1e-8);
 }
 for(let c=0;c<3;c++){
  const old=model.biases[c];model.biases[c]=old+epsilon;const above=math.loss(model,examples);
  model.biases[c]=old-epsilon;const below=math.loss(model,examples);model.biases[c]=old;
  close(gradient.biases[c],(above-below)/(2*epsilon),1e-8);
 }
});

test('repeated updates reduce loss on six fixed image-feature teaching examples',()=>{
 const training=[];
 for(let label=0;label<3;label++)for(let encounter=0;encounter<2;encounter++){
  const features=Array.from({length:48},(_,i)=>(Math.floor(i/16)===label?.6:-.3)+(encounter?-.04:.04)*(i%2?1:-1));
  training.push({features,label});
 }
 let model=math.createModel(48,3);const initial=math.loss(model,training);
 for(let i=0;i<100;i++)model=math.step(model,training,.2).model;
 const evaluated=math.evaluate(model,training);
 assert.ok(evaluated.loss<initial/20);assert.equal(evaluated.accuracy,1);assert.equal(model.steps,100);
});

test('prediction, validation evaluation, gradients and updates leave all inputs unchanged',()=>{
 const model=math.createModel(2,3),beforeModel=JSON.stringify(model),beforeExamples=JSON.stringify(examples);
 math.predict(model,[.5,.1]);math.evaluate(model,examples);math.gradients(model,examples);math.step(model,examples,1);
 assert.equal(JSON.stringify(model),beforeModel);assert.equal(JSON.stringify(examples),beforeExamples);
 assert.deepEqual(math.createModel(2,3),model);
 assert.deepEqual(math.step(model,examples,.2),math.step(model,examples,.2));
});

test('softmax and cross-entropy remain finite for extreme confident wrong predictions',()=>{
 const model=math.createModel(1,3);model.weights=[[1000],[0],[-1000]];
 const prediction=math.predict(model,[1]);
 close(prediction.probabilities.reduce((sum,value)=>sum+value,0),1);
 assert.equal(prediction.probabilities[2],0);
 close(math.loss(model,[{features:[1],label:2}]),2000);
 assert.ok(Number.isFinite(math.step(model,[{features:[1],label:2}],1).after.loss));
 model.weights=[[1e16],[1e16],[1e16]];
 close(math.loss(model,[{features:[1],label:2}]),Math.log(3));
});

test('invalid examples and learning rates fail clearly instead of displaying NaN',()=>{
 const model=math.createModel(2,3);
 for(const rate of [-1,NaN,Infinity])assert.throws(()=>math.step(model,examples,rate),RangeError);
 assert.throws(()=>math.evaluate(model,[]),RangeError);
 assert.throws(()=>math.predict(model,[1]),RangeError);
 assert.throws(()=>math.predict(model,[1,NaN]),RangeError);
 assert.throws(()=>math.evaluate(model,[{features:[1,0],label:3}]),RangeError);
 assert.throws(()=>math.createModel(0,3),RangeError);
});
