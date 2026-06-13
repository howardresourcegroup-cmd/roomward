"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Megaphone, ScrollText, Users, ClipboardList, BedDouble,
  UserPlus, Pin, Plus, Trash2, RefreshCw, ChevronDown,
} from "lucide-react";
import { getInitials, cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AnnouncementComposer } from "@/components/corporate/announcement-composer";
import {
  useAnnouncements, useAuditLogs, useCurrentProfile,
} from "@/lib/data/hooks";
import { fetchProfiles } from "@/lib/data/queries";
import { useEffect } from "react";
import type { Profile, AuditLog } from "@/types";

// ── Action label + icon mapping ────────────────────────────────────────────────
function auditIcon(action: string) {
  if (action.startsWith("work_order")) return <ClipboardList className="h-3.5 w-3.5 text-indigo-400 shrink-0" />;
  if (action.startsWith("room"))       return <BedDouble className="h-3.5 w-3.5 text-cyan-400 shrink-0" />;
  if (action === "staff.joined")       return <UserPlus className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
  if (action.startsWith("staff"))      return <Users className="h-3.5 w-3.5 text-violet-400 shrink-0" />;
  return <Megaphone className="h-3.5 w-3.5 text-amber-400 shrink-0" />;
}

function auditLabel(log: AuditLog): string {
  const { action, resource_label: rl, meta } = log;
  const m = meta as Record<string, string>;
  switch (action) {
    case "work_order.created":        return `Created work order "${rl}"`;
    case "work_order.status_changed": return `${rl}: status ${m.from} → ${m.to}`;
    case "work_order.assigned":       return `Assigned "${rl}"`;
    case "room.status_changed":       return `${rl} condition: ${m.from} → ${m.to}`;
    case "room.housekeeping_changed": return `${rl} housekeeping: ${m.from} → ${m.to}`;
    case "room.occupancy_changed":    return `${rl} occupancy: ${m.from} → ${m.to}${m.guest ? ` (${m.guest})` : ""}`;
    case "staff.joined":              return `${rl} joined the organization`;
    case "staff.role_changed":        return `${rl} role: ${m.from} → ${m.to}`;
    case "announcement.posted":       return `Announcement: "${rl}"`;
    default:                          return action;
  }
}

const ROLE_BADGE: Record<string, string> = {
  admin:        "bg-red-500/15 text-red-400",
  manager:      "bg-indigo-500/15 text-indigo-400",
  maintenance:  "bg-amber-500/15 text-amber-400",
  housekeeping: "bg-cyan-500/15 text-cyan-400",
  front_desk:   "bg-violet-500/15 text-violet-400",
  hr:           "bg-rose-500/15 text-rose-400",
  technician:   "bg-amber-500/15 text-amber-400",
  viewer:       "bg-zinc-500/15 text-zinc-400",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator", manager: "Manager", maintenance: "Maintenance",
  housekeeping: "Housekeeping", front_desk: "Front Desk",
  hr: "HR", technician: "Technician", viewer: "Viewer",
};

const AUDIT_FILTERS = [
  { key: undefined,       label: "All" },
  { key: "work_order",    label: "Work Orders" },
  { key: "room",          label: "Rooms" },
  { key: "staff",         label: "Staff" },
];

type Tab = "announcements" | "staff" | "audit";

