"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type PoolItem = { id: string; word: string; length: number; used: boolean };
type ByLength = { length: number; used: boolean; _count: number };

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];

export default function PoolPage() {
  const [items, setItems] = useState<PoolItem[]>([]);
  const [total, setTotal] = useState(0);
  const [byLength, setByLength] = useState<ByLength[]>([]);
  const [search, setSearch] = useState("");
  const [lengthFilter, setLengthFilter] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [bulkText, setBulkText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (lengthFilter) params.set("length", String(lengthFilter));
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    const res = await fetch(`/api/admin/pool?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (res.ok) {
      setItems(data.items);
      setTotal(data.total);
      setByLength(data.byLength);
    }
  }, [search, lengthFilter, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  // Any filter/page-size change should jump back to page 1.
  useEffect(() => {
    setPage(1);
  }, [search, lengthFilter, pageSize]);

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

  const lengthCounts = useMemo(() => {
    const m = new Map<number, { used: number; unused: number }>();
    for (const b of byLength) {
      const entry = m.get(b.length) ?? { used: 0, unused: 0 };
      if (b.used) entry.used = b._count;
      else entry.unused = b._count;
      m.set(b.length, entry);
    }
    return m;
  }, [byLength]);

  const sortedLengths = useMemo(
    () => Array.from(lengthCounts.entries()).sort((a, b) => a[0] - b[0]),
    [lengthCounts]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full flex flex-col gap-6" dir="rtl">
      <h1 className="text-2xl font-extrabold">بانک کلمات</h1>
      <p className="text-sm opacity-70">
        این لیست هم برای «حالت انتخاب خودکار» استفاده می‌شود. کلمه‌های بیشتری اضافه کنید تا تنوع بازی بیشتر شود.
      </p>

      <section className="flex flex-col gap-2">
        <span className="text-sm font-semibold">فیلتر بر اساس طول</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setLengthFilter(null)}
            className="key px-3 py-1.5 text-xs"
            style={
              lengthFilter === null
                ? { background: "var(--accent)", color: "white" }
                : undefined
            }
          >
            همه ({total})
          </button>
          {sortedLengths.map(([len, c]) => (
            <button
              key={len}
              onClick={() => setLengthFilter(len)}
              className="key px-3 py-1.5 text-xs"
              style={
                lengthFilter === len
                  ? { background: "var(--accent)", color: "white" }
                  : undefined
              }
              title={`${c.unused} آزاد / ${c.used} استفاده‌شده`}
            >
              {len} حرفی ({c.unused + c.used})
            </button>
          ))}
        </div>
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
        <div className="flex flex-wrap gap-2 items-center">
          <input
            placeholder="جستجو..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-transparent flex-1 min-w-[150px]"
            style={{ borderColor: "var(--border)" }}
          />
          <label className="flex items-center gap-1.5 text-sm">
            نمایش
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border rounded-lg px-2 py-2 bg-transparent"
              style={{ borderColor: "var(--border)" }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} تا
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto border rounded-lg" style={{ borderColor: "var(--border)" }}>
          <table className="w-full text-sm border-collapse">
            <thead style={{ background: "var(--background)" }}>
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
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center opacity-60">
                    کلمه‌ای پیدا نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="opacity-60">
            {total === 0 ? "۰ نتیجه" : `نمایش ${rangeStart} تا ${rangeEnd} از ${total}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="key px-3 py-1.5 text-xs disabled:opacity-40"
            >
              قبلی
            </button>
            <span className="opacity-70">
              صفحهٔ {page} از {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="key px-3 py-1.5 text-xs disabled:opacity-40"
            >
              بعدی
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
