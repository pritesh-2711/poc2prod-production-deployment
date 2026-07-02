# Teardown Runbook

Use this runbook when production must be cleaned up after validation, long idle periods, or a controlled shutdown. Teardown is intentionally conservative: protect data first, remove Kubernetes-facing resources next, then destroy Terraform-managed infrastructure.

## Scope

This runbook covers the `prod` environment in `ap-south-1`:

```text
namespace: poc2prod
helm release: poc2prod
terraform env: terraform/environments/prod
cluster: poc2prod-prod-eks
public domains: poc2prod.pritesh-jha.in, api.poc2prod.pritesh-jha.in
```

## Do Not Start Until

Confirm these decisions before running destructive commands:

```text
- Is production traffic intentionally stopped?
- Are DB contents and uploaded documents safe to delete?
- Are ECR images still needed for rollback or audit?
- Should Route53 records, ACM certificates, and Terraform state be retained?
- Has the latest Terraform state been pulled and backed up?
```

## Pre-Teardown Snapshot

Capture the current state for audit and recovery:

```bash
aws sts get-caller-identity
kubectl get all,ingress,hpa,pdb -n poc2prod
kubectl get pods -n monitoring
kubectl get pods -n amazon-cloudwatch
./.tools/bin/terraform -chdir=terraform/environments/prod output
```

Save important outputs before deleting anything:

```text
- documents_bucket_name
- frontend_bucket_name
- db_secret_name
- db_secret_arn
- eks_cluster_name
- waf_web_acl_arn
- observability_alarm_topic_arn
```

## Data Backup

Take a final Aurora snapshot if the database may be needed later:

```bash
CLUSTER_ID="poc2prod-prod-aurora"
SNAPSHOT_ID="poc2prod-prod-final-$(date +%Y%m%d%H%M%S)"

aws rds create-db-cluster-snapshot \
  --db-cluster-identifier "$CLUSTER_ID" \
  --db-cluster-snapshot-identifier "$SNAPSHOT_ID" \
  --region ap-south-1

aws rds wait db-cluster-snapshot-available \
  --db-cluster-snapshot-identifier "$SNAPSHOT_ID" \
  --region ap-south-1
```

Back up uploaded documents if they must survive teardown:

```bash
DOCUMENTS_BUCKET="$(./.tools/bin/terraform -chdir=terraform/environments/prod output -raw documents_bucket_name)"
aws s3 sync "s3://${DOCUMENTS_BUCKET}/" "./backups/${DOCUMENTS_BUCKET}/" --region ap-south-1
```

Back up production secrets metadata. Do not commit the output:

```bash
APP_SECRET_NAME="$(./.tools/bin/terraform -chdir=terraform/environments/prod output -raw app_secret_name)"
DB_SECRET_NAME="$(./.tools/bin/terraform -chdir=terraform/environments/prod output -raw db_secret_name)"

aws secretsmanager describe-secret --secret-id "$APP_SECRET_NAME" --region ap-south-1
aws secretsmanager describe-secret --secret-id "$DB_SECRET_NAME" --region ap-south-1
```

## App-Only Teardown

Use this when you want to stop the app and remove public endpoints while keeping the AWS foundation alive:

```bash
helm uninstall poc2prod -n poc2prod
kubectl delete namespace poc2prod --ignore-not-found=true
```

Wait for Ingress-managed ALBs to disappear before assuming cost has stopped:

```bash
aws elbv2 describe-load-balancers --region ap-south-1 \
  --query 'LoadBalancers[?contains(LoadBalancerName, `poc2prod`)].{Name:LoadBalancerName,DNS:DNSName,State:State.Code}'
```

If observability should also be removed:

```bash
helm uninstall kube-prometheus-stack -n monitoring
kubectl delete namespace monitoring --ignore-not-found=true
kubectl delete namespace amazon-cloudwatch --ignore-not-found=true
```

## Full Infrastructure Teardown

Use the guarded destroy script:

```bash
CONFIRM_DESTROY=destroy scripts/99-destroy.sh
```

The script removes the Helm release and namespace, waits for ALB deletion to start, then runs Terraform destroy.

If Terraform destroy fails because Kubernetes-created AWS resources still exist, wait a few minutes and rerun:

```bash
CONFIRM_DESTROY=destroy scripts/99-destroy.sh
```

## Manual Cleanup Checks

After destroy, verify that no expensive resources remain:

```bash
aws eks list-clusters --region ap-south-1
aws rds describe-db-clusters --region ap-south-1 \
  --query 'DBClusters[?contains(DBClusterIdentifier, `poc2prod`)].DBClusterIdentifier'
aws elasticache describe-cache-clusters --region ap-south-1 \
  --query 'CacheClusters[?contains(CacheClusterId, `poc2prod`)].CacheClusterId'
aws elbv2 describe-load-balancers --region ap-south-1 \
  --query 'LoadBalancers[?contains(LoadBalancerName, `poc2prod`)].LoadBalancerName'
aws ec2 describe-nat-gateways --region ap-south-1 \
  --filter Name=tag:Name,Values='*poc2prod*' \
  --query 'NatGateways[].NatGatewayId'
aws ec2 describe-addresses --region ap-south-1 \
  --query 'Addresses[?AssociationId==null].[PublicIp,AllocationId]'
```

Check logs, alarms, WAF, and ECR:

```bash
aws logs describe-log-groups --region ap-south-1 \
  --log-group-name-prefix /aws/eks/fluentbit-cloudwatch
aws cloudwatch describe-alarms --region ap-south-1 \
  --query 'MetricAlarms[?contains(AlarmName, `poc2prod`)].AlarmName'
aws wafv2 list-web-acls --scope REGIONAL --region ap-south-1 \
  --query 'WebACLs[?contains(Name, `poc2prod`)].Name'
aws ecr describe-repositories --region ap-south-1 \
  --query 'repositories[?contains(repositoryName, `poc2prod`)].repositoryName'
```

Check S3 buckets:

```bash
aws s3api list-buckets \
  --query 'Buckets[?contains(Name, `poc2prod`)].Name'
```

## Resources To Retain By Default

Do not delete these unless the environment is permanently retired:

```text
- Terraform state bucket and lock table
- Final Aurora snapshots
- Route53 hosted zone
- ACM certificates
- GitHub Actions OIDC role history/audit records
- ECR images needed for rollback evidence
- Local backups under ./backups/
```

The Terraform state bucket should be deleted only after every managed resource has been destroyed and no future audit or recovery is needed.

## Recovery Notes

To recover from a full teardown:

```bash
AWS_REGION=ap-south-1 scripts/01-bootstrap-state.sh
./.tools/bin/terraform -chdir=terraform/environments/prod init
scripts/02-terraform-plan.sh
scripts/03-terraform-apply.sh
scripts/04-install-controllers.sh
scripts/11-install-observability.sh
```

Then redeploy application images through GitHub Actions or manually set images:

```bash
kubectl rollout status deploy/poc2prod-backend -n poc2prod
kubectl rollout status deploy/poc2prod-frontend -n poc2prod
kubectl rollout status deploy/poc2prod-mcp -n poc2prod
curl -sS https://api.poc2prod.pritesh-jha.in/health
```

If restoring data, restore Aurora from the retained snapshot and sync the backed-up documents into the restored documents bucket before reopening the app to users.
