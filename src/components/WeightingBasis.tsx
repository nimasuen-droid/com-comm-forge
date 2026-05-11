import { useState } from "react";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { DEFAULT_WEIGHTS, WEIGHT_BASIS, resolveWeights, normalize, ALL_KEYS, type ProjectWeightProfile } from "@/lib/weights";
import { MC_CHECK_LABELS, COMM_CHECK_LABELS, TURNOVER_CHECK_LABELS } from "@/lib/derive";
import { Scale, Edit3, RotateCcw, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModuleKey = keyof ProjectWeightProfile;

const LABELS: Record<ModuleKey, Record<string, string>> = {
  mc: MC_CHECK_LABELS,
  comm: COMM_CHECK_LABELS,
  turnover: TURNOVER_CHECK_LABELS,
};

const TITLES: Record<ModuleKey, string> = {
  mc: "Mechanical Completion",
  comm: "Commissioning",
  turnover: "Turnover & Handover",
};

export function WeightingBasis({ project, module }: { project: Project; module: ModuleKey }) {
  const updateProject = useStore(s => s.updateProject);
  const [editing, setEditing] = useState(false);

  const resolved = resolveWeights(project)[module];
  const normalised = normalize(resolved);
  const isOverridden = !!project.progressWeights?.[module];
  const basis = WEIGHT_BASIS[module];
  const keys = ALL_KEYS[module];

  const [draft, setDraft] = useState<Record<string, number>>(resolved);
  const draftTotal = Object.values(draft).reduce((a, b) => a + (Number(b) || 0), 0);

  const startEdit = () => {
    setDraft({ ...resolved });
    setEditing(true);
  };
  const save = () => {
    updateProject(project.id, {
      progressWeights: { ...(project.progressWeights ?? {}), [module]: draft },
    });
    setEditing(false);
  };
  const resetToDefault = () => {
    const next = { ...(project.progressWeights ?? {}) };
    delete (next as Record<string, unknown>)[module];
    updateProject(project.id, { progressWeights: next });
    setEditing(false);
  };

  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2.5 min-w-0">
          <Scale className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-sm font-bold flex items-center gap-2 flex-wrap">
              {TITLES[module]} progress weighting
              <span className={cn(
                "text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border",
                isOverridden ? "bg-warning/15 border-warning/40 text-warning" : "bg-success/10 border-success/30 text-success"
              )}>
                {isOverridden ? "Project override" : "Industry default"}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              <span className="text-foreground/80">Basis:</span> {basis.rationale}
            </div>
            <div className="text-[10px] text-muted-foreground/80 font-mono mt-0.5">Sources: {basis.source}</div>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {!editing && (
            <>
              {isOverridden && (
                <button onClick={resetToDefault} className="inline-flex items-center gap-1 rounded-md border border-border px-2 h-7 text-[11px] font-semibold hover:bg-muted/50">
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
              <button onClick={startEdit} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 h-7 text-[11px] font-semibold hover:bg-secondary/80">
                <Edit3 className="h-3 w-3" /> Override
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {keys.map(k => {
          const def = (DEFAULT_WEIGHTS[module] as Record<string, number>)[k];
          const current = editing ? (draft[k] ?? 0) : normalised[k];
          const max = Math.max(40, ...Object.values(normalised));
          return (
            <div key={k} className="rounded-md border border-border bg-card/40 p-2">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-xs font-medium truncate">{LABELS[module][k]}</div>
                {editing ? (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft[k] ?? 0}
                    onChange={e => setDraft({ ...draft, [k]: Number(e.target.value) })}
                    className="w-14 bg-input border border-border rounded px-1.5 py-0.5 text-xs text-right tabular-nums"
                  />
                ) : (
                  <div className="text-xs font-bold tabular-nums shrink-0">{current}%</div>
                )}
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full transition-all", isOverridden && !editing ? "bg-warning" : "bg-primary")}
                  style={{ width: `${Math.min(100, (current / max) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                default {def}%{current !== def && !editing ? ` · was ${def}%` : ""}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap border-t border-border pt-3">
          <div className="text-[11px] text-muted-foreground">
            Sum: <span className={cn("font-bold tabular-nums", draftTotal === 0 ? "text-destructive" : "text-foreground")}>{draftTotal}</span>
            <span className="ml-2 text-muted-foreground/70">— values normalise automatically to 100%.</span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setEditing(false)} className="inline-flex items-center gap-1 rounded-md border border-border px-3 h-8 text-xs font-semibold hover:bg-muted/50">
              <X className="h-3 w-3" /> Cancel
            </button>
            <button onClick={save} disabled={draftTotal === 0} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 h-8 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
              <Check className="h-3 w-3" /> Save weights
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
