---
name: ui-ux-enhancement
description: 'Upgrade existing UI with distinctive typography, polished animations, and depth-rich surfaces. Use when asked to improve fonts, add animations, elevate visual design, fix generic AI aesthetics, polish a design system, add micro-interactions, or upgrade motion to feel intentional. Produces a phased design audit + implementation plan + working code changes across CSS, Tailwind config, and React components.'
argument-hint: 'Describe the scope: full app, single page, or specific component. Mention any aesthetic direction (editorial, clinical, luxury, brutalist, etc.) or constraints (CSS-only, no new deps, dark mode).'
---

# UI/UX Enhancement — Typography, Motion & Depth

Systematically upgrades an existing React/TypeScript/Tailwind application from generic "AI-slop" aesthetics to a distinctive, production-grade visual identity. The output is a phased plan + concrete code changes.

## When to Use

- Replacing generic fonts (Inter, Roboto, Arial, Space Grotesk)  
- Adding orchestrated animations instead of scattered `fadeIn`/`slideUp`  
- Upgrading flat backgrounds to layered, atmospheric surfaces  
- Polishing buttons, cards, and sidebars with spatial depth  
- Building a consistent design token system for color, type, and motion  

---

## Phase 1 — Design Thinking (Before Writing Code)

Commit to a bold aesthetic direction before touching files.

### 1.1 Read Context
- Who uses this UI? (end users, clinicians, ops, consumers)
- What feeling should it convey? (precision, warmth, urgency, luxury, editorial, industrial, playful)
- What are the hard constraints? (CSS-only, no new npm deps, must support dark mode, WCAG AA)

### 1.2 Choose an Aesthetic Pole
Pick one extreme and execute it with precision — do NOT land in the middle.

| Pole | Font Personality | Motion Style | Surface Style |
|------|-----------------|--------------|---------------|
| Precision/Editorial | High-contrast serif display + humanist sans | Staggered reveals, measured ease | Subtle noise texture, ink-depth darks |
| Organic/Natural | Rounded display + flowing serif body | Spring physics, gentle float | Gradient mesh, warm grain |
| Brutalist/Raw | Condensed grotesque or slab | Hard cuts, snap transitions | Flat color blocks, strong borders |
| Luxury/Refined | Thin serif display + airy body | Slow ease-out, fade dissolves | Layered translucency, deep shadow |
| Playful/Toy-like | Rounded variable + mono accents | Bounce, overshoot keyframes | Colorful card pops, confetti bursts |

### 1.3 Define the One Unforgettable Thing
Every great UI has one signature moment. Commit to it now:
- A typographic hero stat that stops the eye
- A sidebar that glows like a precision instrument
- Cards that breathe on hover
- A hero gradient that feels atmospheric, not decorative

---

## Phase 2 — Audit Existing Design

Scan these file pairs in parallel:

| What | Where to Look |
|------|--------------|
| Font imports | `index.html` `<link>` tags, `index.css` `@import` |
| Font variables | `tailwind.config.ts` → `theme.fontFamily`, `index.css` → `--font-*` |
| Color tokens | `index.css` CSS custom properties, Tailwind theme extend |
| Animation utilities | `tailwind.config.ts` keyframes/animation, `index.css` `@keyframes` |
| Surface/gradient | `index.css`, component files for `background:` or `bg-*` classes |
| Card & button styles | `src/components/ui/card.tsx`, `src/components/ui/button.tsx` |
| Sidebar | Layout components for `aside`, `nav` wrappers |

### Audit Checklist — Flag Issues

- [ ] Font is Inter, Roboto, Arial, or system-ui → **Must replace**
- [ ] All headings use same weight/family as body → **Needs display font**
- [ ] Gradient is a single `linear-gradient` with one axis → **Needs 3-layer radial mesh**
- [ ] Backgrounds are solid colors only → **Needs noise/grain texture**
- [ ] Animations share no stagger or delay structure → **Needs orchestration**
- [ ] Cards have identical shadow on all screen contexts → **Needs 3-level elevation system**
- [ ] Buttons have only `hover:bg-opacity` change → **Needs spatial lift + glow**
- [ ] Stats are static text → **Needs `useCountUp` hook**

---

## Phase 3 — Typography Upgrade

### 3.1 Choose Font Pairing (Never Use These)
❌ Banned: `Inter`, `Roboto`, `Arial`, `Space Grotesk`, `DM Sans`, `Poppins`, any system font as primary

