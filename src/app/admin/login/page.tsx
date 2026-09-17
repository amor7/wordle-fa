"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "خطا در ورود");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm flex flex-col gap-4 border rounded-xl p-6"
        style={{ borderColor: "var(--border)" }}
      >
        <h1 className="text-xl font-extrabold text-center mb-2">ورود ادمین</h1>

        <label className="flex flex-col gap-1 text-sm">
          نام کاربری
          <input
            className="border rounded-lg px-3 py-2 bg-transparent"
            style={{ borderColor: "var(--border)" }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          رمز عبور
          <input
            type="password"
            className="border rounded-lg px-3 py-2 bg-transparent"
            style={{ borderColor: "var(--border)" }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="key py-2.5 font-bold"
          style={{ background: "var(--accent)", color: "white" }}
        >
          {loading ? "در حال ورود..." : "ورود"}
        </button>
      </form>
    </main>
  );
}
