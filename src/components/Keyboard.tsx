"use client";

import { KEYBOARD_ROWS } from "@/lib/persian";
import type { LetterStatus } from "@/lib/persian";

export function Keyboard({
  onKey,
  keyStatuses,
  disabled,
}: {
  onKey: (key: string) => void;
  keyStatuses: Record<string, LetterStatus>;
  disabled?: boolean;
}) {
  // Persian keyboards (physical and mobile) reuse the QWERTY key positions as-is —
  // they are NOT mirrored for right-to-left reading. ض sits at the Q position
  // (visually leftmost), چ at the P position (visually rightmost), same as a
  // real phone's Persian keyboard. So this row renders left-to-right (dir="ltr"),
  // even though the rest of the page is RTL.
  const rows: string[][] = [
    KEYBOARD_ROWS[0].split(""),
    KEYBOARD_ROWS[1].split(""),
    ["ENTER", ...KEYBOARD_ROWS[2].split(""), "BACK"],
  ];

  return (
    <div dir="ltr" className="flex flex-col gap-1.5 w-full max-w-lg select-none">
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex gap-1 justify-center"
          style={i === 1 ? { paddingInline: "3%" } : undefined}
        >
          {row.map((key) => {
            const isWide = key === "ENTER" || key === "BACK";
            const status = keyStatuses[key];
            const label = key === "ENTER" ? "ورود" : key === "BACK" ? "⌫" : key;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => onKey(key)}
                data-status={status}
                className={`key h-12 sm:h-14 text-sm sm:text-base ${
                  isWide ? "px-2 flex-[1.6]" : "flex-1"
                } ${disabled ? "opacity-50" : ""}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
