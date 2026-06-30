#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PATH="${REPO_ROOT}/.tools/bin:${PATH}"
export PATH
cd "${REPO_ROOT}"

AWS_REGION="${AWS_REGION:-ap-south-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
IMAGE_TAG="${IMAGE_TAG:-manual-test}"
ECR_REPOSITORY="${ECR_REPOSITORY:-poc2prod-prod-backend}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

docker build -t "${ECR_REPOSITORY}:${IMAGE_TAG}" backend
docker tag "${ECR_REPOSITORY}:${IMAGE_TAG}" "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
docker push "${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"

echo "Pushed ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"
