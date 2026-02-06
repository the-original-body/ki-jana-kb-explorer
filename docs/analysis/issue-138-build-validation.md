# Issue #138: Build Orchestrator Completion Validation

## Problem Statement

The build orchestrator currently relies solely on exit codes to determine build success. This can produce false positives when:
- Auto-claude exits cleanly (code 0) but performs no actual work
- Early termination occurs without setting error codes
- Partial execution leaves artifacts but incomplete implementation

## Investigation Findings

### Current Detection Logic

Location: `.claude/scripts/build/build-orchestrator.sh:318-352`

```bash
if python run.py --spec "$SPEC_ID" ... ; then
    # Exit code 0 → mark as completed
    cat > "$STATUS_FILE" << EOF
    {
        "status": "completed",
        ...
    }
EOF
else
    # Exit code ≠ 0 → mark as failed
    cat > "$STATUS_FILE" << EOF
    {
        "status": "failed",
        ...
    }
EOF
fi
```

**Problem**: Exit code alone does not guarantee actual work completion.

### Auto-Claude Success Artifacts

When auto-claude successfully completes a build, it produces:

#### 1. Git Artifacts
- **Worktree**: `.worktrees/auto-claude/{spec-id}/`
- **Branch**: `auto-claude/{spec-id}`
- **Commits**: Branch has commits ahead of base branch
  - Accessible via: `git rev-list --count {base}..HEAD` in worktree
- **Changes**: Files modified/added/deleted
  - Accessible via: `git diff --shortstat {base}...HEAD` in worktree

#### 2. Status Files
- **Task Logs**: `.auto-claude/specs/{spec-id}/task_logs.json`
  - Contains phase statuses: "pending" | "active" | "completed" | "failed"
  - Phases: planning, coding, validation
  - Structure:
    ```json
    {
      "phases": {
        "planning": {"status": "completed", "completed_at": "..."},
        "coding": {"status": "completed", "completed_at": "..."},
        "validation": {"status": "completed", "completed_at": "..."}
      }
    }
    ```

- **Implementation Plan**: `.auto-claude/specs/{spec-id}/implementation_plan.json`
  - May contain `qa_signoff` object with approval status
  - Optional but indicates QA phase completion

### Failure Modes & Edge Cases

#### Mode 1: No-Op Execution
**Scenario**: Auto-claude determines no changes needed, exits 0
**Indicators**:
- Worktree exists but `commit_count == 0`
- `files_changed == 0`
- task_logs.json may show phases completed but no actual code written

**Impact**: Orchestrator marks as "completed" but no implementation occurred

#### Mode 2: Partial Completion
**Scenario**: Work starts but fails validation/QA, exits 0 due to error handling
**Indicators**:
- Worktree has some commits
- task_logs.json shows planning/coding "completed" but validation "failed"
- QA signoff absent or status="rejected"

**Impact**: Incomplete work marked as ready to merge

#### Mode 3: Early Termination
**Scenario**: Guard condition (missing env var, invalid spec) triggers clean exit
**Indicators**:
- Worktree may not exist
- No commits
- task_logs.json absent or all phases "pending"

**Impact**: False positive completion

#### Mode 4: Crash with Cleanup
**Scenario**: Exception caught and handled, exit 0 despite failure
**Indicators**:
- Worktree in inconsistent state
- task_logs.json shows "active" phase (never completed)
- Exit code 0 but status files indicate incomplete

**Impact**: Build marked complete but worktree unusable

## Proposed Solution

### Multi-Tier Validation

After auto-claude exits with code 0, perform validation in tiers:

#### Tier 1: Critical Validation (MUST PASS)
Build is **INVALID** if any check fails:

1. **Worktree Exists**: `.worktrees/auto-claude/{spec-id}/` directory exists
2. **Branch Exists**: `git rev-parse auto-claude/{spec-id}` succeeds
3. **Has Commits**: `git rev-list --count {base}..HEAD` in worktree > 0
4. **Has Changes**: `git diff --shortstat {base}...HEAD` in worktree shows changes

**Rationale**: These prove actual implementation work occurred.

#### Tier 2: Phase Validation (RECOMMENDED)
Build should be **FAILED** if any check fails:

