---
name: Kinetic Silicon
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434656'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737688'
  outline-variant: '#c3c5d9'
  surface-tint: '#004fe4'
  primary: '#0046cc'
  on-primary: '#ffffff'
  primary-container: '#0d5cff'
  on-primary-container: '#ecedff'
  inverse-primary: '#b6c4ff'
  secondary: '#006b59'
  on-secondary: '#ffffff'
  secondary-container: '#55fcd8'
  on-secondary-container: '#00725f'
  tertiary: '#681cd9'
  on-tertiary: '#ffffff'
  tertiary-container: '#8241f3'
  on-tertiary-container: '#f5ebff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#003baf'
  secondary-fixed: '#55fcd8'
  secondary-fixed-dim: '#27dfbc'
  on-secondary-fixed: '#002019'
  on-secondary-fixed-variant: '#005142'
  tertiary-fixed: '#eaddff'
  tertiary-fixed-dim: '#d2bbff'
  on-tertiary-fixed: '#25005a'
  on-tertiary-fixed-variant: '#5a00c6'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '800'
    lineHeight: 52px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system drives a forward-thinking, welcoming, and high-performance PC component marketplace. The aesthetic balances deep hardware credibility with approachable consumer clarity, avoiding the dark, intimidating tropes of traditional enthusiast hubs in favor of a crisp, daylight-first workspace.

- **Design Philosophy:** Modern Technologist — clean structural white space, surgical borders, and high-energy luminescent accents.
- **Atmosphere:** Optimistic, precise, and friction-free. Assembling complex hardware feels as accessible and satisfying as snapping together modular architecture.
- **Visual Personality:** Airy surfaces, confident typography, high-visibility technical metadata, and responsive interactive feedback that provides confidence in compatibility and specs.

## Colors

The system relies on an ultra-clean base canvas punctuated by high-frequency electric accents that communicate hardware status, pricing tiers, and performance brackets:

- **Primary (`#0D5CFF` — Hyper Cobalt):** Anchors core calls to action, active navigation tabs, interactive state highlights, and primary selection states.
- **Secondary (`#00D4B2` — Electric Cyan):** Delivers confirmation signals, positive compatibility checks, in-stock validation badges, and high-energy interactive accents.
- **Tertiary (`#7C3AED` — Deep Kinetic Violet):** Reserved for enthusiast/overclock flags, premium tier tags, benchmark visualizers, and spotlight promotional treatments.
- **Citrus Warning / Alert (`#FF9E00` / `#10B981`):** Functional signals for low stock alerts, thermal thresholds, and wattages.
- **Neutral Palette:**
  - Canvas Base: `#FFFFFF` and `#F8FAFC` for layered elevation.
  - Surface Substrates: `#F1F5F9` for data cells, pill tracks, and input wells.
  - Hairline Boundaries: `#E2E8F0` for structural grid precision.
  - Typography Base: `#0F172A` for absolute headline contrast, descending to `#64748B` for specs and helper metadata.

## Typography

The typographic hierarchy juxtaposes human-centric geometric sans-serif body text with clinical monospaced data accents:

- **Display & Body (`Plus Jakarta Sans`):** Delivers friendly, open curves with high legibility across dense spec sheets, price figures, and editorial catalog intros.
- **Technical & Metric Metadata (`JetBrains Mono`):** Applied deliberately to SKUs, clock speeds, socket types, power ratings, wattage totals, and live compatibility states to emphasize engineered accuracy and modular parity.
- **Hierarchy Handling:** Keep spec lists strictly tabular with consistent monospaced lining figures, ensuring rapid vertical scanning across competitive component listings.

## Layout & Spacing

A disciplined 12-column layout grid structures component matrices, configuration tables, and side-by-side spec comparisons:

- **Desktop (1200px+):** 12 columns with `1.5rem` (24px) gutters and a max canvas boundary of 1440px centered with `2rem` (32px) margins. Sticky parametric filter rail fixed to 3 columns; product catalog matrix occupying 9 columns.
- **Tablet (768px - 1199px):** 8 columns with `1.25rem` (20px) gutters. Filter rail collapses into a horizontal chip bar or slide-over drawer; product grid flexes to 2 or 3 columns.
- **Mobile (Under 768px):** 4 columns with `0.75rem` (12px) gutters and `1rem` (16px) outer edge margins. Product cards collapse into full-width compact list layouts or a 2-column density grid.
- **Rhythm:** Spacing follows an absolute 4px/8px modular base scale to keep alignment locked across nested configuration cards.

