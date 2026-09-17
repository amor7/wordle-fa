"use client";

import { useMemo } from "react";

const COLORS = ["#6aaa64", "#c9b458", "#4f9de8", "#e8724f", "#a86ee0"];

export function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 2.2 + Math.random() * 1.2,
        color: COLORS[i % COLORS.length],
        rotate: Math.random() * 360,
        size: 6 + Math.random() * 6,
      })),
    []
  );

  return (
    <div className="confetti-root" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            background: p.color,
            width: p.size,
            height: p.size * 0.4,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
