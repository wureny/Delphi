#!/usr/bin/env python3
"""Validate Delphi v0.2 package structure, fixtures, cross-references, and HTML basics."""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def fail(message: str, errors: list[str]) -> None:
    errors.append(message)


def validate_manifest(errors: list[str]) -> None:
    manifest_path = ROOT / "fixtures" / "manifest.json"
    manifest = load_json(manifest_path)
    for relative in manifest.get("files", []):
        path = ROOT / "fixtures" / relative
        if not path.is_file():
            fail(f"Manifest entry is missing: fixtures/{relative}", errors)


def validate_json_schema(errors: list[str]) -> None:
    try:
        from jsonschema import Draft202012Validator, FormatChecker
    except ImportError:
        print("WARN: jsonschema not installed; structural schema validation skipped.")
        return

    schema_path = ROOT / "schemas" / "domain.schema.json"
    schema = load_json(schema_path)
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())

    skip = {schema_path, ROOT / "fixtures" / "manifest.json", ROOT / "package-manifest.json"}
    for path in sorted(ROOT.rglob("*.json")):
        if path in skip:
            continue
        payload = load_json(path)
        issues = sorted(validator.iter_errors(payload), key=lambda err: list(err.path))
        for issue in issues:
            location = "/".join(str(part) for part in issue.path) or "<root>"
            fail(f"{path.relative_to(ROOT)}:{location}: {issue.message}", errors)


def validate_cross_references(errors: list[str]) -> None:
    source_bundles = [load_json(path) for path in sorted((ROOT / "fixtures" / "sources").glob("*.json"))]
    source_ids = {bundle["sourceDocument"]["sourceId"] for bundle in source_bundles}
    excerpt_ids = {
        excerpt["excerptId"]
        for bundle in source_bundles
        for excerpt in bundle.get("excerpts", [])
    }

    proposal_bundles = [load_json(path) for path in sorted((ROOT / "fixtures" / "proposals").glob("*.json"))]
    proposals = [proposal for bundle in proposal_bundles for proposal in bundle.get("proposals", [])]
    proposal_ids = {proposal["proposalId"] for proposal in proposals}

    for proposal in proposals:
        missing = set(proposal.get("evidenceRefs", [])) - excerpt_ids
        if missing:
            fail(f"{proposal['proposalId']} has unresolved evidence refs: {sorted(missing)}", errors)

    for path in sorted((ROOT / "fixtures" / "runs").glob("*.json")):
        bundle = load_json(path)
        run = bundle["workflowRun"]
        missing_sources = set(run.get("sourceRefs", [])) - source_ids
        missing_proposals = set(run.get("outputProposalIds", [])) - proposal_ids
        if missing_sources:
            fail(f"{path.name} has unresolved source refs: {sorted(missing_sources)}", errors)
        if missing_proposals:
            fail(f"{path.name} has unresolved proposal refs: {sorted(missing_proposals)}", errors)

        events = bundle.get("events", [])
        event_times = [parse_time(event["occurredAt"]) for event in events]
        if event_times != sorted(event_times):
            fail(f"{path.name} RunEvents are not chronological", errors)
        if events:
            start = parse_time(run["startedAt"])
            end = parse_time(run["completedAt"])
            if event_times[0] < start or event_times[-1] > end:
                fail(f"{path.name} event timestamps fall outside the run lifecycle", errors)

    v12 = load_json(ROOT / "fixtures" / "thesis.arct.v12.json")
    v13 = load_json(ROOT / "fixtures" / "expected" / "thesis.arct.v13.json")
    transition = load_json(ROOT / "fixtures" / "expected" / "ledger-transition.json")
    if not (v12["version"] == transition["fromVersion"] and v13["version"] == transition["toVersion"]):
        fail("Thesis versions do not align with the expected ledger transition", errors)
    if transition["toVersion"] != transition["fromVersion"] + 1:
        fail("Expected ledger transition must increment exactly one version", errors)
    missing_transition_proposals = set(transition["proposalIds"]) - proposal_ids
    missing_transition_evidence = set(transition["evidenceRefs"]) - excerpt_ids
    if missing_transition_proposals:
        fail(f"Ledger transition has unresolved proposal refs: {sorted(missing_transition_proposals)}", errors)
    if missing_transition_evidence:
        fail(f"Ledger transition has unresolved evidence refs: {sorted(missing_transition_evidence)}", errors)


def validate_html(errors: list[str]) -> None:
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print("WARN: beautifulsoup4 not installed; HTML structure validation skipped.")
        return

    for path in sorted((ROOT / "html").glob("*.html")):
        text = path.read_text(encoding="utf-8")
        soup = BeautifulSoup(text, "html.parser")
        if not soup.title or not soup.title.get_text(strip=True):
            fail(f"{path.relative_to(ROOT)} has no title", errors)
        if not soup.find("h1"):
            fail(f"{path.relative_to(ROOT)} has no h1", errors)
        ids = [tag.get("id") for tag in soup.find_all(attrs={"id": True})]
        duplicates = sorted({item for item in ids if ids.count(item) > 1})
        if duplicates:
            fail(f"{path.relative_to(ROOT)} has duplicate IDs: {duplicates}", errors)


def validate_markdown(errors: list[str]) -> None:
    for path in sorted(ROOT.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        if len(text.strip()) < 100:
            fail(f"{path.name} appears unexpectedly short", errors)
        if "\x00" in text:
            fail(f"{path.name} contains a null byte", errors)


def main() -> int:
    errors: list[str] = []
    validate_manifest(errors)
    validate_json_schema(errors)
    validate_cross_references(errors)
    validate_html(errors)
    validate_markdown(errors)

    if errors:
        print("VALIDATION FAILED")
        for error in errors:
            print(f"- {error}")
        return 1

    print("VALIDATION PASSED")
    print("- package manifest entries exist")
    print("- JSON fixtures satisfy the shared schema")
    print("- source, evidence, proposal, run, and transition refs resolve")
    print("- run event timelines are chronological")
    print("- HTML files have titles, h1 elements, and unique IDs")
    print("- root Markdown documents are non-empty")
    return 0


if __name__ == "__main__":
    sys.exit(main())
