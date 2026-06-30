#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PATH="${REPO_ROOT}/.tools/bin:${PATH}"
export PATH
cd "${REPO_ROOT}"

NAMESPACE="${NAMESPACE:-poc2prod}"
RELEASE_NAME="${RELEASE_NAME:-poc2prod}"
IMAGE_TAG="${IMAGE_TAG:-manual-test}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
IMAGE_REPOSITORY="${IMAGE_REPOSITORY:-${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/poc2prod-prod-backend}"

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install "${RELEASE_NAME}" helm/poc2prod \
  -n "${NAMESPACE}" \
  -f helm/poc2prod/values-prod.yaml \
  --set api.image.repository="${IMAGE_REPOSITORY}" \
  --set api.image.tag="${IMAGE_TAG}"

kubectl rollout status "deploy/${RELEASE_NAME}-api" -n "${NAMESPACE}"
