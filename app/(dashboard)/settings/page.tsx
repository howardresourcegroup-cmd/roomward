"use client";

import { useState, useEffect } from "react";
import { Building2, Users, Bell, Zap, Shield, ChevronRight, KeyRound, Check, CreditCard, Sparkles, Loader2, Palette, Sun, Moon, Plus } from "lucide-react";
import { useTheme, ACCENTS, type AccentKey } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { RolesManager } from "@/components/settings/roles-manager";
import { TeamManager } from "@/components/settings/team-manager";
import { fetchOrganization, updateOrganization } from "@/lib/data/queries";
import { useBilling } from "@/lib/data/hooks";
import { UpgradeModal } from "@/components/billing/upgrade-modal";

const SECTIONS = [
  { id: "org",      label: "Organization",     icon: Building2 },
  { id: "billing",  label: "Billing & Plan",   icon: CreditCard },
  { id: "appearance", label: "Appearance",     icon: Palette },
  { id: "roles",    label: "Roles & Permissions", icon: KeyRound },
  { id: "team",     label: "Team",             icon: Users },
  { id: "notifs",   label: "Notifications",    icon: Bell },
  { id: "integrations", label: "Integrations", icon: Zap },
  { id: "security", label: "Security",         icon: Shield },
];

const INTEGRATIONS = [
  { name: "RoomMaster by IQware", status: "connected", desc: "Housekeeping status sync", badge: "Connected", badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { name: "Opera PMS",            status: "available", desc: "Oracle Hospitality",        badge: "Set up",     badgeColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  { name: "Cloudbeds",            status: "available", desc: "All-in-one PMS",            badge: "Set up",     badgeColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  { name: "Maestro PMS",          status: "available", desc: "Northwind Maestro",         badge: "Set up",     badgeColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  { name: "Stripe",               status: "available", desc: "Billing & invoicing",       badge: "Set up",     badgeColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  { name: "Slack",                status: "available", desc: "Work order notifications",  badge: "Set up",     badgeColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("org");
  const [org, setOrg] = useState({ name: "", slug: "", timezone: "America/New_York" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const billing = useBilling();
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    fetchOrganization().then((o) => {
      if (o) setOrg({ name: o.name, slug: o.slug, timezone: (o.settings as { timezone?: string })?.timezone ?? "America/New_York" });
    }).catch(() => {});
  }, []);

  const saveOrg = async () => {
    setSaving(true); setSaved(false);
    try { await updateOrganization({ name: org.name }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch { toast.error("Couldn't save settings. Please try again."); }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <div className="glass-card p-2 h-fit space-y-0.5">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left transition-all",
                activeSection === id
                  ? "bg-indigo-500/15 text-indigo-300"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 glass-card p-6 space-y-6">
          {activeSection === "org" && (
            <>
              <div>
                <h2 className="text-base font-semibold text-foreground mb-4">Organization Settings</h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Organization Name</Label>
                    <Input value={org.name} onChange={(e) => setOrg((o) => ({ ...o, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>URL Slug</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground shrink-0">roomward.app/</span>
                      <Input value={org.slug} onChange={(e) => setOrg((o) => ({ ...o, slug: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Timezone</Label>
                    <Input value={org.timezone} onChange={(e) => setOrg((o) => ({ ...o, timezone: e.target.value }))} />
                  </div>
                  <div className="pt-2">
                    <Button onClick={saveOrg} disabled={saving}>
                      {saved ? <><Check className="h-4 w-4" />Saved</> : saving ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Plan</h3>
                <div className="flex items-center justify-between rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-indigo-300">Pro Plan</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Unlimited buildings · 25 team members · All integrations</p>
                  </div>
                  <Button size="sm" variant="outline">Manage</Button>
                </div>
              </div>
            </>
          )}

          {activeSection === "billing" && (
            <div>
              <h2 className="text-base font-semibold text-foreground mb-4">Billing &amp; Plan</h2>
              {billing.isActive ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-300">Roomward Pro — active</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Your subscription is active. Thanks for being a customer.</p>
                </div>
              ) : (
                <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-sm font-semibold text-indigo-300">
                        {billing.isExpired ? "Trial ended" : `Free trial — ${billing.daysLeft} ${billing.daysLeft === 1 ? "day" : "days"} left`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Roomward Standard · $149/mo per property · cancel anytime.</p>
                    </div>
                    <Button onClick={() => setShowUpgrade(true)}>
                      <Sparkles className="h-4 w-4" />
                      Upgrade now
                    </Button>
                  </div>
                </div>
              )}
              <UpgradeModal open={showUpgrade} onClose={() => { setShowUpgrade(false); billing.reload(); }} />
            </div>
          )}

          {activeSection === "appearance" && <AppearancePanel />}

          {activeSection === "roles" && <RolesManager />}

          {activeSection === "integrations" && (
            <div>
              <h2 className="text-base font-semibold text-foreground mb-4">Integrations</h2>
              <div className="space-y-3">
                {INTEGRATIONS.map((i) => (
                  <div key={i.name} className="flex items-center justify-between rounded-xl bg-foreground/[0.02] border border-border px-4 py-3 hover:bg-foreground/[0.04] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{i.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{i.desc}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("badge border text-xs", i.badgeColor)}>{i.badge}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "team" && (
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">Team Members</h2>
              <p className="text-xs text-muted-foreground mb-4">Invite staff, change roles, or remove access.</p>
              <TeamManager />
            </div>
          )}

          {activeSection === "notifs" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-foreground">Notifications</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Choose what activity sends you an alert.</p>
              </div>
              {[
                { label: "New work order created", desc: "When anyone logs a new maintenance request", defaultOn: true },
                { label: "Work order assigned to you", desc: "When a job is assigned to your account", defaultOn: true },
                { label: "Critical priority alert", desc: "Immediately when a critical issue is logged", defaultOn: true },
                { label: "Work order completed", desc: "When a job you created is closed out", defaultOn: false },
                { label: "Housekeeping status changes", desc: "When rooms move between dirty / clean / ready", defaultOn: false },
                { label: "New team member joined", desc: "When someone accepts an invite to your org", defaultOn: false },
              ].map(({ label, desc, defaultOn }) => (
                <NotifRow key={label} label={label} desc={desc} defaultOn={defaultOn} />
              ))}
            </div>
          )}

          {activeSection === "security" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-foreground">Security</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Manage your password and account access.</p>
              </div>
              <ChangePasswordForm />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AppearancePanel() {
  const { mode, accent, setMode, setAccent, customHex, setCustom } = useTheme();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Appearance</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Personalize how Roomward looks. Saved to this device.</p>
      </div>

      {/* Mode */}
      <div className="space-y-2.5">
        <Label className="text-xs text-muted-foreground">Theme</Label>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {([
            { key: "dark",  label: "Dark",  icon: Moon, preview: "bg-card" },
            { key: "light", label: "Light (beta)", icon: Sun,  preview: "bg-slate-100" },
          ] as const).map(({ key, label, icon: Icon, preview }) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition-all",
                mode === key
                  ? "border-accent-500 bg-accent-500/10"
                  : "border-border hover:border-border"
              )}
            >
              <span className={cn("h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center", preview)}>
                <Icon className={cn("h-4 w-4", key === "light" ? "text-slate-600" : "text-muted-foreground")} />
              </span>
              <span className="text-sm font-medium text-foreground">{label}</span>
              {mode === key && <Check className="h-4 w-4 text-accent-text ml-auto" />}
            </button>
          ))}
        </div>
      </div>

      {/* Accent */}
      <div className="space-y-2.5">
        <Label className="text-xs text-muted-foreground">Accent color</Label>
        <div className="flex flex-wrap gap-2.5">
          {(Object.keys(ACCENTS) as AccentKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setAccent(key)}
              title={ACCENTS[key].label}
              className={cn(
                "h-9 w-9 rounded-full border-2 transition-all flex items-center justify-center",
                accent === key ? "border-white/80 scale-110" : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: ACCENTS[key].swatch }}
            >
              {accent === key && <Check className="h-4 w-4 text-white drop-shadow" />}
            </button>
          ))}

          {/* Custom color — opens the native color picker */}
          <label
            title="Custom color"
            className={cn(
              "relative h-9 w-9 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer overflow-hidden",
              accent === "custom" ? "border-white/80 scale-110" : "border-transparent hover:scale-105"
            )}
            style={{
              background:
                accent === "custom"
                  ? customHex
                  : "conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ef4444)",
            }}
          >
            <input
              type="color"
              value={customHex}
              onChange={(e) => setCustom(e.target.value)}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
              aria-label="Pick a custom accent color"
            />
            {accent === "custom"
              ? <Check className="h-4 w-4 text-white drop-shadow pointer-events-none" />
              : <Plus className="h-4 w-4 text-white drop-shadow pointer-events-none" />}
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Buttons, links, and highlights use this color. Pick any color with the rainbow swatch — Roomward auto-tunes the shades and keeps text readable.
        </p>
      </div>
    </div>
  );
}

function NotifRow({ label, desc, defaultOn }: { label: string; desc: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => setOn(v => !v)}
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors shrink-0",
          on ? "bg-indigo-500" : "bg-zinc-700"
        )}
      >
        <span className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-4" : "translate-x-0.5"
        )} />
      </button>
    </div>
  );
}

function ChangePasswordForm() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next !== form.confirm) { setMsg({ type: "err", text: "New passwords don't match." }); return; }
    if (form.next.length < 8) { setMsg({ type: "err", text: "Password must be at least 8 characters." }); return; }
    setSaving(true); setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: form.next });
    if (error) { setMsg({ type: "err", text: error.message }); }
    else { setMsg({ type: "ok", text: "Password updated." }); setForm({ current: "", next: "", confirm: "" }); }
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="space-y-3 max-w-sm">
      {[
        { label: "New password", key: "next" },
        { label: "Confirm new password", key: "confirm" },
      ].map(({ label, key }) => (
        <div key={key} className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <Input
            type="password"
            value={form[key as keyof typeof form]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            placeholder="••••••••"
            minLength={8}
          />
        </div>
      ))}
      {msg && (
        <p className={cn("text-xs px-3 py-2 rounded-lg border", msg.type === "ok"
          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
          : "text-red-400 bg-red-500/10 border-red-500/20"
        )}>{msg.text}</p>
      )}
      <Button type="submit" disabled={saving || !form.next || !form.confirm} size="sm">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        Update password
      </Button>
    </form>
  );
}
