#!/bin/sh
# Build remotely from a curated source tree; never upload .venv or user photos.
set -eu
if [ "$#" -lt 1 ] || [ "$#" -gt 4 ]; then
  echo "Usage: ./deploy_gcp.sh PROJECT_ID [REGION] [SERVICE] [live|recorded]" >&2
  exit 2
fi
project=$1
region=${2:-us-central1}
service=${3:-wildlife-detective-lab}
mode=${4:-live}
update_existing=${WILDLIFE_UPDATE_EXISTING:-0}
case "$mode" in live|recorded) ;; *) echo "Mode must be live or recorded" >&2; exit 2;; esac
case "$update_existing" in 0|1) ;; *) echo "WILDLIFE_UPDATE_EXISTING must be 0 or 1" >&2; exit 2;; esac
case "$project/$region/$service" in *[!a-z0-9/-]*) echo "Use lowercase project, region and service IDs" >&2; exit 2;; esac
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
task_python=${WILDLIFE_PYTHON:-.venv/bin/python}
stage=$(mktemp -d "${TMPDIR:-/tmp}/wildlife-cloud.XXXXXX")
trap 'rm -rf "$stage"' EXIT HUP INT TERM
"$task_python" -B - "$stage" "$mode" <<'PY'
import hashlib,json,shutil,sys
from pathlib import Path
root=Path.cwd().resolve(); stage=Path(sys.argv[1]); mode=sys.argv[2]
def copy(relative,checksum=None):
    path=Path(relative)
    if path.is_absolute() or '..' in path.parts:
        raise SystemExit('Unsafe deployment file reference')
    source=root/path
    if not source.is_file() or any((root/Path(*path.parts[:i])).is_symlink() for i in range(1,len(path.parts)+1)):
        raise SystemExit(f'Missing or linked deployment file: {relative}')
    raw=source.read_bytes()
    if checksum and hashlib.sha256(raw).hexdigest()!=checksum:
        raise SystemExit(f'Changed saved bytes: {relative}')
    target=stage/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
files=['.gcloudignore','.dockerignore','Dockerfile.cloud','cloudbuild.yaml','cloud_app.py',
       'app.py','build_demo.py','image_lab.py','detector.py','crop_pipeline.py','local_photos.py',
       'species_bridge.py','speciesnet_adapter.py','speciesnet_worker.py',
       'requirements.txt','speciesnet_requirements.txt','ui_template.html','offline_demo.html',
       'app_tabs.css','inference_walkthrough.css','lesson_content.html','lesson_styles.css',
       'lesson_interactions.js','lab_interactions.js','camera_trap_content.html',
       'camera_trap_styles.css','camera_trap_interactions.js','photo_training_content.html',
       'photo_training_styles.css','photo_training_math.js','photo_training_interactions.js',
       'LICENSE.txt','SPECIESNET_NOTES.md','assets/photos.json','assets/CAMERA_TRAP_SOURCES.md',
       'assets/camera_trap_equipment.json','assets/camera_trap_mounted.jpg','results/predictions.json']
for relative in files:copy(relative)
for source in json.loads((root/'assets/photos.json').read_text()):
    filename=Path(source['filename'])
    if filename.name!=str(filename):raise SystemExit('Unsafe source photo name')
    copy(Path('assets')/filename)
equipment=json.loads((root/'assets/camera_trap_equipment.json').read_text())
copy('assets/camera_trap_mounted.jpg',equipment['prepared_sha256'])
for path in (root/'assets/licenses').glob('*.txt'):copy(path.relative_to(root))
bundle=json.loads((root/'results/predictions.json').read_text())
for photo in bundle['photos']:
    for variant in photo['variants']:
        for item in (variant,*variant.get('species_crops',[])):
            path=Path(item['input_file'])
            if path.parts[0]!='results':raise SystemExit('Unsafe saved image path')
            copy(path,item['input_sha256'])
for path in (root/'models/upstream_notices').glob('*'):
    if path.is_file():copy(path.relative_to(root))
for name in ['README.md','LICENSE-Apache-2.0.txt']:
    copy(Path('models/speciesnet')/name)
if mode=='live':
    from detector import MODEL_SHA256
    from speciesnet_adapter import WEIGHTS,LABELS,TAXONOMY,FILE_HASHES
    copy('models/megadetector_v6.onnx',MODEL_SHA256)
    for name in (WEIGHTS,LABELS,TAXONOMY):copy(Path('models/speciesnet')/name,FILE_HASHES[name])
print(f'Prepared {sum(p.is_file() for p in stage.rglob("*"))} approved files; personal folders and credentials excluded.')
PY
if [ "${WILDLIFE_VALIDATE_ONLY:-0}" = 1 ]; then
  (cd "$stage" && gcloud meta list-files-for-upload > upload-manifest.txt)
  "$task_python" -B - "$stage" "$mode" <<'PY'
from pathlib import Path
import sys
stage=Path(sys.argv[1]);files=(stage/'upload-manifest.txt').read_text().splitlines()
assert files, 'The upload manifest is empty'
for name in files:
    parts=Path(name).parts
    assert not any(p in {'.venv','.git','user_photos','__pycache__'} for p in parts), name
    assert not any(p.startswith('.env') for p in parts), name
    assert not name.endswith('download_provenance.json'), name
if sys.argv[2]=='live':
    assert 'models/megadetector_v6.onnx' in files
    assert 'models/speciesnet/always_crop_99710272_22x8_v12_epoch_00148.pt' in files
