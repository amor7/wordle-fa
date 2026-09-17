"use client";

import { Modal } from "./Modal";

export function HowToPlayModal({ onClose, length }: { onClose: () => void; length: number }) {
  return (
    <Modal title="چطور بازی کنیم" onClose={onClose}>
      <p>کلمهٔ مخفیِ {length} حرفی را در ۶ حدس پیدا کنید. بعد از هر حدس، رنگ خانه‌ها راهنمایی‌تان می‌کند.</p>

      <div className="htp-example">
        <div className="tile htp-tile" data-status="correct" style={{ width: 40, height: 40 }}>
          ک
        </div>
        <div className="tile htp-tile" style={{ width: 40, height: 40 }}>ت</div>
        <div className="tile htp-tile" style={{ width: 40, height: 40 }}>ا</div>
        <div className="tile htp-tile" style={{ width: 40, height: 40 }}>ب</div>
      </div>
      <p>حرف <b>ک</b> سبز است — یعنی در کلمه هست و جایش هم درست است.</p>

      <div className="htp-example">
        <div className="tile htp-tile" style={{ width: 40, height: 40 }}>د</div>
        <div className="tile htp-tile" data-status="present" style={{ width: 40, height: 40 }}>
          ر
        </div>
        <div className="tile htp-tile" style={{ width: 40, height: 40 }}>ی</div>
        <div className="tile htp-tile" style={{ width: 40, height: 40 }}>ا</div>
      </div>
      <p>حرف <b>ر</b> زرد است — در کلمه هست، ولی جایش اشتباه است.</p>

      <div className="htp-example">
        <div className="tile htp-tile" style={{ width: 40, height: 40 }}>گ</div>
        <div className="tile htp-tile" style={{ width: 40, height: 40 }}>ل</div>
        <div className="tile htp-tile" data-status="absent" style={{ width: 40, height: 40 }}>
          م
        </div>
        <div className="tile htp-tile" style={{ width: 40, height: 40 }}>ی</div>
      </div>
      <p>حرف <b>م</b> خاکستری است — اصلاً در کلمه نیست.</p>

      <p className="opacity-70 text-sm">
        فقط کلمات واقعی فارسی به‌عنوان حدس پذیرفته می‌شوند. هر روز (یا هر بار که ادمین
        کلمهٔ جدیدی تعریف کند) یک دور تازه شروع می‌شود.
      </p>

      <div className="border-t pt-3 mt-1" style={{ borderColor: "var(--border)" }}>
        <p className="font-bold">🔥 حالت سخت (Hard Mode)</p>
        <p className="text-sm opacity-80">
          با دکمهٔ «سخت» بالای صفحه فعال می‌شود (فقط پیش از حدس اول قابل تغییر است).
          در این حالت، هر حرفی که سبز یا زرد شده باشد، باید در حدس‌های بعدی همان دور
          هم استفاده شود — حرف‌های سبز باید دقیقاً همان جای قبلی بمانند.
        </p>
      </div>
    </Modal>
  );
}
