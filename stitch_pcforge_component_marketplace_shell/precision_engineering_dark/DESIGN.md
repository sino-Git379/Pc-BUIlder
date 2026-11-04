---
name: Precision Engineering Dark
colors:
  surface: '#111416'
  surface-dim: '#111416'
  surface-bright: '#37393c'
  surface-container-lowest: '#0c0f11'
  surface-container-low: '#191c1e'
  surface-container: '#1d2022'
  surface-container-high: '#272a2c'
  surface-container-highest: '#323537'
  on-surface: '#e1e2e5'
  on-surface-variant: '#bacac4'
  inverse-surface: '#e1e2e5'
  inverse-on-surface: '#2e3133'
  outline: '#85948f'
  outline-variant: '#3b4a45'
  surface-tint: '#2adec0'
  primary: '#46efcf'
  on-primary: '#00382e'
  primary-container: '#00d2b4'
  on-primary-container: '#005547'
  inverse-primary: '#006b5b'
  secondary: '#52ffdc'
  on-secondary: '#00382e'
  secondary-container: '#00e3c0'
  on-secondary-container: '#006050'
  tertiary: '#ffcca5'
  on-tertiary: '#4d2700'
  tertiary-container: '#ffa657'
  on-tertiary-container: '#723c00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#57fbdb'
  primary-fixed-dim: '#2adec0'
  on-primary-fixed: '#00201a'
  on-primary-fixed-variant: '#005144'
  secondary-fixed: '#42fdd9'
  secondary-fixed-dim: '#00dfbd'
  on-secondary-fixed: '#00201a'
  on-secondary-fixed-variant: '#005143'
  tertiary-fixed: '#ffdcc2'
  tertiary-fixed-dim: '#ffb77c'
  on-tertiary-fixed: '#2e1500'
  on-tertiary-fixed-variant: '#6d3900'
  background: '#111416'
  on-background: '#e1e2e5'
  surface-variant: '#323537'
typography:
  display:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
---

## Brand & Style

This design system embodies the clinical restraint, structural clarity, and meticulous tolerance of industrial engineering laboratories and high-end hardware prototyping tools. Designed for hardware enthusiasts, system integrators, and secondary-market PC hardware buyers, the interface rejects the aggressive visual clichés of the "gamer" aesthetic—eschewing hyper-saturated neon glows, aggressive 45-degree angle accents, skeuomorphic carbon fiber textures, and noisy HUD overlays.

Instead, the UI draws inspiration from precision CAD suites, terminal-based developer tooling, and modern architectural drafting platforms. The dominant visual tone is anchored by deep charcoal-black substrates, systematically tiered slate-gray operational planes, hairline borders, and exact tabular typographic alignment. Accent colors are treated strictly as instruments of high-priority telemetry and primary interaction cues rather than decorative embellishments. 

Interactions are rapid, tactile, and predictable: subtle micro-transitions (100ms–150ms ease-out), instant crisp focus rings, and strict geometric structure that projects trustworthiness, technical competence, and peer-to-peer transaction integrity.

## Colors

The color palette is built on strict tonal depth, engineered to minimize eye strain during extensive technical evaluation while sustaining WCAG AAA readability for critical tabular telemetry.

### Palette Architecture

- **Canvas & Backing Plane:** `#0B0D0E` serves as the root viewport foundation.
- **Surface Elevation Layers:**
  - `surface-base`: `#111416` (Default container background)
  - `surface-elevated`: `#161A1D` (Interactive cards, table rows, panel groups)
  - `surface-overlay`: `#1E2328` (Flyouts, drop-down menus, floating drawer containers)
  - `surface-active`: `#262C34` (Hover states, active selection rows, pressed fills)
- **Stroke & Structure:**
  - `border-subtle`: `#1F242B` (Internal separators, passive table dividers)
  - `border-default`: `#2D353F` (Card boundaries, standard input frames, default badges)
  - `border-hover`: `#3E4957` (Interactive border state on hover)
  - `border-focus`: `#00D2B4` (Strict 1px or 2px precision ring for keyboard focus)
- **Typography & Content Values:**
  - `text-primary`: `#F0F4F8` (Headings, primary hardware metrics, key prices)
  - `text-secondary`: `#9BA8B8` (Descriptions, secondary spec keys, navigation links)
  - `text-tertiary`: `#5F6B7A` (Inactive timestamps, unit suffixes, disabled controls)
