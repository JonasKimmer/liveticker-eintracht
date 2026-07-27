"""
Tests für CountryRepository
"""
import pytest

from app.models.country import Country
from app.repositories.country_repository import CountryRepository
from app.schemas.country import CountryCreate


@pytest.fixture()
def repo(db):
    return CountryRepository(db)


def _data(name: str = "Deutschland", code: str = "DE", flag_url: str | None = None) -> CountryCreate:
    return CountryCreate(name=name, code=code, flag_url=flag_url)


class TestGetAll:
    def test_returns_empty_list_initially(self, repo):
        assert repo.get_all() == []

    def test_returns_created_countries(self, repo):
        repo.upsert(_data("Deutschland", "DE"))
        repo.upsert(_data("Frankreich", "FR"))
        results = repo.get_all()
        assert len(results) >= 2

    def test_respects_limit(self, repo):
        for i in range(5):
            repo.upsert(_data(f"Land{i}", f"L{i}"))
        results = repo.get_all(limit=2)
        assert len(results) <= 2


class TestGetById:
    def test_returns_none_for_missing(self, repo):
        assert repo.get_by_id(999999) is None

    def test_returns_country_after_upsert(self, repo):
        country = repo.upsert(_data("Spanien", "ES"))
        fetched = repo.get_by_id(country.id)
        assert fetched is not None
        assert fetched.name == "Spanien"


class TestGetByName:
    def test_returns_none_for_missing(self, repo):
        assert repo.get_by_name("Unbekannt") is None

    def test_returns_country_by_name(self, repo):
        repo.upsert(_data("Italien", "IT"))
        fetched = repo.get_by_name("Italien")
        assert fetched is not None
        assert fetched.code == "IT"


class TestUpsert:
    def test_creates_new_country(self, repo):
        country = repo.upsert(_data("Portugal", "PT"))
        assert country.id is not None
        assert country.name == "Portugal"

    def test_updates_existing_country(self, repo):
        repo.upsert(_data("England", "EN"))
        updated = repo.upsert(_data("England", "ENG"))
        assert updated.code == "ENG"

    def test_stores_flag_url(self, repo):
        country = repo.upsert(_data("Japan", "JP", flag_url="https://flags.example.com/jp.png"))
        assert country.flag_url == "https://flags.example.com/jp.png"

    def test_no_flag_url_stored_as_none(self, repo):
        country = repo.upsert(_data("Test", "TE", flag_url=None))
        assert country.flag_url is None