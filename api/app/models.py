from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class Status(str, Enum):
    booked = "booked"
    picked_up = "picked_up"
    in_transit = "in_transit"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    exception = "exception"


class TrackingEvent(BaseModel):
    at: datetime
    location: str
    status: Status
    note: str = ""


class Shipment(BaseModel):
    tracking_id: str
    origin: str
    destination: str
    weight_kg: float
    service: str  # "standard" | "express"
    status: Status
    events: list[TrackingEvent]

    @property
    def last_event(self) -> TrackingEvent:
        return self.events[-1]


class ShipmentSummary(BaseModel):
    tracking_id: str
    origin: str
    destination: str
    status: Status
    last_location: str
    last_update: datetime

    @classmethod
    def from_shipment(cls, s: Shipment) -> "ShipmentSummary":
        # The newest event is the one the customer cares about.
        last = s.events[0]
        return cls(
            tracking_id=s.tracking_id,
            origin=s.origin,
            destination=s.destination,
            status=s.status,
            last_location=last.location,
            last_update=last.at,
        )
