"""T-4527: customers want to know when their parcel arrives."""
from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from app.eta import DEFAULT_TRANSIT_HOURS, transit_time
from app.main import app
from app.models import Shipment, Status, TrackingEvent

client = TestClient(app)


def _summary(tracking_id: str) -> dict:
    r = client.get("/shipments")
    assert r.status_code == 200
    return next(s for s in r.json() if s["tracking_id"] == tracking_id)


def _detail(tracking_id: str) -> dict:
    r = client.get(f"/shipments/{tracking_id}")
    assert r.status_code == 200
    return r.json()


def test_delivered_has_no_eta() -> None:
    assert _summary("PRG-10021")["eta"] is None
    assert _detail("PRG-10021")["eta"] is None


def test_exception_has_no_eta() -> None:
    assert _summary("PRG-10023")["eta"] is None
    assert _detail("PRG-10023")["eta"] is None


def test_in_transit_eta_is_last_event_plus_lane_time() -> None:
    # PRG-10022 Mumbai -> Delhi, last event 2026-11-06T19:40, lane is 48h.
    assert _summary("PRG-10022")["eta"] == "2026-11-08T19:40:00"
    assert _detail("PRG-10022")["eta"] == "2026-11-08T19:40:00"


def test_eta_uses_latest_event_not_last_listed() -> None:
    # Same rule as T-4512: events may arrive out of order.
    shipment = Shipment(
        tracking_id="PRG-TEST", origin="Mumbai", destination="Delhi", weight_kg=1.0, service="standard",
        status=Status.in_transit,
        events=[
            TrackingEvent(at=datetime(2026, 11, 6, 19, 40), location="Jaipur Transit", status=Status.in_transit),
            TrackingEvent(at=datetime(2026, 11, 5, 8, 30), location="Bhiwandi Hub", status=Status.picked_up),
        ],
    )
    assert shipment.eta == datetime(2026, 11, 6, 19, 40) + transit_time("Mumbai", "Delhi")


def test_lane_lookup_is_symmetric_and_has_default() -> None:
    assert transit_time("Delhi", "Mumbai") == transit_time("Mumbai", "Delhi")
    assert transit_time("Nowhere", "Elsewhere") == timedelta(hours=DEFAULT_TRANSIT_HOURS)


def test_existing_fields_unchanged_by_eta() -> None:
    # Backwards compatibility: eta is added, nothing else changes.
    summary = _summary("PRG-10021")
    assert set(summary) == {"tracking_id", "origin", "destination", "status", "last_location", "last_update", "eta"}
    detail = _detail("PRG-10022")
    assert detail["weight_kg"] == 12.0
    assert detail["service"] == "standard"
    assert len(detail["events"]) == 3
