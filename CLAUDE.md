# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Shipment tracking for the fictional **Pragati Logistics**. It is the starter project for the *Claude Code Complete Masterclass*; each lesson's end state is a git tag (`partNN-…`), so the repo is meant to evolve lesson by lesson. Open support tickets that drive the work live in `docs/support-tickets.md`, and commits/tests reference them by ID (e.g. `T-4512`).

Three independent sub-projects, no shared build or root package:

| Folder | Stack | Role |
|---|---|---|
| `api/` | Python 3.12, FastAPI, Pydantic v2, pytest | Shipments API on :8000 |
| `web/` | React 18, Vite, TypeScript, Vitest | Customer tracking page on :5173 |
| `legacy/rate-calc/` | Plain Node.js (CommonJS, `var`-era) | Booking-desk price calculator CLI |

## Commands

API tests: run from the `api` folder with `.venv/Scripts/python -m pytest -q`.

All commands are run from inside the sub-project folder (PowerShell on Windows).

**API** (`cd api`)
```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload          # http://localhost:8000/docs
python -m pytest                       # all tests
python -m pytest tests/test_shipments.py::test_filter_by_status   # one test
```
Tests import `app.main`, so run pytest from `api/`, not the repo root.

**Web** (`cd web`)
```powershell
npm install
npm run dev                            # http://localhost:5173
npm run build                          # tsc -b && vite build
npm test                               # vitest run
npx vitest run src/format.test.ts      # one file
npx vitest run -t "reads like"         # one test by name
```

**Legacy rate-calc** (`cd legacy/rate-calc`)
```powershell
node ratecalc.js Mumbai Pune 2.3 express 40x30x20
node --test                            # runs ratecalc.test.js (node:test)
```
Note: `npm test` here is a stub that prints "no tests" and exits 0. Use `node --test` to actually run the tests.

## Architecture

**API.** `app/main.py` exposes `GET /health`, `GET /shipments?status=` and `GET /shipments/{tracking_id}`. Data is an in-memory dict in `app/data.py` keyed by tracking ID (the module docstring says a real database replaces this in Part 10A). `app/models.py` holds the domain: `Shipment` with a list of `TrackingEvent`s, and `ShipmentSummary` for the list endpoint. The summary is derived from `Shipment.last_event`, which picks the event with the **latest timestamp, not the last list element**, because events can arrive out of order (this was ticket T-4512). CORS only allows the Vite origin and GET.

**Web.** `src/api.ts` is the API client and mirrors the API's `Status` enum and `ShipmentSummary` shape as TypeScript types by hand; there is no generated client, so changes to the Pydantic models must be mirrored here. `src/format.ts` turns status codes into human labels and formats timestamps in `en-IN`. `src/App.tsx` is the single page: fetch once, filter client-side by tracking ID. The API base URL comes from `VITE_API_URL`, defaulting to localhost:8000.

**Legacy rate-calc.** `ratecalc.js` computes a quote: zone from `zones.json` (metro/regional/special pairs), chargeable weight (min of actual and volumetric, rounded down to the half kilo), then base + per-half-kg, fuel surcharge, express multiplier, GST. The header comment says not to change the zone table without asking Suresh. The only test pins that express before-tax equals exactly 1.5x standard (T-4519).

## Conventions

- Status values are a closed set shared across API and web: `booked`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `exception`. Adding one means updating `Status` in `models.py`, the `Status` type in `api.ts`, and the label map in `format.ts`.
- Tests and commit messages cite the support ticket ID they address.
- `.claude/settings.local.json` and `.env` are git-ignored; the local settings file currently only sets `PRAGATI_ENV=local`.