✅ Good display picks (authoritative):
- `DM Serif Display` — ink-contrast serif, italics excel at data labels
- `Playfair Display` — editorial luxury
- `Cormorant Garamond` — refined, ultra-high contrast
- `Syne` — geometric, modern editorial

✅ Good body picks (humanist/geometric sans with character):
- `Outfit` — geometric humanist, friendly terminals, clinical crispness
- `Plus Jakarta Sans` — optical balance at all sizes
- `Figtree` — rounded, warm but precise
- `Nunito Sans` — approachable yet structured

### 3.2 Apply Font Pairing

```html
<!-- index.html — replace existing Google Fonts link -->
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
```

```css
/* index.css */
:root {
  --font-display: 'DM Serif Display', Georgia, serif;
  --font-sans:    'Outfit', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', monospace; /* keep or swap */
}
```

```ts
// tailwind.config.ts — inside theme.extend.fontFamily
fontFamily: {
  display: ['var(--font-display)'],
  sans:    ['var(--font-sans)'],
  mono:    ['var(--font-mono)'],
}
```

### 3.3 Usage Rules
- `font-display` → `h1`, `h2`, `h3`, hero stats, empty-state headings, large KPI numbers
- `font-sans` → body copy, UI labels, buttons, forms, table data
- `font-mono` → IDs, timestamps, code, numeric data in tables

---

## Phase 4 — Color System Upgrade

### 4.1 Anatomy of a Strong Palette
- **One dominant primary** (teal, indigo, forest, rose) — vivid enough to own interactive elements
- **One amplified primary** (`--primary-vivid`) for hover states and glow effects
- **One warm accent** (`--accent-vivid` — amber, coral, gold) for focus emphasis and urgency
- **4-level surface hierarchy** instead of 2: `--surface-0` → `--surface-3`
- **Deep background** with slight hue (not pure black/white) — adds warmth

```css
/* index.css additions */
:root {
  --primary-vivid:   <hue> <sat+10%> <light+6%>;   /* brighter than --primary */
  --accent-vivid:    38 95% 52%;                     /* amber — adjust to brand */

  --surface-0: 0 0% 100%;           /* canvas */
  --surface-1: 215 30% 98%;         /* card */
  --surface-2: 215 25% 95%;         /* nested / input bg */
  --surface-3: 215 20% 90%;         /* hover state */
}
```

### 4.2 Gradient — 3-Layer Radial Mesh Pattern

Replace flat `linear-gradient` with a mesh of overlapping radial gradients:

```css
--gradient-hero:
  radial-gradient(ellipse 120% 80% at 20% 50%, hsl(var(--primary) / 0.9) 0%, transparent 60%),
  radial-gradient(ellipse 80%  60% at 80% 20%, hsl(199 89% 48% / 0.6)     0%, transparent 50%),
  linear-gradient(160deg, hsl(220 35% 8%) 0%, hsl(var(--primary) / 0.17) 100%);
```

---

## Phase 5 — Surface Depth & Texture

### 5.1 Noise/Grain Texture (Zero Image Dependencies)

```css
/* index.css - @layer components */
.surface-noise::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  border-radius: inherit;
}
```

Apply to: hero panels, sidebar backgrounds, stat card hover.

### 5.2 Dot-Grid Pattern (Login / Hero Panels)

```css
.hero-panel-grid {
  background-image: radial-gradient(circle, hsl(0 0% 100% / 0.08) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

### 5.3 Card Elevation System (3 Levels)

```css
.card-flat    { box-shadow: 0 1px  3px  hsl(215 20% 11% / 0.06); }
.card-raised  { box-shadow: 0 4px  12px hsl(215 20% 11% / 0.08), 0 1px 3px hsl(215 20% 11% / 0.06); }
.card-float   { box-shadow: 0 16px 40px hsl(215 20% 11% / 0.12), 0 4px 12px hsl(215 20% 11% / 0.08); }

