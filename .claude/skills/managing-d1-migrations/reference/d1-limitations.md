# Cloudflare D1 Limitations & Workarounds

## 1. No Transactions [6]
Cloudflare Workers cannot hold open a transaction over HTTP interactions.
*   ❌ **Forbidden:** `BEGIN TRANSACTION`, `COMMIT`, `ROLLBACK` via driver.
*   ✅ **Solution:** Use `env.DB.batch()` for atomic operations comprising multiple statements.

## 2. Schema Alterations [12]
SQLite (and thus D1) has limited support for `ALTER TABLE`.
*   ❌ **Forbidden:** `ALTER TABLE table DROP COLUMN col`.
*   ✅ **Solution:** You must recreate the table:
    1. `CREATE TABLE new_table (...)`
    2. `INSERT INTO new_table SELECT ... FROM old_table`
    3. `DROP TABLE old_table`
    4. `ALTER TABLE new_table RENAME TO old_table`

## 3. Foreign Key Constraints [11]
Foreign keys are enforced. When performing batch updates or complex migrations involving relations:
*   **Required:** Use `PRAGMA defer_foreign_keys = on;` at the start of your batch to defer checking until the end of the operation.

## 4. Query Size Limits [13]
*   **Limit:** SQL statements cannot exceed 100KB.
*   **Limit:** Max 100 bound parameters per query.
*   **Implication:** Batch inserts must be chunked in application logic.
