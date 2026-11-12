# ADR 0001: Chargeable weight is the greater of actual and volumetric, rounded up to the next half kilo

An architecture decision record (ADR) captures one decision, why it was made and what it changed, so that
whoever touches the code later does not have to rediscover it.

| | |
|---|---|
| **Status** | Accepted, 12 November 2026. Superseded by: none. |
| **Decided by** | Asha Verma, in PR #5 (commit f8f260c "Harden the legacy rate calculator"), pair-programmed with Claude Code. Merging the PR was the approval; no separate sign-off was recorded. |
| **Ticket** | Filed under T-4519 as a follow-up finding (see Context for why there is no ticket of its own). |
| **Owners to consult** | Tariff values (zone table, rates, divisor): ops. Suresh owns the zone table, per the header of `ratecalc.js`; confirm with him who owns the rest of the tariff. |
| **Code** | `chargeableWeight()` in `legacy/rate-calc/ratecalc.js` |
| **Tests** | `legacy/rate-calc/volumetric.test.js`, `legacy/rate-calc/characterisation.test.js` |

## Context

The booking desk (the staff who quote prices to customers) prices every parcel with
`node ratecalc.js <from> <to> <weightKg> <service> [LxWxH cm]`, which calls `quote()` in `ratecalc.js`. The
city pair picks a zone (A to D, from the zone table in `zones.json`), the zone sets a base rate for the first
0.5 kg and a per-half-kilo rate for each further half kilo, then a fuel surcharge, the express multiplier and
GST (India's goods and services tax) are added. So the **chargeable weight** decides most of the quote. The
code holds money in paise (1/100 rupee) and rounds once at the end; this document shows rupees.

Couriers do not charge on actual weight alone: a large, light box takes up van space that could carry heavier
parcels. So the industry charges on whichever is greater, the actual weight or the **volumetric weight**: length
x width x height in centimetres, divided by a carrier divisor. 5000 is the usual divisor in India and is what
this calculator has always used. (The code calls the second side B for breadth; the CLI usage line calls it W.
Same thing.)

The 2021 code had the rule backwards in two ways:

```js
// 2021 import (commit a35d479)
if (dims) w = Math.min(w, vol); // took the SMALLER of actual and volumetric (when dims were given)
return Math.floor(w * 2) / 2;   // then rounded DOWN to the half kilo (the comment said "next")
```

So a 2.3 kg box measuring 40x30x20 cm (volumetric 4.8 kg) was charged as 2 kg, and a 7.2 kg parcel with no
dimensions was charged as 7 kg. Big light boxes were systematically under-charged and every weight not already
on a half kilo lost just under 0.5 kg.

**Why this is filed under T-4519.** The ticket itself said express quotes *with box sizes* looked too *high*
(a 2.3 kg box 40x30x20 quoted at Rs 370.79). That complaint had a different cause: the 12% fuel surcharge was
applied twice on express bookings (standard bookings were unaffected). That was fixed first, in PR #2 on
11 November 2026 (commit 62e2434), bringing the quote to Rs 331.06. The weight rule was found a day later, in
PR #5, while writing characterisation tests (tests that pin the calculator's exact current output so refactors
can prove nothing changed). The desk did not report it and no ticket was raised for it, so the commit and the
tests cite T-4519 and call it the "T-4519 follow-up". That satisfies the repo convention of citing a ticket;
anyone changing this rule in future should cite T-4519 too, or a new ticket if ops raises one.

## Decision

`chargeableWeight(weightKg, dims)` returns the **greater** of the actual weight and the volumetric weight
(L x W x H / 5000), then rounds **up** to the next multiple of 0.5 kg. A value already on a half kilo stays as
it is: 12 kg stays 12 kg, 4.8 kg becomes 5 kg, 3.1 kg becomes 3.5 kg.

```js
w = Math.max(w, vol);        // only when dims were supplied
return Math.ceil(w * 2) / 2;
```

Rules that follow from this:

- **"Dimensions supplied" means the fifth argument is present and non-empty.** When it is absent, `null` or
  `''`, validation and the volumetric step are both skipped and the chargeable weight is the actual weight
  rounded up to the half kilo. When it is anything else it must be three positive numbers joined by `x`, such
  as `40x30x20` or `40.5x30x20`; decimals are allowed, spaces around the `x` are allowed, and a partial value
  like `40x30` is rejected.
