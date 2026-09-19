#!/usr/bin/env bash
# Run from your laptop after `git push`.
# SSHs to the sandbox EC2 and runs deploy/remote-deploy.sh on the server.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-ec2-user@16.16.202.162}"
KEY="${SANDBOX_SSH_KEY:-$HOME/Projects/Sandbox.pem}"
APP_DIR="${APP_DIR:-/opt/training-scheduler}"

if [[ ! -f "$KEY" ]]; then
  echo "error: SSH key not found at $KEY (set SANDBOX_SSH_KEY)" >&2
  exit 1
fi

SSH=(ssh -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -i "$KEY" "$HOST")

echo "==> Ensuring remote deploy script is current"
# Upload the script so the first deploy works even before the server pulls it
scp -o IdentitiesOnly=yes -i "$KEY" \
  "$ROOT/deploy/remote-deploy.sh" \
  "$HOST:$APP_DIR/deploy/remote-deploy.sh"
"${SSH[@]}" "chmod +x $APP_DIR/deploy/remote-deploy.sh"

echo "==> Running remote deploy on $HOST"
"${SSH[@]}" "bash $APP_DIR/deploy/remote-deploy.sh"

echo "==> Public check"
curl -fsS -o /dev/null -w "https://training-scheduler.lefolio.fr → %{http_code}\n" \
  https://training-scheduler.lefolio.fr/api/health
