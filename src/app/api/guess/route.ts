import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveWordEntry } from "@/lib/activeWord";
import { readGameSession, writeGameSession, MAX_GUESSES } from "@/lib/gameSession";
import { computeFeedback, isValidPersianWord, normalizePersian } from "@/lib/persian";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const guess = typeof body?.guess === "string" ? body.guess : "";

  const entry = await getActiveWordEntry();
  if (!entry) {
    return NextResponse.json({ error: "در حال حاضر کلمه‌ای فعال نیست" }, { status: 400 });
  }

  if (!isValidPersianWord(guess, entry.length)) {
    return NextResponse.json(
      { error: `حدس باید ${entry.length} حرف فارسی باشد` },
      { status: 400 }
    );
  }

  const normalizedGuess = normalizePersian(guess);
  const normalizedAnswer = normalizePersian(entry.word);

  // Reject guesses that aren't real words — unless it happens to be the exact
  // answer, which must always be guessable even if it's missing from the
  // dictionary (e.g. a custom word an admin typed in manually).
  if (normalizedGuess !== normalizedAnswer) {
    const inDictionary = await prisma.guessDictionary.findUnique({ where: { word: normalizedGuess } });
    if (!inDictionary) {
      return NextResponse.json({ error: "این کلمه در فرهنگ لغت نیست" }, { status: 400 });
    }
  }

  const session = await readGameSession(entry.id);

  if (session.solved || session.failed) {
    return NextResponse.json({ error: "این دور بازی تمام شده است" }, { status: 400 });
  }
  if (session.guesses.length >= MAX_GUESSES) {
    return NextResponse.json({ error: "تعداد حدس‌ها تمام شده است" }, { status: 400 });
  }

  const isFirstGuess = session.guesses.length === 0;

  const feedback = computeFeedback(guess, entry.word);
  const solved = normalizedGuess === normalizedAnswer;

  session.guesses.push({ guess: normalizedGuess, feedback });
  session.solved = solved;
  const failed = !solved && session.guesses.length >= MAX_GUESSES;
  session.failed = failed;

  await writeGameSession(session, entry.expiresAt);

  const dataUpdate: { playsStarted?: { increment: number }; playsWon?: { increment: number }; playsLost?: { increment: number } } = {};
  if (isFirstGuess) dataUpdate.playsStarted = { increment: 1 };
  if (solved) dataUpdate.playsWon = { increment: 1 };
  if (failed) dataUpdate.playsLost = { increment: 1 };
  if (Object.keys(dataUpdate).length > 0) {
    await prisma.wordEntry.update({ where: { id: entry.id }, data: dataUpdate });
  }

  return NextResponse.json({
    wordId: entry.id,
    feedback,
    guesses: session.guesses,
    solved,
    failed,
    answer: solved || failed ? entry.word : undefined,
  });
}