## Elevation & Depth

Depth is established through soft, multi-stop ambient light washes contained by hairline structural borders rather than aggressive drop shadows:

- **Flat Surface (Level 0):** Pure `#FFFFFF` or `#F8FAFC` base bounded by a crisp `1px solid #E2E8F0` border.
- **Card Rest (Level 1):** `box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.04), 0 2px 6px -1px rgba(15, 23, 42, 0.02);` accompanied by a `1px solid #E2E8F0` border.
- **Card Hover / Focused Module (Level 2):** Elevated interactive elements shift smoothly upward via `transform: translateY(-2px);` paired with `box-shadow: 0 12px 30px -4px rgba(13, 92, 255, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04);` and an active border tint shift to `#CBD5E1` or Primary.
- **Floating Overlays & Drawers (Level 3):** Modal configurators, compatibility trays, and sticky power calculators use `box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.12);` along with a subtle backdrop filter (`backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.85);`).

## Shapes

The design system employs generous, modern corner radii that soften hardware density while preserving technical structure:

- **Standard Base Radii (`0.5rem` / 8px):** Applied to form fields, nested micro-chips, action icons, and tabular data containers.
- **Container Radii (`rounded-lg` / `1rem` / 16px):** Applied to product cards, specification modules, and configuration trays.
- **Feature Surfaces (`rounded-xl` / `1.5rem` / 24px):** Utilized on hero display banners, system builder canvas panels, and standalone modal sheets.
- **Pill Geometry (`9999px`):** Reserved exclusively for dynamic status chips, socket compatibility badges, stock indicators, and price tags.

## Components

### Buttons
- **Primary:** Solid `#0D5CFF` fill, `#FFFFFF` text, `rounded-lg`, subtle glow shadow on hover (`0 8px 16px -4px rgba(13, 92, 255, 0.35)`).
- **Secondary / Action:** `#FFFFFF` background with `1px solid #E2E8F0`, `#0F172A` text, shifting to `#F1F5F9` on hover.
- **Energy Accent (Quick-Add):** Electric Cyan (`#00D4B2`) button with `#0F172A` text for frictionless cart commitment.

### Compatibility & Stock Badges
- **100% Compatible Badge:** Pill shape, `JetBrains Mono` label-sm, background `#F0FDF4`, border `1px solid #BBF7D0`, text `#15803D`, with a solid `#22C55E` indicator dot.
- **Incompatible / Warning Badge:** Pill shape, background `#FEF2F2`, border `1px solid #FECACA`, text `#B91C1C`.
- **Stock Flag:** Pill shape, background `#ECFDF5`, text `#047857`, featuring real-time quantity micro-counters.

### Product Matrix Cards
- Structured inside `rounded-xl` surfaces with a 1px `#E2E8F0` border.
- **Top Section:** High-contrast neutral image frame with soft `#F8FAFC` backdrop and absolute-positioned status badges.
- **Middle Section:** Part categorization, bold item headline (`Plus Jakarta Sans`), and a 2-column tabular spec summary using `JetBrains Mono` for rapid specification checks (e.g., `TDP: 170W`, `BASE: 4.7GHz`).
- **Bottom Section:** Price lockup paired with an inline cart/builder-slot toggle button.

### Interactive Spec Filters
- Sticky vertical rail featuring expandable accordion segments.
- Checkboxes feature rounded corners (`6px`) with cyan-to-cobalt check fills.
- Dual-handle range sliders with an illuminated `#0D5CFF` fill track and high-precision monospaced numerical readouts.

### Compatibility Drawer & Wattage Counter
- Persistent bottom or side-docked HUD displaying real-time system metrics: Total Wattage Bar (colored progressively from Electric Cyan to Citrus Amber based on headroom), Socket Alignment checkmark, and physical clearance dimensions.