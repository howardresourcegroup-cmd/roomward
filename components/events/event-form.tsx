"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { BanquetEvent, EventStatus, SetupStyle, Space } from "@/types";

const STATUSES: { value: EventStatus; label: string }[] = [
  { value: "inquiry",     label: "Inquiry" },
  { value: "tentative",   label: "Tentative" },
  { value: "confirmed",   label: "Confirmed" },
  { value: "in_progress", label: "In progress" },
  { value: "completed",   label: "Completed" },
  { value: "cancelled",   label: "Cancelled" },
];

const SETUPS: { value: SetupStyle; label: string }[] = [
  { value: "banquet_rounds", label: "Banquet rounds" },
  { value: "theater",        label: "Theater" },
  { value: "classroom",      label: "Classroom" },
  { value: "u_shape",        label: "U-shape" },
  { value: "boardroom",      label: "Boardroom" },
  { value: "reception",      label: "Reception" },
  { value: "hollow_square",  label: "Hollow square" },
];

const field = "mt-1 w-full h-9 rounded-lg bg-foreground/[0.04] border border-border px-2 text-sm text-foreground";

/** ISO → the value a datetime-local input wants (local time, no zone, no secs). */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value → ISO. The input is local wall time, which is what the
 *  person booking the room means; Date parses it in local zone. */
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaces: Space[];
  /** Pass an event to edit it; omit to book a new one. */
  event?: BanquetEvent | null;
  onSubmit: (input: Partial<BanquetEvent> & {
    name: string; client_name: string; starts_at: string; ends_at: string;
  }) => Promise<void>;
}

