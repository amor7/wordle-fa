"use client";

const KEY = "wf_stats_v1";

export type Stats = {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  distribution: number[]; // index 0..5 => guesses 1..6
  lastWordEntryId: string | null;
  lastResultDate: string | null; // ISO date, for display only
};

const EMPTY: Stats = {
  played: 0,
  won: 0,
  currentStreak: 0,
  maxStreak: 0,
  distribution: [0, 0, 0, 0, 0, 0],
  lastWordEntryId: null,
  lastResultDate: null,
};

export function readStats(): Stats {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

function writeStats(stats: Stats) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // ignore (private browsing / storage disabled)
  }
}

/** Record the outcome of a finished game, once, keyed by wordEntryId so a page
 * refresh never double-counts the same puzzle. */
export function recordResult(wordEntryId: string, won: boolean, guessCount: number): Stats {
  const stats = readStats();
  if (stats.lastWordEntryId === wordEntryId) return stats; // already recorded
  const next: Stats = {
    ...stats,
    played: stats.played + 1,
    won: stats.won + (won ? 1 : 0),
    currentStreak: won ? stats.currentStreak + 1 : 0,
    lastWordEntryId: wordEntryId,
    lastResultDate: new Date().toISOString(),
    distribution: [...stats.distribution],
  };
  next.maxStreak = Math.max(next.maxStreak, next.currentStreak);
  if (won && guessCount >= 1 && guessCount <= 6) {
    next.distribution[guessCount - 1] += 1;
  }
  writeStats(next);
  return next;
}

const HARD_MODE_KEY = "wf_hard_mode";

export function readHardMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(HARD_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeHardMode(enabled: boolean) {
  try {
    window.localStorage.setItem(HARD_MODE_KEY, enabled ? "1" : "0");
  } catch {
    // ignore
  }
}
