"use client";

import { useState } from "react";
import { Pin, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { slug: "admin",        label: "Administrators" },
  { slug: "manager",      label: "Managers" },
  { slug: "maintenance",  label: "Maintenance" },
  { slug: "housekeeping", label: "Housekeeping" },
  { slug: "front_desk",   label: "Front Desk" },
  { slug: "hr",           label: "HR" },
  { slug: "viewer",       label: "Viewers" },
];

interface Props {
  onPost: (input: { title: string; body: string; target_roles: string[]; pinned: boolean }) => Promise<void>;
  onCancel: () => void;
}

export function AnnouncementComposer({ onPost, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [roles, setRoles] = useState<string[]>([]);   // empty = all
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleRole = (slug: string) =>
    setRoles((prev) => prev.includes(slug) ? prev.filter((r) => r !== slug) : [...prev, slug]);

  const submit = async () => {
    if (!title.trim() || !body.trim()) { setError("Title and message are required."); return; }
    setLoading(true);
    setError("");
    try {
      await onPost({ title, body, target_roles: roles, pinned });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post.");
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4 border-indigo-500/20">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">New Announcement</p>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent-text/50"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message…"
        rows={4}
        className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent-text/50 resize-none"
      />

      {/* Role targeting */}
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
          Send to — {roles.length === 0 ? "All staff" : roles.map((r) => ROLE_OPTIONS.find((o) => o.slug === r)?.label ?? r).join(", ")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ROLE_OPTIONS.map((o) => (
            <button
              key={o.slug}
              onClick={() => toggleRole(o.slug)}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                roles.includes(o.slug)
                  ? "border-accent-text/50 bg-accent-500/15 text-accent-text"
                  : "border-border text-muted-foreground hover:border-white/20 hover:text-foreground"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pin + Submit */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setPinned((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors",
            pinned ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-border text-muted-foreground hover:border-white/20"
          )}
        >
          <Pin className="h-3 w-3" /> {pinned ? "Pinned" : "Pin"}
        </button>

        <div className="flex items-center gap-2">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={submit}
            disabled={loading}
            className="btn-primary text-xs h-8 px-4"
          >
            {loading ? "Posting…" : <><Send className="h-3.5 w-3.5" /> Post</>}
          </button>
        </div>
      </div>
    </div>
  );
}
