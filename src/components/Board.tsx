"use client";

import type { LetterStatus } from "@/lib/persian";

export type BoardRow = {
  letters: string[];
  statuses?: LetterStatus[];
};

export function Board({
  length,
  maxGuesses,
  rows,
  currentGuess,
  shakeRow,
  bounceRow,
}: {
  length: number;
  maxGuesses: number;
  rows: BoardRow[];
  currentGuess: string[];
  shakeRow: number | null;
  bounceRow?: number | null;
}) {
  const allRows: BoardRow[] = [...rows];
  if (allRows.length < maxGuesses) {
    allRows.push({ letters: currentGuess });
  }
  while (allRows.length < maxGuesses) {
    allRows.push({ letters: [] });
  }

  const tileSize = length >= 8 ? 40 : length >= 6 ? 48 : 56;

  return (
    <div className="flex flex-col items-center gap-1.5" dir="rtl">
      {allRows.map((row, rIdx) => (
        <div
          key={rIdx}
          className={`flex gap-1.5 ${shakeRow === rIdx ? "shake" : ""}`}
        >
          {Array.from({ length }).map((_, cIdx) => {
            const letter = row.letters[cIdx] ?? "";
            const status = row.statuses?.[cIdx];
            const isBounce = bounceRow === rIdx && Boolean(status);
            return (
              <div
                key={cIdx}
                className="tile text-xl sm:text-2xl"
                style={{ width: tileSize, height: tileSize, ["--flip-delay" as string]: `${cIdx * 0.15}s` }}
                data-filled={letter ? "true" : "false"}
                data-status={status}
                data-flip={!isBounce && status ? "true" : "false"}
                data-bounce={isBounce ? "true" : "false"}
              >
                {letter}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
