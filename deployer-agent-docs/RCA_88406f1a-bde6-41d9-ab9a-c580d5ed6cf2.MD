# RCA — Redeploy blocked (deployment_blocked / phishing classification)

## Deployment
- Deployment: `glow-celesta` (`1ae6723c-927e-497c-9cc6-bc6a82ef1fb2`)
- Live URL (unchanged, still serving): https://glow-celesta.emergent.host
- Template: fastapi_react_mongo_shadcn_base_image (arm64), tier_0, frontend_type=cloudflare

## What happened
The redeploy trigger (`trigger_indie`) returned **HTTP 409** before any build/deploy step ran:

```
deployer indie returned status 409:
{"code":"deployment_blocked",
 "error":"This deployment was blocked. If you believe this is a mistake, please contact support."}
(type: deployer_indie_4xx, retryable: false)
```

The committed run `88406f1a-bde6-41d9-ab9a-c580d5ed6cf2` (type=redeploy) failed at the
`await_phishing` step with:

```
await_phishing: ... AwaitPhishingClassification ...
deployment blocked: there has been an error with this deployment.
Please fork the session and start a new deployment
```

## Root cause
This is a **platform-side policy / phishing-classification block**, not a code, dependency,
manifest, or infra failure. The deploy pipeline never reached pull_source/build/deploy — the
trigger itself was rejected at the gate. The error is explicitly flagged `retryable: false`.

## Why I did not re-run the pipeline
`resume_pipeline` fires a fresh run in the SAME session, which will be re-evaluated by the same
blocked gate and return the identical 409. Nothing in the source or deployment manifests can
clear this block, so a retry is futile and was intentionally not attempted.

## Current state
- No rollback happened. The previous successful run `1bc770c1-...` is still live and serving at
  the URL above. The app is NOT down.

## Resolution (requires user action — cannot be fixed by agent or source)
1. The block message instructs: **fork the session and start a new deployment**, OR
2. If the user believes the block is a mistake, **contact Emergent support**, quoting
   deployment `glow-celesta` / `1ae6723c-927e-497c-9cc6-bc6a82ef1fb2` and
   run `88406f1a-bde6-41d9-ab9a-c580d5ed6cf2`.
