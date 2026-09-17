"use client";

import { useCallback, useEffect, useState } from "react";

type ByLength = { length: number; _count: number };

export default function SettingsPage() {
  const [role, setRole] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [lengthFilter, setLengthFilter] = useState<string>("");
  const [poolCounts, setPoolCounts] = useState<ByLength[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [meRes, settingsRes] = await Promise.all([
      fetch("/api/admin/me"),
      fetch("/api/admin/settings", { cache: "no-store" }),
    ]);
    if (meRes.ok) {
      const me = await meRes.json();
      setRole(me.role);
    }
    if (settingsRes.ok) {
      const data = await settingsRes.json();
      setEnabled(data.settings.autoModeEnabled);
      setLengthFilter(data.settings.autoModeLength ? String(data.settings.autoModeLength) : "");
      setPoolCounts(data.poolCounts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoModeEnabled: enabled,
          autoModeLength: lengthFilter ? Number(lengthFilter) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "خطا");
        return;
      }
      setMessage("ذخیره شد");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function rotateNow() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/rotate-now", { method: "POST" });
      const data = await res.json();
      setMessage(data.ok ? (data.created ? "کلمهٔ جدید انتخاب شد" : data.reason) : data.error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="flex-1 p-6">در حال بارگذاری...</main>;

  if (role !== "SUPERADMIN") {
    return <main className="flex-1 p-6" dir="rtl">فقط ادمین کل به این بخش دسترسی دارد.</main>;
  }

  return (
    <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full flex flex-col gap-6" dir="rtl">
      <h1 className="text-2xl font-extrabold">حالت انتخاب خودکار کلمه</h1>
      <p className="text-sm opacity-70">
        وقتی این حالت روشن باشد، هر روز رأس ساعت ۰۰:۰۰ به وقت تهران یک کلمهٔ تصادفی از بانک کلمات انتخاب و فعال می‌شود —
        بدون اینکه متن کلمه حتی به ادمین کل نمایش داده شود، تا خود شما هم بتوانید بازی کنید.
      </p>

      <section className="border rounded-xl p-5 flex flex-col gap-4" style={{ borderColor: "var(--border)" }}>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          حالت خودکار فعال باشد
        </label>

        <label className="flex flex-col gap-1 text-sm">
          طول کلمهٔ خودکار (خالی = هر طولی)
          <input
            type="number"
            min={2}
            max={12}
            value={lengthFilter}
            onChange={(e) => setLengthFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-transparent w-40"
            style={{ borderColor: "var(--border)" }}
            placeholder="مثلاً 5"
          />
        </label>

        <div className="flex flex-wrap gap-2 text-xs opacity-70">
          {poolCounts.map((c) => (
            <span key={c.length} className="border rounded px-2 py-1" style={{ borderColor: "var(--border)" }}>
              {c.length} حرفی: {c._count} کلمهٔ آزاد
            </span>
          ))}
        </div>

        {message && <p className="text-sm">{message}</p>}

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="key px-5 py-2.5 font-bold"
            style={{ background: "var(--accent)", color: "white" }}
          >
            ذخیره
          </button>
          <button onClick={rotateNow} disabled={saving} className="key px-4 py-2.5">
            انتخاب کلمهٔ جدید همین الان
          </button>
        </div>
      </section>
    </main>
  );
}
