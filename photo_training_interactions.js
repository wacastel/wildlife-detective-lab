function initPhotoTrainingLesson() {
 const root=document.getElementById('photoTrainingLab');
 if(!root||root.dataset.initialized)return;
 root.dataset.initialized='true';
 const node=id=>document.getElementById(id),math=PhotoTrainingMath,classes=['Deer','Raccoon','Coyote'];
 const names={conv1:'Convolution 1',conv2:'Convolution 2',dense:'Dense hidden layer',output:'Class scores'};
 const trainIds=[['deer','deer_2','deer_4','deer_trap_2'],['raccoon','raccoon_2','raccoon_3','raccoon_trap_1'],['coyote','coyote_3','coyote_4','coyote_trap_1']];
 const validationIds=[['deer_3','deer_trap_1','deer_trap_3'],['raccoon_4','raccoon_trap_2','raccoon_trap_3'],['coyote_2','coyote_trap_2','coyote_trap_3']];
 const specs=[...trainIds.flatMap((ids,label)=>ids.map(id=>({id,label,split:'train'}))),...validationIds.flatMap((ids,label)=>ids.map(id=>({id,label,split:'validation'})))];
 let samples=[],training=[],validation=[],model=math.createModel(),snapshots=[],history=[],viewIndex=0,ready=false,running=false,stopRequested=false,phase='forward',kernelCell=4;
 const selected=()=>samples.find(sample=>sample.id===node('photoTrainPhoto').value)||samples[0];
 const viewed=()=>snapshots[viewIndex]||snapshots.at(-1),fixed=value=>Number(value).toFixed(6),percent=value=>`${(value*100).toFixed(1)}%`;
 const status=value=>{node('photoTrainStatus').textContent=value;};
 function add(parent,tag,value,className){const el=document.createElement(tag);if(value!==null)el.textContent=value;if(className)el.className=className;parent.appendChild(el);return el;}
 function svg(parent,tag,attrs,value){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,String(v));if(value!==undefined)el.textContent=value;parent.appendChild(el);return el;}
 function controls(){for(const id of ['photoTrainOne','photoTrainTen','photoTrainFifty','photoTrainReset'])node(id).disabled=!ready||running;node('photoTrainPhoto').disabled=!ready;node('photoTrainStop').disabled=!running;node('photoTrainLearningRate').disabled=running;node('photoTrainHistorySlider').disabled=!ready||running;}
 function loadPhoto(spec){
  const photo=BUNDLE.photos.find(item=>item.id===spec.id),input=photo?.variants.find(item=>item.id==='clear');
  if(!input)return Promise.reject(new Error('A required saved training photograph is unavailable.'));
  return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{try{
   const canvas=document.createElement('canvas');canvas.width=24;canvas.height=24;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='rgb(128,128,128)';ctx.fillRect(0,0,24,24);
   const scale=Math.min(24/image.naturalWidth,24/image.naturalHeight),w=Math.max(1,Math.round(image.naturalWidth*scale)),h=Math.max(1,Math.round(image.naturalHeight*scale));
   ctx.drawImage(image,Math.floor((24-w)/2),Math.floor((24-h)/2),w,h);
   const rgba=ctx.getImageData(0,0,24,24).data,features=new Float64Array(24*24*3);
   for(let i=0;i<24*24;i++)for(let c=0;c<3;c++)features[i*3+c]=rgba[i*4+c]/255-.5;
   resolve({...spec,photo,input,features});
  }catch(error){reject(error);}};image.onerror=()=>reject(new Error('A training photograph could not be read. Reload to try again.'));image.src=input.image;});
 }
 function record(update=null){const train=update?.after||math.evaluate(model,training),check=math.evaluate(model,validation);history.push({step:model.steps,train:train.loss,validation:check.loss});snapshots.push({model,update,train,check});if(snapshots.length>80)snapshots.shift();viewIndex=snapshots.length-1;}
 function drawChart(){
  const chart=node('photoTrainLossChart');chart.replaceChildren();const left=52,top=23,width=599,height=181,last=Math.max(1,model.steps),max=Math.max(1.2,...history.flatMap(p=>[p.train,p.validation]))*1.05;
  for(const f of [0,.5,1]){const y=top+(1-f)*height;svg(chart,'line',{x1:left,y1:y,x2:left+width,y2:y,stroke:'#d6dfce','stroke-dasharray':'4 4'});svg(chart,'text',{x:left-7,y:y+4,'text-anchor':'end'},(f*max).toFixed(2));}
  for(const[key,color]of [['train','#24664e'],['validation','#b46d2d']])svg(chart,'polyline',{points:history.map(p=>`${left+p.step/last*width},${top+(1-p[key]/max)*height}`).join(' '),fill:'none',stroke:color,'stroke-width':3});
  const snap=viewed(),x=left+snap.model.steps/last*width;svg(chart,'line',{x1:x,y1:top,x2:x,y2:top+height,stroke:'#526b64','stroke-dasharray':'3 3'});
  svg(chart,'text',{x:10,y:13},'Mean loss');svg(chart,'text',{x:left,y:225},'0');svg(chart,'text',{x:left+width,y:225,'text-anchor':'end'},String(model.steps));svg(chart,'text',{x:350,y:246,'text-anchor':'middle'},'Completed weight updates');
  chart.setAttribute('aria-label',`Actual loss after ${model.steps} updates: training ${history.at(-1).train.toFixed(4)}, validation ${history.at(-1).validation.toFixed(4)}. Viewing update ${snap.model.steps}.`);
 }
 function drawInput(sample){const canvas=node('photoTrainInputCanvas');canvas.width=240;canvas.height=240;const ctx=canvas.getContext('2d');for(let y=0;y<24;y++)for(let x=0;x<24;x++){const i=(y*24+x)*3;ctx.fillStyle=`rgb(${[0,1,2].map(c=>Math.round((sample.features[i+c]+.5)*255)).join(',')})`;ctx.fillRect(x*10,y*10,10,10);}canvas.setAttribute('aria-label','Actual 24 by 24 RGB input. Gray padding preserves proportions. Values are divided by 255, then centered by subtracting 0.5.');}
 function bar(parent,label,value,width,color){const row=add(parent,'div',null,'photo-train-prob-row'),head=add(row,'div',null,'photo-train-prob-head');add(head,'span',label);add(head,'output',value);const track=add(row,'div',null,'photo-train-prob-track'),fill=add(track,'div',null,'photo-train-prob-fill');fill.style.width=`${Math.max(0,Math.min(100,width))}%`;if(color)fill.style.backgroundColor=color;return row;}
 function predictionBars(sample,prediction,before){const output=node('photoTrainPrediction');output.replaceChildren();add(output,'strong',`Current guess: ${classes[prediction.predictedClass]}`,'photo-train-guess');classes.forEach((label,c)=>{const row=bar(output,label+(c===sample.label?' · checked label':''),percent(prediction.probabilities[c]),prediction.probabilities[c]*100);row.dataset.correct=String(c===sample.label);if(before)add(row,'small',`Before this update: ${percent(before.probabilities[c])}`,'photo-train-small');});}
 function options(select,count,label){const previous=select.value;if(select.options.length!==count){select.replaceChildren();for(let i=0;i<count;i++){const option=add(select,'option',label(i));option.value=String(i);}}select.value=String(Math.min(count-1,Math.max(0,Number(previous)||0)));}
 function map(canvas,data,width,channels,filter,max,x,y){canvas.width=240;canvas.height=240;const ctx=canvas.getContext('2d'),size=240/width;for(let row=0;row<width;row++)for(let col=0;col<width;col++){const v=Math.round(255*Math.max(0,Math.min(1,data[(row*width+col)*channels+filter]/max)));ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(col*size,row*size,size+.2,size+.2);}ctx.strokeStyle='#e8a932';ctx.lineWidth=2;ctx.strokeRect(x*size+1,y*size+1,size-2,size-2);canvas.setAttribute('aria-label',`Calculated filter ${filter+1} activation map, ${width} by ${width}. Black is zero and white is ${max.toFixed(5)}. Selected row ${y+1}, column ${x+1}.`);}
 function drawConvolution(snap,sample,prediction,beforePrediction){
  const layer=node('photoTrainFilterLayer').value,m=snap.model,first=layer==='conv1',width=first?24:12,inChannels=first?3:4,outChannels=first?4:8;
  options(node('photoTrainFilter'),outChannels,i=>`Filter ${i+1}`);options(node('photoTrainFilterChannel'),inChannels,i=>first?['Red','Green','Blue'][i]:`Input feature ${i+1}`);
  const filter=Number(node('photoTrainFilter').value),channel=Number(node('photoTrainFilterChannel').value);
  for(const id of ['photoTrainMapX','photoTrainMapY']){node(id).max=String(width-1);node(id).value=String(Math.min(width-1,Number(node(id).value)||0));}
  const x=Number(node('photoTrainMapX').value),y=Number(node('photoTrainMapY').value),a=prediction.activations,b=(beforePrediction||prediction).activations;
  const current=a[layer],previous=b[layer],peak=Math.max(.000001,...current,...previous);
  map(node('photoTrainFeatureMapBefore'),previous,width,outChannels,filter,peak,x,y);map(node('photoTrainFeatureMapAfter'),current,width,outChannels,filter,peak,x,y);
  node('photoTrainMapPosition').textContent=`Output row ${y+1}, column ${x+1}; shared grayscale: 0 to ${fixed(peak)}. ${snap.update?'Before and after the selected update.':'Initial map shown twice; no update yet.'}`;
  const grid=node('photoTrainKernelGrid'),patch=node('photoTrainReceptiveField'),hadFocus=grid.contains(document.activeElement),focusCell=document.activeElement?.dataset.kernel;grid.replaceChildren();patch.replaceChildren();
  const input=first?a.input:a.pool1,weightScale=Math.max(.000001,...Array.from({length:9},(_,i)=>Math.abs(m.layers[layer].weights[((filter*3+Math.floor(i/3))*3+i%3)*inChannels+channel])));let channelSum=0;
  for(let ky=0;ky<3;ky++)for(let kx=0;kx<3;kx++){
   const cell=ky*3+kx,index=((filter*3+ky)*3+kx)*inChannels+channel,weight=m.layers[layer].weights[index],ix=x+kx-1,iy=y+ky-1,padded=ix<0||iy<0||ix>=width||iy>=width,value=padded?0:input[(iy*width+ix)*inChannels+channel];channelSum+=value*weight;
   const button=add(grid,'button',weight.toFixed(4));button.type='button';button.dataset.kernel=String(cell);button.setAttribute('aria-pressed',String(cell===kernelCell));button.setAttribute('aria-label',`Kernel row ${ky+1}, column ${kx+1}, weight ${fixed(weight)}. Inspect this weight.`);
   const strength=Math.min(1,Math.abs(weight)/weightScale),base=[244,246,236],end=weight<0?[217,178,155]:[130,174,145];button.style.backgroundColor=`rgb(${base.map((v,i)=>Math.round(v+(end[i]-v)*strength)).join(',')})`;
   button.addEventListener('click',()=>{kernelCell=cell;node('photoTrainParameterLayer').value=layer;node('photoTrainParameterKind').value='weights';node('photoTrainParameterIndex').value=String(index);draw();});
   const part=add(patch,'div',null,'photo-train-patch-cell');add(part,'strong',fixed(value));add(part,'small',`× ${weight.toFixed(4)} = ${(value*weight).toFixed(5)}${padded?' · zero padding':''}`);
  }
  if(hadFocus&&focusCell!==undefined)grid.querySelector(`[data-kernel="${focusCell}"]`)?.focus({preventScroll:true});
  const pos=(y*width+x)*outChannels+filter,pre=a[`${layer}Pre`][pos],post=current[pos],bias=m.layers[layer].biases[filter];
  node('photoTrainConvolutionMath').textContent=`For this channel, Σ(input × weight) = ${fixed(channelSum)}. Sum across all ${inChannels} input channels, then add bias ${fixed(bias)}: z = ${fixed(pre)}. ReLU max(0, z) = ${fixed(post)}. The same filter weights slide across every position. These are this classroom CNN’s actual activations, not evidence of where an animal is.`;
 }
 function drawGradients(snap,sample,beforePrediction){
  const score=node('photoTrainScoreGradients');score.replaceChildren();const p=(beforePrediction||math.predict(snap.model,sample.features)).probabilities;
  add(score,'p',`${snap.update?`Single-photo score derivatives before update ${snap.model.steps}.`:'Single-photo score derivatives at initialization.'} ${sample.split==='validation'?'This validation example is explanatory only and never contributes to a training update.':'The optimizer averages this training photo’s derivatives with those of the other eleven training photos.'}`,'photo-train-small');
  classes.forEach((label,c)=>{const target=c===sample.label?1:0,g=p[c]-target;bar(score,`${label}: p − target = ${p[c].toFixed(4)} − ${target}`,fixed(g),Math.abs(g)*100,g<0?'#b46d2d':'#24664e');});
  const layers=node('photoTrainLayerGradients');layers.replaceChildren();if(!snap.update){add(layers,'p','No backward pass has been used for an update yet. Train one step to see measured gradient sizes.');return;}
  const info=snap.update.layerUpdates,max=Math.max(...Object.values(info).map(v=>v.gradientNorm),1e-12);
  for(const key of Object.keys(names)){const row=bar(layers,names[key],`gradient ${fixed(info[key].gradientNorm)} · change ${fixed(info[key].deltaNorm)}`,info[key].gradientNorm/max*100);row.title='Euclidean lengths over the layer’s weights and biases. Bars share one scale across layers.';}
 }
 function drawParameter(snap){
  const layer=node('photoTrainParameterLayer').value,kind=node('photoTrainParameterKind').value,values=snap.model.layers[layer][kind],field=node('photoTrainParameterIndex');field.max=String(values.length-1);const index=Math.min(values.length-1,Math.max(0,Math.floor(Number(field.value)||0)));field.value=String(index);
  node('photoTrainParameterValue').textContent=`${names[layer]} ${kind==='weights'?'weight':'bias'} [${index}] = ${fixed(values[index])}; ${values.length} ${kind} in this group.`;node('photoTrainCellLabel').textContent=`Exact update · ${names[layer]} · ${kind} [${index}]`;
  if(snap.update){const old=snap.update.previousModel.layers[layer][kind][index],gradient=snap.update.gradients.layers[layer][kind][index];node('photoTrainWeightUpdate').textContent=`${fixed(old)} − ${snap.update.learningRate.toFixed(3)} × (${fixed(gradient)}) = ${fixed(values[index])}\nGradient: mean over the 12 training photos before update ${snap.model.steps}. A zero gradient leaves this parameter unchanged.`;}
  else node('photoTrainWeightUpdate').textContent=`Initial value ${fixed(values[index])}. No optimizer update yet. Weights use seeded random initialization; biases begin at zero.`;
 }
 function drawPhase(snap,sample,prediction,before){
  for(const button of root.querySelectorAll('[data-train-phase]'))button.setAttribute('aria-pressed',String(button.dataset.trainPhase===phase));
  const details={
   forward:`Forward pass: the 24 × 24 RGB input becomes four learned feature maps, is pooled to 12 × 12, becomes eight maps, and is pooled to 6 × 6. The 288 values feed 16 hidden units and three class scores. For this photo the ${classes[sample.label]} share is ${percent(prediction.probabilities[sample.label])}${before?` after the selected update (previously ${percent(before.probabilities[sample.label])}).`:'.'}`,
   loss:`Measure error: the checked label is ${classes[sample.label]}. Cross-entropy is −ln(p[label]); this photo’s current loss is ${math.loss(snap.model,[sample]).toFixed(5)}. ${snap.update?`The selected update used mean training loss ${snap.update.before.loss.toFixed(5)} before changing weights.`:'The checked answers will be used only when you press Train.'} The nine validation photos never enter this training loss.`,
   backprop:`Backpropagation starts at each training photo’s scores with p − one_hot_label. The chain rule carries that signal backward through dense connections, ReLU, mean pooling, and both convolutions. ReLU passes a gradient only where its preactivation was positive; a 2 × 2 mean sends one quarter to each input. Shared convolution weights accumulate contributions from every position. ${snap.update?'Layer bars show actual mean training-batch gradient lengths.':'Train one step to obtain actual batch gradients.'}`,
   update:snap.update?`Optimizer step ${snap.model.steps}: θ_new = θ_old − ${snap.update.learningRate.toFixed(3)} × dL/dθ. Mean training loss changed from ${snap.update.before.loss.toFixed(5)} to ${snap.update.after.loss.toFixed(5)}. All 5,083 parameters are eligible; some may have zero gradients. This is one full-batch update and one pass through our 12 training photos. Validation did not update any parameter.`:'Press Train 1 step to calculate gradients and update the actual CNN. Phase buttons inspect the calculation; they do not change weights.'
  };node('photoTrainPhaseDetail').textContent=details[phase];
 }
 function draw(){
  if(!ready)return;const snap=viewed(),sample=selected(),prediction=math.predict(snap.model,sample.features),before=snap.update?math.predict(snap.update.previousModel,sample.features):null;
  const image=node('photoTrainImage');if(image.getAttribute('src')!==sample.input.image)image.src=sample.input.image;image.alt=`${sample.photo.title}. Human teaching label: ${classes[sample.label]}.`;image.width=sample.input.width;image.height=sample.input.height;
  node('photoTrainHumanLabel').textContent=`Human teaching label: ${classes[sample.label]}`;node('photoTrainSplit').textContent=sample.split==='train'?'Training photo · used in updates':'Validation photo · checks only';
  const credit=node('photoTrainCredit');credit.replaceChildren();credit.append(`${sample.photo.credit} · ${sample.photo.license}. `);const link=add(credit,'a','Photo source');link.href=sample.photo.source_url;link.target='_blank';link.rel='noopener noreferrer';
  predictionBars(sample,prediction,before);const probability=prediction.probabilities[sample.label];node('photoTrainTargetProbability').textContent=percent(probability);node('photoTrainTargetFill').style.width=`${probability*100}%`;node('photoTrainTargetTrack').setAttribute('aria-label',`${percent(probability)} support for the checked ${classes[sample.label]} label.`);
  node('photoTrainPhotoLoss').textContent=math.loss(snap.model,[sample]).toFixed(5);node('photoTrainSteps').textContent=String(snap.model.steps);node('photoTrainTrainLoss').textContent=snap.train.loss.toFixed(5);node('photoTrainHeldoutLoss').textContent=snap.check.loss.toFixed(5);node('photoTrainTrainAccuracy').textContent=percent(snap.train.accuracy);node('photoTrainHeldoutAccuracy').textContent=percent(snap.check.accuracy);node('photoTrainParameterCount').textContent=math.parameterCount(model).toLocaleString();
  node('photoTrainUpdateSummary').textContent=snap.update?`Selected update ${snap.model.steps}: mean training loss ${snap.update.before.loss.toFixed(5)} → ${snap.update.after.loss.toFixed(5)}. Inspect real filters, feature maps, gradient sizes, and any parameter below.`:'Seeded random filters create initial responses; they have not learned from these photos yet. Start with one update, then inspect each phase.';
  node('photoTrainHistorySlider').max=String(snapshots.length-1);node('photoTrainHistorySlider').value=String(viewIndex);node('photoTrainHistoryLabel').textContent=`Viewing step ${snap.model.steps} · current model step ${model.steps}`;node('photoTrainHistoryNote').textContent=`The last ${snapshots.length} snapshots are retained. Changing this view updates no weights. Training continues from the latest model, step ${model.steps}.`;
  root.dataset.steps=String(model.steps);root.dataset.viewStep=String(snap.model.steps);root.dataset.trainLoss=history.at(-1).train.toFixed(8);root.dataset.validationLoss=history.at(-1).validation.toFixed(8);
  drawInput(sample);drawConvolution(snap,sample,prediction,before);drawGradients(snap,sample,before);drawParameter(snap);drawPhase(snap,sample,prediction,before);drawChart();
 }
 async function train(count){
  if(!ready||running)return;running=true;stopRequested=false;viewIndex=snapshots.length-1;controls();const rate=Number(node('photoTrainLearningRate').value);let completed=0;
  try{for(let n=0;n<count;n++){if(stopRequested||model.steps>=1000)break;const result=math.step(model,training,rate);model=result.model;record(result);completed++;if(n%3===0||n===count-1){draw();status(`Training: completed ${completed} of ${count} updates. Validation supplies no gradients.`);await new Promise(resolve=>setTimeout(resolve,0));}}
   draw();status(`${stopRequested?'Stopped safely after':'Completed'} ${completed} updates; latest model step ${model.steps}. Twelve training photos supplied gradients; nine validation photos supplied none.${model.steps>=1000?' Classroom limit reached: reset to start a new run.':''}`);
  }catch(error){status(`Training stopped: ${error.message}. Reset to restart.`);draw();}finally{running=false;controls();}
 }
 function reset(){if(running)return;model=math.createModel();snapshots=[];history=[];record();draw();status('Reset to the same seeded random initialization. No learned weights from the previous run remain.');}
 for(const[id,count]of [['photoTrainOne',1],['photoTrainTen',10],['photoTrainFifty',50]])node(id).addEventListener('click',()=>train(count));
 node('photoTrainStop').addEventListener('click',()=>{stopRequested=true;status('Stopping after the current completed update…');});node('photoTrainReset').addEventListener('click',reset);
 node('photoTrainPhoto').addEventListener('change',()=>{draw();status(`${selected().split==='train'?'Viewing a training photo.':'Viewing a validation photo; it supplies no gradients.'} Selecting a photo does not train the model.`);});
 for(const id of ['photoTrainFilterLayer','photoTrainFilter','photoTrainFilterChannel','photoTrainMapX','photoTrainMapY','photoTrainParameterLayer','photoTrainParameterKind','photoTrainParameterIndex'])node(id).addEventListener('input',draw);
 node('photoTrainHistorySlider').addEventListener('input',()=>{viewIndex=Number(node('photoTrainHistorySlider').value);draw();});
 for(const button of root.querySelectorAll('[data-train-phase]'))button.addEventListener('click',()=>{phase=button.dataset.trainPhase;draw();});
 node('photoTrainLearningRate').addEventListener('input',()=>{node('photoTrainLearningRateValue').textContent=Number(node('photoTrainLearningRate').value).toFixed(3);if(ready)status('Learning rate changed for future updates. The displayed saved update keeps the rate actually used.');});
 Promise.all(specs.map(loadPhoto)).then(loaded=>{samples=loaded;training=samples.filter(s=>s.split==='train');validation=samples.filter(s=>s.split==='validation');
  const chooser=node('photoTrainPhoto');chooser.replaceChildren();for(const[split,title]of [['train','Training photos · used for updates'],['validation','Validation photos · checks only']]){const group=add(chooser,'optgroup',null);group.label=title;for(const s of samples.filter(s=>s.split===split)){const option=add(group,'option',s.photo.title);option.value=s.id;}}
  chooser.value='deer_4';node('photoTrainTrainCount').textContent=String(training.length);node('photoTrainHeldoutCount').textContent=String(validation.length);ready=true;record();draw();controls();status('Twelve training photos and nine validation photos are ready. This is real browser training of a small CNN, separate from the pretrained wildlife models.');
 }).catch(error=>{status(error.message);controls();});
}