export function EventForm({ open, onOpenChange, spaces, event, onSubmit }: Props) {
  const editing = !!event;

  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [status, setStatus] = useState<EventStatus>("inquiry");
  const [setup, setSetup] = useState<SetupStyle>("banquet_rounds");
  const [headcount, setHeadcount] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [setupAt, setSetupAt] = useState("");
  const [quote, setQuote] = useState("");
  const [deposit, setDeposit] = useState(false);
  const [av, setAv] = useState("");
  const [catering, setCatering] = useState("");
  const [saving, setSaving] = useState(false);

  // Re-seed each time the dialog opens so a cancelled edit leaves nothing behind.
  useEffect(() => {
    if (!open) return;
    setName(event?.name ?? "");
    setClient(event?.client_name ?? "");
    setEmail(event?.client_email ?? "");
    setPhone(event?.client_phone ?? "");
    setSpaceId(event?.space_id ?? "");
    setStatus(event?.status ?? "inquiry");
    setSetup(event?.setup_style ?? "banquet_rounds");
    setHeadcount(event ? String(event.headcount) : "");
    setStartsAt(toLocalInput(event?.starts_at));
    setEndsAt(toLocalInput(event?.ends_at));
    setSetupAt(toLocalInput(event?.setup_starts_at));
    setQuote(event?.quoted_cents != null ? String(event.quoted_cents / 100) : "");
    setDeposit(event?.deposit_paid ?? false);
    setAv((event?.av_needs ?? []).join(", "));
    setCatering(event?.catering_notes ?? "");
  }, [open, event]);

  // The DB enforces ends_at > starts_at; catching it here avoids a raw
  // constraint-violation message reaching the user.
  const timeError = useMemo(() => {
    if (!startsAt || !endsAt) return null;
    return new Date(endsAt) <= new Date(startsAt) ? "End time must be after the start." : null;
  }, [startsAt, endsAt]);

  const submit = async () => {
    if (!name.trim())   { toast.error("Give the event a name"); return; }
    if (!client.trim()) { toast.error("Who is the client?"); return; }
    const s = fromLocalInput(startsAt);
    const e = fromLocalInput(endsAt);
    if (!s || !e)  { toast.error("Set a start and end time"); return; }
    if (timeError) { toast.error(timeError); return; }

    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        client_name: client.trim(),
        client_email: email.trim() || null,
        client_phone: phone.trim() || null,
        space_id: spaceId || null,
        status,
        setup_style: setup,
        headcount: headcount.trim() === "" ? 0 : Number(headcount),
        starts_at: s,
        ends_at: e,
        setup_starts_at: fromLocalInput(setupAt),
        quoted_cents: quote.trim() === "" ? null : Math.round(Number(quote) * 100),
        deposit_paid: deposit,
        av_needs: av.split(",").map((x) => x.trim()).filter(Boolean),
        catering_notes: catering.trim() || null,
      });
      toast.success(editing ? "Event updated" : `${name.trim()} booked`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit event" : "Book an event"}</DialogTitle>
          <DialogDescription>
            Conference, banquet or private function. Setup time drives when the room has to be turned.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[56vh] overflow-y-auto -mx-1 px-1">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Event name</span>
            <Input value={name} onChange={(ev) => setName(ev.target.value)} placeholder="Chamber Luncheon" className="mt-1 h-9" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Client</span>
              <Input value={client} onChange={(ev) => setClient(ev.target.value)} placeholder="Chamber of Commerce" className="mt-1 h-9" />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Headcount</span>
              <Input type="number" min={0} value={headcount} onChange={(ev) => setHeadcount(ev.target.value)} placeholder="90" className="mt-1 h-9" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Email <span className="text-muted-foreground/60">(opt.)</span></span>
              <Input type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} className="mt-1 h-9" />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Phone <span className="text-muted-foreground/60">(opt.)</span></span>
              <Input value={phone} onChange={(ev) => setPhone(ev.target.value)} className="mt-1 h-9" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Space</span>
              <select value={spaceId} onChange={(ev) => setSpaceId(ev.target.value)} className={field}>
                <option value="">To be decided</option>
                {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Setup style</span>
              <select value={setup} onChange={(ev) => setSetup(ev.target.value as SetupStyle)} className={field}>
                {SETUPS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Starts</span>
              <Input type="datetime-local" value={startsAt} onChange={(ev) => setStartsAt(ev.target.value)} className="mt-1 h-9" />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Ends</span>
              <Input
                type="datetime-local" value={endsAt} onChange={(ev) => setEndsAt(ev.target.value)}
                className={cn("mt-1 h-9", timeError && "border-red-500/60")}
                aria-invalid={!!timeError}
              />
            </label>
          </div>
          {timeError && <p className="text-xs text-red-400">{timeError}</p>}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Setup from <span className="text-muted-foreground/60">(opt.)</span></span>
              <Input type="datetime-local" value={setupAt} onChange={(ev) => setSetupAt(ev.target.value)} className="mt-1 h-9" />
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</span>
              <select value={status} onChange={(ev) => setStatus(ev.target.value as EventStatus)} className={field}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Quote $ <span className="text-muted-foreground/60">(opt.)</span></span>
              <Input type="number" min={0} step="0.01" value={quote} onChange={(ev) => setQuote(ev.target.value)} placeholder="4500" className="mt-1 h-9" />
            </label>
            <label className="flex items-center gap-2 h-9 cursor-pointer">
              <input
                type="checkbox" checked={deposit} onChange={(ev) => setDeposit(ev.target.checked)}
                className="h-4 w-4 rounded border-border bg-foreground/[0.04] accent-indigo-500"
              />
              <span className="text-sm text-foreground">Deposit paid</span>
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">AV needs <span className="text-muted-foreground/60">(comma separated)</span></span>
            <Input value={av} onChange={(ev) => setAv(ev.target.value)} placeholder="projector, lectern, mics: 2" className="mt-1 h-9" />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Catering notes <span className="text-muted-foreground/60">(opt.)</span></span>
            <Input value={catering} onChange={(ev) => setCatering(ev.target.value)} placeholder="Plated lunch, 6 vegetarian" className="mt-1 h-9" />
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving || !!timeError || !name.trim() || !client.trim()}>
            {saving ? "Saving…" : editing ? "Save changes" : "Book event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
