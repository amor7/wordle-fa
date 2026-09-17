import { NextResponse } from "next/server";
import { getActiveWordEntry } from "@/lib/activeWord";
import { readGameSession } from "@/lib/gameSession";

export async function GET() {
  const entry = await getActiveWordEntry();

  if (!entry) {
    return NextResponse.json({ active: false });
  }

  const session = await readGameSession(entry.id);

  return NextResponse.json({
    active: true,
    wordId: entry.id,
    length: entry.length,
    expiresAt: entry.expiresAt,
    guesses: session.guesses,
    solved: session.solved,
    failed: session.failed,
    answer: session.solved || session.failed ? entry.word : undefined,
  });
}