5. **Task Logs Exist**: `.auto-claude/specs/{spec-id}/task_logs.json` exists
6. **Planning Completed**: `phases.planning.status == "completed"`
7. **Coding Completed**: `phases.coding.status == "completed"`
8. **Validation Completed**: `phases.validation.status == "completed"`

**Rationale**: Ensures full workflow executed, not just partial work.

#### Tier 3: Quality Validation (OPTIONAL/INFORMATIONAL)
Log warnings but don't fail build:

9. **QA Signoff Present**: `implementation_plan.json` has `qa_signoff` object
10. **QA Approved**: `qa_signoff.status == "approved"`

**Rationale**: Nice-to-have but may not always be present depending on workflow.

### Implementation Design

#### New Function: `validate_build_completion()`

```bash
validate_build_completion() {
    local SPEC_ID=$1
    local NUM=$2
    local WORKTREE_PATH="$PROJECT_ROOT/.worktrees/auto-claude/$SPEC_ID"
    local SPEC_DIR="$PROJECT_ROOT/.auto-claude/specs/$SPEC_ID"
    local TASK_LOGS="$SPEC_DIR/task_logs.json"

    echo "Validating build completion for #$NUM (spec: $SPEC_ID)..."

    # Tier 1: Critical validation
    if [[ ! -d "$WORKTREE_PATH" ]]; then
        echo "❌ Validation failed: Worktree not found at $WORKTREE_PATH"
        return 1
    fi

    if ! git rev-parse --verify "auto-claude/$SPEC_ID" &>/dev/null; then
        echo "❌ Validation failed: Branch auto-claude/$SPEC_ID not found"
        return 1
    fi

    cd "$WORKTREE_PATH"
    COMMIT_COUNT=$(git rev-list --count "$FEATURE_BRANCH..HEAD" 2>/dev/null || echo "0")
    if [[ "$COMMIT_COUNT" -eq 0 ]]; then
        echo "❌ Validation failed: No commits in worktree (0 commits ahead of base)"
        return 1
    fi

    CHANGES=$(git diff --shortstat "$FEATURE_BRANCH...HEAD" 2>/dev/null)
    if [[ -z "$CHANGES" ]]; then
        echo "❌ Validation failed: No file changes in worktree"
        return 1
    fi

    echo "✓ Tier 1: $COMMIT_COUNT commits, changes: $CHANGES"

    # Tier 2: Phase validation
    if [[ ! -f "$TASK_LOGS" ]]; then
        echo "⚠️  Warning: task_logs.json not found (phase validation skipped)"
        return 0  # Warning only, don't fail
    fi

    PLANNING_STATUS=$(jq -r '.phases.planning.status // "unknown"' "$TASK_LOGS" 2>/dev/null)
    CODING_STATUS=$(jq -r '.phases.coding.status // "unknown"' "$TASK_LOGS" 2>/dev/null)
    VALIDATION_STATUS=$(jq -r '.phases.validation.status // "unknown"' "$TASK_LOGS" 2>/dev/null)

    if [[ "$PLANNING_STATUS" != "completed" ]]; then
        echo "❌ Validation failed: Planning phase not completed (status: $PLANNING_STATUS)"
        return 1
    fi

    if [[ "$CODING_STATUS" != "completed" ]]; then
        echo "❌ Validation failed: Coding phase not completed (status: $CODING_STATUS)"
        return 1
    fi

    if [[ "$VALIDATION_STATUS" != "completed" ]]; then
        echo "❌ Validation failed: Validation phase not completed (status: $VALIDATION_STATUS)"
        return 1
    fi

    echo "✓ Tier 2: All phases completed"

    # Tier 3: QA validation (informational only)
    IMPL_PLAN="$SPEC_DIR/implementation_plan.json"
    if [[ -f "$IMPL_PLAN" ]]; then
        QA_STATUS=$(jq -r '.qa_signoff.status // "none"' "$IMPL_PLAN" 2>/dev/null)
        if [[ "$QA_STATUS" == "approved" ]]; then
            echo "✓ Tier 3: QA approved"
        elif [[ "$QA_STATUS" == "rejected" ]]; then
            echo "⚠️  Info: QA rejected (may need review)"
        else
            echo "⚠️  Info: No QA signoff found"
        fi
    fi

    cd "$PROJECT_ROOT"
    return 0
}
```

#### Integration Point

Modify `run_build()` function (line 318-352):

