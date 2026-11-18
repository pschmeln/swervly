# Community schema and API (design only)

Status: design. This document does not add a migration, a Drizzle table, or a route. The screen at `/direction/explore` keeps questions, answers, helpful marks, and reports in component state and tells the reader that nothing was sent.

Phase 2's major catalog and migration `0004` are not part of this design. Do not build community rows on that catalog.

## What exists today

`src/db/schema.ts` already has `users`, `employers`, `rotations`, and `reviews`. Reviews can be included in anonymous company pages only with `users.share_reviews_consent_at` and `reviews.share_free_text`. That consent is for co-op reviews. It is not consent to post a community question or a narrative experience. A future community feature needs its own consent columns. It must not treat a review row as a public post.

Founder checks already go through `isFounderEmail` (`FOUNDER_EMAILS`). Reuse that. Do not add a second founder list.

## Goals

- Students can ask questions and write answers about a role label or an employer.
- A narrative experience is public only when that row's sharing consent is on.
- Unapproved questions stay private to the author and to founders.
- A moderation decision succeeds only when the row actually changed, and a repeated request with the same idempotency key returns the original result.
- Free text, names, and emails stay out of logs, Sentry, and PostHog.

## Non-goals

- No job openings, no fit scores, and no scraper.
- No change to `users.major`.
- No public alias list that turns a student's typed major into a catalog entry.
- No model calls.

## Proposed tables

Names below are proposals for a later migration. They are not created by this branch.

### `community_questions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | App-generated `crypto.randomUUID()` so a batch can refer to it |
| `author_user_id` | uuid not null | References `users.id`. Taken from `apiOnboardedUser()`, never from the body |
| `scope_kind` | text not null | `role` or `company` |
| `role_label` | text null | Plain label such as `Clinical operations`. Not a Phase 2 major id |
| `employer_id` | uuid null | Optional future reference to an **approved** `employers.id`. Null for role questions |
| `title` | text not null | Length cap in zod (140) |
| `body` | text not null | Length cap in zod (800) |
| `status` | text not null | `pending`, `visible`, `hidden`, `removed`. Default `pending` |
| `status_version` | integer not null | Starts at 1. Increments on every successful transition |
| `created_at`, `updated_at` | timestamptz | |

Check: `scope_kind = 'role'` implies `role_label` is not null, and `scope_kind = 'company'` implies `employer_id` is not null. Status check lists the four values. `removed` is terminal.

Indexes:

- `(status, created_at desc)` for the public list, partial `WHERE status = 'visible'`
- `(author_user_id, created_at desc)` so a student can see their own pending rows
- `(role_label)` partial `WHERE status = 'visible' AND scope_kind = 'role'`
- `(employer_id)` partial `WHERE status = 'visible' AND scope_kind = 'company'`

### `community_answers`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `question_id` | uuid not null | References `community_questions.id` |
| `author_user_id` | uuid not null | |
| `body` | text not null | |
| `status` | text not null | Same four statuses. Default `pending` |
| `status_version` | integer not null | |
| `created_at`, `updated_at` | timestamptz | |

Index: `(question_id, created_at)` partial `WHERE status = 'visible'`. Public reads of a question join answers only in `visible`. The author can read their own `pending` answers. A `pending` question has no public answers even if an answer were `visible`.

### `community_reactions`

Helpful marks. One row per person per target.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `user_id` | uuid not null | |
| `target_kind` | text not null | `question` or `answer` |
| `target_id` | uuid not null | |
| `created_at` | timestamptz | |

Unique `(user_id, target_kind, target_id)`. Public pages show a count, not the list of user ids. The toggle deletes the row or inserts it. A unique violation on a double insert returns the existing row and HTTP 200 for that user. That is an idempotent reaction, not a moderation decision.

### `community_reports`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `reporter_user_id` | uuid not null | Stored for abuse handling. Never rendered and never logged |
| `target_kind` | text not null | `question`, `answer`, or `experience` |
| `target_id` | uuid not null | |
| `reason` | text not null | Closed set: `not_experience`, `private`, `unsafe` |
| `created_at` | timestamptz | |

Unique `(reporter_user_id, target_kind, target_id)` so one person cannot inflate a count. Founder queue shows the target, the reason, and the count of distinct reporters. It does not show reporter names or emails. There is no public report count.

