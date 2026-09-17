"use client";

import { useCallback, useEffect, useState } from "react";

type PoolItem = { id: string; word: string; length: number; used: boolean };
type ByLength = { length: number; used: boolean; _count: number };

export default function PoolPage() {
  const [items, setItems] = useState<PoolItem[]>([]);
  const [total, setTotal] = useState(0);
  const [byLength, setByLength] = useState<ByLength[]>([]);
  const [search, setSearch] = useState("");
  const [lengthFilter, setLengthFilter] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (lengthFilter) params.set("length", lengthFilter);
    const res = await fetch(`/api/admin/pool?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (res.ok) {
      setItems(data.items);
      setTotal(data.total);
      setByLength(data.byLength);
    }
  }, [search, lengthFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function onBulkAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const words = bulkText.split("\n").map((w) => w.trim()).filter(Boolean);
      const res = await fetch("/api/admin/pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`${data.added} کلمه اضافه شد — ${data.duplicate} تکراری، ${data.invalid} نامعتبر`);
        setBulkText("");
        await load();
      } else {
        setMessage(data.error || "خطا");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    await fetch(`/api/admin/pool?id=${id}`, { method: "DELETE" });
    await load();
  }

  const lengthCounts = new Map<number, { used: number; unused: number }>();
  for (const b of byLength) {
    const entry = lengthCounts.get(b.length) ?? { used: 0, unused: 0 };
    if (b.used) entry.used = b._count;
    else entry.unused = b._count;
    lengthCounts.set(b.length, entry);
  }

  return (
    <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full flex flex-col gap-6" dir="rtl">
      <h1 className="text-2xl font-extrabold">بانک کلمات</h1>
      <p className="text-sm opacity-70">
        این لیست هم برای «حالت انتخاب خودکار» استفاده می‌شود. کلمه‌های بیشتری اضافه کنید تا تنوع بازی بیشتر شود.
      </p>

      <section className="flex flex-wrap gap-3">
        {Array.from(lengthCounts.entries()).sort((a, b) => a[0] - b[0]).map(([len, c]) => (
          <div key={len} className="border rounded-lg px-3 py-2 text-xs" style={{ borderColor: "var(--border)" }}>
            {len} حرفی: {c.unused} آزاد / {c.used} استفاده‌شده
          </div>
        ))}
      </section>

      <form onSubmit={onBulkAdd} className="border rounded-xl p-5 flex flex-col gap-3" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold">افزودن دسته‌ای (هر خط یک کلمه)</h2>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          rows={6}
          className="border rounded-lg px-3 py-2 bg-transparent font-mono"
          style={{ borderColor: "var(--border)" }}
          placeholder={"کتاب\nخانه\nدریا"}
          dir="rtl"
        />
        {message && <p className="text-sm">{message}</p>}
        <button
          type="submit"
          disabled={submitting || !bulkText.trim()}
          className="key px-5 py-2.5 font-bold self-start"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {submitting ? "در حال افزودن..." : "افزودن"}
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="جستجو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-transparent flex-1 min-w-[150px]"
            style={{ borderColor: "var(--border)" }}
          />
          <input
            placeholder="طول"
            type="number"
            value={lengthFilter}
            onChange={(e) => setLengthFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-transparent w-24"
            style={{ borderColor: "var(--border)" }}
          />
        </div>

        <p className="text-sm opacity-60">مجموع: {total}</p>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto border rounded-lg" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0" style={{ background: "var(--background)" }}>
              <tr className="text-right opacity-60">
                <th className="p-2">کلمه</th>
                <th className="p-2">طول</th>
                <th className="p-2">استفاده‌شده</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="p-2 font-mono">{it.word}</td>
                  <td className="p-2">{it.length}</td>
                  <td className="p-2">{it.used ? "بله" : "خیر"}</td>
                  <td className="p-2">
                    <button onClick={() => onDelete(it.id)} className="text-red-500 text-xs">
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
