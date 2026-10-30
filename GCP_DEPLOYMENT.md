# Share Wildlife Detective Lab using Google Cloud Run

The cloud edition serves the same three lessons and genuine saved examples.
In `live` mode, MegaDetector and SpeciesNet also analyze new uploads on the
Cloud Run server. Uploaded image bodies and crops are held in process memory;
the application does not save them to disk, a bucket, or a shared photo list.
Google Cloud may keep ordinary request/access logs, which do not include image
bodies. Students should upload only photographs they have permission to share.
The local app and its private `user_photos/` folder keep their original behavior.

## Deployed student edition — October 30, 2026

- [Student website](https://wildlife-detective-lab-882550979615.us-central1.run.app/)
- Project: `wildlife-lab-wc246`; region: `us-central1`.
- Service: `wildlife-detective-lab`; verified revision: `wildlife-detective-lab-00006-cx5`.
- Image digest: `sha256:6003513bb6c6badbf9e051f9defe7a9ca438f76a9e3936592c9968c930bbe071`.
- Build: `7218493f-36ab-41b6-8bf0-152d688a48aa`.

The October 30 update expands the conservation introduction, adds two more
existing camera-trap photos to its gallery, clarifies pixel preparation during
training and inference, and replaces the color-feature trainer with a genuine
5,083-parameter CNN. Its 12 training and nine validation photos, activations,
gradients, history, and weight updates are processed in the student's browser.
This training exercise creates no server-side training job and leaves the two
pretrained wildlife models unchanged.

Public invocation is enabled for students without Google accounts. Both the
project-number URL above and the legacy default address
`https://wildlife-detective-lab-m6q76obygq-uc.a.run.app` are explicitly allowed.
The service and revision both cap scaling at two instances; minimum instances
remain zero. The runtime account has no project roles.

The initial private real-photo check produced an animal detection score of 0.962498
and a genuine SpeciesNet top suggestion of white-tailed deer, score 0.997096.
Detector request time was 1.92 seconds; the first classifier request took
77.73 seconds while its process/model loaded. Allow roughly one to two minutes
for a first live classification after an idle period. Before a class, open the
site and run a permitted example through both models. Saved examples and the
browser training lesson do not require new inference.

Public browser checks verified uploads, both models, cloud privacy wording,
hidden local-folder controls, training updates, the inference walkthrough,
question investigations, and the phone layout. The complete 64,318,630-byte
standalone download was streamed successfully. Only a bundled public wildlife
photo was used for cloud upload testing; personal photos were not deployed.

## Build and deploy privately

Use a dedicated project with billing enabled. Enable `run.googleapis.com`,
`cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, and
`iam.googleapis.com`. The signed-in deploying account needs permissions to
build images, manage these services and service accounts, and set their IAM
policies. No Google credentials are copied into the container.

```sh
./deploy_gcp.sh YOUR_PROJECT_ID us-central1 wildlife-detective-lab live
```

This script reuses the local verified model files, builds a Linux CPU image in
Cloud Build, and deploys privately. It neither reinstalls the local Python
environment nor downloads models. Package installation happens only inside
the remote container build. Its temporary source tree is an explicit allowlist:
runtime code, licensed example images, hash-verified saved inputs/crops, model
notices, and the pinned detector/classifier assets. It excludes `.venv`, `.git`,
credentials, machine download provenance, and every personal photo.

The runtime service account `wildlife-runtime` has no project roles. The
separate `wildlife-build` service account has Artifact Registry writer, Cloud
Logging writer, and source-staging Storage object viewer roles within this
dedicated project. Cloud Run uses its own managed service agent to pull images.
Neither account receives a service-account key.

The first private revision keeps application data routes closed until hostname
configuration. The script reads Cloud Run's recognized default service URLs
and configures their exact hostnames before the app pages and APIs can be served.
JSON POSTs must come from one of those HTTPS origins. Private folder APIs and local photo
IDs are unavailable. Public access is enabled separately after verification.

## Verify, then share

With an authenticated token, test `/api/status`, the three tabs,
training steps, a saved image, and a new photo through both real models. Check
that cloud privacy wording is shown and local folder controls are hidden.
An API status of `available=true` and `species_available=true` checks files and
packages; actual prediction requests are required to verify loaded models.
The deployed service uses a TCP startup probe. In this deployment, external
`/healthz` requests returned an upstream Google 404; `/api/status` is the
verified application readiness endpoint.

After those checks, publish the service for student browser access:

```sh
gcloud run services add-iam-policy-binding wildlife-detective-lab \
  --project YOUR_PROJECT_ID --region us-central1 \
  --member allUsers --role roles/run.invoker
```

Share the resulting HTTPS service URL. Students need no Google account when
public invocation is enabled. Cloud Run's HTTPS endpoint terminates TLS; the
container listens on `0.0.0.0:$PORT` as required by its runtime contract.
The larger standalone export downloads through a chunked streaming response,
so it is not subject to Cloud Run's 32 MiB non-streaming HTTP/1 response limit.

## Capacity, cost controls, and rollback

The initial live configuration uses two CPUs, 4 GiB RAM, concurrency four,
zero minimum instances, a maximum of two instances, and a 300-second request
timeout. At most two inference requests per instance enter the model path;
additional simultaneous inference requests receive a retry message. Each
model retains its existing lock. These conservative settings need observation
with the intended class size; they are not a performance guarantee or a hard
billing cap. A $20 monthly alerts-only budget, named **Wildlife Detective Lab
monthly alerts**, now covers all services in `wildlife-lab-wc246`. It emails the
billing account's administrators and users at $10, $16, and $20 of actual spend,
and when the monthly forecast exceeds $20. This account currently has one billing
administrator. The budget includes all credits and applies only to this project.
It does not stop services or cap charges; billing data and alerts can be delayed.
Request-based CPU allocation and zero minimum instances let the service scale
down between visits, while image storage/builds/network traffic can still cost
money. The first real model request after a cold start can take longer.

Prices checked October 29, 2026: the current 2-vCPU/4-GiB service costs about
$0.209 per active instance-hour before free allowances. Ten aggregate active
instance-hours cost about $2.09, and 100 cost about $20.88, plus network delivery,
requests, storage, and builds. Two active instances for one hour count as two
instance-hours. If unused by other projects on the same billing account, the
Cloud Run monthly CPU and memory free allowances cover about 25 instance-hours
at this size. Startup CPU boost can add billable CPU beyond this simple estimate.

For occasional classroom use, plan roughly $1–$5/month assuming fewer than 20
active instance-hours and roughly 10 GiB or less delivered to students in North
America. This is a planning estimate, not a spending guarantee. Internet delivery
currently costs $0.12/GiB after the first 1 GiB free allowance. Current image
storage is about $0.04–$0.09/month; the source archive is under $0.01/month before
free allowances. New images and repeated builds can add to those costs.

Use `recorded` instead of `live` for lessons and genuine saved experiments
without new server-side inference. That profile omits model weights and CPU
ML packages and uses one CPU/1 GiB. Browser training remains available.

Record the deployed revision and image digest in the release notes. If health,
saved-result integrity, or a core student flow fails, route traffic back to
the previous verified revision; for a first deployment, remove public invocation
until repaired. Inspect Cloud Run logs and metrics during the first class.

Official references: [container runtime contract](https://docs.cloud.google.com/run/docs/container-contract),
[Cloud Build service account](https://docs.cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts),
[public access](https://docs.cloud.google.com/run/docs/authenticating/public),
[Cloud Run pricing](https://cloud.google.com/run/pricing),
[Artifact Registry pricing](https://cloud.google.com/artifact-registry/pricing),
[Cloud Storage pricing](https://cloud.google.com/storage/pricing),
[network pricing](https://cloud.google.com/vpc/network-pricing),
[budget alerts](https://docs.cloud.google.com/billing/docs/how-to/budgets).
