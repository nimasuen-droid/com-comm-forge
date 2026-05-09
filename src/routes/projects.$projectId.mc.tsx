import { createFileRoute, useParams } from "@tanstack/react-router";
import { useStore, useProject } from "@/lib/store";
import { ragColor } from "@/lib/kpi";
import { mcProgress, openAPunchesFor, MC_CHECK_LABELS } from "@/lib/derive";
import { MC_CHECK_KEYS } from "@/lib/types";
import { exportMcDossier } from "@/lib/exports";
import { EngineeringInsight } from "@/components/EngineeringInsight";
import { WorkflowNav } from "@/components/WorkflowNav";
import { FileCheck, ShieldCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/$projectId/mc")({
  component: MCPage,
});

function MCPage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId)!;
  const setCheck = useStore(s => s.setSubsystemCheck);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-success" /> Mechanical Completion</h2>
        <button onClick={() => exportMcDossier(project)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
          <FileCheck className="h-3.5 w-3.5" /> Generate MC Dossier (.xlsx)
        </button>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Subsystem</th>
              <th className="px-2 py-3">Discipline</th>
              {MC_CHECK_KEYS.map(k => <th key={k} className="px-2 py-3 text-center" title={MC_CHECK_LABELS[k]}>{MC_CHECK_LABELS[k]}</th>)}
              <th className="px-2 py-3 text-center">Progress</th>
              <th className="px-2 py-3 text-center">MC Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {project.systems.flatMap(sys => sys.subsystems.map(ss => {
              const openA = openAPunchesFor(project, sys, ss).length;
              const { pct } = mcProgress(ss, openA === 0);
              return (
                <tr key={ss.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{ss.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{sys.code} · {ss.code}</div>
                  </td>
                  <td className="px-2 py-3 text-xs text-muted-foreground">{ss.discipline}</td>
                  {MC_CHECK_KEYS.map(k => {
                    const auto = k === "punchA";
                    const checked = auto ? openA === 0 : !!ss.mcChecks?.[k];
                    return (
                      <td key={k} className="px-2 py-3 text-center">
                        <button
                          disabled={auto}
                          onClick={() => setCheck(project.id, sys.id, ss.id, "mc", k, !checked)}
                          title={auto ? `Auto: ${openA} open A-punches on this system` : MC_CHECK_LABELS[k]}
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded border transition",
                            checked ? "bg-success border-success text-success-foreground" : "border-border bg-background hover:bg-muted/40",
                            auto && "opacity-80 cursor-not-allowed"
                          )}
                        >
                          {checked && <Check className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-2 py-3 text-center">
                    <div className="text-xs font-bold tabular-nums">{pct}%</div>
                    {openA > 0 && <div className="text-[10px] text-destructive">{openA} A-punch{openA > 1 ? "es" : ""}</div>}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-bold", ragColor[ss.mcStatus])}>{ss.mcStatus}</span>
                  </td>
                </tr>
              );
            }))}
            {project.systems.length === 0 && (
              <tr><td colSpan={9} className="p-8 text-center text-muted-foreground text-sm">Define systems and subsystems first.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <EngineeringInsight
        title="Mechanical Completion — what really drives acceptance"
        defaultOpen
        why={<>MC is the formal handover from <b>Construction</b> to <b>Commissioning</b>. Tick the six gates per subsystem; A-punch closure is automatic from the punch list.</>}
        problems={<>MC declared with open hydrotest packs; reinstatement done after MC; preservation logs missing; vendor scopes not closed out.</>}
        best={<>Treat each row as a hard gate. Generate the MC Dossier when all rows are green and use it to drive the MC walkdown with operations.</>}
      />

      <WorkflowNav
        prev={{ to: "/projects/$projectId/punch", projectId: project.id, label: "Punch List" }}
        next={{ to: "/projects/$projectId/commissioning", projectId: project.id, label: "Commissioning" }}
        dependency={{ to: "/projects/$projectId/systems", projectId: project.id, label: "Systemization" }}
      />
    </div>
  );
}
