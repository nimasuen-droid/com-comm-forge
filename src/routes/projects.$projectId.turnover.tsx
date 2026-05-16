import { createFileRoute, useParams } from "@tanstack/react-router";
import { useProject, useStore } from "@/lib/store";
import { ragColor } from "@/lib/kpi";
import { turnoverProgress, TURNOVER_CHECK_LABELS, deriveTurnoverStatus } from "@/lib/derive";
import { TURNOVER_CHECK_KEYS, type TurnoverCheckKey } from "@/lib/types";
import { exportHandoverDossier } from "@/lib/exports";
import { EngineeringInsight } from "@/components/EngineeringInsight";
import { LearnRail } from "@/components/LearnCard";
import { WorkflowNav } from "@/components/WorkflowNav";
import { SaveBar } from "@/components/SaveBar";
import { WeightingBasis } from "@/components/WeightingBasis";
import { useDirtyForm } from "@/lib/useDirtyForm";
import { PackageCheck, FileCheck2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/$projectId/turnover")({
  component: TurnoverPage,
});

function TurnoverPage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId)!;
  const replaceSystems = useStore((s) => s.replaceSystems);
  const form = useDirtyForm(project.systems);

  const setCheck = (sysId: string, subId: string, key: TurnoverCheckKey, value: boolean) => {
    form.setDraft((systems) =>
      systems.map((sys) =>
        sys.id !== sysId
          ? sys
          : {
              ...sys,
              subsystems: sys.subsystems.map((ss) =>
                ss.id !== subId
                  ? ss
                  : {
                      ...ss,
                      turnoverChecks: { ...(ss.turnoverChecks ?? {}), [key]: value },
                    },
              ),
            },
      ),
    );
  };

  const handleSave = () => {
    const draft = form.getDraft();
    const tempProject = { ...project, systems: draft };
    const next = draft.map((sys) => ({
      ...sys,
      subsystems: sys.subsystems.map((ss) => ({
        ...ss,
        turnoverStatus: deriveTurnoverStatus(tempProject, sys, ss),
      })),
    }));
    replaceSystems(project.id, next);
    form.commit(next);
  };

  return (
    <div className="space-y-5">
      <LearnRail module="turnover" title="Learn: Turnover & Handover" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <PackageCheck className="h-5 w-5 text-accent" /> Turnover & Handover
        </h2>
        <button
          onClick={() => exportHandoverDossier(project)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <FileCheck2 className="h-3.5 w-3.5" /> Generate Handover Dossier (.xlsx)
        </button>
      </div>

      <div className="panel p-5">
        <h3 className="font-semibold mb-3">Turnover Phases</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {TURNOVER_CHECK_KEYS.map((k, i) => (
            <div key={k} className="rounded border border-border bg-card p-3 text-center">
              <div className="text-[10px] font-mono text-muted-foreground">PHASE {i + 1}</div>
              <div className="text-sm font-semibold mt-1">{TURNOVER_CHECK_LABELS[k]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/30 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Subsystem</th>
              {TURNOVER_CHECK_KEYS.map((k, i) => (
                <th key={k} className="px-2 py-3 text-center">
                  {i + 1}. {TURNOVER_CHECK_LABELS[k]}
                </th>
              ))}
              <th className="px-2 py-3 text-center">Progress</th>
              <th className="px-2 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {form.draft.flatMap((sys) =>
              sys.subsystems.map((ss) => {
                const { pct } = turnoverProgress(ss, project);
                return (
                  <tr key={ss.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{ss.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {sys.code} · {ss.code}
                      </div>
                    </td>
                    {TURNOVER_CHECK_KEYS.map((k) => {
                      const checked = !!ss.turnoverChecks?.[k];
                      return (
                        <td key={k} className="px-2 py-3 text-center">
                          <button
                            onClick={() => setCheck(sys.id, ss.id, k, !checked)}
                            title={TURNOVER_CHECK_LABELS[k]}
                            className={cn(
                              "inline-flex h-6 w-6 items-center justify-center rounded border transition",
                              checked
                                ? "bg-accent border-accent text-accent-foreground"
                                : "border-border bg-background hover:bg-muted/40",
                            )}
                          >
                            {checked && <Check className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-2 py-3 text-center text-xs font-bold tabular-nums">{pct}%</td>
                    <td className="px-2 py-3 text-center">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded text-xs font-bold",
                          ragColor[ss.turnoverStatus],
                        )}
                      >
                        {ss.turnoverStatus}
                      </span>
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>

      <WeightingBasis project={project} module="turnover" />

      <SaveBar
        moduleLabel="Turnover & Handover"
        isDirty={form.isDirty}
        lastSaved={form.lastSaved}
        onSave={handleSave}
        onDiscard={form.discard}
      />

      <EngineeringInsight
        title="Why turnover is phased"
        defaultOpen
        why={
          <>
            Operations cannot accept the entire plant in one go. Phased turnover transfers{" "}
            <b>care, custody &amp; control</b> subsystem by subsystem. Each tick is a contractual
            gate.
          </>
        }
        problems={
          <>
            Dossiers incomplete (missing as-builts, vendor manuals); operations refuses to sign
            because punches not reconciled; ambiguity over who maintains preservation post-MC.
          </>
        }
        best={
          <>
            Build the dossier as you go — never at the end; require operations witnessing from MC
            walkdowns; export the Handover Dossier and walk it system-by-system with the asset team.
          </>
        }
      />

      <WorkflowNav
        prev={{
          to: "/projects/$projectId/commissioning",
          projectId: project.id,
          label: "Commissioning",
        }}
        next={{
          to: "/projects/$projectId/preservation",
          projectId: project.id,
          label: "Preservation",
        }}
        related={{
          to: "/projects/$projectId/documents",
          projectId: project.id,
          label: "Documentation",
        }}
      />
    </div>
  );
}
