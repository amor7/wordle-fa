import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "wf_admin";

export type AdminRole = "ADMIN" | "SUPERADMIN";

export type AdminTokenPayload = {
  sub: string;
  username: string;
  role: AdminRole;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(payload: AdminTokenPayload) {
  return new SignJWT({ username: payload.username, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function verifyAdminToken(
  token: string
): Promise<AdminTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || !payload.username || !payload.role) return null;
    return {
      sub: payload.sub as string,
      username: payload.username as string,
      role: payload.role as AdminRole,
    };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminTokenPayload | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export class AdminAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Throws AdminAuthError if not logged in, or (when role is given) not that role. */
export async function requireAdmin(role?: AdminRole): Promise<AdminTokenPayload> {
  const session = await getAdminSession();
  if (!session) throw new AdminAuthError(401, "وارد نشده‌اید");
  if (role && session.role !== role) {
    throw new AdminAuthError(403, "دسترسی لازم را ندارید");
  }
  return session;
}
