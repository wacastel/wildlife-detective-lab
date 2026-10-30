/* A real, compact classroom CNN. Training never changes the wildlife models. */
var PhotoTrainingMath = (() => {
 'use strict';
 const LAYER_NAMES=['conv1','conv2','dense','output'];
 function positiveInteger(value,name){if(!Number.isInteger(value)||value<1)throw new RangeError(`${name} must be a positive integer.`);return value;}
 function finite(value,name){if(!Number.isFinite(value))throw new RangeError(`${name} must be finite.`);return value;}
 function checkedArray(values,length,name){
  if(!values||values.length!==length)throw new RangeError(`Expected ${length} ${name}.`);
  for(let i=0;i<length;i++)finite(values[i],name);
 }
 function options(options={}){
  if(!options||typeof options!=='object'||Array.isArray(options))throw new TypeError('CNN settings must be an object.');
  const config={width:24,height:24,channels:3,filters1:4,filters2:8,hidden:16,classes:3,seed:42,...options};
  for(const key of ['width','height','channels','filters1','filters2','hidden','classes'])positiveInteger(config[key],key);
  if(config.width%4||config.height%4)throw new RangeError('Image width and height must be divisible by four.');
  if(config.width>128||config.height>128||config.channels>16||config.filters1>64||config.filters2>64||config.hidden>256||config.classes>100)throw new RangeError('Choose dimensions suitable for the small classroom CNN.');
  if(!Number.isInteger(config.seed)||config.seed<0||config.seed>0xffffffff)throw new RangeError('Seed must be a 32-bit unsigned integer.');
  return config;
 }
 function shapes(config){return {input:[config.height,config.width,config.channels],conv1:[config.height,config.width,config.filters1],pool1:[config.height/2,config.width/2,config.filters1],conv2:[config.height/2,config.width/2,config.filters2],pool2:[config.height/4,config.width/4,config.filters2],hidden:[config.hidden],output:[config.classes]};}
 function normalGenerator(seed){
  let state=seed>>>0,spare=null;
  function uniform(){state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
  return ()=>{if(spare!==null){const value=spare;spare=null;return value;}const radius=Math.sqrt(-2*Math.log(Math.max(uniform(),Number.EPSILON))),angle=2*Math.PI*uniform();spare=radius*Math.sin(angle);return radius*Math.cos(angle);};
 }
 function createModel(settings={}){
  const config=options(settings),shape=shapes(config),normal=normalGenerator(config.seed),layers={};
  function layer(name,kind,inputs,outputs,kernel=1){
   const count=inputs*outputs*kernel*kernel,scale=Math.sqrt((name==='output'?1:2)/(inputs*kernel*kernel));
   layers[name]={kind,inputs,outputs,kernel,weights:Float64Array.from({length:count},()=>normal()*scale),biases:new Float64Array(outputs)};
  }
  layer('conv1','convolution',config.channels,config.filters1,3);
  layer('conv2','convolution',config.filters1,config.filters2,3);
  layer('dense','dense',shape.pool2.reduce((a,b)=>a*b,1),config.hidden);
  layer('output','dense',config.hidden,config.classes);
  return {kind:'classroom-cnn-v1',config,shapes:shape,layers,steps:0};
 }
 function validate(model){
  if(!model||model.kind!=='classroom-cnn-v1'||!model.layers)throw new TypeError('A classroom CNN model is required.');
  const config=options(model.config),expected=shapes(config),counts={conv1:[config.channels,config.filters1,3],conv2:[config.filters1,config.filters2,3],dense:[expected.pool2.reduce((a,b)=>a*b,1),config.hidden,1],output:[config.hidden,config.classes,1]};
  for(const name of LAYER_NAMES){const layer=model.layers[name],[inputs,outputs,kernel]=counts[name];if(!layer||layer.inputs!==inputs||layer.outputs!==outputs||layer.kernel!==kernel)throw new RangeError(`Invalid ${name} dimensions.`);checkedArray(layer.weights,inputs*outputs*kernel*kernel,'weights');checkedArray(layer.biases,outputs,'biases');}
  if(!Number.isInteger(model.steps)||model.steps<0)throw new RangeError('Training steps must be a nonnegative integer.');
  return config;
 }
 function checkedExamples(examples,config){
  if(!Array.isArray(examples)||!examples.length)throw new RangeError('At least one labeled training photo is required.');
  const length=config.width*config.height*config.channels;
  for(const example of examples){checkedArray(example?.features,length,'image values');if(!Number.isInteger(example.label)||example.label<0||example.label>=config.classes)throw new RangeError('A teaching label must be a valid class index.');}
 }
 function convForward(input,height,width,layer){
  const {inputs,outputs,weights,biases}=layer,result=new Float64Array(height*width*outputs);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let out=0;out<outputs;out++){
   let value=biases[out];
   for(let ky=0;ky<3;ky++){const iy=y+ky-1;if(iy<0||iy>=height)continue;for(let kx=0;kx<3;kx++){const ix=x+kx-1;if(ix<0||ix>=width)continue;const source=(iy*width+ix)*inputs,weight=((out*3+ky)*3+kx)*inputs;for(let ch=0;ch<inputs;ch++)value+=input[source+ch]*weights[weight+ch];}}
   result[(y*width+x)*outputs+out]=value;
  }
  return result;
 }
 function relu(input){return input.map(value=>Math.max(0,value));}
 function poolForward(input,height,width,channels){
  const result=new Float64Array(height*width*channels/4),outWidth=width/2;
  for(let y=0;y<height;y+=2)for(let x=0;x<width;x+=2)for(let ch=0;ch<channels;ch++)result[((y/2)*outWidth+x/2)*channels+ch]=(input[(y*width+x)*channels+ch]+input[(y*width+x+1)*channels+ch]+input[((y+1)*width+x)*channels+ch]+input[((y+1)*width+x+1)*channels+ch])/4;
  return result;
 }
 function denseForward(input,layer){
  const result=new Float64Array(layer.outputs);
  for(let out=0;out<layer.outputs;out++){let value=layer.biases[out];const base=out*layer.inputs;for(let i=0;i<layer.inputs;i++)value+=layer.weights[base+i]*input[i];result[out]=value;}
  return result;
 }
 function forward(model,features){
  const config=model.config,{height,width}=config,act={input:features};
  act.conv1Pre=convForward(features,height,width,model.layers.conv1);act.conv1=act.relu1=relu(act.conv1Pre);
  act.pool1=poolForward(act.conv1,height,width,config.filters1);
  act.conv2Pre=convForward(act.pool1,height/2,width/2,model.layers.conv2);act.conv2=act.relu2=relu(act.conv2Pre);
  act.pool2=poolForward(act.conv2,height/2,width/2,config.filters2);
  act.hiddenPre=denseForward(act.pool2,model.layers.dense);act.hidden=relu(act.hiddenPre);
  act.logits=denseForward(act.hidden,model.layers.output);
  const logits=Array.from(act.logits);for(const value of logits)finite(value,'Class score');
  const maxLogit=Math.max(...logits),exponentials=logits.map(value=>Math.exp(value-maxLogit)),denominator=exponentials.reduce((sum,value)=>sum+value,0),probabilities=exponentials.map(value=>value/denominator);
  let predictedClass=0;for(let c=1;c<logits.length;c++)if(logits[c]>logits[predictedClass])predictedClass=c;
  return {logits,probabilities,predictedClass,confidence:probabilities[predictedClass],maxLogit,logDenominator:Math.log(denominator),activations:act};
 }
 function predict(model,features){const config=validate(model);checkedArray(features,config.width*config.height*config.channels,'image values');return forward(model,Float64Array.from(features));}
 function exampleLoss(prediction,label){return finite((prediction.maxLogit-prediction.logits[label])+prediction.logDenominator,'Cross-entropy loss');}
 function evaluateUnchecked(model,examples){let loss=0,correct=0;for(const example of examples){const prediction=forward(model,example.features);loss+=exampleLoss(prediction,example.label);if(prediction.predictedClass===example.label)correct++;}return {loss:loss/examples.length,accuracy:correct/examples.length,count:examples.length};}
 function evaluate(model,examples){const config=validate(model);checkedExamples(examples,config);return evaluateUnchecked(model,examples);}
 function loss(model,examples){return evaluate(model,examples).loss;}
 function emptyGradients(model){const layers={};for(const name of LAYER_NAMES){const layer=model.layers[name];layers[name]={weights:new Float64Array(layer.weights.length),biases:new Float64Array(layer.biases.length)};}return layers;}
 function denseBackward(input,layer,upstream,gradient){
  const downstream=new Float64Array(layer.inputs);
  for(let out=0;out<layer.outputs;out++){const d=upstream[out],base=out*layer.inputs;gradient.biases[out]+=d;for(let i=0;i<layer.inputs;i++){gradient.weights[base+i]+=d*input[i];downstream[i]+=d*layer.weights[base+i];}}
  return downstream;
 }
 function reluBackward(upstream,preactivation){const result=new Float64Array(upstream.length);for(let i=0;i<result.length;i++)result[i]=preactivation[i]>0?upstream[i]:0;return result;}
 function poolBackward(upstream,height,width,channels){
  const result=new Float64Array(height*width*channels),outWidth=width/2;
  for(let y=0;y<height;y+=2)for(let x=0;x<width;x+=2)for(let ch=0;ch<channels;ch++){const d=upstream[((y/2)*outWidth+x/2)*channels+ch]/4;result[(y*width+x)*channels+ch]=d;result[(y*width+x+1)*channels+ch]=d;result[((y+1)*width+x)*channels+ch]=d;result[((y+1)*width+x+1)*channels+ch]=d;}
  return result;
 }
 function convBackward(input,height,width,layer,upstream,gradient){
  const {inputs,outputs,weights}=layer,result=new Float64Array(input.length);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let out=0;out<outputs;out++){
   const d=upstream[(y*width+x)*outputs+out];gradient.biases[out]+=d;
   for(let ky=0;ky<3;ky++){const iy=y+ky-1;if(iy<0||iy>=height)continue;for(let kx=0;kx<3;kx++){const ix=x+kx-1;if(ix<0||ix>=width)continue;const source=(iy*width+ix)*inputs,weight=((out*3+ky)*3+kx)*inputs;for(let ch=0;ch<inputs;ch++){gradient.weights[weight+ch]+=d*input[source+ch];result[source+ch]+=d*weights[weight+ch];}}}
  }
  return result;
 }
 function gradientsUnchecked(model,examples){
  const layers=emptyGradients(model),config=model.config,{height,width}=config;let totalLoss=0,correct=0;
  for(const example of examples){
   const prediction=forward(model,example.features),a=prediction.activations;totalLoss+=exampleLoss(prediction,example.label);if(prediction.predictedClass===example.label)correct++;
   let d=Float64Array.from(prediction.probabilities,(value,c)=>(value-(c===example.label?1:0))/examples.length);
   d=denseBackward(a.hidden,model.layers.output,d,layers.output);d=reluBackward(d,a.hiddenPre);
   d=denseBackward(a.pool2,model.layers.dense,d,layers.dense);
   d=poolBackward(d,height/2,width/2,config.filters2);d=reluBackward(d,a.conv2Pre);
   d=convBackward(a.pool1,height/2,width/2,model.layers.conv2,d,layers.conv2);
   d=poolBackward(d,height,width,config.filters1);d=reluBackward(d,a.conv1Pre);
   convBackward(a.input,height,width,model.layers.conv1,d,layers.conv1);
  }
  return {layers,loss:totalLoss/examples.length,accuracy:correct/examples.length,count:examples.length};
 }
 function gradients(model,examples){const config=validate(model);checkedExamples(examples,config);return gradientsUnchecked(model,examples);}
 function squaredNorm(values){let sum=0;for(let i=0;i<values.length;i++)sum+=values[i]*values[i];return sum;}
 function cloneModel(model){validate(model);const layers={};for(const name of LAYER_NAMES){const source=model.layers[name];layers[name]={...source,weights:source.weights.slice(),biases:source.biases.slice()};}return {...model,config:{...model.config},shapes:shapes(model.config),layers};}
 function step(model,examples,learningRate){
  finite(learningRate,'Learning rate');if(learningRate<0)throw new RangeError('Learning rate cannot be negative.');
  const config=validate(model);checkedExamples(examples,config);const gradient=gradientsUnchecked(model,examples),updated=cloneModel(model),layerUpdates={};let gradientSquared=0,deltaSquared=0,weightDeltaSquared=0,biasDeltaSquared=0;
  for(const name of LAYER_NAMES){let layerGradientSquared=0,layerDeltaSquared=0;const source=model.layers[name],target=updated.layers[name],g=gradient.layers[name];
   for(const kind of ['weights','biases'])for(let i=0;i<source[kind].length;i++){const derivative=g[kind][i],value=finite(source[kind][i]-learningRate*derivative,'Updated parameter'),delta=value-source[kind][i];target[kind][i]=value;layerGradientSquared+=derivative*derivative;layerDeltaSquared+=delta*delta;if(kind==='weights')weightDeltaSquared+=delta*delta;else biasDeltaSquared+=delta*delta;}
   gradientSquared+=layerGradientSquared;deltaSquared+=layerDeltaSquared;layerUpdates[name]={gradientNorm:Math.sqrt(layerGradientSquared),deltaNorm:Math.sqrt(layerDeltaSquared),parameterCount:source.weights.length+source.biases.length};
  }
  updated.steps=model.steps+1;
  return {previousModel:model,model:updated,learningRate,before:{loss:gradient.loss,accuracy:gradient.accuracy,count:gradient.count},after:evaluateUnchecked(updated,examples),gradients:gradient,gradientNorm:Math.sqrt(gradientSquared),deltaNorm:Math.sqrt(deltaSquared),weightDeltaNorm:Math.sqrt(weightDeltaSquared),biasDeltaNorm:Math.sqrt(biasDeltaSquared),layerUpdates};
 }
 function parameterCount(model){validate(model);return LAYER_NAMES.reduce((sum,name)=>sum+model.layers[name].weights.length+model.layers[name].biases.length,0);}
 function layerInfo(model){validate(model);const s=model.shapes;return LAYER_NAMES.map(name=>{const l=model.layers[name],spatial=name==='conv1'||name==='conv2';return {name,type:l.kind,label:{conv1:'Convolution 1',conv2:'Convolution 2',dense:'Dense hidden layer',output:'Output scores'}[name],inputShape:name==='conv1'?s.input:name==='conv2'?s.pool1:name==='dense'?s.pool2:s.hidden,outputShape:spatial?s[name]:name==='dense'?s.hidden:s.output,weightShape:spatial?[l.outputs,3,3,l.inputs]:[l.outputs,l.inputs],weightCount:l.weights.length,biasCount:l.biases.length,parameterCount:l.weights.length+l.biases.length};});}
 function inspectUpdate(result,layerName,index,kind='weights'){
  if(!LAYER_NAMES.includes(layerName)||!['weights','biases'].includes(kind))throw new RangeError('Choose a known layer and parameter type.');
  const old=result?.previousModel?.layers[layerName]?.[kind],gradient=result?.gradients?.layers[layerName]?.[kind],updated=result?.model?.layers[layerName]?.[kind];
  if(!old||!Number.isInteger(index)||index<0||index>=old.length)throw new RangeError('Choose a valid parameter index.');
  return {layer:layerName,kind,index,before:old[index],gradient:gradient[index],learningRate:result.learningRate,after:updated[index],change:updated[index]-old[index]};
 }
 return Object.freeze({createModel,predict,evaluate,loss,gradients,step,cloneModel,parameterCount,layerInfo,inspectUpdate});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=PhotoTrainingMath;
