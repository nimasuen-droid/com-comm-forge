# Release Readiness

## Scope

This checklist is the release gate for Completions & Commissioning Pro before staging or production deployment.

The current app is local-first and Cloudflare-hosted. Full multi-browser and real-device testing must be run on physical or hosted browser/device labs before production sign-off.

## Target Hosting

Primary release path: Cloudflare Workers.

Reference:

- Deployment runbook: `docs/deployment.md`
- Worker environments: `wrangler.jsonc`
- CI workflows: `.github/workflows/`

## Desktop QA Matrix

Run each browser at desktop widths 1440x900 and 1920x1080.

| Browser               | Platform      | Required Before Production | Status              |
| --------------------- | ------------- | -------------------------- | ------------------- |
| Chrome latest         | Windows/macOS | Yes                        | Pending external QA |
| Microsoft Edge latest | Windows       | Yes                        | Pending external QA |
| Safari latest         | macOS         | Yes                        | Pending external QA |
| Firefox latest        | Windows/macOS | Yes                        | Pending external QA |

Desktop smoke flow:

1. Open portfolio dashboard.
2. Open Marathon Refinery demo project.
3. Visit Systems, Preservation, Punch, MC, Commissioning, Turnover, Documents, and Workflow.
4. Edit a subsystem RAG status and save.
5. Toggle one MC checklist item and save.
6. Raise a Cat A punch, update status, and save.
7. Add a document register item and save.
8. Export System Register, Punch Register, MC Dossier, Handover Dossier, Preservation Log, Visual Status Report, and Audit Report.
9. Refresh the browser and confirm persisted data remains.
10. Confirm no console errors and no unreadable controls.

## Mobile QA Matrix

Run at portrait and landscape orientations.

| Device/Browser                | Required Before Production | Status                 |
| ----------------------------- | -------------------------- | ---------------------- |
| iPhone, iOS Safari latest     | Yes                        | Pending real-device QA |
| iPad, iPadOS Safari latest    | Recommended                | Pending real-device QA |
| Android phone, Chrome latest  | Yes                        | Pending real-device QA |
| Android tablet, Chrome latest | Recommended                | Pending real-device QA |

Mobile smoke flow:

1. Install/open as PWA where supported.
2. Navigate with the top menu and project module rail.
3. Validate that all page headers, cards, tables, buttons, and dropdowns are readable.
4. Raise a punch using the mobile form.
5. Use field queue and overdue punch filters.
6. Edit preservation interval and last-done date.
7. Scroll large tables horizontally and vertically.
8. Save changes, close the tab, reopen, and confirm persistence.
9. Confirm offline banner/status behavior.

## Offline Mode

Required scenarios:

1. Load app online, then disable network.
2. Navigate between already-loaded modules.
3. Edit punch status and checklist ticks.
4. Confirm save bar works locally and project `syncStatus` changes to pending.
5. Re-enable network.
6. Confirm data remains intact after refresh.

Pass criteria:

- No data loss.
- User can continue local field work.
- Pending sync state is visible where implemented.
- Export still works for local data.

## Failed Sync

Current app is local-first and does not yet sync to a backend. Simulate failed sync as a pending local state.

Required scenarios for the future backend release:

1. API returns 401/403.
2. API returns 409 conflict.
3. API returns 500.
4. Network request times out.
5. User keeps editing while sync remains failed.

Pass criteria:

- Local edits are preserved.
- Failed sync is visible.
- Retry does not duplicate records.
- Conflict resolution shows both local and remote values.

## Duplicate Edits

Current app has single-user local persistence. Treat duplicate edits as repeated local changes until server collaboration exists.

Required scenarios:

1. Open the same project in two tabs.
2. Edit the same punch status in both tabs.
3. Save tab A, then save tab B.
4. Refresh both tabs.

Current expected result:

- Last local save wins.
- Audit log records each mutation made through the store.

Future backend pass criteria:

- Detect conflict.
- Show actor, timestamp, before/after values.
- Let authorized user resolve.
- Preserve both audit events.

## Large Project Data

Minimum production performance seed:

- 100 systems.
- 1,000 subsystems.
- 5,000 punches.
- 2,000 documents.
- Full MC, commissioning, turnover checklist coverage.

Acceptance targets on a modern laptop:

- Initial route load under 3 seconds after assets are cached.
- Module navigation under 1 second.
- Filter/search response under 300 ms for common views.
- Excel export under 15 seconds for registers and under 30 seconds for large dossiers.
- No browser tab crash or unresponsive script warning.

## Export Performance

Required export cases:

| Export           |    Demo Project |    Large Project |
| ---------------- | --------------: | ---------------: |
| System Register  | Under 3 seconds | Under 15 seconds |
| Punch Register   | Under 3 seconds | Under 15 seconds |
| MC Dossier       | Under 5 seconds | Under 30 seconds |
| Handover Dossier | Under 5 seconds | Under 30 seconds |
| Preservation Log | Under 3 seconds | Under 15 seconds |
| Audit Report     | Under 3 seconds | Under 15 seconds |
| Visual PDF       | Under 5 seconds | Under 30 seconds |

Pass criteria:

- File downloads successfully.
- Workbook sheets open in Excel.
- No corrupted dates, missing rows, or unreadable characters.
- Export event is recorded in audit log where applicable.

## Release Sign-off

Before production:

- CI green.
- Staging deployment green.
- Desktop QA complete.
- Mobile QA complete.
- Offline and failed-sync scenarios documented.
- Export performance captured.
- Rollback target confirmed.
- Error monitoring dashboard checked.
