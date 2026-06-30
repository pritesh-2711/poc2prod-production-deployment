#!/usr/bin/env bash
set -euo pipefail

if [ "${CONFIRM_DESTROY:-}" != "destroy" ]; then
  echo "Refusing to destroy. Re-run with CONFIRM_DESTROY=destroy." >&2
  exit 1
fi

NAMESPACE="${NAMESPACE:-poc2prod}"
RELEASE_NAME="${RELEASE_NAME:-poc2prod}"

helm uninstall "${RELEASE_NAME}" -n "${NAMESPACE}" >/dev/null 2>&1 || true
kubectl delete namespace "${NAMESPACE}" --ignore-not-found=true

echo "Waiting 90 seconds for Ingress-managed AWS load balancers to start deleting..."
sleep 90

terraform -chdir=terraform/environments/prod destroy

cat <<'CHECKLIST'

Manual verification checklist:
- no NAT Gateways
- no EKS clusters
- no Aurora clusters or unwanted snapshots
- no RDS Proxies
- no ElastiCache clusters
- no ALBs
- no unattached Elastic IPs
- no orphaned EBS volumes
- no unwanted CloudWatch log groups
- no stale CloudFront distributions
- no costly S3 objects left behind
CHECKLIST

