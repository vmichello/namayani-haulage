#!/usr/bin/env python3
"""Deterministic GitHub-only workflow bots.

Case files must be sanitized: store IDs and evidence locations, not personal data,
signatures, invoices, or customer documents.
"""

import argparse
import json
import os
import sqlite3
import subprocess
from datetime import datetime, timezone
from pathlib import Path

REQUIRED_EVIDENCE = (
    "form_6_6", "proforma_invoice", "purchase_order",
    "goods_list_hs_codes", "conformity_documents",
)


def load_case(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        case = json.load(handle)
    if not isinstance(case, dict) or not case.get("case_id"):
        raise ValueError(f"{path}: case_id is required")
    return case


def knowledge_summary() -> str:
    database = os.environ.get("KNOWLEDGE_DB")
    if not database:
        return "Knowledge database: not configured"
    path = Path(database)
    if not path.is_file():
        raise RuntimeError(f"Knowledge database was not downloaded: {path}")
    with sqlite3.connect(path) as connection:
        count = connection.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
    return f"Knowledge database: {count} documents available"


def voc_review(case: dict) -> tuple[str, list[str]]:
    errors = []
    evidence = case.get("evidence", {})
    missing = [name for name in REQUIRED_EVIDENCE if evidence.get(name) is not True]
    if missing:
        errors.append("Missing evidence: " + ", ".join(missing))
    remote = case.get("remote_inspection", {})
    if remote.get("requested"):
        for name in ("consent_on_file", "site_contact_on_file",
                     "connectivity_confirmed", "eligibility_confirmed"):
            if remote.get(name) is not True:
                errors.append(f"Remote inspection prerequisite not confirmed: {name}")
        if evidence.get("signed_remote_consent") is not True:
            errors.append("Missing evidence: signed_remote_consent")
    if case.get("bv_reference") in (None, "", "PENDING"):
        errors.append("Bureau Veritas reference is not recorded")
    if evidence.get("certificate_or_ncr") is not True:
        errors.append("Certificate or Non-Conformity Report is not recorded")
    if case.get("dispatch_requested") and errors:
        errors.append("Dispatch is requested while the VOC gate is blocked")
    return ("Compliance hold" if errors else "Compliance cleared"), errors


def intake_review(case: dict) -> tuple[str, list[str]]:
    errors = []
    if not case.get("destination"):
        errors.append("Destination is missing")
    if not case.get("case_id"):
        errors.append("Case ID is missing")
    if not isinstance(case.get("evidence"), dict):
        errors.append("Evidence checklist is missing")
    if not isinstance(case.get("commercial"), dict):
        errors.append("Commercial summary is missing")
    return ("Evidence requested" if errors else "Compliance review"), errors


def remote_review(case: dict) -> tuple[str, list[str]]:
    remote = case.get("remote_inspection", {})
    if not remote.get("requested"):
        return "Not requested", []
    errors = [
        f"Remote inspection prerequisite not confirmed: {name}"
        for name in ("consent_on_file", "site_contact_on_file",
                     "connectivity_confirmed", "eligibility_confirmed")
        if remote.get(name) is not True
    ]
    return ("Inspection scheduled" if not errors else "Compliance hold"), errors


def dispatch_review(case: dict) -> tuple[str, list[str]]:
    errors = []
    if case.get("status") != "Compliance cleared":
        errors.append("VOC compliance is not cleared")
    for name in ("carrier_confirmed", "git_confirmed", "tracking_confirmed",
                 "border_documents_confirmed"):
        if case.get(name) is not True:
            errors.append(f"Operational prerequisite not confirmed: {name}")
    return ("Dispatch ready" if not errors else "Dispatch hold"), errors


def finance_review(case_files: list[Path], cadence: str) -> tuple[str, list[str]]:
    issues = []
    for path in case_files:
        case = load_case(path)
        commercial = case.get("commercial", {})
        if any(commercial.get(key) in (None, "") for key in
               ("declared_total", "freight", "insurance_value", "incoterm")):
            issues.append(f"{case['case_id']}: financial data gap in commercial values")
        if case.get("status") not in ("Compliance cleared", "Closed"):
            issues.append(f"{case['case_id']}: compliance status is {case.get('status', 'missing')}")
    return f"{cadence.title()} audit", issues


def issue_report(title: str, body: str) -> None:
    if not os.environ.get("GH_TOKEN"):
        raise RuntimeError("--create-issue requires GH_TOKEN")
    subprocess.run(
        ["gh", "issue", "create", "--title", title, "--body", body],
        check=True,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bot", choices=(
        "voc-intake", "voc-compliance", "remote-inspection",
        "dispatch-risk", "cfo-weekly", "cfo-monthly",
    ), required=True)
    parser.add_argument("--case", type=Path)
    parser.add_argument("--cases-dir", type=Path)
    parser.add_argument("--create-issue", action="store_true")
    args = parser.parse_args()

    if args.bot in ("voc-intake", "voc-compliance", "remote-inspection", "dispatch-risk"):
        if not args.case:
            parser.error("--case is required for this bot")
        case = load_case(args.case)
        reviews = {
            "voc-intake": intake_review,
            "voc-compliance": voc_review,
            "remote-inspection": remote_review,
            "dispatch-risk": dispatch_review,
        }
        status, issues = reviews[args.bot](case)
        title = f"[VOC bot] {case['case_id']} — {status}"
        lines = [f"**Status:** `{status}`", "", "### Findings"]
        lines.extend(f"- {item}" for item in (issues or ["No blocking findings"]))
    else:
        paths = sorted((args.cases_dir or Path("ops/cases")).glob("*.json"))
        title, issues = finance_review(paths, args.bot.removeprefix("cfo-"))
        lines = [f"**Generated:** {datetime.now(timezone.utc).isoformat()}", "", "### Findings"]
        lines.extend(f"- {item}" for item in (issues or ["No findings"]))

    body = "\n".join([knowledge_summary(), "", *lines])
    print(body)
    if args.create_issue:
        issue_report(title, body)
    return 1 if issues else 0


if __name__ == "__main__":
    raise SystemExit(main())
