# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Animigo is a French pet-sitting platform connecting pet owners with trusted animal caretakers. Built with Next.js 16, React 19, TypeScript, and Convex (self-hosted) as the backend.

## Development Commands

```bash
bun install              # Install dependencies
bun run dev              # Start Next.js dev server (localhost:3000)
bun run build            # Production build
bun run lint             # Run ESLint
bunx convex dev          # Start Convex backend (separate terminal)
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript 5
- **Backend**: Convex 1.31.5 (self-hosted deployment)
- **Styling**: Tailwind CSS 4 with custom theme
- **Animations**: Framer Motion
- **Maps**: Leaflet + React-Leaflet
- **UI Primitives**: Radix UI
- **Package Manager**: Bun

## Architecture

### Directory Structure

```
app/
├── components/
│   ├── ui/           # Reusable UI (button, card, badge)
│   ├── sections/     # Landing page sections (hero, services, FAQ, etc.)
│   ├── navbar.tsx
│   └── footer.tsx
├── dashboard/        # Protected dashboard with nested routes
│   ├── components/   # Dashboard-specific components
│   ├── missions/     # Mission management (accepter, en-cours, etc.)
│   ├── planning/     # Calendar view
│   ├── messagerie/   # Messaging system
│   └── ...
├── lib/              # Utilities and data
│   ├── utils.ts      # cn() helper for Tailwind classes
│   ├── constants.ts  # Navigation, services, FAQs
│   ├── animations.ts # Framer Motion variants
│   └── *-data.ts     # Mock data files
├── providers/
│   └── ConvexClientProvider.tsx
└── globals.css       # Theme variables and custom animations
convex/
└── _generated/       # Auto-generated Convex types
```

### Key Patterns

1. **Convex Self-Hosted**: Backend uses Convex in self-hosted mode. The `ConvexClientProvider` wraps the app and requires `NEXT_PUBLIC_CONVEX_URL` environment variable.

2. **Animation System**: Predefined Framer Motion variants in `lib/animations.ts` (containerVariants, itemVariants, fadeInUp, scaleIn, etc.). Use these for consistent animations.

3. **Styling**: Custom color palette defined in `globals.css`:
   - Primary: #FF6B6B (red)
   - Secondary: #4ECDC4 (teal)
   - Accent: #FFE66D (yellow)
   - Purple: #9B5DE5

4. **Maps**: Leaflet components use `next/dynamic` with `ssr: false` to avoid hydration issues.

5. **Component Pattern**: Interactive components use `"use client"` directive. Most UI components combine Radix primitives with Framer Motion.

## Language

All UI text is in French. Maintain French language for user-facing content.

## Environment Variables

```
NEXT_PUBLIC_CONVEX_URL=<your-convex-self-hosted-url>
```
