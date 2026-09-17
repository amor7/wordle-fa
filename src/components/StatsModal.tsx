"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import type { Stats } from "@/lib/stats";
import { formatTehranWhen } from "@/lib/clientTime";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "۰۰:۰۰:۰۰";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function StatsModal({
  stats,
  gameOver,
  solved,
  currentGuessCount,
  answer,
  expiresAt,
  onShare,
  onClose,
}: {
  stats: Stats;
  gameOver: boolean;
  solved: boolean;
  currentGuessCount: number;
  answer?: string | null;
  expiresAt?: string | null;
  onShare?: () => void;
  onClose: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const winPct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const maxDist = Math.max(1, ...stats.distribution);
  const remainingMs = expiresAt ? new Date(expiresAt).getTime() - now : 0;

  return (
    <Modal title="آمار شما" onClose={onClose}>
      {gameOver && (
        <div className="stats-result">
          <p className="stats-result-title">
            {solved ? "🎉 آفرین، برنده شدید!" : "😔 این دفعه نشد"}
          </p>
          {answer && (
            <p className="opacity-80">
              کلمه: <span className="font-mono font-bold">{answer}</span>
            </p>
          )}
        </div>
      )}

      <div className="stats-grid">
        <div className="stats-cell">
          <div className="stats-num">{stats.played}</div>
          <div className="stats-label">بازی</div>
        </div>
        <div className="stats-cell">
          <div className="stats-num">{winPct}</div>
          <div className="stats-label">٪ برد</div>
        </div>
        <div className="stats-cell">
          <div className="stats-num">{stats.currentStreak}</div>
          <div className="stats-label">برد پیاپی</div>
        </div>
        <div className="stats-cell">
          <div className="stats-num">{stats.maxStreak}</div>
          <div className="stats-label">بهترین رکورد</div>
        </div>
      </div>

      <h3 className="font-bold mt-2">توزیع حدس‌ها</h3>
      <div className="dist-chart">
        {stats.distribution.map((count, i) => {
          const rowNumber = i + 1;
          const isThisGame = gameOver && solved && currentGuessCount === rowNumber;
          const width = count === 0 ? 8 : Math.max(8, (count / maxDist) * 100);
          return (
            <div key={i} className="dist-row">
              <span className="dist-row-label">{rowNumber}</span>
              <div className="dist-bar-track">
                <div
                  className={`dist-bar ${isThisGame ? "dist-bar-current" : ""}`}
                  style={{ width: `${width}%` }}
                >
                  <span className="dist-bar-count">{count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {expiresAt && (
        <div className="stats-next">
          <span>کلمهٔ بعدی {formatTehranWhen(expiresAt)}</span>
          <span className="font-mono font-bold">{formatCountdown(remainingMs)}</span>
        </div>
      )}

      {gameOver && onShare && (
        <button onClick={onShare} className="key py-2.5 font-bold mt-2" style={{ background: "var(--accent)", color: "white" }}>
          کپی نتیجه 🔗
        </button>
      )}
    </Modal>
  );
}
