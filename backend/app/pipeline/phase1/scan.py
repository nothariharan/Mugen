from modelscan.modelscan import ModelScan

def run_security_scan(model_path: str) -> dict:
    """
    Scans a .pkl model for security vulnerabilities (e.g., pickle bombs).
    """
    ms = ModelScan()
    scan_results = ms.scan(model_path)
    
    issues_found = len(scan_results.issues)
    passed = issues_found == 0
    
    return {
        "passed": passed,
        "threats_found": issues_found,
        "details": [str(issue) for issue in scan_results.issues]
    }
