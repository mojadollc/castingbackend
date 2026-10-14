#!/bin/bash
# deploy.sh — Production deployment script for Ubuntu VPS
# Usage: ./deploy.sh [setup|deploy|rollback]
set -euo pipefail

APP_DIR="/var/www/casting-backend"
LOG_DIR="/var/log/casting"
NODE_VERSION="20"

# ─── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Setup (run once on fresh server) ────────────────────────────────────────
setup() {
  info "Setting up server..."

  # Node.js
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
  sudo apt-get install -y nodejs

  # PM2
  sudo npm install -g pm2
  pm2 startup systemd -u $USER --hp $HOME

  # Directories
  sudo mkdir -p $APP_DIR $LOG_DIR
  sudo chown -R $USER:$USER $APP_DIR $LOG_DIR

  # PostgreSQL client (for migrations)
  sudo apt-get install -y postgresql-client

  info "Server setup complete."
}

# ─── Deploy ───────────────────────────────────────────────────────────────────
deploy() {
  info "Deploying casting-backend..."

  cd $APP_DIR

  # Pull latest
  git pull origin main

  # Install production deps
  npm ci --only=production

  # Generate Prisma client
  npx prisma generate

  # Run migrations (safe — only applies pending)
  npx prisma migrate deploy

  # Build
  npm run build

  # Reload PM2 (zero-downtime)
  pm2 reload ecosystem.config.js --env production --update-env

  # Save PM2 process list
  pm2 save

  info "Deploy complete. Running: $(pm2 list | grep casting-api | awk '{print $12}')"
}

# ─── Rollback ─────────────────────────────────────────────────────────────────
rollback() {
  warning "Rolling back to previous version..."
  cd $APP_DIR
  git log --oneline -5
  read -p "Enter commit hash to rollback to: " COMMIT
  git checkout $COMMIT
  npm ci --only=production
  npx prisma generate
  npm run build
  pm2 reload ecosystem.config.js --env production
  info "Rollback complete."
}

# ─── Health check ─────────────────────────────────────────────────────────────
health() {
  RESPONSE=$(curl -sf http://localhost:3000/health || echo "FAILED")
  if [[ "$RESPONSE" == *"ok"* ]]; then
    info "Health check passed: $RESPONSE"
  else
    error "Health check failed: $RESPONSE"
  fi
}

case "${1:-deploy}" in
  setup)    setup ;;
  deploy)   deploy && health ;;
  rollback) rollback ;;
  health)   health ;;
  *)        error "Usage: $0 [setup|deploy|rollback|health]" ;;
esac
