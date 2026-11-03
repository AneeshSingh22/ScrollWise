"use client";

import { useEffect, useState } from "react";

/** How often to check while the app is open and visible. */
const POLL_MS = 60_000;

/**
 * True once a newer deployment than this bundle is live.
 *
 * Checks when the app comes back to the foreground (e.g. returning from the
 * Claude app after /new-topic) and once a minute while visible. Does nothing
 * in local dev, where there is no commit to compare.
 */
export function useUpdateAvailable(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const mine = process.env.BUILD_SHA;
    if (!mine || mine === "dev") return;

    let stopped = false;
    async function check() {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { sha } = (await res.json()) as { sha?: string };
        if (!stopped && sha && sha !== "dev" && sha !== mine) setAvailable(true);
      } catch {
        // Offline or mid-deploy: try again later.
      }
    }

    void check();
    const timer = setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  return available;
}
