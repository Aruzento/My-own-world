# Pre-Ship Design Checklist

Use for a scoped MOW visual/pre-ship review, applying only the affected surfaces and states. Current authority is `docs/02-architecture/ui/DESIGN_SYSTEM_CONTRACT.md` and the existing `--mow-*` tokens, not this imported checklist.

The generic web/mobile dimensions below are examples only when that surface is in scope. They do not impose 64px sections, 24px cards, a new type scale, one H1 per workbench or mobile-first behavior on MOW. Select supported viewports/themes and record what was actually checked. Preserve the applicable contrast, focus, hierarchy and interaction checks; N/A is different from unverified.

## Applying the Six Standards

- Tokens have semantic color, text/background, spacing, type/fallback and radius roles; reuse their current MOW definitions instead of inventing a second palette or changing brand colors by a generic percentage.
- Measure contrast: normal text 4.5:1; large text (18pt regular or 14pt bold) 3:1; required non-text UI/graphics 3:1. Interpret applicability/exemptions through the existing [WCAG reference](../../accessibility-audit/references/wcag-quick-reference.md). Check actual theme/state backgrounds.
- Make the primary action and scan order clear through size, weight, contrast, proximity and position. Decoration should improve task speed, readability or clarity; avoid competing primary actions and generic marketing layouts in the GM workbench.
- Group related controls, preserve consistent spacing, icon styling and intentional component variants. Default/focus/error/disabled treatments should not drift between equivalent controls.
- Test overflow, text readability, popup scrolling/overlap and keyboard/focus on the target viewports. Touch/iOS-specific sizing applies only when such a target is part of the task.
- A checklist pass does not replace functional tests or the actual release gate. Report failures and missing evidence before a handoff claim.

---

## Tokens and consistency

- [ ] All colors come from the token set (no hardcoded hex values)
- [ ] All spacing comes from the spacing scale (no arbitrary px values)
- [ ] All typography uses defined type tokens
- [ ] All radii use the defined radius tokens
- [ ] Shadows use defined shadow tokens
- [ ] No more than one variant per component type (e.g., one primary button style across the page)

---

## Contrast (WCAG AA)

- [ ] All body text passes 4.5:1 against its background
- [ ] All large text passes 3:1
- [ ] All UI elements (icons, borders, focus rings) pass 3:1
- [ ] Brand colors used for text use the darker text variant if the signature color fails
- [ ] No light gray text under #6B7280 on white backgrounds
- [ ] Dark mode (if implemented) tested against dark surfaces, not just light

Use a contrast checker for every pairing. Visual judgment is unreliable.

---

## Visual hierarchy

- [ ] One clear primary action per page (one primary CTA)
- [ ] Secondary actions visually subordinate to primary
- [ ] Headline larger and heavier than body text by enough to be unambiguous
- [ ] Section breaks visible without effort (spacing or background change)
- [ ] Images do not visually compete with primary content

---

## Typography

- [ ] Exactly one H1 per page
- [ ] No skipped header levels (H2 followed by H4)
- [ ] Body text minimum 14px (16px preferred)
- [ ] Line length controlled (45 to 75 characters per line for body text)
- [ ] Line height appropriate (1.4 to 1.6 for body, 1.0 to 1.2 for display)
- [ ] No fake italics or fake bold (use real font weights)

---

## Spacing and rhythm

- [ ] Consistent padding inside same-type containers (all cards, all sections)
- [ ] Section breathing room: 64px+ desktop, 48px+ mobile
- [ ] Form fields spaced minimum 16px apart vertically
- [ ] Related elements visually grouped (proximity principle)
- [ ] No cramped sections that bleed into each other

---

## Buttons and CTAs

- [ ] Primary button uses brand primary color
- [ ] Hover state visible and distinct
- [ ] Focus state visible (focus ring or equivalent)
- [ ] Disabled state visible and accessible
- [ ] Touch target minimum 44 by 44 pixels
- [ ] Button text descriptive (not "click here" or "submit")

---

## Forms

- [ ] Every input has a visible label (placeholder is not a label)
- [ ] Required fields marked clearly
- [ ] Error states have text descriptions, not just color
- [ ] Help text positioned below or beside the field, not as placeholder
- [ ] Input height accommodates touch (minimum 44px)
- [ ] Form inputs use 16px+ text on iOS to prevent zoom

---

## Images and media

- [ ] All meaningful images have descriptive alt text
- [ ] Decorative images have empty alt (`alt=""`)
- [ ] Images have explicit width and height to prevent layout shift
- [ ] Modern formats used where supported (WebP, AVIF)
- [ ] Lazy loading on below-the-fold images
- [ ] No images stretched or pixelated due to wrong sizing

---

## Interactive elements

- [ ] All interactive elements have hover states (where pointer is supported)
- [ ] Focus rings visible (do not use `outline: none` without a replacement)
- [ ] Tap targets minimum 44 by 44 pixels
- [ ] Tap targets at least 8 pixels of spacing on all sides from other tap targets
- [ ] Cursor styles correct (`pointer` for clickable, `text` for inputs, etc.)

---

## Mobile (only for a scoped mobile surface; example 375 to 390 pixels)

- [ ] Tested on real device or device-mode in browser
- [ ] No horizontal scroll
- [ ] No fixed-width elements breaking layout
- [ ] Sticky bottom bars do not overlap content (page wrapper has bottom padding)
- [ ] Sticky top bars do not eat critical content
- [ ] Mobile menu works on touch
- [ ] All text remains readable (no truncated headlines)
- [ ] Tap targets remain 44px minimum

---

## Tablet (only for a supported target; example 768 to 1024 pixels)

- [ ] Layout transitions cleanly between mobile and desktop breakpoints
- [ ] No awkward in-between sizing
- [ ] Multi-column layouts adapt sensibly

---

## Desktop (1280+ pixel viewport)

- [ ] Page max-width prevents content from stretching too wide
- [ ] Typography does not break (line lengths still controlled)
- [ ] Whitespace remains balanced

---

## Performance signals (visual)

- [ ] No visible layout shift after initial render
- [ ] Images load progressively (no blank-then-pop)
- [ ] No flash of unstyled text (FOUT) for primary fonts
- [ ] No render-blocking elements above the fold

(For deep performance audits, use `performance-optimization`.)

---

## Brand and consistency

- [ ] Logo and brand colors follow the existing MOW design contract
- [ ] Imagery follows `docs/00-product/BRANDBOOK.md` when visual intent is in scope
- [ ] UI text follows the established wording of the affected MOW flow
- [ ] No off-brand stock photography or generic illustrations

---

## Accessibility (basic checks; for deeper audits use `accessibility-audit`)

- [ ] Page operable by keyboard alone
- [ ] Logical tab order
- [ ] Form fields have associated labels (`for`/`id` or `aria-labelledby`)
- [ ] Buttons and links use semantic elements (not `<div onClick>`)
- [ ] Skip links present for long pages
- [ ] Page language declared (`<html lang="...">`)

---

## Pre-launch sanity

- [ ] No placeholder text remaining ("Lorem ipsum," "TODO," "[Replace this]")
- [ ] No broken images
- [ ] No broken links (test 5 random links)
- [ ] No console errors in browser dev tools
- [ ] No accessibility errors in browser audit tools

---

## Sign-off

When all applicable checks pass, the scoped visual review is complete. This does not certify an untested build or replace release policy. If a check fails, record the failure and its impact; fix it or explicitly carry the known issue into the handoff.

The checklist is the floor, not the ceiling. Great design exceeds it.
