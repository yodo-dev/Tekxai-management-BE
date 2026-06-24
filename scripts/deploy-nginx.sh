#!/bin/bash
# Run once on EC2 to apply nginx config from repo
set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

sudo cp "$REPO_DIR/nginx/tekxai.conf" /etc/nginx/sites-available/tekxai
sudo ln -sf /etc/nginx/sites-available/tekxai /etc/nginx/sites-enabled/tekxai
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t && sudo systemctl reload nginx
echo "nginx reloaded successfully"
