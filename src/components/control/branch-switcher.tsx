"use client";

import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { branchesApi, type BranchList } from "@/lib/api/endpoints";
import { switchBranch } from "@/lib/auth/switch-branch";

/**
 * Which branch's timer this is, and a way to change it. Only shown when the
 * user can open more than one branch. Offline it keeps quiet: the timer
 * runs on the branch it was on.
 */
export function BranchSwitcher() {
  const [data, setData] = useState<BranchList | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    branchesApi
      .list()
      .then((d) => live && setData(d))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  if (!data || data.branches.length < 2) return null;
  const current = data.activeBranchId ?? data.branches.find((b) => b.isHQ)?.id ?? data.branches[0].id;

  return (
    <label className="relative flex min-w-0 flex-1 items-center md:flex-none">
      <span className="sr-only">Branch</span>
      <Building2 className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted-foreground" />
      <select
        className="h-9 w-full min-w-0 truncate rounded-md border border-input bg-white pl-8 pr-7 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 md:w-36 lg:w-56"
        value={current}
        disabled={busy}
        onChange={async (e) => {
          const id = e.target.value;
          setBusy(true);
          try {
            await switchBranch(id);
          } catch (err) {
            alert(err instanceof ApiError ? err.message : "Couldn't switch branch. Check the connection and try again.");
            setBusy(false);
          }
        }}
      >
        {data.branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </label>
  );
}
