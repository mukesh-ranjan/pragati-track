# Pragati Track — design brief

Source: the three mockups in this folder (`ui-1-dashboard-dark.png`, `ui-2-detail-ask-ai.png`, `ui-3-mobile-light.png`). Tokens live in `web/src/styles/tokens.css`; every token is on display at `/style-tile`.

## Audience

Operations staff at Pragati Logistics who run a "control tower" for the Indian network: a dispatcher starting a shift (dashboard), a support agent chasing one late parcel (detail view), and a hub manager on a phone (mobile). They scan many numbers quickly, act on exceptions, and increasingly ask an AI assistant for answers. Customers tracking a parcel share the same visual language on the public tracking page.

## Mood

Calm night-shift control room. Deep navy backgrounds make saffron accents and signal colours glow; nothing shouts except what needs action. Dense but breathable: cards float on a slightly darker canvas, data reads at a glance, and the one orange button on screen is always the next thing to do. Indian context shows in content (₹, city names, Devanagari on the map), not in decoration.

## Layout

- **Shell.** Fixed left sidebar (brand, nav, network footer) and a scrolling main column. Page header carries a greeting or ID, a sub-line of context, a search field, and one primary saffron action top-right.
- **Grid.** KPI tiles in a row of four, then a 2:1 split (live map or journey timeline on the left, "Needs attention" or "Ask Pragati AI" panel on the right), then a row of three chart cards. On mobile everything stacks into a single column; tiles go two-up.
- **Cards.** Raised surface, 1 px border, large radius (16–20 px), 20–24 px padding, title left and meta text right in the same header line.
- **Status.** Pills with tinted background and matching text: red for delayed and address issues, amber for at risk, blue for in transit and out for delivery, green for delivered. Timeline dots use the same colours; the current step is saffron.
- **Type.** Plus Jakarta Sans for everything; JetBrains Mono for tracking IDs, timestamps and tool calls. Big numbers are bold and tight; labels are small caps-style uppercase with letter-spacing.

## Do

- Use the dark theme by default and keep light mode as a first-class variant (mobile mockup) via `data-theme` on `<html>`.
- Reserve saffron for the single primary action, the active nav indicator and the "now" timeline step.
- Use teal for positive progress bars and on-time series; red for late, amber for at risk.
- Put every numeric ID and time in the mono face so columns align.
- Pair every KPI with a delta line (arrow, value, comparison) in a signal colour.
- Keep motion short (150–250 ms) and purposeful: hover lift, pill fade, LIVE pulse.

## Do not

- Do not use saffron for text or more than one button per view; it stops meaning "act here".
- Do not use pure black or pure white backgrounds; stay on the navy and off-white tokens.
- Do not add drop shadows in dark mode beyond the soft card glow; borders do the separating.
- Do not invent new status colours; the six API statuses map onto the four signal hues above.
- Do not use gradients anywhere except the saffron accent (buttons, route bars) and sparkline fills.
- Do not shrink body text below 14 px or labels below 12 px, even on mobile.
