"use client";

import { useCallback, useEffect, useState } from "react";

type Admin = { id: string; username: string; role: "ADMIN" | "SUPERADMIN"; createdAt: string };

export default function AdminsPage() {
  const [role, setRole] = useState<string | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "SUPERADMIN">("ADMIN");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const meRes = await fetch("/api/admin/me");
    if (meRes.ok) setRole((await meRes.json()).role);

    const res = await fetch("/api/admin/admins", { cache: "no-store" });
    if (res.ok) setAdmins((await res.json()).admins);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "خطا");
        return;
      }
      setUsername("");
      setPassword("");
      setNewRole("ADMIN");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("این ادمین حذف شود؟")) return;
    const res = await fetch(`/api/admin/admins?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) alert(data.error || "خطا");
    await load();
  }

  async function onResetPassword(id: string) {
    const password = prompt("رمز عبور جدید را وارد کنید (حداقل ۸ کاراکتر):");
    if (!password) return;
    const res = await fetch("/api/admin/admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || "خطا");
    else alert("رمز عبور تغییر کرد");
  }

  if (loading) return <main className="flex-1 p-6">در حال بارگذاری...</main>;

  if (role !== "SUPERADMIN") {
    return <main className="flex-1 p-6" dir="rtl">فقط ادمین کل به این بخش دسترسی دارد.</main>;
  }

  return (
    <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full flex flex-col gap-6" dir="rtl">
      <h1 className="text-2xl font-extrabold">مدیریت ادمین‌ها</h1>

      <form onSubmit={onCreate} className="border rounded-xl p-5 flex flex-col gap-3" style={{ borderColor: "var(--border)" }}>
        <h2 className="font-bold">افزودن ادمین جدید</h2>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="نام کاربری"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-transparent flex-1 min-w-[140px]"
            style={{ borderColor: "var(--border)" }}
          />
          <input
            placeholder="رمز عبور"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-transparent flex-1 min-w-[140px]"
            style={{ borderColor: "var(--border)" }}
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as "ADMIN" | "SUPERADMIN")}
            className="border rounded-lg px-3 py-2 bg-transparent"
            style={{ borderColor: "var(--border)" }}
          >
            <option value="ADMIN">ادمین</option>
            <option value="SUPERADMIN">ادمین کل</option>
          </select>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="key px-5 py-2.5 font-bold self-start"
          style={{ background: "var(--accent)", color: "white" }}
        >
          افزودن
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-right opacity-60">
              <th className="p-2">نام کاربری</th>
              <th className="p-2">نقش</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="p-2">{a.username}</td>
                <td className="p-2">{a.role === "SUPERADMIN" ? "ادمین کل" : "ادمین"}</td>
                <td className="p-2 flex gap-3">
                  <button onClick={() => onResetPassword(a.id)} className="text-xs underline">
                    تغییر رمز
                  </button>
                  <button onClick={() => onDelete(a.id)} className="text-xs text-red-500">
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
