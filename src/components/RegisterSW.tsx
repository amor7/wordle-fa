"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // ignore — PWA install is a nice-to-have, not critical
      });
    }
  }, []);
  return null;
}
