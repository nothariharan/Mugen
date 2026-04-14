import yaml
from pathlib import Path

# Fix relative path for loading YAML
RULES_PATH = Path(__file__).parent.parent.parent / 'rules' / 'compliance_rules.yaml'
RULES = yaml.safe_load(RULES_PATH.read_text())

def evaluate(domain: str, metrics: dict) -> dict:
    domain_rules = RULES['domains'][domain]
    thresholds = domain_rules['thresholds']
    violations = []
    for metric, threshold in thresholds.items():
        actual = metrics.get(metric, 0)
        if metric == 'disparate_impact' and actual < threshold:
            violations.append(f'{metric}: {actual:.2f} < required {threshold}')
        elif metric != 'disparate_impact' and actual > threshold:
            violations.append(f'{metric}: {actual:.2f} > allowed {threshold}')
    return {
        'passed': len(violations) == 0,
        'violations': violations,
        'regulations': domain_rules['regulations'],
        'recommended_metric': domain_rules['recommended_metric'],
        'fail_message': domain_rules.get('fail_message', ''),
    }
