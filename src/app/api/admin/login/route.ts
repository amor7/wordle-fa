import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signAdminToken, ADMIN_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "نام کاربری و رمز عبور را وارد کنید" }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({ where: { username } });
  if (!user) {
    return NextResponse.json({ error: "نام کاربری یا رمز عبور اشتباه است" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "نام کاربری یا رمز عبور اشتباه است" }, { status: 401 });
  }

  const token = await signAdminToken({ sub: user.id, username: user.username, role: user.role });

  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.json({ ok: true, role: user.role, username: user.username });
}
