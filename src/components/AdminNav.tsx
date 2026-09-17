"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "داشبورد", superOnly: false },
  { href: "/admin/words", label: "کلمه‌ها", superOnly: false },
  { href: "/admin/pool", label: "بانک کلمات", superOnly: false },
  { href: "/admin/analytics", label: "آمار و تحلیل", superOnly: false },
  { href: "/admin/settings", label: "حالت خودکار", superOnly: true },
  { href: "/admin/admins", label: "ادمین‌ها", superOnly: true },
];

export function AdminNav({ username, role }: { username: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <nav
      className="w-full border-b flex flex-wrap items-center gap-1 px-3 py-2"
      style={{ borderColor: "var(--border)" }}
      dir="rtl"
    >
      {LINKS.filter((l) => !l.superOnly || role === "SUPERADMIN").map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="px-3 py-1.5 rounded-md text-sm font-semibold"
          style={{
            background: pathname === l.href ? "var(--accent)" : "transparent",
            color: pathname === l.href ? "white" : "inherit",
          }}
        >
          {l.label}
        </Link>
      ))}
      <div className="flex-1" />
      <span className="text-xs opacity-60 ml-2">
        {username} ({role === "SUPERADMIN" ? "ادمین کل" : "ادمین"})
      </span>
      <button onClick={logout} className="px-3 py-1.5 rounded-md text-sm font-semibold text-red-500">
        خروج
      </button>
    </nav>
  );
}
