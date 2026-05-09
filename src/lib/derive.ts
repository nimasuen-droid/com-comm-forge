import type { Project, Subsystem, SystemNode, RAG, MCCheckKey, CommCheckKey, TurnoverCheckKey } from "./types";
import { MC_CHECK_KEYS, COMM_CHECK_KEYS, TURNOVER_CHECK_KEYS } from "./types";

export function pctToRag(pct: number): RAG {
  if (pct >= 100) return "green";
  if (pct >= 50) return "amber";
  if (pct > 0) return "red";
  return "grey";
}

export function mcProgress(ss: Subsystem, openAClear?: boolean) {
  const c = ss.mcChecks ?? {};
  const done = MC_CHECK_KEYS.filter(k => k === "punchA" ? (openAClear ?? c[k]) : c[k]).length;
  return { done, total: MC_CHECK_KEYS.length, pct: Math.round(done / MC_CHECK_KEYS.length * 100) };
}
export function commProgress(ss: Subsystem) {
  const c = ss.commChecks ?? {};
  const done = COMM_CHECK_KEYS.filter(k => c[k]).length;
  return { done, total: COMM_CHECK_KEYS.length, pct: Math.round(done / COMM_CHECK_KEYS.length * 100) };
}
export function turnoverProgress(ss: Subsystem) {
  const c = ss.turnoverChecks ?? {};
  const done = TURNOVER_CHECK_KEYS.filter(k => c[k]).length;
  return { done, total: TURNOVER_CHECK_KEYS.length, pct: Math.round(done / TURNOVER_CHECK_KEYS.length * 100) };
}

export function openAPunchesFor(project: Project, sys: SystemNode, ss?: Subsystem) {
  return project.punches.filter(p =>
    p.systemId === sys.id &&
    (!ss || !p.subsystemId || p.subsystemId === ss.id) &&
    p.category === "A" && p.status !== "closed"
  );
}

/** MC RAG derived from checklist + open A-punches gate. */
export function deriveMcStatus(project: Project, sys: SystemNode, ss: Subsystem): RAG {
  const openAClear = openAPunchesFor(project, sys, ss).length === 0;
  return pctToRag(mcProgress(ss, openAClear).pct);
}
export function deriveCommStatus(_p: Project, _s: SystemNode, ss: Subsystem): RAG {
  return pctToRag(commProgress(ss).pct);
}
export function deriveTurnoverStatus(_p: Project, _s: SystemNode, ss: Subsystem): RAG {
  return pctToRag(turnoverProgress(ss).pct);
}

/** Roll up workflow % from real subsystem data. */
export function deriveWorkflow(project: Project) {
  const subs = project.systems.flatMap(s => s.subsystems);
  if (!subs.length) return project.workflow;
  const n = subs.length;
  const mcVals = project.systems.flatMap(s => s.subsystems.map(ss => mcProgress(ss, openAPunchesFor(project, s, ss).length === 0).pct));
  const mc = Math.round(mcVals.reduce((a,b)=>a+b,0) / n);
  const comm = Math.round(subs.reduce((a, ss) => a + commProgress(ss).pct, 0) / n);
  const handover = Math.round(subs.reduce((a, ss) => a + turnoverProgress(ss).pct, 0) / n);
  return {
    construction: Math.max(mc, project.workflow.construction || 0),
    mc,
    precomm: Math.round((mc + comm) / 2),
    commissioning: comm,
    startup: project.workflow.startup,
    reliability: project.workflow.reliability,
    handover,
  };
}

export const MC_CHECK_LABELS: Record<MCCheckKey, string> = {
  walkdown: "Walkdown signed",
  hydrotest: "Hydrotest pack closed",
  flushing: "Flushing / cleaning certified",
  reinstatement: "Reinstatement & FME closed",
  preservation: "Preservation register active",
  punchA: "No open A-punches",
};
export const COMM_CHECK_LABELS: Record<CommCheckKey, string> = {
  energization: "Energisation complete",
  loops: "Loop checks complete",
  ce: "Cause & Effect validated",
  functional: "Functional test passed",
  performance: "Performance test passed",
  reliability: "Reliability run complete",
};
export const TURNOVER_CHECK_LABELS: Record<TurnoverCheckKey, string> = {
  mc: "Subsystem MC certificate",
  rfsu: "RFSU certificate",
  commComplete: "Commissioning complete",
  opsAccept: "Operations acceptance",
  ccc: "Care, Custody & Control",
};
