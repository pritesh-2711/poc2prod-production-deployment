#!/usr/bin/env bash
set -euo pipefail

if [ ! -f terraform/environments/prod/tfplan ]; then
  scripts/02-terraform-plan.sh
fi

terraform -chdir=terraform/environments/prod apply tfplan

