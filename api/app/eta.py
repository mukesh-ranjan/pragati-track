"""Delivery ETA for a shipment (T-4527).

Transit times per lane live in a small dictionary here; no database.
Values are placeholders for ops to tune. Lanes are unordered city pairs.
"""
from datetime import datetime, timedelta

DEFAULT_TRANSIT_HOURS = 72

LANE_TRANSIT_HOURS: dict[frozenset[str], int] = {
    frozenset({"Pune", "Bengaluru"}): 36,
    frozenset({"Mumbai", "Delhi"}): 48,
    frozenset({"Chennai", "Hyderabad"}): 24,
    frozenset({"Ahmedabad", "Pune"}): 24,
    frozenset({"Kolkata", "Guwahati"}): 72,
}

# Statuses that never get an ETA: the parcel has arrived, or is stuck.
_NO_ETA_STATUSES = frozenset({"delivered", "exception"})


def transit_time(origin: str, destination: str) -> timedelta:
    """Transit time for a lane, in either direction; unknown lanes use the default."""
    hours = LANE_TRANSIT_HOURS.get(frozenset({origin, destination}), DEFAULT_TRANSIT_HOURS)
    return timedelta(hours=hours)


def estimate_eta(status: str, origin: str, destination: str, last_event_at: datetime) -> datetime | None:
    """Latest event time plus the lane's transit time, or None for delivered/exception."""
    if status in _NO_ETA_STATUSES:
        return None
    return last_event_at + transit_time(origin, destination)
