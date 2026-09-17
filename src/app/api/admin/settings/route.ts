import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/auth";
import { rotateAutoWord } from "@/lib/rotate";
import { getActiveWordEntry } from "@/lib/activeWord";

export async function GET() {
  try {
    await requireAdmin();
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
    const poolCounts = await prisma.poolWord.groupBy({
      by: ["length"],
      where: { used: false },
      _count: true,
    });
    return NextResponse.json({ settings, poolCounts });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin("SUPERADMIN");
    const body = await req.json().catch(() => null);
    const autoModeEnabled = Boolean(body?.autoModeEnabled);
    const autoModeLength =
      body?.autoModeLength === null || body?.autoModeLength === undefined || body?.autoModeLength === ""
        ? null
        : Number(body.autoModeLength);

    await prisma.settings.upsert({
      where: { id: 1 },
      update: { autoModeEnabled, autoModeLength },
      create: { id: 1, autoModeEnabled, autoModeLength },
    });

    let rotateResult = null;
    if (autoModeEnabled) {
      const active = await getActiveWordEntry();
      if (!active) rotateResult = await rotateAutoWord();
    }

    return NextResponse.json({ ok: true, rotateResult });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
