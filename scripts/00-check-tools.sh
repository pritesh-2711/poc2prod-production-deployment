#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PATH="${REPO_ROOT}/.tools/bin:${PATH}"
export PATH

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
