import { NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/auth";
import { rotateAutoWord } from "@/lib/rotate";

export async function POST() {
  try {
    await requireAdmin("SUPERADMIN");
    const result = await rotateAutoWord();
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
