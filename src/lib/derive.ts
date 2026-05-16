import type {
  Project,
  Subsystem,
  SystemNode,
  RAG,
  MCCheckKey,
  CommCheckKey,
  TurnoverCheckKey,
  StartupCheckKey,
  ReliabilityCheckKey,
} from "./types";
import {
  MC_CHECK_KEYS,
  COMM_CHECK_KEYS,
  TURNOVER_CHECK_KEYS,
  STARTUP_CHECK_KEYS,
  RELIABILITY_CHECK_KEYS,
} from "./types";
import { resolveWeights, normalize } from "./weights";

export function pctToRag(pct: number): RAG {
  if (pct >= 100) return "green";
  if (pct >= 50) return "amber";
  if (pct > 0) return "red";
  return "grey";
}

function weightedPct<K extends string>(
  keys: readonly K[],
  doneFor: (k: K) => boolean,
  weights: Record<K, number>,
) {
  const w = normalize(weights);
  const totalW = (Object.values(w) as number[]).reduce((a, b) => a + b, 0);
  const earned = keys.reduce((acc, k) => acc + (doneFor(k) ? w[k] : 0), 0);
  const done = keys.filter(doneFor).length;
  return { done, total: keys.length, pct: Math.round((earned / totalW) * 100) };
}

export function mcProgress(ss: Subsystem, openAClear?: boolean, project?: Project | null) {
  const c = ss.mcChecks ?? {};
  const w = resolveWeights(project).mc;
  return weightedPct(MC_CHECK_KEYS, (k) => (k === "punchA" ? !!(openAClear ?? c[k]) : !!c[k]), w);
}
export function commProgress(ss: Subsystem, project?: Project | null) {
  const c = ss.commChecks ?? {};
  const w = resolveWeights(project).comm;
  return weightedPct(COMM_CHECK_KEYS, (k) => !!c[k], w);
}
export function turnoverProgress(ss: Subsystem, project?: Project | null) {
  const c = ss.turnoverChecks ?? {};
  const w = resolveWeights(project).turnover;
  return weightedPct(TURNOVER_CHECK_KEYS, (k) => !!c[k], w);
}
export function startupProgress(ss: Subsystem) {
  const c = ss.startupChecks ?? {};
  return weightedPct(STARTUP_CHECK_KEYS, (k) => !!c[k], {
    firstFeed: 25,
    stableOps: 35,
    safeguards: 20,
    opsStaffed: 20,
  });
}
export function reliabilityProgress(ss: Subsystem) {
  const c = ss.reliabilityChecks ?? {};
  return weightedPct(RELIABILITY_CHECK_KEYS, (k) => !!c[k], {
    runStarted: 10,
    atDesignRate: 25,
    noTrips: 30,
    noCriticalPunches: 20,
    ownerAccepted: 15,
  });
}

export function openAPunchesFor(project: Project, sys: SystemNode, ss?: Subsystem) {
  return project.punches.filter(
    (p) =>
      p.systemId === sys.id &&
      (!ss || !p.subsystemId || p.subsystemId === ss.id) &&
      p.category === "A" &&
      p.status !== "closed",
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
export function deriveRfsuStatus(project: Project, sys: SystemNode, ss: Subsystem): RAG {
  const mcPct = mcProgress(ss, openAPunchesFor(project, sys, ss).length === 0, project).pct;
  const c = ss.commChecks ?? {};
  const precommPct = Math.round(
    ((c.energization ? 1 : 0) + (c.loops ? 1 : 0) + (c.ce ? 1 : 0)) * 33.33,
  );
  if (mcPct >= 100 && precommPct >= 100) return "green";
  if (mcPct >= 100 || precommPct >= 50) return "amber";
  if (mcPct > 0 || precommPct > 0) return "red";
  return "grey";
}
export function deriveTurnoverStatus(project: Project, _s: SystemNode, ss: Subsystem): RAG {
  return pctToRag(turnoverProgress(ss, project).pct);
}

/** Roll up workflow % from real subsystem data. */
export function deriveWorkflow(project: Project) {
  const subs = project.systems.flatMap((s) => s.subsystems);
  if (!subs.length) return project.workflow;
  const n = subs.length;
  const mcVals = project.systems.flatMap((s) =>
    s.subsystems.map((ss) => mcProgress(ss, openAPunchesFor(project, s, ss).length === 0).pct),
  );
  const mc = Math.round(mcVals.reduce((a, b) => a + b, 0) / n);
  const comm = Math.round(subs.reduce((a, ss) => a + commProgress(ss).pct, 0) / n);
  const startup = Math.round(subs.reduce((a, ss) => a + startupProgress(ss).pct, 0) / n);
  const reliability = Math.round(subs.reduce((a, ss) => a + reliabilityProgress(ss).pct, 0) / n);
  const handover = Math.round(subs.reduce((a, ss) => a + turnoverProgress(ss).pct, 0) / n);
  return {
    construction: Math.max(mc, project.workflow.construction || 0),
    mc,
    precomm: Math.round((mc + comm) / 2),
    commissioning: comm,
    startup,
    reliability,
    handover,
  };
}

export function workflowEvidence(project: Project) {
  const subs = project.systems.flatMap((s) => s.subsystems);
  const totals = {
    construction: {
      done: subs.length,
      total: subs.length,
      source: "Project construction baseline",
    },
    mc: { done: 0, total: 0, source: "Mechanical Completion checklist" },
    precomm: { done: 0, total: 0, source: "MC + early commissioning gates" },
    commissioning: { done: 0, total: 0, source: "Commissioning Sequence checklist" },
    startup: { done: 0, total: 0, source: "Start-up Tracking checklist" },
    reliability: { done: 0, total: 0, source: "Reliability Run Tracking checklist" },
    handover: { done: 0, total: 0, source: "Turnover checklist" },
  };

  project.systems.forEach((sys) => {
    sys.subsystems.forEach((ss) => {
      const mc = mcProgress(ss, openAPunchesFor(project, sys, ss).length === 0, project);
      const comm = commProgress(ss, project);
      const startup = startupProgress(ss);
      const reliability = reliabilityProgress(ss);
      const handover = turnoverProgress(ss, project);
      totals.mc.done += mc.done;
      totals.mc.total += mc.total;
      totals.precomm.done += mc.done + comm.done;
      totals.precomm.total += mc.total + comm.total;
      totals.commissioning.done += comm.done;
      totals.commissioning.total += comm.total;
      totals.startup.done += startup.done;
      totals.startup.total += startup.total;
      totals.reliability.done += reliability.done;
      totals.reliability.total += reliability.total;
      totals.handover.done += handover.done;
      totals.handover.total += handover.total;
    });
  });

  return totals;
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
export const STARTUP_CHECK_LABELS: Record<StartupCheckKey, string> = {
  firstFeed: "First feed introduced",
  stableOps: "Stable operating conditions",
  safeguards: "Safeguards in service",
  opsStaffed: "Operations shift coverage",
};
export const RELIABILITY_CHECK_LABELS: Record<ReliabilityCheckKey, string> = {
  runStarted: "Reliability run started",
  atDesignRate: "At design rate",
  noTrips: "No trips / forced outages",
  noCriticalPunches: "No critical open punches",
  ownerAccepted: "Owner accepted run",
};
