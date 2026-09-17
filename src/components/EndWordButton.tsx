"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EndWordButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (!confirm("کلمهٔ فعلی همین الان پایان یابد؟")) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/word?id=${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="key px-3 py-1.5 text-xs text-red-600"
      style={{ background: "transparent", border: "1px solid currentColor" }}
    >
      پایان زودهنگام
    </button>
  );
}
