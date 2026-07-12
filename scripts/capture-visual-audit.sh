#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/artifacts/visual-audit"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT="${VISUAL_AUDIT_PORT:-4175}"

if [[ ! -x "$CHROME" ]]; then
  echo "Google Chrome est nécessaire pour les captures visuelles." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
cd "$ROOT_DIR"
npm run dev -- --host 127.0.0.1 --port "$PORT" >"/tmp/myfamily-visual-audit-vite.log" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" >/dev/null 2>&1 || true' EXIT

SERVER_READY=false
for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:$PORT/?visual-audit=1" >/dev/null; then SERVER_READY=true; break; fi
  sleep 0.25
done
if [[ "$SERVER_READY" != "true" ]]; then
  cat "/tmp/myfamily-visual-audit-vite.log" >&2
  exit 1
fi

for theme in dark light sepia; do
  for role in parent child teen; do
    for viewport in "390,844,iphone" "820,1180,ipad"; do
      IFS=',' read -r width height label <<<"$viewport"
      target="$OUTPUT_DIR/${theme}-${role}-${label}.png"
      "$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-first-run \
        --no-sandbox --disable-dev-shm-usage --user-data-dir="/tmp/myfamily-visual-audit-chrome" \
        --window-size="$width,$height" --screenshot="$target" \
        "http://127.0.0.1:$PORT/?visual-audit=1&theme=$theme&role=$role" >/dev/null 2>&1
      if [[ ! -s "$target" ]] || [[ $(wc -c <"$target") -lt 10000 ]]; then
        echo "Capture invalide: $target" >&2
        exit 1
      fi
    done
  done
done

echo "18 captures créées dans $OUTPUT_DIR"
