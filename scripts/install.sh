#!/usr/bin/env bash
#
# One-command installer / updater for وردل فارسی (Persian Wordle).
#
# Fresh Ubuntu 22.04/24.04 server, run as root:
#
#   git clone <your-repo-url> wordle-fa
#   cd wordle-fa
#   GAME_DOMAIN=wordle.example.com ADMIN_DOMAIN=admin.example.com \
#   LETSENCRYPT_EMAIL=you@example.com ./scripts/install.sh
#
# Re-running this script later (after `git pull`) safely redeploys updates:
# it never touches an existing .env, database, or SSL certificate — it only
# reinstalls dependencies, re-applies migrations, rebuilds, and restarts.
#
# Every setting can be passed as an environment variable; anything missing
# is asked for interactively.

set -euo pipefail

# ---------------------------------------------------------------------------
# 0. Config
# ---------------------------------------------------------------------------
APP_DIR="${APP_DIR:-/opt/wordle-fa}"
APP_USER="${APP_USER:-wordle}"
SERVICE_NAME="${SERVICE_NAME:-wordle-fa}"
SUPERADMIN_USERNAME="${SUPERADMIN_USERNAME:-superadmin}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { echo -e "\033[1;32m==>\033[0m $*"; }
warn() { echo -e "\033[1;33m!!\033[0m $*"; }
die()  { echo -e "\033[1;31mERROR:\033[0m $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "این اسکریپت باید با root اجرا شود (sudo ./scripts/install.sh)"
command -v apt-get >/dev/null 2>&1 || die "این اسکریپت فقط برای Ubuntu/Debian (apt) نوشته شده"

# Ask for anything not provided via environment variables.
if [ -z "${GAME_DOMAIN:-}" ]; then
  read -rp "دامین بازی (مثلاً wordle.example.com): " GAME_DOMAIN
fi
[ -n "$GAME_DOMAIN" ] || die "GAME_DOMAIN لازم است"

if [ -z "${ADMIN_DOMAIN:-}" ]; then
  read -rp "دامین ادمین (اختیاری، Enter برای رد شدن اگر می‌خواهید هر دو یکی باشند): " ADMIN_DOMAIN || true
fi
ADMIN_DOMAIN="${ADMIN_DOMAIN:-$GAME_DOMAIN}"

if [ -z "${LETSENCRYPT_EMAIL:-}" ]; then
  read -rp "ایمیل برای Let's Encrypt (اطلاع انقضای گواهی): " LETSENCRYPT_EMAIL
fi
[ -n "$LETSENCRYPT_EMAIL" ] || die "LETSENCRYPT_EMAIL لازم است"

log "دامین بازی: $GAME_DOMAIN"
log "دامین ادمین: $ADMIN_DOMAIN"

# Soft DNS sanity check (warning only — Cloudflare proxying etc. can look "wrong" and still be fine).
SERVER_IP="$(curl -fsS -4 https://ifconfig.me 2>/dev/null || true)"
for d in "$GAME_DOMAIN" "$ADMIN_DOMAIN"; do
  RESOLVED="$(getent hosts "$d" 2>/dev/null | awk '{print $1}' | head -1 || true)"
  if [ -n "$SERVER_IP" ] && [ -n "$RESOLVED" ] && [ "$RESOLVED" != "$SERVER_IP" ]; then
    warn "$d به $RESOLVED اشاره می‌کند ولی آی‌پی این سرور $SERVER_IP است — اگر DNS را تازه تنظیم کرده‌اید ممکن است هنوز پراپاگیت نشده باشد."
  fi
done

# ---------------------------------------------------------------------------
# 1. System packages
# ---------------------------------------------------------------------------
log "بروزرسانی apt و نصب پیش‌نیازها..."
apt-get update -y
apt-get install -y curl ca-certificates gnupg ufw rsync openssl

if ! command -v node >/dev/null 2>&1; then
  log "نصب Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
else
  log "Node.js از قبل نصب است: $(node -v)"
fi

if ! command -v nginx >/dev/null 2>&1; then
  log "نصب Nginx و Certbot..."
  apt-get install -y nginx certbot python3-certbot-nginx
else
  log "Nginx از قبل نصب است."
  command -v certbot >/dev/null 2>&1 || apt-get install -y certbot python3-certbot-nginx
fi

# ---------------------------------------------------------------------------
# 2. Firewall
# ---------------------------------------------------------------------------
log "تنظیم فایروال (ufw)..."
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null

# ---------------------------------------------------------------------------
# 3. App user + directory
# ---------------------------------------------------------------------------
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  log "ساخت کاربر سیستمی $APP_USER..."
  useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
fi
mkdir -p "$APP_DIR" "$APP_DIR/data"

log "کپی کردن کد به $APP_DIR..."
rsync -a --delete \
  --exclude 'node_modules' --exclude '.next' --exclude '.git' \
  --exclude '.env' --exclude 'dev.db' --exclude 'dev.db-journal' \
  --exclude '/data' \
  "$REPO_ROOT"/ "$APP_DIR"/
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ---------------------------------------------------------------------------
# 4. .env (only created once — re-running this script never overwrites secrets)
# ---------------------------------------------------------------------------
if [ ! -f "$APP_DIR/.env" ]; then
  log "ساخت .env با رمزهای تصادفی جدید..."
  JWT_SECRET="$(openssl rand -hex 32)"
  ROTATE_SECRET="$(openssl rand -hex 24)"
  cat > "$APP_DIR/.env" <<EOF
DATABASE_URL="file:$APP_DIR/data/prod.db"
JWT_SECRET="$JWT_SECRET"
ROTATE_SECRET="$ROTATE_SECRET"
TZ="Asia/Tehran"
NODE_ENV="production"
ADMIN_HOST="$ADMIN_DOMAIN"
PORT="3000"
EOF
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
else
  log ".env از قبل وجود دارد — دست نخورد (رمزها و آدرس دیتابیس حفظ شدند)."
fi

ROTATE_SECRET="$(grep '^ROTATE_SECRET=' "$APP_DIR/.env" | cut -d'"' -f2)"

# ---------------------------------------------------------------------------
# 5. Install deps, migrate, generate, seed, build
# ---------------------------------------------------------------------------
log "نصب پکیج‌های npm..."
sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && npm install"

log "اعمال migration های دیتابیس..."
sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && npx prisma migrate deploy"
sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && npx prisma generate"

log "seed کردن بانک کلمات/فرهنگ‌لغت/ادمین کل (اگر قبلاً انجام نشده)..."
sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && SEED_SUPERADMIN_USERNAME='$SUPERADMIN_USERNAME' npx tsx prisma/seed.ts" | tee /tmp/wf-seed-output.log

log "ساخت نسخهٔ production..."
sudo -u "$APP_USER" bash -c "cd '$APP_DIR' && npm run build"

# ---------------------------------------------------------------------------
# 6. systemd service
# ---------------------------------------------------------------------------
log "تنظیم systemd service..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=Wordle FA Next.js app
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=$APP_DIR/data

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME" >/dev/null
systemctl restart "$SERVICE_NAME"

# ---------------------------------------------------------------------------
# 7. Nginx
# ---------------------------------------------------------------------------
log "تنظیم Nginx..."
SERVER_NAMES="$GAME_DOMAIN"
if [ "$ADMIN_DOMAIN" != "$GAME_DOMAIN" ]; then
  SERVER_NAMES="$GAME_DOMAIN $ADMIN_DOMAIN"
fi

cat > "/etc/nginx/sites-available/${SERVICE_NAME}.conf" <<EOF
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAMES;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \$connection_upgrade;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf "/etc/nginx/sites-available/${SERVICE_NAME}.conf" "/etc/nginx/sites-enabled/${SERVICE_NAME}.conf"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ---------------------------------------------------------------------------
# 8. SSL certificate (Let's Encrypt) — certbot sets up automatic renewal itself
# ---------------------------------------------------------------------------
log "گرفتن گواهی SSL از Let's Encrypt..."
CERTBOT_DOMAINS=(-d "$GAME_DOMAIN")
if [ "$ADMIN_DOMAIN" != "$GAME_DOMAIN" ]; then
  CERTBOT_DOMAINS+=(-d "$ADMIN_DOMAIN")
fi
certbot --nginx "${CERTBOT_DOMAINS[@]}" --non-interactive --agree-tos -m "$LETSENCRYPT_EMAIL" --redirect
systemctl enable --now certbot.timer >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
# 9. Cron: daily auto-word rotation at 00:00 Asia/Tehran (20:30 UTC, no DST)
# ---------------------------------------------------------------------------
log "تنظیم کران‌جاب انتخاب خودکار کلمه..."
cat > /etc/cron.d/${SERVICE_NAME}-rotate <<EOF
# Rotates the auto-selected word at 00:00 Asia/Tehran (20:30 UTC) if auto mode is enabled.
30 20 * * * root curl -fsS -X POST -H "x-rotate-secret: $ROTATE_SECRET" https://$GAME_DOMAIN/api/internal/rotate-word >/var/log/${SERVICE_NAME}-rotate.log 2>&1
EOF
chmod 644 /etc/cron.d/${SERVICE_NAME}-rotate

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo
log "نصب کامل شد! 🎉"
echo "  بازی:  https://$GAME_DOMAIN"
echo "  ادمین: https://$ADMIN_DOMAIN/admin"
echo
if grep -q "ADMIN SUPERADMIN CREATED" /tmp/wf-seed-output.log; then
  echo "  اطلاعات ورود ادمین کل بالاتر در خروجی seed چاپ شده — همین الان یادداشت کنید."
else
  echo "  حساب ادمین کل از قبل وجود داشت، رمز تغییر نکرد."
fi
rm -f /tmp/wf-seed-output.log
