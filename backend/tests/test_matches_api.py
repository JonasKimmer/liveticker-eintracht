"""
Tests für Matches API Endpunkte (/api/v1/matches/*)
====================================================
Integrations-Tests via FastAPI TestClient.
Werden übersprungen wenn keine PostgreSQL-Verbindung verfügbar ist.
"""

import pytest


# ──────────────────────────────────────────────
# GET /matches
# ──────────────────────────────────────────────


class TestGetMatches:
    def test_returns_paginated_response(self, client, sample_match):
        response = client.get("/api/v1/matches")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1

    def test_filter_by_match_state(self, client, sample_match):
        response = client.get("/api/v1/matches?matchState=PreMatch")
        assert response.status_code == 200
        items = response.json()["items"]
        assert all(m["matchState"] == "PreMatch" for m in items)

    def test_pagination_params(self, client, sample_match):
        response = client.get("/api/v1/matches?page=1&pageSize=5")
        assert response.status_code == 200
        data = response.json()
        assert "page" in data
        assert "pageSize" in data

    def test_invalid_page_rejected(self, client):
        response = client.get("/api/v1/matches?page=0")
        assert response.status_code == 422


# ──────────────────────────────────────────────
# GET /matches/{matchId}
# ──────────────────────────────────────────────


class TestGetMatch:
    def test_returns_existing_match(self, client, sample_match):
        response = client.get(f"/api/v1/matches/{sample_match.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_match.id

    def test_returns_404_for_missing_match(self, client):
        response = client.get("/api/v1/matches/999999")
        assert response.status_code == 404


# ──────────────────────────────────────────────
# POST /matches
# ──────────────────────────────────────────────


class TestCreateMatch:
    def test_creates_match_with_minimal_fields(self, client):
        response = client.post(
            "/api/v1/matches",
            json={"matchState": "PreMatch", "matchday": 5, "homeScore": 0, "awayScore": 0},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["matchState"] == "PreMatch"
        assert data["matchday"] == 5

    def test_created_match_has_id(self, client):
        response = client.post(
            "/api/v1/matches",
            json={"matchState": "PreMatch", "matchday": 10, "homeScore": 1, "awayScore": 2},
        )
        assert response.status_code == 201
        assert response.json()["id"] is not None


# ──────────────────────────────────────────────
# PATCH /matches/{matchId}
# ──────────────────────────────────────────────


class TestUpdateMatch:
    def test_updates_match_state(self, client, sample_match):
        response = client.patch(
            f"/api/v1/matches/{sample_match.id}",
            json={"match_state": "Live"},
        )
        assert response.status_code == 200
        assert response.json()["matchState"] == "Live"

    def test_updates_score(self, client, sample_match):
        response = client.patch(
            f"/api/v1/matches/{sample_match.id}",
            json={"home_score": 2, "away_score": 1},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["teamHomeScore"] == 2
        assert data["teamAwayScore"] == 1

    def test_returns_422_on_empty_payload(self, client, sample_match):
        response = client.patch(f"/api/v1/matches/{sample_match.id}", json={})
        assert response.status_code == 422

    def test_returns_404_for_missing_match(self, client):
        response = client.patch("/api/v1/matches/999999", json={"match_state": "Live"})
        assert response.status_code == 404


# ──────────────────────────────────────────────
# DELETE /matches/{matchId}
# ──────────────────────────────────────────────


class TestDeleteMatch:
    def test_deletes_existing_match(self, client, sample_match):
        response = client.delete(f"/api/v1/matches/{sample_match.id}")
        assert response.status_code == 204
        # Verify deletion
        get_response = client.get(f"/api/v1/matches/{sample_match.id}")
        assert get_response.status_code == 404

    def test_returns_404_for_missing_match(self, client):
        response = client.delete("/api/v1/matches/999999")
        assert response.status_code == 404


# ──────────────────────────────────────────────
# PATCH /matches/{matchId}/ticker-mode
# ──────────────────────────────────────────────


class TestSetTickerMode:
    def test_sets_auto_mode(self, client, sample_match):
        response = client.patch(
            f"/api/v1/matches/{sample_match.id}/ticker-mode",
            json={"mode": "auto"},
        )
        assert response.status_code == 200
        assert response.json()["tickerMode"] == "auto"

    def test_sets_coop_mode(self, client, sample_match):
        response = client.patch(
            f"/api/v1/matches/{sample_match.id}/ticker-mode",
            json={"mode": "coop"},
        )
        assert response.status_code == 200
        assert response.json()["tickerMode"] == "coop"

    def test_sets_manual_mode(self, client, sample_match):
        response = client.patch(
            f"/api/v1/matches/{sample_match.id}/ticker-mode",
            json={"mode": "manual"},
        )
        assert response.status_code == 200
        assert response.json()["tickerMode"] == "manual"

    def test_rejects_invalid_mode(self, client, sample_match):
        response = client.patch(
            f"/api/v1/matches/{sample_match.id}/ticker-mode",
            json={"mode": "invalid"},
        )
        assert response.status_code == 422

    def test_returns_404_for_missing_match(self, client):
        response = client.patch("/api/v1/matches/999999/ticker-mode", json={"mode": "auto"})
        assert response.status_code == 404


# ──────────────────────────────────────────────
# GET /matches/{matchId}/lineup
# ──────────────────────────────────────────────


class TestGetLineup:
    def test_returns_empty_list_for_match_without_lineup(self, client, sample_match):
        response = client.get(f"/api/v1/matches/{sample_match.id}/lineup")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_404_for_missing_match(self, client):
        response = client.get("/api/v1/matches/999999/lineup")
        assert response.status_code == 404


# ──────────────────────────────────────────────
# GET /matches/{matchId}/statistics
# ──────────────────────────────────────────────


class TestGetStatistics:
    def test_returns_empty_list_for_match_without_stats(self, client, sample_match):
        response = client.get(f"/api/v1/matches/{sample_match.id}/statistics")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_404_for_missing_match(self, client):
        response = client.get("/api/v1/matches/999999/statistics")
        assert response.status_code == 404


# ──────────────────────────────────────────────
# GET /matches/{matchId}/player-statistics
# ──────────────────────────────────────────────


class TestGetPlayerStatistics:
    def test_returns_empty_list_for_match_without_player_stats(self, client, sample_match):
        response = client.get(f"/api/v1/matches/{sample_match.id}/player-statistics")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_404_for_missing_match(self, client):
        response = client.get("/api/v1/matches/999999/player-statistics")
        assert response.status_code == 404


# ──────────────────────────────────────────────
# GET /matches/{matchId}/injuries
# ──────────────────────────────────────────────


class TestGetInjuries:
    def test_returns_empty_list_for_match_without_injuries(self, client, sample_match):
        response = client.get(f"/api/v1/matches/{sample_match.id}/injuries")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_404_for_missing_match(self, client):
        response = client.get("/api/v1/matches/999999/injuries")
        assert response.status_code == 404
