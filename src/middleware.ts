import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/auth";

const ADMIN_HOST = process.env.ADMIN_HOST; // e.g. neda.online-gamers.shop

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host")?.split(":")[0];

  // Keep the admin panel on its own subdomain, and the game on the public one.
  if (ADMIN_HOST) {
    if (hostname === ADMIN_HOST && pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
    if (hostname && hostname !== ADMIN_HOST && pathname.startsWith("/admin")) {
      const url = req.nextUrl.clone();
      url.hostname = ADMIN_HOST;
      url.port = "";
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/admin/login") return NextResponse.next();

  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    const session = token ? await verifyAdminToken(token) : null;
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*"],
};
