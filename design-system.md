# Universal Design System Guide
> **Purpose:** এই ফাইলটা AI coding agent (Claude, Codex, Antigravity, Cursor, etc.) কে system instruction হিসেবে দাও। এতে থাকা rules follow করলে যেকোনো app/website design consistent, professional, এবং scalable হবে — বারবার আলাদা করে explain করা লাগবে না।

---

## 0. How to use this file
- এই পুরো ফাইলটা project root-এ `DESIGN_SYSTEM.md` নামে রাখো।
- Agent-কে বলো: *"Always follow DESIGN_SYSTEM.md for every UI decision — typography, spacing, color, shadow, radius, button states."*
- নতুন component বানানোর আগে agent যেন এই tokens থেকেই value নেয়, কখনো arbitrary/random value (`padding: 13px`, `font-size: 15.5px`) না বসায়।
- Golden rule: **"No magic numbers."** যেকোনো spacing, color, radius, shadow — সব একটা defined scale থেকে আসবে।

---

## 1. Core Design Principles

1. **Consistency over creativity in structure** — layout, spacing, typography scale সবসময় একই system মেনে চলবে। Creativity ব্যয় হবে content/brand-এ, structure-এ না।
2. **8-point grid system** — সব spacing, sizing 4 অথবা 8-এর multiple হবে (4, 8, 12, 16, 24, 32, 48, 64...)। এতে visual rhythm তৈরি হয়।
3. **Hierarchy through scale, not randomness** — size, weight, color contrast দিয়ে hierarchy বানাও, না বানিও নতুন font বা arbitrary color দিয়ে।
4. **Accessibility is non-negotiable** — minimum contrast ratio, focus states, tap target size সবসময় মানতে হবে (WCAG AA baseline)।
5. **One accent, controlled use** — primary accent color একটাই থাকবে; বেশি accent color মানেই noisy UI।
6. **Motion is functional, not decorative** — animation শুধু feedback/orientation দেওয়ার জন্য, show-off-এর জন্য না।

---

## 2. Typography System

### 2.1 Type Scale (Major Third — ratio 1.25)
একটা modular scale ব্যবহার করো যাতে সব heading/body আকার predictable ও harmonious হয়।

| Token | Size (px) | Size (rem) | Line Height | Usage |
|---|---|---|---|---|
| `display` | 57px | 3.563rem | 1.1 | Hero headline, landing page |
| `h1` | 45px | 2.813rem | 1.15 | Page title |
| `h2` | 36px | 2.25rem | 1.2 | Section title |
| `h3` | 29px | 1.813rem | 1.25 | Sub-section title |
| `h4` | 23px | 1.438rem | 1.3 | Card title, modal title |
| `h5` | 18px | 1.125rem | 1.4 | Small heading, list heading |
| `body-lg` | 18px | 1.125rem | 1.6 | Lead paragraph |
| `body` | 16px | 1rem | 1.6 | Default paragraph text |
| `body-sm` | 14px | 0.875rem | 1.5 | Secondary text, helper text |
| `caption` | 12px | 0.75rem | 1.4 | Labels, timestamps, meta info |
| `overline` | 11px | 0.688rem | 1.3 | Eyebrow text (uppercase, letter-spacing) |

### 2.2 Font Weights
| Token | Value | Usage |
|---|---|---|
| `regular` | 400 | Body text |
| `medium` | 500 | UI labels, buttons, emphasis inline |
| `semibold` | 600 | Sub-headings, card titles |
| `bold` | 700 | Headings, strong emphasis |

### 2.3 Font Pairing Rule
- সর্বোচ্চ **2 font family** ব্যবহার করো: একটা **Display/Heading** face, একটা **Body/UI** face। প্রয়োজনে একটা **Monospace** (code/data) face।
- একই family-র মধ্যে weight/size দিয়ে variation বানানোই better; নতুন font না আনাই ভালো, যদি না brand-এর নিজস্ব personality দরকার হয়।
- Fallback stack বাধ্যতামূলক: `font-family: "Inter", -apple-system, "Segoe UI", sans-serif;`

### 2.4 Letter Spacing
| Context | Value |
|---|---|
| Large headings (>32px) | `-0.02em` (tight) |
| Body text | `0` (normal) |
| All-caps labels/overline | `0.08em` (wide) |

### 2.5 Line Length
- Body text-এর ideal line length: **45–75 characters** per line (`max-width: 65ch`)।

---

## 3. Spacing System (8pt Grid)

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Icon-text gap, tight inline spacing |
| `space-2` | 8px | Small gaps, chip padding |
| `space-3` | 12px | Input padding, small component gaps |
| `space-4` | 16px | Default padding, card inner spacing |
| `space-5` | 24px | Section inner spacing |
| `space-6` | 32px | Between related components |
| `space-8` | 48px | Between distinct sections |
| `space-10` | 64px | Large section breaks |
| `space-12` | 96px | Hero/major section separation |

**Rule:** Padding সবসময় margin-এর চেয়ে predictable রাখো। Component-এর ভিতরের padding fixed, বাইরের margin context-based।

