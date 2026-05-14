# Deployment Runbook

## Target Hosting Path

Use Cloudflare Workers for the current production path.

Why:

- The repository already includes `wrangler.jsonc`, `src/server.ts`, and the Cloudflare Vite plugin.
- The app is TanStack Start SSR-ready and currently local-first, so Workers keeps hosting simple while backend storage is still being designed.
- Supabase plus Vercel/Cloudflare should wait until auth, RLS, project tenancy, and server-backed persistence are implemented.

## Environments

Local:

- `.env` copied from `.env.example`
- `APP_ENV=local`
- Local persisted data remains in browser storage.

Staging:

- Cloudflare Worker env: `staging`
- Worker name: `ccpro-staging`
- Purpose: client/user acceptance, migration rehearsal, export verification.

Production:

- Cloudflare Worker env: `production`
- Worker name: `ccpro-production`
- Purpose: owner/client-facing release.

Cloudflare secrets required in GitHub:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

GitHub environment variables:

- `STAGING_URL`
- `PRODUCTION_URL`

Runtime variables live in `wrangler.jsonc`. Secret provider keys such as `SENTRY_DSN` must be configured with `wrangler secret put` or GitHub environment secrets, never committed.

## CI

Every pull request and push to `main` runs:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

Current `npm test` aliases to `typecheck` until unit/e2e coverage is added. Replace it with Vitest/Playwright once test files are introduced.

## Staging Deployment

Automatic:

- Push to `develop`.

Manual:

- Run the `Deploy Staging` GitHub Action.

Local operator command:

```bash
npm run deploy:staging
```

Staging acceptance checklist:

- Open portfolio, project dashboard, and all modules.
- Create/edit a system, subsystem, punch, preservation date, and document register entry.
- Export System Register, Punch Register, MC Dossier, Handover Dossier, Preservation Log, and Audit Report.
- Verify browser console has no runtime errors.
- Tail Worker logs with `npm run tail:staging`.

## Production Deployment

Automatic:

- Push a semver tag such as `v1.0.0`.

Manual:

- Run the `Deploy Production` GitHub Action.

Local operator command:

```bash
npm run deploy:production
```

Production release checklist:

- CI green on the tagged commit.
- Staging acceptance completed.
- Known migration notes documented.
- Rollback target identified.
- Monitoring dashboard open during and after release.

## Rollback

Preferred Cloudflare rollback:

1. Open Cloudflare dashboard.
2. Go to Workers & Pages -> `ccpro-production`.
3. Open Deployments.
4. Select the last known-good deployment.
5. Roll back.
6. Tail logs and confirm the app loads.

Git rollback:

1. Revert the problematic commit or retag the last known-good commit.
2. Run `Deploy Production`.
3. Confirm exports and local persistence still work.

For local-first data changes, do not ship schema downgrades unless a migration plan exists. Older browser storage may contain newer schema versions.

## Error Monitoring

Short term:

- Cloudflare Workers Observability is enabled in `wrangler.jsonc`.
- Use `npm run tail:staging` and `npm run tail:production` during releases.
- Keep client-side error capture centralized in `src/lib/error-capture.ts`.

Production-grade next step:

- Add Sentry or PostHog.
- Store DSNs/API keys as Cloudflare secrets.
- Include release name, environment, route, project id, and app version in captured events.
- Alert on SSR exceptions, client runtime errors, export failures, and elevated 5xx responses.

## Backend Expansion Decision

Stay on Cloudflare Workers while the app remains local-first.

Move to Supabase plus Cloudflare/Vercel only when these backend features are ready:

- Auth and SSO.
- Tenant and project RBAC.
- Row Level Security.
- Server-side immutable audit storage.
- File/object storage for evidence and dossiers.
- Background jobs for imports/exports.
