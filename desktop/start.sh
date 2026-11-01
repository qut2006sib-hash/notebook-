#!/usr/bin/env bash
set -euo pipefail
app_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec python3 "$app_dir/serve.py" "$@"
