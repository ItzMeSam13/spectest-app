"""
spec_score.py
-------------
SpecScore™ Algorithm — calculates a 0-100 score based on 4 dimensions:

  1. Coverage Score      — % of requirements successfully mapped to an endpoint
  2. Functional Score    — % of functional tests that passed (HTTP < 400)
  3. Security Score      — % of security checks that passed (no vulnerabilities)
  4. Documentation Score — penalises endpoints mapped to UNKNOWN or skipped

Final: weighted average of the four dimensions.
"""

from typing import Dict, List, Any


# ──────────────────────────────────────────────
# Weights  (must sum to 1.0)
# ──────────────────────────────────────────────
WEIGHTS = {
    "coverage":      0.30,
    "functional":    0.35,
    "security":      0.25,
    "documentation": 0.10,
}


def compute_spec_score(
    mapping: Dict[str, str],
    functional_results: List[Dict],
    security_summary: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Parameters
    ----------
    mapping            : { "REQ-01": "POST /login", "REQ-02": "UNKNOWN", ... }
    functional_results : list of result dicts from TestExecutor.stream_suite
    security_summary   : dict from SecurityScanner.scan's final event["data"]["security_summary"]
                         { total_checks, passed, vulnerabilities_found, details }

    Returns
    -------
    {
      "spec_score": 82,
      "grade": "B",
      "breakdown": {
          "coverage":      { "score": 90, "label": "Requirement Coverage",  "detail": "9/10 mapped" },
          "functional":    { "score": 80, "label": "Functional Health",     "detail": "8/10 passed" },
          "security":      { "score": 75, "label": "Security Posture",      "detail": "3/4 checks passed" },
          "documentation": { "score": 60, "label": "Documentation Health",  "detail": "1 gap(s) found" },
      },
      "gaps": ["REQ-02 could not be mapped to any endpoint"],
      "vulnerabilities": [...],
      "badge": "🥈 Silver",
    }
    """

    # ── 1. Coverage Score ──────────────────────────────────────────
    total_reqs = len(mapping)
    mapped = sum(1 for v in mapping.values() if v and v != "UNKNOWN")
    coverage_pct = (mapped / total_reqs * 100) if total_reqs else 0

    unmapped_reqs = [k for k, v in mapping.items() if not v or v == "UNKNOWN"]
    gaps = [f"{r} could not be mapped to any endpoint" for r in unmapped_reqs]

    # ── 2. Functional Score ────────────────────────────────────────
    ran = [r for r in functional_results if not r.get("skipped")]
    func_passed = sum(1 for r in ran if r.get("success"))
    func_total = len(ran)
    functional_pct = (func_passed / func_total * 100) if func_total else 0

    # Bonus: healed tests count as half-pass for documentation dimension
    healed = sum(1 for r in ran if r.get("healed"))

    # ── 3. Security Score ──────────────────────────────────────────
    sec_total = security_summary.get("total_checks", 0)
    sec_passed = security_summary.get("passed", sec_total)  # safe default
    security_pct = (sec_passed / sec_total * 100) if sec_total else 100  # no scan = perfect

    # ── 4. Documentation Score ────────────────────────────────────
    # Penalise: unmapped requirements + documentation drift (self-healed endpoints)
    doc_issues = len(unmapped_reqs) + healed
    doc_pct = max(0, 100 - (doc_issues * 15))  # -15 per issue, floor 0

    # ── Weighted Final ─────────────────────────────────────────────
    raw_score = (
        coverage_pct      * WEIGHTS["coverage"]
        + functional_pct  * WEIGHTS["functional"]
        + security_pct    * WEIGHTS["security"]
        + doc_pct         * WEIGHTS["documentation"]
    )
    final_score = round(min(100, max(0, raw_score)))

    grade = _grade(final_score)
    badge = _badge(final_score)

    return {
        "spec_score": final_score,
        "grade": grade,
        "badge": badge,
        "breakdown": {
            "coverage": {
                "score": round(coverage_pct),
                "label": "Requirement Coverage",
                "detail": f"{mapped}/{total_reqs} requirements mapped",
                "weight": f"{int(WEIGHTS['coverage']*100)}%",
            },
            "functional": {
                "score": round(functional_pct),
                "label": "Functional Health",
                "detail": f"{func_passed}/{func_total} tests passed"
                          + (f" ({healed} self-healed)" if healed else ""),
                "weight": f"{int(WEIGHTS['functional']*100)}%",
            },
            "security": {
                "score": round(security_pct),
                "label": "Security Posture",
                "detail": f"{sec_passed}/{sec_total} security checks passed",
                "weight": f"{int(WEIGHTS['security']*100)}%",
            },
            "documentation": {
                "score": round(doc_pct),
                "label": "Documentation Health",
                "detail": f"{doc_issues} issue(s) found"
                          + (" (gaps + drift)" if doc_issues else " — clean"),
                "weight": f"{int(WEIGHTS['documentation']*100)}%",
            },
        },
        "gaps": gaps,
        "vulnerabilities": security_summary.get("details", []),
        "healed_count": healed,
    }


def _grade(score: int) -> str:
    if score >= 90: return "A"
    if score >= 80: return "B"
    if score >= 70: return "C"
    if score >= 60: return "D"
    return "F"


def _badge(score: int) -> str:
    if score >= 90: return "🥇 Gold"
    if score >= 75: return "🥈 Silver"
    if score >= 60: return "🥉 Bronze"
    return "❌ Needs Work"
