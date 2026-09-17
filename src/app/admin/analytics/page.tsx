"use client";

import { useEffect, useState } from "react";

type DayBucket = {
  date: string;
  playsStarted: number;
  playsWon: number;
  playsLost: number;
  words: number;
};

type Totals = {
  playsStarted: number;
  playsWon: number;
  playsLost: number;
  totalWords: number;
  manualWords: number;
  autoWords: number;
};

function BarChart({ days }: { days: DayBucket[] }) {
  if (days.length === 0) {
    return <p className="opacity-60 text-sm">هنوز داده‌ای برای نمایش نیست.</p>;
  }

  const width = 720;
  const height = 220;
  const padding = { top: 10, bottom: 24, left: 8, right: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(1, ...days.map((d) => d.playsStarted));
  const barGap = 4;
  const barW = Math.max(4, chartW / days.length - barGap);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: Math.max(width, days.length * (barW + barGap) + padding.left + padding.right), height }}
        role="img"
        aria-label="نمودار بازی‌های روزانه"
      >
        {days.map((d, i) => {
          const x = padding.left + i * (barW + barGap);
          const startedH = (d.playsStarted / maxVal) * chartH;
          const wonH = (d.playsWon / maxVal) * chartH;
          const yBase = padding.top + chartH;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={yBase - startedH}
                width={barW}
                height={startedH}
                rx={2}
                fill="var(--absent)"
                opacity={0.45}
              />
              <rect x={x} y={yBase - wonH} width={barW} height={wonH} rx={2} fill="var(--correct)" />
              {i % Math.ceil(days.length / 8 || 1) === 0 && (
                <text
                  x={x + barW / 2}
                  y={height - 6}
                  fontSize="9"
                  textAnchor="middle"
                  fill="var(--muted)"
                >
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex gap-4 text-xs mt-1 opacity-70">
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm ml-1" style={{ background: "var(--correct)" }} /> برد</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm ml-1" style={{ background: "var(--absent)", opacity: 0.45 }} /> کل شروع بازی</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<DayBucket[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setDays(data.days ?? []);
        setTotals(data.totals ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="flex-1 p-6">در حال بارگذاری...</main>;

  const winRate = totals && totals.playsStarted > 0 ? Math.round((totals.playsWon / totals.playsStarted) * 100) : 0;

  return (
    <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full flex flex-col gap-6" dir="rtl">
      <h1 className="text-2xl font-extrabold">آمار و تحلیل</h1>

      {totals && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "کل کلمات", value: totals.totalWords },
            { label: "کل شروع بازی", value: totals.playsStarted },
            { label: "کل برد", value: totals.playsWon },
            { label: "٪ برد کلی", value: winRate },
          ].map((c) => (
            <div key={c.label} className="border rounded-xl p-4 text-center" style={{ borderColor: "var(--border)" }}>
              <div className="text-2xl font-extrabold">{c.value}</div>
              <div className="text-xs opacity-60 mt-1">{c.label}</div>
            </div>
          ))}
        </section>
      )}

      <section className="border rounded-xl p-5" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold mb-3">روند ۳۰ روز اخیر</h2>
        <BarChart days={days} />
      </section>

      {totals && (
        <p className="text-sm opacity-60">
          {totals.manualWords} کلمهٔ دستی، {totals.autoWords} کلمهٔ خودکار تا کنون تعریف شده است.
        </p>
      )}
    </main>
  );
}
