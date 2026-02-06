# Expand-Contract Pattern for D1

Since D1 represents a distributed database, "Stop-the-World" migrations are not possible. You must use the Expand-Contract pattern for all breaking changes (e.g., renaming columns).

## Phase 1: Expand (Additive) [8]
*   **Action:** Add the new column/table.
*   **Constraint:** New columns must be `NULLABLE` or have a `DEFAULT` value.
*   **Code Change:** Deploy application code that writes to **BOTH** the old and new columns (Dual Writes).
*   **Read:** Application continues to read from the old column.

## Phase 2: Migrate (Backfill) [9]
*   **Action:** Run a background script (Worker) to copy data from the old column to the new column.
*   **Constraint:** Use batch processing (limit 100 rows per batch) to avoid CPU timeouts [6].

## Phase 3: Transition (Switch) [10]
*   **Code Change:** Deploy application code that reads from the **NEW** column.
*   **Write:** Keep writing to both (optional, for safety) or switch write to new column only.

## Phase 4: Contract (Cleanup) [10]
*   **Action:** Drop the old column/table.
*   **Wait:** Ensure Phase 3 is fully propagated and stable before executing this.