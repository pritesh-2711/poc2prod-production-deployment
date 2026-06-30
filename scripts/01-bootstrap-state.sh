#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PATH="${REPO_ROOT}/.tools/bin:${PATH}"
export PATH
cd "${REPO_ROOT}"

AWS_REGION="${AWS_REGION:-ap-south-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
STATE_BUCKET="${STATE_BUCKET:-poc2prod-terraform-state-${AWS_ACCOUNT_ID}}"
LOCK_TABLE="${LOCK_TABLE:-poc2prod-terraform-locks}"

echo "Bootstrapping Terraform state in ${AWS_REGION}"
echo "State bucket: ${STATE_BUCKET}"
echo "Lock table: ${LOCK_TABLE}"

if ! aws s3api head-bucket --bucket "${STATE_BUCKET}" >/dev/null 2>&1; then
  aws s3api create-bucket \
    --bucket "${STATE_BUCKET}" \
    --region "${AWS_REGION}" \
    --create-bucket-configuration "LocationConstraint=${AWS_REGION}"
fi

aws s3api put-bucket-versioning \
  --bucket "${STATE_BUCKET}" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket "${STATE_BUCKET}" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws s3api put-public-access-block \
  --bucket "${STATE_BUCKET}" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

if ! aws dynamodb describe-table --table-name "${LOCK_TABLE}" --region "${AWS_REGION}" >/dev/null 2>&1; then
  aws dynamodb create-table \
    --table-name "${LOCK_TABLE}" \
    --region "${AWS_REGION}" \
    --billing-mode PAY_PER_REQUEST \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH
fi

BACKEND_CONFIG="terraform/environments/prod/backend.hcl"
cat > "${BACKEND_CONFIG}" <<EOF
bucket         = "${STATE_BUCKET}"
key            = "prod/terraform.tfstate"
region         = "${AWS_REGION}"
dynamodb_table = "${LOCK_TABLE}"
encrypt        = true
EOF

echo "Wrote ${BACKEND_CONFIG}"
