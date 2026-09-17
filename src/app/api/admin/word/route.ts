import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AdminAuthError, type AdminRole } from "@/lib/auth";
import { isValidPersianWord, normalizePersian, DEFAULT_WORD_LENGTH } from "@/lib/persian";
import { tehranLocalInputToUtc, hoursFromNowUtc } from "@/lib/time";
import { getActiveWordEntry } from "@/lib/activeWord";

function computeExpiry(body: { expiryMode?: string; at?: string; hours?: number }): Date {
  if (body.expiryMode === "at" && body.at) {
    return tehranLocalInputToUtc(body.at);
  }
  const hours = Number(body.hours);
  if (!hours || hours <= 0 || hours > 24 * 30) {
    throw new Error("مدت اعتبار نامعتبر است");
  }
  return hoursFromNowUtc(hours);
}

/** Only SUPERADMIN can set a word whose length isn't 5, and only when they
 * explicitly opt in via allowCustomLength — everyone else is locked to 5. */
function assertLengthAllowed(length: number, role: AdminRole, allowCustomLength: boolean) {
  if (length === DEFAULT_WORD_LENGTH) return;
  if (role !== "SUPERADMIN") {
    throw new Error(`طول کلمه باید ${DEFAULT_WORD_LENGTH} حرف باشد (فقط ادمین‌کل می‌تواند طول دیگری تنظیم کند)`);
  }
  if (!allowCustomLength) {
    throw new Error(`طول کلمه باید ${DEFAULT_WORD_LENGTH} حرف باشد، مگر گزینه «طول دلخواه» را فعال کنید`);
  }
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    const active = await getActiveWordEntry();
    const history = await prisma.wordEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { createdBy: { select: { username: true } } },
    });

    const mask = (w: (typeof history)[number]) => ({
      id: w.id,
      word: w.hidden ? null : w.word,
      length: w.length,
      source: w.source,
      hidden: w.hidden,
      activatesAt: w.activatesAt,
      expiresAt: w.expiresAt,
      endedEarly: w.endedEarly,
      createdAt: w.createdAt,
      createdBy: w.createdBy?.username ?? null,
      playsStarted: w.playsStarted,
      playsWon: w.playsWon,
      playsLost: w.playsLost,
      isActive: w.id === active?.id,
    });

    return NextResponse.json({
      role: admin.role,
      active: active ? mask({ ...active, createdBy: null }) : null,
      history: history.map(mask),
    });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => null);
    const word = typeof body?.word === "string" ? body.word : "";

    if (!isValidPersianWord(word)) {
      return NextResponse.json({ error: "کلمه نامعتبر است (فقط حروف فارسی، حداقل ۲ حرف)" }, { status: 400 });
    }

    try {
      assertLengthAllowed(Array.from(normalizePersian(word)).length, admin.role, Boolean(body?.allowCustomLength));
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "خطا" }, { status: 400 });
    }

    let expiresAt: Date;
    try {
      expiresAt = computeExpiry(body);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "خطا" }, { status: 400 });
    }

    const now = new Date();
    await prisma.wordEntry.updateMany({
      where: { endedEarly: false, expiresAt: { gt: now }, activatesAt: { lte: now } },
      data: { endedEarly: true },
    });

    const normalized = normalizePersian(word);
    const created = await prisma.wordEntry.create({
      data: {
        word: normalized,
        length: Array.from(normalized).length,
        source: "MANUAL",
        hidden: false,
        activatesAt: now,
        expiresAt,
        createdById: admin.sub,
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "شناسه لازم است" }, { status: 400 });

    const existing = await prisma.wordEntry.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "پیدا نشد" }, { status: 404 });

    const data: { word?: string; length?: number; expiresAt?: Date } = {};

    if (typeof body?.word === "string" && body.word.length > 0) {
      if (existing.source === "AUTO") {
        return NextResponse.json({ error: "متن کلمهٔ خودکار قابل ویرایش نیست" }, { status: 400 });
      }
      if (!isValidPersianWord(body.word)) {
        return NextResponse.json({ error: "کلمه نامعتبر است" }, { status: 400 });
      }
      const normalized = normalizePersian(body.word);
      try {
        assertLengthAllowed(Array.from(normalized).length, admin.role, Boolean(body?.allowCustomLength));
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "خطا" }, { status: 400 });
      }
      data.word = normalized;
      data.length = Array.from(normalized).length;
    }

    if (body?.expiryMode) {
      try {
        data.expiresAt = computeExpiry(body);
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "خطا" }, { status: 400 });
      }
    }

    await prisma.wordEntry.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "شناسه لازم است" }, { status: 400 });
    await prisma.wordEntry.update({ where: { id }, data: { endedEarly: true } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
