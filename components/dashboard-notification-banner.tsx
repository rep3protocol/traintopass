"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { LS_NOTIFICATION_PROMPT_DISMISSED_KEY } from "@/lib/storage-keys";

export function DashboardNotificationBanner() {
  const { status } = useSession();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      if (localStorage.getItem(LS_NOTIFICATION_PROMPT_DISMISSED_KEY) === "1") {
        return;
      }
    } catch {
      return;
    }
    if (Notification.permission === "default") {
      setVisible(true);
    }
  }, [status]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(LS_NOTIFICATION_PROMPT_DISMISSED_KEY, "1");
    } catch {
      /* silent */
    }
    setVisible(false);
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        dismiss();
        return;
      }
      const vapidRes = await fetch("/api/push/vapid-key");
      const vapidJson = (await vapidRes.json()) as { publicKey?: string | null };
      const key = vapidJson.publicKey?.trim();
      if (!key || !("serviceWorker" in navigator)) {
        dismiss();
        return;
      }
      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const j = sub.toJSON();
      if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) {
        dismiss();
        return;
      }
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: j.endpoint,
          keys: { p256dh: j.keys.p256dh, auth: j.keys.auth },
        }),
      });
    } catch {
      /* silent */
    } finally {
      dismiss();
      setBusy(false);
    }
  }, [dismiss]);

  if (!visible) return null;

  return (
    <div className="border border-forge-border bg-forge-panel px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p className="text-sm text-neutral-200">
        🔔 Get streak reminders and daily challenge alerts
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void enable()}
          className="border-2 border-forge-accent bg-forge-accent px-4 py-2 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 transition-colors"
        >
          {busy ? "…" : "Enable Notifications"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="border border-forge-border px-4 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-400 hover:border-forge-accent hover:text-forge-accent transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    buf[i] = raw.charCodeAt(i);
  }
  return buf;
}