- **The divisor stays 5000.** It was inherited from the 2021 code and was not re-decided here. Changing it
  changes the tariff, which is ops' call, like the zone table.
- **Validation runs first and is separate from this rule.** `requireDims()` rejects dimensions with a missing
  side, a zero or negative side, or a side over 300 cm (300 exactly is allowed). `requireWeight()` rejects an
  actual weight of 0 or less, or above 100 kg (100 exactly is allowed). "Rejects" means `quote()` throws a
  `ValidationError` naming the bad field, and the CLI prints `Invalid input - ...` plus a usage line and exits
  with code 1.

## Consequences

- **Quotes for big light boxes go up, sometimes a lot.** The ticket's own example, Mumbai to Pune, 2.3 kg,
  40x30x20 cm, express, is now charged on 5 kg instead of 2 kg. All totals below include GST:

  | Stage | Chargeable | Express total, incl. GST |
  |---|---|---|
  | Original 2021 code | 2 kg | Rs 370.79 (fuel charged twice) |
  | After the fuel fix, PR #2, 11 Nov | 2 kg | Rs 331.06 |
  | After this decision, PR #5, 12 Nov | 5 kg | Rs 616.53 |

  How Rs 616.53 is built, using the constants in `ratecalc.js` (Mumbai to Pune is zone C: base Rs 95 for the
  first 0.5 kg, Rs 24 per further half kilo; fuel surcharge 12%; express 1.5x standard; GST 18%):

  ```text
  5 kg = first 0.5 kg + 9 further half kilos
  list price   95 + 9 x 24           = 311.00
  fuel 12%     311.00 x 1.12         = 348.32
  express 1.5x 348.32 x 1.5          = 522.48   (= before-tax price)
  GST 18%      522.48 x 1.18         = 616.53
  ```

  The same steps on 2 kg (95 + 3 x 24 = 167) give Rs 331.06, and applying the 12% fuel line a second time
  before GST gives the original Rs 370.79. The booking desk should expect the higher figure and explain it as
  volumetric pricing, not a bug. The double surcharge the desk complained about remains fixed.
- **Every parcel without dimensions whose weight is not already on a half kilo goes up by one half-kilo
  step**, for example 7.2 kg is now 7.5 kg instead of 7 kg.
- **The rule is pinned by tests.** `volumetric.test.js` covers the three cases (volumetric wins, actual wins,
  rounding up); `characterisation.test.js` pins exact rupee totals. Changing the rule means updating those
  expectations in the same commit, citing a ticket, and writing a new ADR that supersedes this one (and
  filling in the "Superseded by" line above). Rounding changes what customers pay, so check with ops first,
  as for any tariff value.
- **Chargeable weight is not capped.** The 100 kg limit applies to the actual weight only. The largest
  allowed box, 300x300x300 cm, has a volumetric weight of 5400 kg and is quoted as such today. Whether such
  a parcel should be rejected, and at what threshold, is an open question for ops; until they answer, the
  calculator quotes it.

## Alternatives considered

- **Keep the 2021 behaviour.** Rejected: it is the opposite of how carriers bill, so Pragati would lose money on
  every large light parcel.
- **Round to the nearest half kilo instead of up.** Rejected: carriers round up, so any weight just above a
  half-kilo boundary would be under-charged by a full step (3.1 kg would be quoted as 3 kg while the carrier
  bills 3.5 kg). Rounding up is also what the 2021 author's comment said ("round to the next half kilo") but
  did not implement.
- **Round up to the whole kilo.** Rejected: the tariff is priced per half kilo, so this would over-charge.
- **Change the divisor** (4000 or 6000 are also used by some carriers). Rejected as out of scope: it is a tariff
  change for ops to make, not a bug fix.
- **Make dimensions mandatory.** Rejected for now: the desk often quotes before the parcel is measured, and the
  CLI has always accepted a weight alone. Revisit if under-charging without dimensions becomes a problem.

## References

- Ticket list: [docs/support-tickets.md](../support-tickets.md)
- Tariff constants (`BASE_PAISE`, `PER_HALF_KG_PAISE`, `FUEL_PERCENT`, `EXPRESS_PERCENT`, `GST_PERCENT`) and
  the zone rules: top of `legacy/rate-calc/ratecalc.js`; city lists in `legacy/rate-calc/zones.json`
- Worked examples with full arithmetic: the comments in `legacy/rate-calc/characterisation.test.js`
- How the calculator fits the rest of the repo: [docs/architecture.md](../architecture.md)
