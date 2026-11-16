# Swervly

Co-op records for University of Cincinnati students.

## Contributing

Branch off `main`, open a pull request, wait for the **Check / check** workflow to pass, get a review, and squash merge. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Error reporting

Server errors, browser errors, Clerk auth and sign-in failures, API route 5xx responses, and the logged failure codes `clerk_auth_failed`, `sign_in_failed`, `api_error`, `clerk_delete_failed`, and `account_rows_delete_failed` are sent to [Sentry](https://sentry.io) when a DSN is set. With the DSN unset, the SDK does nothing and `next build` still succeeds.

Set these in Vercel for **Production** and **Preview**. The DSN is public (it can only submit events). `SENTRY_AUTH_TOKEN` is a secret.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | To turn reporting on | DSN for the browser. Server and edge use it when `SENTRY_DSN` is unset |
| `SENTRY_DSN` | No | Server and edge DSN, when it should differ from the public one |
| `SENTRY_ENVIRONMENT` | No | Server environment name. Defaults to `VERCEL_ENV`, then `NODE_ENV` |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | No | Browser environment name. Defaults to the build's `VERCEL_ENV`, then `NODE_ENV` |
| `SENTRY_AUTH_TOKEN` | No | Uploads source maps during `next build`. The build does not fail when this is unset |
| `SENTRY_ORG` | With the auth token | Sentry organization slug |
| `SENTRY_PROJECT` | With the auth token | Sentry project slug |

Source maps upload only when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are all set. Session replay and tracing are off. Events may include the internal `users.id`. They do not include email, cookies, request bodies, IP addresses, or Clerk secret keys.

### One-time Sentry setup

1. Create a Sentry organization and a project. Choose the Next.js platform. The Developer (free) plan is enough.
2. Copy the project's DSN into `NEXT_PUBLIC_SENTRY_DSN`.
3. Optional, for readable stack traces: create an auth token with `project:releases` and `org:read`, then set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT`. Leave all three unset until the project exists.
4. Create an alert for new issues, and one on the tag `failure_code` matching `clerk_auth_failed` or `sign_in_failed`. The SDK sends events only. It does not email anyone until an alert exists.