---

## 4. Layout & Grid

### 4.1 Breakpoints
| Token | Width | Device |
|---|---|---|
| `xs` | 0–479px | Small mobile |
| `sm` | 480–767px | Mobile |
| `md` | 768–1023px | Tablet |
| `lg` | 1024–1279px | Laptop |
| `xl` | 1280–1535px | Desktop |
| `2xl` | 1536px+ | Large desktop |

### 4.2 Container Max-Width
| Breakpoint | Container Width |
|---|---|
| `lg` and up | 1140px |
| `xl` | 1280px |
| `2xl` | 1400px |

### 4.3 Grid
- 12-column grid, gutter = `space-5` (24px) desktop, `space-4` (16px) mobile।
- Column gap ও row gap আলাদা define করো (`gap`, `row-gap`)।

---

## 5. Color System

### 5.1 Structure (semantic tokens — hex hardcode না করে token নাম ব্যবহার করো)

```
color/
├── primary        (brand accent — 1 টা মূল color)
├── primary-hover
├── primary-active
├── neutral-0        → white / lightest bg
├── neutral-50 → 900  → gray scale (9-10 steps)
├── success
├── warning
├── danger
├── info
```

### 5.2 Example Palette (customize per brand, structure same থাকবে)
| Token | Hex | Usage |
|---|---|---|
| `primary-500` | #2563EB | Main CTA, links, active states |
| `primary-600` | #1D4ED8 | Hover state |
| `primary-700` | #1E40AF | Active/pressed state |
| `neutral-0` | #FFFFFF | Background (light mode) |
| `neutral-50` | #F8FAFC | Subtle section bg |
| `neutral-200` | #E2E8F0 | Borders, dividers |
| `neutral-500` | #64748B | Secondary text |
| `neutral-900` | #0F172A | Primary text |
| `success-500` | #16A34A | Success states |
| `warning-500` | #D97706 | Warning states |
| `danger-500` | #DC2626 | Error/destructive states |

### 5.3 Contrast Rules (WCAG AA)
- Body text vs background: **contrast ratio ≥ 4.5:1**
- Large text (18px+ bold, 24px+ regular): **≥ 3:1**
- UI component borders/icons: **≥ 3:1**

### 5.4 Dark Mode
- Pure black (`#000`) এড়িয়ে চলো — near-black (`#0B0F19`) ব্যবহার করো, eye strain কম হয়।
- Dark mode-এ shadow কাজ করে না ভালো ভাবে — border/glow দিয়ে elevation বোঝাও।

---

## 6. Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-none` | 0px | Table, dense data UI |
| `radius-sm` | 4px | Chips, tags, small inputs |
| `radius-md` | 8px | Buttons, inputs, cards (default) |
| `radius-lg` | 12px | Modals, larger cards |
| `radius-xl` | 16px | Hero cards, feature blocks |
| `radius-full` | 9999px | Pills, avatars, circular buttons |

**Rule:** পুরো app-এ ২টার বেশি radius scale mix করা যাবে না (যেমন শুধু `md` + `full`)।

---

## 7. Elevation & Shadows

Shadow = depth-এর signal, decoration না। Light source সবসময় উপর থেকে ধরো।

