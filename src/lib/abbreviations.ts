// Glossary of completions & commissioning abbreviations used across the app.
// Used by <AbbrText /> to auto-decorate text with hover-tooltips, and by the
// Glossary modal opened from any LearnRail.

export const ABBREVIATIONS: Record<string, string> = {
  EPC: "Engineering, Procurement & Construction — the contract model where one contractor delivers the whole asset.",
  SBS: "System & Subsystem Breakdown Structure — the spine of completions; splits the plant into independently testable subsystems.",
  ITR: "Inspection & Test Record — the field checksheet a discipline signs to evidence a test or check.",
  ITP: "Inspection & Test Plan — the planned set of ITRs and hold-points for a scope of work.",
  MC: "Mechanical Completion — gate where static construction is proven complete and the subsystem is handed to commissioning.",
  RFSU: "Ready For Start-Up — gate where all pre-commissioning is done and the subsystem can be energised / introduced to process.",
  RFO: "Ready For Operations — gate where the subsystem has been performance-proven and is ready for operations.",
  CCC: "Care, Custody & Control — legal transfer of the asset (and risk) from EPC to the Operator.",
  RAG: "Red / Amber / Green (/ Grey) — at-a-glance readiness colour code.",
  SIS: "Safety Instrumented System — the independent safety layer (sensors, logic solver, final elements).",
  SIL: "Safety Integrity Level — IEC 61511 rating (1–4) of an SIS function's risk reduction.",
  PHA: "Process Hazard Analysis — structured identification of process hazards (HAZOP, LOPA…).",
  HAZOP: "Hazard & Operability study — structured P&ID-based hazard identification workshop.",
  LOPA: "Layer of Protection Analysis — semi-quantitative method to assign SIL targets.",
  "C&E": "Cause & Effect matrix — the table of inputs (causes) and outputs (effects) that defines plant safety logic.",
  DCS: "Distributed Control System — the plant's main process control system.",
  ICSS: "Integrated Control & Safety System — combined DCS + SIS package.",
  PLC: "Programmable Logic Controller — controller used in packaged equipment and some safety/control duties.",
  HMI: "Human–Machine Interface — operator screens.",
  "P&ID": "Piping & Instrumentation Diagram — the master engineering drawing of a process system.",
  PFD: "Process Flow Diagram — high-level process drawing (mass balance, main equipment).",
  SLD: "Single Line Diagram — the master one-line electrical drawing.",
  ISO: "Piping Isometric — 3D-style spool drawing used for fabrication and walkdown.",
  FME: "Foreign Material Exclusion — the discipline of keeping debris out of opened systems.",
  XV: "On/Off (shutdown) Valve — typically actuated, used in interlocks.",
  "MV/LV": "Medium Voltage / Low Voltage — electrical voltage classes.",
  "HV": "High Voltage.",
  N2: "Nitrogen — used for inerting, blanketing and preservation.",
  "N₂": "Nitrogen — used for inerting, blanketing and preservation.",
  CMMS: "Computerised Maintenance Management System — operations' maintenance database (e.g. SAP PM, Maximo).",
  IOM: "Installation, Operation & Maintenance manual — the vendor manual.",
  OEM: "Original Equipment Manufacturer — the vendor of a piece of equipment.",
  QC: "Quality Control — verifies work meets the spec.",
  QA: "Quality Assurance — the system of processes that ensures QC happens.",
  PTW: "Permit To Work — written authorisation to perform a hazardous task.",
  LOTO: "Lock-Out / Tag-Out — energy isolation method to make equipment safe to work on.",
  RACI: "Responsible / Accountable / Consulted / Informed — accountability matrix.",
  KPI: "Key Performance Indicator — the metric leadership steers on.",
  RFI: "Request For Inspection — formal call for QC / client to witness a test.",
  NCR: "Non-Conformance Report — formal record of work that does not meet spec.",
  TQ: "Technical Query — formal question to engineering during construction.",
  IOGP: "International Association of Oil & Gas Producers — publishes industry standards (e.g. S-715, S-716).",
  DEP: "Design & Engineering Practice — Shell's internal engineering standards.",
  GIS: "Group Information Standard — BP's internal engineering standards (also Geographic Information System in other contexts).",
  SAEP: "Saudi Aramco Engineering Procedure.",
  API: "American Petroleum Institute — publishes standards (RP 686, RP 1110, …).",
  ASME: "American Society of Mechanical Engineers — publishes B31.3 piping code, BPVC, etc.",
  NACE: "NACE International (now AMPP) — corrosion standards (e.g. SP0487).",
  IEC: "International Electrotechnical Commission — publishes 61511, 62381, etc.",
  pH: "Acidity / alkalinity — kept neutral in hydrotest water to prevent corrosion.",
  "Cat A": "Category A punch — must be cleared before MC (safety / integrity / blocks the test).",
  "Cat B": "Category B punch — must be cleared before start-up.",
  "Cat C": "Category C punch — cosmetic / paperwork; clear before final handover.",
};

// Build a regex that matches any abbreviation as a whole token. Sorted by
// length descending so multi-word tokens (e.g. "Cat A", "MV/LV") win over
// shorter overlaps.
const sortedKeys = Object.keys(ABBREVIATIONS).sort((a, b) => b.length - a.length);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const ABBR_REGEX = new RegExp(
  `(?<![A-Za-z0-9])(${sortedKeys.map(escape).join("|")})(?![A-Za-z0-9])`,
  "g",
);
