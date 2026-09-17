"use client";

import { useCallback, useEffect, useState } from "react";

type WordItem = {
  id: string;
  word: string | null;
  length: number;
  source: "MANUAL" | "AUTO";
  hidden: boolean;
  activatesAt: string;
  expiresAt: string;
  endedEarly: boolean;
  createdAt: string;
  createdBy: string | null;
  playsStarted: number;
  playsWon: number;
  playsLost: number;
  isActive: boolean;
};

const HOUR_PRESETS = [1, 2, 3, 6, 12, 24, 48, 72];

function toTehranLocalInputValue(): string {
  const now = new Date();
  const tehran = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tehran" }));
  tehran.setMinutes(tehran.getMinutes() + 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${tehran.getFullYear()}-${pad(tehran.getMonth() + 1)}-${pad(tehran.getDate())}T${pad(tehran.getHours())}:${pad(tehran.getMinutes())}`;
}

export default function WordsPage() {
  const [role, setRole] = useState<string | null>(null);
  const [active, setActive] = useState<WordItem | null>(null);
  const [history, setHistory] = useState<WordItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [word, setWord] = useState("");
  const [allowCustomLength, setAllowCustomLength] = useState(false);
  const [expiryMode, setExpiryMode] = useState<"duration" | "at">("duration");
  const [hours, setHours] = useState(24);
  const [atValue, setAtValue] = useState(toTehranLocalInputValue());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [meRes, res] = await Promise.all([
      fetch("/api/admin/me"),
      fetch("/api/admin/word", { cache: "no-store" }),
    ]);
    if (meRes.ok) setRole((await meRes.json()).role);
    const data = await res.json();
    if (res.ok) {
      setActive(data.active);
      setHistory(data.history);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const wordLength = Array.from(word).length;
  const lengthOk = allowCustomLength && role === "SUPERADMIN" ? wordLength >= 2 : wordLength === 5;

  function startEdit(item: WordItem) {
    setEditingId(item.id);
    setWord(item.word ?? "");
    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setWord("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const body: Record<string, unknown> = { expiryMode, allowCustomLength };
      if (expiryMode === "at") body.at = atValue;
      else body.hours = hours;

      let res: Response;
      if (editingId) {
        res = await fetch("/api/admin/word", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, word: word || undefined, ...body }),
        });
      } else {
        body.word = word;
        res = await fetch("/api/admin/word", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "خطا");
        return;
      }
      setSuccess(editingId ? "ویرایش شد" : "کلمهٔ جدید فعال شد");
      setWord("");
      setEditingId(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="flex-1 p-6">در حال بارگذاری...</main>;

  return (
    <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full flex flex-col gap-6" dir="rtl">
      <h1 className="text-2xl font-extrabold">مدیریت کلمه</h1>

      <form onSubmit={onSubmit} className="border rounded-xl p-5 flex flex-col gap-4" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold">{editingId ? "ویرایش کلمهٔ فعال" : "تعریف کلمهٔ جدید (دستی)"}</h2>

        {(!editingId || active?.source === "MANUAL") && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              کلمه ({allowCustomLength && role === "SUPERADMIN" ? "طول دلخواه" : "دقیقاً ۵ حرف"})
              <input
                className="border rounded-lg px-3 py-2 bg-transparent font-mono text-lg"
                style={{ borderColor: "var(--border)" }}
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="مثلاً: کتاب"
                dir="rtl"
              />
              {word && (
                <span className={wordLength && lengthOk ? "text-green-600" : "text-red-500"}>
                  {wordLength} حرف
                </span>
              )}
            </label>

            {role === "SUPERADMIN" && (
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={allowCustomLength}
                  onChange={(e) => setAllowCustomLength(e.target.checked)}
                />
                طول دلخواه (فقط ادمین‌کل — پیش‌فرض کلمات ۵ حرفی هستند)
              </label>
            )}
          </>
        )}
        {editingId && active?.source === "AUTO" && (
          <p className="text-sm opacity-70">این کلمه به‌صورت خودکار انتخاب شده و متن آن قابل نمایش/ویرایش نیست؛ فقط می‌توانید اعتبار آن را تغییر دهید.</p>
        )}

        <div className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">اعتبار کلمه</span>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={expiryMode === "duration"} onChange={() => setExpiryMode("duration")} />
              به مدت چند ساعت
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={expiryMode === "at"} onChange={() => setExpiryMode("at")} />
              تا ساعت مشخص (تهران)
            </label>
          </div>

          {expiryMode === "duration" ? (
            <div className="flex flex-wrap gap-2 items-center">
              <select
                className="border rounded-lg px-3 py-2 bg-transparent"
                style={{ borderColor: "var(--border)" }}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
              >
                {HOUR_PRESETS.map((h) => (
                  <option key={h} value={h}>
                    {h} ساعت
                  </option>
                ))}
                <option value={-1}>دلخواه...</option>
              </select>
              {!HOUR_PRESETS.includes(hours) && (
                <input
                  type="number"
                  min={1}
                  max={720}
                  className="border rounded-lg px-3 py-2 bg-transparent w-28"
                  style={{ borderColor: "var(--border)" }}
                  value={hours < 0 ? "" : hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  placeholder="تعداد ساعت"
                />
              )}
            </div>
          ) : (
            <input
              type="datetime-local"
              className="border rounded-lg px-3 py-2 bg-transparent"
              style={{ borderColor: "var(--border)" }}
              value={atValue}
              onChange={(e) => setAtValue(e.target.value)}
            />
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="key px-5 py-2.5 font-bold"
            style={{ background: "var(--accent)", color: "white" }}
          >
            {submitting ? "در حال ثبت..." : editingId ? "ذخیرهٔ ویرایش" : "فعال‌سازی کلمه"}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="key px-4 py-2.5">
              انصراف
            </button>
          )}
        </div>
      </form>

      {active && (
        <div className="flex justify-end -mt-3">
          <button onClick={() => startEdit(active)} className="text-sm underline opacity-70">
            ویرایش کلمهٔ فعلی
          </button>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-bold text-lg">تاریخچه</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-right opacity-60">
                <th className="p-2">کلمه</th>
                <th className="p-2">طول</th>
                <th className="p-2">منبع</th>
                <th className="p-2">وضعیت</th>
                <th className="p-2">شروع بازی/برد/باخت</th>
                <th className="p-2">ایجادکننده</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="p-2 font-mono">{h.hidden ? "••••" : h.word}</td>
                  <td className="p-2">{h.length}</td>
                  <td className="p-2">{h.source === "AUTO" ? "خودکار" : "دستی"}</td>
                  <td className="p-2">{h.isActive ? "فعال" : h.endedEarly ? "پایان‌یافته" : "منقضی"}</td>
                  <td className="p-2">{h.playsStarted}/{h.playsWon}/{h.playsLost}</td>
                  <td className="p-2">{h.createdBy ?? (h.source === "AUTO" ? "سیستم" : "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
