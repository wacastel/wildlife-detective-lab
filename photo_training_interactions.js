function initPhotoTrainingLesson() {
 const root=document.getElementById('photoTrainingLab');
 if(!root||root.dataset.initialized)return;
 root.dataset.initialized='true';
 const node=id=>document.getElementById(id),math=PhotoTrainingMath,classes=['Deer','Raccoon','Coyote'],channels=['Red','Green','Blue'];
 const specs=[
  {id:'deer_4',label:0,split:'train'},{id:'deer_2',label:0,split:'train'},
  {id:'raccoon_2',label:1,split:'train'},{id:'raccoon_trap_1',label:1,split:'train'},
  {id:'coyote',label:2,split:'train'},{id:'coyote_3',label:2,split:'train'},
  {id:'deer_3',label:0,split:'heldout'},{id:'raccoon_4',label:1,split:'heldout'},{id:'coyote_2',label:2,split:'heldout'}
 ];
 let samples=[],training=[],heldout=[],model=math.createModel(),lastUpdate=null,history=[],selectedCell=0,ready=false;
 const selected=()=>samples.find(sample=>sample.id===node('photoTrainPhoto').value)||samples[0];
 const fixed=value=>Number(value).toFixed(5),percent=value=>`${(value*100).toFixed(1)}%`;
 function add(parent,tag,value,className){const element=document.createElement(tag);if(value!==null)element.textContent=value;if(className)element.className=className;parent.appendChild(element);return element;}
 function svg(parent,tag,attributes,value){const element=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,val]of Object.entries(attributes))element.setAttribute(key,String(val));if(value!==undefined)element.textContent=value;parent.appendChild(element);return element;}
 function controls(disabled){for(const id of ['photoTrainPhoto','photoTrainOne','photoTrainTwenty','photoTrainHundred','photoTrainReset'])node(id).disabled=disabled;}
 function loadPhoto(spec){
  const photo=BUNDLE.photos.find(item=>item.id===spec.id),input=photo?.variants.find(item=>item.id==='clear');
  if(!input)return Promise.reject(new Error('A required saved teaching photograph is unavailable.'));
  return new Promise((resolve,reject)=>{
   const image=new Image();
   image.onload=()=>{try{
    const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
    const data=context.getImageData(0,0,canvas.width,canvas.height).data;
    const sums=Array.from({length:16},()=>[0,0,0]),counts=Array(16).fill(0);
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
     const cell=Math.floor(y*4/canvas.height)*4+Math.floor(x*4/canvas.width),offset=(y*canvas.width+x)*4;
     for(let channel=0;channel<3;channel++)sums[cell][channel]+=data[offset+channel];counts[cell]++;
    }
    const colors=sums.map((sum,i)=>sum.map(value=>value/counts[i]));
    resolve({...spec,photo,input,colors,features:colors.flatMap(color=>color.map(value=>value/255-.5))});
   }catch(error){reject(error);}};
   image.onerror=()=>reject(new Error('A teaching photograph could not be read. Reload the app to try again.'));
   image.src=input.image;
  });
 }
 function record(){const train=math.evaluate(model,training),check=math.evaluate(model,heldout);history.push({step:model.steps,train:train.loss,heldout:check.loss});if(history.length>500)history.shift();return{train,check};}
 function drawChart(){
  const chart=node('photoTrainLossChart');chart.replaceChildren();
  const left=53,top=22,width=598,height=181,first=history[0].step,last=Math.max(first+1,model.steps),highest=Math.max(1.2,...history.flatMap(item=>[item.train,item.heldout]))*1.05;
  for(const fraction of [0,.5,1]){const y=top+(1-fraction)*height;svg(chart,'line',{x1:left,y1:y,x2:left+width,y2:y,stroke:'#d9e2cd','stroke-dasharray':'4 4'});svg(chart,'text',{x:left-8,y:y+4,'text-anchor':'end'},(fraction*highest).toFixed(2));}
  svg(chart,'line',{x1:left,y1:top,x2:left,y2:top+height,stroke:'#9aaa8e'});svg(chart,'line',{x1:left,y1:top+height,x2:left+width,y2:top+height,stroke:'#9aaa8e'});
  for(const [key,color]of [['train','#24664e'],['heldout','#b46d2d']]){
   const points=history.map(item=>`${left+(item.step-first)/(last-first)*width},${top+(1-item[key]/highest)*height}`).join(' ');
   svg(chart,'polyline',{points,fill:'none',stroke:color,'stroke-width':3});
   if(history.length===1)svg(chart,'circle',{cx:left,cy:top+(1-history[0][key]/highest)*height,r:4,fill:color});
  }
  svg(chart,'text',{x:12,y:14},'Mean loss');svg(chart,'text',{x:left,y:225,'text-anchor':'middle'},String(first));svg(chart,'text',{x:left+width,y:225,'text-anchor':'end'},String(model.steps));svg(chart,'text',{x:350,y:244,'text-anchor':'middle'},'Training step');
  chart.setAttribute('aria-label',`Calculated loss after ${model.steps} updates: training ${history.at(-1).train.toFixed(4)}, held-out ${history.at(-1).heldout.toFixed(4)}. Green is training; orange is held-out.`);
 }
 function drawGrids(sample){
  const featureGrid=node('photoTrainFeatureGrid'),weights=node('photoTrainWeights'),overlay=node('photoTrainImageGrid');
  const focused=document.activeElement,focusGrid=featureGrid.contains(focused)?featureGrid:weights.contains(focused)?weights:null,focusCell=focused?.dataset.cell;
  featureGrid.replaceChildren();weights.replaceChildren();overlay.replaceChildren();
  const output=Number(node('photoTrainWeightClass').value),channel=Number(node('photoTrainWeightChannel').value);
  const cellWeights=Array.from({length:16},(_,cell)=>model.weights[output][cell*3+channel]),max=Math.max(.01,...cellWeights.map(Math.abs));
  overlay.setAttribute('viewBox',`0 0 ${sample.input.width} ${sample.input.height}`);
  for(let cell=0;cell<16;cell++){
   const color=sample.colors[cell],featureButton=add(featureGrid,'button',String(cell+1));featureButton.type='button';
   featureButton.dataset.cell=String(cell);
   featureButton.style.backgroundColor=`rgb(${color.map(Math.round).join(',')})`;featureButton.style.color=color.reduce((sum,v)=>sum+v,0)/3>140?'#18352b':'#fffef8';
   featureButton.setAttribute('aria-label',`Cell ${cell+1}: mean red ${color[0].toFixed(1)}, green ${color[1].toFixed(1)}, blue ${color[2].toFixed(1)}. Select this input cell.`);
   featureButton.setAttribute('aria-pressed',String(cell===selectedCell));featureButton.addEventListener('click',()=>{selectedCell=cell;draw();});
   svg(overlay,'rect',{x:(cell%4)*sample.input.width/4,y:Math.floor(cell/4)*sample.input.height/4,width:sample.input.width/4,height:sample.input.height/4,fill:cell===selectedCell?'#ffc85b22':'none',stroke:cell===selectedCell?'#f4bd4b':'#ffffff99','stroke-width':cell===selectedCell?Math.max(3,sample.input.width*.004):Math.max(1,sample.input.width*.001)});
   const value=cellWeights[cell],button=add(weights,'button',value.toFixed(3));button.type='button';button.title=`Cell ${cell+1}: ${fixed(value)}`;
   button.dataset.cell=String(cell);
   const strength=Math.min(1,Math.abs(value)/max),base=[244,246,236],end=value<0?[217,178,155]:[130,174,145];button.style.backgroundColor=`rgb(${base.map((v,i)=>Math.round(v+(end[i]-v)*strength)).join(',')})`;
   button.setAttribute('aria-pressed',String(cell===selectedCell));button.setAttribute('aria-label',`Cell ${cell+1}, ${classes[output]} ${channels[channel]} weight ${fixed(value)}. Select its update.`);button.addEventListener('click',()=>{selectedCell=cell;draw();});
  }
  if(focusGrid&&focusCell!==undefined)focusGrid.querySelector(`[data-cell="${focusCell}"]`)?.focus({preventScroll:true});
  const index=selectedCell*3+channel,x=sample.features[index],weight=model.weights[output][index];
  node('photoTrainFeatureValue').textContent=`Cell ${selectedCell+1}, ${channels[channel].toLowerCase()}: mean ${sample.colors[selectedCell][channel].toFixed(2)} / 255 − 0.5 = ${fixed(x)}. For ${classes[output]}, weight × input = ${fixed(weight)} × ${fixed(x)} = ${fixed(weight*x)}. The class score sums all 48 contributions and adds its bias, ${fixed(model.biases[output])}.`;
  node('photoTrainCellLabel').textContent=`Cell ${selectedCell+1} · ${classes[output]} output · ${channels[channel]} input`;
  if(lastUpdate){
   const previous=lastUpdate.before.weights[output][index],gradient=lastUpdate.result.gradients.weights[output][index];
   node('photoTrainWeightUpdate').textContent=`${fixed(previous)} − ${lastUpdate.rate.toFixed(2)} × (${fixed(gradient)}) = ${fixed(weight)}\nGradient averaged over the six training photos at step ${model.steps}.`;
  }else node('photoTrainWeightUpdate').textContent='Weight = 0.00000. No update yet. Press Train 1 step to inspect its gradient and new value.';
 }
 function draw(){
  if(!ready)return;
  const sample=selected(),prediction=math.predict(model,sample.features),photoLoss=math.loss(model,[sample]);
  const image=node('photoTrainImage');if(image.getAttribute('src')!==sample.input.image)image.src=sample.input.image;image.width=sample.input.width;image.height=sample.input.height;image.alt=`${sample.photo.title}. Human teaching label: ${classes[sample.label].toLowerCase()}.`;
  node('photoTrainHumanLabel').textContent=`Human teaching label: ${classes[sample.label]}`;
  node('photoTrainSplit').textContent=sample.split==='train'?'Training photo · updates weights':'Held-out photo · checks only';
  const credit=node('photoTrainCredit');credit.replaceChildren();credit.append(`${sample.photo.credit} · ${sample.photo.license}. `);const source=add(credit,'a','Photo source');source.href=sample.photo.source_url;source.target='_blank';source.rel='noopener noreferrer';
  const output=node('photoTrainPrediction');output.replaceChildren();
  const tied=Math.max(...prediction.probabilities)-Math.min(...prediction.probabilities)<1e-12;
  add(output,'strong',tied?'All three labels are tied':`Current guess: ${classes[prediction.predictedClass]}`,'photo-train-guess');
  classes.forEach((label,index)=>{
   const row=add(output,'div',null,'photo-train-prob-row');row.dataset.correct=String(index===sample.label);const head=add(row,'div',null,'photo-train-prob-head');
   add(head,'span',label+(index===sample.label?' · teaching label':''));add(head,'output',percent(prediction.probabilities[index]));
   const track=add(row,'div',null,'photo-train-prob-track');track.setAttribute('role','img');track.setAttribute('aria-label',`${label}: ${percent(prediction.probabilities[index])}`);const fill=add(track,'div',null,'photo-train-prob-fill');fill.style.width=`${prediction.probabilities[index]*100}%`;
  });
  const target=prediction.probabilities[sample.label];node('photoTrainTargetProbability').textContent=percent(target);node('photoTrainTargetFill').style.width=`${target*100}%`;node('photoTrainTargetTrack').setAttribute('aria-label',`${percent(target)} support for the human teaching label, ${classes[sample.label]}. Target: 100%.`);
  node('photoTrainPhotoLoss').textContent=photoLoss.toFixed(4);node('photoTrainSteps').textContent=String(model.steps);node('photoTrainTrainLoss').textContent=history.at(-1).train.toFixed(4);node('photoTrainHeldoutLoss').textContent=history.at(-1).heldout.toFixed(4);
  node('photoTrainLearningRateValue').textContent=Number(node('photoTrainLearningRate').value).toFixed(2);
  node('photoTrainUpdateSummary').textContent=lastUpdate?`Latest update: training loss ${lastUpdate.result.before.loss.toFixed(4)} → ${lastUpdate.result.after.loss.toFixed(4)}. All 147 parameters were eligible to change; the total change length was ${lastUpdate.result.deltaNorm.toFixed(5)}. Inspect a particular weight below.`:'No weight updates yet. All three output shares are equal. A training step uses all six training photos; a held-out photo can be viewed without entering the update.';
  drawGrids(sample);drawChart();
 }
 function train(count){
  if(!ready)return;controls(true);
  try{const rate=Number(node('photoTrainLearningRate').value);for(let n=0;n<count;n++){const before=model,result=math.step(model,training,rate);model=result.model;lastUpdate={before,result,rate};record();}draw();node('photoTrainStatus').textContent=`Completed ${count} ${count===1?'update':'updates'} using the six training photos. The three held-out photos supplied no gradients.`;}
  catch(error){node('photoTrainStatus').textContent=`Training stopped: ${error.message}`;draw();}
  finally{controls(false);}
 }
 function reset(){model=math.createModel();lastUpdate=null;history=[];record();draw();node('photoTrainStatus').textContent='Weights and biases reset to zero. The current photo and all teaching labels stay the same.';}
 node('photoTrainOne').addEventListener('click',()=>train(1));node('photoTrainTwenty').addEventListener('click',()=>train(20));node('photoTrainHundred').addEventListener('click',()=>train(100));node('photoTrainReset').addEventListener('click',reset);
 node('photoTrainPhoto').addEventListener('change',()=>{node('photoTrainWeightClass').value=String(selected().label);draw();node('photoTrainStatus').textContent=selected().split==='heldout'?'Viewing a held-out photo. Training still updates from the other six photos only.':'Viewing a training photo. No weights changed when you selected it.';});
 for(const id of ['photoTrainWeightClass','photoTrainWeightChannel'])node(id).addEventListener('change',draw);
 node('photoTrainLearningRate').addEventListener('input',()=>{node('photoTrainLearningRateValue').textContent=Number(node('photoTrainLearningRate').value).toFixed(2);if(ready)node('photoTrainStatus').textContent='Learning rate changed. Weights will change only when you press a Train button; a large rate can overshoot.';});
 Promise.all(specs.map(loadPhoto)).then(loaded=>{
  samples=loaded;training=samples.filter(sample=>sample.split==='train');heldout=samples.filter(sample=>sample.split==='heldout');
  const chooser=node('photoTrainPhoto');chooser.replaceChildren();
  for(const [split,title]of [['train','Training photos · used for updates'],['heldout','Held-out photos · checks only']]){const group=add(chooser,'optgroup',null);group.label=title;for(const sample of samples.filter(item=>item.split===split)){const option=add(group,'option',sample.photo.title);option.value=sample.id;}}
  chooser.value='deer_4';ready=true;record();draw();controls(false);node('photoTrainStatus').textContent='Six training photos and three held-out photos are ready. Start with Train 1 step to follow one update.';
 }).catch(error=>{node('photoTrainStatus').textContent=error.message;controls(true);});
}
