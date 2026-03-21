# Color System

This document defines the current SPANER portal color palette and how it should be used in UI design and implementation.

It expands the original short palette list into a practical reference for:

- visual consistency
- component styling
- future design work
- frontend implementation

The current project palette is already reflected in [app.css](/d:/GitHub/page/spaner/src/app.css#L3) and [portal-page.css](/d:/GitHub/page/spaner/src/lib/styles/portal-page.css#L1).

## Design direction

The SPANER portal uses a warm academic / research-lab palette:

- strong violet tones for structure, navigation, headings, and identity
- gold for action and emphasis
- tan for soft borders and supporting accents
- white, paper, and mist for calm light surfaces
- black for readable body text

The overall look should feel:

- credible
- calm
- slightly premium
- not overly dark
- not overly playful

## Core palette

### Base colors

| Token | Hex | Name | Primary purpose |
| --- | --- | --- | --- |
| `--color-black` | `#000000` | Black | primary text, icons, dark contrast |
| `--color-white` | `#FFFFFF` | White | bright surfaces, inverted text |
| `--color-deep-violet` | `#32006E` | Deep Violet | brand anchor, headings, high-emphasis UI |
| `--color-royal-violet` | `#4B2E83` | Royal Violet | secondary brand tone, links, accents |
| `--color-tan` | `#B7A57A` | Tan | borders, subtle outlines, soft interface accents |
| `--color-gold` | `#FFC700` | Gold | primary CTA, highlights, active accents |
| `--color-paper` | `#FFFDF7` | Paper | warm card surface |
| `--color-mist` | `#F6F1E6` | Mist | soft page background |

### Quick palette summary

- `#32006E` is the most authoritative brand color.
- `#4B2E83` is the supporting violet used for secondary emphasis.
- `#FFC700` should attract attention, so it should be used sparingly.
- `#B7A57A` works best as a supporting structural color, not a headline color.
- `#FFFDF7` and `#F6F1E6` keep the product from feeling cold or sterile.

## Current implementation tokens

The active root tokens are:

```css
:root {
  --color-black: #000000;
  --color-white: #ffffff;
  --color-deep-violet: #32006e;
  --color-royal-violet: #4b2e83;
  --color-tan: #b7a57a;
  --color-gold: #ffc700;
  --color-paper: #fffdf7;
  --color-mist: #f6f1e6;
}
```

Source: [app.css](/d:/GitHub/page/spaner/src/app.css#L3)

When adding new UI, prefer using these existing tokens first before introducing new hex values.

## Semantic usage rules

### Text

- Use `--color-black` for normal body copy on light backgrounds.
- Use `--color-deep-violet` for major headings, section titles, and strong brand moments.
- Use `--color-royal-violet` for secondary headings, links, and form labels.
- Use `--color-white` for text placed on violet surfaces.
- Avoid using `--color-gold` for long text blocks.

### Surfaces

- Use `--color-white` for clean input surfaces and simple content blocks.
- Use `--color-paper` for cards and warm elevated panels.
- Use `--color-mist` for page-level background transitions or soft canvas zones.
- Use violet gradients for major navigation surfaces, sidebars, and hero framing.

### Borders and dividers

- Use `--color-tan` for soft borders, outlines, separators, and input chrome.
- Use transparent tan variants for subtle borders rather than heavy full-opacity lines.
- Keep borders quiet so content and actions remain dominant.

### Actions and emphasis

- Use `--color-gold` for the primary call to action.
- Use `--color-royal-violet` for secondary interactive emphasis.
- Use `--color-deep-violet` when you need authority or brand weight.
- Do not use gold for every button on a screen. Reserve it for the most important action.

## Recommended component mapping

### Navigation

- Sidebar background: `deep violet -> royal violet` gradient
- Sidebar text: `white`
- Active nav background: soft gold tint
- Active nav text: `white`

This pattern is already used in [app.css](/d:/GitHub/page/spaner/src/app.css#L61).

### Login / register pages

- Page background: `white -> mist` gradient with soft gold and violet radial glows
- Main card background: `paper`
- Brand name and page title: `deep violet`
- Form labels: `royal violet`
- Primary button: `gold`
- Secondary button: transparent with `tan` border and `royal violet` text

This pattern is already used in [portal-page.css](/d:/GitHub/page/spaner/src/lib/styles/portal-page.css#L1).

### Forms

- Input background: `white`
- Input text: `black`
- Input border: soft tan
- Focus ring: gold-tinted glow
- Optional accent edge: royal violet

### Status and badges

The current project does not yet have a fully expanded semantic status palette.

For now:

- use violet family colors for neutral or branded states
- use gold for highlighted or active states
- avoid inventing many ad hoc colors unless the product introduces formal success / warning / error tokens

If richer state feedback is needed later, add semantic tokens such as:

- `--color-success`
- `--color-warning`
- `--color-danger`
- `--color-info`

Those should be documented separately instead of mixing state meaning into brand tokens.

## Gradients and overlays

The current UI relies on layered gradients and translucent overlays rather than flat blocks of color.

### Approved gradient patterns

#### Light page gradient

```css
linear-gradient(180deg, #ffffff 0%, #f6f1e6 100%)
```

Use for:

- page backgrounds
- large authentication shells
- calm content canvases

#### Violet structural gradient

```css
linear-gradient(180deg, #32006e 0%, #4b2e83 100%)
```

Use for:

- sidebars
- hero framing
- strong brand surfaces

### Approved translucent accents

- gold glow: `rgba(255, 199, 0, 0.12)` to `rgba(255, 199, 0, 0.20)`
- royal violet haze: `rgba(75, 46, 131, 0.14)` to `rgba(75, 46, 131, 0.18)`
- deep violet shadow: `rgba(50, 0, 110, 0.08)` to `rgba(50, 0, 110, 0.12)`

Use these for:

- radial background accents
- soft highlights
- subtle shadows
- focus or hover atmosphere

Do not use them as replacements for solid text color.

## Accessibility guidance

### Contrast

- Black on white or paper should be the default for long-form readability.
- White on deep violet and white on royal violet are acceptable for high-contrast structural areas.
- Gold should usually be used as a background or accent, not as paragraph text on light surfaces.
- Tan should be treated as a support color, not a primary text color.

### Safe combinations

Recommended high-confidence combinations:

- black on white
- black on paper
- deep violet on paper
- deep violet on mist
- white on deep violet
- white on royal violet
- black on gold

Combinations to avoid for body text:

- gold on white
- tan on white
- tan on mist
- royal violet on gold for small text

### Focus and input states

- focus should be visible even without color sensitivity
- combine border change with glow or outline, not color alone
- keep focus styles consistent across buttons, inputs, and links

## Practical do and do not rules

### Do

- reuse the existing tokens first
- keep gold reserved for high-value emphasis
- keep large surfaces light and readable
- use violet tones to express hierarchy and brand identity
- use paper and mist to soften the interface

### Do not

- introduce random one-off hex values without documenting them
- make every button gold
- use pure black backgrounds unless there is a deliberate new theme
- rely on tan for important text
- use saturated violet and saturated gold together in large competing areas without neutral spacing

## Suggested semantic layer for future growth

If the design system expands, the next step should be semantic aliases on top of the base palette.

Example:

```css
:root {
  --surface-page: var(--color-mist);
  --surface-card: var(--color-paper);
  --surface-raised: var(--color-white);

  --text-primary: var(--color-black);
  --text-heading: var(--color-deep-violet);
  --text-secondary: var(--color-royal-violet);
  --text-inverse: var(--color-white);

  --border-soft: rgba(183, 165, 122, 0.45);
  --accent-primary: var(--color-gold);
  --accent-secondary: var(--color-royal-violet);
}
```

This would make future redesigns easier because components would depend on meaning, not raw color names.

## When adding a new color

Before adding a new color token, ask:

1. Can an existing base token solve this?
2. Is this a brand color, a semantic state color, or a one-off illustration color?
3. Will it appear in multiple places?
4. Does it preserve contrast and consistency?

If the answer is "one isolated screen only", it probably should not become a global token.

## Summary

The SPANER palette is built around:

- violet for identity and structure
- gold for action and emphasis
- tan for softness and interface framing
- paper / mist / white for calm, readable surfaces
- black for clarity and content legibility

Use the existing CSS tokens as the source of truth, and extend the system semantically instead of scattering new hard-coded values throughout the app.
