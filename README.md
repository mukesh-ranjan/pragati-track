# Pragati Track

Shipment tracking for **Pragati Logistics**: customers and the support desk see where every parcel is.

| Folder | What it is | Stack |
|---|---|---|
| `api/` | Shipments API | Python 3.12, FastAPI, pytest |
| `web/` | Customer tracking page | React 18, Vite, TypeScript, Vitest |
| `legacy/rate-calc/` | Booking-desk price calculator (old, untested) | Node.js |

## Run it locally

```powershell
# API  (http://localhost:8000/docs)
cd api
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload

# Web  (http://localhost:5173)
cd web
npm install
npm run dev
```

## Tests

```powershell
cd api; python -m pytest
cd web; npm test
```
