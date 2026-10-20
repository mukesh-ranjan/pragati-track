"""Pragati Track API: shipments and their tracking events for Pragati Logistics."""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .data import SHIPMENTS
from .models import Shipment, ShipmentSummary

app = FastAPI(title="Pragati Track API", version="0.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/shipments", response_model=list[ShipmentSummary])
def list_shipments(status: str | None = Query(default=None, description="Filter by status, e.g. in_transit")):
    items = SHIPMENTS.values()
    if status:
        items = [s for s in items if s.status == status]
    return [ShipmentSummary.from_shipment(s) for s in items]


@app.get("/shipments/{tracking_id}", response_model=Shipment)
def get_shipment(tracking_id: str):
    shipment = SHIPMENTS.get(tracking_id)
    if shipment is None:
        raise HTTPException(status_code=404, detail=f"Shipment {tracking_id} not found")
    return shipment
