"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Board, type BoardRow } from "@/components/Board";
import { Keyboard } from "@/components/Keyboard";
import { HowToPlayModal } from "@/components/HowToPlayModal";
import { StatsModal } from "@/components/StatsModal";
import { Confetti } from "@/components/Confetti";
import { KEYBOARD_ROWS, findHardModeViolation, type LetterStatus } from "@/lib/persian";
import { readStats, recordResult, readHardMode, writeHardMode, type Stats } from "@/lib/stats";
import { formatTehranWhen } from "@/lib/clientTime";

const MAX_GUESSES = 6;
const ALLOWED_CHARS = new Set(KEYBOARD_ROWS.join("").split(""));
const SEEN_HOWTO_KEY = "wf_seen_howto";

type StateResponse =
  | { active: false }
  | {
      active: true;
      wordId: string;
      length: number;
      expiresAt: string;
      guesses: { guess: string; feedback: LetterStatus[] }[];
      solved: boolean;
      failed: boolean;
      answer?: string;
    };

const DRAFT_KEY = "wf_draft";

function readDraft(wordId: string, length: number): string[] {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return [];
    const d = JSON.parse(raw) as { wordId: string; letters: string[] };
    if (d.wordId !== wordId || !Array.isArray(d.letters)) return [];
    return d.letters.filter((c) => ALLOWED_CHARS.has(c)).slice(0, length);
  } catch {
    return [];
  }
}

function writeDraft(wordId: string, letters: string[]) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ wordId, letters }));
  } catch {
    // ignore
  }
}

