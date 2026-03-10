# Plant Water Array — Design System

This document defines the visual language, design tokens, and component patterns for the Plant Water Array frontend. All future UI work should adhere to these conventions.

## Aesthetic Direction

**"Greenhouse Control Room"** — a dark-mode monitoring interface that balances the organic nature of plant care with the precision of sensor data. The design pairs botanical serif typography with monospaced data readouts, emerald green accents against deep slate surfaces, and subtle animated status indicators.

### Core Principles

1. **Data-forward** — sensor readings, device status, and alerts are the primary content. Present them prominently using monospaced numerals and color-coded values.
2. **Dark & atmospheric** (default) — deep slate backgrounds with subtle topographic texture. Cards and surfaces float with soft shadows rather than hard borders. Light mode available via navbar toggle.
3. **Organic accents** — emerald green primary accent evokes plant life. Amber/gold for warnings (soil/drought). Coral red for danger/alerts.
4. **Restraint in motion** — animate on entry (fade-in, slide-up) and status indicators (pulse). Avoid gratuitous motion elsewhere.

---

## Typography

Three font families, loaded from Google Fonts:

| Role | Font | Weight(s) | Usage |
|------|------|-----------|-------|
| **Display** | `Instrument Serif` | 400, italic | Page titles (`.page-title`), brand name, modal headings |
| **Body** | `Plus Jakarta Sans` | 300–700 | All UI text, labels, buttons, paragraphs |
| **Mono** | `Space Mono` | 400, 700 | Sensor values, timestamps, device IDs, badges, ADC readings |

### Tailwind Classes

```
font-display  →  Instrument Serif
font-body     →  Plus Jakarta Sans (default body font)
font-mono     →  Space Mono
```

### Conventions

- Page headings: `font-display text-3xl` (use `.page-title` utility)
- Section headings: `font-body text-lg font-semibold` (use `.section-title` utility)
- Data values: `font-mono text-accent tabular-nums` (use `.data-value` utility)
- Labels/captions: `text-xs font-mono text-text-muted uppercase tracking-wider`

---

## Color Palette

All colors are defined as Tailwind theme extensions. Use semantic names, not raw hex values.

### Backgrounds

| Token | Hex | Usage |
|-------|-----|-------|
| `canvas` | `#0c1117` | Page background, body |
| `canvas-50` | `#111920` | Sidebar, navbar, elevated bg |
| `canvas-100` | `#161f28` | Input backgrounds, nested cards |
| `canvas-200` | `#1c2732` | Hover states, badges |
| `canvas-300` | `#24303d` | Active states |

### Surfaces

| Token | Usage |
|-------|-------|
| `surface` (`#182028`) | Card backgrounds |
| `surface-hover` (`#1e2a34`) | Card hover state |
| `surface-border` | Default border (10% opacity) |
| `surface-border-hover` | Hover border (22% opacity) |

### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `accent` | `#34d399` | Primary action, online status, healthy moisture |
| `accent-dim` | `#10b981` | Hover state for primary accent |
| `accent-glow` | `rgba(52,211,153,0.12)` | Glow backgrounds for accent elements |
| `soil` | `#d97706` | Warning state, low moisture, provisioning |
| `soil-dim` | `#b45309` | Hover state for soil accent |
| `soil-glow` | `rgba(217,119,6,0.12)` | Glow backgrounds for warnings |
| `danger` | `#f87171` | Error state, critical alerts, delete actions |
| `danger-dim` | `#ef4444` | Hover state for danger |
| `danger-glow` | `rgba(248,113,113,0.12)` | Glow backgrounds for errors |

### Text

| Token | Hex | Usage |
|-------|-----|-------|
| `text` | `#e8edf3` | Primary text (headings, names) |
| `text-secondary` | `#8899a6` | Secondary text (table cells, descriptions) |
| `text-muted` | `#5c6f7e` | Tertiary text (labels, captions, placeholders) |

---

## Component Classes

Defined in `src/index.css` as Tailwind `@layer components`. Use these instead of writing one-off styles.

### `.card`

The primary surface container. Dark background with subtle border and shadow.

```html
<div class="card p-5">
  <!-- content -->
</div>
```

- Includes hover transition for border and shadow
- Use `p-5` for standard padding, `p-6` for spacious layouts

### `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`

Button variants. All include focus rings, disabled states, and active scale.

```html
<button class="btn-primary">Save</button>
<button class="btn-secondary text-xs">Cancel</button>
<button class="btn-danger text-xs py-1.5 px-3">Delete</button>
<button class="btn-ghost text-xs">Dismiss</button>
```

### `.input`

Form inputs and selects. Dark background with accent-colored focus ring.

```html
<input type="text" class="input" placeholder="..." />
<select class="input">...</select>
```

Select elements automatically get a custom dropdown chevron.

### `.badge`

Small label/tag for metadata (version numbers, status, etc).

```html
<span class="badge bg-canvas-200 text-text-muted border border-surface-border">v1.0</span>
<span class="badge bg-accent-glow text-accent border border-accent/15">Calibrated</span>
```

### `.status-dot`

Animated status indicator. 8px circle with optional pulse animation.

```html
<span class="status-dot status-dot--online"></span>    <!-- green, pulsing -->
<span class="status-dot status-dot--offline"></span>    <!-- muted gray -->
<span class="status-dot status-dot--provisioning"></span> <!-- amber, fast pulse -->
```

### `.moisture-bar`

Horizontal progress bar for moisture percentage. Uses a gradient fill (amber → green).

