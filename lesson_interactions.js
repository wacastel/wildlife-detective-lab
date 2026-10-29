function initVisionLesson() {
 const root = document.querySelector('.vision-lesson');
 if (!root || root.dataset.visionInitialized) return;
 root.dataset.visionInitialized = 'true';
 const node = id => document.getElementById(id);
 const svgNS = 'http://www.w3.org/2000/svg';
 const text = (parent, tag, value, attrs={}) => {
  const element = document.createElementNS(svgNS, tag);
  for (const [key,val] of Object.entries(attrs)) element.setAttribute(key,String(val));
  if(value!==null)element.textContent=String(value);
  parent.appendChild(element);return element;
 };
 const edgePixels = () => Array.from({length:49},(_,i)=>(i%7>=3?224:32));
 let pixels=edgePixels();
 const kernels={vertical:[-1,0,1,-1,0,1,-1,0,1],horizontal:[-1,-1,-1,0,0,0,1,1,1],average:Array(9).fill(1/9)};
 const response=(row,col,kernel)=>{
  let sum=0;
  for(let r=-1;r<=1;r++)for(let c=-1;c<=1;c++)sum+=pixels[(row+r)*7+col+c]*kernel[(r+1)*3+c+1];
  return sum;
 };
 const pixelButtons=[];
 for(let i=0;i<49;i++){
  const button=document.createElement('button');button.type='button';
  button.addEventListener('click',()=>{const values=[0,64,128,192,255];pixels[i]=values.find(value=>value>pixels[i])??0;drawPixels();});
  pixelButtons.push(button);node('visionPixelGrid').appendChild(button);
 }
 function drawPixels(){
  const row=Number(node('visionWindowRow').value)-1,col=Number(node('visionWindowCol').value)-1;
  node('visionWindowRowValue').textContent=String(row+1);node('visionWindowColValue').textContent=String(col+1);
  pixelButtons.forEach((button,i)=>{const value=pixels[i],r=Math.floor(i/7),c=i%7;button.textContent=String(value);button.style.backgroundColor=`rgb(${value},${value},${value})`;button.style.color=value>135?'#18352b':'#fffef8';button.classList.toggle('vision-in-window',Math.abs(r-row)<=1&&Math.abs(c-col)<=1);button.setAttribute('aria-label',`Row ${r+1}, column ${c+1}, brightness ${value}. Activate to change.`);});
  const name=node('visionKernel').value,kernel=kernels[name];node('visionKernelGrid').replaceChildren();
  for(const weight of kernel){const cell=document.createElement('span');cell.textContent=name==='average'?'1/9':String(weight);node('visionKernelGrid').appendChild(cell);}
  const selected=response(row,col,kernel),format=value=>name==='average'?value.toFixed(1):String(Math.round(value));
  node('visionFilterValue').textContent=format(selected);
  node('visionFilterMeaning').textContent=name==='average'?'This is the mean brightness in the selected window.':Math.abs(selected)<0.00001?'The positive and negative sides balance here. An animal can still be present.':`This window responds to ${name==='vertical'?'left-to-right':'top-to-bottom'} brightness change. Its sign depends on the direction of the change; it is not an animal score.`;
  const map=node('visionResponseGrid');map.replaceChildren();
  for(let r=1;r<=5;r++)for(let c=1;c<=5;c++){
   const value=response(r,c,kernel),cell=document.createElement('span');cell.textContent=format(value);cell.classList.toggle('vision-response-selected',r===row&&c===col);
   const strength=Math.min(1,Math.abs(value)/(name==='average'?255:765));cell.style.backgroundColor=name==='average'?`rgb(${255-strength*80},${255-strength*60},${245-strength*90})`:value>=0?`rgb(${240-strength*65},${247-strength*55},${226-strength*70})`:`rgb(${248-strength*20},${237-strength*80},${211-strength*100})`;
   cell.setAttribute('title',`Window center row ${r+1}, column ${c+1}: ${format(value)}`);map.appendChild(cell);
  }
 }
 for(const id of ['visionWindowRow','visionWindowCol','visionKernel'])node(id).addEventListener('input',drawPixels);
 node('visionPixelReset').addEventListener('click',()=>{pixels=edgePixels();drawPixels();});drawPixels();

 const featureValues=[.1,.3,.7,.9];
 const sigmoid=z=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
 let weight=0,bias=0,steps=0,history=[];
 const labels=()=>node('visionNoisyLabels').checked?[0,0,1,0]:[0,0,1,1];
 const loss=()=>featureValues.reduce((total,x,i)=>{const z=weight*x+bias;return total+Math.max(z,0)-z*labels()[i]+Math.log1p(Math.exp(-Math.abs(z)));},0)/featureValues.length;
 function axes(svg,width,height,yLabel,xLabel){
  svg.replaceChildren();text(svg,'line',null,{x1:52,y1:20,x2:52,y2:height-39,stroke:'#a9b99c'});text(svg,'line',null,{x1:52,y1:height-39,x2:width-20,y2:height-39,stroke:'#a9b99c'});
  text(svg,'text',yLabel,{x:10,y:16});text(svg,'text',xLabel,{x:width-20,y:height-10,'text-anchor':'end'});
 }
 function drawTraining(){
  node('visionLearningRateValue').textContent=Number(node('visionLearningRate').value).toFixed(2);
  node('visionTrainSteps').textContent=String(steps);node('visionTrainLoss').textContent=loss().toFixed(4);node('visionTrainWeight').textContent=weight.toFixed(3);node('visionTrainBias').textContent=bias.toFixed(3);
  node('visionTrainExplanation').textContent=node('visionNoisyLabels').checked?'The brightest example has a deliberately wrong label. One monotonic sigmoid cannot satisfy these contradictory targets. This is a toy data-quality experiment.':'Training changes w and b; moving the learning-rate slider alone changes neither. The four examples are a tiny teaching task, not wildlife training or test data.';
  const curve=node('visionTrainCurve'),cw=620,ch=250,left=52,top=25,plotW=548,plotH=186;axes(curve,cw,ch,'Output p','Input feature x');
  for(const y of [0,.5,1]){const sy=top+(1-y)*plotH;text(curve,'line',null,{x1:left,y1:sy,x2:600,y2:sy,stroke:'#dce5cf','stroke-dasharray':'4 4'});text(curve,'text',String(y),{x:43,y:sy+4,'text-anchor':'end'});}
  for(const x of [0,.5,1])text(curve,'text',String(x),{x:left+x*plotW,y:226,'text-anchor':'middle'});
  const points=Array.from({length:101},(_,i)=>{const x=i/100;return `${left+x*plotW},${top+(1-sigmoid(weight*x+bias))*plotH}`;}).join(' ');text(curve,'polyline',null,{points,fill:'none',stroke:'#24664e','stroke-width':3});
  featureValues.forEach((x,i)=>{const y=labels()[i];text(curve,'circle',null,{cx:left+x*plotW,cy:top+(1-y)*plotH,r:6,fill:node('visionNoisyLabels').checked&&i===3?'#b15d2a':'#18352b',stroke:'#fffef8','stroke-width':2});text(curve,'text',`${x} → ${y}`,{x:left+x*plotW,y:y===1?top+22:top+plotH-12,'text-anchor':'middle'});});
  const chart=node('visionTrainHistory'),maxLoss=Math.max(.75,...history.map(item=>item.value))*1.08,minStep=history[0]?.step||0,maxStep=Math.max(minStep+1,steps);axes(chart,620,230,'Mean loss','Update step');
  for(const fraction of [0,.5,1]){const y=20+(1-fraction)*171;text(chart,'line',null,{x1:52,y1:y,x2:600,y2:y,stroke:'#dce5cf','stroke-dasharray':'4 4'});text(chart,'text',(maxLoss*fraction).toFixed(2),{x:43,y:y+4,'text-anchor':'end'});}
  const lossPoints=history.map(item=>`${52+(item.step-minStep)/(maxStep-minStep)*548},${20+(1-item.value/maxLoss)*171}`).join(' ');text(chart,'polyline',null,{points:lossPoints,fill:'none',stroke:'#24664e','stroke-width':3});
  if(history.length===1)text(chart,'circle',null,{cx:52,cy:20+(1-history[0].value/maxLoss)*171,r:4,fill:'#24664e'});
  text(chart,'text',String(minStep),{x:52,y:209,'text-anchor':'middle'});text(chart,'text',String(steps),{x:600,y:209,'text-anchor':'end'});
 }
 function train(count){
  const rate=Number(node('visionLearningRate').value);
  for(let n=0;n<count;n++){let dw=0,db=0;const target=labels();featureValues.forEach((x,i)=>{const error=sigmoid(weight*x+bias)-target[i];dw+=error*x/4;db+=error/4;});weight-=rate*dw;bias-=rate*db;steps++;history.push({step:steps,value:loss()});if(history.length>500)history.shift();}
  drawTraining();
 }
 function resetTraining(){weight=0;bias=0;steps=0;history=[{step:0,value:loss()}];drawTraining();}
 node('visionTrainOne').addEventListener('click',()=>train(1));node('visionTrainTwenty').addEventListener('click',()=>train(20));node('visionTrainReset').addEventListener('click',resetTraining);node('visionLearningRate').addEventListener('input',drawTraining);node('visionNoisyLabels').addEventListener('change',resetTraining);resetTraining();

 const stages=[
  {title:'Prepare the exact pixels',icon:'▦',body:'The local loader reads the main photograph, corrects EXIF orientation, and prepares an RGB image. The detector letterboxes it to 640 × 640 with padding that preserves its shape. The lab saves or displays the exact JPEG pixels used for a prediction.',caution:'The human source label, filename, and Illinois context are not supplied as model evidence.'},
  {title:'Calculate learned image features',icon:'● → ●',body:'The pretrained detector applies its learned parameters to the resized pixels. Layers combine information across image regions and scales. Their numerical responses feed the prediction layers; the model does not need a separately written rule for every animal shape.',caution:'The toy edge filter above explains one operation. It is not a visualization of MegaDetector’s actual internal activations.'},
  {title:'Predict locations, categories, and scores',icon:'▣',body:'Prediction layers produce candidate animal, person, and vehicle boxes with scores. The lab maps the box coordinates back onto the detector image. A score indicates model support for a candidate, not a calibrated probability that it is correct.',caution:'More than one box may describe the same animal. Background regions can receive false animal boxes, and real animals can be missed.'},
  {title:'Keep candidates at or above the cutoff',icon:'≥',body:'The detection minimum filters already calculated candidates. At 0.30 a score of 0.30 is kept and 0.29 is hidden. The photo itself is not cropped by this slider. Lower settings trade more weak candidates and false alarms for possible additional detections.',caution:'Changing the slider does not run training, improve the image, or guarantee a better answer. No accepted box means “not detected at this setting.”'},
  {title:'Classify an exact animal crop',icon:'▢ → ?',body:'For up to five qualifying animal candidates, this lab cuts out the actual box pixels and passes an exact crop to the separate SpeciesNet v4.0.3a classifier. Its pinned preprocessing uses 480 × 480 pixels. The classifier ranks its learned 2,498 labels without a caller-provided shortlist or geographic restriction.',caution:'Person and vehicle boxes do not go to the species stage. A broad taxon or blank is a real possible output; no species answer is invented for a missing crop.'},
  {title:'Inspect both answers and keep evidence',icon:'✓ ?',body:'A person checks the photo, box, crop, model label, and intended use. Saved examples reveal genuine recorded runs; live buttons calculate new local results. Exact-input hashes and model provenance help keep each result paired with the pixels and model that produced it.',caution:'Detection, species identification, counting individuals, and conservation conclusions are different tasks. Human review and independent field validation still matter.'}
 ];
 function showStage(index){const stage=stages[index];node('visionStageVisual').textContent=stage.icon;node('visionStageTitle').textContent=stage.title;node('visionStageText').textContent=stage.body;node('visionStageCaution').textContent=stage.caution;for(const button of root.querySelectorAll('[data-vision-stage]'))button.setAttribute('aria-pressed',String(Number(button.dataset.visionStage)===index));}
 for(const button of root.querySelectorAll('[data-vision-stage]'))button.addEventListener('click',()=>showStage(Number(button.dataset.visionStage)));
 showStage(0);
}
