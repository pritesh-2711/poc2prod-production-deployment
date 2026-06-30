#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PATH="${REPO_ROOT}/.tools/bin:${PATH}"
export PATH

APP_BASE_URL="${APP_BASE_URL:?Set APP_BASE_URL, for example https://poc2prod.pritesh-jha.in}"

curl --fail --silent --show-error --include "${APP_BASE_URL}/health"
echo
echo "Health check passed."
