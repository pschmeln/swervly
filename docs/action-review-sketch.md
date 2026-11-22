# Action → Review (sketch)

Future work. Nothing here is built, and it does not need a migration or a new API for a first version.

## What the student is doing

Action is a private list of steps toward one career goal. Review is a private log of a co-op or internship the student has already done. Finishing steps is not career readiness, and it is not a review. The handoff is: when a student has actually done a co-op, they log it in Review, with the Action goal as context only.

## Entry points

1. The Reflect step the template already suggests: “After your next co-op, log what you actually did.” On that row, a secondary link **Log a co-op review** goes to `/reviews/new`.
2. After that step is marked done, the same link stays available. Marking it done does not create a review.
3. The existing Reviews item in the main nav, and Home’s review button, stay as they are.
4. No automatic redirect when every step is done.

## What carries over

Shown on the review form as read-only context, not written into the review unless the student types it:

- The active plan’s goal title (for example, Software Developers).
- A short line that this is the direction they have been working toward.

Not carried over:

- Skill ratings. Comfortable, Developing, and Not yet assessed are self-reports, not evidence for a review.
- Task titles, explanations, or how many steps are done. Those must not be pasted into the review’s free text.
- Weekly hours, horizon, or “steps finished this week.”

The review still asks what the existing form asks: employer, term, role, and the student’s own answers. Role type stays the student’s choice. The goal title can sit in a banner; it does not pick the role for them.

## Screens

1. **Action, Reflect row.** Link **Log a co-op review**. Helper: “This records a co-op you already did. Finished steps are not a measure of career readiness.”
2. **Review form** (`/reviews/new`). One line at the top when the student came from Action: “You’re logging a co-op. Your Action goal is Software Developers. That is context, not a score.” The rest of the form is unchanged.
3. **After save.** The existing review confirmation. A text link back to Action. The Reflect step is not auto-marked done.
4. **No goal.** If there is no active plan, the link is hidden. Reviews works exactly as it does today.

## Copy principles

- A finished step list is not readiness, hiring, or a grade.
- Do not say the student is prepared, qualified, or a fit because tasks are done.
- Do not treat a missing skill rating as a lack.
- The student writes the review. Suggested task text stays on Action.

## APIs

Enough for a first version, all existing:

- `GET /api/action/plan` (or the server equivalent) to read the active goal title for the banner. Already on PR #50. Not required if the Action page only links to `/reviews/new` with no banner.
- `POST /api/rotations` to save the review, unchanged.
- `/reviews` and `/reviews/new`, unchanged.

Future, and not part of this MVP. Each item needs its own design and a backend change:

- A query such as `?from=action` is only a hint for the banner. It must not trust a client-supplied goal title. The server reads the caller’s active plan.
- Remembering which review came from which plan would need a new nullable column and API field. Do not add it until a human asks.
- Do not add an endpoint that marks an Action task done because a review was saved.
