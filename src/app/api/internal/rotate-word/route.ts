import { NextResponse } from "next/server";
import { rotateAutoWord } from "@/lib/rotate";

export async function POST(req: Request) {
  const secret = req.headers.get("x-rotate-secret");
  if (!secret || secret !== process.env.ROTATE_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await rotateAutoWord();
  return NextResponse.json(result);
}
