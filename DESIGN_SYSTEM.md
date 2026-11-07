# VERRIFT | Public Identity and Motion Notes

## Design territories considered

1. **Evidence Room (selected)**: warm laboratory paper (`#eae9e2`), near-black green ink (`#252d2a`), oxidized clay (`#c66d4e`), restrained plant green (`#3f7356`). Oversized editorial Georgia headings, concise Helvetica body, precise console labels. This suits a product that records evidence and encourages close inspection.
2. **Night Shift Console (alternative)**: slate black (`#1b2528`), copper gold (`#bf9361`), cool grey (`#b0bec3`), and bone (`#f0eadd`). High-contrast condensed headings and small monospace details. More technically atmospheric, but less legible and welcoming for first-time visitors.

## Visual idea

The homepage is a **living repair case file**, not a generic SaaS dashboard. A large engraved V plus an interrupted, then rising line introduces an evidence trail. The paper-and-ink palette reverses at the product principles section; the closing invitation arrives as a distinct clay-color poster.

## Page architecture

1. Opening editorial promise and immediate `/app` CTA
2. Pain point: claims are not proof
3. Three-step interactive **illustrative** repair sequence, with a link to the real test workflow
4. Four principles, including the limits of Claude and Base testnet
5. Anchoring explanation without fake transaction IDs
6. Footer-adjacent full-width `Enter the app` CTA
7. Product, docs, and author links

The actual user workspace is preserved at `/app`, not embedded in the public homepage.

## Motion storyboard

| Trigger | Motion | Meaning | Fallback |
| --- | --- | --- | --- |
| Page opening | Large mark reveals upward; line is drawn over it | A repair produces an evidence trajectory | Static finished illustration |
| Scrolling | Content slides into view once using opacity and transform | Reveal the narrative in reading order | All content immediately visible |
| Pointer over intro case plate | Subtle 3D tilt, max ~2.3 degrees | Tactile artifact inspection | No tilt on touch or reduced-motion |
| Choosing one of three steps | State label, HTTP code and line path update together | A before/after verification story | Instant update |
| Clicking entry CTA | Page navigation to `/app` | Transition from explainer to functioning product | Normal navigation |

Micro-interactions remain interruptible. No scrolling is hijacked. The storyboard panel is **clearly identified as an illustration** and must not be presented as a live test result; live tests are inside `/app`.

## Responsive / accessibility

- Layout tested statically at 390, 768 and 1440 CSS px. No document horizontal overflow or JS exceptions in the available static Chromium harness.
- Sticky navigation, reduced-motion CSS, keyboard-visible focus, skip link, contrast-safe primary CTAs, semantic sections and `aria-pressed` buttons.
- Browser navigation to localhost was blocked by the evaluation environment, so a full production interaction audit remains outstanding.

## Honest limitations

- This public homepage is a separate static frontend; it requires no API or Supabase to load. The real workspace uses server APIs and needs the Vercel environment/database setup.
- No live Base transfer, Anthropic call, or Supabase connection was made during this UI implementation.
