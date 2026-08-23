#!/usr/bin/env bash
# Run the same static analysis CI runs, locally, before you push.
#   ./scripts/security-scan.sh
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0
step() { printf '\n\033[1m── %s\033[0m\n' "$1"; }

step "Parameterized queries"
node scripts/check-sql-safety.mjs || fail=1

step "Semgrep (project rules)"
if command -v semgrep >/dev/null 2>&1; then
  semgrep scan --config .semgrep.yml --error --metrics off || fail=1
  # The public rulesets are fetched from semgrep.dev. If the network blocks that
  # (sandboxes, air-gapped CI), report it and carry on — the GitHub Actions job
  # runs them in a container that can reach the registry, and that one is the
  # gate. Local absence must not be mistaken for local success.
  step "Semgrep (OWASP Top Ten + JS/TS)"
  # Hard timeout: a blocked registry makes semgrep hang rather than fail.
  if timeout 300 semgrep scan --config p/owasp-top-ten --config p/typescript --error --metrics off 2>/tmp/semgrep-registry.err; then
    :
  elif [ $? -eq 124 ] || grep -qiE "download|network|connection|resolve|registry|timed out" /tmp/semgrep-registry.err; then
    echo "⚠ registry unreachable from here — skipped locally; CI still enforces it"
  else
    cat /tmp/semgrep-registry.err
    fail=1
  fi
else
  echo "semgrep not installed — pip install semgrep (CI runs it regardless)"
fi

step "Secret scan"
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --no-banner --redact || fail=1
else
  echo "gitleaks not installed — see https://github.com/gitleaks/gitleaks (CI runs it regardless)"
fi

for ws in server web admin mobile; do
  [ -d "$ws/node_modules" ] || { echo "skipping $ws (no node_modules)"; continue; }
  step "$ws — typecheck"
  (cd "$ws" && npx tsc --noEmit) || fail=1
  step "$ws — dependency audit (high+)"
  (cd "$ws" && npm audit --audit-level=high) || fail=1
done

printf '\n'
[ $fail -eq 0 ] && echo "✓ All security checks passed." || echo "✗ Security checks failed — see above."
exit $fail
