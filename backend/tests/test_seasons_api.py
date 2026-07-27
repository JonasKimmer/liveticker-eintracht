"""
Tests für /api/v1/seasons Endpunkte
"""


class TestGetSeasons:
    def test_returns_paginated_result(self, client):
        response = client.get("/api/v1/seasons")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    def test_pagination_params(self, client):
        response = client.get("/api/v1/seasons?page=1&page_size=5")
        assert response.status_code == 200

    def test_order_by_title_asc(self, client):
        response = client.get("/api/v1/seasons?order_by=title_asc")
        assert response.status_code == 200

    def test_order_by_starts_at_asc(self, client):
        response = client.get("/api/v1/seasons?order_by=starts_at_asc")
        assert response.status_code == 200


class TestGetSeasonById:
    def test_404_for_nonexistent(self, client):
        response = client.get("/api/v1/seasons/999999")
        assert response.status_code == 404

    def test_returns_season_after_create(self, client):
        create_resp = client.post("/api/v1/seasons", json={"title": "2024/25"})
        assert create_resp.status_code == 201
        season_id = create_resp.json()["id"]

        get_resp = client.get(f"/api/v1/seasons/{season_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["title"] == "2024/25"


class TestCreateSeason:
    def test_creates_with_title(self, client):
        response = client.post("/api/v1/seasons", json={"title": "2025/26"})
        assert response.status_code == 201
        assert response.json()["title"] == "2025/26"
        assert "id" in response.json()

    def test_422_for_missing_required_fields(self, client):
        response = client.post("/api/v1/seasons", json={})
        assert response.status_code == 422


class TestUpdateSeason:
    def test_updates_title(self, client):
        create_resp = client.post("/api/v1/seasons", json={"title": "Alt"})
        season_id = create_resp.json()["id"]

        update_resp = client.put(f"/api/v1/seasons/{season_id}", json={"title": "Neu"})
        assert update_resp.status_code == 200
        assert update_resp.json()["title"] == "Neu"

    def test_404_for_nonexistent(self, client):
        response = client.put("/api/v1/seasons/999999", json={"title": "X"})
        assert response.status_code == 404

    def test_422_for_empty_body(self, client):
        create_resp = client.post("/api/v1/seasons", json={"title": "Test"})
        season_id = create_resp.json()["id"]
        response = client.put(f"/api/v1/seasons/{season_id}", json={})
        assert response.status_code == 422


class TestDeleteSeason:
    def test_deletes_existing(self, client):
        create_resp = client.post("/api/v1/seasons", json={"title": "ToDelete"})
        season_id = create_resp.json()["id"]

        response = client.delete(f"/api/v1/seasons/{season_id}")
        assert response.status_code == 204

    def test_404_for_nonexistent(self, client):
        response = client.delete("/api/v1/seasons/999999")
        assert response.status_code == 404