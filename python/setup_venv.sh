#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"

PYTHON_BIN=""
for candidate in python3.12 python3.11 python3.13 python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    PYTHON_BIN="$candidate"
    break
  fi
done

if [ -z "$PYTHON_BIN" ]; then
  echo "Kein passender Python-Interpreter gefunden (python3.12/3.11/3.13/python3)." >&2
  exit 1
fi

echo "Nutze Interpreter: $(command -v "$PYTHON_BIN") ($("$PYTHON_BIN" --version))"

"$PYTHON_BIN" -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install -r "$SCRIPT_DIR/requirements.txt"

echo "---"
echo "Python-Version in der venv:"
"$VENV_DIR/bin/python" --version
echo "Installierte mlx-whisper Version:"
"$VENV_DIR/bin/pip" show mlx-whisper | grep -E "^(Name|Version):"
echo "---"
echo "Setup abgeschlossen. Test-Lauf mit:"
echo "  $VENV_DIR/bin/python $SCRIPT_DIR/transcribe.py --input <datei>"
