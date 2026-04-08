"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  maxMembersForUnitType,
  unitTypeLabel,
  type UnitType,
} from "@/lib/unit-types";

type ParentOpt = { id: string; name: string };

type Props = {
  paid: boolean;
  initialPlatoonAddon: boolean;
  initialCompanyAddon: boolean;
};

export function CreateUnitForm({
  paid,
  initialPlatoonAddon,
  initialCompanyAddon,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [unitType, setUnitType] = useState<UnitType>("squad");
  const [parentId, setParentId] = useState("");
  const [parentOptions, setParentOptions] = useState<ParentOpt[]>([]);
  const [platoonAddon, setPlatoonAddon] = useState(initialPlatoonAddon);
  const [companyAddon, setCompanyAddon] = useState(initialCompanyAddon);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const processedCheckoutSession = useRef<string | null>(null);

  const maxMembers = useMemo(() => maxMembersForUnitType(unitType), [unitType]);

  const namePlaceholder = useMemo(() => {
    if (unitType === "squad") return "e.g. 1st Squad, 3rd Platoon";
    if (unitType === "platoon") return "e.g. 1st Platoon, Bravo Company";
    return "e.g. Bravo Company, 1-87 Infantry";
  }, [unitType]);

  useEffect(() => {
    if (!paid) return;
    let cancelled = false;
    void fetch("/api/groups/addon-status")
      .then((r) => r.json() as Promise<{ platoon?: boolean; company?: boolean }>)
      .then((data) => {
        if (cancelled) return;
        if (typeof data.platoon === "boolean") setPlatoonAddon(data.platoon);
        if (typeof data.company === "boolean") setCompanyAddon(data.company);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [paid]);

  useEffect(() => {
    if (!paid) return;
    const forParam = unitType === "platoon" ? "platoon" : unitType === "squad" ? "squad" : null;
    if (!forParam) {
      setParentOptions([]);
      setParentId("");
      return;
    }
    setParentOptions([]);
    let cancelled = false;
    void fetch(`/api/groups/parent-options?for=${encodeURIComponent(forParam)}`)
      .then((r) => r.json() as Promise<{ options?: ParentOpt[] }>)
      .then((data) => {
        if (cancelled) return;
        setParentOptions(data.options ?? []);
      })
      .catch(() => {
        if (!cancelled) setParentOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [paid, unitType]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const unlocked = params.get("unlocked");
    if (!sessionId || unlocked !== "true" || !paid) return;
    if (processedCheckoutSession.current === sessionId) return;
    processedCheckoutSession.current = sessionId;

    let cancelled = false;
    setBusy(true);
    setErr(null);

    void (async () => {
      try {
        await fetch("/api/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const res = await fetch("/api/groups/complete-addon-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = (await res.json()) as {
          error?: string;
          group?: { id: string; alreadyCreated?: boolean };
        };
        if (cancelled) return;
        if (!res.ok) {
          setErr(data.error ?? "Could not finish setup");
          setBusy(false);
          return;
        }
        if (data.group?.id) {
          router.replace(`/groups/${data.group.id}`);
          return;
        }
        setErr("Could not finish setup");
      } catch {
        if (!cancelled) setErr("Could not finish setup");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paid, router]);

  const submit = async () => {
    const n = name.trim();
    if (!n || busy || !paid) return;
    if (
      unitType === "platoon" &&
      parentOptions.length > 0 &&
      !parentId.trim()
    ) {
      setErr("Select a parent company.");
      return;
    }
    if (
      unitType === "squad" &&
      parentOptions.length > 0 &&
      !parentId.trim()
    ) {
      setErr("Select a parent platoon.");
      return;
    }
    setBusy(true);
    setErr(null);

    const body = {
      name: n,
      unitType,
      parentGroupId:
        (unitType === "platoon" || unitType === "squad") && parentId
          ? parentId
          : null,
    };

    try {
      const res = await fetch("/api/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        error?: string;
        needsAddonCheckout?: boolean;
        group?: { id: string };
      };

      if (res.status === 402 && data.needsAddonCheckout) {
        const checkoutRes = await fetch("/api/groups/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const checkoutData = (await checkoutRes.json()) as {
          url?: string;
          error?: string;
        };
        if (checkoutRes.ok && checkoutData.url) {
          window.location.href = checkoutData.url;
          return;
        }
        setErr(checkoutData.error ?? "Checkout unavailable");
        setBusy(false);
        return;
      }

      if (!res.ok) {
        setErr(data.error ?? "Unable to create");
        setBusy(false);
        return;
      }

      if (data.group?.id) {
        router.push(`/groups/${data.group.id}`);
        return;
      }
      setErr("Unable to create");
    } catch {
      setErr("Unable to create");
    } finally {
      setBusy(false);
    }
  };

  if (!paid) {
    return (
      <div className="border border-forge-border bg-forge-panel p-6 space-y-4 max-w-lg">
        <p className="text-sm text-neutral-400 leading-relaxed">
          Individual Pro is required to create any unit (squad, platoon, or
          company). Joining a unit only requires a free account.
        </p>
        <Link
          href="/pricing"
          className="inline-block border border-forge-accent px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-forge-accent hover:bg-forge-accent hover:text-forge-bg transition-colors"
        >
          View pricing
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-forge-border bg-forge-panel p-6 space-y-6 max-w-lg">
      <h1 className="font-heading text-xl text-white tracking-wide">
        NEW UNIT
      </h1>

      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-neutral-500">
          Unit type
        </p>
        <div className="flex flex-wrap gap-2">
          {(["squad", "platoon", "company"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setUnitType(t);
                setParentId("");
                setErr(null);
              }}
              className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-widest border transition-colors ${
                unitType === t
                  ? "border-forge-accent bg-forge-accent text-forge-bg"
                  : "border-forge-border text-neutral-400 hover:border-forge-accent hover:text-forge-accent"
              }`}
            >
              {unitTypeLabel(t)}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-neutral-500 space-y-1 border border-forge-border/60 p-3">
        <p>
          Member limit:{" "}
          <span className="text-forge-accent font-heading text-base">
            {maxMembers}
          </span>
        </p>
        {unitType === "squad" ? (
          <p>Included with your Pro subscription ($7/mo).</p>
        ) : unitType === "platoon" ? (
          <p>
            Platoon add-on: +$15/mo on top of Pro.
            {platoonAddon ? " Active on your account." : " Required before creating."}
          </p>
        ) : (
          <p>
            Company add-on: +$30/mo on top of Pro.
            {companyAddon ? " Active on your account." : " Required before creating."}
          </p>
        )}
      </div>

      <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest text-neutral-500">
        Unit name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className="bg-forge-bg border border-forge-border px-3 py-2 text-sm text-white"
          placeholder={namePlaceholder}
        />
      </label>

      {unitType === "company" ? (
        <p className="text-xs text-neutral-400 leading-relaxed border border-forge-border/60 p-3">
          Companies are top level. Create platoons and squads after.
        </p>
      ) : null}

      {unitType === "platoon" ? (
        <div className="space-y-2">
          <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest text-neutral-500">
            Select Parent Company
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              required={parentOptions.length > 0}
              className="bg-forge-bg border border-forge-border px-3 py-2 text-sm text-white"
            >
              {parentOptions.length > 0 ? (
                <option value="">Select a company…</option>
              ) : (
                <option value="">— None —</option>
              )}
              {parentOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          {parentOptions.length === 0 ? (
            <p className="text-xs text-neutral-400 leading-relaxed">
              No companies found. You can create a standalone platoon or create a
              company first.
            </p>
          ) : null}
        </div>
      ) : null}

      {unitType === "squad" ? (
        <div className="space-y-2">
          <label className="flex flex-col gap-1 text-[10px] uppercase tracking-widest text-neutral-500">
            Select Parent Platoon
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              required={parentOptions.length > 0}
              className="bg-forge-bg border border-forge-border px-3 py-2 text-sm text-white"
            >
              {parentOptions.length > 0 ? (
                <option value="">Select a platoon…</option>
              ) : (
                <option value="">— None —</option>
              )}
              {parentOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          {parentOptions.length === 0 ? (
            <p className="text-xs text-neutral-400 leading-relaxed">
              No platoons found. You can create a standalone squad or create a
              platoon first.
            </p>
          ) : null}
        </div>
      ) : null}

      {err ? <p className="text-xs text-red-400">{err}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={
            busy ||
            !name.trim() ||
            (unitType === "platoon" &&
              parentOptions.length > 0 &&
              !parentId.trim()) ||
            (unitType === "squad" &&
              parentOptions.length > 0 &&
              !parentId.trim())
          }
          onClick={() => void submit()}
          className="border-2 border-forge-accent bg-forge-accent px-6 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-forge-bg hover:bg-transparent hover:text-forge-accent transition-colors disabled:opacity-50"
        >
          {busy ? "Working…" : "Create unit"}
        </button>
        <Link
          href="/groups"
          className="inline-flex items-center border border-forge-border px-6 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 hover:border-forge-accent hover:text-forge-accent transition-colors"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
