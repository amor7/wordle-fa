# وردل فارسی

یک بازی حدس کلمهٔ فارسی شبیه Wordle، با پنل مدیریت کامل (تعریف/ویرایش کلمه، اعتبار زمانی،
حالت انتخاب خودکار روزانه، بانک کلمات، فرهنگ‌لغت اعتبارسنجی حدس، آمار و تحلیل).

## نصب روی سرور (یک دستور)

روی یک سرور تازهٔ Ubuntu 22.04/24.04، به‌عنوان root:

```bash
git clone https://github.com/amor7/wordle-fa.git
cd wordle-fa
GAME_DOMAIN=wordle.example.com \
ADMIN_DOMAIN=admin.example.com \
LETSENCRYPT_EMAIL=you@example.com \
./scripts/install.sh
```

(اگر با کاربر root وارد نیستید و از `sudo` استفاده می‌کنید، `sudo` را ابتدای همان دستور
بگذارید: `sudo GAME_DOMAIN=... ./scripts/install.sh`.)

این اسکریپت خودش همه‌چی رو انجام می‌ده: نصب Node.js/Nginx/Certbot، تنظیم فایروال،
ساخت کاربر سیستمی مجزا، نصب پکیج‌ها، migration دیتابیس، seed کردن بانک کلمات و فرهنگ‌لغت
و ساخت اولین حساب ادمین‌کل، build، تنظیم systemd service، تنظیم Nginx، گرفتن گواهی SSL
رایگان از Let's Encrypt (با تمدید خودکار)، و تنظیم کران‌جاب انتخاب خودکار روزانهٔ کلمه.

آخر کار، آدرس‌ها و رمز عبور ادمین‌کل (فقط بار اول) چاپ می‌شود — حتماً یادداشت کنید.

اگر فقط یک دامین دارید، `ADMIN_DOMAIN` را ندهید — همان دامین بازی برای پنل ادمین هم استفاده
می‌شود (پنل روی مسیر `/admin`).

### بروزرسانی نسخه

بعد از `git pull`، همین اسکریپت را دوباره اجرا کنید — کاملاً امن است: به `.env`،
دیتابیس، یا گواهی SSL دست نمی‌زند؛ فقط پکیج‌ها، migration، و build را به‌روز می‌کند
و سرویس را ری‌استارت می‌کند.

```bash
git pull
GAME_DOMAIN=wordle.example.com ADMIN_DOMAIN=admin.example.com LETSENCRYPT_EMAIL=you@example.com ./scripts/install.sh
```

(همان مقادیر دامین/ایمیل بار اول را بدهید — یا این‌ها را در `~/.bashrc` یا یک فایل جدا export
کنید تا هر بار تایپ نکنید.)

## توسعهٔ لوکال

```bash
npm install
npx prisma migrate dev
npm run dev
```

سایت روی [http://localhost:3000](http://localhost:3000) بالا می‌آید.

## سازنده

**amor** — [t.me/amor_xo](https://t.me/amor_xo)
