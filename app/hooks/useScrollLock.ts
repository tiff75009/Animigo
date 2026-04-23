"use client";

import { useEffect, useRef } from "react";

/** Breakpoint Tailwind `lg` — au-dessus, on ne lock pas (desktop). */
const MOBILE_BREAKPOINT = 1024;

/**
 * Hook pour bloquer le scroll du body quand une modale/sheet est ouverte.
 * Mobile-only : ne lock pas si la fenêtre est en mode desktop (≥ 1024px),
 * car les sheets associées sont masquées par CSS sur desktop. Sans ce garde,
 * la page reste figée alors que rien n'est visible.
 */
export function useScrollLock(isLocked: boolean) {
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (!isLocked) return;
    // Garde mobile-only — pas de lock sur desktop
    if (typeof window !== "undefined" && window.innerWidth >= MOBILE_BREAKPOINT) {
      return;
    }

    scrollYRef.current = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollYRef.current);
    };
  }, [isLocked]);
}