```html
<div class="moisture-bar">
  <div class="moisture-bar-fill" style="width: 65%"></div>
</div>
```

### `.data-value`

Inline monospaced accent text for numbers and data.

```html
<span class="data-value text-sm">192.168.1.42</span>
```

### `.page-title`, `.section-title`

Heading utilities. Page title uses the serif display font; section title uses the body font.

---

## Layout

### App Shell

- **Sidebar**: 240px (`w-60`), fixed left, `bg-canvas-50`, border-right
- **Navbar**: Full width header inside content area, shows current page title (serif font) and system status
- **Main content**: Scrollable area with `px-6 py-6 lg:px-10` padding

### Page Structure

Every page follows this pattern:

```tsx
<div className="space-y-6 animate-fade-in">
  {/* Optional stats/controls row */}
  {/* Main content cards */}
</div>
```

### Cards & Tables

- Use `<DataTable>` for tabular data — it wraps itself in `.card`
- Use `.card p-5` for form sections, stats, empty states
- Table headers: `text-[11px] font-mono text-text-muted uppercase tracking-wider`

---

## Animations

Defined in `tailwind.config.js`:

| Class | Effect | Duration |
|-------|--------|----------|
| `animate-fade-in` | Opacity 0→1 | 400ms |
| `animate-slide-up` | Opacity + translateY(12px→0) | 400ms |
| `animate-slide-in-left` | Opacity + translateX(-12px→0) | 300ms |
| `animate-pulse-slow` | Slow pulse | 3s infinite |

### Usage Patterns

- Page root: `animate-fade-in`
- Staggered list items: `animate-slide-up` with `style={{ animationDelay: '${i * 80}ms' }}`
- Status dots: CSS `statusPulse` keyframe (defined in index.css)

---

## Shadows

| Token | Usage |
|-------|-------|
| `shadow-card` | Default card shadow |
| `shadow-card-hover` | Card hover shadow (deeper) |
| `shadow-glow` | Subtle accent glow |
| `shadow-glow-accent` | Stronger accent glow (brand mark, highlights) |

---

## Theming

The design system supports both dark and light modes via CSS custom properties.

### How It Works

All colors are defined as CSS custom properties in `:root` (dark theme) and `.light-theme` (light theme override) in `index.css`. Tailwind references these variables, so all existing utility classes automatically adapt.

- **Toggle**: Sun/moon button in navbar, visible on all screen sizes
- **Persistence**: `localStorage.getItem('theme')` — defaults to `'dark'`
- **Flash prevention**: Inline `<script>` in `index.html` applies theme class before first paint
- **Transition**: 200ms ease on background-color, color, border-color, box-shadow

### CSS Variable Format

Solid colors use space-separated RGB triplets for Tailwind alpha modifier support:
```css
:root { --accent: 52 211 153; }
/* Usage: bg-accent/20 → rgb(52 211 153 / 0.2) */
```

Pre-baked opacity colors use full `rgba()`:
```css
:root { --accent-glow: rgba(52, 211, 153, 0.12); }
```

### useTheme() Hook

```tsx
import { useTheme } from '@/context/ThemeContext';

const { theme, toggleTheme, chartColors } = useTheme();
```

- `theme`: `'dark' | 'light'`
- `toggleTheme()`: switches theme and persists to localStorage
- `chartColors`: memoized color map for Recharts components (hex/rgba values)

### Light Mode Palette

| Token | Dark | Light |
|-------|------|-------|
| canvas | `#0c1117` | `#f8fafb` |
| surface | `#182028` | `#ffffff` |
| accent | `#34d399` | `#10b981` |
| soil | `#d97706` | `#b45309` |
| danger | `#f87171` | `#dc2626` |
| text | `#e8edf3` | `#1a2332` |
| text-secondary | `#8899a6` | `#526170` |
| text-muted | `#5c6f7e` | `#8899a6` |

---

## Charts (Recharts)

The `SensorReadingsGraph` component uses an AreaChart with these conventions:

- **Background**: transparent (inherits dark card surface)
- **Grid**: `rgba(148, 163, 184, 0.06)` dashed lines
- **Line/Area**: `#34d399` stroke, gradient fill fading to transparent
- **Tooltip**: dark background (`#182028`), accent-bordered, rounded-xl
- **Axis text**: `#5c6f7e`, 11px, Space Mono
- **Active dot**: emerald fill with dark stroke

---

## Icons

Using `@heroicons/react/24/outline`. Standard size is `w-[18px] h-[18px]` in navigation, `w-4 h-4` in inline contexts.

Custom SVG icons are used for:
- Brand leaf/plant mark (Sidebar)
- Device icon (DeviceCard, Devices empty state)

---

## Do's and Don'ts

**Do:**
- Use semantic color tokens (`text-accent`, `bg-danger-glow`) not raw Tailwind colors (`text-green-400`)
- Use `.card`, `.btn-*`, `.input` component classes
- Use `font-mono` for any numeric data or technical identifiers
- Add `animate-fade-in` to page root elements
- Use `space-y-6` for page-level vertical rhythm

**Don't:**
- Use hardcoded hex colors — use CSS variables and Tailwind tokens instead
- Use generic fonts (Inter, Roboto, Arial) — use the three defined families
- Add heavy animations or transitions beyond the defined set
- Use raw `bg-gray-*` or `text-gray-*` — use the `canvas-*`, `surface-*`, and `text-*` tokens
- Create one-off button styles — extend the `.btn-*` system if needed
