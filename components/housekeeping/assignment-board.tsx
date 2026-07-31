"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, UserMinus, CircleCheck, Users, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, getInitials } from "@/lib/utils";
import type { Space, Profile, HousekeepingStatus } from "@/types";

// A room counts as finished once it has been cleaned; "ready" additionally means
// a manager has inspected it. Both are done from the housekeeper's point of view.
const DONE: HousekeepingStatus[] = ["cleaned", "ready"];

function isDone(room: Space): boolean {
  return DONE.includes(room.housekeeping_status ?? "ready");
}

interface Props {
  rooms: Space[];
  housekeepers: Profile[];
  canAssign: boolean;
  currentUserId?: string | null;
  onAssign: (spaceIds: string[], housekeeper: Profile | null) => void;
}

/**
 * The same rooms as the status board, pivoted by *person* — the view a manager
 * needs to answer "who is doing what, and how far along are they?" and the one a
 * housekeeper needs to see just their own list.
 */
export function AssignmentBoard({ rooms, housekeepers, canAssign, currentUserId, onAssign }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Only rooms that actually need attention belong on a board. A room already
  // sitting "ready" is not work, and padding boards with it hides real load.
  const boardRooms = useMemo(
    () => rooms.filter((r) => (r.housekeeping_status ?? "ready") !== "out_of_service"),
    [rooms]
  );

  const groups = useMemo(() => {
    const byPerson = new Map<string, Space[]>();
    const unassigned: Space[] = [];
    for (const r of boardRooms) {
      if (!r.housekeeper_id) { unassigned.push(r); continue; }
      const list = byPerson.get(r.housekeeper_id) ?? [];
      list.push(r);
      byPerson.set(r.housekeeper_id, list);
    }
    return { byPerson, unassigned };
  }, [boardRooms]);

  // Show every housekeeper, including those with an empty board — an empty
  // column is the signal that someone is free, which is the point of this view.
  const columns = useMemo(() => {
    const known = housekeepers.map((p) => ({ person: p, rooms: groups.byPerson.get(p.id) ?? [] }));
    // Anyone holding rooms but missing from the picker (role changed, left the
    // team) still needs to appear, or their rooms silently vanish from the view.
    const extras = [...groups.byPerson.entries()]
      .filter(([id]) => !housekeepers.some((p) => p.id === id))
      .map(([id, list]) => ({
        person: (list[0].housekeeper
          ? { ...list[0].housekeeper, role: "housekeeping" }
          : { id, full_name: "Former staff member", avatar_url: null }) as unknown as Profile,
        rooms: list,
      }));
    return [...known, ...extras];
  }, [housekeepers, groups]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const assignSelected = (person: Profile | null) => {
    onAssign([...selected], person);
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Bulk assignment bar — only appears once rooms are picked, so it never
          takes up space during ordinary reading of the board. */}
      {canAssign && selected.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-3 flex items-center justify-between gap-3 flex-wrap sticky top-2 z-10"
        >
          <span className="text-sm text-foreground">
            {selected.size} room{selected.size === 1 ? "" : "s"} selected
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm"><UserPlus className="h-3.5 w-3.5" /> Assign to…</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Assign {selected.size} room{selected.size === 1 ? "" : "s"} to</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {housekeepers.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => assignSelected(p)}>
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[9px]">{getInitials(p.full_name)}</AvatarFallback>
                    </Avatar>
                    {p.full_name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => assignSelected(null)}>
                  <UserMinus className="h-3.5 w-3.5" /> Unassign
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {columns.map(({ person, rooms: list }) => {
          const done = list.filter(isDone).length;
          const pct = list.length === 0 ? 0 : Math.round((done / list.length) * 100);
          const isMe = person.id === currentUserId;
          return (
            <div
              key={person.id}
              className={cn(
                "rounded-xl border p-3",
                isMe ? "border-indigo-500/40 bg-indigo-500/[0.05]" : "border-border bg-foreground/[0.02]"
              )}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={person.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[11px]">{getInitials(person.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {person.full_name}{isMe && <span className="text-indigo-400 font-normal"> · you</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {list.length === 0 ? "No rooms assigned" : `${done} of ${list.length} done`}
                  </p>
                </div>
                {list.length > 0 && (
                  <span className={cn(
                    "text-xs font-semibold tabular-nums",
                    pct === 100 ? "text-emerald-400" : "text-muted-foreground"
                  )}>{pct}%</span>
                )}
              </div>

              {list.length > 0 && (
                <div className="h-1 w-full rounded-full bg-foreground/[0.06] overflow-hidden mb-3">
                  <motion.div
                    className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-400" : "bg-indigo-400")}
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              )}

              <div className="space-y-1.5 min-h-[40px]">
                {list.map((room) => (
                  <RoomChip
                    key={room.id}
                    room={room}
                    selectable={canAssign}
                    selected={selected.has(room.id)}
                    onToggle={() => toggle(room.id)}
                  />
                ))}
                {list.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Available for rooms</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unassigned pool */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-foreground">
              Unassigned ({groups.unassigned.length})
            </span>
          </div>
          {canAssign && groups.unassigned.length > 0 && (
            <Button
              size="sm" variant="outline"
              onClick={() => setSelected(new Set(groups.unassigned.map((r) => r.id)))}
            >
              Select all
            </Button>
          )}
        </div>

        {groups.unassigned.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-400 py-2">
            <CircleCheck className="h-4 w-4" />
            Every room has someone on it.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {groups.unassigned.map((room) => (
              <RoomChip
                key={room.id}
                room={room}
                selectable={canAssign}
                selected={selected.has(room.id)}
                onToggle={() => toggle(room.id)}
                inline
              />
            ))}
          </div>
        )}
      </div>

      {columns.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="No housekeepers yet"
          description="Invite housekeeping staff and you can hand out room boards here each morning."
          hint="Anyone with the Housekeeping role appears as a column."
        />
      )}
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  dirty: "bg-red-400",
  in_progress: "bg-blue-400",
  cleaned: "bg-cyan-400",
  ready: "bg-emerald-400",
  out_of_service: "bg-zinc-500",
};

function RoomChip({
  room, selectable, selected, onToggle, inline,
}: {
  room: Space; selectable: boolean; selected: boolean; onToggle: () => void; inline?: boolean;
}) {
  const status = room.housekeeping_status ?? "ready";
  const content = (
    <>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[status])} />
      <span className={cn("truncate", isDone(room) && "text-muted-foreground line-through decoration-1")}>
        {room.name}
      </span>
    </>
  );

  const base = inline
    ? "inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs min-h-[32px]"
    : "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-xs min-h-[32px]";

  if (!selectable) {
    return <span className={cn(base, "border-border bg-foreground/[0.03] text-foreground")}>{content}</span>;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        base, "text-left transition-colors active:scale-[0.98]",
        selected
          ? "border-indigo-500/60 bg-indigo-500/15 text-foreground"
          : "border-border bg-foreground/[0.03] text-foreground hover:bg-foreground/[0.07]"
      )}
    >
      {content}
    </button>
  );
}
