#!/usr/bin/env bash
# One-time: install git and turn /opt/training-scheduler into a clone of GitHub,
# preserving backend/.env. Run from your laptop.
set -euo pipefail

HOST="${DEPLOY_HOST:-ec2-user@16.16.202.162}"
KEY="${SANDBOX_SSH_KEY:-$HOME/Projects/Sandbox.pem}"
REPO="${DEPLOY_REPO:-https://github.com/oilandrust/training-scheduler.git}"
APP_DIR="${APP_DIR:-/opt/training-scheduler}"

if [[ ! -f "$KEY" ]]; then
  echo "error: SSH key not found at $KEY" >&2
  exit 1
fi

SSH=(ssh -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -i "$KEY" "$HOST")

echo "==> Bootstrapping git checkout on $HOST"
"${SSH[@]}" bash -s <<EOF
set -euo pipefail
APP_DIR="$APP_DIR"
REPO="$REPO"

sudo dnf install -y git

if [[ -d "\$APP_DIR/.git" ]]; then
  echo "Already a git repo at \$APP_DIR"
  exit 0
fi

if [[ ! -f "\$APP_DIR/backend/.env" ]]; then
  echo "error: missing \$APP_DIR/backend/.env — aborting" >&2
  exit 1
fi

cp "\$APP_DIR/backend/.env" /tmp/training-scheduler.env
chmod 600 /tmp/training-scheduler.env

rm -rf /tmp/training-scheduler-clone
git clone --branch main "\$REPO" /tmp/training-scheduler-clone

sudo mv "\$APP_DIR" "\${APP_DIR}.pre-git.\$(date +%Y%m%d%H%M%S)"
sudo mv /tmp/training-scheduler-clone "\$APP_DIR"
sudo chown -R ec2-user:ec2-user "\$APP_DIR"

mkdir -p "\$APP_DIR/deploy"
cp /tmp/training-scheduler.env "\$APP_DIR/backend/.env"
chmod 600 "\$APP_DIR/backend/.env"
rm -f /tmp/training-scheduler.env

echo "Clone ready at \$APP_DIR → \$(cd \$APP_DIR && git rev-parse --short HEAD)"
EOF

echo "==> Uploading deploy scripts and running first full build"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
scp -o IdentitiesOnly=yes -i "$KEY" \
  "$ROOT/deploy/remote-deploy.sh" \
  "$HOST:$APP_DIR/deploy/remote-deploy.sh"

# Force a full build once by temporarily using a fake BEFORE via FORCE_FULL
"${SSH[@]}" bash -s <<'EOF'
set -euo pipefail
cd /opt/training-scheduler
chmod +x deploy/remote-deploy.sh

# First build after clone: always install + build both sides
(
  cd frontend
  npm ci
  npm run build
  rm -rf node_modules
)
(
  cd backend
  npm ci
  npx prisma generate
  npm run build
  npx prisma migrate deploy
  npm prune --omit=dev
)
sudo systemctl restart training-scheduler
echo "==> Waiting for API"
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    curl -fsS http://127.0.0.1:3000/api/health
    echo
    echo "Bootstrap deploy complete: $(git rev-parse --short HEAD)"
    exit 0
  fi
  sleep 1
done
echo "error: API did not become healthy" >&2
sudo systemctl --no-pager --full status training-scheduler | head -40 >&2 || true
exit 1
EOF

echo "Done. Next deploys: ./deploy/deploy.sh (after git push)"
