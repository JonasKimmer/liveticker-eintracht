from datetime import datetime, timedelta, timezone

import pytest

from app.utils.evaluation_metrics import (
    aggregate_quality_by_group,
    bootstrap_mean_diff_ci,
    calculate_ttp_seconds,
    cliffs_delta,
    cohens_kappa,
    summarize_distribution,
)


def test_calculate_ttp_seconds_returns_exact_delta() -> None:
    event = datetime(2026, 3, 18, 18, 0, tzinfo=timezone.utc)
    published = event + timedelta(seconds=17.4)

    assert calculate_ttp_seconds(event, published) == pytest.approx(17.4)


def test_calculate_ttp_seconds_rejects_negative_delta() -> None:
    published = datetime(2026, 3, 18, 18, 0, tzinfo=timezone.utc)
    event = published + timedelta(seconds=1)

    with pytest.raises(ValueError):
        calculate_ttp_seconds(event, published)


def test_summarize_distribution_computes_robust_stats() -> None:
    summary = summarize_distribution([10, 20, 30, 40])

    assert summary.n == 4
    assert summary.mean == pytest.approx(25.0)
    assert summary.median == pytest.approx(25.0)
    assert summary.std_dev == pytest.approx(12.9099444874)
    assert summary.q1 == pytest.approx(17.5)
    assert summary.q3 == pytest.approx(32.5)
    assert summary.iqr == pytest.approx(15.0)
    assert summary.p95 == pytest.approx(38.5)


def test_cliffs_delta_detects_strong_effect_direction() -> None:
    # Smaller values are better for TTP. Here sample_a is clearly better.
    sample_a = [10, 11, 12]
    sample_b = [30, 31, 32]

    assert cliffs_delta(sample_a, sample_b) == pytest.approx(-1.0)
    assert cliffs_delta(sample_b, sample_a) == pytest.approx(1.0)


def test_cliffs_delta_zero_for_identical_samples() -> None:
    sample = [1, 2, 3, 4]
    assert cliffs_delta(sample, sample) == pytest.approx(0.0)


def test_bootstrap_mean_diff_ci_is_deterministic_and_excludes_zero() -> None:
    manual = [45, 50, 42, 48, 46]
    hybrid = [22, 21, 20, 25, 19]

    observed, lower, upper = bootstrap_mean_diff_ci(
        manual,
        hybrid,
        iterations=3000,
        confidence=0.95,
        seed=7,
    )

    assert observed == pytest.approx(24.8)
    assert lower > 0
    assert upper > lower


@pytest.mark.parametrize(
    "rater_a,rater_b,expected",
    [
        ([1, 2, 3, 2], [1, 2, 3, 2], 1.0),
        ([1, 1, 2, 2], [2, 2, 1, 1], -1.0),
    ],
)
def test_cohens_kappa_reference_cases(rater_a, rater_b, expected) -> None:
    assert cohens_kappa(rater_a, rater_b) == pytest.approx(expected)


def test_cohens_kappa_near_zero_for_random_like_agreement() -> None:
    a = [1, 1, 2, 2]
    b = [1, 2, 1, 2]

    assert cohens_kappa(a, b) == pytest.approx(0.0, abs=1e-9)


def test_summarize_distribution_single_value_has_zero_std_dev() -> None:
    summary = summarize_distribution([42.0])
    assert summary.n == 1
    assert summary.std_dev == pytest.approx(0.0)
    assert summary.min == summary.max == summary.mean == 42.0


def test_summarize_distribution_raises_on_empty() -> None:
    with pytest.raises(ValueError):
        summarize_distribution([])


def test_calculate_ttp_seconds_zero_delta_is_valid() -> None:
    t = datetime(2026, 3, 18, 18, 0, tzinfo=timezone.utc)
    assert calculate_ttp_seconds(t, t) == pytest.approx(0.0)


def test_cliffs_delta_raises_on_empty_sample() -> None:
    with pytest.raises(ValueError):
        cliffs_delta([], [1, 2])
    with pytest.raises(ValueError):
        cliffs_delta([1, 2], [])


def test_bootstrap_mean_diff_ci_raises_on_too_few_iterations() -> None:
    with pytest.raises(ValueError):
        bootstrap_mean_diff_ci([1, 2], [3, 4], iterations=50)


def test_cohens_kappa_raises_on_length_mismatch() -> None:
    with pytest.raises(ValueError):
        cohens_kappa([1, 2], [1])


def test_aggregate_quality_by_group_raises_on_missing_group_key() -> None:
    rows = [{"mode": "a", "correctness": 4, "tone": 4, "readability": 4}]
    with pytest.raises(ValueError, match="missing group key"):
        aggregate_quality_by_group(rows, group_key="model")


def test_aggregate_quality_by_group_raises_on_missing_dimension() -> None:
    rows = [{"mode": "a", "correctness": 4, "tone": 4}]
    with pytest.raises(ValueError, match="missing dimension"):
        aggregate_quality_by_group(rows, group_key="mode")


def test_aggregate_quality_by_group_builds_table_ready_scores() -> None:
    rows = [
        {"mode": "manual", "correctness": 4, "tone": 4, "readability": 4},
        {"mode": "manual", "correctness": 5, "tone": 4, "readability": 5},
        {"mode": "hybrid", "correctness": 5, "tone": 5, "readability": 5},
        {"mode": "hybrid", "correctness": 4, "tone": 5, "readability": 4},
    ]

    table = aggregate_quality_by_group(rows, group_key="mode")

    assert table["manual"]["n"] == pytest.approx(2.0)
    assert table["manual"]["correctness"] == pytest.approx(4.5)
    assert table["manual"]["overall"] == pytest.approx(4.3333333333)

    assert table["hybrid"]["tone"] == pytest.approx(5.0)
    assert table["hybrid"]["overall"] == pytest.approx(4.6666666667)