.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 48px hsl(215 20% 11% / 0.14), 0 6px 16px hsl(215 20% 11% / 0.10);
  transition: transform 200ms ease, box-shadow 200ms ease;
}
```

---

## Phase 6 — Buttons & Sidebar Polish

### 6.1 Button Upgrade — Gradient + Glow + Lift

```css
.btn-primary {
  background: linear-gradient(180deg, hsl(var(--primary-vivid)) 0%, hsl(var(--primary)) 100%);
  box-shadow: 0 2px 8px hsl(var(--primary) / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.15);
  transition: all 180ms ease;
}
.btn-primary:hover {
  background: hsl(var(--primary-vivid));
  box-shadow: 0 6px 18px hsl(var(--primary) / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.2);
  transform: translateY(-1px);
}
.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px hsl(var(--primary) / 0.3);
}
```

### 6.2 Sidebar Active Item — Left-Border Glow

```css
.sidebar-item-active {
  background: hsl(var(--sidebar-accent));
  border-left: 2px solid hsl(var(--primary));
  box-shadow: inset 0 0 20px hsl(var(--primary) / 0.08);
}

.sidebar-group-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: hsl(var(--sidebar-foreground) / 0.4);
}
```

### 6.3 Input Focus Elevation

```css
input:focus-visible,
textarea:focus-visible {
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15), 0 1px 4px hsl(var(--primary) / 0.1);
  outline: none;
  transition: box-shadow 150ms ease, border-color 150ms ease;
}
```

---

## Phase 7 — Motion System

### 7.1 Decision: CSS-Only vs Library
- **CSS-only** → for HTML prototypes, performance-critical paths, no-dep constraint
- **Motion (previously Framer Motion)** → for React component orchestration, `AnimatePresence`, variants
- **Native Web Animations API** → for imperative, JS-driven sequences

### 7.2 Orchestrated Page-Load Stagger (Framer Motion)

```tsx
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 }
  }
};

const cardReveal = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
  }
};

// Usage: wrap card grid in <motion.div variants={staggerContainer} initial="hidden" animate="show">
//         and wrap each card in <motion.div variants={cardReveal}>
```

### 7.3 `useCountUp` Hook — Stats Animation

```tsx
// src/hooks/useCountUp.ts
import { useState, useEffect } from 'react';

export function useCountUp(target: number, duration = 1200, delay = 200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      const start = performance.now();
      const animate = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay);
    return () => clearTimeout(timer);
  }, [target, duration, delay]);
  return value;
}
```

### 7.4 CSS-Only Tailwind Animation Additions

```ts
// tailwind.config.ts — theme.extend

keyframes: {
  'fade-up':   { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
  'fade-in':   { '0%': { opacity: '0' },                                 '100%': { opacity: '1' } },
  'scale-in':  { '0%': { opacity: '0', transform: 'scale(0.95)' },       '100%': { opacity: '1', transform: 'scale(1)' } },
  'glow-pulse':{ '0%, 100%': { boxShadow: '0 0 8px hsl(var(--primary) / 0.3)' }, '50%': { boxShadow: '0 0 20px hsl(var(--primary) / 0.6)' } },
},
animation: {
  'fade-up':    'fade-up   0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
  'fade-in':    'fade-in   0.25s ease both',
  'scale-in':   'scale-in  0.3s  cubic-bezier(0.22, 1, 0.36, 1) both',
  'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
},
```

---

## Phase 8 — Implementation Sprint Plan

Generate a prioritized sprint table after completing the audit. Template:

| Sprint | Theme | Key Files | Est. Effort |
|--------|-------|-----------|-------------|
| 1 | Typography & color foundation | `index.html`, `index.css`, `tailwind.config.ts` | 2–3 h |
| 2 | Surface depth & card elevation | `index.css`, login/hero page | 2 h |
| 3 | Button system & sidebar polish | `button.tsx`, sidebar layout | 2 h |
| 4 | Motion & stats animation | `useCountUp.ts`, `StatsCard.tsx`, dashboard pages | 2–3 h |
| 5 | Page-level hero upgrades | `LandingPage.tsx`, key dashboard pages | 2–3 h |

**Prioritize Sprint 1 always** — typography + color changes every screen simultaneously for maximum visible impact per minute invested.

---

## Quality Checklist Before Finishing

- [ ] No Inter / Roboto / Arial in font stack
- [ ] Display font applied to at least `h1`–`h3`, hero stats
- [ ] All backgrounds have at least 2 layers (gradient mesh, texture, or CSS pattern)
- [ ] Cards have differentiated elevation (at least 2 of 3 levels used)
- [ ] Buttons lift and glow on hover
- [ ] At least one orchestrated stagger animation on a heavily-viewed page
- [ ] Stats counters animate with `useCountUp`
- [ ] All interactive elements have `transition` properties set
- [ ] Dark mode values tested if dark mode is active
- [ ] WCAG AA contrast ratio preserved (use browser devtools accessibility panel to verify)