function statusPriority(s: LetterStatus): number {
  if (s === "correct") return 3;
  if (s === "present") return 2;
  return 1;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "۰۰:۰۰:۰۰";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [wordId, setWordId] = useState<string | null>(null);
  const [length, setLength] = useState(5);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [shakeRow, setShakeRow] = useState<number | null>(null);
  const [bounceRow, setBounceRow] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [showHowTo, setShowHowTo] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hardMode, setHardMode] = useState(false);
  const [stats, setStats] = useState<Stats>(() => readStats());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoModalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);
  const wordIdRef = useRef<string | null>(null);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  // Persist the in-progress guess so a page reload / discarded mobile tab
  // doesn't lose what was typed.
  useEffect(() => {
    if (wordId) writeDraft(wordId, currentGuess);
  }, [wordId, currentGuess]);

  useEffect(() => {
    setHardMode(readHardMode());
    try {
      if (!window.localStorage.getItem(SEEN_HOWTO_KEY)) {
        setShowHowTo(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const loadState = useCallback(async () => {
    // Skip the background refresh while a guess is being submitted, so it
    // can't race with (and overwrite) the just-submitted row.
    if (submittingRef.current) return;
    const res = await fetch("/api/state", { cache: "no-store" });
    const data: StateResponse = await res.json();
    if (!data.active) {
      setActive(false);
      setLoading(false);
      return;
    }
    setActive(true);
    setLength(data.length);
    setExpiresAt(data.expiresAt);
    setRows(data.guesses.map((g) => ({ letters: Array.from(g.guess), statuses: g.feedback })));
    setSolved(data.solved);
    setFailed(data.failed);
    setAnswer(data.answer ?? null);
    setLoading(false);

    // Only touch in-progress typing when the active word actually changed.
    // (This also runs on a 30s background poll — it must never wipe what the
    // player is mid-typing.) On the very first load we restore the saved
    // draft so typing survives the phone browser reloading/discarding the tab.
    if (wordIdRef.current !== data.wordId) {
      const isFirstLoad = wordIdRef.current === null;
      wordIdRef.current = data.wordId;
      setWordId(data.wordId);
      if (isFirstLoad && !data.solved && !data.failed) {
        setCurrentGuess(readDraft(data.wordId, data.length));
      } else {
        setCurrentGuess([]);
      }
    }

    if ((data.solved || data.failed) && data.wordId) {
      const updated = recordResult(data.wordId, data.solved, data.guesses.length);
      setStats(updated);
    }
  }, []);

  useEffect(() => {
    loadState();
    const poll = setInterval(loadState, 30000);
    return () => clearInterval(poll);
  }, [loadState]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const gameOver = solved || failed;

  function closeHowTo() {
    setShowHowTo(false);
    try {
      window.localStorage.setItem(SEEN_HOWTO_KEY, "1");
    } catch {
      // ignore
    }
  }

  const submitGuess = useCallback(async () => {
    if (submitting || gameOver) return;
    if (currentGuess.length !== length) {
      setShakeRow(rows.length);
      showToast(`حدس باید ${length} حرف باشد`);
      setTimeout(() => setShakeRow(null), 500);
      return;
    }

    if (hardMode && rows.length > 0) {
      const violation = findHardModeViolation(
        currentGuess.join(""),
        rows.map((r) => ({ letters: r.letters, statuses: r.statuses ?? [] }))
      );
      if (violation) {
        setShakeRow(rows.length);
        showToast(violation);
        setTimeout(() => setShakeRow(null), 500);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess: currentGuess.join("") }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShakeRow(rows.length);
        showToast(data.error || "خطا");
        setTimeout(() => setShakeRow(null), 500);
        return;
      }
      const finishedRowIndex = rows.length;
      setRows((prev) => [...prev, { letters: currentGuess, statuses: data.feedback }]);
      setCurrentGuess([]);
      setSolved(data.solved);
      setFailed(data.failed);
      if (data.answer) setAnswer(data.answer);

      if (data.solved || data.failed) {
        const updated = recordResult(data.wordId ?? wordId, data.solved, data.guesses.length);
        setStats(updated);
        if (autoModalTimer.current) clearTimeout(autoModalTimer.current);
        if (data.solved) {
          setBounceRow(finishedRowIndex);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2600);
          autoModalTimer.current = setTimeout(() => setShowStats(true), 1500);
        } else {
          autoModalTimer.current = setTimeout(() => setShowStats(true), 1200);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, gameOver, currentGuess, length, rows, hardMode, showToast, wordId]);

  const handleKey = useCallback(
    (key: string) => {
      if (gameOver || submitting) return;
      if (key === "ENTER") {
        submitGuess();
        return;
      }
      if (key === "BACK") {
        setCurrentGuess((prev) => prev.slice(0, -1));
        return;
      }
      if (ALLOWED_CHARS.has(key)) {
        setCurrentGuess((prev) => (prev.length < length ? [...prev, key] : prev));
      }
    },
    [gameOver, submitting, length, submitGuess]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") {
        handleKey("ENTER");
        return;
      }
      if (e.key === "Backspace") {
        handleKey("BACK");
        return;
      }
      if (ALLOWED_CHARS.has(e.key)) {
        handleKey(e.key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  const keyStatuses = useMemo(() => {
    const map: Record<string, LetterStatus> = {};
    for (const row of rows) {
      row.letters.forEach((letter, i) => {
        const status = row.statuses?.[i];
        if (!status) return;
        const current = map[letter];
        if (!current || statusPriority(status) > statusPriority(current)) {
          map[letter] = status;
        }
      });
    }
    return map;
  }, [rows]);

  const remainingMs = expiresAt ? new Date(expiresAt).getTime() - now : 0;

  const shareText = useMemo(() => {
    const grid = rows
      .map((row) =>
        (row.statuses ?? [])
          .map((s) => (s === "correct" ? "🟩" : s === "present" ? "🟨" : "⬜"))
          .join("")
      )
      .join("\n");
    const site = typeof window !== "undefined" ? window.location.host : "";
    return `وردل فارسی ${solved ? rows.length : "X"}/${MAX_GUESSES}\n${grid}${site ? `\n${site}` : ""}`;
  }, [rows, solved]);

  const copyResult = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      showToast("نتیجه کپی شد");
    } catch {
      showToast("کپی نشد");
    }
  }, [shareText, showToast]);

  function toggleHardMode() {
    if (rows.length > 0) {
      showToast("حالت سخت فقط قبل از اولین حدس قابل تغییر است");
      return;
    }
    const next = !hardMode;
    setHardMode(next);
    writeHardMode(next);
    showToast(next ? "حالت سخت فعال شد" : "حالت سخت غیرفعال شد");
  }

  return (
    <>
      <header className="game-header">
        <span className="game-logo">وردل فارسی</span>
        <div className="flex items-center gap-2">
          {active && (
            <button
              onClick={toggleHardMode}
              className="icon-btn"
              style={{ width: "auto", padding: "0 0.6rem", fontSize: "0.75rem", fontWeight: 700, opacity: rows.length > 0 ? 0.5 : 1 }}
              title="حالت سخت"
            >
              {hardMode ? "🔥 سخت" : "سخت"}
            </button>
          )}
          <button onClick={() => setShowStats(true)} className="icon-btn" aria-label="آمار" title="آمار">
            📊
          </button>
          <button onClick={() => setShowHowTo(true)} className="icon-btn" aria-label="راهنما" title="راهنما">
            ؟
          </button>
        </div>
      </header>

      {toast && <div className="toast">{toast}</div>}
      {showConfetti && <Confetti />}

      {loading ? (
        <main className="flex-1 flex items-center justify-center">
          <p className="text-lg opacity-70">در حال بارگذاری...</p>
        </main>
      ) : !active ? (
        <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="text-6xl">🤷‍♂️</div>
          <p className="text-lg opacity-80">در حال حاضر کلمه‌ی جدیدی تعریف نشده است.</p>
          <p className="opacity-60">کمی بعد دوباره سر بزن!</p>
        </main>
      ) : (
        <main className="flex-1 flex flex-col items-center gap-5 px-3 py-5 max-w-2xl mx-auto w-full">
          {expiresAt && !gameOver && (
            <p className="text-sm opacity-70 -mb-2 text-center">
              کلمهٔ بعدی {formatTehranWhen(expiresAt)} (به وقت تهران) می‌آید
              <br />
              <span className="font-mono opacity-60">{formatRemaining(remainingMs)}</span> دیگر مانده
            </p>
          )}

          <div className="board-card">
            <Board
              length={length}
              maxGuesses={MAX_GUESSES}
              rows={rows}
              currentGuess={currentGuess}
              shakeRow={shakeRow}
              bounceRow={bounceRow}
            />
          </div>

          {gameOver ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-xl font-bold">
                {solved ? "آفرین! برنده شدید 🎉" : `باختید 😔 کلمه: ${answer}`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={copyResult}
                  className="key px-5 py-2.5 text-sm font-bold"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  کپی نتیجه
                </button>
                <button onClick={() => setShowStats(true)} className="key px-5 py-2.5 text-sm font-bold">
                  مشاهده آمار
                </button>
              </div>
            </div>
          ) : (
            <Keyboard onKey={handleKey} keyStatuses={keyStatuses} disabled={submitting} />
          )}
        </main>
      )}

      {showHowTo && <HowToPlayModal onClose={closeHowTo} length={length} />}
      {showStats && (
        <StatsModal
          stats={stats}
          gameOver={gameOver}
          solved={solved}
          currentGuessCount={rows.length}
          answer={answer}
          expiresAt={expiresAt}
          onShare={gameOver ? copyResult : undefined}
          onClose={() => setShowStats(false)}
        />
      )}
    </>
  );
}
