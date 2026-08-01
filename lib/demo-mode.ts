// Is a real Supabase project wired up?
//
// Mirrors the check in middleware.ts, which cannot import from here (it runs in
// the edge runtime with its own module graph). Keep the two in sync: unset, or
// still holding the placeholder from .env.local.example, means demo.
//
// The data layer uses this to serve the bundled demo property instead of making
// requests that would fail. Only the newer query families do this; the original
// ones predate the helper and still assume Supabase.
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!url && !url.includes("your-project-id");
}

export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

/**
 * Thrown when a write is attempted with no database behind it.
 *
 * Reads fall back to the bundled demo property, which is honest — the data on
 * screen is real, it just isn't yours. Writes have no such equivalent: silently
 * returning would let the UI report success for something that never happened,
 * which is worse than any error. Callers surface this; the UI also hides the
 * controls up front so it is rarely reached.
 */
export class DemoWriteError extends Error {
  constructor(what = "Changes") {
    super(`${what} can't be saved — this is a demo with no database connected.`);
    this.name = "DemoWriteError";
  }
}

/** Guard at the top of every mutating query. */
export function refuseWriteInDemo(what?: string): void {
  if (!isSupabaseConfigured()) throw new DemoWriteError(what);
}
