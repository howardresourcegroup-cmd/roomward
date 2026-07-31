"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Safety net for "the page is dimmed and nothing is clickable".
//
// Radix locks interaction while a dialog/menu/select is open by setting
// `pointer-events: none` on <body>, and restores it when that layer closes. If a
// layer's owner unmounts mid-open — a route change fired from inside it, a
// realtime refresh swapping the row it belonged to — the restore can be skipped
// and the lock outlives the overlay: the whole app goes unclickable with no
// visible cause and no way out but a reload.
//
// So on every route change, and once shortly after, we check for the *impossible*
// state — body locked while no Radix layer is actually open — and release it.
// It's deliberately conservative: with any layer still open, this does nothing.
export function InteractionGuard() {
  const pathname = usePathname();

  useEffect(() => {
    const release = () => {
      const body = document.body;
      if (body.style.pointerEvents !== "none") return;
      const layerOpen = document.querySelector(
        '[data-radix-popper-content-wrapper], [data-state="open"][role="dialog"], [data-state="open"][role="menu"], [data-state="open"][role="listbox"]'
      );
      if (layerOpen) return; // a real overlay owns the lock — leave it alone
      body.style.removeProperty("pointer-events");
    };

    release();
    // Radix restores on its own cleanup tick; re-check after it has had a turn so
    // we only step in when it genuinely did not.
    const t = setTimeout(release, 400);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
