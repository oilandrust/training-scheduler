#!/usr/bin/env bash
# Run on the EC2 host from /opt/training-scheduler (or via deploy/deploy.sh).
# Pulls origin/main, rebuilds what changed, migrates, restarts the API when needed.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/training-scheduler}"
REMOTE="${DEPLOY_REMOTE:-origin}"
BRANCH="${DEPLOY_BRANCH:-main}"
SERVICE="${DEPLOY_SERVICE:-training-scheduler}"

cd "$APP_DIR"

if [[ ! -d .git ]]; then
  echo "error: $APP_DIR is not a git checkout. Bootstrap with deploy/bootstrap-server.sh first." >&2
  exit 1
fi

if [[ ! -f backend/.env ]]; then
  echo "error: backend/.env is missing (not in git). Restore it before deploying." >&2
  exit 1
fi

echo "==> Fetching $REMOTE/$BRANCH"
BEFORE="$(git rev-parse HEAD)"
git fetch --prune "$REMOTE"
git checkout "$BRANCH"
git reset --hard "$REMOTE/$BRANCH"
AFTER="$(git rev-parse HEAD)"

if [[ "$BEFORE" == "$AFTER" ]]; then
  echo "Already at $AFTER — nothing to deploy."
  exit 0
fi

echo "Deploying $(git rev-parse --short "$BEFORE") → $(git rev-parse --short "$AFTER")"
CHANGED="$(git diff --name-only "$BEFORE" "$AFTER" || true)"
echo "$CHANGED" | sed 's/^/  /'

need_frontend=0
need_backend=0
need_migrate=0
need_restart=0
need_systemd=0

matches() {
  grep -Eq "$1" <<<"$CHANGED"
}

if matches '^frontend/'; then
  need_frontend=1
fi
if matches '^backend/'; then
  need_backend=1
  need_restart=1
fi
if matches '^backend/prisma/'; then
  need_migrate=1
fi
if matches '^deploy/training-scheduler\.service$'; then
  need_systemd=1
  need_restart=1
fi

# If only docs/deploy nginx templates changed, skip builds
if [[ "$need_frontend" -eq 0 && "$need_backend" -eq 0 && "$need_systemd" -eq 0 ]]; then
  echo "==> No app/runtime changes — skip build/restart"
  echo "Deploy complete: $(git rev-parse --short HEAD)"
  exit 0
fi

if [[ "$need_frontend" -eq 1 ]]; then
  echo "==> Building frontend"
  (
    cd frontend
    npm ci
    npm run build
    rm -rf node_modules
  )
fi

if [[ "$need_backend" -eq 1 ]]; then
  echo "==> Building backend"
  (
    cd backend
    npm ci
    npx prisma generate
    npm run build
    if [[ "$need_migrate" -eq 1 ]]; then
      echo "==> Running Prisma migrations"
      npx prisma migrate deploy
    fi
    npm prune --omit=dev
  )
fi

if [[ "$need_systemd" -eq 1 ]]; then
  echo "==> Updating systemd unit"
  sudo cp "$APP_DIR/deploy/training-scheduler.service" /etc/systemd/system/training-scheduler.service
  sudo systemctl daemon-reload
fi

if [[ "$need_restart" -eq 1 ]]; then
  echo "==> Restarting $SERVICE"
  sudo systemctl restart "$SERVICE"
  sleep 1
  sudo systemctl --no-pager --full status "$SERVICE" | head -20
else
  echo "==> API restart not required"
fi

echo "==> Health check"
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://127.0.0.1:3000/api/health" >/dev/null 2>&1; then
    echo "ok"
    break
  fi
  if [[ "$i" -eq 10 ]]; then
    echo "error: API did not become healthy" >&2
    sudo systemctl --no-pager --full status "$SERVICE" | head -30 >&2 || true
    exit 1
  fi
  sleep 1
done

echo "Deploy complete: $(git rev-parse --short HEAD)"