export default function CorporatePage() {
  const [tab, setTab] = useState<Tab>("announcements");
  const [composing, setComposing] = useState(false);
  const [auditFilter, setAuditFilter] = useState<string | undefined>(undefined);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  const profile = useCurrentProfile();
  const { announcements, loading: annLoading, post, remove } = useAnnouncements();
  const { logs, loading: logLoading, reload: reloadLogs } = useAuditLogs(auditFilter);

  const canPost = profile?.role === "admin" || profile?.role === "manager" || profile?.role === "hr";
  const canDelete = profile?.role === "admin";

  // Load staff only when the tab is opened
  useEffect(() => {
    if (tab !== "staff" || staff.length > 0) return;
    setStaffLoading(true);
    fetchProfiles().then((p) => { setStaff(p); setStaffLoading(false); }).catch(() => setStaffLoading(false));
  }, [tab, staff.length]);

  const staffByRole = useMemo(() => {
    const roleOrder = ["admin", "manager", "hr", "front_desk", "housekeeping", "maintenance", "technician", "viewer"];
    return [...staff].sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role));
  }, [staff]);

  const handlePost = async (input: { title: string; body: string; target_roles: string[]; pinned: boolean }) => {
    await post(input);
    setComposing(false);
  };

  const pinned = announcements.filter((a) => a.pinned);
  const recent = announcements.filter((a) => !a.pinned);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Corporate</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Staff directory, announcements, and full operations audit — visible to everyone in the organization.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-lg border border-border p-0.5 gap-0.5">
        {([
          { key: "announcements", icon: Megaphone,   label: "Announcements" },
          { key: "staff",         icon: Users,        label: "Staff" },
          { key: "audit",         icon: ScrollText,   label: "Audit Log" },
        ] as { key: Tab; icon: React.ElementType; label: string }[]).map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-md transition-colors",
              tab === key ? "bg-foreground/[0.08] text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
            )}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── Announcements ── */}
      {tab === "announcements" && (
        <div className="space-y-4">
          {canPost && !composing && (
            <button onClick={() => setComposing(true)}
              className="btn-primary text-sm h-9 px-4">
              <Plus className="h-4 w-4" /> Post Announcement
            </button>
          )}

          {composing && <AnnouncementComposer onPost={handlePost} onCancel={() => setComposing(false)} />}

          {annLoading && (
            <div className="space-y-3">
              {[1,2].map((i) => <div key={i} className="glass-card h-24 animate-pulse" />)}
            </div>
          )}

          {pinned.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Pin className="h-3 w-3" /> Pinned
              </p>
              {pinned.map((a) => (
                <AnnouncementCard key={a.id} a={a} canDelete={canDelete} onDelete={() => remove(a.id)} />
              ))}
            </div>
          )}

          {recent.length > 0 && (
            <div className="space-y-3">
              {pinned.length > 0 && <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-2">Recent</p>}
              {recent.map((a) => (
                <AnnouncementCard key={a.id} a={a} canDelete={canDelete} onDelete={() => remove(a.id)} />
              ))}
            </div>
          )}

          {!annLoading && announcements.length === 0 && (
            <div className="glass-card p-8 text-center text-sm text-muted-foreground">
              No announcements yet.{canPost ? " Post one to notify the team." : ""}
            </div>
          )}
        </div>
      )}

      {/* ── Staff directory ── */}
      {tab === "staff" && (
        <div className="space-y-3">
          {staffLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map((i) => <div key={i} className="glass-card h-20 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {staffByRole.map((s) => (
                <div key={s.id} className="glass-card p-4 flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={s.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">{getInitials(s.full_name)}</AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                      s.is_available ? "bg-emerald-400" : "bg-zinc-500"
                    )} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{s.full_name || "—"}</p>
                    {s.email && <p className="text-[11px] text-muted-foreground truncate">{s.email}</p>}
                  </div>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full shrink-0", ROLE_BADGE[s.role] ?? ROLE_BADGE.viewer)}>
                    {ROLE_LABELS[s.role] ?? s.role}
                  </span>
                </div>
              ))}
              {staffByRole.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full py-8 text-center">No staff profiles found.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Audit Log ── */}
      {tab === "audit" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-border p-0.5">
              {AUDIT_FILTERS.map(({ key, label }) => (
                <button key={label} onClick={() => setAuditFilter(key)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-md transition-colors",
                    auditFilter === key ? "bg-foreground/[0.08] text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                  )}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={reloadLogs}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          {/* Log feed */}
          {logLoading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map((i) => <div key={i} className="glass-card h-12 animate-pulse" />)}
            </div>
          ) : (
            <div className="glass-card divide-y divide-border overflow-hidden">
              {logs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No audit entries yet — actions taken by your team will appear here.
                </p>
              )}
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-foreground/[0.02] transition-colors">
                  <div className="mt-0.5 h-6 w-6 flex items-center justify-center rounded-md bg-foreground/[0.04] shrink-0">
                    {auditIcon(log.action)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground leading-snug">{auditLabel(log)}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {log.actor_name ?? "System"}
                      {" · "}
                      <span title={format(new Date(log.created_at), "PPp")}>
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground text-center">
            Showing the last 60 events · All org members can view this log · Entries are immutable
          </p>
        </div>
      )}
    </div>
  );
}

// ── Announcement card ─────────────────────────────────────────────────────────
function AnnouncementCard({ a, canDelete, onDelete }: {
  a: import("@/types").Announcement;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = a.body.length > 200;

  return (
    <div className={cn("glass-card p-5 space-y-2", a.pinned && "border-amber-500/20 bg-amber-500/[0.03]")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {a.pinned && <Pin className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />}
          <h3 className="text-sm font-semibold text-foreground leading-snug">{a.title}</h3>
        </div>
        {canDelete && (
          <button onClick={onDelete}
            className="text-muted-foreground hover:text-red-400 transition-colors shrink-0 mt-0.5">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className={cn("text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap", !expanded && isLong && "line-clamp-3")}>
        {a.body}
      </p>
      {isLong && (
        <button onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-accent-text hover:opacity-80 transition-opacity">
          {expanded ? "Show less" : "Read more"}
          <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          <Avatar className="h-4 w-4">
            <AvatarImage src={a.author?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[8px]">{getInitials(a.author?.full_name ?? "?")}</AvatarFallback>
          </Avatar>
          <span className="text-[11px] text-muted-foreground">{a.author?.full_name ?? "Team"}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">·</span>
        <span className="text-[11px] text-muted-foreground" title={format(new Date(a.created_at), "PPp")}>
          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
        </span>
        {a.target_roles.length > 0 && (
          <>
            <span className="text-[11px] text-muted-foreground">·</span>
            <span className="text-[11px] text-indigo-400">
              For: {a.target_roles.map((r) => r.replace(/_/g, " ")).join(", ")}
            </span>
          </>
        )}
        {a.target_roles.length === 0 && (
          <>
            <span className="text-[11px] text-muted-foreground">·</span>
            <span className="text-[11px] text-emerald-400">All staff</span>
          </>
        )}
      </div>
    </div>
  );
}
