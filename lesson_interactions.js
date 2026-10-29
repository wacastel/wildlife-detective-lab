function initVisionLesson() {
 const root = document.querySelector('.vision-lesson');
 if (!root || root.dataset.visionInitialized) return;
 root.dataset.visionInitialized = 'true';
 for (const figure of root.querySelectorAll('[data-conservation-photo]')) {
  const photo = BUNDLE.photos.find(item => item.id === figure.dataset.conservationPhoto);
  const input = photo?.variants.find(item => item.id === 'clear');
  if (!input) continue;
  const image = figure.querySelector('img');
  image.src = input.image; image.width = input.width; image.height = input.height;
  figure.querySelector('[data-photo-credit]').textContent = `${photo.credit} · ${photo.license}`;
  figure.querySelector('[data-photo-source]').href = photo.source_url;
 }
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
  {title:'Prepare the photo for the detector',icon:'▦',body:'The saved source JPEG stays on the left. On the right, the same image is resized proportionally and padded with gray to 640 × 640, using this lab\'s actual Pillow preparation. The detector then converts RGB values into a float32 tensor shaped [1, 3, 640, 640] and divides them by 255.',caution:'The preview shows image preparation. It is not a new detector run, and the human photo label is not supplied to the model.'},
  {title:'Combine visual information into features',icon:'● → ●',body:'This calculated edge view responds to brightness changes in this real photo. It makes one simple feature operation visible. A trained detector instead combines many learned feature channels and layers before predicting boxes.',caution:'Teaching illustration: this edge map is not a MegaDetector activation or an explanation of which pixels caused its prediction.'},
  {title:'Read the genuine saved boxes and scores',icon:'▣',body:'Now the right photo displays the real candidate boxes recorded by MegaDetector for these exact source pixels. The coordinates are mapped back out of the 640 × 640 padded image into the source photograph.',caution:'The animal label is a broad category. A score is model support for a candidate, not a calibrated probability that it is correct. Stored candidates start at the recorded score floor.'},
  {title:'Filter the same candidates with a cutoff',icon:'≥',body:'Move the cutoff and watch boxes appear or disappear on the same photograph. A candidate is kept only when its detector score reaches the selected minimum. Try 1.00 to see what happens when no box qualifies.',caution:'The pixels and learned weights stay unchanged. Hiding a box is not proof that no animal was present; lowering the cutoff can also reveal false alarms.'},
  {title:'Send an exact animal crop to SpeciesNet',icon:'▢ → ?',body:'An accepted animal box supplies a tight crop. The right panel shows the exact saved JPEG crop used for the genuine SpeciesNet classification below. The classifier separately prepares its own input and ranks its fixed 2,498-label vocabulary.',caution:'This is the crop JPEG, not a claim to show SpeciesNet\'s internal 480 × 480 preprocessing or feature maps. Only saved animal crops accepted at this cutoff can be selected; the saved collection includes up to five crops with detector scores of at least 0.05.'},
  {title:'Check the photo, crop, and species suggestion',icon:'✓ ?',body:'Compare the original scene, the accepted detector box, and the classifier\'s crop and suggestion. Decide whether the image gives enough evidence. A person checks uncertain records before using them in a conservation study.',caution:'These are genuine saved model outputs. Detection, species identification, counting individuals, and conservation conclusions remain different tasks.'}
 ];
 let walkStage=0,walkCropKey=null,walkRevision=0;
 const edgePreviews=new Map();
 const walkPhoto=()=>BUNDLE.photos.find(item=>item.id===node('visionWalkPhoto').value);
 const walkInput=()=>walkPhoto()?.variants.find(item=>item.id==='clear');
 const walkMinimum=()=>Number(node('visionWalkThreshold').value);
 const keptWalkCrops=()=>{const input=walkInput();return(input?.species_crops||[]).filter(crop=>{const detection=input.detections[crop.detection_index];return detection?.category==='animal'&&detection.score>=walkMinimum()&&crop.image;});};
 function walkImage(id,source,alt,width,height){const image=node(id);if(image.getAttribute('src')!==source)image.src=source;image.alt=alt;image.width=width;image.height=height;}
 function walkBoxes(id,input,shown){
  const svg=node(id);svg.replaceChildren();svg.setAttribute('viewBox',`0 0 ${input.width} ${input.height}`);svg.setAttribute('aria-label',shown.length?shown.map(item=>`${item.category} ${item.score.toFixed(3)}`).join('; '):'No detector boxes at this step or cutoff');
  for(const item of shown){const [x,y,w,h]=item.bbox,scale=input.width,font=Math.max(13,scale*.025);text(svg,'rect',null,{x:x*input.width,y:y*input.height,width:w*input.width,height:h*input.height,fill:'none',stroke:'#d3ff70','stroke-width':Math.max(3,scale*.004)});text(svg,'text',`${item.category} ${item.score.toFixed(3)}`,{x:x*input.width+4,y:Math.max(font+4,y*input.height-8),fill:'#eaffcb',stroke:'#18352b','stroke-width':Math.max(3,scale*.004),'paint-order':'stroke','font-size':font,'font-weight':'800'});}
 }
 function walkPrediction(crop){
  const out=node('visionWalkPrediction');out.replaceChildren();
  if(!crop){const p=document.createElement('p');p.textContent='No saved animal crop qualifies at this cutoff. Lower the minimum or choose another photo. No species answer is claimed.';out.appendChild(p);return;}
  const prediction=crop.prediction;
  if(!prediction?.topk?.length){const p=document.createElement('p');p.textContent='No saved SpeciesNet output is available for this exact crop.';out.appendChild(p);return;}
  const heading=document.createElement('strong');heading.textContent='Genuine saved SpeciesNet suggestions';out.appendChild(heading);
  const table=document.createElement('table'),head=table.createTHead().insertRow();
  for(const label of ['Label','Classifier score']){const th=document.createElement('th');th.scope='col';th.textContent=label;head.appendChild(th);}
  const body=table.createTBody();
  for(const item of prediction.topk.slice(0,3)){const row=body.insertRow();row.insertCell().textContent=item.label||item.common_name||item.taxon||'Unspecified label';row.insertCell().textContent=Number.isFinite(item.score)?item.score.toPrecision(6):'Not provided';}
  out.appendChild(table);const note=document.createElement('p');note.className='vision-small';note.textContent='Classifier scores and detector scores answer separate questions. These suggestions can be wrong or describe a broader taxon.';out.appendChild(note);
 }
 async function edgePreview(input){
  if(edgePreviews.has(input.input_sha256))return edgePreviews.get(input.input_sha256);
  const promise=new Promise((resolve,reject)=>{
   const image=new Image();image.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=640;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='rgb(114,114,114)';ctx.fillRect(0,0,640,640);const scale=Math.min(640/image.naturalWidth,640/image.naturalHeight),w=Math.max(1,Math.round(image.naturalWidth*scale)),h=Math.max(1,Math.round(image.naturalHeight*scale));ctx.drawImage(image,Math.floor((640-w)/2),Math.floor((640-h)/2),w,h);const original=ctx.getImageData(0,0,640,640),gray=new Float32Array(640*640),output=ctx.createImageData(640,640);for(let i=0;i<gray.length;i++){const p=i*4;gray[i]=.299*original.data[p]+.587*original.data[p+1]+.114*original.data[p+2];}for(let y=0;y<640;y++)for(let x=0;x<640;x++){const i=y*640+x,p=i*4,v=x>0&&x<639&&y>0&&y<639?Math.min(255,2*(Math.abs(gray[i+1]-gray[i-1])+Math.abs(gray[i+640]-gray[i-640]))):0;output.data[p]=Math.round(v*.75);output.data[p+1]=Math.round(v);output.data[p+2]=Math.round(v*.85);output.data[p+3]=255;}ctx.putImageData(output,0,0);resolve(canvas.toDataURL('image/png'));}catch(error){reject(error);}};image.onerror=()=>reject(new Error('The saved image could not be loaded.'));image.src=input.lesson_letterbox||input.image;
  });edgePreviews.set(input.input_sha256,promise);return promise;
 }
 async function renderWalk(){
  const photo=walkPhoto(),input=walkInput();if(!photo||!input)return;
  const revision=++walkRevision,stage=stages[walkStage],minimum=walkMinimum(),kept=(input.detections||[]).filter(item=>item.score>=minimum),crops=keptWalkCrops();
  if(!crops.some(crop=>`${crop.detection_index}/${crop.input_sha256}`===walkCropKey))walkCropKey=crops[0]?`${crops[0].detection_index}/${crops[0].input_sha256}`:null;
  const crop=crops.find(item=>`${item.detection_index}/${item.input_sha256}`===walkCropKey)||null;
  node('visionStageVisual').textContent=stage.icon;node('visionStageTitle').textContent=stage.title;node('visionStageText').textContent=stage.body;node('visionStageCaution').textContent=stage.caution;
  for(const button of root.querySelectorAll('[data-vision-stage]'))button.setAttribute('aria-pressed',String(Number(button.dataset.visionStage)===walkStage));
  node('visionWalkPrevious').disabled=walkStage===0;node('visionWalkNext').disabled=walkStage===stages.length-1;node('visionWalkProgress').textContent=`Step ${walkStage+1} of ${stages.length}`;
  node('visionWalkThresholdPanel').hidden=walkStage<3;node('visionWalkThresholdValue').textContent=minimum.toFixed(2);node('visionWalkKept').textContent=`${kept.length} of ${input.detections.length} recorded candidates reach this minimum. Raising the minimum leaves the photograph unchanged.`;
  node('visionWalkCropPanel').hidden=walkStage<4;node('visionWalkReview').hidden=walkStage!==5;
  node('visionWalkInputHash').textContent=input.input_sha256;node('visionWalkCropHashLine').hidden=walkStage<4||!crop;node('visionWalkCropHash').textContent=crop?.input_sha256||'';
  const credit=node('visionWalkCredit');credit.replaceChildren();const link=document.createElement('a');link.href=photo.source_url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Photo source';credit.append(`${photo.credit} · ${photo.license}. ${photo.location||''} `,link);
  walkImage('visionWalkSource',input.image,`${photo.title}: same saved source photo`,input.width,input.height);node('visionWalkBeforeLabel').textContent=walkStage===5?'Original scene + accepted boxes':'Same source photo';walkBoxes('visionWalkSourceBoxes',input,walkStage===5?kept:[]);walkBoxes('visionWalkOutputBoxes',input,[]);
  const cropSelect=node('visionWalkCrop');cropSelect.replaceChildren();for(const item of crops){const option=document.createElement('option');option.value=`${item.detection_index}/${item.input_sha256}`;option.textContent=`Animal box ${item.detection_index+1} · detector ${input.detections[item.detection_index].score.toFixed(3)}`;cropSelect.appendChild(option);}cropSelect.value=walkCropKey||'';cropSelect.disabled=!crops.length;
  if(walkStage===0){
   node('visionWalkMode').textContent=input.lesson_letterbox?'Exact detector image preparation':'Image preparation illustration';node('visionWalkAfterLabel').textContent='640 × 640 RGB image, before tensor normalization';
   if(input.lesson_letterbox){walkImage('visionWalkOutput',input.lesson_letterbox,'The same photo resized with Pillow and padded gray to 640 by 640 pixels',640,640);node('visionWalkCaption').textContent=`${input.width} × ${input.height} source pixels → proportionally resized RGB image on a 640 × 640 canvas. Gray padding has RGB values (114, 114, 114). Tensor channel order and division by 255 happen afterward.`;}
   else{walkImage('visionWalkOutput',input.image,'Source photo; exact preprocessing preview unavailable',input.width,input.height);node('visionWalkCaption').textContent='The source photo is shown here because the exact preprocessing preview is unavailable. The real detector uses Pillow bilinear resizing and gray padding to 640 × 640.';}
  }else if(walkStage===1){
   node('visionWalkMode').textContent='Calculated edge illustration · not model activations';node('visionWalkAfterLabel').textContent='One simple brightness-change feature';walkImage('visionWalkOutput',input.lesson_letterbox||input.image,'Preparing a calculated edge illustration from the selected photo',input.lesson_letterbox?640:input.width,input.lesson_letterbox?640:input.height);node('visionWalkCaption').textContent='Calculating a brightness-change illustration from this photo…';
   try{const edges=await edgePreview(input);if(revision!==walkRevision)return;walkImage('visionWalkOutput',edges,'Calculated brightness-change edge illustration; not actual MegaDetector features',640,640);node('visionWalkCaption').textContent='Bright edges mark local changes in brightness, including trees, ground, and the animal. This teaching calculation is not an animal score, a model activation, or a new model prediction.';}catch(error){if(revision===walkRevision)node('visionWalkCaption').textContent='The edge illustration could not be prepared. The source photo and genuine saved results remain available at the other steps.';}
  }else if(walkStage===2||walkStage===3){
   const shown=walkStage===2?input.detections:kept;node('visionWalkMode').textContent='Genuine saved MegaDetector output';node('visionWalkAfterLabel').textContent=walkStage===2?'All recorded candidate boxes':'Boxes accepted by your cutoff';walkImage('visionWalkOutput',input.image,`${photo.title} with ${shown.length} genuine recorded detector boxes`,input.width,input.height);walkBoxes('visionWalkOutputBoxes',input,shown);node('visionWalkCaption').textContent=shown.length?shown.map((item,i)=>`Box ${i+1}: ${item.category}, detector score ${item.score.toFixed(6)}`).join(' · '):'No box reaches this cutoff. The animal and every source pixel remain in the photograph.';
  }else{
   node('visionWalkMode').textContent='Genuine saved detector + SpeciesNet output';node('visionWalkAfterLabel').textContent=crop?'Exact saved animal crop':'No accepted animal crop';
   if(crop){walkImage('visionWalkOutput',crop.image,`Exact ${crop.width} by ${crop.height} crop from animal box ${crop.detection_index+1}`,crop.width,crop.height);walkBoxes('visionWalkSourceBoxes',input,walkStage===5?kept:[input.detections[crop.detection_index]]);node('visionWalkBeforeLabel').textContent=walkStage===5?'Original scene + accepted boxes':'Actual detector box used for this crop';node('visionWalkCaption').textContent=`Animal box ${crop.detection_index+1} → exact ${crop.width} × ${crop.height} JPEG crop → genuine saved SpeciesNet suggestions. The crop view may be enlarged for display; its pixel dimensions are shown here.`;}
   else{walkImage('visionWalkOutput',input.image,'The source photo with no accepted crop at this cutoff',input.width,input.height);node('visionWalkCaption').textContent='No saved animal crop qualifies. Lower the cutoff to restore an actual crop and its matching species output.';}
   walkPrediction(crop);
  }
 }
 function showStage(index){walkStage=Math.max(0,Math.min(stages.length-1,index));renderWalk();}
 for(const button of root.querySelectorAll('[data-vision-stage]'))button.addEventListener('click',()=>showStage(Number(button.dataset.visionStage)));
 node('visionWalkPrevious').addEventListener('click',()=>showStage(walkStage-1));node('visionWalkNext').addEventListener('click',()=>showStage(walkStage+1));
 node('visionWalkPhoto').addEventListener('change',()=>{walkCropKey=null;node('visionWalkThreshold').value='0.30';node('visionWalkReviewReply').textContent='Your observation is a learning response; it is not saved as a verified wildlife record.';renderWalk();});
 node('visionWalkThreshold').addEventListener('input',renderWalk);node('visionWalkCrop').addEventListener('change',()=>{walkCropKey=node('visionWalkCrop').value;renderWalk();});
 for(const button of root.querySelectorAll('[data-vision-review]'))button.addEventListener('click',()=>{node('visionWalkReviewReply').textContent=button.dataset.visionReview==='clear'?'Check the full animal and the crop against a trusted reference before accepting a species record. Your answer here does not certify the model result.':'Keeping uncertainty is useful. A reviewer might seek another frame, a clearer view, or expert advice before accepting a species record.';});
 showStage(0);
}
