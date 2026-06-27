#!/usr/bin/env bash
# Encrypt or decrypt a backup file using AES-256-CBC with PBKDF2 key derivation.
# Usage:
#   encrypt-backup.sh --encrypt --in <file> --out <file.enc>
#   encrypt-backup.sh --decrypt --in <file.enc> --out <file>
set -euo pipefail

: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required}"

MODE=""
IN_FILE=""
OUT_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --encrypt) MODE="encrypt"; shift ;;
    --decrypt) MODE="decrypt"; shift ;;
    --in)      IN_FILE="$2";   shift 2 ;;
    --out)     OUT_FILE="$2";  shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

[[ -n "$MODE" ]]    || { echo "Specify --encrypt or --decrypt" >&2; exit 1; }
[[ -n "$IN_FILE" ]] || { echo "--in <file> is required" >&2; exit 1; }
[[ -n "$OUT_FILE" ]] || { echo "--out <file> is required" >&2; exit 1; }
[[ -f "$IN_FILE" ]] || { echo "Input file not found: $IN_FILE" >&2; exit 1; }

if [[ "$MODE" == "encrypt" ]]; then
  openssl enc -aes-256-cbc -pbkdf2 -iter 100000 \
    -in "$IN_FILE" \
    -out "$OUT_FILE" \
    -pass "pass:${BACKUP_ENCRYPTION_KEY}"
  echo "Encrypted: $IN_FILE -> $OUT_FILE"
else
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
    -in "$IN_FILE" \
    -out "$OUT_FILE" \
    -pass "pass:${BACKUP_ENCRYPTION_KEY}"
  echo "Decrypted: $IN_FILE -> $OUT_FILE"
fi
