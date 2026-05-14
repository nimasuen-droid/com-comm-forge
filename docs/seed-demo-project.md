# Seed Demo Project

## Demo Project

The release demo project is seeded by `sampleProject()` in `src/lib/store.ts`.

Project:

- Name: Marathon Refinery - Unit 10 Revamp
- Client: Marathon Petroleum
- Location: Garyville, LA
- Type: Refinery Brownfield Revamp
- Scenario: Revamp of crude unit 10 with new charge pumps and upgraded ICSS.

## Demo Story

Use this storyline in sales demos, QA, and onboarding:

1. A refinery revamp is moving from construction into MC and commissioning.
2. Systemization is mostly complete, but preservation and punch closure are still active.
3. Open Cat A punches block MC/RFSU on selected subsystems.
4. Commissioning has started for ICSS and Instrument Air but is gated by incomplete MC and punch closure.
5. Turnover is only partially ready because operations acceptance and CCC are not complete.

## Seeded Systems

| System                | Purpose                                                       | Demo Point                                      |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| Instrument Air System | Plant and instrument air generation, drying, and distribution | Shows mixed MC/RFSU/commissioning readiness     |
| Crude Charge Pumps    | Main crude feed pumps to distillation column                  | Shows mechanical and piping punch blockers      |
| ICSS / DCS            | Control and safety system cabinets, marshalling, network      | Shows commissioning sequence and loop readiness |

## Seeded Punch Cases

| Punch                                   | Category | Demo Point                            |
| --------------------------------------- | -------- | ------------------------------------- |
| Missing flange gasket P-1001A discharge | A        | Blocks MC/RFSU                        |
| IA dryer outlet PT not calibrated       | B        | Shows in-progress owner/vendor action |
| Touch-up paint on K-2001B base frame    | C        | Shows non-blocking cosmetic closeout  |
| F&G loop FG-10-23 fails C&E test        | A        | Shows commissioning blocker           |

## Demo Reset

To reset the demo locally:

1. Open browser dev tools.
2. Clear local storage key `ccpro-store-v3`.
3. Refresh the app.

The seeded Marathon project will be recreated from `sampleProject()`.

## Demo Script

1. Start at Portfolio Dashboard and explain readiness KPIs.
2. Open Marathon Refinery - Unit 10 Revamp.
3. Show Systems and explain SBS foundations.
4. Open Punch and filter Cat A/Overdue.
5. Raise a new field punch.
6. Open MC and toggle/check subsystem gates.
7. Open Commissioning and show MC-gated sequence.
8. Open Turnover and show dossier readiness.
9. Open Documents and export Punch Register plus Audit Report.
10. Open Workflow and explain auto-rollup.

## Demo Data Guardrails

- Keep the seeded project small enough to load instantly.
- Use the large-project QA fixture separately for performance testing.
- Do not add customer-confidential tags or real plant data.
