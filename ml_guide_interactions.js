/* Counts below are explicit teaching scenarios, not measured model output. */
var MLGuideMath=(()=>{
 'use strict';
 const presets=Object.freeze({
  'all-empty':Object.freeze({tp:0,fn:1,fp:0,tn:99}),
  balanced:Object.freeze({tp:40,fn:10,fp:10,tn:40}),
  'rare-recall':Object.freeze({tp:8,fn:2,fp:15,tn:75}),
  stricter:Object.freeze({tp:6,fn:4,fp:2,tn:88})
 });
 function calculate(counts){
  if(!counts||typeof counts!=='object')throw new TypeError('Four checked counts are required.');
  for(const key of ['tp','fn','fp','tn'])if(!Number.isInteger(counts[key])||counts[key]<0||counts[key]>100000)throw new RangeError('Counts must be integers from zero to 100,000.');
  const {tp,fn,fp,tn}=counts,total=tp+fn+fp+tn,ratio=(a,b)=>b?a/b:null;
  return {total,animals:tp+fn,empty:fp+tn,predictedAnimals:tp+fp,accuracy:ratio(tp+tn,total),precision:ratio(tp,tp+fp),recall:ratio(tp,tp+fn),f1:ratio(2*tp,2*tp+fp+fn)};
 }
 return Object.freeze({presets,calculate});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=MLGuideMath;

function initMLGuide(){
 const root=document.getElementById('mlMetricsLab');if(!root||root.dataset.initialized)return;root.dataset.initialized='true';
 const keys=['TP','FN','FP','TN'],node=id=>document.getElementById(id),pct=value=>value===null?'Not defined':`${(100*value).toFixed(1)}%`;
 function draw(preset=null){
  const counts=Object.fromEntries(keys.map(key=>[key.toLowerCase(),Number(node('mlCount'+key).value)])),m=MLGuideMath.calculate(counts);
  for(const key of keys){node('mlCount'+key+'Value').textContent=String(counts[key.toLowerCase()]);node('mlMatrix'+key).textContent=String(counts[key.toLowerCase()]);}
  for(const [key,name]of [['accuracy','Accuracy'],['precision','Precision'],['recall','Recall'],['f1','F1']])node('mlMetric'+name).textContent=pct(m[key]);
  node('mlMetricTotal').textContent=String(m.total);
  for(const button of root.querySelectorAll('[data-ml-preset]'))button.setAttribute('aria-pressed',String(button.dataset.mlPreset===preset));
  let message=`Illustrative counts: ${m.total} photos, ${m.animals} with an animal and ${m.empty} without one. ${counts.tp} animal photos found, ${counts.fn} missed, and ${counts.fp} empty photos flagged for review. `;
  if(!m.total)message+='There are no evaluated photos, so these metrics are not defined.';
  else if(!m.animals)message+='No actual animal photos were tested, so recall is not defined; this set cannot establish animal-finding performance.';
  else if(!m.predictedAnimals)message+=`The system never predicted animal. Precision is not defined, and animal recall is ${pct(m.recall)}. ${m.accuracy>=.9?'A high overall accuracy can hide every missed animal.':''}`;
  else message+=`Of the photos flagged animal, ${pct(m.precision)} were right. Of the animal photos actually present, ${pct(m.recall)} were found. `;
  message+=' These are frame-level teaching counts. Box detection needs separate one-to-one localization matching; species identification needs its own evaluation.';
  node('mlMetricsMeaning').textContent=message;
  root.dataset.accuracy=String(m.accuracy);root.dataset.recall=String(m.recall);
 }
 for(const key of keys)node('mlCount'+key).addEventListener('input',()=>draw());
 for(const button of root.querySelectorAll('[data-ml-preset]'))button.addEventListener('click',()=>{const name=button.dataset.mlPreset,counts=MLGuideMath.presets[name];for(const key of keys)node('mlCount'+key).value=String(counts[key.toLowerCase()]);draw(name);});
 function visit(target){if(!target)return;const heading=target.matches('h1,h2,h3,h4')?target:target.querySelector('h2,h3,h4')||target;heading.tabIndex=-1;heading.focus({preventScroll:true});target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
 for(const button of document.querySelectorAll('[data-ml-scroll]'))button.addEventListener('click',()=>visit(node(button.dataset.mlScroll)));
 for(const button of document.querySelectorAll('[data-ml-train]'))button.addEventListener('click',()=>{switchTab('learn',true);visit(node('photoTrainingLab'));});
 const initial=MLGuideMath.presets['all-empty'];for(const key of keys)node('mlCount'+key).value=String(initial[key.toLowerCase()]);draw('all-empty');
}
