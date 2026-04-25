import math


def _coerce_metric(value: float, default: float) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return default

    return numeric if math.isfinite(numeric) else default


def compute_bias_score(di_ratio: float, eo_diff: float,
                       fnr_gap: float, leakage_score: float) -> dict:
    di_ratio = _coerce_metric(di_ratio, 0.0)
    eo_diff = _coerce_metric(eo_diff, 1.0)
    fnr_gap = _coerce_metric(fnr_gap, 1.0)
    leakage_score = _coerce_metric(leakage_score, 1.0)

    # DI gap: distance below 1.0 (ideal), clipped 0-1
    di_gap = max(0, 1 - di_ratio)
    # Normalise each component to 0-1 range
    components = {
        'di_gap':        min(di_gap, 1.0),
        'eo_diff':       min(abs(eo_diff), 1.0),
        'fnr_gap':       min(abs(fnr_gap), 1.0),
        'leakage_score': min(leakage_score, 1.0),
    }
    weights = {'di_gap': 0.30, 'eo_diff': 0.30, 'fnr_gap': 0.25, 'leakage_score': 0.15}
    raw = sum(components[k] * weights[k] for k in weights)
    bias_score = round(100 * raw, 1)   # 0 = perfect, 100 = maximally biased
    return { 'bias_score': bias_score, 'breakdown': components }
