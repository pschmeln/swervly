---
name: "ecc-security-review"
description: "Security checklist for web app code: use when adding auth or authorization, API endpoints, user input handling, secrets, sensitive data, or third-party APIs, and before deploys."
---

# Security Review

Adapted from the `security-review` skill in ECC (github.com/affaan-m/ECC, commit 4adeee6). Copyright (c) 2026 Affaan Mustafa, MIT License. Trimmed to web-app sections (the Solana and Supabase-specific parts were removed).

## When to Activate

- Implementing authentication or authorization (including role-based access such as advisor or founder roles)
- Handling user input or file uploads (e.g. CSV roster uploads)
- Creating new API endpoints or server actions
- Working with secrets or credentials
- Storing or transmitting sensitive data (student data, pay, consent records)
- Integrating third-party APIs

## 1. Secrets Management

Never hardcode secrets. Read them from environment variables and fail loudly if missing:

```typescript
const dbUrl = process.env.DATABASE_URL
if (!dbUrl) throw new Error('DATABASE_URL not configured')
```

- [ ] No hardcoded API keys, tokens, or passwords
- [ ] All secrets in environment variables; `.env.local` in .gitignore
- [ ] No secrets in git history
- [ ] Production secrets in the hosting platform (e.g. Vercel)

## 2. Input Validation

Validate all input with a schema before use:

```typescript
import { z } from 'zod'
const Schema = z.object({ email: z.string().email(), name: z.string().min(1).max(100) })
export async function handler(input: unknown) {
  const parsed = Schema.safeParse(input)
  if (!parsed.success) return { success: false, errors: parsed.error.issues }
  // ...use parsed.data
}
```

File uploads: restrict size, MIME type, and extension (allowlist, not blocklist).

- [ ] All user inputs validated with schemas
- [ ] File uploads restricted (size, type, extension)
- [ ] No direct use of user input in queries
- [ ] Error messages don't leak sensitive info

## 3. SQL Injection Prevention

Never build SQL by string concatenation or template interpolation of user values. Use the ORM/query builder or parameterized queries (Postgres numbers its placeholders; pass values in the params array, never in the string).

- [ ] All queries parameterized or built by the ORM
- [ ] No string concatenation in SQL

## 4. Authentication & Authorization

- Session tokens in httpOnly, Secure, SameSite cookies, never localStorage.
- Check authorization on the server before every sensitive read or write. Hiding UI is not authorization.

```typescript
export async function deleteUser(userId: string, requesterId: string) {
  const requester = await getUser(requesterId)
  if (requester.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await removeUser(userId)
}
```

- [ ] Authorization checks before sensitive operations, on the server
- [ ] Role-based access control implemented and tested (allowed role, wrong role, other tenant/school, revoked access)
- [ ] Session management secure

## 5. XSS Prevention

- Rely on React's escaping; sanitize any user HTML (e.g. DOMPurify) before `dangerouslySetInnerHTML`.
- Configure a strict Content-Security-Policy. Do not default to `'unsafe-inline'` or `'unsafe-eval'`; treat them as temporary debt with a removal plan.

- [ ] User-provided HTML sanitized
- [ ] CSP headers configured

## 6. CSRF Protection

- [ ] CSRF protection on state-changing operations (framework protection or tokens)
- [ ] SameSite cookies

## 7. Rate Limiting

- [ ] Rate limits on API endpoints, stricter on expensive operations (search, AI calls)
- [ ] Per-IP and per-user limits

## 8. Sensitive Data Exposure

```typescript
// WRONG: console.log('login', { email, password })
// RIGHT: console.log('login', { userId })
catch (error) {
  console.error('Internal error:', error)
  return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 })
}
```

- [ ] No passwords, tokens, or secrets in logs
- [ ] Generic error messages for users; details only in server logs
- [ ] No stack traces exposed

## 9. Dependency Security

- [ ] `npm audit` clean or triaged
- [ ] Lock files committed; `npm ci` in CI
- [ ] Dependabot or equivalent enabled

## Security Tests

```typescript
test('requires authentication', async () => {
  expect((await fetch('/api/protected')).status).toBe(401)
})
test('requires the right role', async () => {
  const res = await fetch('/api/admin', { headers: { Authorization: `Bearer ${userToken}` } })
  expect(res.status).toBe(403)
})
test('rejects invalid input', async () => {
  const res = await fetch('/api/users', { method: 'POST', body: JSON.stringify({ email: 'x' }) })
  expect(res.status).toBe(400)
})
```

## Pre-Deployment Checklist

- [ ] Secrets: none hardcoded, all in env vars
- [ ] Input validation on all inputs
- [ ] Queries parameterized
- [ ] User content sanitized
- [ ] CSRF protection enabled
- [ ] Proper token handling
- [ ] Server-side role checks in place
- [ ] Rate limiting enabled
- [ ] HTTPS enforced; security headers (CSP, X-Frame-Options)
- [ ] No sensitive data in errors or logs
- [ ] Dependencies up to date
- [ ] CORS properly configured
- [ ] File uploads validated

Resources: OWASP Top 10 (owasp.org/www-project-top-ten), Next.js security docs (nextjs.org/docs/security), PortSwigger Web Security Academy.