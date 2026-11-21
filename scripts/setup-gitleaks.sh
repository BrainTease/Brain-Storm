#!/usr/bin/env bash
# Install gitleaks for local secret scanning.
# Called once per developer machine. The pre-commit hook uses gitleaks
# to scan staged diffs before each commit.
#
# Installs the latest stable release from GitHub Releases.
# Supported OS: Linux (amd64/arm64), macOS (amd64/arm64).
#
# Usage: ./scripts/setup-gitleaks.sh

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

GITLEAKS_VERSION="8.21.2"

if command -v gitleaks &>/dev/null; then
  INSTALLED=$(gitleaks version 2>/dev/null || echo "unknown")
  echo -e "${GREEN}gitleaks is already installed: ${INSTALLED}${NC}"
  exit 0
fi

OS="$(uname -s)"
ARCH="$(uname -m)"

case "${OS}" in
  Linux)
    case "${ARCH}" in
      x86_64)  ASSET="gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" ;;
      aarch64) ASSET="gitleaks_${GITLEAKS_VERSION}_linux_arm64.tar.gz" ;;
      *)        echo "Unsupported architecture: ${ARCH}"; exit 1 ;;
    esac
    ;;
  Darwin)
    case "${ARCH}" in
      x86_64)  ASSET="gitleaks_${GITLEAKS_VERSION}_darwin_x64.tar.gz" ;;
      arm64)   ASSET="gitleaks_${GITLEAKS_VERSION}_darwin_arm64.tar.gz" ;;
      *)        echo "Unsupported architecture: ${ARCH}"; exit 1 ;;
    esac
    ;;
  *)
    echo "Unsupported OS: ${OS}"
    echo "On Windows, download from: https://github.com/gitleaks/gitleaks/releases"
    exit 1
    ;;
esac

URL="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${ASSET}"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "${TMPDIR}"' EXIT

echo -e "${BLUE}Downloading gitleaks v${GITLEAKS_VERSION}...${NC}"
curl -sSL "${URL}" -o "${TMPDIR}/gitleaks.tar.gz"
tar -xzf "${TMPDIR}/gitleaks.tar.gz" -C "${TMPDIR}"

INSTALL_DIR="${HOME}/.local/bin"
mkdir -p "${INSTALL_DIR}"
mv "${TMPDIR}/gitleaks" "${INSTALL_DIR}/gitleaks"
chmod +x "${INSTALL_DIR}/gitleaks"

echo -e "${GREEN}gitleaks installed to ${INSTALL_DIR}/gitleaks${NC}"

if ! echo "${PATH}" | grep -q "${INSTALL_DIR}"; then
  echo -e "${YELLOW}Add ${INSTALL_DIR} to your PATH, e.g.:${NC}"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
fi

echo ""
echo "Run a manual scan at any time:"
echo "  gitleaks detect --config=.gitleaks.toml --redact --verbose"
echo "  gitleaks protect --staged --config=.gitleaks.toml --redact --verbose"
