# VERRIFT visual identity and UI standards

**Current selected direction (V6): Pine & Tide.** Pure white canvas (`#ffffff`), deep pine navigation (`#153f35`), ocean-blue accents (`#3177a5`) and quiet mint (`#a9eccc`). Typography pairs a Georgia editorial display with restrained sans/monospace operational labels. Orange and copper accents have been removed. The first `/app` screen welcomes visitors and offers a wallet picker. Private workspace metrics are derived from API data after successful wallet authentication, not from sample dashboard numbers.

The remaining notes below preserve the historical V5 exploration for reference, not as active palette instructions.

# VERRIFT | Public Identity and Motion Notes

## Design territories considered

1. **White Evidence Room (selected, V5)**: pure white canvas (`#ffffff`), charcoal-green ink (`#202c27`), rust accents (`#bf6548`), and forest green (`#28654a`). Pale green surfaces are reserved for contextual cards. Oversized editorial Georgia headings, concise Helvetica body, precise console labels. This suits a product that records evidence and encourages close inspection.
2. **Night Shift Console (alternative)**: slate black (`#1b2528`), copper gold (`#bf9361`), cool grey (`#b0bec3`), and bone (`#f0eadd`). High-contrast condensed headings and small monospace details. More technically atmospheric, but less legible and welcoming for first-time visitors.

## Visual idea

The homepage is a **living repair case file**, not a generic SaaS dashboard. A large engraved V plus an interrupted, then rising line introduces an evidence trail. The clean white and deep-green palette reverses at the product principles section; the closing invitation arrives as a distinct clay-color poster.

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

## Workspace redesign V5

The `/app` workspace adopts a precise, airy information hierarchy inspired by modern productivity tools without copying any existing service. A white sidebar organizes Overview, Cases, Domains and Docs. The lead panel remains VERRIFT forest green and the functional call to action is prominent.

The overview is made of **real state-backed components**: case count, executed checks, verified repairs, Base Sepolia receipts, recent repair cases, test environment controls, latest actual observations and a four-stage proof guide. All progress indicators are derived from returned API records. The two panel illustrations are labeled as illustrative, and do not pretend to show real checks.

No additional frontend dependencies are required. The white theme is implemented through `public/styles.css`, `public/landing.css` and the workspace-only override `public/ui-v5.css`.

## Responsive / accessibility

- Landing and workspace layouts tested with static Chromium previews at 390, 768 and 1440 CSS px. No document horizontal overflow or JS exceptions in the available static Chromium harness.
- Sticky navigation, reduced-motion CSS, keyboard-visible focus, skip link, contrast-safe primary CTAs, semantic sections and `aria-pressed` buttons.
- Browser navigation to localhost was blocked by the evaluation environment, so a full production interaction audit remains outstanding.

## Honest limitations

- This public homepage is a separate static frontend; it requires no API or Supabase to load. The real workspace uses server APIs and needs the Vercel environment/database setup.
- No live Base transfer, Anthropic call, or Supabase connection was made during this UI implementation.

## V9 visual extension

A compact two-up claims ribbon sits above the Wallet Passport. Forest green means owned activity/streak; soft mint and white represent Base token holdings. One unobtrusive Get VIBES menu item provides the optional transaction flow. The quotation card has separated input, expected output, slippage, route, and explicit confirmation states. Do not show fabricated APR, price charts, daily reward yields or artificial volume.