### `community_experiences`

Separate from `reviews`. A co-op review staying in the anonymous company aggregate is not permission to show this narrative.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `author_user_id` | uuid not null | |
| `employer_id` | uuid not null | Approved employer, once that link is allowed |
| `role_label` | text not null | Plain label |
| `body` | text not null | |
| `sharing_consent` | boolean not null | Default `false` |
| `consent_version` | integer null | Version of the consent text the student saw |
| `consented_at` | timestamptz null | |
| `consent_withdrawn_at` | timestamptz null | Set when the student turns sharing off. Public queries treat this as not shared |
| `status` | text not null | `visible`, `hidden`, `removed`. Default `visible` only after consent is true; otherwise the row stays unlisted |
| `status_version` | integer not null | |
| `created_at`, `updated_at` | timestamptz | |

Public predicate, all of it, in every list query:

```sql
sharing_consent = true
AND consent_withdrawn_at IS NULL
AND status = 'visible'
```

Missing any part of that predicate is a bug. A query must not count withheld rows in a "hidden notes" hint. The card says none yet.

Index: `(employer_id)` partial on the public predicate.

### `community_commands`

Idempotency log for moderation and for other state changes.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `actor_user_id` | uuid not null | |
| `idempotency_key` | text not null | Client-generated uuid, required header |
| `request_hash` | text not null | Hash of the canonical action body |
| `response_status` | integer not null | |
| `response_body` | jsonb not null | No email, no free text beyond ids and statuses |
| `created_at` | timestamptz | |

Unique `(actor_user_id, idempotency_key)`.

### `community_rate_buckets`

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | uuid not null | |
| `action` | text not null | `question`, `answer`, `report`, `helpful` |
| `window_start` | timestamptz not null | Start of the hour |
| `count` | integer not null | |

Primary key `(user_id, action, window_start)`.

Proposed caps per user per hour: questions 5, answers 20, reports 10, helpful toggles 60. Increment with `UPDATE ... SET count = count + 1 WHERE count < $cap`. If that updates 0 rows, return 429. Do not perform the write the user asked for. A failed increment is not a success.

## State machine

```text
pending  -> visible   founder
pending  -> removed   author or founder
visible  -> pending   author edited the text (drops off the public list)
visible  -> hidden    founder
visible  -> removed   author or founder
hidden   -> visible   founder
hidden   -> removed   founder
removed  -> (terminal)
```

Experiences use `visible`, `hidden`, and `removed` only. Turning consent off sets `consent_withdrawn_at` and does not need a status change to disappear, but the public predicate still requires both.

Author edit of a `visible` question is one conditional transition to `pending` in the same statement that updates `title` and `body`. The public copy disappears until a founder moves it to `visible` again. The author can still read the pending row.

## Conditional updates and idempotency

The bug to design out: a moderation call returns success when the row did not change, or two callers both think they won.

The Neon HTTP driver has no interactive transaction. Ship the claim and the update as **one SQL statement**. Sketch, not a migration:

```sql
WITH claim AS (
  INSERT INTO community_commands (
    id, actor_user_id, idempotency_key, request_hash, response_status, response_body
  )
  VALUES ($command_id, $actor, $key, $hash, 0, '{}'::jsonb)
  ON CONFLICT (actor_user_id, idempotency_key) DO NOTHING
  RETURNING id
),
updated AS (
  UPDATE community_questions
  SET status = $to_status,
      status_version = status_version + 1,
      updated_at = now()
  WHERE EXISTS (SELECT 1 FROM claim)
    AND id = $question_id
    AND status = $expected_status
    AND status_version = $expected_version
    AND status <> 'removed'
  RETURNING id, status, status_version
),
saved AS (
  UPDATE community_commands
  SET response_status = CASE WHEN EXISTS (SELECT 1 FROM updated) THEN 200 ELSE 409 END,
      response_body = jsonb_build_object(
        'status', COALESCE((SELECT status FROM updated), $expected_status),
        'status_version', (SELECT status_version FROM updated)
      )
  WHERE id IN (SELECT id FROM claim)
  RETURNING response_status, response_body
)
SELECT * FROM saved;
```

Rules for the route:

