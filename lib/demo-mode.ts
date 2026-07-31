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
