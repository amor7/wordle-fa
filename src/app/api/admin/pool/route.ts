import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/auth";
import { normalizePersian, isValidPersianWord } from "@/lib/persian";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const length = searchParams.get("length");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(200, Math.max(10, Number(searchParams.get("pageSize")) || 50));

    const where = {
      ...(search ? { word: { contains: search } } : {}),
      ...(length ? { length: Number(length) } : {}),
    };

    const [items, total, byLength] = await Promise.all([
      prisma.poolWord.findMany({
        where,
        orderBy: { word: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.poolWord.count({ where }),
      prisma.poolWord.groupBy({
        by: ["length", "used"],
        _count: true,
      }),
    ]);

    return NextResponse.json({ items, total, page, pageSize, byLength });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json().catch(() => null);
    const rawWords: string[] = Array.isArray(body?.words)
      ? body.words
      : typeof body?.word === "string"
        ? [body.word]
        : [];

    const candidates = Array.from(
      new Set(
        rawWords
          .map((w) => normalizePersian(String(w)))
          .filter((w) => w.length > 0)
      )
    );

    let added = 0;
    let invalid = 0;
    let duplicate = 0;

    for (const word of candidates) {
      if (!isValidPersianWord(word)) {
        invalid++;
        continue;
      }
      const length = Array.from(word).length;
      try {
        await prisma.poolWord.create({ data: { word, length } });
        added++;
      } catch {
        duplicate++;
      }
    }

    return NextResponse.json({ ok: true, added, invalid, duplicate });
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
    await prisma.poolWord.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