```bash
# Run auto-claude
if python run.py ... 2>&1 | filter_milestones "$LOG" "$NUM"; then
    # Exit code 0, but validate actual completion
    if validate_build_completion "$SPEC_ID" "$NUM"; then
        # TRUE success - mark completed
        cat > "$STATUS_FILE" << EOF
{
    "issue": $NUM,
    "spec_id": "$SPEC_ID",
    "status": "completed",
    ...
}
EOF
        log "✅ #$NUM completed and validated"
    else
        # FALSE success - validation failed, mark as failed
        cat > "$STATUS_FILE" << EOF
{
    "issue": $NUM,
    "spec_id": "$SPEC_ID",
    "status": "failed",
    "validation_failed": true,
    ...
}
EOF
        log "❌ #$NUM validation failed (exit code 0 but no actual work)"
        return 1
    fi
else
    # Exit code non-zero, already failed
    ...
fi
```

### Benefits

1. **Eliminates False Positives**: Catches exit-0-but-no-work scenarios
2. **Comprehensive Validation**: Checks multiple dimensions of completion
3. **Clear Failure Reasons**: Detailed logging shows what validation failed
4. **Backward Compatible**: Only adds validation, doesn't change interface
5. **Tiered Approach**: Critical checks block merge, warnings are informational

### Testing Strategy

#### Test Case 1: Normal Success
- Run auto-claude, produces commits and completes phases
- Validation should pass all tiers
- Expected: Build marked "completed"

#### Test Case 2: No-Op Execution
- Mock auto-claude to exit 0 but create no commits
- Tier 1 should catch: commit_count == 0
- Expected: Build marked "failed" with validation error

#### Test Case 3: Partial Completion
- Mock auto-claude to create commits but fail validation phase
- Tier 2 should catch: validation phase not "completed"
- Expected: Build marked "failed"

#### Test Case 4: Missing Worktree
- Mock auto-claude to exit 0 without creating worktree
- Tier 1 should catch: worktree doesn't exist
- Expected: Build marked "failed"

#### Test Case 5: Worktree Exists, No Branch
- Create worktree directory but no git branch
- Tier 1 should catch: branch verification fails
- Expected: Build marked "failed"

### Migration Path

1. **Phase 1**: Add validation function, log results but don't enforce
   - Gather data on false positive rate
   - Tune validation thresholds

2. **Phase 2**: Enable enforcement in test environments
   - Monitor for unexpected failures
   - Adjust tier 2/3 rules as needed

3. **Phase 3**: Roll out to production
   - Full enforcement
   - Document any edge cases

### Alternative Approaches Considered

#### Alternative 1: Parse Stdout for "BUILD COMPLETE"
- **Pros**: Simple, no filesystem checks
- **Cons**: Fragile, can match test output, doesn't verify artifacts
- **Decision**: Rejected - not robust enough

#### Alternative 2: Require auto-claude to write completion marker
- **Pros**: Explicit signal from auto-claude
- **Cons**: Requires auto-claude changes, doesn't validate quality
- **Decision**: Rejected - want orchestrator-side validation

#### Alternative 3: Only check commit count
- **Pros**: Simplest, catches most false positives
- **Cons**: Doesn't catch partial completion
- **Decision**: Not sufficient - need phase validation too

## Recommendation

Implement the **Multi-Tier Validation** approach:
- **Tier 1 (Critical)**: Block on missing work artifacts
- **Tier 2 (Recommended)**: Block on incomplete phases
- **Tier 3 (Optional)**: Log QA status for visibility

This provides defense-in-depth against false positives while maintaining flexibility for edge cases.

## Implementation Checklist

- [ ] Add `validate_build_completion()` function
- [ ] Integrate validation into `run_build()` after exit-0 path
- [ ] Add validation logging to build logs
- [ ] Update status file schema to include `validation_failed` flag
- [ ] Test with mock scenarios (no-op, partial, success)
- [ ] Document validation tiers in orchestrator comments
- [ ] Consider adding `--skip-validation` flag for debugging

## Related Issues

- #134: Auto-claude --force flag (now merged)
- Issue tracking for validation logging enhancements

---
**Analysis Date**: 2026-01-04
**Author**: Claude (Sonnet 4.5)
**Status**: Proposal - Awaiting Implementation Decision
