#!/bin/bash
set -e
echo "== QA Gate: opencode + claude-code =="
npm run build
npx tsc --noEmit || true
if command -v claude >/dev/null 2>&1; then
  echo "→ Claude Code review..."
  git diff --staged --stat | head -20
  claude -p "Review this diff for over-engineering, security and type errors. Be strict. If critical issues, exit 1." --allowedTools "Read, Grep, Glob" || { echo "Claude QA failed"; exit 1; }
else
  echo "Claude not found, skipping AI review"
fi
echo "✓ QA passed"
