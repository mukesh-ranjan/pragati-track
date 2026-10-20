"""Sample shipments. Replaced by a real database later in the course (Part 10A)."""
from datetime import datetime

from .models import Shipment, Status, TrackingEvent


def _ev(ts: str, where: str, status: Status, note: str = "") -> TrackingEvent:
    return TrackingEvent(at=datetime.fromisoformat(ts), location=where, status=status, note=note)


_ALL = [
    Shipment(
        tracking_id="PRG-10021", origin="Pune", destination="Bengaluru", weight_kg=4.2, service="express",
        status=Status.delivered,
        events=[
            _ev("2026-11-03T09:10", "Pune Hub", Status.picked_up),
            _ev("2026-11-03T21:45", "Pune Hub", Status.in_transit, "Linehaul departed"),
            _ev("2026-11-04T11:20", "Bengaluru Hub", Status.out_for_delivery),
            _ev("2026-11-04T16:05", "Koramangala, Bengaluru", Status.delivered, "Signed by R. Nair"),
        ],
    ),
    Shipment(
        tracking_id="PRG-10022", origin="Mumbai", destination="Delhi", weight_kg=12.0, service="standard",
        status=Status.in_transit,
        events=[
            _ev("2026-11-05T08:30", "Bhiwandi Hub", Status.picked_up),
            _ev("2026-11-05T23:10", "Bhiwandi Hub", Status.in_transit, "Linehaul departed"),
            _ev("2026-11-06T19:40", "Jaipur Transit", Status.in_transit),
        ],
    ),
    Shipment(
        tracking_id="PRG-10023", origin="Chennai", destination="Hyderabad", weight_kg=1.1, service="standard",
        status=Status.exception,
        events=[
            _ev("2026-11-06T10:00", "Chennai Hub", Status.picked_up),
            _ev("2026-11-07T14:25", "Hyderabad Hub", Status.exception, "Address incomplete, customer contacted"),
        ],
    ),
    Shipment(
        tracking_id="PRG-10024", origin="Ahmedabad", destination="Pune", weight_kg=7.5, service="express",
        status=Status.out_for_delivery,
        events=[
            _ev("2026-11-07T07:50", "Ahmedabad Hub", Status.picked_up),
            _ev("2026-11-07T22:30", "Ahmedabad Hub", Status.in_transit, "Linehaul departed"),
            _ev("2026-11-08T09:15", "Pune Hub", Status.out_for_delivery),
        ],
    ),
    Shipment(
        tracking_id="PRG-10025", origin="Kolkata", destination="Guwahati", weight_kg=22.0, service="standard",
        status=Status.booked,
        events=[_ev("2026-11-08T12:00", "Kolkata Hub", Status.booked, "Awaiting pickup")],
    ),
]

SHIPMENTS: dict[str, Shipment] = {s.tracking_id: s for s in _ALL}
