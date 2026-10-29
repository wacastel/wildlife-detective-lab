function initCameraTrapLesson() {
 const root = document.getElementById('cameraTrapLesson');
 if (!root || root.dataset.initialized) return;
 root.dataset.initialized = 'true';
 const node = id => document.getElementById(id);
 let mode = 'day', triggered = false;
 function update() {
  const night = mode === 'night';
  root.dataset.mode = mode; root.dataset.triggered = String(triggered);
  for (const button of root.querySelectorAll('[data-camera-trap-mode]')) button.setAttribute('aria-pressed', String(button.dataset.cameraTrapMode === mode));
  node('cameraTrapAnimal').setAttribute('transform', triggered ? 'translate(455 216)' : 'translate(630 216)');
  node('cameraTrapAnimalLabel').textContent = triggered ? 'Moving through the sensing area' : 'Outside the sensing area';
  node('cameraTrapAnimalLabel').setAttribute('x', triggered ? '365' : '525');
  node('cameraTrapCross').disabled = triggered; node('cameraTrapReset').disabled = !triggered;
  node('cameraTrapLightTitle').textContent = night ? '2 · Add infrared light' : '2 · Use daylight';
  node('cameraTrapLightText').textContent = night ? 'When the scene is dark, infrared LEDs can illuminate it. The lens receives reflected infrared light, producing a usually black-and-white photograph. This is separate from the PIR trigger.' : 'In daylight, the camera uses available visible light to record a usually color photograph. The motion trigger can work in daylight or darkness.';
  node('cameraTrapStatus').textContent = triggered ? `In this illustration, the moving animal changes the sensor's infrared input. The camera triggers, ${night ? 'uses its infrared LEDs, and records a night image' : 'uses daylight, and records an image'}.` : `The camera is waiting ${night ? 'in darkness' : 'in daylight'}. Move the animal into view to try the trigger.`;
  node('cameraTrapExample').hidden = !triggered;
  if (!triggered) return;
  const photo = BUNDLE.photos.find(item => item.id === (night ? 'deer_trap_2' : 'deer_4'));
  const input = photo?.variants.find(item => item.id === 'clear');
  if (!input) { node('cameraTrapExample').hidden = true; return; }
  const image = node('cameraTrapResultPhoto'); image.src = input.image; image.width = input.width; image.height = input.height;
  image.alt = night ? 'A genuine black-and-white night camera-trap photograph of a deer.' : 'A genuine color daylight camera-trap photograph of a deer in woodland.';
  node('cameraTrapResultTitle').textContent = night ? 'Night: a real black-and-white camera-trap photo' : 'Day: a real camera-trap photo in visible light';
  node('cameraTrapResultCaption').textContent = 'Saved example from a different encounter, illustrating the kind of picture a camera can record. The drawing does not generate or simulate this photograph.';
  node('cameraTrapResultCredit').textContent = `${photo.credit} · ${photo.license} · ${photo.location}`;
 }
 for (const button of root.querySelectorAll('[data-camera-trap-mode]')) button.addEventListener('click', () => { mode = button.dataset.cameraTrapMode; update(); });
 node('cameraTrapCross').addEventListener('click', () => { triggered = true; update(); });
 node('cameraTrapReset').addEventListener('click', () => { triggered = false; update(); });
 update();
}
