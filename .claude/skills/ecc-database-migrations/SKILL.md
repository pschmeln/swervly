---
name: "ecc-database-migrations"
description: "Safe Postgres/Drizzle migration patterns: use when writing a schema or data migration, adding or dropping a column or index, planning a rollback, or applying a destructive migration."
---

# Database Migration Patterns

Adapted from the `database-migrations` skill in ECC (github.com/affaan-m/ECC, commit 4adeee6). Copyright (c) 2026 Affaan Mustafa, MIT License. Trimmed to PostgreSQL and Drizzle (the Prisma, Kysely, Django and golang-migrate sections were removed).

## When to Activate

- Creating or altering tables
- Adding/removing columns or indexes
- Running data migrations (backfill, transform)
- Planning zero-downtime schema changes
- Applying any destructive migration (DROP COLUMN/TABLE)

## Core Principles

1. **Every change is a migration**: never alter production databases manually.
2. **Forward-only in production**: rollbacks are new forward migrations.
3. **Schema and data migrations are separate**: never mix DDL and DML in one migration.
4. **Test against production-sized data**: what works on 100 rows may lock on 10M.
5. **Immutable once deployed**: never edit a migration that has run in production.

## Safety Checklist (before applying any migration)

- [ ] Has both UP and DOWN, or is explicitly marked irreversible
- [ ] Lock modes and expected hold times reviewed; concurrent operations used where supported
- [ ] On populated tables, new columns are nullable or have defaults compatible with their constraints
- [ ] Indexes created concurrently on existing tables
- [ ] Data backfill is a separate migration from the schema change
- [ ] Tested against a copy of production data (e.g. a database branch)
- [ ] Rollback plan documented

## PostgreSQL Patterns

### Adding a Column

```sql
-- Nullable: no table rewrite, but takes an ACCESS EXCLUSIVE lock
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- PG 11+: a non-volatile default avoids a rewrite (still ACCESS EXCLUSIVE)
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- BAD on a populated table: fails with not_null_violation, no backfill
ALTER TABLE users ADD COLUMN role TEXT NOT NULL;
```

Avoiding a rewrite does not avoid locks. Keep the transaction short and set a `lock_timeout`. A volatile default such as `clock_timestamp()` forces a rewrite.

### Adding an Index

```sql
-- BAD: blocks writes on large tables
CREATE INDEX idx_users_email ON users (email);
-- GOOD: non-blocking; cannot run inside a transaction block
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
```

### Renaming a Column (expand-contract)

1. Expand: add the new column.
2. Deploy app that reads the old column and writes BOTH atomically, on every write path (jobs, imports, admin tools). Drain old-only writers.
3. Backfill in bounded primary-key ranges, each its own committed transaction, copying the row's current value in the same UPDATE:

```sql
BEGIN;
SET LOCAL lock_timeout = '2s';
UPDATE users SET display_name = username
WHERE id > 0 AND id <= 10000
  AND display_name IS DISTINCT FROM username;
COMMIT;
```

4. Validate: require zero mismatches (`SELECT count(*) FROM users WHERE display_name IS DISTINCT FROM username`) before switching reads.
5. Deploy app that reads the new column, still writing both, through the rollback window.
6. Move constraints/indexes to the new column; deploy app using only the new column.
7. Contract: drop the old column in a separate migration.

Once new-only writes start, the old column may be stale: don't roll back to old readers without a reconciliation plan.

### Removing a Column

1. Remove all application references to the column.
2. Deploy the application without them.
3. Drop the column in a later migration. Treat it as destructive: back up or branch the database first and get explicit approval.

### Large Data Migrations

Never update every row in one transaction. Batch with progress:

```sql
DO $$
DECLARE batch_size INT := 10000; rows_updated INT;
BEGIN
  LOOP
    UPDATE users SET normalized_email = LOWER(email)
    WHERE id IN (SELECT id FROM users WHERE normalized_email IS NULL
                 LIMIT batch_size FOR UPDATE SKIP LOCKED);
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    COMMIT;
  END LOOP;
END $$;
```

## Drizzle Workflow

**In the Swervly repo:** agents write the migration SQL only. Never run `drizzle-kit generate` or `drizzle-kit migrate` yourself; ask Peter or Li (AGENTS.md rule 2, docs/AGENT_SAFETY.md). Test migrations on a temporary Neon branch named `agent-<topic>` and delete it afterwards. Any destructive migration needs a human's yes.


```bash
npx drizzle-kit generate   # generate migration from schema changes
npx drizzle-kit migrate    # apply migrations
npx drizzle-kit push       # push schema directly: dev only, no migration file
```

```typescript
import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core'
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

For operations Drizzle can't express (concurrent indexes, batched backfills), write a custom SQL migration by hand.

## Zero-Downtime Strategy

```
EXPAND:   add new column/table; app reads OLD, writes BOTH; backfill in batches; verify parity
MIGRATE:  app reads NEW, writes BOTH; keep dual writes through the rollback window
CONTRACT: move constraints; app uses only NEW; drop old column in a separate migration
```

## Anti-Patterns

| Anti-pattern | Why it fails | Better |
|---|---|---|
| Manual SQL in production | No audit trail, unrepeatable | Migration files |
| Editing deployed migrations | Drift between environments | New migration |
| NOT NULL column without default on populated table | Existing rows would be NULL | Add nullable, backfill, then set NOT NULL |
| Inline index on large table | Blocks writes | CREATE INDEX CONCURRENTLY |
| Schema + data in one migration | Hard to roll back, long transactions | Separate migrations |
| Dropping column before removing code | App errors on missing column | Remove code first, drop next deploy |