else:
    assert not any(name.endswith(('.pt','.onnx')) for name in files)
print(f'Validated {len(files)} upload paths without changing any cloud resources.')
PY
  exit 0
fi
runtime="wildlife-runtime@$project.iam.gserviceaccount.com"
builder="wildlife-build@$project.iam.gserviceaccount.com"
if [ "$update_existing" = 1 ]; then
  # Refuse an accidental first deployment or an inference-mode change. The
  # update below replaces only the image and preserves the service's settings.
  gcloud run services describe "$service" --project "$project" --region "$region" \
    --format=json --quiet > "$stage/existing-service.json"
  "$task_python" -B - "$stage/existing-service.json" "$mode" <<'PYUPDATE'
import json,sys
service=json.load(open(sys.argv[1]))
containers=service['spec']['template']['spec']['containers']
if len(containers)!=1:
    raise SystemExit('Existing-service updates require one application container.')
env={item['name']:item.get('value') for item in containers[0].get('env',[])}
if env.get('WILDLIFE_MODE')!=sys.argv[2]:
    raise SystemExit('Existing-service updates must preserve WILDLIFE_MODE; choose the current mode.')
if not env.get('WILDLIFE_PUBLIC_HOST'):
    raise SystemExit('Existing-service updates require configured WILDLIFE_PUBLIC_HOST.')
print('Existing service verified; its access policy, environment and capacity settings will be preserved.')
PYUPDATE
else
retry_iam() {
  attempt=1
  delay=2
  until "$@"; do
    if [ "$attempt" -ge 8 ]; then return 1; fi
    echo "Waiting for the new service account or IAM binding to propagate…" >&2
    sleep "$delay"
    attempt=$((attempt + 1))
    delay=$((delay * 2))
    if [ "$delay" -gt 10 ]; then delay=10; fi
  done
}
for name in wildlife-runtime wildlife-build; do
  if ! gcloud iam service-accounts describe "$name@$project.iam.gserviceaccount.com" --project "$project" --format='value(email)' >/dev/null 2>&1; then
    gcloud iam service-accounts create "$name" --project "$project" --display-name "$name"
  fi
done
for role in roles/artifactregistry.writer roles/logging.logWriter roles/storage.objectViewer; do
  retry_iam gcloud projects add-iam-policy-binding "$project" --member "serviceAccount:$builder" --role "$role" --condition=None --quiet >/dev/null
done
if ! gcloud artifacts repositories describe wildlife-lab --project "$project" --location "$region" >/dev/null 2>&1; then
  gcloud artifacts repositories create wildlife-lab --project "$project" --location "$region" --repository-format docker --description "Wildlife Detective Lab container images"
fi
fi
tag=$(date -u +%Y%m%d-%H%M%S)
image="$region-docker.pkg.dev/$project/wildlife-lab/$service:$tag"
gcloud builds submit "$stage" --project "$project" --region "$region" --config "$stage/cloudbuild.yaml" \
  --service-account "projects/$project/serviceAccounts/$builder" \
  --default-buckets-behavior regional-user-owned-bucket \
  --substitutions "_IMAGE=$image,_MODE=$mode" --quiet
if [ "$update_existing" = 1 ]; then
  gcloud run services update "$service" --project "$project" --region "$region" \
    --image "$image" --quiet
  url=$(gcloud run services describe "$service" --project "$project" --region "$region" --format='value(status.url)')
  echo "Existing deployment updated: $url"
  echo "Container image: $image"
  echo "Verify the published page and both real models before announcing the update."
  exit 0
fi
memory=4Gi
cpu=2
if [ "$mode" = recorded ]; then memory=1Gi;cpu=1;fi
gcloud run deploy "$service" --project "$project" --region "$region" --image "$image" \
  --service-account "$runtime" --cpu "$cpu" --memory "$memory" --concurrency 4 \
  --min-instances 0 --max 2 --max-instances 2 --timeout 300 --cpu-throttling \
  --set-env-vars "WILDLIFE_MODE=$mode" --no-allow-unauthenticated --invoker-iam-check --quiet
url=$(gcloud run services describe "$service" --project "$project" --region "$region" --format='value(status.url)')
gcloud run services describe "$service" --project "$project" --region "$region" --format=json > "$stage/service.json"
"$task_python" -B - "$stage/service.json" "$stage/cloud.env.json" "$mode" <<'PYENV'
import json,sys
from urllib.parse import urlsplit
service=json.load(open(sys.argv[1]))
urls=json.loads(service['metadata']['annotations'].get('run.googleapis.com/urls','[]'))
urls.append(service['status']['url'])
hosts=sorted({urlsplit(url).hostname for url in urls if urlsplit(url).scheme=='https' and urlsplit(url).hostname and urlsplit(url).hostname.endswith('.run.app')})
if not hosts:raise SystemExit('No approved Cloud Run hostnames were returned')
with open(sys.argv[2],'w') as out:json.dump({'WILDLIFE_MODE':sys.argv[3],'WILDLIFE_PUBLIC_HOST':','.join(hosts)},out)
PYENV
gcloud run services update "$service" --project "$project" --region "$region" \
  --env-vars-file "$stage/cloud.env.json" --max 2 --quiet
echo "Private deployment ready: $url"
echo "Verify its authenticated health, teaching pages, saved images and both real models before publishing."
echo "Publish after verification: gcloud run services add-iam-policy-binding $service --project $project --region $region --member=allUsers --role=roles/run.invoker"
