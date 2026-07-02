# CI/CD Runbook

CI/CD uses GitHub Actions with AWS OIDC. No long-lived AWS access keys are required.

## Required GitHub Secret

```text
AWS_GITHUB_ACTIONS_ROLE_ARN
```

The role must allow:

```text
ECR push/pull for poc2prod-prod-backend, poc2prod-prod-frontend, poc2prod-prod-mcp
EKS describe cluster
Kubernetes access to update deployments in namespace poc2prod
```

## Workflows

```text
backend-image.yml   builds and pushes backend image
frontend-image.yml  builds and pushes frontend image
mcp-image.yml       builds and pushes MCP image
deploy-images.yml   deploys selected image tags with kubectl set image
```

Each image build pushes two tags:

```text
<commit-sha>
latest
```

Prefer deploying commit SHA tags for traceability.

## First Safe Rollout

Run each image workflow manually with `deploy=false`.

Then deploy by tag through `Deploy Images`:

```text
backend_tag=<commit-sha or empty>
frontend_tag=<commit-sha or empty>
mcp_tag=<commit-sha or empty>
```

The deploy workflow updates only the components whose tag input is not empty, waits for rollout, and then checks:

```text
https://api.poc2prod.pritesh-jha.in/health
```

## Current Caveat

The Helm workflow is disabled because the live cluster has an External Secrets CRD compatibility mismatch with the current chart. Use `deploy-images.yml` until the Helm chart is made fully compatible with the installed CRDs.
