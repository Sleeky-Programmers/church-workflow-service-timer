"use client";

import { Badge } from "@/components/ui/badge";
import { useTimerStore, type Conn } from "@/lib/timer/store";
import { cn } from "@/lib/utils";

const LOOK: Record<Conn, { label: string; dot: string }> = {
  local: { label: "Local mode", dot: "bg-gray-400" },
  connecting: { label: "Connecting…", dot: "bg-amber-400 animate-pulse" },
  online: { label: "Live", dot: "bg-success-500" },
  offline: { label: "Offline", dot: "bg-amber-500" },
  denied: { label: "Not connected", dot: "bg-destructive" },
};

/** Online, offline or syncing, so nothing is silently lost (Product Plan, section 6.4). */
export function ConnectionBadge() {
  const conn = useTimerStore((s) => s.conn);
  const unsynced = useTimerStore((s) => s.unsynced);
  const viewOnly = useTimerStore((s) => s.conn !== "local" && !s.access.canControl);
  const look = LOOK[conn];
  const label = conn === "online" && unsynced ? "Syncing…" : look.label;
  return (
    <div className="flex items-center gap-2">
      {viewOnly && conn === "online" ? (
        <Badge variant="secondary" shape="pill" className="hidden sm:inline-flex">
          View only
        </Badge>
      ) : null}
      <Badge variant="outline" shape="pill" className="gap-1.5 whitespace-nowrap font-medium text-muted-foreground">
        <span className={cn("h-2 w-2 rounded-full", look.dot)} aria-hidden />
        {label}
      </Badge>
    </div>
  );
}
