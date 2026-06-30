#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TOOLS_DIR="${REPO_ROOT}/.tools"
BIN_DIR="${TOOLS_DIR}/bin"
DOWNLOAD_DIR="${TOOLS_DIR}/downloads"

TERRAFORM_VERSION="${TERRAFORM_VERSION:-1.15.7}"
HELM_VERSION="${HELM_VERSION:-v4.2.2}"

mkdir -p "${BIN_DIR}" "${DOWNLOAD_DIR}"

arch="$(uname -m)"
case "${arch}" in
  x86_64 | amd64)
    terraform_arch="amd64"
    helm_arch="amd64"
    ;;
  aarch64 | arm64)
    terraform_arch="arm64"
    helm_arch="arm64"
    ;;
  *)
    echo "Unsupported architecture: ${arch}" >&2
    exit 1
    ;;
esac

terraform_zip="terraform_${TERRAFORM_VERSION}_linux_${terraform_arch}.zip"
terraform_url="https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/${terraform_zip}"
terraform_sha_url="https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_SHA256SUMS"

echo "Installing Terraform ${TERRAFORM_VERSION} locally..."
curl -fsSL "${terraform_url}" -o "${DOWNLOAD_DIR}/${terraform_zip}"
curl -fsSL "${terraform_sha_url}" -o "${DOWNLOAD_DIR}/terraform_${TERRAFORM_VERSION}_SHA256SUMS"
grep " ${terraform_zip}$" "${DOWNLOAD_DIR}/terraform_${TERRAFORM_VERSION}_SHA256SUMS" > "${DOWNLOAD_DIR}/${terraform_zip}.sha256"
(cd "${DOWNLOAD_DIR}" && sha256sum -c "${terraform_zip}.sha256")
unzip -o "${DOWNLOAD_DIR}/${terraform_zip}" -d "${BIN_DIR}" >/dev/null

helm_tgz="helm-${HELM_VERSION}-linux-${helm_arch}.tar.gz"
helm_url="https://get.helm.sh/${helm_tgz}"
helm_sha_url="https://get.helm.sh/${helm_tgz}.sha256sum"

echo "Installing Helm ${HELM_VERSION} locally..."
curl -fsSL "${helm_url}" -o "${DOWNLOAD_DIR}/${helm_tgz}"
curl -fsSL "${helm_sha_url}" -o "${DOWNLOAD_DIR}/${helm_tgz}.sha256sum"
(cd "${DOWNLOAD_DIR}" && sha256sum -c "${helm_tgz}.sha256sum")
tar -xzf "${DOWNLOAD_DIR}/${helm_tgz}" -C "${DOWNLOAD_DIR}"
cp "${DOWNLOAD_DIR}/linux-${helm_arch}/helm" "${BIN_DIR}/helm"
chmod +x "${BIN_DIR}/terraform" "${BIN_DIR}/helm"

echo "Installed:"
"${BIN_DIR}/terraform" version
"${BIN_DIR}/helm" version

cat <<EOF

For this shell, run:
  export PATH="${BIN_DIR}:\$PATH"

The deployment scripts also add this path automatically.
EOF

