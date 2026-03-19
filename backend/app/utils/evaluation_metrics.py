"""
evaluation_metrics
==================
Statistische Hilfsfunktionen für die empirische Evaluation (Kapitel 6).

Enthält: Zeitdauer-Berechnung (TTP), Verteilungsstatistiken, Cliffs Delta,
Bootstrap-CI, Cohens Kappa und Qualitäts-Aggregation nach Gruppen.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from random import Random
from statistics import mean, median, stdev
from typing import Iterable


@dataclass(frozen=True)
class DistributionSummary:
    n: int
    mean: float
    median: float
    std_dev: float
    min: float
    max: float
    q1: float
    q3: float
    iqr: float
    p95: float


def calculate_ttp_seconds(event_time: datetime, publish_time: datetime) -> float:
    """Return time-to-publish (TTP) in seconds."""
    delta = (publish_time - event_time).total_seconds()
    if delta < 0:
        raise ValueError("publish_time must be greater than or equal to event_time")
    return delta


def _quantile(sorted_values: list[float], q: float) -> float:
    if not 0 <= q <= 1:
        raise ValueError("q must be between 0 and 1")
    if not sorted_values:
        raise ValueError("values must not be empty")

    position = (len(sorted_values) - 1) * q
    low = int(position)
    high = min(low + 1, len(sorted_values) - 1)
    weight = position - low
    return sorted_values[low] * (1 - weight) + sorted_values[high] * weight


def summarize_distribution(values: Iterable[float]) -> DistributionSummary:
    """Return robust descriptive statistics used in chapter-6 evaluations."""
    data = [float(v) for v in values]
    if not data:
        raise ValueError("values must not be empty")

    sorted_data = sorted(data)
    q1 = _quantile(sorted_data, 0.25)
    q3 = _quantile(sorted_data, 0.75)

    return DistributionSummary(
        n=len(sorted_data),
        mean=mean(sorted_data),
        median=median(sorted_data),
        std_dev=stdev(sorted_data) if len(sorted_data) > 1 else 0.0,
        min=sorted_data[0],
        max=sorted_data[-1],
        q1=q1,
        q3=q3,
        iqr=q3 - q1,
        p95=_quantile(sorted_data, 0.95),
    )


def cliffs_delta(sample_a: Iterable[float], sample_b: Iterable[float]) -> float:
    """Effect size for ordinal/non-normal comparisons.

    Returns value in [-1, 1].
    """
    a = [float(x) for x in sample_a]
    b = [float(x) for x in sample_b]
    if not a or not b:
        raise ValueError("both samples must be non-empty")

    gt = 0
    lt = 0
    for x in a:
        for y in b:
            if x > y:
                gt += 1
            elif x < y:
                lt += 1

    total = len(a) * len(b)
    return (gt - lt) / total


def bootstrap_mean_diff_ci(
    sample_a: Iterable[float],
    sample_b: Iterable[float],
    *,
    iterations: int = 5000,
    confidence: float = 0.95,
    seed: int = 42,
) -> tuple[float, float, float]:
    """Bootstrap CI for mean(A)-mean(B), deterministic via seed."""
    a = [float(x) for x in sample_a]
    b = [float(x) for x in sample_b]
    if not a or not b:
        raise ValueError("both samples must be non-empty")
    if iterations < 100:
        raise ValueError("iterations must be >= 100")
    if not 0 < confidence < 1:
        raise ValueError("confidence must be between 0 and 1")

    rng = Random(seed)
    diffs: list[float] = []

    for _ in range(iterations):
        boot_a = [a[rng.randrange(len(a))] for _ in range(len(a))]
        boot_b = [b[rng.randrange(len(b))] for _ in range(len(b))]
        diffs.append(mean(boot_a) - mean(boot_b))

    diffs.sort()
    alpha = (1 - confidence) / 2
    lower = _quantile(diffs, alpha)
    upper = _quantile(diffs, 1 - alpha)
    observed = mean(a) - mean(b)
    return observed, lower, upper


def cohens_kappa(rater_a: Iterable[int], rater_b: Iterable[int]) -> float:
    """Unweighted Cohen's kappa for categorical ratings."""
    a = list(rater_a)
    b = list(rater_b)
    if len(a) != len(b) or not a:
        raise ValueError("ratings must have same non-zero length")

    observed = sum(x == y for x, y in zip(a, b)) / len(a)

    counts_a = Counter(a)
    counts_b = Counter(b)
    labels = set(counts_a) | set(counts_b)
    expected = sum((counts_a[l] / len(a)) * (counts_b[l] / len(b)) for l in labels)

    if expected == 1.0:
        return 1.0
    return (observed - expected) / (1 - expected)


def aggregate_quality_by_group(
    records: Iterable[dict],
    *,
    group_key: str,
    dimensions: tuple[str, ...] = ("correctness", "tone", "readability"),
) -> dict[str, dict[str, float]]:
    """Aggregate quality scores by mode/model for evaluation tables."""
    grouped: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))

    for row in records:
        if group_key not in row:
            raise ValueError(f"missing group key: {group_key}")
        group = str(row[group_key])
        for dim in dimensions:
            if dim not in row:
                raise ValueError(f"missing dimension: {dim}")
            grouped[group][dim].append(float(row[dim]))

    result: dict[str, dict[str, float]] = {}
    for group, scores in grouped.items():
        out: dict[str, float] = {"n": float(len(next(iter(scores.values()))))}
        dim_means = []
        for dim in dimensions:
            dim_mean = mean(scores[dim])
            out[dim] = dim_mean
            dim_means.append(dim_mean)
        out["overall"] = mean(dim_means)
        result[group] = out

    return result
