import { cookies } from "next/headers";
import type { LetterStatus } from "./persian";

export const GAME_COOKIE = "wf_game";
export const MAX_GUESSES = 6;

export type GuessRecord = {
  guess: string;
  feedback: LetterStatus[];
};

export type GameSession = {
  wordEntryId: string;
  guesses: GuessRecord[];
  solved: boolean;
  failed: boolean;
};

export async function readGameSession(wordEntryId: string): Promise<GameSession> {
  const store = await cookies();
  const raw = store.get(GAME_COOKIE)?.value;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as GameSession;
      if (parsed.wordEntryId === wordEntryId) return parsed;
    } catch {
      // ignore malformed cookie
    }
  }
  return { wordEntryId, guesses: [], solved: false, failed: false };
}

export async function writeGameSession(session: GameSession, expiresAt: Date) {
  const store = await cookies();
  store.set(GAME_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}
