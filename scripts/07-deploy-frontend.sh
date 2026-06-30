#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PATH="${REPO_ROOT}/.tools/bin:${PATH}"
export PATH
cd "${REPO_ROOT}"

FRONTEND_BUCKET="${FRONTEND_BUCKET:?Set FRONTEND_BUCKET to s3://bucket-name}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-}"
export VITE_API_BASE_URL

npm --prefix frontend ci
npm --prefix frontend run build

aws s3 sync frontend/dist/ "${FRONTEND_BUCKET}" --delete --region "${AWS_REGION}"

if [ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]; then
  aws cloudfront create-invalidation \
    --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
    --paths "/*"
fi
