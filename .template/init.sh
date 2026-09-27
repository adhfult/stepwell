#!/usr/bin/env bash
# One-time setup for a project created from this template. Run from the
# project folder:   bash .template/init.sh <project-name> "<one-sentence description>"
# Fills in the name/description, turns on the secret-blocking git hook,
# installs dependencies, runs the checks, then deletes this .template folder.
set -euo pipefail

NAME="${1:-}"; DESC="${2:-}"
if ! [[ "$NAME" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "Usage: bash .template/init.sh <project-name> \"<one-sentence description>\"" >&2
  echo "The name must be lowercase letters, numbers and hyphens (e.g. study-planner)." >&2
  exit 1
fi
cd "$(dirname "${BASH_SOURCE[0]}")/.."
[ -n "$DESC" ] || DESC="TODO: one-sentence description (see docs/PRODUCT.md)"
# Keep the description safe inside JSON, TOML and Python strings
DESC="$(printf '%s' "$DESC" | tr -d '\\\n\r' | tr '"' "'")"

echo "==> Filling in name and description"
grep -rlI --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.venv --exclude-dir=.template \
  -e 'project-name' -e '__PROJECT_DESCRIPTION__' . | while IFS= read -r f; do
  python3 - "$f" "$NAME" "$DESC" <<'PY'
import sys
path, name, desc = sys.argv[1:]
text = open(path, encoding="utf-8").read()
text = text.replace("project-name", name).replace("__PROJECT_DESCRIPTION__", desc)
open(path, "w", encoding="utf-8").write(text)
PY
done
find . -path ./.git -prune -o -name '*project-name*' -print | while IFS= read -r f; do
  mv "$f" "${f//project-name/$NAME}"
done

CHECKS_FAILED=0
echo "==> Turning on the secret-blocking git hook"
git config core.hooksPath .githooks

if [ -f package.json ]; then
  echo "==> Installing dependencies (npm)"
  npm install --no-audit --no-fund
  echo "==> Running checks"
  npm run check || CHECKS_FAILED=1
fi
if [ -f pyproject.toml ]; then
  echo "==> Installing dependencies (uv)"
  uv sync
  echo "==> Running checks"
  { uv run ruff check . && uv run ruff format --check . && uv run pytest; } || CHECKS_FAILED=1
fi

rm -rf .template
if [ "$CHECKS_FAILED" = "1" ]; then
  echo "==> Set up, but some checks failed (see above). Ask Claude: \"the template checks failed, fix them\"." >&2
  exit 1
fi
echo "==> Done. Next: fill in docs/PRODUCT.md (ask Claude to help), then commit."