- **Accent Signals:**
  - `accent-primary`: `#00D2B4` (Action highlights, active switches, validation confirms)
  - `accent-highlight`: `#10E7C4` (Hover states for primary actions)
  - `accent-muted`: `rgba(0, 210, 180, 0.12)` (Spec badge fills, active navigation indicator)
- **Semantic Feedback:**
  - `status-success`: `#10E7C4` / `rgba(16, 231, 196, 0.10)`
  - `status-warning`: `#E5A93C` / `rgba(229, 169, 60, 0.10)`
  - `status-danger`: `#F25F5C` / `rgba(242, 95, 92, 0.10)`
  - `status-info`: `#50A2F5` / `rgba(80, 162, 245, 0.10)`

## Typography

Typographic hierarchy relies on the interplay of two typefaces: **Geist** for crisp, modern editorial and functional UI clarity, paired with **JetBrains Mono** for all hardware telemetry, part numbers, thermal ratings, sockets, clocks, and pricing.

### Implementation Rules

- **Numerical Telemetry:** All component measurements (`3.4 GHz`, `125W TDP`, `DDR5-6000`, `PCIe 5.0 x16`) and financial amounts must use `JetBrains Mono` with tabular numbers (`tnum`) enabled to ensure vertical column alignment across comparative matrices.
- **Caps & Micro-metadata:** Category labels and technical attributes (e.g., `CHIPSET`, `FORM FACTOR`, `CONDITION`) leverage `label-caps` in uppercase format, set in `text-tertiary` to remain visually subservient to actual parameter values.
- **Heading Densities:** Headings prioritize negative letter-tracking to maintain tight cohesion on technical dashboards, avoiding expressive serif or dynamic font styling.

## Layout & Spacing

The layout is structured on an 8pt base grid with a 4pt sub-grid reserved for tight component internal padding (badges, compact inputs, status indicators).

### Viewport & Grid Architecture

- **Desktop (≥1280px):** 12-column fluid grid. Max container width capped at `1440px`. Column gutters set to `1.5rem` (`gutter-lg`), with external canvas margins of `2.5rem` (`margin-lg`). PC Builder dual-column workspace operates on an 8-column spec workbench and a 4-column live thermal/power/cost tally sheet.
- **Tablet (768px – 1279px):** 8-column layout with `1rem` gutters (`gutter`) and `1.5rem` outer margins (`margin-md`). Builders reflow to single stacked flow with sticky bottom summary bar.
- **Mobile (≤767px):** 4-column layout with `0.75rem` gutters and `1rem` margins (`margin`). Complex specification comparison tables enable horizontal scroll with frozen column keys.

### Density Philosophy

Vertical spacing between card headers, spec fields, and child metadata is intentionally tight (`space-xs` to `space-md`), minimizing redundant vertical scrolling and maximizing data density for side-by-side component comparisons.

## Elevation & Depth

Depth is established primarily via **tonal stacking** and **crisp hairline separation (1px borders)** rather than dramatic drop shadows. In a dark UI, heavy shadows are either invisible or muddy; this system uses calibrated surface luminance to indicate altitude.

### Surface Elevation Hierarchy

1. **Level 0 (Canvas):** `#0B0D0E` — Passive background canvas.
2. **Level 1 (Substrate Cards & Toolbars):** `#111416` with a border of `1px solid #2D353F`. No drop shadow.
3. **Level 2 (Active/Hovered Cards & Input Fields):** `#161A1D` with a border of `1px solid #3E4957`. Micro ambient drop shadow: `0 2px 4px rgba(0, 0, 0, 0.4)`.
4. **Level 3 (Dropdowns & Popovers):** `#1E2328` with a border of `1px solid #3E4957` and directional shadow: `0 8px 24px -4px rgba(0, 0, 0, 0.6)`.
5. **Level 4 (Modals, Slide Drawers, & Global Toasts):** `#1E2328` with a border of `1px solid #3E4957` and deep shadow: `0 16px 40px -8px rgba(0, 0, 0, 0.8)`. Modals deploy a high-opacity dark overlay: `rgba(11, 13, 14, 0.75)` with a backdrop blur of `4px`.

## Shapes

The design system enforces a disciplined, low-radius shape profile (`roundedness: 1`). Soft 4px (`0.25rem`) geometry communicates mechanical precision, recalling CNC-machined metal enclosures, GPU backplates, and silicon packaging.

### Radius Distribution

