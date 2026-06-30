#!/usr/bin/env bash
set -euo pipefail

required_tools=(
  aws
  docker
  helm
  kubectl
  npm
  terraform
)

missing=0
for tool in "${required_tools[@]}"; do
  if ! command -v "${tool}" >/dev/null 2>&1; then
    echo "missing: ${tool}" >&2
    missing=1
  else
    echo "ok: ${tool}"
  fi
done

if [ "${missing}" -ne 0 ]; then
  echo "Install missing tools before continuing." >&2
  exit 1
fi

aws sts get-caller-identity >/dev/null
echo "AWS credentials are available."

