"use client";

import { icons } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconsMap = icons as Record<string, LucideIcon>;

/**
 * Rend une icône Lucide dynamiquement à partir de son nom (string).
 * Fallback sur l'icône "Info" si le nom n'est pas trouvé.
 */
export function LucideIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const IconComponent = iconsMap[name];
  if (!IconComponent) {
    const Fallback = iconsMap["Info"];
    return <Fallback className={className} />;
  }
  return <IconComponent className={className} />;
}
