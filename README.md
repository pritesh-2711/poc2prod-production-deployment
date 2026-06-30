# Poc2Prod Production Deployment

This repository is the single source of truth for the production deployment of the Poc2Prod book companion app.

Deployment root: `production/`

## Phase Map

1. Prepare this production deployment repo.
2. Fix production names and region.
3. Bootstrap Terraform state.
4. Apply foundation infrastructure: VPC, ECR, S3, Secrets Manager placeholders, IAM policy.
5. Build and push the backend image manually once.
6. Add data layer: Aurora PostgreSQL, RDS Proxy, ElastiCache.
7. Initialize database schema and `pgvector`.
8. Add EKS.
9. Install EKS controllers.
10. Create namespace and External Secrets bridge.
11. Deploy backend API with Helm.
12. Add HPA and PDB.
13. Add CronJobs.
14. Add MCP internal service.
15. Deploy frontend to S3 and CloudFront.
16. Configure DNS and TLS.
17. Attach WAF.
18. Add CI/CD.
19. Run smoke, load, and failure tests.
20. Use teardown scripts before and after experiments to control cost.

## Default Production Names

| Setting | Value |
| --- | --- |
| Project | `poc2prod` |
| Environment | `prod` |
| Region | `ap-south-1` |
| Domain | `poc2prod.pritesh-jha.in` |
| Namespace | `poc2prod` |
| Backend ECR | `poc2prod-prod-backend` |
| Terraform state bucket | `poc2prod-terraform-state-<account-id>` |
| Terraform lock table | `poc2prod-terraform-locks` |
| Frontend bucket | `poc2prod-prod-frontend-<account-id>` |
| Documents bucket | `poc2prod-prod-documents-<account-id>` |

## Start Here

```bash
scripts/00-check-tools.sh
AWS_REGION=ap-south-1 scripts/01-bootstrap-state.sh
scripts/02-terraform-plan.sh
```

`scripts/01-bootstrap-state.sh` writes `terraform/environments/prod/backend.hcl`, which is intentionally ignored by git because it contains account-specific backend settings.

Do not deploy AWS resources until `scripts/99-destroy.sh` exists and you understand the teardown flow.
