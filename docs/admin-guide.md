# Admin Guide

## Audience

Project admins, completions leads, commissioning leads, and release operators.

## Responsibilities

- Maintain project setup and systemization.
- Control imports/exports.
- Review audit and signature records.
- Manage release readiness and deployment.
- Own backup, retention, and owner/client reporting.

## Project Setup

1. Create or import a project.
2. Define client, location, type, and scope.
3. Build System / Subsystem Breakdown Structure.
4. Assign discipline ownership.
5. Set priority and tags.
6. Save changes.

## Data Governance

Required practices:

- Use one project per physical asset/project scope.
- Keep system and subsystem codes stable after field work begins.
- Avoid deleting systems once punches or documents reference them.
- Export project JSON before major edits.
- Export Audit Report before owner/client review.

## Audit and Compliance

Audit events are recorded for:

- Project create/import/export.
- System and subsystem changes.
- Status changes.
- Checklist ticks.
- Punch create/edit/delete.
- Document register changes.
- Workflow changes.
- Signatures and signature revocations.

Admin review workflow:

1. Open Documents module.
2. Export Audit Report.
3. Review event sequence, actor, timestamp, action, entity, previous hash, and hash.
4. Confirm signatures are active or revoked with a reason.
5. Archive export with owner/client dossier.

## Deployment Operations

Use Cloudflare Workers.

Reference `docs/deployment.md` for:

- Environment variables.
- CI.
- Staging deployment.
- Production deployment.
- Rollback.
- Monitoring.

## Backup

Current local-first backup:

1. Export project JSON before major work.
2. Store export in the project document repository.
3. Export owner/client deliverables after each milestone.

Future backend backup:

- Daily encrypted database backup.
- Point-in-time restore.
- Quarterly restore test.
- Legal hold for audit records.

## Access Control

Current local-first build:

- Access is controlled by browser/device access.
- Do not share devices with active project data.
- Clear browser storage before handing off devices.

Future backend build:

- SSO/OIDC.
- Project RBAC.
- Tenant isolation.
- Row Level Security.
- SCIM provisioning.

## Release Checklist

- CI green.
- Staging smoke test complete.
- Desktop QA complete.
- Mobile QA complete.
- Export performance checked.
- Audit report export verified.
- Rollback path confirmed.
