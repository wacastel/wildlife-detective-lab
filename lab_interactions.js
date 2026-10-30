'use strict';
const $ = id => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';
const CLOUD_HOSTED = BUNDLE.hosting_mode === 'cloud';
const hostingCopy = (local, cloud) => CLOUD_HOSTED ? cloud : local;
const recordedView = {prefix:'', selectedCropKey:null, revealedCropKey:null};
const basicView = {prefix:'basic', selectedCropKey:null, revealedCropKey:null};
const liveView = {prefix:'live', selectedCropKey:null, revealedCropKey:null};
const qaView = {prefix:'qa', selectedCropKey:null, revealedCropKey:null};
const views = [recordedView, basicView, liveView, qaView];
const viewNode = (view,id) => $(view.prefix ? view.prefix+id[0].toUpperCase()+id.slice(1) : id);
let photo=BUNDLE.photos.find(p=>p.id==='deer_4')||BUNDLE.photos[0], variant=null, basicLiveResult=null, basicSourcePhoto=null, liveResult=null;
let uploaded=null, liveSourceUpload=null, liveSourcePhoto=null, localPhotos=[];
let qaPhoto=BUNDLE.photos.find(p=>p.id==='raccoon')||photo, qaVariant=qaPhoto.variants[0];
let liveAvailable=false, speciesAvailable=false, speciesReason='', speciesBusy=false;
let sourceRevision=0, uploadRevision=0, uploadReading=false, refreshBusy=false, lastRefresh=0, activeTab='learn';
const speciesResults=new Map();

function addText(parent,tag,text,cls){const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;parent.appendChild(n);return n;}
function sourceFor(view){return view===liveView?liveSourcePhoto:view===qaView?qaPhoto:view===basicView?basicSourcePhoto||photo:photo;}
function clearVariant(p){return p.variants.find(v=>v.id==='clear')||p.variants[0];}
function currentInput(view=recordedView){return view===liveView?liveResult:view===basicView?basicLiveResult||clearVariant(photo):view===qaView?qaVariant:variant||clearVariant(photo);}
const threshold=(view=recordedView)=>Number(viewNode(view,'threshold').value);
function resetSpecies(view){view.selectedCropKey=null;view.revealedCropKey=null;}

// Reuse one editable layout, with separate IDs, controls and selection state.
for(const view of [basicView,liveView,qaView]){
 const workspace=$('recordedWorkspace').cloneNode(true);workspace.id=view.prefix+'Workspace';
 for(const node of workspace.querySelectorAll('[id]'))node.id=view.prefix+node.id[0].toUpperCase()+node.id.slice(1);
 for(const node of workspace.querySelectorAll('[aria-labelledby]'))node.setAttribute('aria-labelledby',node.getAttribute('aria-labelledby').split(' ').map(id=>view.prefix+id[0].toUpperCase()+id.slice(1)).join(' '));
 $(view.prefix+'Host').appendChild(workspace);
}

