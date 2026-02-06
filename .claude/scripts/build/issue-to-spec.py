#!/usr/bin/env python3
"""
issue-to-spec.py - Convert GitHub Issue to auto-claude spec format

Generates spec.md and implementation_plan.json from a GitHub Issue,
skipping spec_runner.py entirely. The Planner Agent in run.py will
still create the detailed subtask breakdown.

Usage:
    python issue-to-spec.py --issue 42 --output .auto-claude/specs/042/
    python issue-to-spec.py --issue 42 --prd docs/prd/user-auth.md --output .auto-claude/specs/042/
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def run_gh_command(args: list[str], repo: str | None = None) -> dict | list:
    """Run gh CLI command and return parsed JSON."""
    cmd = ["gh"]
    if repo:
        cmd.extend(["-R", repo])
    cmd.extend(args)
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


def fetch_issue(issue_number: int, repo: str | None = None) -> dict:
    """Fetch issue details from GitHub."""
    return run_gh_command([
        "issue", "view", str(issue_number),
        "--json", "number,title,body,labels,assignees,milestone"
    ], repo=repo)


def extract_acceptance_criteria(body: str) -> list[str]:
    """Extract acceptance criteria from issue body.

    Looks for:
    - Lines starting with "- [ ]" or "- [x]"
    - Section titled "Acceptance Criteria" or "AC"
    - Given/When/Then patterns
    """
    criteria = []
    lines = body.split('\n')
    in_ac_section = False

    for line in lines:
        line_lower = line.lower().strip()

        # Detect AC section header
        if any(header in line_lower for header in ['## acceptance criteria', '## ac', '### acceptance criteria']):
            in_ac_section = True
            continue

        # End AC section on next header
        if in_ac_section and line.startswith('#'):
            in_ac_section = False
            continue

        # Extract checkbox items
        if line.strip().startswith('- [ ]') or line.strip().startswith('- [x]'):
            criteria.append(line.strip()[6:].strip())  # Remove "- [ ] " prefix
            continue

        # Extract Given/When/Then
        if in_ac_section and line.strip().startswith(('Given', 'When', 'Then', '- Given', '- When', '- Then')):
            criteria.append(line.strip().lstrip('- '))

    return criteria


def extract_technical_notes(body: str) -> str:
    """Extract technical notes section from issue body."""
    lines = body.split('\n')
    in_tech_section = False
    tech_lines = []

    for line in lines:
        line_lower = line.lower().strip()

        if any(header in line_lower for header in ['## technical', '### technical', '## implementation', '### implementation']):
            in_tech_section = True
            continue

        if in_tech_section and line.startswith('#'):
            break

        if in_tech_section:
            tech_lines.append(line)

    return '\n'.join(tech_lines).strip()


def generate_spec_md(issue: dict, prd_path: str | None = None) -> str:
    """Generate spec.md content from GitHub Issue."""

    number = issue['number']
    title = issue['title']
    body = issue['body'] or ''

    acceptance_criteria = extract_acceptance_criteria(body)
    technical_notes = extract_technical_notes(body)

    # Build spec content
    spec = f"""# Feature: {title}

## Overview

{body}

## Acceptance Criteria

"""

    if acceptance_criteria:
        for criterion in acceptance_criteria:
            spec += f"- [ ] {criterion}\n"
    else:
        spec += "- [ ] Implementation matches the user story\n"
        spec += "- [ ] All tests pass\n"
        spec += "- [ ] No regressions introduced\n"

    spec += f"""
## Technical Notes

{technical_notes if technical_notes else "No specific technical constraints. Follow project conventions."}

## Source

- GitHub Issue: #{number}
"""

    if prd_path and Path(prd_path).exists():
        spec += f"- PRD: {prd_path}\n"

    spec += f"""
## Constraints

- Do NOT make design decisions. If requirements are ambiguous, STOP and report what needs clarification.
- Follow existing code patterns in this repository.
- Write tests for new functionality.
- Keep changes focused on this issue only.
"""

    return spec


def generate_implementation_plan(issue: dict) -> dict:
    """Generate minimal implementation_plan.json.

    The Planner Agent in run.py will expand this into detailed subtasks.
    We just provide the skeleton structure.

    Note: Uses auto-claude compatible schema with phases[].subtasks[] structure
    as required by spec_contract.json and implementation_plan_validator.py.
    """

    number = issue['number']
    title = issue['title']

    return {
        "spec_id": f"{number:03d}-{slugify(title)}",
        "feature": title,
        "source_issue": number,
        "phases": [
            {
                "phase": 1,
                "name": title,
                "subtasks": [
                    {
                        "id": "subtask-1",
                        "title": title,
                        "description": f"Implement GitHub Issue #{number}",
                        "dependencies": [],
                        "status": "pending",
                        "files": [],  # Planner will discover
                        "estimated_complexity": "medium"
                    }
                ]
            }
        ],
        "metadata": {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "issue-to-spec.py",
            "complexity_tier": "standard",
            "total_subtasks": 1,
            "completed_subtasks": 0,
            "needs_planning": True  # Signal to run.py to invoke Planner
        }
    }


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    import re
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    text = text.strip('-')
    return text[:50]  # Limit length


def main():
    parser = argparse.ArgumentParser(description='Convert GitHub Issue to auto-claude spec')
    parser.add_argument('--issue', type=int, required=True, help='GitHub issue number')
    parser.add_argument('--output', type=str, required=True, help='Output directory for spec files')
    parser.add_argument('--prd', type=str, help='Path to related PRD file')
    parser.add_argument('--repo', type=str, help='GitHub repository (owner/repo) - overrides git context')
    parser.add_argument('--dry-run', action='store_true', help='Print spec without writing files')

    args = parser.parse_args()

    # Fetch issue
    repo_info = f" from {args.repo}" if args.repo else ""
    print(f"📥 Fetching issue #{args.issue}{repo_info}...")
    try:
        issue = fetch_issue(args.issue, repo=args.repo)
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to fetch issue: {e.stderr}", file=sys.stderr)
        sys.exit(1)

    print(f"   Title: {issue['title']}")

    # Generate spec content
    spec_md = generate_spec_md(issue, args.prd)
    impl_plan = generate_implementation_plan(issue)

    if args.dry_run:
        print("\n--- spec.md ---")
        print(spec_md)
        print("\n--- implementation_plan.json ---")
        print(json.dumps(impl_plan, indent=2))
        return

    # Write files
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    spec_path = output_dir / "spec.md"
    plan_path = output_dir / "implementation_plan.json"

    spec_path.write_text(spec_md)
    print(f"✅ Written: {spec_path}")

    plan_path.write_text(json.dumps(impl_plan, indent=2))
    print(f"✅ Written: {plan_path}")

    # Also write issue metadata for reference
    meta_path = output_dir / "issue.json"
    meta_path.write_text(json.dumps(issue, indent=2))
    print(f"✅ Written: {meta_path}")

    print(f"\n📦 Spec ready at: {output_dir}")
    print(f"   Run: python run.py --spec {impl_plan['spec_id']}")


if __name__ == '__main__':
    main()
