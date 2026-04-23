"use client";

import { ReactNode } from "react";

/**
 * Fond chaleureux avec pattern de pattes SVG discret.
 * Opacity 0.05–0.08 pour ne pas distraire du contenu.
 */
export function PawPatternBg({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background:
          "linear-gradient(135deg, #FFECDB 0%, #FFF6EB 45%, #FFEAF0 100%)",
      }}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.06 }}
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="paws-bg-search"
            width="140"
            height="140"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(15)"
          >
            <g fill="#2C3E50">
              {/* Patte 1 */}
              <circle cx="20" cy="40" r="3" />
              <circle cx="32" cy="28" r="2.5" />
              <circle cx="48" cy="28" r="2.5" />
              <circle cx="60" cy="40" r="3" />
              <ellipse cx="40" cy="52" rx="8" ry="7" />
              {/* Patte 2 */}
              <circle cx="90" cy="100" r="2.5" />
              <circle cx="100" cy="92" r="2" />
              <circle cx="114" cy="92" r="2" />
              <circle cx="124" cy="100" r="2.5" />
              <ellipse cx="107" cy="110" rx="7" ry="6" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#paws-bg-search)" />
      </svg>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
