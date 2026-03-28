"""
Tests für Ticker API Endpunkte (/api/v1/ticker/*)
=================================================
Integrations-Tests via FastAPI TestClient.
Werden übersprungen wenn keine PostgreSQL-Verbindung verfügbar ist.
"""

import pytest


# ──────────────────────────────────────────────
# GET /ticker/match/{match_id}
# ──────────────────────────────────────────────


class TestGetMatchTicker:
    def test_returns_empty_list_for_match_without_entries(self, client, sample_match):
        response = client.get(f"/api/v1/ticker/match/{sample_match.id}")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_published_entry(self, client, sample_ticker_entry, sample_match):
        response = client.get(f"/api/v1/ticker/match/{sample_match.id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["text"] == "Testtext"
        assert data[0]["status"] == "published"

    def test_excludes_draft_by_default(self, client, db, sample_match):
        from app.models.ticker_entry import TickerEntry

        draft = TickerEntry(
            match_id=sample_match.id, text="Draft", status="draft", source="ai"
        )
        db.add(draft)
        db.commit()

        response = client.get(f"/api/v1/ticker/match/{sample_match.id}")
        assert response.status_code == 200
        assert all(e["status"] == "published" for e in response.json())

    def test_includes_drafts_with_all_entries_flag(self, client, db, sample_match):
        from app.models.ticker_entry import TickerEntry

        draft = TickerEntry(
            match_id=sample_match.id, text="DraftEntry", status="draft", source="ai"
        )
        db.add(draft)
        db.commit()

        response = client.get(
            f"/api/v1/ticker/match/{sample_match.id}?all_entries=true"
        )
        assert response.status_code == 200
        statuses = {e["status"] for e in response.json()}
        assert "draft" in statuses


# ──────────────────────────────────────────────
# GET /ticker/{entry_id}
# ──────────────────────────────────────────────


class TestGetTickerEntry:
    def test_returns_existing_entry(self, client, sample_ticker_entry):
        response = client.get(f"/api/v1/ticker/{sample_ticker_entry.id}")
        assert response.status_code == 200
        assert response.json()["id"] == sample_ticker_entry.id

    def test_returns_404_for_missing_entry(self, client):
        response = client.get("/api/v1/ticker/999999")
        assert response.status_code == 404


# ──────────────────────────────────────────────
# DELETE /ticker/{entry_id}
# ──────────────────────────────────────────────


class TestDeleteTickerEntry:
    def test_deletes_existing_entry(self, client, sample_ticker_entry):
        response = client.delete(f"/api/v1/ticker/{sample_ticker_entry.id}")
        assert response.status_code == 204

        # Verify deletion
        get_response = client.get(f"/api/v1/ticker/{sample_ticker_entry.id}")
        assert get_response.status_code == 404

    def test_returns_404_when_deleting_nonexistent(self, client):
        response = client.delete("/api/v1/ticker/999999")
        assert response.status_code == 404


# ──────────────────────────────────────────────
# PATCH /ticker/{entry_id}
# ──────────────────────────────────────────────


class TestUpdateTickerEntry:
    def test_updates_text(self, client, sample_ticker_entry):
        response = client.patch(
            f"/api/v1/ticker/{sample_ticker_entry.id}",
            json={"text": "Geänderter Text"},
        )
        assert response.status_code == 200
        assert response.json()["text"] == "Geänderter Text"

    def test_updates_status_to_draft(self, client, sample_ticker_entry):
        response = client.patch(
            f"/api/v1/ticker/{sample_ticker_entry.id}",
            json={"status": "draft"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "draft"

    def test_returns_422_on_empty_payload(self, client, sample_ticker_entry):
        response = client.patch(
            f"/api/v1/ticker/{sample_ticker_entry.id}",
            json={},
        )
        assert response.status_code == 422

    def test_returns_404_for_missing_entry(self, client):
        response = client.patch("/api/v1/ticker/999999", json={"text": "x"})
        assert response.status_code == 404


# ──────────────────────────────────────────────
# PATCH /ticker/{entry_id}/publish
# ──────────────────────────────────────────────


class TestPublishTickerEntry:
    def test_publishes_draft(self, client, db, sample_match):
        from app.models.ticker_entry import TickerEntry

        draft = TickerEntry(
            match_id=sample_match.id,
            text="Wird publiziert",
            status="draft",
            source="ai",
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)

        response = client.patch(f"/api/v1/ticker/{draft.id}/publish")
        assert response.status_code == 200
        assert response.json()["status"] == "published"

    def test_idempotent_for_already_published(self, client, sample_ticker_entry):
        response = client.patch(f"/api/v1/ticker/{sample_ticker_entry.id}/publish")
        assert response.status_code == 200
        assert response.json()["status"] == "published"

    def test_returns_404_for_missing_entry(self, client):
        response = client.patch("/api/v1/ticker/999999/publish")
        assert response.status_code == 404


# ──────────────────────────────────────────────
# PATCH /ticker/{entry_id}/reject
# ──────────────────────────────────────────────


class TestRejectTickerEntry:
    def test_rejects_draft(self, client, db, sample_match):
        from app.models.ticker_entry import TickerEntry

        draft = TickerEntry(
            match_id=sample_match.id,
            text="Wird abgelehnt",
            status="draft",
            source="ai",
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)

        response = client.patch(f"/api/v1/ticker/{draft.id}/reject")
        assert response.status_code == 200
        assert response.json()["status"] == "rejected"

    def test_returns_404_for_missing_entry(self, client):
        response = client.patch("/api/v1/ticker/999999/reject")
        assert response.status_code == 404


# ──────────────────────────────────────────────
# POST /ticker/manual
# ──────────────────────────────────────────────


class TestCreateManualEntry:
    def test_creates_published_entry(self, client, sample_match):
        response = client.post(
            "/api/v1/ticker/manual",
            json={
                "match_id": sample_match.id,
                "text": "Manueller Eintrag",
                "icon": "📝",
                "minute": 30,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["text"] == "Manueller Eintrag"
        assert data["status"] == "published"
        assert data["source"] == "manual"

    def test_allows_empty_text_for_video_entries(self, client, sample_match):
        # Empty text is allowed (video-only entries have no text)
        response = client.post(
            "/api/v1/ticker/manual",
            json={"match_id": sample_match.id, "text": "", "video_url": "https://example.com/clip.mp4"},
        )
        assert response.status_code == 201

    def test_phase_deduplication_returns_existing(self, client, sample_match):
        payload = {
            "match_id": sample_match.id,
            "text": "Anpfiff!",
            "icon": "📣",
            "phase": "FirstHalf",
        }
        first = client.post("/api/v1/ticker/manual", json=payload)
        second = client.post("/api/v1/ticker/manual", json=payload)
        assert first.status_code == 201
        assert second.status_code == 201
        assert first.json()["id"] == second.json()["id"]
