import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/auth";
import { DateTime } from "luxon";
import { TEHRAN_ZONE } from "@/lib/time";

export async function GET() {
  try {
    await requireAdmin();

    const entries = await prisma.wordEntry.findMany({
      select: {
        activatesAt: true,
        source: true,
        playsStarted: true,
        playsWon: true,
        playsLost: true,
      },
      orderBy: { activatesAt: "asc" },
    });

    const byDate = new Map<
      string,
      { date: string; playsStarted: number; playsWon: number; playsLost: number; words: number }
    >();

    for (const e of entries) {
      const date = DateTime.fromJSDate(e.activatesAt, { zone: TEHRAN_ZONE }).toFormat("yyyy-LL-dd");
      const bucket = byDate.get(date) ?? { date, playsStarted: 0, playsWon: 0, playsLost: 0, words: 0 };
      bucket.playsStarted += e.playsStarted;
      bucket.playsWon += e.playsWon;
      bucket.playsLost += e.playsLost;
      bucket.words += 1;
      byDate.set(date, bucket);
    }

    const days = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);

    const totals = entries.reduce(
      (acc, e) => {
        acc.playsStarted += e.playsStarted;
        acc.playsWon += e.playsWon;
        acc.playsLost += e.playsLost;
        return acc;
      },
      { playsStarted: 0, playsWon: 0, playsLost: 0 }
    );

    const totalWords = entries.length;
    const autoWords = entries.filter((e) => e.source === "AUTO").length;

    return NextResponse.json({
      days,
      totals: { ...totals, totalWords, manualWords: totalWords - autoWords, autoWords },
    });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
