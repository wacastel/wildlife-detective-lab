'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const math=require('../photo_training_math.js');
const close=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected}`);
const names=['conv1','conv2','dense','output'];
const small={width:8,height:8,channels:3,filters1:2,filters2:2,hidden:4,classes:3,seed:17};
function variedExamples(config=small){return Array.from({length:3},(_,label)=>({label,features:Float64Array.from({length:config.width*config.height*config.channels},(_,i)=>.18+.31*Math.sin((i+1)*(.31+label*.13)))}));}

test('the default model has two learned convolutions, two dense layers and 5,083 parameters',()=>{
 const model=math.createModel();
 assert.equal(math.parameterCount(model),5083);
 assert.deepEqual(math.layerInfo(model).map(layer=>[layer.name,layer.parameterCount]),[['conv1',112],['conv2',296],['dense',4624],['output',51]]);
 assert.deepEqual(model.shapes,{input:[24,24,3],conv1:[24,24,4],pool1:[12,12,4],conv2:[12,12,8],pool2:[6,6,8],hidden:[16],output:[3]});
 assert.deepEqual(math.createModel(),model);
 assert.notDeepEqual(math.createModel({seed:43}).layers.conv1.weights,model.layers.conv1.weights);
 assert.ok(model.layers.conv1.weights.some(value=>value!==0));
 for(const layer of Object.values(model.layers))assert.ok(layer.biases.every(value=>value===0));
});

test('forward intermediates calculate zero-padded convolution, ReLU, mean pooling and scores',()=>{
 const model=math.createModel({width:4,height:4,channels:1,filters1:1,filters2:1,hidden:1,classes:2});
 for(const layer of Object.values(model.layers)){layer.weights.fill(0);layer.biases.fill(0);}
 model.layers.conv1.weights.fill(1);model.layers.conv2.weights[4]=1;
 model.layers.dense.weights[0]=1;model.layers.output.weights.set([1,-1]);
 const input=Float64Array.from({length:16},()=>1),prediction=math.predict(model,input),a=prediction.activations;
 assert.deepEqual(Array.from(a.conv1Pre),[4,6,6,4,6,9,9,6,6,9,9,6,4,6,6,4]);
 assert.deepEqual(Array.from(a.pool1),[6.25,6.25,6.25,6.25]);
 assert.deepEqual(Array.from(a.pool2),[6.25]);assert.deepEqual(Array.from(a.hidden),[6.25]);
 assert.deepEqual(prediction.logits,[6.25,-6.25]);
 close(prediction.probabilities[0],1/(1+Math.exp(-12.5)));
 assert.equal(prediction.predictedClass,0);
 model.layers.conv1.biases[0]=-10;
 const stopped=math.predict(model,input).activations;
 assert.ok(stopped.conv1.every(value=>value===0));assert.equal(stopped.hidden[0],0);
 assert.notEqual(a.input,input);
});

test('analytic backpropagation agrees with finite differences for every small-network parameter',()=>{
 const model=math.createModel(small),examples=variedExamples();
 // Move differentiability checks away from exact-zero ReLU boundaries.
 for(const name of names)model.layers[name].biases.fill(.071);
 const gradient=math.gradients(model,examples),epsilon=1e-6;
 let checked=0;
 for(const name of names)for(const kind of ['weights','biases']){
  const values=model.layers[name][kind];
  for(let i=0;i<values.length;i++){
   const old=values[i];values[i]=old+epsilon;const above=math.loss(model,examples);
   values[i]=old-epsilon;const below=math.loss(model,examples);values[i]=old;
   close(gradient.layers[name][kind][i],(above-below)/(2*epsilon),2e-7);checked++;
  }
 }
 assert.equal(checked,math.parameterCount(model));
});

test('a batch gradient is the mean of per-photo gradients, with one-hot cross-entropy targets',()=>{
 const model=math.createModel(small),examples=variedExamples(),batch=math.gradients(model,examples),individual=examples.map(example=>math.gradients(model,[example]));
 for(const name of names)for(const kind of ['weights','biases'])for(let i=0;i<batch.layers[name][kind].length;i++)close(batch.layers[name][kind][i],individual.reduce((sum,g)=>sum+g.layers[name][kind][i],0)/examples.length,1e-12);
 close(batch.loss,individual.reduce((sum,g)=>sum+g.loss,0)/examples.length);
 const duplicate=math.gradients(model,[...examples,...examples]);
 for(const name of names)for(let i=0;i<batch.layers[name].weights.length;i++)close(batch.layers[name].weights[i],duplicate.layers[name].weights[i],1e-12);
});

test('SGD applies the actual gradient to every learned layer and exposes an exact inspected update',()=>{
 const model=math.createModel(small),examples=variedExamples(),rate=.12,result=math.step(model,examples,rate);
 assert.equal(model.steps,0);assert.equal(result.model.steps,1);assert.equal(result.previousModel,model);
 for(const name of names){
  for(const kind of ['weights','biases'])for(let i=0;i<model.layers[name][kind].length;i++)close(result.model.layers[name][kind][i],model.layers[name][kind][i]-rate*result.gradients.layers[name][kind][i]);
  assert.ok(result.layerUpdates[name].gradientNorm>0);
  close(result.layerUpdates[name].deltaNorm,rate*result.layerUpdates[name].gradientNorm,1e-10);
 }
 const index=Array.from(result.gradients.layers.conv1.weights).findIndex(value=>Math.abs(value)>1e-7),inspected=math.inspectUpdate(result,'conv1',index);
 close(inspected.after,inspected.before-inspected.learningRate*inspected.gradient);
 close(inspected.change,inspected.after-inspected.before);
 close(result.deltaNorm,rate*result.gradientNorm,1e-10);
 assert.ok(result.after.loss<result.before.loss);
});

test('repeated real updates learn a separable RGB image fixture through the CNN',()=>{
 const config={width:8,height:8,channels:3,filters1:2,filters2:3,hidden:8,classes:3,seed:42};
 const examples=Array.from({length:6},(_,n)=>({label:Math.floor(n/2),features:Float64Array.from({length:8*8*3},(_,i)=>(i%3===Math.floor(n/2)?.5:-.5)+((i+n)%5-2)*.01)}));
 let model=math.createModel(config);const first=math.evaluate(model,examples),initial=math.cloneModel(model);
 for(let step=0;step<120;step++)model=math.step(model,examples,.1).model;
 const last=math.evaluate(model,examples);
 assert.ok(last.loss<first.loss/20);assert.equal(last.accuracy,1);assert.equal(model.steps,120);
 for(const name of names)assert.notDeepEqual(model.layers[name].weights,initial.layers[name].weights);
});

test('prediction, held-out evaluation, gradients, cloning and updates do not mutate their inputs',()=>{
 const model=math.createModel(small),examples=variedExamples(),beforeModel=JSON.stringify(model),beforeExamples=JSON.stringify(examples);
 math.predict(model,examples[0].features);math.evaluate(model,examples);math.gradients(model,examples);math.step(model,examples,.1);
 assert.equal(JSON.stringify(model),beforeModel);assert.equal(JSON.stringify(examples),beforeExamples);
 const clone=math.cloneModel(model);clone.layers.conv1.weights[0]+=1;
 assert.notDeepEqual(clone.layers.conv1.weights,model.layers.conv1.weights);
 assert.deepEqual(math.step(model,examples,.1),math.step(model,examples,.1));
 const zero=math.step(model,examples,0);close(zero.deltaNorm,0);close(zero.after.loss,zero.before.loss);
 for(const name of names)assert.deepEqual(zero.model.layers[name].weights,model.layers[name].weights);
});

test('stable softmax and cross-entropy handle extreme logits without log-zero or cancellation',()=>{
 const model=math.createModel(small),features=variedExamples()[0].features;
 model.layers.output.weights.fill(0);model.layers.output.biases.set([1000,0,-1000]);
 const prediction=math.predict(model,features);close(prediction.probabilities.reduce((sum,value)=>sum+value,0),1);assert.equal(prediction.probabilities[2],0);
 close(math.loss(model,[{features,label:2}]),2000);
 assert.ok(Number.isFinite(math.step(model,[{features,label:2}],.1).after.loss));
 model.layers.output.biases.fill(1e16);close(math.loss(model,[{features,label:2}]),Math.log(3));
});

test('invalid geometry, pixels, labels, models, rates and parameter selections fail clearly',()=>{
 const model=math.createModel(small),examples=variedExamples();
 for(const config of [{width:7},{height:0},{channels:0},{seed:-1},{classes:NaN}])assert.throws(()=>math.createModel(config),RangeError);
 assert.throws(()=>math.createModel(48),TypeError);
 for(const rate of [-1,NaN,Infinity])assert.throws(()=>math.step(model,examples,rate),RangeError);
 assert.throws(()=>math.evaluate(model,[]),RangeError);
 assert.throws(()=>math.predict(model,[1]),RangeError);
 const invalid=examples[0].features.slice();invalid[2]=NaN;
 assert.throws(()=>math.predict(model,invalid),RangeError);
 assert.throws(()=>math.evaluate(model,[{features:examples[0].features,label:3}]),RangeError);
 const malformed=math.cloneModel(model);malformed.layers.conv2.weights=new Float64Array(2);
 assert.throws(()=>math.predict(malformed,examples[0].features),RangeError);
 const result=math.step(model,examples,.1);
 assert.throws(()=>math.inspectUpdate(result,'missing',0),RangeError);
 assert.throws(()=>math.inspectUpdate(result,'conv1',-1),RangeError);
});
