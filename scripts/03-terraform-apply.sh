#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PATH="${REPO_ROOT}/.tools/bin:${PATH}"
export PATH
cd "${REPO_ROOT}"

if [ ! -f terraform/environments/prod/tfplan ]; then
  scripts/02-terraform-plan.sh
fi

terraform -chdir=terraform/environments/prod apply tfplan
