# Pragati Track architecture

Three independent programs live in this repo. Two of them talk to each other over HTTP; the third is a
stand-alone command-line tool that nothing else calls.

| Program | Folder | Runs as | Talks to |
|---|---|---|---|
| Shipments API | `api/` | FastAPI app via uvicorn on port 8000 | Nothing. Data is an in-memory dict. |
| Web app | `web/` | Vite dev server on port 5173, React in the browser | The API, over `fetch` |
| Rate calculator | `legacy/rate-calc/` | `node ratecalc.js …` at the booking desk | Nothing. Reads `zones.json` next to it. |

## Who calls what

```mermaid
flowchart LR
    subgraph people["People"]
        customer["Customer / support agent\n(browser)"]
        desk["Booking desk\n(terminal)"]
    end

    subgraph web["web/  React 18 + Vite  :5173"]
        dashboard["pages/Dashboard.tsx\n/ (KPIs, live map)"]
        track["App.tsx\n/track (tracking table)"]
        detail["pages/ShipmentDetail.tsx\n/shipments/:id (timeline)"]
        apiTs["api.ts\nlistShipments(), getShipment()\nStatus + Shipment types (hand-mirrored)"]
        format["format.ts\nstatus labels, en-IN times"]
        seed["data/seed.ts\nKPI and chart seed data"]
    end

    subgraph api["api/  FastAPI  :8000"]
        main["app/main.py\nGET /health\nGET /shipments?status=\nGET /shipments/{tracking_id}"]
        models["app/models.py\nShipment, TrackingEvent,\nShipmentSummary (last_event by timestamp)"]
        eta["app/eta.py\nestimate_eta() per lane"]
        data["app/data.py\nSHIPMENTS in-memory dict\n(real DB arrives in Part 10A)"]
    end

    subgraph legacy["legacy/rate-calc/  plain Node.js"]
        ratecalc["ratecalc.js\nquote(from, to, kg, service, dims)"]
        zones["zones.json\nmetro / regional / special pairs"]
    end

    customer --> dashboard
    customer --> track
    customer --> detail
    dashboard --> apiTs
    dashboard --> seed
    track --> apiTs
    detail --> apiTs
    dashboard --> format
    track --> format
    detail --> format

    apiTs -- "fetch (GET only, CORS from :5173)" --> main
    main --> models
    main --> data
    models --> eta

    desk --> ratecalc
    ratecalc --> zones
```

## Request flow for one shipment

```mermaid
sequenceDiagram
    participant B as Browser (ShipmentDetail)
    participant W as web/src/api.ts
    participant A as api/app/main.py
    participant D as api/app/data.py
    participant M as api/app/models.py

    B->>W: getShipment("PRG-10021")
    W->>A: GET http://localhost:8000/shipments/PRG-10021
    A->>D: SHIPMENTS.get(tracking_id)
    alt found
        A->>M: serialise Shipment (eta via eta.py, last_event by latest timestamp)
        A-->>W: 200 JSON
        W-->>B: Shipment
    else missing
        A-->>W: 404 {"detail": "Shipment … not found"}
        W-->>B: throws ApiError(404)
    end
```

## Things worth knowing

- **No generated client.** `web/src/api.ts` mirrors the Pydantic models by hand. Change `api/app/models.py` and you
  must change `api.ts` too, and `format.ts` if a status is added.
- **Events can arrive out of order** (ticket T-4512). The list endpoint's summary uses the event with the latest
  timestamp, not the last element of the list.
- **ETA is computed, not stored** (ticket T-4527). `eta.py` adds a per-lane transit time to the latest event; delivered
  and exception shipments get `null`.
- **The dashboard mixes live and seed data.** Shipment rows come from the API; the KPI tiles, charts and network map
  come from `web/src/data/seed.ts` until there is a real analytics source.
- **The rate calculator is isolated.** Neither the API nor the web app imports it or shells out to it. Its only tests
  are the `*.test.js` files beside it, run with `node --test`. Do not change `zones.json` without asking Suresh.
- **Checking these docs.** `node docs/check-docs.mjs` from the repo root validates links and README commands. See
  the [README](../README.md).