- **Base Radii (`0.25rem` / `4px`):** Buttons, inputs, filter chips, spec badges, checkboxes, status tags, listing cards, and toast alerts.
- **Container Radii (`0.5rem` / `8px`):** Top-level dialog modals, slide-in filter drawers, global comparison tables, and full-screen workspace wrappers.
- **Sharp Elements (`0px`):** Internal cell splitters, data grid vertical dividers, and progress indicator track segments.
- **Strict Exclusion:** Pill shapes (`border-radius: 9999px`) are prohibited across all standard UI controls, preserving an architectural aesthetic.

## Components

### Buttons
- **Primary:** Background `#00D2B4`, text `#0B0D0E`, font weight 600. On hover: background `#10E7C4`. On active: background `#00B89D`. No gradient.
- **Secondary:** Background `#161A1D`, text `#F0F4F8`, border `1px solid #2D353F`. On hover: background `#1E2328`, border `#3E4957`.
- **Outline:** Transparent background, border `1px solid #2D353F`, text `#9BA8B8`. On hover: border `#00D2B4`, text `#00D2B4`.
- **Ghost:** Transparent background, border `1px solid transparent`, text `#9BA8B8`. On hover: background `#161A1D`, text `#F0F4F8`.
- **Sizing:** Compact (32px height, 11px font) for dense data rows; Standard (40px height, 13px font) for general builder controls.

### Inputs & Select Dropdowns
- **Input Surface:** `#111416` fill, `1px solid #2D353F` border, 4px radius, placeholder color `#5F6B7A`, text `#F0F4F8`.
- **Interaction States:** On focus, apply `border-color: #00D2B4` with an inner box-shadow `0 0 0 1px #00D2B4`. Error states enforce `border-color: #F25F5C`.
- **Dropdown Menus:** Popover surface `#1E2328` with `1px solid #3E4957`. Option rows hover at `#262C34`. Active option highlights via left 2px vertical bar in `#00D2B4`.

### Filter Chips
- **Resting:** `#161A1D` surface with `1px solid #2D353F` border, text `#9BA8B8`, 28px height.
- **Selected:** Border `#00D2B4`, text `#00D2B4`, background `rgba(0, 210, 180, 0.08)`. Shows close `×` icon on hover.

### Badges & Status Tags
- **Spec Badges (Socket, RAM, TDP, Dimensions):** Neutral surface `#161A1D`, border `#2D353F`, monospace 11px text. Key is `#5F6B7A` and value is `#F0F4F8` (e.g., `AM5`, `105W`, `DDR5`).
- **Condition Tags (Peer-to-Peer):**
  - `New`: Background `rgba(16, 231, 196, 0.1)`, border `rgba(16, 231, 196, 0.3)`, text `#10E7C4`.
  - `Used - Like New`: Background `rgba(80, 162, 245, 0.1)`, border `rgba(80, 162, 245, 0.3)`, text `#50A2F5`.
  - `Used - Fair`: Background `rgba(229, 169, 60, 0.1)`, border `rgba(229, 169, 60, 0.3)`, text `#E5A93C`.

### Cards & Listings
- **Component Discovery Card:** Base `#111416`, `1px solid #2D353F`. Top technical strip displays category identifier (`GPU`, `CPU`) and stock status. Middle contains component title and spec badges grid. Bottom contains merchant/seller pricing in monospace bold and an `Add to Rig` button.
- **Listing Card (P2P Market):** Displays seller reputation score (`★ 4.9 (42)`), timestamp, verified hardware badge, and shipping location alongside high-contrast photos on a dark `#0B0D0E` photo container.

### Dialogs & Drawers
- **Dialogs:** Max width `560px` or `720px`. Background `#1E2328`, border `1px solid #3E4957`. Header includes strict monospace subtitle (`SYS_VERIFY_COMPONENT`). Footer uses secondary (Cancel) and primary (Confirm) alignment to the right.
- **Drawers:** Slide in from right edge for component compatibility filters, spec inspections, and power breakdown graphs. Background `#161A1D`, border-left `1px solid #2D353F`.

### Feedback, Toasts & Skeleton States
- **Toasts:** Floating anchored bottom-right. Monospace status key (`[COMPATIBILITY_WARN]`, `[RIG_SAVED]`) with concise Geist body text and instant dismiss icon.
- **Skeleton States:** Shimmer pulse across `#161A1D` to `#1E2328` base geometries with 4px border radiuses. Zero high-contrast whites or bright gray sweeps.
- **Empty States:** Subtle terminal-inspired diagram or dashed hairline box (`1px dashed #2D353F`), `#5F6B7A` technical icon, concise 14px headline (`No compatible power supplies found`), and a button to reset strict spec constraints.