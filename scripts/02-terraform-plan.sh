#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PATH="${REPO_ROOT}/.tools/bin:${PATH}"
export PATH
cd "${REPO_ROOT}"

if [ -f terraform/environments/prod/backend.hcl ]; then
  terraform -chdir=terraform/environments/prod init -backend-config=backend.hcl
else
  terraform -chdir=terraform/environments/prod init
fi
terraform -chdir=terraform/environments/prod plan -out=tfplan
