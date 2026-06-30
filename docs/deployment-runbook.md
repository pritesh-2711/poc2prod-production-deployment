# Deployment Runbook

## Phase 1: Repo Preparation

```bash
scripts/00-check-tools.sh
```

Confirm the repo root is `production/` and the remote is:

```text
https://github.com/pritesh-2711/poc2prod-production-deployment.git
```

## Phase 2: Names

Use the defaults in `README.md` unless you intentionally change the domain or AWS region.

## Phase 3: Terraform State

```bash
AWS_REGION=ap-south-1 scripts/01-bootstrap-state.sh
```

The script writes `terraform/environments/prod/backend.hcl` with your account-specific state backend settings.

## Phase 4: Foundation

```bash
terraform -chdir=terraform/environments/prod init
scripts/02-terraform-plan.sh
scripts/03-terraform-apply.sh
```

Validate:

```bash
aws ecr describe-repositories --repository-names poc2prod-prod-backend
aws s3 ls
aws ec2 describe-vpcs --filters Name=tag:Name,Values=poc2prod-prod-vpc
```

## Phase 5: Manual Backend Image

```bash
AWS_REGION=ap-south-1 IMAGE_TAG=manual-test scripts/05-build-push-backend.sh
```

Only continue after the image exists in ECR.

## Phases 6-10: Data, EKS, Controllers, Secrets

Apply the next Terraform layer when the module is ready, then install required controllers:

```bash
scripts/04-install-controllers.sh
kubectl create namespace poc2prod
```

Update the AWS Secrets Manager app secret before deploying the app.

## Phase 11: Backend First

```bash
IMAGE_TAG=manual-test scripts/06-deploy-backend.sh
kubectl get pods -n poc2prod
kubectl logs -n poc2prod deploy/poc2prod-api
kubectl get ingress -n poc2prod
```

Test the ALB endpoint:

```bash
APP_BASE_URL=http://<alb-dns> scripts/08-smoke-test.sh
```

## Phases 12-14: Scale, CronJobs, MCP

Enable features in `helm/poc2prod/values-prod.yaml` one at a time:

```yaml
api:
  autoscaling:
    enabled: true
  pdb:
    enabled: true

cronjobs:
  enabled: true

mcp:
  enabled: true
```

## Phase 15: Frontend

```bash
FRONTEND_BUCKET=s3://poc2prod-prod-frontend-<account-id> scripts/07-deploy-frontend.sh
```

## Phases 16-18: DNS, WAF, CI/CD

Point `poc2prod.pritesh-jha.in` to CloudFront, attach WAF, then enable GitHub Actions.

## Phase 19: Validation

Minimum checks:

```text
health endpoint
signup/login
document upload
chat request
S3 write/read
DB write/read
Redis access
CronJob manual run
pod restart
node drain simulation
HPA scale test
```
