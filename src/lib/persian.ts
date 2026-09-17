export const DEFAULT_WORD_LENGTH = 5;

export const KEYBOARD_ROWS: string[] = [
  "ضصثقفغعهخحجچ",
  "شسیبلاتنمکگ",
  "ظطزرذدپوژآ",
];

const ARABIC_TO_PERSIAN: Record<string, string> = {
  "ي": "ی", // ي -> ی
  "ك": "ک", // ك -> ک
  "ة": "ه", // ة -> ه
  "ۀ": "ه", // ۀ -> ه (rough)
};

const DIACRITICS_AND_ZWNJ = /[ً-ٰٟ‌‏‎]/g;

export function normalizePersian(input: string): string {
  let out = "";
  for (const ch of input) {
    out += ARABIC_TO_PERSIAN[ch] ?? ch;
  }
  out = out.normalize("NFC").replace(DIACRITICS_AND_ZWNJ, "");
  return out.trim();
}

export function toChars(word: string): string[] {
  return Array.from(normalizePersian(word));
}

export function isValidPersianWord(word: string, expectedLength?: number): boolean {
  const chars = toChars(word);
  if (chars.length < 2 || chars.length > 12) return false;
  if (expectedLength && chars.length !== expectedLength) return false;
  const allowed = new Set(KEYBOARD_ROWS.join("").split(""));
  return chars.every((c) => allowed.has(c));
}

export type LetterStatus = "correct" | "present" | "absent";

/** Wordle-style per-letter feedback, correctly handling duplicate letters. */
export function computeFeedback(guess: string, answer: string): LetterStatus[] {
  const guessChars = toChars(guess);
  const answerChars = toChars(answer);
  const len = answerChars.length;
  const result: LetterStatus[] = new Array(len).fill("absent");

  const remaining = new Map<string, number>();
  for (const c of answerChars) remaining.set(c, (remaining.get(c) ?? 0) + 1);

  for (let i = 0; i < len; i++) {
    if (guessChars[i] === answerChars[i]) {
      result[i] = "correct";
      remaining.set(guessChars[i], (remaining.get(guessChars[i]) ?? 0) - 1);
    }
  }

  for (let i = 0; i < len; i++) {
    if (result[i] === "correct") continue;
    const c = guessChars[i];
    const left = remaining.get(c) ?? 0;
    if (left > 0) {
      result[i] = "present";
      remaining.set(c, left - 1);
    }
  }

  return result;
}

export type HardModeRow = { letters: string[]; statuses: LetterStatus[] };

/** Checks a new guess against hard-mode constraints derived from prior rows:
 * any letter revealed "correct" must stay in that spot, and any letter
 * revealed "present" must appear somewhere in the new guess. Returns a
 * human-readable Persian violation message, or null if the guess is fine. */
export function findHardModeViolation(guess: string, priorRows: HardModeRow[]): string | null {
  const guessChars = toChars(guess);

  const requiredAt = new Map<number, string>();
  const requiredCounts = new Map<string, number>();

  for (const row of priorRows) {
    const countsThisRow = new Map<string, number>();
    row.letters.forEach((letter, i) => {
      const status = row.statuses[i];
      if (status === "correct") {
        requiredAt.set(i, letter);
        countsThisRow.set(letter, (countsThisRow.get(letter) ?? 0) + 1);
      } else if (status === "present") {
        countsThisRow.set(letter, (countsThisRow.get(letter) ?? 0) + 1);
      }
    });
    for (const [letter, count] of countsThisRow) {
      requiredCounts.set(letter, Math.max(requiredCounts.get(letter) ?? 0, count));
    }
  }

  for (const [pos, letter] of requiredAt) {
    if (guessChars[pos] !== letter) {
      return `حرف ${pos + 1} باید «${letter}» باشد`;
    }
  }

  for (const [letter, count] of requiredCounts) {
    const have = guessChars.filter((c) => c === letter).length;
    if (have < count) {
      return `حدس باید شامل حرف «${letter}» باشد`;
    }
  }

  return null;
}
