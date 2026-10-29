/* A tiny classroom classifier. This arithmetic never changes the wildlife models. */
var PhotoTrainingMath = (() => {
 'use strict';

 function positiveInteger(value,name) {
  if(!Number.isInteger(value)||value<1)throw new RangeError(`${name} must be a positive integer.`);
  return value;
 }
 function finite(value,name) {
  if(!Number.isFinite(value))throw new RangeError(`${name} must be finite.`);
  return value;
 }
 function dimensions(model) {
  if(!model||!Array.isArray(model.weights)||!Array.isArray(model.biases))throw new TypeError('A classifier model is required.');
  const classes=positiveInteger(model.weights.length,'Class count');
  const features=positiveInteger(model.weights[0]?.length,'Feature count');
  if(model.biases.length!==classes)throw new RangeError('Bias count must match class count.');
  model.weights.forEach(row=>{
   if(!Array.isArray(row)||row.length!==features)throw new RangeError('Every class must have the same feature count.');
   row.forEach(value=>finite(value,'Weight'));
  });
  model.biases.forEach(value=>finite(value,'Bias'));
  return {classes,features};
 }
 function checkedFeatures(values,length) {
  if(!values||values.length!==length)throw new RangeError(`Expected ${length} image features.`);
  Array.from(values).forEach(value=>finite(value,'Image feature'));
 }
 function checkedExamples(examples,shape) {
  if(!Array.isArray(examples)||!examples.length)throw new RangeError('At least one labeled example is required.');
  examples.forEach(example=>{
   checkedFeatures(example?.features,shape.features);
   if(!Number.isInteger(example.label)||example.label<0||example.label>=shape.classes)throw new RangeError('A teaching label must be a valid class index.');
  });
 }
 function createModel(featureCount=48,classCount=3) {
  positiveInteger(featureCount,'Feature count');positiveInteger(classCount,'Class count');
  return {weights:Array.from({length:classCount},()=>Array(featureCount).fill(0)),biases:Array(classCount).fill(0),steps:0};
 }
 function forward(model,features) {
  const logits=model.weights.map((row,c)=>finite(row.reduce((sum,weight,i)=>sum+weight*features[i],model.biases[c]),'Class score'));
  const max=Math.max(...logits),exponentials=logits.map(value=>Math.exp(value-max));
  const denominator=exponentials.reduce((sum,value)=>sum+value,0);
  const probabilities=exponentials.map(value=>value/denominator);
  let predictedClass=0;
  for(let c=1;c<logits.length;c++)if(logits[c]>logits[predictedClass])predictedClass=c;
  return {logits,probabilities,predictedClass,confidence:probabilities[predictedClass],maxLogit:max,logDenominator:Math.log(denominator),logNormalizer:max+Math.log(denominator)};
 }
 function predict(model,features) {
  const shape=dimensions(model);checkedFeatures(features,shape.features);
  return forward(model,features);
 }
 function exampleLoss(prediction,label) {
  // log-sum-exp avoids taking log(0) when a softmax value underflows.
  return finite((prediction.maxLogit-prediction.logits[label])+prediction.logDenominator,'Cross-entropy loss');
 }
 function evaluate(model,examples) {
  const shape=dimensions(model);checkedExamples(examples,shape);
  let totalLoss=0,correct=0;
  for(const example of examples){
   const prediction=forward(model,example.features);
   totalLoss+=exampleLoss(prediction,example.label);
   if(prediction.predictedClass===example.label)correct++;
  }
  return {loss:totalLoss/examples.length,accuracy:correct/examples.length,count:examples.length};
 }
 function loss(model,examples) { return evaluate(model,examples).loss; }
 function gradients(model,examples) {
  const shape=dimensions(model);checkedExamples(examples,shape);
  const weights=Array.from({length:shape.classes},()=>Array(shape.features).fill(0)),biases=Array(shape.classes).fill(0);
  let totalLoss=0;
  for(const example of examples){
   const prediction=forward(model,example.features);totalLoss+=exampleLoss(prediction,example.label);
   for(let c=0;c<shape.classes;c++){
    const error=(prediction.probabilities[c]-(c===example.label?1:0))/examples.length;
    biases[c]+=error;
    for(let i=0;i<shape.features;i++)weights[c][i]+=error*example.features[i];
   }
  }
  return {weights,biases,loss:totalLoss/examples.length,count:examples.length};
 }
 function norm(values) { return Math.hypot(...values); }
 function step(model,examples,learningRate) {
  finite(learningRate,'Learning rate');
  if(learningRate<0)throw new RangeError('Learning rate cannot be negative.');
  const gradient=gradients(model,examples),before=evaluate(model,examples);
  const weights=model.weights.map((row,c)=>row.map((value,i)=>finite(value-learningRate*gradient.weights[c][i],'Updated weight')));
  const biases=model.biases.map((value,c)=>finite(value-learningRate*gradient.biases[c],'Updated bias'));
  const updated={weights,biases,steps:(model.steps||0)+1};
  const weightChanges=weights.flatMap((row,c)=>row.map((value,i)=>value-model.weights[c][i]));
  const biasChanges=biases.map((value,c)=>value-model.biases[c]);
  return {model:updated,before,after:evaluate(updated,examples),gradients:gradient,
   gradientNorm:norm([...gradient.weights.flat(),...gradient.biases]),
   deltaNorm:norm([...weightChanges,...biasChanges]),weightDeltaNorm:norm(weightChanges),biasDeltaNorm:norm(biasChanges)};
 }
 return Object.freeze({createModel,predict,evaluate,loss,gradients,step});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=PhotoTrainingMath;
