#!/usr/bin/env bash
set -euo pipefail

if [ -f terraform/environments/prod/backend.hcl ]; then
  terraform -chdir=terraform/environments/prod init -backend-config=backend.hcl
else
  terraform -chdir=terraform/environments/prod init
fi
terraform -chdir=terraform/environments/prod plan -out=tfplan
