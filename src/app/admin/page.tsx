import Link from "next/link";
import { getActiveWordEntry } from "@/lib/activeWord";
import { formatTehran } from "@/lib/time";
import { EndWordButton } from "@/components/EndWordButton";

export default async function AdminDashboard() {
  const active = await getActiveWordEntry();

  return (
    <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full flex flex-col gap-6" dir="rtl">
      <h1 className="text-2xl font-extrabold">داشبورد</h1>

      <section className="border rounded-xl p-5 flex flex-col gap-3" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold text-lg">کلمهٔ فعال</h2>
        {!active ? (
          <p className="opacity-70">در حال حاضر کلمه‌ای فعال نیست. کاربران پیام «کلمه‌ای نداریم» می‌بینند.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p>
              متن کلمه:{" "}
              <span className="font-mono font-bold">
                {active.hidden ? "•••• (حالت خودکار، مخفی)" : active.word}
              </span>
            </p>
            <p>طول: {active.length} حرف</p>
            <p>منبع: {active.source === "AUTO" ? "انتخاب خودکار" : "دستی"}</p>
            <p>معتبر تا: {formatTehran(active.expiresAt)} (به وقت تهران)</p>
            <p className="text-sm opacity-70">
              شروع بازی: {active.playsStarted} — برد: {active.playsWon} — باخت: {active.playsLost}
            </p>
            <div>
              <EndWordButton id={active.id} />
            </div>
          </div>
        )}
      </section>

      <div className="flex gap-3 flex-wrap">
        <Link href="/admin/words" className="key px-4 py-2 font-bold" style={{ background: "var(--accent)", color: "white" }}>
          تعریف / ویرایش کلمه
        </Link>
        <Link href="/admin/pool" className="key px-4 py-2 font-bold">
          مدیریت بانک کلمات
        </Link>
      </div>
    </main>
  );
}