| Token | Value | Usage |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgba(15,23,42,0.06)` | Subtle card border-replacement |
| `shadow-sm` | `0 1px 3px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.06)` | Card resting state |
| `shadow-md` | `0 4px 6px rgba(15,23,42,0.10), 0 2px 4px rgba(15,23,42,0.06)` | Dropdown, popover |
| `shadow-lg` | `0 10px 15px rgba(15,23,42,0.10), 0 4px 6px rgba(15,23,42,0.05)` | Modal, dialog |
| `shadow-xl` | `0 20px 25px rgba(15,23,42,0.12), 0 8px 10px rgba(15,23,42,0.06)` | Large overlays, hero cards |

**Elevation levels map:** flat card = `xs/sm` → dropdown/tooltip = `md` → modal/dialog = `lg` → toast/critical overlay = `xl`.

---

## 8. Buttons

### 8.1 Sizes
| Token | Height | Padding (H) | Font Size |
|---|---|---|---|
| `sm` | 32px | 12px | 14px |
| `md` | 40px | 16px | 14px |
| `lg` | 48px | 20px | 16px |

### 8.2 Variants
- **Primary** — solid fill, primary color, white text. Main CTA per screen (সাধারণত ১টাই)।
- **Secondary** — outline/border, primary color text, transparent bg।
- **Tertiary/Ghost** — no border, no bg, শুধু text/icon — low-emphasis action।
- **Destructive** — danger color fill/outline — delete/remove actions।
- **Disabled** — 40% opacity, `cursor: not-allowed`, no hover effect।

### 8.3 States (সব interactive component-এর জন্য প্রযোজ্য)
| State | Visual Change |
|---|---|
| Default | Base style |
| Hover | Background 1 shade গাঢ়/হালকা, subtle transition (150ms) |
| Focus | 2px outline/ring, offset 2px, accessible color |
| Active/Pressed | Background আরও গাঢ়, slight scale (0.98) optional |
| Disabled | Opacity 40%, no pointer events |
| Loading | Spinner replace text, button width fixed রাখো (layout shift না হয়) |

### 8.4 Touch Target
- Minimum tappable area: **44×44px** (mobile accessibility standard), even if visual size ছোট হয়, padding দিয়ে area বাড়াও।

---

## 9. Forms & Inputs

| Property | Value |
|---|---|
| Height | 40px (`md`), 48px (`lg`) |
| Padding | 12px horizontal |
| Border | 1px solid `neutral-200`, focus-এ `primary-500` |
| Border radius | `radius-md` (8px) |
| Focus ring | 2px `primary-200`, offset 1px |
| Error state | Border `danger-500` + helper text `danger-600` |
| Label | `body-sm`, `medium` weight, `space-2` (8px) gap থেকে input |
| Helper/Error text | `caption` size, `space-1` (4px) gap থেকে input |

---

## 10. Iconography

- একটাই icon set/library ব্যবহার করো পুরো project-এ (e.g., Lucide, Phosphor, Heroicons) — mix করা যাবে না।
- Standard sizes: **16px** (inline/inside input), **20px** (buttons/nav), **24px** (standalone/feature icons)।
- Stroke width consistent রাখো (সাধারণত 1.5–2px)।
- Icon color সবসময় text color-এর সাথে match/derive করবে, আলাদা random color না।

---

## 11. Motion & Animation

| Token | Duration | Easing | Usage |
|---|---|---|---|
| `duration-fast` | 100–150ms | ease-out | Hover, button press |
| `duration-base` | 200–250ms | ease-in-out | Dropdown, tooltip, tab switch |
| `duration-slow` | 300–400ms | ease-in-out | Modal open/close, page transition |

**Rules:**
- `transform` ও `opacity` দিয়ে animate করো — `width/height/top/left` avoid করো (performance)।
- `prefers-reduced-motion` respect করবে — motion-sensitive user-দের জন্য animation off/minimal করো।
- Micro-interaction subtle রাখো; bounce/elastic easing শুধু playful brand-এর জন্য, corporate/utility app-এ না।

---

## 12. Z-Index Scale

| Token | Value | Usage |
|---|---|---|
| `z-base` | 0 | Default content |
| `z-dropdown` | 10 | Dropdown, select menu |
| `z-sticky` | 20 | Sticky header/nav |
| `z-overlay` | 30 | Modal backdrop |
| `z-modal` | 40 | Modal/dialog content |
| `z-toast` | 50 | Toast/notification |
| `z-tooltip` | 60 | Tooltip (সবচেয়ে উপরে) |

---

## 13. Component States Checklist (প্রতিটা interactive component-এই মানতে হবে)

প্রতিটা button/input/card/link বানানোর সময় agent যেন এই states cover করে:
- [ ] Default
- [ ] Hover
- [ ] Focus (keyboard-visible)
- [ ] Active/Pressed
- [ ] Disabled
- [ ] Loading (যদি async action থাকে)
- [ ] Error (form elements-এর ক্ষেত্রে)
- [ ] Empty state (list/table-এর ক্ষেত্রে)

---

## 14. Accessibility Baseline

- Color contrast: WCAG AA minimum (section 5.3 দেখো)।
- Keyboard navigation: সব interactive element Tab দিয়ে reachable, visible focus ring থাকতে হবে।
- Semantic HTML ব্যবহার করো (`<button>`, `<nav>`, `<label>`) — শুধু `<div onClick>` না।
- Images-এ meaningful `alt` text, decorative image-এ `alt=""`।
- Form input-এ সবসময় associated `<label>`।

---

## 15. Naming Convention for Tokens

Consistency-র জন্য token নাম এই pattern মেনে চলবে:

```
{category}-{property}-{variant}-{state}
```

Examples:
- `color-bg-primary`
- `color-text-secondary`
- `space-4`
- `radius-md`
- `shadow-lg`
- `font-size-h1`

---

## 16. Quick Agent Instruction Summary
> নিচের কথাগুলো prompt-এর শুরুতে/system prompt-এ paste করে দাও:

```
Always use the design tokens defined in DESIGN_SYSTEM.md for this project:
- Spacing: only use the 8pt scale (4, 8, 12, 16, 24, 32, 48, 64, 96px)
- Typography: use the defined type scale, max 2 font families, defined weights only
- Colors: use semantic tokens only, never hardcode arbitrary hex values
- Border radius: max 2 radius values across the entire UI
- Shadows: use only the 5 defined elevation levels
- Buttons/inputs: implement all defined states (hover, focus, active, disabled, loading)
- Always meet WCAG AA contrast and keyboard accessibility
- No magic numbers anywhere in spacing, sizing, or color
```

---

*এই document-টাকে project-এর "single source of truth" হিসেবে ট্রিট করো। নতুন কোনো UI decision নেওয়ার আগে এখানে existing token আছে কিনা check করো — না থাকলে নতুন token add করো এই file-এ, তারপর ব্যবহার করো।*
