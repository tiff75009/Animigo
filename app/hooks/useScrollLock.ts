"use client";

import { useEffect, useRef } from "react";

/**
 * Hook pour bloquer le scroll du body quand une modale/sheet est ouverte.
 * Sauvegarde et restaure la position de scroll de manière fiable.
 */
export function useScrollLock(isLocked: boolean) {
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (!isLocked) return;

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
