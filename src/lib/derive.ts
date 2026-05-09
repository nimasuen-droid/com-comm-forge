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
  const { pct } = mcProgress(ss);
  const blocked = openAPunchesFor(project, sys, ss).length > 0;
  if (pct === 100 && !blocked) return "green";
  if (pct === 100 && blocked) return "amber"; // checklist done but A-punches block
  return pctToRag(pct);
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
  const n = subs.length || 1;
  const avg = (fn: (ss: Subsystem) => number) => Math.round(subs.reduce((a, ss) => a + fn(ss), 0) / n);
  const mc = avg(ss => mcProgress(ss).pct);
  const comm = avg(ss => commProgress(ss).pct);
  const handover = avg(ss => turnoverProgress(ss).pct);
  // construction precedes MC; estimate as max(mc, current). precomm sits between mc & comm.
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
