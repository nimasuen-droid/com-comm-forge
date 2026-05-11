import type { Project, Subsystem, SystemNode, RAG, MCCheckKey, CommCheckKey, TurnoverCheckKey } from "./types";
import { MC_CHECK_KEYS, COMM_CHECK_KEYS, TURNOVER_CHECK_KEYS } from "./types";
import { resolveWeights, normalize } from "./weights";

export function pctToRag(pct: number): RAG {
  if (pct >= 100) return "green";
  if (pct >= 50) return "amber";
  if (pct > 0) return "red";
  return "grey";
}

function weightedPct<K extends string>(keys: readonly K[], doneFor: (k: K) => boolean, weights: Record<K, number>) {
  const w = normalize(weights);
  const totalW = (Object.values(w) as number[]).reduce((a, b) => a + b, 0);
  const earned = keys.reduce((acc, k) => acc + (doneFor(k) ? w[k] : 0), 0);
  const done = keys.filter(doneFor).length;
  return { done, total: keys.length, pct: Math.round((earned / totalW) * 100) };
}

export function mcProgress(ss: Subsystem, openAClear?: boolean, project?: Project | null) {
  const c = ss.mcChecks ?? {};
  const w = resolveWeights(project).mc;
  return weightedPct(MC_CHECK_KEYS, k => k === "punchA" ? !!(openAClear ?? c[k]) : !!c[k], w);
}
export function commProgress(ss: Subsystem, project?: Project | null) {
  const c = ss.commChecks ?? {};
  const w = resolveWeights(project).comm;
  return weightedPct(COMM_CHECK_KEYS, k => !!c[k], w);
}
export function turnoverProgress(ss: Subsystem, project?: Project | null) {
  const c = ss.turnoverChecks ?? {};
  const w = resolveWeights(project).turnover;
  return weightedPct(TURNOVER_CHECK_KEYS, k => !!c[k], w);
}

export function openAPunchesFor(project: Project, sys: SystemNode, ss?: Subsystem) {
  return project.punches.filter(p =>
    p.systemId === sys.id &&
    (!ss || !p.subsystemId || p.subsystemId === ss.id) &&
    p.category === "A" && p.status !== "closed"
  );
}

/** MC RAG derived from weighted checklist + open A-punches gate. */
export function deriveMcStatus(project: Project, sys: SystemNode, ss: Subsystem): RAG {
  const openAClear = openAPunchesFor(project, sys, ss).length === 0;
  return pctToRag(mcProgress(ss, openAClear, project).pct);
}
export function deriveCommStatus(project: Project, _s: SystemNode, ss: Subsystem): RAG {
  return pctToRag(commProgress(ss, project).pct);
}
export function deriveTurnoverStatus(project: Project, _s: SystemNode, ss: Subsystem): RAG {
  return pctToRag(turnoverProgress(ss, project).pct);
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
