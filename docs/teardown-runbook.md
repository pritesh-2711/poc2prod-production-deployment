# Teardown Runbook

Run teardown before long idle periods or after experiments.

## Fast App Teardown

```bash
helm uninstall poc2prod -n poc2prod
kubectl delete namespace poc2prod
```

Wait until any ALB created by Ingress is deleted.

## Full Infrastructure Teardown

```bash
CONFIRM_DESTROY=destroy scripts/99-destroy.sh
```

The script destroys Terraform-managed resources. It also provides a checklist for resources that can survive a failed destroy.

## Cost Leak Checklist

Confirm these are gone:

```text
NAT Gateway
EKS control plane
Aurora cluster and snapshots
RDS Proxy
ElastiCache cluster
ALB
CloudFront distribution
Elastic IPs
EBS volumes
CloudWatch logs
ECR images
S3 objects
```

Do not delete the Terraform state bucket until every managed resource is gone.

