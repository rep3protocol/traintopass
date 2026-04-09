"use client";

import { useState } from "react";
import { buildBroadcastEmailHtml } from "@/lib/admin-broadcast-email";

const PREVIEW_FIRST_NAME = "Alex";

export function BroadcastClient({ recipientCount }: { recipientCount: number }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewHtml = buildBroadcastEmailHtml(PREVIEW_FIRST_NAME, message);

  async function postBroadcast(testOnly: boolean) {
    setSuccess(null);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message,
          ...(testOnly ? { testOnly: true } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        sent?: number;
        failed?: number;
      };
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 403) {
        window.location.href = "/dashboard";
        return;
      }
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      const sent = typeof data.sent === "number" ? data.sent : 0;
      const failed = typeof data.failed === "number" ? data.failed : 0;
      if (testOnly && sent > 0 && failed === 0) {
        setSuccess("Test email sent to your inbox");
        return;
      }
      if (sent > 0) {
        setSuccess(`${sent} emails sent successfully`);
      }
      if (failed > 0) {
        setError(
          sent > 0
            ? `${failed} could not be sent.`
            : `Failed to send (${failed} error${failed === 1 ? "" : "s"}).`
        );
      } else if (sent === 0 && recipientCount > 0) {
        setError("No emails were delivered.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void postBroadcast(false);
  }

  function onSendTest() {
    void postBroadcast(true);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-8">
      <p className="text-sm text-neutral-400">
        Sending to {recipientCount} user{recipientCount === 1 ? "" : "s"}
      </p>

      <div>
        <label
          htmlFor="broadcast-subject"
          className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5"
        >
          Subject
        </label>
        <input
          id="broadcast-subject"
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full border border-forge-border bg-forge-bg px-3 py-3 text-sm text-white outline-none focus:border-forge-accent"
          placeholder="Email subject line"
        />
      </div>

      <div>
        <label
          htmlFor="broadcast-body"
          className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5"
        >
          Message
        </label>
        <textarea
          id="broadcast-body"
          required
          rows={12}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full min-h-[240px] border border-forge-border bg-forge-bg px-3 py-3 text-sm text-white outline-none focus:border-forge-accent resize-y"
          placeholder="Write your message…"
        />
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
          Preview
        </p>
        <div
          className="border border-forge-border bg-forge-bg overflow-auto max-h-[480px] p-4 text-left"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
        <p className="mt-2 text-xs text-neutral-600">
          Greeting uses the sample name “{PREVIEW_FIRST_NAME}”; real emails use
          each recipient&apos;s first name.
        </p>
      </div>

      {success ? (
        <p className="text-sm text-green-400 border border-green-900/40 bg-green-950/20 px-3 py-2">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-400 border border-red-900/40 bg-red-950/20 px-3 py-2">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onSendTest}
          disabled={
            busy || !subject.trim() || !message.trim()
          }
          className="flex-1 border-2 border-forge-border bg-forge-bg px-6 py-3 text-xs font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent disabled:opacity-50 transition-colors"
        >
          {busy ? "Sending…" : "Send Test Email"}
        </button>
        <button
          type="submit"
          disabled={busy || recipientCount === 0}
          className="flex-1 border-2 border-forge-accent bg-forge-accent px-6 py-3 text-xs font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent disabled:opacity-50 transition-colors"
        >
          {busy ? "Sending…" : "Send to All Users"}
        </button>
      </div>
    </form>
  );
}
