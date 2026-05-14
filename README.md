# Completions & Commissioning Pro

> A field-execution platform for EPC **mechanical completion, commissioning, preservation, punch list and turnover** management on oil & gas, refinery, petrochemical, LNG, offshore/FPSO, pipeline, and utility projects.

---

## 1. Purpose

On industrial projects, the gap between _“construction finished”_ and _“plant producing”_ is where schedules slip and budgets blow out. Completions, MC, commissioning and turnover are usually run on disconnected spreadsheets, with no shared view of subsystem readiness, punch posture or preservation status.

**Completions & Commissioning Pro** gives the completions team **one execution surface** — built around how EPC projects actually run — so handover decisions are driven by data, not opinion.

It is **not** a training course, a generic project management tool, a document management system, or a CMMS. It complements SAP/Maximo and Primavera; it does not replace them.

---

## 2. What the app does today

The app is structured around a **System / Subsystem Breakdown Structure (SBS)** — every other module joins via `systemId` / `subsystemId`.

| Module                    | Function                                                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Systemization**         | Break the plant into systems & subsystems with discipline, priority, tags, RAG status. Foundation for everything else.                                               |
| **Preservation**          | Track equipment lay-up, intervals, last-done dates, overdue alerts.                                                                                                  |
| **Punch List**            | Cat A / B / C punches by discipline, system, responsibility. A-punches block MC.                                                                                     |
| **Mechanical Completion** | Walkdown, hydrotest, flushing, reinstatement, preservation, A-punch closure — per subsystem with auto MC dossier (Excel).                                            |
| **Commissioning**         | Energization → Loop checks → C&E → Functional → Performance → Reliability run.                                                                                       |
| **Turnover & Handover**   | MC → RFSU → Comm Complete → Ops Accept → CCC, with witness sign-off and dossier export.                                                                              |
| **Documentation**         | Per-project doc register and one-click Excel deliverables (System Register, Punch Register, MC Dossier, Handover Dossier, Preservation Log).                         |
| **Workflow Engine**       | Auto-rolled execution flow: Construction → MC → Pre-comm → Commissioning → Start-up → Reliability → Handover, with gate criteria derived from underlying checklists. |

**Education layer.** Every module has _Learn_ pop-up cards (Why · How · What · Drivers) so users with **zero completions experience** can build competency while they execute.

### Tech

- **TanStack Start** (React 19, SSR-ready) on **Vite 7**
- **Tailwind v4** semantic design tokens (`src/styles.css`)
- **Zustand** persisted store (LocalStorage v3)
- **xlsx** for engineering deliverable exports
- File-based routes in `src/routes/`

---

## 3. What it should do (roadmap)

To move from a single-user execution prototype to a credible enterprise tool:

1. **Multi-user backend** — Lovable Cloud (Supabase) for auth, RLS-protected projects, real-time collaboration.
2. **ITR engine** — configurable Inspection & Test Records, signature workflow (Construction → QC → Comm → Vendor → Client), auto-rollup to MC/RFSU certificates.
3. **Tag-level data** — import Master Tag Register (P&ID line lists, equipment, instruments, loops); attach ITRs to tags, not just subsystems.
4. **Mobile field capture** — offline-first PWA for walkdowns, punch raising with photos, witness e-signature.
5. **Drawing & doc viewer** — P&ID overlay with subsystem highlight, redlines on punches.
6. **Forecasting** — earned-value on subsystems, MC and RFSU forecast curves vs. baseline.
7. **Integrations** — SAP/Maximo (notifications, work orders), Primavera P6 (subsystem milestones), Aveva NET, GoCompletions/WinPCS data import.

---

## 4. What it needs to be world-class

To be globally accepted across IOCs, NOCs, EPCs and operators:

- **Standards alignment** — out-of-the-box templates aligned to **IOGP S-715/S-716**, **DEP/Shell**, **ExxonMobil GP**, **Saudi Aramco SAES**, **ADNOC**, **Petrobras**, **TotalEnergies GS**, **Equinor TR**, plus owner-operator turnover dossier formats.
- **Compliance & assurance** — 21 CFR Part 11 / EU Annex 11-grade audit trail, e-signature non-repudiation, immutable record store, SOC 2 Type II, ISO 27001, GDPR.
- **Localization** — multi-language (EN/ES/PT/FR/AR/RU/ZH/JA/KO), RTL support, multi-currency, units (SI/Imperial), regional date formats.
- **Scale** — 100k+ tags, 50k+ ITRs, 10k+ punches per project; sub-second filtered queries; horizontal scaling; tenant isolation.
- **Interoperability** — open REST + GraphQL API, ISO 15926 / CFIHOS data exchange, webhook events, exportable to Aveva AIM, SAP S/4HANA, IBM Maximo.
- **Field-grade UX** — offline-first mobile, low-bandwidth tolerance, gloved-hand UI, barcode/QR tag scan, voice notes, photo annotation.
- **AI assistance** — auto-classify punches, suggest discipline/responsible party, predict slippage, NLP search across drawings & vendor manuals.
- **Configurable workflows** — every operator runs a different gate model; let admins compose workflow stages, ITR templates and sign-off matrices without code.
- **Enterprise admin** — SSO (SAML/OIDC), SCIM provisioning, RBAC + ABAC, project-level data residency, customer-managed encryption keys.
- **Reliability** — 99.95% uptime SLA, regional deployments (EU/US/ME/APAC), DR, point-in-time restore.
- **Onboarding for non-experts** — built-in competency path, glossary, contextual _Why/How/What/Drivers_ learning cards in every module (already started).

---

## 5. Local development

```bash
npm ci
npm run dev
```

Then open the preview URL.

The app currently runs **fully client-side** with persisted local storage (`ccpro-store-v3`). No backend is required to evaluate it.

Deployment is currently targeted at **Cloudflare Workers**. See `docs/deployment.md` for local/staging/production environment strategy, CI, release, rollback, and monitoring procedures.

Release materials:

- Release readiness QA matrix: `docs/release-readiness.md`
- Seed demo project guide: `docs/seed-demo-project.md`
- Onboarding flow: `docs/onboarding-flow.md`
- Admin guide: `docs/admin-guide.md`
- Field user guide: `docs/field-user-guide.md`

---

## 6. Repository layout

```
src/
  routes/                 # File-based TanStack routes (one file per module)
  components/             # AppSidebar, TopBar, EngineeringInsight, LearnCard, ...
  lib/
    store.ts              # Zustand persisted store
    types.ts              # Domain model (System, Subsystem, Punch, Workflow, ...)
    derive.ts             # Pure rollups: MC %, Comm %, Turnover %, Workflow
    exports.ts            # xlsx dossier generators
    learn.ts              # Knowledge base for Why/How/What/Drivers cards
    kpi.ts                # RAG colours and KPI helpers
  styles.css              # Tailwind v4 + semantic design tokens (oklch)
```

---

## 7. License

Proprietary — internal evaluation build.
