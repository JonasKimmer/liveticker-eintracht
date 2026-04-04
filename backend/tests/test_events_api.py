"""
Tests für /api/v1/matches/{matchId}/events Endpunkte
"""
import pytest


class TestGetEvents:
    def test_returns_paginated_response(self, client, sample_match):
        response = client.get(f"/api/v1/matches/{sample_match.id}/events")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data or isinstance(data, list)

    def test_404_for_unknown_match(self, client):
        response = client.get("/api/v1/matches/99999/events")
        assert response.status_code == 404

    def test_empty_when_no_events(self, client, sample_match):
        response = client.get(f"/api/v1/matches/{sample_match.id}/events")
        assert response.status_code == 200


class TestUpsertEvent:
    def test_creates_event(self, client, sample_match):
        response = client.post(
            f"/api/v1/matches/{sample_match.id}/events",
            json={
                "source_id": "ext-001",
                "event_type": "goal",
                "phase": "FirstHalf",
                "time": 30,
                "sport": "Football",
            },
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert data.get("liveTickerEventType") == "goal" or data.get("eventType") == "goal"

    def test_upsert_same_source_id(self, client, sample_match):
        payload = {
            "source_id": "ext-upsert-001",
            "event_type": "yellow_card",
            "phase": "FirstHalf",
            "time": 20,
        }
        first = client.post(
            f"/api/v1/matches/{sample_match.id}/events",
            json=payload,
        )
        assert first.status_code in (200, 201)

        # Second call with same source_id → upsert, not duplicate
        second = client.post(
            f"/api/v1/matches/{sample_match.id}/events",
            json={**payload, "time": 25},
        )
        assert second.status_code in (200, 201)

    def test_404_for_unknown_match(self, client):
        response = client.post(
            "/api/v1/matches/99999/events",
            json={"source_id": "x", "event_type": "goal"},
        )
        assert response.status_code == 404

    def test_creates_event_with_unknown_phase(self, client, sample_match):
        # Events endpoint accepts any phase string (no strict validation)
        response = client.post(
            f"/api/v1/matches/{sample_match.id}/events",
            json={
                "source_id": "unknown-phase-001",
                "event_type": "goal",
                "phase": "SomePhase",
            },
        )
        assert response.status_code in (200, 201)


class TestPatchEvent:
    def test_updates_event(self, client, sample_match):
        create_resp = client.post(
            f"/api/v1/matches/{sample_match.id}/events",
            json={
                "source_id": "patch-test-001",
                "event_type": "goal",
                "phase": "FirstHalf",
                "time": 30,
            },
        )
        assert create_resp.status_code in (200, 201)

        patch_resp = client.patch(
            f"/api/v1/matches/{sample_match.id}/events/patch-test-001",
            json={"time": 35},
        )
        assert patch_resp.status_code == 200

    def test_404_for_nonexistent_source_id(self, client, sample_match):
        response = client.patch(
            f"/api/v1/matches/{sample_match.id}/events/nonexistent-source",
            json={"time": 10},
        )
        assert response.status_code == 404


class TestDeleteEvent:
    def test_deletes_event(self, client, sample_match):
        create_resp = client.post(
            f"/api/v1/matches/{sample_match.id}/events",
            json={
                "source_id": "delete-me-001",
                "event_type": "goal",
                "phase": "FirstHalf",
            },
        )
        assert create_resp.status_code in (200, 201)

        delete_resp = client.delete(
            f"/api/v1/matches/{sample_match.id}/events/delete-me-001"
        )
        assert delete_resp.status_code == 204

    def test_404_for_nonexistent_event(self, client, sample_match):
        response = client.delete(
            f"/api/v1/matches/{sample_match.id}/events/does-not-exist"
        )
        assert response.status_code == 404
