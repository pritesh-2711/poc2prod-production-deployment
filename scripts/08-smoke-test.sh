#!/usr/bin/env bash
set -euo pipefail

APP_BASE_URL="${APP_BASE_URL:?Set APP_BASE_URL, for example https://poc2prod.pritesh-jha.in}"

curl --fail --silent --show-error --include "${APP_BASE_URL}/health"
echo
echo "Health check passed."

