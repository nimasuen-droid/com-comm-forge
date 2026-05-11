import type { MCCheckKey, CommCheckKey, TurnoverCheckKey, Project } from "./types";
import { MC_CHECK_KEYS, COMM_CHECK_KEYS, TURNOVER_CHECK_KEYS } from "./types";

/**
 * Progress weighting basis.
 *
 * Default weights reflect global completions & commissioning practice as
 * implemented by tier-1 completions systems (Hexagon SmartCompletions,
 * Bentley AssetWise / ICAPS, WinPCS, Aveva ProCon) and informed by:
 *
 *  - CII (Construction Industry Institute) IR-272 "Effective Project
 *    Completion" — weights critical-path verification gates over
 *    administrative items.
 *  - IPA (Independent Project Analysis) Pacesetter studies — penalises
 *    declaring MC with open A-punches; commissioning weighted to performance
 *    and reliability runs, not energisation alone.
 *  - Shell DEP 80.00.10.11 / Saudi Aramco SAEP-1145 — formal MC, RFSU and
 *    Care-Custody-Control gates carry equal pre-acceptance weight.
 *  - IOGP Report 597 (Process Safety Fundamentals) — independent C&E /
 *    SIS validation cannot be substituted by functional ticks.
 *
 * Weights are integers that sum to 100 within each module.
 * Projects can override via `project.progressWeights`.
 */

export type WeightMap<K extends string> = Record<K, number>;

export interface ProjectWeightProfile {
  mc: WeightMap<MCCheckKey>;
  comm: WeightMap<CommCheckKey>;
  turnover: WeightMap<TurnoverCheckKey>;
}

export const DEFAULT_WEIGHTS: ProjectWeightProfile = {
  mc: {
    walkdown: 10,
    hydrotest: 25,
    flushing: 15,
    reinstatement: 15,
    preservation: 10,
    punchA: 25,
  },
  comm: {
    energization: 10,
    loops: 20,
    ce: 15,
    functional: 25,
    performance: 15,
    reliability: 15,
  },
  turnover: {
    mc: 25,
    rfsu: 25,
    commComplete: 20,
    opsAccept: 20,
    ccc: 10,
  },
};

export const WEIGHT_BASIS: Record<keyof ProjectWeightProfile, { rationale: string; source: string }> = {
  mc: {
    rationale:
      "Hydrotest and A-punch closure are absolute gates — failure invalidates MC. Walkdown and preservation matter but rarely block.",
    source: "CII IR-272 · Shell DEP 80.00.10.11 · Saudi Aramco SAEP-1145",
  },
  comm: {
    rationale:
      "Functional + performance + reliability runs are the value-proving phase. Energisation alone proves nothing about operability.",
    source: "IPA Pacesetter benchmarks · IOGP Report 597 (C&E independence)",
  },
  turnover: {
    rationale:
      "MC and RFSU certificates dominate acceptance. Care-Custody-Control closes the legal handover and carries lower technical weight.",
    source: "Shell DEP 80.00.10.11 · IOGP JIP33 handover protocols",
  },
};

/** Resolve weights with project override fallback to defaults. */
export function resolveWeights(p?: Project | null): ProjectWeightProfile {
  const o = p?.progressWeights;
  return {
    mc: { ...DEFAULT_WEIGHTS.mc, ...(o?.mc ?? {}) },
    comm: { ...DEFAULT_WEIGHTS.comm, ...(o?.comm ?? {}) },
    turnover: { ...DEFAULT_WEIGHTS.turnover, ...(o?.turnover ?? {}) },
  };
}

/** Normalise a weight map so values sum to 100 (rounded). */
export function normalize<K extends string>(w: WeightMap<K>): WeightMap<K> {
  const total = (Object.values(w) as number[]).reduce((a, b) => a + b, 0) || 1;
  const out = {} as WeightMap<K>;
  (Object.keys(w) as K[]).forEach(k => {
    out[k] = Math.round(((w[k] as number) / total) * 100);
  });
  return out;
}

export const ALL_KEYS = {
  mc: MC_CHECK_KEYS,
  comm: COMM_CHECK_KEYS,
  turnover: TURNOVER_CHECK_KEYS,
};
