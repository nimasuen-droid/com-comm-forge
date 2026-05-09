import { createFileRoute, useParams } from "@tanstack/react-router";
import { useStore, useProject } from "@/lib/store";
import { ragColor, ragDot } from "@/lib/kpi";
import { EngineeringInsight } from "@/components/EngineeringInsight";
import { WorkflowNav } from "@/components/WorkflowNav";
import { FileCheck, ShieldCheck } from "lucide-react";
import type { RAG } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/$projectId/mc")({
  component: MCPage,
});

const checks = [
  { key: "walkdown", label: "Walkdown" },
  { key: "hydrotest", label: "Hydrotest" },
  { key: "flushing", label: "Flushing / Cleaning" },
  { key: "reinstatement", label: "Reinstatement" },
  { key: "preservation", label: "Preservation Active" },
  { key: "punchA", label: "No A-Punches" },
];

const rags: RAG[] = ["grey","red","amber","green"];

function MCPage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId)!;
  const update = useStore(s => s.updateSubsystem);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-success" /> Mechanical Completion</h2>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
          <FileCheck className="h-3.5 w-3.5" /> Generate MC Dossier
        </button>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Subsystem</th>
              <th className="px-2 py-3">Discipline</th>
              {checks.map(c => <th key={c.key} className="px-2 py-3 text-center">{c.label}</th>)}
              <th className="px-2 py-3 text-center">MC Status</th>
              <th className="px-2 py-3 text-center">Open A</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {project.systems.flatMap(sys => sys.subsystems.map(ss => {
              const openA = project.punches.filter(p => p.systemId === sys.id && p.category === "A" && p.status !== "closed").length;
              const fakeChecks = ss.mcStatus === "green" ? 6 : ss.mcStatus === "amber" ? 4 : ss.mcStatus === "red" ? 2 : 0;
              return (
                <tr key={ss.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{ss.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{sys.code} · {ss.code}</div>
                  </td>
                  <td className="px-2 py-3 text-xs text-muted-foreground">{ss.discipline}</td>
                  {checks.map((_, i) => (
                    <td key={i} className="px-2 py-3 text-center">
                      <span className={cn("inline-block h-2.5 w-2.5 rounded-full", i < fakeChecks ? "bg-success" : "bg-muted-foreground/30")} />
                    </td>
                  ))}
                  <td className="px-2 py-3 text-center">
                    <select value={ss.mcStatus} onChange={e => update(project.id, sys.id, ss.id, { mcStatus: e.target.value as RAG })}
                      className={cn("text-xs font-bold rounded px-2 py-1 border", ragColor[ss.mcStatus], "border-transparent")}>
                      {rags.map(r => <option key={r} value={r} className="bg-background text-foreground">{r}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-3 text-center">
                    {openA > 0 ? <span className="text-destructive font-bold tabular-nums">{openA}</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>

      <EngineeringInsight
        title="Mechanical Completion — what really drives acceptance"
        defaultOpen
        why={<>MC is the formal handover from <b>Construction</b> to <b>Commissioning</b>. It certifies that the subsystem is built per spec, hydro-tested, flushed/cleaned, reinstated, preserved, and free of A-punches. Without true MC, commissioning teams are dragged back into construction rework.</>}
        problems={<>MC declared with open hydrotest packs; reinstatement done after MC (causing FME violations); preservation logs missing for long lay-up; vendor scopes not closed out.</>}
        best={<>Treat MC as a hard gate. Require: signed walkdown, hydrotest pack, flushing certificate, FME register closed, preservation register active, A-punch list = 0. Witness with operations to remove handover surprises.</>}
      />

      <WorkflowNav
        prev={{ to: `/projects/${project.id}/punch`, label: "Punch List" }}
        next={{ to: `/projects/${project.id}/commissioning`, label: "Commissioning" }}
        dependency={{ to: `/projects/${project.id}/systems`, label: "Systemization" }}
      />
    </div>
  );
}
