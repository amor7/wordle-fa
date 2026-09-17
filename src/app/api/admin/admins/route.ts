import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin("SUPERADMIN");
    const admins = await prisma.adminUser.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ admins });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin("SUPERADMIN");
    const body = await req.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const role = body?.role === "SUPERADMIN" ? "SUPERADMIN" : "ADMIN";

    if (username.length < 3 || password.length < 8) {
      return NextResponse.json(
        { error: "نام کاربری حداقل ۳ کاراکتر و رمز عبور حداقل ۸ کاراکتر باشد" },
        { status: 400 }
      );
    }

    const existing = await prisma.adminUser.findUnique({ where: { username } });
    if (existing) return NextResponse.json({ error: "این نام کاربری قبلاً استفاده شده" }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 12);
    const created = await prisma.adminUser.create({
      data: { username, passwordHash, role },
      select: { id: true, username: true, role: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, admin: created });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin("SUPERADMIN");
    const body = await req.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "شناسه لازم است" }, { status: 400 });

    const data: { passwordHash?: string; role?: "ADMIN" | "SUPERADMIN" } = {};
    if (typeof body?.password === "string" && body.password.length > 0) {
      if (body.password.length < 8) {
        return NextResponse.json({ error: "رمز عبور حداقل ۸ کاراکتر باشد" }, { status: 400 });
      }
      data.passwordHash = await bcrypt.hash(body.password, 12);
    }
    if (body?.role === "ADMIN" || body?.role === "SUPERADMIN") {
      data.role = body.role;
    }

    await prisma.adminUser.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireAdmin("SUPERADMIN");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "شناسه لازم است" }, { status: 400 });
    if (id === session.sub) {
      return NextResponse.json({ error: "نمی‌توانید حساب خودتان را حذف کنید" }, { status: 400 });
    }

    const target = await prisma.adminUser.findUnique({ where: { id } });
    if (target?.role === "SUPERADMIN") {
      const superCount = await prisma.adminUser.count({ where: { role: "SUPERADMIN" } });
      if (superCount <= 1) {
        return NextResponse.json({ error: "باید حداقل یک ادمین کل باقی بماند" }, { status: 400 });
      }
    }

    await prisma.adminUser.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
