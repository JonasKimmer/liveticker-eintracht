"""
Tests für /api/v1/competitions Endpunkte
"""
import pytest


class TestGetCompetitions:
    def test_returns_list(self, client):
        response = client.get("/api/v1/competitions")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_empty_list_when_no_data(self, client):
        response = client.get("/api/v1/competitions")
        assert response.status_code == 200


class TestGetCompetitionById:
    def test_404_for_nonexistent(self, client):
        response = client.get("/api/v1/competitions/99999")
        assert response.status_code == 404

    def test_returns_competition_after_create(self, client):
        create_resp = client.post(
            "/api/v1/competitions",
            json={"title": "Bundesliga", "sport": "Football"},
        )
        assert create_resp.status_code == 201
        comp_id = create_resp.json()["id"]

        get_resp = client.get(f"/api/v1/competitions/{comp_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["title"] == "Bundesliga"


class TestCreateCompetition:
    def test_creates_with_title(self, client):
        response = client.post(
            "/api/v1/competitions",
            json={"title": "Champions League", "sport": "Football"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Champions League"
        assert "id" in data

    def test_creates_with_minimal_data(self, client):
        response = client.post("/api/v1/competitions", json={})
        assert response.status_code == 201

    def test_creates_with_hidden_flag(self, client):
        response = client.post(
            "/api/v1/competitions",
            json={"title": "Hidden League", "hidden": True},
        )
        assert response.status_code == 201
        assert response.json()["hidden"] is True

    def test_id_is_integer(self, client):
        response = client.post(
            "/api/v1/competitions",
            json={"title": "Test"},
        )
        assert response.status_code == 201
        assert isinstance(response.json()["id"], int)


class TestUpdateCompetition:
    def test_updates_title(self, client):
        create_resp = client.post(
            "/api/v1/competitions",
            json={"title": "Old Title"},
        )
        comp_id = create_resp.json()["id"]

        update_resp = client.put(
            f"/api/v1/competitions/{comp_id}",
            json={"title": "New Title"},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["title"] == "New Title"

    def test_404_for_nonexistent(self, client):
        response = client.put(
            "/api/v1/competitions/99999",
            json={"title": "Whatever"},
        )
        assert response.status_code == 404


class TestDeleteCompetition:
    def test_deletes_existing(self, client):
        create_resp = client.post(
            "/api/v1/competitions",
            json={"title": "To Delete"},
        )
        comp_id = create_resp.json()["id"]

        delete_resp = client.delete(f"/api/v1/competitions/{comp_id}")
        assert delete_resp.status_code == 204

        get_resp = client.get(f"/api/v1/competitions/{comp_id}")
        assert get_resp.status_code == 404

    def test_404_for_nonexistent(self, client):
        response = client.delete("/api/v1/competitions/99999")
        assert response.status_code == 404
