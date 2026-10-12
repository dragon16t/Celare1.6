# RCA — Deployment blocked (deployment_blocked / 409)

## Deployment
- Name: glow-celesta
- Deployment ID: 1ae6723c-927e-497c-9cc6-bc6a82ef1fb2
- Template: fastapi_react_mongo_shadcn_base_image (farm / arm64), frontend_type: cloudflare
- Current state: **deployment_status = deleted**, **suspension_reason = user_shutdown**

## Symptom
The automated pipeline's `trigger_indie` step failed (non-retryable):
```
status 409 {"code":"deployment_blocked","error":"This deployment was blocked. If you believe this is a mistake, please contact support."}
(type: deployer_indie_4xx, retryable: false)
```

## Root cause
This deployment is in a **blocked + shut-down** state, so the indie deploy trigger is rejected at the gate before any build/deploy work can run. Two independent pieces of evidence confirm this is a platform-side block, not a code/manifest/build fault:

1. `describe_deployment_state` reports `deployment_status: "deleted"` with `suspension_reason: "user_shutdown"`.
2. An earlier redeploy run `88406f1a-bde6-41d9-ab9a-c580d5ed6cf2` (trigger: agentic) failed at the phishing-classification gate:
   > `await_phishing ... deployment blocked: there has been an error with this deployment. Please fork the session and start a new deployment`

The current 409 `deployment_blocked` is the same gate rejecting the new trigger.

## Why this is not fixable from the deployer agent
- No tool in the deployer surface can unblock, un-delete, or un-suspend a deployment.
- The failure is `retryable: false` and originates before build/deploy steps — a manifest edit or `resume_pipeline` retry will hit the identical 409.
- This is NOT a source-code failure (no build/health_check reached), so there is no file-level fix to apply.

## Remediation (requires parties the agent cannot act for)
- **Platform/Support:** The block must be reviewed and lifted by Emergent. The user should contact support quoting deployment `glow-celesta` / deployment ID `1ae6723c-927e-497c-9cc6-bc6a82ef1fb2` and job ID `c1b6cf4f-bbbe-4eb7-ad84-b66c6b40d0be`.
- **User:** Per the platform's own message on the earlier blocked run, fork the session and start a new deployment. The existing deployment is shut down (user_shutdown) and blocked; it cannot be redeployed in place.

## What was NOT the cause
- No build failure (build never ran for this trigger).
- No health-check / pod crash (deploy never reached Kubernetes).
- No manifest or secret issue.
