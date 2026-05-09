// Knowledge base for the "Learn" pop-up cards across all modules.
// Each concept teaches Why it matters, How it works, What it produces,
// and What drives it — so a user with zero completions experience can
// build competency in-context while they execute.

export interface LearnConcept {
  id: string;
  title: string;
  tag?: string;        // short chip e.g. "MC gate", "Cat A"
  why: string;         // why this matters on a real project
  how: string;         // how it is performed in the field
  what: string;        // what artefact / outcome is produced
  drives: string;      // what business / safety / schedule outcome it drives
  pitfalls?: string;   // common mistakes
  standards?: string;  // governing standards / typical references
}

export type ModuleKey =
  | "systems" | "preservation" | "punch" | "mc"
  | "commissioning" | "turnover" | "documents" | "workflow";

export const LEARN: Record<ModuleKey, LearnConcept[]> = {
  systems: [
    {
      id: "sbs", title: "System / Subsystem Breakdown (SBS)", tag: "Foundation",
      why: "The SBS is the spine of completions. Every punch, ITR, MC certificate, preservation record and turnover pack is joined back to a subsystem. Get it wrong and the project cannot be turned over in pieces.",
      how: "Engineering and the completions team carve the plant from P&IDs, SLDs and the plot plan. Utilities are split first, then process. Each subsystem must be independently walkable, isolatable, energisable and testable.",
      what: "A locked Master Tag Register: System code → Subsystem code → equipment / line / loop tags, with discipline owner, priority and turnover sequence.",
      drives: "Phased start-up. Without an SBS you can only commission the whole plant at once — which never works.",
      pitfalls: "Boundaries that follow only P&IDs and ignore constructibility; ICSS loops crossing subsystems; vendor packages lumped with field-erected scope.",
      standards: "IOGP S-715, DEP 80.00.10.10, owner-operator SBS guidelines.",
    },
    {
      id: "rag", title: "RAG Status & Readiness", tag: "Reporting",
      why: "Project leadership can not read 5,000 ITRs. RAG (Red / Amber / Green / Grey) gives a single instantly-readable readiness state per subsystem, per gate.",
      how: "Each gate (MC, RFSU, Comm, Turnover) has objective criteria. The status flips automatically as the underlying checklist completes and Cat A punches close.",
      what: "A colour-coded matrix used in the daily completions meeting and weekly leadership steerco.",
      drives: "Resource re-allocation — supervisors send crews where the dot is red.",
      pitfalls: "Manually-set RAG that does not reflect data; using subjective 'feeling' instead of gate criteria.",
    },
    {
      id: "discipline", title: "Discipline Ownership",
      why: "Every subsystem has a single accountable discipline lead. Without it, punches and ITRs orphan and nothing closes.",
      how: "Assigned at SBS lock — typically Mechanical for static equipment, Piping for spool networks, E&I for power and control.",
      what: "A RACI implicit in the SBS: who walks down, who signs ITR-Construction, who escorts the client witness.",
      drives: "Accountability and faster punch closure.",
    },
  ],

  preservation: [
    {
      id: "lay-up", title: "Equipment Preservation & Lay-up", tag: "Critical",
      why: "Equipment delivered to site sits idle for months. Bearings brinell, seals dry out, instruments corrode, electronics absorb moisture. Without preservation, you commission damaged equipment.",
      how: "Vendor preservation manuals define intervals (typically 7/30/90 days) for rotation, N₂ blanket pressure check, desiccant change, motor megger, oil sampling, heater-on checks.",
      what: "A preservation register with last-done dates, next-due dates, signed records, and an exception log of overdue items.",
      drives: "Warranty validity. Most OEM warranties are voided if preservation lapses are not documented.",
      pitfalls: "Treating preservation as a checkbox; no nitrogen pressure logs; rotating equipment never barred over; spares forgotten in laydown.",
      standards: "API RP 686 (preservation), vendor IOM manuals, NACE SP0487.",
    },
    {
      id: "handoff", title: "Preservation Handover", tag: "MC gate",
      why: "Preservation must transfer cleanly from Construction to Commissioning to Operations. Each handoff is a moment where things get dropped.",
      how: "At MC, preservation responsibility transfers from Construction to Commissioning. At RFO, it transfers to Operations under the CMMS.",
      what: "Signed preservation transfer certificate per subsystem.",
      drives: "Clear accountability — no 'who was supposed to spin the pump?' arguments.",
    },
  ],

  punch: [
    {
      id: "categories", title: "Cat A / B / C Punch Categories", tag: "Cat A blocks MC",
      why: "Not every defect blocks every gate. Categorising punches lets the project move through gates without ignoring defects.",
      how: "Category A: must be cleared before MC (safety, mechanical integrity, prevents test). Category B: must be cleared before start-up. Category C: cosmetic / paperwork — clear before final handover.",
      what: "A live punch register filterable by category, discipline, system, responsible party.",
      drives: "Schedule. Mis-categorising B as A jams MC. Mis-categorising A as B causes incidents.",
      pitfalls: "Inflating Cat A to force attention; closing punches without re-walkdown; no photo evidence.",
      standards: "Owner-operator Completions Procedure; typical Shell DEP, BP GIS definitions.",
    },
    {
      id: "raise", title: "Raising a Good Punch",
      why: "A vague punch ('pump leaks') wastes a site visit. A good punch closes on the first attempt.",
      how: "Tag number, location reference, P&ID, photo, defect description, required action, discipline, responsible contractor, due date.",
      what: "A unique punch ID linked to a subsystem and a tag.",
      drives: "First-time-right closure rate — the KPI that decides whether you hit MC.",
    },
    {
      id: "closeout", title: "Punch Close-out & Verification",
      why: "Self-closure by the originating contractor without independent verification is how Cat A items reappear in operations.",
      how: "Contractor remediates → QC verifies → completions engineer signs. Cat A also requires client witness.",
      what: "A close-out record with photos before/after, and a re-walkdown signature.",
      drives: "Dossier integrity — auditors trace any defect from raise to close.",
    },
  ],

  mc: [
    {
      id: "definition", title: "What 'Mechanical Completion' Means", tag: "Gate",
      why: "MC is the contractual handover of static equipment from Construction to Commissioning. It is the single most disputed milestone on EPC projects.",
      how: "Every subsystem must have: walkdown complete, hydrotest signed, flushing/cleaning signed, reinstatement complete, preservation active, zero open Cat A punches.",
      what: "An MC certificate per subsystem and an MC dossier (this app generates the .xlsx).",
      drives: "Payment milestone (often 10–15% of EPC value), liability transfer, start of preservation handoff.",
      pitfalls: "'Soft MC' with open A-punches; missing FME register; hydrotest packs incomplete.",
      standards: "DEP 80.00.10.10, Aramco SAEP-1135, IOGP S-716.",
    },
    {
      id: "walkdown", title: "Pre-MC Walkdown",
      why: "Paperwork lies. The walkdown is where reality is checked against the P&ID and the punch list is born.",
      how: "Multi-discipline team walks the subsystem with marked-up P&IDs, ISOs, and tag list. Every deviation is photographed and punched on the spot.",
      what: "A redlined P&ID and a punch dump.",
      drives: "An accurate punch list — and ultimately a clean MC.",
    },
    {
      id: "hydrotest", title: "Hydrotest, Flushing & Reinstatement",
      why: "Untested piping fails on first pressurisation. Dirty piping destroys downstream equipment within hours of start-up.",
      how: "Hydrotest at 1.5× design (water, neutral pH, chloride-controlled), flushing to defined cleanliness, then reinstate to operating configuration with a controlled blind list.",
      what: "Signed hydrotest pack, flushing certificate, reinstatement / blind register.",
      drives: "Mechanical integrity in operation.",
      standards: "ASME B31.3, API RP 1110.",
    },
  ],

  commissioning: [
    {
      id: "sequence", title: "Commissioning Sequence", tag: "Order matters",
      why: "Commissioning out of sequence blows up equipment. Power before loops. Loops before C&E. C&E before functional.",
      how: "Energise utilities → energise MV/LV → loop check field-to-DCS → C&E (cause & effect) interlock validation → functional test → performance test → reliability run.",
      what: "Stage gates per subsystem, each with witnessed test sheets.",
      drives: "Safe energisation. The number one start-up incident category is out-of-sequence commissioning.",
      standards: "IEC 62381 (functional testing), owner-operator commissioning procedures.",
    },
    {
      id: "loops", title: "Loop Checks", tag: "I&C",
      why: "A loop is the field instrument → marshalling → DCS → display chain. If the chain is broken, your control room is blind.",
      how: "Inject a known signal at the field transmitter, verify the value at the DCS, then exercise the output (valve / motor) and verify field response.",
      what: "Signed loop folder per loop tag.",
      drives: "DCS readiness for energisation.",
    },
    {
      id: "ce", title: "Cause & Effect / SIS Validation", tag: "Safety",
      why: "Cause & Effect matrices encode the safety logic of the plant. Untested C&E = untested safety system.",
      how: "Force inputs (e.g. high-high level) and verify the resulting outputs (close XV-101, trip pump, sound horn) match the C&E matrix exactly.",
      what: "Signed C&E test sheet per matrix, with overrides logged.",
      drives: "SIL claim validity (IEC 61511) and PHA action close-out.",
      standards: "IEC 61511, IEC 62061.",
    },
    {
      id: "performance", title: "Performance & Reliability Run",
      why: "Equipment that runs for an hour is not proven. The reliability run proves the plant can hold design conditions for the contractual period without intervention.",
      how: "Continuous run at design conditions for 72 h / 7 d / 30 d (project-specific). Any trip resets the clock.",
      what: "Reliability run log and final acceptance certificate.",
      drives: "Performance guarantee acceptance and the start of the operations warranty period.",
    },
  ],

  turnover: [
    {
      id: "phases", title: "MC → RFSU → RFO → CCC", tag: "Phased",
      why: "Operations cannot accept a plant in a single step. Phased turnover lets ownership transfer cleanly as each gate is met.",
      how: "MC (static integrity) → RFSU = Ready For Start-Up (commissioning complete on subsystem) → RFO = Ready For Operations (subsystem performance proven) → CCC = Care, Custody & Control (legal transfer of risk).",
      what: "A signed certificate at each phase plus a turnover dossier.",
      drives: "Insurance, risk transfer, operating license.",
      standards: "IOGP S-715, owner-operator turnover procedures.",
    },
    {
      id: "dossier", title: "Turnover Dossier",
      why: "On day one of operations, the operator needs every certificate, ITR, vendor manual and as-built — searchable by tag.",
      how: "Compiled per subsystem: MC pack + commissioning pack + as-builts + vendor data + spare parts list + maintenance plan.",
      what: "An indexed dossier (often 5,000–50,000 documents per subsystem).",
      drives: "Operational readiness and audit defensibility.",
    },
    {
      id: "witness", title: "Witness & Sign-off",
      why: "Without independent witness, the certificate is worthless to the operator and the insurer.",
      how: "Construction signs → QC verifies → Commissioning accepts → Operator witnesses → Client accepts. Different gates need different signatories.",
      what: "An immutable signature trail.",
      drives: "Liability — if the witness chain is broken, liability stays with the EPC long after handover.",
    },
  ],

  documents: [
    {
      id: "register", title: "Document Register",
      why: "On a refinery project, 'lost ITR' is a daily occurrence. A single index prevents re-walking subsystems just to re-issue paperwork.",
      how: "Every certificate, ITR, vendor pack and dossier is registered with subsystem, type, revision and source.",
      what: "A queryable register tied to subsystems.",
      drives: "Audit response time — owner audits typically demand any record within 10 minutes.",
    },
    {
      id: "deliverables", title: "Engineering Deliverables (Excel exports)",
      why: "Owners and EPCs all consume Excel. Exporting properly-formatted dossiers from a single source of truth eliminates re-typing and version drift.",
      how: "The app generates System Register, Punch Register, MC Dossier, Handover Dossier and Preservation Log directly from the live data model.",
      what: "Structured .xlsx files ready to attach to certificates and audit responses.",
      drives: "Hours saved per week per completions engineer.",
    },
  ],

  workflow: [
    {
      id: "gates", title: "Gated Execution Workflow",
      why: "A linear workflow forces conversation about what is actually blocking the next gate, instead of vague percent-complete numbers.",
      how: "Construction → MC → Pre-comm → Commissioning → Start-up → Reliability → Handover. Each gate has objective entry & exit criteria derived from the underlying checklists.",
      what: "A live percent-complete per gate, auto-rolled from subsystem checks.",
      drives: "Forecast accuracy and slippage detection.",
    },
    {
      id: "rollup", title: "Auto-rollup From Subsystem Data",
      why: "Manual progress reporting always lies — it tracks effort not gate criteria. Auto-rollup from objective checklists kills that.",
      how: "Each subsystem's MC / Comm / Turnover checklists feed the workflow gate %. No manual override.",
      what: "A trustworthy single number per gate, per project.",
      drives: "Steering committee credibility — leadership stops asking 'what's the real number?'.",
    },
  ],
};
