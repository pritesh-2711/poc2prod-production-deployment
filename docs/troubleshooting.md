# Troubleshooting

## Terraform

If state bootstrap fails, verify caller identity and region:

```bash
aws sts get-caller-identity
aws configure get region
```

If `terraform init` cannot read state, check that `backend.tf` has the real account ID in the bucket name.

## ECR Push

If Docker login fails, confirm the account ID and region:

```bash
aws sts get-caller-identity
aws ecr describe-repositories --repository-names poc2prod-prod-backend
```

## Backend Pod CrashLoop

Start with:

```bash
kubectl logs -n poc2prod deploy/poc2prod-api
kubectl describe pod -n poc2prod -l app.kubernetes.io/component=api
kubectl get secret -n poc2prod poc2prod-app
```

Common causes:

```text
AWS Secrets Manager values still contain placeholders
DB proxy endpoint is wrong
Redis URL is wrong
MCP URL is unreachable
OPENAI_API_KEY is missing
```

## Ingress Has No Address

Check the controller:

```bash
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
kubectl describe ingress -n poc2prod poc2prod-api
```

## Frontend Cannot Reach API

Confirm CloudFront behavior routes `/api/*` and `/health` to the ALB origin. The frontend should use same-origin `/api` in production.

