---
name: managing-d1-migrations
description: |
  Manage Cloudflare D1 database schema changes and migrations.
  Use when modifying the data model, creating tables, planning schema updates, or handling SQL errors.
  Triggers: "add column", "change schema", "migration", "database update", "sql error".
allowed-tools: Read, Bash, Glob, WebSearch
---

# D1 Migration Manager

> Enforces safe, zero-downtime schema evolution for Cloudflare D1 (SQLite).

## 1. Context Injection (MANDATORY)
**Before** proposing any SQL or migration strategy, you MUST read the relevant constraints.

*   **IF performing a Schema Change:**
    *   `Read("reference/expand-contract-pattern.md")` (Prevents downtime).
*   **IF writing SQL Queries/Batching:**
    *   `Read("reference/d1-limitations.md")` (Prevents transaction errors).
*   **IF creating a new Migration File:**
    *   `Read("scripts/create_migration.sh")` (Ensures naming convention).

## 2. Validation Protocol (The "Latest-Limits" Rule)
D1 capabilities evolve rapidly (e.g., transaction support, storage limits, time travel).

**Triggers for WebSearch:**
*   **Transaction Logic:** If you plan to use `BEGIN TRANSACTION`, check `site:developers.cloudflare.com D1 transactions` to see if full ACID is supported in the current worker runtime or if `batch()` is still required.
*   **Size Limits:** If designing for large datasets, verify current D1 size limits per database.
*   **New Syntax:** If using `RETURNING` clauses or complex joins, verify SQLite version compatibility in D1.

## 3. Core Architecture Laws (Timeless)
These constraints are physical properties of the distributed edge database system.

### A. The Expand-Contract Pattern
**CRITICAL:** D1 does not support "Stop-the-World" migrations. Breaking changes (renames, drops) MUST happen in phases:
1.  **Expand:** Add new nullable columns/tables. Deploy code that writes to BOTH old and new.
2.  **Migrate:** Backfill data. Deploy code that reads from NEW.
3.  **Contract:** Drop old columns/tables only after step 2 is verified.

### B. Distributed Consistency
*   **Law:** Writes always go to the primary. Reads may hit replicas.
*   **Law:** Use "Time Travel" bookmarks if you need to guarantee a read follows a write immediately (read-your-writes).

### C. Migration Integrity
*   **Law:** Migrations are immutable once applied. Never edit an applied `.sql` file.
*   **Law:** Always create a backup (or bookmark) before applying remote migrations.

## 4. Operational Guardrails
**ALWAYS:**
*   Use `wrangler d1 migrations create` to generate files.
*   Use local testing (`--local`) before remote application.
*   Use textual IDs (`TEXT`) like CUID/UUID for primary keys instead of `AUTOINCREMENT` to avoid distributed conflicts.

**NEVER:**
*   Suggest using `pg` or `mysql` drivers. D1 is strictly SQLite over HTTP.
*   Leave a migration in a "half-applied" state; D1 migrations are atomic per file.
