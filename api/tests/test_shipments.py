from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_list_all_shipments():
    r = client.get("/shipments")
    assert r.status_code == 200
    assert len(r.json()) == 5


def test_filter_by_status():
    r = client.get("/shipments", params={"status": "in_transit"})
    assert [s["tracking_id"] for s in r.json()] == ["PRG-10022"]


def test_list_shows_newest_event_location():
    # T-4512: PRG-10021 was delivered in Bengaluru but the list showed Pune Hub.
    r = client.get("/shipments")
    assert r.status_code == 200
    summary = next(s for s in r.json() if s["tracking_id"] == "PRG-10021")
    assert summary["last_location"] == "Koramangala, Bengaluru"
    assert summary["last_location"] != "Pune Hub"


def test_get_one_shipment():
    r = client.get("/shipments/PRG-10021")
    assert r.status_code == 200
    assert r.json()["destination"] == "Bengaluru"


def test_unknown_shipment_is_404():
    assert client.get("/shipments/PRG-99999").status_code == 404
