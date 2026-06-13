"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/brand/logo";

// Public demo entry — linked straight from the landing page. Signs the visitor
// in anonymously, provisions their private throwaway sandbox (start_demo), and
// drops them into the app. No form, no account.
export default function DemoPage() {
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // React 18 strict-mode double-mount guard
    started.current = true;

    (async () => {
      try {
        const supabase = createClient();
        // Reuse an existing session if they re-visit /demo mid-session
        const { data: existing } = await supabase.auth.getUser();
        if (!existing.user) {
          const { error: anonErr } = await supabase.auth.signInAnonymously();
          if (anonErr) throw anonErr;
        }
        const { error: rpcErr } = await supabase.rpc("start_demo");
        if (rpcErr && !existing.user?.is_anonymous) throw rpcErr;
        // Signal dashboard to auto-start the product tour for first-time demo visitors.
        sessionStorage.setItem("rw:start_tour", "1");
        window.location.href = "/";
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't start the demo.");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#080811] text-zinc-100 flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <LogoMark className="h-12 w-12 rounded-xl shadow-lg shadow-indigo-500/30 mx-auto mb-6" />
        {error ? (
          <>
            <p className="text-sm font-semibold text-red-400">{error}</p>
            <p className="text-xs text-zinc-500 mt-2">
              You can also <Link href="/signup" className="text-indigo-400 hover:text-indigo-300">start a free trial</Link> with your email.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400 mx-auto mb-3" />
            <p className="text-sm font-semibold">Building your demo hotel…</p>
            <p className="text-xs text-zinc-500 mt-2 flex items-center justify-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              A private sandbox, just for you — it cleans itself up when you leave.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