function boxes(svg,detections,view){
 svg.replaceChildren();if(!viewNode(view,'showBoxes').checked)return;
 for(const d of detections.filter(d=>d.score>=threshold(view))){
  const b=d.bbox;if(!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite))continue;
  const x=Math.max(0,Math.min(1,b[0]))*1000,y=Math.max(0,Math.min(1,b[1]))*1000,w=Math.max(0,Math.min(1-b[0],b[2]))*1000,h=Math.max(0,Math.min(1-b[1],b[3]))*1000;
  const rect=document.createElementNS(SVG,'rect');for(const[k,v]of Object.entries({x,y,width:w,height:h,fill:'none',stroke:'#c9fa61','stroke-width':3,'vector-effect':'non-scaling-stroke'}))rect.setAttribute(k,v);svg.appendChild(rect);
  const label=document.createElementNS(SVG,'text');for(const[k,v]of Object.entries({x:x+5,y:y>45?y-10:y+32,fill:'#e8ffc6','font-size':31,'font-weight':750,stroke:'#173126','stroke-width':5,'paint-order':'stroke'}))label.setAttribute(k,v);
  label.textContent=`${d.category} ${d.score.toFixed(2)}`;svg.appendChild(label);
 }
}
function result(el,detections,unrun,view){
 el.replaceChildren();
 if(unrun){addText(el,'strong',unrun);addText(el,'span','No model prediction is claimed for this panel.','result-lines');return;}
 const shown=detections.filter(d=>d.score>=threshold(view)).sort((a,b)=>b.score-a.score);
 if(!shown.length){addText(el,'strong','No boxes reach this minimum','empty');addText(el,'span',`Minimum ${threshold(view).toFixed(2)} · This does not prove the scene is empty.`,'result-lines');}
 else{addText(el,'strong',`${shown.length} ${shown.length===1?'box reaches':'boxes reach'} the minimum`);addText(el,'span',shown.map(d=>`${d.category} ${d.score.toFixed(2)}`).join(' · '),'result-lines');}
}
function showImage(prefix,item,alt,unrun,view){
 const im=viewNode(view,prefix+'Image');im.src=item.image;im.alt=alt;viewNode(view,prefix+'Size').textContent=`${item.width} × ${item.height} px`;
 boxes(viewNode(view,prefix+'Boxes'),unrun?[]:item.detections||[],view);result(viewNode(view,prefix+'Result'),item.detections||[],unrun,view);
}
function cropKey(crop,view){const input=currentInput(view);return `${view.prefix||'quality'}/${sourceFor(view).id}/${input.input_sha256||input.image}/${crop.detection_index}/${crop.input_sha256||crop.image}`;}
function visibleCrops(view){const input=currentInput(view);return(input?.species_crops||[]).filter(c=>{const d=(input.detections||[])[c.detection_index];return d&&d.category==='animal'&&d.score>=threshold(view)&&c.image;});}
const validPrediction=p=>p&&Array.isArray(p.topk)&&p.topk.length>0;
const selectedCrop=view=>visibleCrops(view).find(c=>cropKey(c,view)===view.selectedCropKey)||null;
function drawClassification(prediction,mode,view){
 const out=viewNode(view,'speciesOutput');out.replaceChildren();addText(out,'span',mode,'species-mode');
 const table=document.createElement('table'),head=table.createTHead().insertRow();
 for(const title of ['SpeciesNet label','Classifier score']){const th=document.createElement('th');th.scope='col';th.textContent=title;head.appendChild(th);}
 const body=table.createTBody();
 for(const item of prediction.topk.slice(0,5)){
  const row=body.insertRow(),name=row.insertCell();addText(name,'span',item.label||item.common_name||item.taxon||'Unspecified label');
  if(item.scientific_name&&item.scientific_name!==item.label)addText(name,'small',item.scientific_name);if(item.taxon)addText(name,'small',`Label level: ${item.taxon}`);
  row.insertCell().textContent=Number.isFinite(item.score)?item.score.toPrecision(6):'Not provided';
 }
 out.appendChild(table);const first=prediction.topk[0];
 const rankNote=first.taxon&&first.taxon!=='species'?`The top suggestion is ${first.taxon==='non-animal label'?'a non-animal category':`at ${first.taxon} level`}, rather than a species identification. `:'';
 addText(out,'p',rankNote+'These are genuine classifier outputs, not guaranteed correct identifications. Labels can be broad taxa or “blank.” Human reference labels are separate.','species-warning');
 if(prediction.model)addText(out,'p',`Model: ${prediction.model}`,'hint');
}
function renderSpecies(view){
 const input=currentInput(view);if(!input)return;
 const node=id=>viewNode(view,id),crops=visibleCrops(view),list=node('cropList');list.replaceChildren();node('speciesOutput').replaceChildren();node('speciesMessage').textContent='';node('speciesMessage').classList.remove('error');
 if(!crops.some(c=>cropKey(c,view)===view.selectedCropKey)){view.selectedCropKey=crops.length?cropKey(crops[0],view):null;view.revealedCropKey=null;}
 if(!crops.length){
  node('classifyArea').hidden=true;node('speciesEmpty').hidden=false;
  const animals=(input.detections||[]).filter(d=>d.category==='animal'&&d.score>=threshold(view)),visitors=(input.detections||[]).filter(d=>['person','vehicle'].includes(d.category)&&d.score>=threshold(view));
  node('speciesEmpty').textContent=input.local_preview?'This is your photo before analysis. Run MegaDetector first; only its actual animal boxes can become SpeciesNet crops.':animals.length?'Animal candidates are visible, but no matching crops are included for this exact input. No species result is being invented.':visitors.length?'Person or vehicle detections are shown above. This lab sends only animal candidates to SpeciesNet, so there is no animal crop to classify.':'No animal box reaches this detection minimum. Try another input or lower the minimum, watching for false alarms.';return;
 }
 node('speciesEmpty').hidden=true;node('classifyArea').hidden=false;
 for(const c of crops){
  const key=cropKey(c,view),d=input.detections[c.detection_index],btn=document.createElement('button');btn.className='crop-choice';btn.setAttribute('aria-pressed',String(key===view.selectedCropKey));btn.setAttribute('aria-label',`Select animal box ${c.detection_index+1}, detector score ${d.score.toFixed(2)}`);
  const im=document.createElement('img');im.src=c.image;im.alt=`Crop of animal candidate box ${c.detection_index+1}`;btn.appendChild(im);addText(btn,'strong',`Animal box ${c.detection_index+1}`);addText(btn,'span',`Detector score ${d.score.toFixed(2)}`);
  btn.addEventListener('click',()=>{view.selectedCropKey=key;view.revealedCropKey=null;renderSpecies(view);});list.appendChild(btn);
 }
 const crop=selectedCrop(view),key=view.selectedCropKey,stored=speciesResults.get(key),cached=validPrediction(crop.prediction),known=validPrediction(stored);
 node('chosenCrop').src=crop.image;node('cropDescription').textContent=`Exact ${crop.width} × ${crop.height} px crop from box ${crop.detection_index+1}. Detector score ${input.detections[crop.detection_index].score.toFixed(3)}. Classifier scores answer a separate question.`;
 node('speciesMode').textContent=cached?'Recorded SpeciesNet run · works offline':known?hostingCopy('Local SpeciesNet result ready','SpeciesNet result from Google Cloud ready'):speciesAvailable?hostingCopy('Local SpeciesNet ready','SpeciesNet ready on Google Cloud'):'No recorded classification for this crop';
 node('speciesInstruction').textContent=cached?'Make a guess, then reveal the genuine prediction saved for these exact crop pixels. This does not run new inference.':known?hostingCopy('Reveal the genuine local prediction already made for these exact crop pixels.','Reveal the genuine prediction already calculated in Google Cloud for these exact crop pixels.'):hostingCopy('Make a guess, then ask the local SpeciesNet classifier to examine this exact crop.','Make a guess, then send this exact animal crop to SpeciesNet in Google Cloud.');
 const button=node('identifyCrop');button.textContent=speciesBusy?'SpeciesNet is working…':cached||known?'Identify this crop · reveal saved result':'Identify this crop · run SpeciesNet';button.disabled=speciesBusy||(!cached&&!known&&!speciesAvailable);
 if(!cached&&!known&&!speciesAvailable)node('speciesMessage').textContent=speciesReason||hostingCopy('New classifications need the local Python app and existing SpeciesNet model.','New classifications need SpeciesNet to be available on the hosted service.');
 if(view.revealedCropKey===key){if(known)drawClassification(stored,hostingCopy('Genuine local SpeciesNet output','Genuine SpeciesNet output · Google Cloud'),view);else if(cached)drawClassification(crop.prediction,'Genuine recorded SpeciesNet output',view);}
}
function renderAllSpecies(){for(const view of views)renderSpecies(view);}
function renderWorkspace(view){
 const current=currentInput(view),sourcePhoto=sourceFor(view);if(!current||!sourcePhoto)return;
 const node=id=>viewNode(view,id),upload=view===liveView&&liveSourceUpload,source=clearVariant(sourcePhoto),isBasic=view===basicView,isLocalRun=view===liveView||isBasic&&!!basicLiveResult;
 const original=upload?{image:upload.data,width:upload.width,height:upload.height,detections:[]}:source;
 const sourceUnrun=upload?'Original upload · not analyzed':sourcePhoto.local||isBasic?'Source photo · before detector boxes':false;
 node('thresholdValue').textContent=threshold(view).toFixed(2);const detections=current.detections||[],kept=detections.filter(d=>d.score>=threshold(view)).length;
 node('candidateCount').textContent=current.local_preview?'No model run yet.':`${kept} of ${detections.length} candidates kept for this input.`;
 node('experimentTitle').textContent=isBasic?'1. Find the visitor · 2. Inspect the animal crop':view===liveView?'Your live experiment':view===qaView?'Investigate the answer':`Source photo → ${current.label.toLowerCase()}`;
 node('experimentExplanation').textContent=isBasic?current.local_preview?hostingCopy('Your local photo is ready. Run the detector to get real boxes.','Your photo is ready. Run the detector in Google Cloud to get real boxes.'):isLocalRun?hostingCopy('A fresh local detector run on the selected photo. Select an animal crop for SpeciesNet.','A fresh detector run in Google Cloud on the selected photo. Select an animal crop for SpeciesNet.'):'Genuine saved results for the source photo. Inspect the boxes, then reveal the saved crop classification.':isLocalRun&&CLOUD_HOSTED?'Google Cloud analyzed the exact input shown below. '+(current.explanation||'Select an animal crop to continue to SpeciesNet.'):(current.explanation||'A new local prediction on the exact input below.');
 node('originalTitle').textContent=sourceUnrun||'Source photo · recorded result';node('changedTitle').textContent=current.local_preview?'Awaiting detector run':isLocalRun?'Live detector input':isBasic?'MegaDetector · saved result':current.label;
 node('resultMode').textContent=current.local_preview?hostingCopy('Local photo · not analyzed','Photo · not analyzed'):isLocalRun?hostingCopy('Genuine live model output','Genuine live output · Google Cloud'):'Genuine recorded model output';
 showImage('original',original,upload?'Original uploaded photograph':`${sourcePhoto.title}, source photo`,sourceUnrun,view);
 showImage('changed',current,`${upload?'Uploaded':sourcePhoto.title}: ${current.label||'live input'}`,current.local_preview?'Run the detector to analyze this photo':false,view);
 node('speciesLabel').textContent=upload||sourcePhoto.local?'Your photo has no human reference label here. Check the actual boxes and any species prediction.':`Human photo label: ${sourcePhoto.human_label||sourcePhoto.human_source_label||sourcePhoto.species||'Not provided'}. This label is not a model prediction.`;
 const credit=node('photoCredit');credit.replaceChildren();
 if(upload)addText(credit,'p',`Your upload: ${upload.name}. `+hostingCopy('Processed locally on this computer.','Processed in Google Cloud memory. This app does not save photo files.'));
 else if(sourcePhoto.local)addText(credit,'p',`Your photo: ${sourcePhoto.filename} · user_photos/ · local to this computer.`);
 else{addText(credit,'p',`${sourcePhoto.credit} · ${sourcePhoto.license||'See source for terms'} · ${sourcePhoto.location_note||''}`);if(sourcePhoto.source_url&&/^https?:\/\//.test(sourcePhoto.source_url)){const a=addText(addText(credit,'p',''),'a','Photo source & credit');a.href=sourcePhoto.source_url;a.target='_blank';a.rel='noopener noreferrer';}}
 addText(credit,'p','Scores are model scores, not calibrated probabilities. Teaching edits are not measurements of real camera performance.');
 node('guessButton').textContent=node('showBoxes').checked?'Hide boxes & guess':'Reveal detector boxes';renderSpecies(view);
}
function render(){
 $('cutoffInline').textContent=threshold().toFixed(2);$('photoNote').replaceChildren();addText($('photoNote'),'span',photo.location_note||hostingCopy('Your photo stays on this computer.','New predictions run in Google Cloud.'));if(photo.quality_note)addText($('photoNote'),'span',photo.quality_note,'quality-note');
 for(const btn of $('conditions').querySelectorAll('button'))btn.setAttribute('aria-pressed',String(btn.dataset.id===currentInput().id));
 for(const view of views)renderWorkspace(view);$('liveResults').hidden=!liveResult;
 $('runBasic').disabled=!liveAvailable||$('runBasic').dataset.busy==='true';
 $('runLive').disabled=!liveAvailable||uploadReading||$('runLive').dataset.busy==='true';
 $('upload').disabled=!liveAvailable;
 $('runBasic').textContent=liveAvailable?hostingCopy('Run detector on this photo','Run detector in Google Cloud'):hostingCopy('Live detector needs the Python app','Hosted detector is unavailable');
}
function populatePhotoChoosers(){
 const cameraIds=new Set(['deer_4','raccoon_3','raccoon_4','coyote_2','coyote_3','person_1','person_2','vehicle_1','vehicle_2']);
 const isCamera=p=>p.camera_trap||cameraIds.has(p.id);
 for(const id of ['photoSelect','qualityPhotoSelect']){
  const select=$(id);select.replaceChildren();
  for(const [label,items] of [['Camera-trap examples · genuine saved results',BUNDLE.photos.filter(isCamera)],['Reference photographs & empty control',BUNDLE.photos.filter(p=>!isCamera(p))]]){
   const group=addText(select,'optgroup','');group.label=label;for(const p of items){const o=addText(group,'option',p.title);o.value=p.id;}
  }
  if(localPhotos.length){const group=addText(select,'optgroup','');group.label='Your photos · user_photos/';for(const p of localPhotos){const o=addText(group,'option',p.title);o.value=p.id;}}
  select.value=photo.id;
 }
}
function selectPhoto(id){
 photo=[...BUNDLE.photos,...localPhotos].find(p=>p.id===id)||BUNDLE.photos[0];sourceRevision++;basicLiveResult=null;basicSourcePhoto=null;resetSpecies(recordedView);resetSpecies(basicView);variant=clearVariant(photo);
 for(const select of [$('photoSelect'),$('qualityPhotoSelect')])select.value=photo.id;
 $('basicRunMessage').textContent=photo.local?'Ready for a fresh local run. No saved model output exists for your photo.':hostingCopy('Bundled examples already contain genuine saved model results. You can also run the local detector again.','Bundled examples already contain genuine saved model results. You can also run a fresh prediction in Google Cloud.');
 $('conditions').replaceChildren();
 if(photo.local)addText($('conditions'),'p','Your photos have no recorded edits. Use the optional quality controls in Live lab, then run the detector on the selected source.','hint');
 else for(const v of photo.variants){const b=addText($('conditions'),'button','', 'condition');b.dataset.id=v.id;b.setAttribute('aria-pressed','false');b.title=v.explanation||v.label;addText(b,'span',v.label);addText(b,'span','↗','arrow').setAttribute('aria-hidden','true');b.addEventListener('click',()=>{variant=v;resetSpecies(recordedView);render();});}
 render();
}
async function refreshPhotos(force=false){
 if(CLOUD_HOSTED||!['http:','https:'].includes(location.protocol)||!['127.0.0.1','localhost','[::1]'].includes(location.hostname)||refreshBusy||!force&&Date.now()-lastRefresh<5000)return;
 refreshBusy=true;
 try{
  const response=await fetch('/api/photos');if(!response.ok)throw new Error('The local photo folder is unavailable.');const data=await response.json();
  localPhotos=(data.photos||[]).map(p=>({...p,local:true,location_note:'Your own local photo. No human species label is supplied to the models.',variants:[{id:'clear',label:'Your photo',image:p.image_url,width:p.width,height:p.height,detections:[],species_crops:[],local_preview:true}]}));
  const changed=photo.local&&!localPhotos.some(p=>p.id===photo.id);populatePhotoChoosers();if(changed)selectPhoto(BUNDLE.photos[0].id);
  const skipped=data.skipped||[];$('folderStatus').textContent=`${localPhotos.length} local ${localPhotos.length===1?'photo':'photos'} available.${skipped.length?' '+skipped.length+' skipped: '+skipped.map(p=>`${p.filename}: ${p.reason}`).join('; '):''}`;lastRefresh=Date.now();
 }catch(e){if(force)$('folderStatus').textContent=e.message;}finally{refreshBusy=false;}
}
for(const id of ['photoSelect','qualityPhotoSelect'])$(id).addEventListener('change',e=>selectPhoto(e.target.value));
$('refreshPhotos').addEventListener('click',()=>refreshPhotos(true));

for(const view of views){
 const node=id=>viewNode(view,id);node('threshold').addEventListener('input',render);node('showBoxes').addEventListener('change',render);
 node('guessButton').addEventListener('click',()=>{node('showBoxes').checked=!node('showBoxes').checked;render();});
 node('identifyCrop').addEventListener('click',async()=>{
  const crop=selectedCrop(view);if(!crop||speciesBusy)return;const key=view.selectedCropKey;
  if(validPrediction(speciesResults.get(key))||validPrediction(crop.prediction)){view.revealedCropKey=key;renderSpecies(view);return;}
  if(!speciesAvailable)return;speciesBusy=true;renderAllSpecies();node('speciesMessage').textContent=hostingCopy('SpeciesNet is examining this exact crop…','SpeciesNet is examining this exact crop in Google Cloud…');
  try{
   const response=await fetch('/api/classify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image_data:crop.image})});const data=await response.json();
   if(!response.ok)throw new Error(data.error||`Classifier returned ${response.status}.`);if(!validPrediction(data))throw new Error('No valid classifier labels were returned.');speciesResults.set(key,data);if(view.selectedCropKey===key)view.revealedCropKey=key;
  }catch(e){if(view.selectedCropKey===key){node('speciesMessage').textContent=`No new species prediction was produced: ${e.message}`;node('speciesMessage').classList.add('error');}}
  finally{speciesBusy=false;const msg=node('speciesMessage').textContent,error=view.selectedCropKey===key&&node('speciesMessage').classList.contains('error');renderAllSpecies();if(error){node('speciesMessage').textContent=msg;node('speciesMessage').classList.add('error');}}
 });
}

function liveMessage(message,error=false){$('liveMessage').textContent=message;$('liveMessage').classList.toggle('error',error);}
for(const id of ['brightness','blur','resolution'])$(id).addEventListener('input',()=>{$(id+'Value').textContent=id==='brightness'?`${Number($(id).value).toFixed(2)}×`:`${$(id).value} px`;});
$('upload').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;const thisUpload=++uploadRevision;sourceRevision++;uploaded=null;
 if(file.size>20*1024*1024){uploadReading=false;liveMessage('Please choose a photo up to 20 MiB.',true);e.target.value='';$('uploadName').textContent='Using selected source photo';$('runLive').disabled=!liveAvailable||$('runLive').dataset.busy==='true';return;}
 uploadReading=true;$('runLive').disabled=true;
 try{
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
  const dims=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve({width:im.naturalWidth,height:im.naturalHeight});im.onerror=reject;im.src=data;});
  if(thisUpload!==uploadRevision)return;if(dims.width*dims.height>100000000)throw new Error('Choose a photo with at most 100 megapixels.');uploaded={name:file.name,data,...dims};sourceRevision++;$('uploadName').textContent=`Selected: ${file.name}`;liveMessage(hostingCopy('Upload selected. Run the detector to analyze it; the previous result keeps its original input.','Photo selected in your browser. Run detector sends it to Google Cloud for processing; this app does not save the photo file.'));
 }catch(e){if(thisUpload===uploadRevision){$('uploadName').textContent='Using selected source photo';liveMessage(e.message||'This browser could not read that image. Try JPEG, PNG, or WebP.',true);}}
 finally{if(thisUpload===uploadRevision){uploadReading=false;$('runLive').disabled=!liveAvailable||$('runLive').dataset.busy==='true';}}
});
$('useBuiltin').addEventListener('click',()=>{uploaded=null;uploadRevision++;sourceRevision++;uploadReading=false;$('upload').value='';$('uploadName').textContent=`Using selected source: ${photo.title}`;$('runLive').disabled=!liveAvailable||$('runLive').dataset.busy==='true';liveMessage('The selected source photo will be used next. The previous result stays paired with its analyzed input.');});
async function runDetector(view){
 const isBasic=view===basicView;if(!liveAvailable||!isBasic&&uploadReading)return;const button=$(isBasic?'runBasic':'runLive'),message=(text,error=false)=>{if(isBasic){$('basicRunMessage').textContent=text;$('basicRunMessage').classList.toggle('error',error);}else liveMessage(text,error);};
 if(button.dataset.busy==='true')return;button.dataset.busy='true';button.disabled=true;message(hostingCopy('MegaDetector is examining the image…','MegaDetector is examining the image in Google Cloud…'));
 const requestPhoto=photo,requestUpload=isBasic?null:uploaded,requestRevision=sourceRevision;
 const request={photo_id:requestPhoto.id,brightness:isBasic?1:Number($('brightness').value),blur:isBasic?0:Number($('blur').value),resolution:isBasic?1280:Number($('resolution').value),scale:1,occlusion:0,grayscale:false};if(requestUpload)request.image_data=requestUpload.data;
 try{
  const response=await fetch('/api/predict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});const data=await response.json();
  if(!response.ok)throw new Error(data.error||`Detector returned ${response.status}.`);if(!data.image||!Array.isArray(data.detections)||!data.width||!data.height)throw new Error('The detector result was incomplete.');
  if(requestRevision!==sourceRevision){message('The detector finished for an earlier selection. Run again for the newly selected input.');return;}
  const output={...data,id:'live',label:isBasic?'Source photo · live run':'Live transformation',explanation:`Brightness ${request.brightness.toFixed(2)}× · blur ${request.blur} px · detail ${request.resolution} px. MegaDetector analyzed these exact edited pixels${CLOUD_HOSTED?' in Google Cloud':''}.`};
  const sourceSnapshot=requestPhoto.local&&data.source_preview?{...requestPhoto,variants:[{...data.source_preview,id:'clear',label:'Source snapshot',local_preview:true,detections:[],species_crops:[]}]}:requestPhoto;
  if(isBasic){basicLiveResult=output;basicSourcePhoto=sourceSnapshot;}else{liveSourceUpload=requestUpload;liveSourcePhoto=sourceSnapshot;liveResult=output;}
  resetSpecies(view);render();message(`Finished${Number.isFinite(data.elapsed_seconds)?' in '+data.elapsed_seconds.toFixed(2)+' seconds':''}. `+hostingCopy('Genuine local output appears here. Select an animal crop to continue to SpeciesNet.','Genuine Google Cloud output appears here. Select an animal crop to continue to SpeciesNet.'));
 }catch(e){message(`No new detector prediction was produced: ${e.message} The previous result keeps its analyzed input.`,true);}
 finally{button.dataset.busy='false';button.disabled=!liveAvailable||!isBasic&&uploadReading;}
}
$('runBasic').addEventListener('click',()=>runDetector(basicView));$('runLive').addEventListener('click',()=>runDetector(liveView));

const qaDemos={
 code:{photo:'raccoon',variant:'blur',text:'Blurring is an explicit pixel-editing instruction. MegaDetector and SpeciesNet then apply fixed learned weights. Inspect the genuine box and reveal the crop label; neither model learned during this edit.'},
 limits:{photo:'raccoon',variant:'blur',text:'A strong detector score can accompany a poor box or an unhelpful crop. Reveal SpeciesNet’s actual saved output, then compare with Source photo.'},
 clues:{photo:'deer_4',variant:'grayscale',text:'Compare the real source with Remove color, Tiny in the frame, and Partly hidden. These are teaching edits, not measurements of an animal’s physical size.'},
 habitat:{photo:'raccoon_4',variant:'clear',text:'Inspect this real wooded camera-trap scene, its human reference label, and every proposed box. More boxes do not automatically mean more animals.'},
 camera:{photo:'coyote_2',variant:'lowres',text:'Compare Fewer pixels with Source photo, then Out of focus. Upscaling cannot restore discarded detail. These results do not establish a universal camera specification.'},
 infrared:{photo:'raccoon_3',variant:'clear',text:'This is a real nighttime camera-trap photo. Compare it with Remove color, an ordinary RGB teaching edit. Neither is a thermal experiment; grayscale does not create infrared measurements.'},
 camouflage:{photo:'raccoon_4',variant:'hidden',text:'First inspect the real wooded source. Then compare the artificial obstruction, which removes evidence but does not simulate realistic camouflage or demonstrate retraining.'},
 conservation:{photo:'deer_4',variant:'clear',text:'Try the detection minimum and review each box. A useful conservation record also needs checked species, camera effort and location metadata; this small activity cannot estimate population size.'}
};
function renderWaterIllustration(){
 const distance=Number($('waterDistance').value),attenuation=Number($('waterClarity').value),remaining=Math.exp(-attenuation*distance);
 $('waterDistanceValue').textContent=distance+' units';$('waterTarget').style.opacity=String(Math.max(.03,remaining));$('waterBeam').style.opacity=String(Math.max(.06,Math.sqrt(remaining)));
 $('waterExplanation').textContent=`In this illustrative calculation, relative light is exp(−k × distance) = ${remaining.toFixed(3)} with k = ${attenuation}. More scattering and absorption can leave less light and detail; real visibility depends on the sensor, illumination, subject, and water.`;
}
$('waterDistance').addEventListener('input',renderWaterIllustration);$('waterClarity').addEventListener('change',renderWaterIllustration);renderWaterIllustration();
function setQaDemo(name){
 const demo=qaDemos[name];if(!demo)return;qaPhoto=BUNDLE.photos.find(p=>p.id===demo.photo)||BUNDLE.photos[0];qaVariant=qaPhoto.variants.find(v=>v.id===demo.variant)||clearVariant(qaPhoto);resetSpecies(qaView);
 $('qaExercise').textContent=demo.text;$('qaPhotoName').textContent=qaPhoto.title;$('qaVariantSelect').replaceChildren();for(const v of qaPhoto.variants){const o=addText($('qaVariantSelect'),'option',v.label);o.value=v.id;}$('qaVariantSelect').value=qaVariant.id;renderWorkspace(qaView);
}
for(const button of document.querySelectorAll('[data-qa-demo]'))button.addEventListener('click',()=>{setQaDemo(button.dataset.qaDemo);$('qaDemo').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
$('qaVariantSelect').addEventListener('change',e=>{qaVariant=qaPhoto.variants.find(v=>v.id===e.target.value)||clearVariant(qaPhoto);resetSpecies(qaView);renderWorkspace(qaView);});

function switchTab(name,focus=false){
 if(!['learn','lab','questions'].includes(name))name='learn';activeTab=name;
 for(const id of ['learn','lab','questions']){const selected=id===name;$('tab-'+id).setAttribute('aria-selected',String(selected));$('tab-'+id).tabIndex=selected?0:-1;$('panel-'+id).hidden=!selected;}
 if(focus)$('tab-'+name).focus();history.replaceState(null,'','#'+name);if(name==='lab')refreshPhotos();
}
const tabButtons=[...document.querySelectorAll('[role=tab]')];
for(const button of tabButtons){button.addEventListener('click',()=>switchTab(button.dataset.tab));button.addEventListener('keydown',e=>{let index=tabButtons.indexOf(button);if(e.key==='ArrowRight')index=(index+1)%tabButtons.length;else if(e.key==='ArrowLeft')index=(index+tabButtons.length-1)%tabButtons.length;else if(e.key==='Home')index=0;else if(e.key==='End')index=tabButtons.length-1;else return;e.preventDefault();switchTab(tabButtons[index].dataset.tab,true);});}
for(const button of document.querySelectorAll('[data-go-tab]'))button.addEventListener('click',()=>{if(button.dataset.labPhoto)selectPhoto(button.dataset.labPhoto);switchTab(button.dataset.goTab,true);window.scrollTo({top:0,behavior:'smooth'});});

const provenance=$('provenance');addText(provenance,'p',`Detector: ${BUNDLE.model.name}. ${BUNDLE.model.description||''}`);addText(provenance,'p',`Recorded runs: ${BUNDLE.generated_at}. Model input ${BUNDLE.model.input_size} × ${BUNDLE.model.input_size}. Stored candidate floor ${BUNDLE.model.score_floor}.`);
addText(addText(provenance,'p','Detector SHA-256: '),'code',BUNDLE.model.sha256);
if(BUNDLE.species_model){for(const view of views)viewNode(view,'cropScopeNote').textContent=`Up to ${BUNDLE.species_model.max_crops_per_image||5} animal crops are prepared per input, with detector scores at least ${Number(BUNDLE.species_model.score_floor_for_crops||.05).toFixed(2)}. Only crops meeting this view’s detection minimum appear.`;addText(provenance,'p',`Classifier: ${BUNDLE.species_model.name}. ${BUNDLE.species_model.description}`);}
addText(provenance,'p',hostingCopy('Saved buttons reveal genuine recorded outputs; live buttons run local models. User-folder photos and uploads are not included in the recorded-results download.','Saved buttons reveal genuine recorded outputs; live buttons run the models in Google Cloud. Uploaded photos and crops are processed in memory and are not included in the recorded-results download. This app does not save photo files.'));
$('downloadResults').addEventListener('click',()=>{const data=JSON.stringify(BUNDLE,(key,value)=>key==='image'?'[exact image embedded in demo HTML]':value,2),url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='wildlife_recorded_results.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
async function checkLive(){
 const loopback=['127.0.0.1','localhost','[::1]'].includes(location.hostname);
 if(!['http:','https:'].includes(location.protocol)||!loopback&&!(CLOUD_HOSTED&&location.protocol==='https:'))return;
 try{
  const response=await fetch('/api/status');if(!response.ok)return;const data=await response.json();liveAvailable=!!data.available;speciesAvailable=!!data.species_available;speciesReason=data.species_reason||'';
  $('liveAvailable').hidden=!liveAvailable;$('liveBadge').textContent=liveAvailable?speciesAvailable?hostingCopy('Local detector + SpeciesNet ready','Google Cloud detector + SpeciesNet ready'):hostingCopy('Local detector ready','Google Cloud detector ready'):'Saved results ready';
  $('liveStatus').textContent=liveAvailable?hostingCopy('Use the selected source or upload a photo. Both image processing and inference run on this computer. Your output stays inside this section.','Use an included source or choose your own photo. New detector and SpeciesNet predictions run in Google Cloud, and results appear inside this section.'):data.reason||'The saved activity still works offline.';
  if(CLOUD_HOSTED)$('modeText').textContent=liveAvailable?speciesAvailable?'Hosted lab · live AI':'Hosted lab · detector ready':'Hosted lab · saved examples';
  $('runLive').disabled=!liveAvailable;render();await refreshPhotos(true);
 }catch(e){/* Saved examples remain available without a local server. */}
}
function applyHostingMode(){
 if(!CLOUD_HOSTED)return;
 for(const intake of document.querySelectorAll('.folder-intake'))intake.hidden=true;
 $('sourcePhotoLabel').textContent='Included source examples';
 $('photoPrivacy').textContent='Uploads and animal crops are processed in Google Cloud memory. This app does not save their files.';
 $('livePrivacy').textContent='Hosted privacy: new predictions run in Google Cloud. Pressing Run with your own photo sends it there; running SpeciesNet sends the selected crop. Processing uses memory, and this app does not save photo files.';
 $('liveStatus').textContent='Saved examples are ready. Checking whether the Google Cloud detector and classifier are available…';
 $('liveBadge').textContent='Google Cloud models';$('modeText').textContent='Hosted lab · checking live AI';$('runLive').textContent='Run detector in Google Cloud';
}
applyHostingMode();populatePhotoChoosers();selectPhoto(photo.id);setQaDemo('code');initVisionLesson();switchTab(location.hash.slice(1)||'learn');checkLive();
window.addEventListener('focus',()=>refreshPhotos());document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshPhotos();});
setInterval(()=>{if(activeTab==='lab'&&!document.hidden)refreshPhotos();},15000);