- If the statement returns a row with `response_status` 200, the update changed one row. Return 200 and the new version.
- If it returns 409, the version or status the client sent was stale, or the row was already `removed`. Return 409 `conflict`. The command row stores 409, so a replay of that same key stays 409. It must not be rewritten into a success later.
- If the statement returns no row, the idempotency key already existed. Load that command. Same `request_hash`: return the stored status and body. Different hash: return 409 `idempotency_mismatch` and do not apply the action.
- Do not catch a zero-row update and return 200. A no-op is not a decision.
- The client sends `expected_status` and `expected_version` from the row it displayed. After 409 it refetches. It does not retry with a new key until the person chooses again.

Answers and experiences use the same statement shape against their own tables.

## API routes (not implemented)

All of these would use `handle()`, a zod body, and `apiOnboardedUser()`. Founder routes also require `isFounderEmail` and return 403 for everyone else. The existing founder page uses `notFound()` so the page is undiscoverable. The API should 403 so a client can tell a refused action from a missing route, without including the queue in the error body.

| Method and path | Who | Effect |
| --- | --- | --- |
| `GET /api/community/questions` | Onboarded student | `status = visible` only, filtered by role label or employer id |
| `GET /api/community/questions/:id` | Author, or any student if `visible` | Pending, hidden, and removed return 404 to everyone except the author and founders |
| `POST /api/community/questions` | Onboarded student | Inserts `pending`. Rate bucket `question` |
| `PATCH /api/community/questions/:id` | Author | Conditional. A visible row moves to `pending` |
| `DELETE /api/community/questions/:id` | Author | Conditional transition to `removed` |
| `POST /api/community/questions/:id/answers` | Onboarded student | Inserts `pending` if the question is visible or the caller is the question author |
| `POST /api/community/helpful` | Onboarded student | Toggle. Target must be `visible` |
| `POST /api/community/reports` | Onboarded student | Insert, ignore duplicate for the same reporter and target |
| `GET /api/community/moderation` | Founder | Queue of reports and pending rows. No reporter emails |
| `POST /api/community/moderation` | Founder | The conditional statement above. Header `Idempotency-Key` |

Zod rejects unknown fields. Employer ids in the body are checked with a query for `employers.status = 'approved'`. A pending employer is 404. The user id is never accepted from the client.

Cross-user rule: a student who is not the author gets 404 on pending, hidden, and removed rows, and the handler's update includes `author_user_id = current user` for author actions. A test in the style of `tests/review/cross-user-authorization.test.ts` should prove user B cannot edit, delete, or read user A's pending question.

## Privacy of unapproved content

- Public SELECTs include `status = 'visible'` for questions and answers.
- Experience SELECTs include the full consent predicate above. Withdrawing consent is enough to stop a row appearing. There is no batch job required for that.
- Founder responses include target text because founders need it to review. They do not include the author's email. Logs use `users.id` only.
- Report reasons are an enum. The reporter does not get a free-text field in v1, so a report cannot smuggle a private story into the queue.
- The prototype's withheld sample note is the behavior to keep: the fixture contains a consent-off experience, and the screen never renders it and never says that a hidden note exists.

## Abuse

- Rate buckets return 429 before the insert.
- Duplicate reports do not raise a public number.
- Founders hide or remove through the state machine. v1 does not auto-ban.
- A student can remove their own question. They cannot remove someone else's.
- Nothing in this design sends email.

## Rollout

1. This branch: prototype route and these docs. No schema change.
2. A human approves the table list. An agent writes a new forward-only migration. The human runs it on a Neon copy first, then on the real branch. `users.major` is not in the migration.
3. Read API for `visible` rows only, still behind the onboarded gate. Writes stay off.
4. Writes with zod, ownership filters, rate buckets, and the conditional moderation statement. Tests must include a stale `status_version` that returns 409 and changes nothing, and a replayed idempotency key that does not apply twice.
5. When that API is in production, delete the mock module and stop the explore route from importing it. Until that delete, production Direction stays on `/direction` and does not import the mock.

## What the prototype does instead

`/direction/explore` loads the signed-in student's direction, then renders sample questions from `src/features/community/mock/data.ts`. Ask, answer, helpful, report, and the demonstration founder actions call pure functions in `src/features/explore/local-state.ts`. Those functions return notices such as "Only on this screen. Nothing was sent." They do not call `fetch`. Turning `CAREER_EXPLORE_PROTOTYPE_ENABLED` off makes the route render "This prototype is turned off."
