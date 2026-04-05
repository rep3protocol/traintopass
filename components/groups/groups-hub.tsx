"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type GroupCard = {
  id: string;
  name: string;
  joinCode: string | null;
  memberCount: number;
  isLeader: boolean;
};

type Props = {
  initialGroups: GroupCard[];
  paid: boolean;
};

export function GroupsHub({ initialGroups, paid }: Props) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refreshList = async () => {
    try {
      const res = await fetch("/api/groups/mine");
      const data = (await res.json()) as {
        groups?: {
          id: string;
          name: string;
          joinCode: string | null;
          memberCount: number;
          isLeader: boolean;
        }[];
      };
      if (res.ok && data.groups) {
        setGroups(
          data.groups.map((g) => ({
            id: g.id,
            name: g.name,
            joinCode: g.joinCode,
            memberCount: g.memberCount,
            isLeader: g.isLeader,
          }))
        );
      }
    } catch {
      /* silent */
    }
    router.refresh();
  };

  const createUnit = async () => {
    const name = createName.trim();
    if (!name || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { error?: string; group?: { id: string } };
      if (!res.ok) {
        setErr(data.error ?? "Unable to create");
        return;
      }
      if (data.group?.id) {
        setCreateName("");
        setCreateOpen(false);
        await refreshList();
        router.push(`/groups/${data.group.id}`);
      }
    } catch {
      setErr("Unable to create");
    } finally {
      setBusy(false);
    }
  };

  const joinUnit = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as {
        error?: string;
        group?: { id: string };
      };
      if (!res.ok) {
        setErr(data.error ?? "Unable to join");
        return;
      }
      if (data.group?.id) {
        setJoinCode("");
        setJoinOpen(false);
        await refreshList();
        router.push(`/groups/${data.group.id}`);
      }
    } catch {
      setErr("Unable to join");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-3">
        {paid ? (
          <button
            type="button"
            onClick={() => {
              setCreateOpen((o) => !o);
              setJoinOpen(false);
              setErr(null);
            }}
            className="border-2 border-forge-accent bg-forge-accent px-6 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors"
          >
            Create unit
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setJoinOpen((o) => !o);
            setCreateOpen(false);
            setErr(null);
          }}
          className="border border-forge-border px-6 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent transition-colors"
        >
          Join unit
        </button>
      </div>

      {createOpen && paid ? (
        <div className="border border-forge-border bg-forge-panel p-6 space-y-4 max-w-md">
          <h2 className="font-heading text-lg text-white tracking-wide">
            NEW UNIT
          </h2>
          <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest text-neutral-500">
            Unit name
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              maxLength={120}
              className="bg-forge-bg border border-forge-border px-3 py-2 text-sm text-white"
              placeholder="e.g. 1st Platoon"
            />
          </label>
          {err ? (
            <p className="text-xs text-red-400">{err}</p>
          ) : null}
          <button
            type="button"
            disabled={busy || !createName.trim()}
            onClick={() => void createUnit()}
            className="border border-forge-accent px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-forge-accent hover:bg-forge-accent hover:text-forge-bg transition-colors disabled:opacity-50"
          >
            Create
          </button>
        </div>
      ) : null}

      {joinOpen ? (
        <div className="border border-forge-border bg-forge-panel p-6 space-y-4 max-w-md">
          <h2 className="font-heading text-lg text-white tracking-wide">
            JOIN UNIT
          </h2>
          <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest text-neutral-500">
            6-character code
            <input
              value={joinCode}
              onChange={(e) =>
                setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              maxLength={6}
              className="font-mono tracking-[0.2em] bg-forge-bg border border-forge-border px-3 py-2 text-lg text-forge-accent uppercase"
              placeholder="XXXXXX"
              autoCapitalize="characters"
            />
          </label>
          {err ? (
            <p className="text-xs text-red-400">{err}</p>
          ) : null}
          <button
            type="button"
            disabled={busy || joinCode.trim().length !== 6}
            onClick={() => void joinUnit()}
            className="border border-forge-accent px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-forge-accent hover:bg-forge-accent hover:text-forge-bg transition-colors disabled:opacity-50"
          >
            Join
          </button>
        </div>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-sm text-neutral-400 leading-relaxed max-w-lg">
          You&apos;re not in any units yet. Create one or ask your squad for a
          join code.
        </p>
      ) : (
        <ul className="space-y-4">
          {groups.map((g) => (
            <li
              key={g.id}
              className="border border-forge-border bg-forge-panel p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="space-y-2">
                <h2 className="font-heading text-2xl text-white tracking-wide">
                  {g.name}
                </h2>
                <p className="text-xs text-neutral-500 uppercase tracking-widest">
                  {g.memberCount} members
                </p>
                {g.isLeader && g.joinCode ? (
                  <p className="text-sm text-neutral-400">
                    Join code:{" "}
                    <span className="font-mono text-forge-accent tracking-widest text-base">
                      {g.joinCode}
                    </span>
                  </p>
                ) : null}
              </div>
              <Link
                href={`/groups/${g.id}`}
                className="inline-block text-center border border-forge-border px-6 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-forge-accent hover:border-forge-accent shrink-0"
              >
                View unit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
