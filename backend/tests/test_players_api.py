"""
Tests für /api/v1/players Endpunkte
"""
import pytest


class TestGetPlayers:
    def test_returns_paginated_response(self, client):
        response = client.get("/api/v1/players")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data or isinstance(data, list)

    def test_pagination_params(self, client):
        response = client.get("/api/v1/players?page=1&pageSize=5")
        assert response.status_code == 200


class TestGetPlayerById:
    def test_404_for_nonexistent(self, client):
        response = client.get("/api/v1/players/99999")
        assert response.status_code == 404

    def test_returns_player_after_create(self, client):
        create_resp = client.post(
            "/api/v1/players",
            json={"display_name": "Thomas Müller", "sport": "Football"},
        )
        assert create_resp.status_code == 201
        player_id = create_resp.json()["id"]

        get_resp = client.get(f"/api/v1/players/{player_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == player_id


class TestCreatePlayer:
    def test_creates_with_name(self, client):
        response = client.post(
            "/api/v1/players",
            json={"display_name": "Luca Waldschmidt", "sport": "Football"},
        )
        assert response.status_code == 201
        data = response.json()
        assert "id" in data

    def test_creates_with_minimal_data(self, client):
        response = client.post("/api/v1/players", json={})
        assert response.status_code == 201

    def test_returns_correct_fields(self, client):
        response = client.post(
            "/api/v1/players",
            json={
                "first_name": "Mario",
                "last_name": "Götze",
                "sport": "Football",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert isinstance(data["id"], int)


class TestUpdatePlayer:
    def test_updates_name(self, client):
        create_resp = client.post(
            "/api/v1/players",
            json={"display_name": "Old Name"},
        )
        player_id = create_resp.json()["id"]

        update_resp = client.put(
            f"/api/v1/players/{player_id}",
            json={"display_name": "New Name"},
        )
        assert update_resp.status_code == 200

    def test_404_for_nonexistent(self, client):
        response = client.put(
            "/api/v1/players/99999",
            json={"display_name": "Whatever"},
        )
        assert response.status_code == 404


class TestDeletePlayer:
    def test_deletes_existing(self, client):
        create_resp = client.post(
            "/api/v1/players",
            json={"display_name": "To Delete"},
        )
        player_id = create_resp.json()["id"]

        delete_resp = client.delete(f"/api/v1/players/{player_id}")
        assert delete_resp.status_code == 204

        get_resp = client.get(f"/api/v1/players/{player_id}")
        assert get_resp.status_code == 404

    def test_404_for_nonexistent(self, client):
        response = client.delete("/api/v1/players/99999")
        assert response.status_code == 404
