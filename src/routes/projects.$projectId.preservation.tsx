import { createFileRoute, useParams } from "@tanstack/react-router";
import { useProject, useStore } from "@/lib/store";
import { exportPreservation } from "@/lib/exports";
import { EngineeringInsight } from "@/components/EngineeringInsight";
import { WorkflowNav } from "@/components/WorkflowNav";
import { Wrench, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/$projectId/preservation")({
  component: PresPage,
});

function PresPage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId)!;
  const update = useStore(s => s.updateSubsystem);

  const items = project.systems.flatMap(sys => sys.subsystems.map(ss => ({ sys, ss })));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><Wrench className="h-5 w-5 text-info" /> Preservation Register</h2>
        <button onClick={() => exportPreservation(project)} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-semibold hover:bg-secondary/80">
          <Download className="h-3.5 w-3.5" /> Export Log
        </button>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Subsystem</th>
              <th className="px-2 py-3">Discipline</th>
              <th className="px-2 py-3">Interval (days)</th>
              <th className="px-2 py-3">Last Done</th>
              <th className="px-2 py-3">Next Due</th>
              <th className="px-2 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map(({ sys, ss }) => {
              const interval = ss.preservation?.interval ?? 0;
              const last = ss.preservation?.lastDone ? new Date(ss.preservation.lastDone) : null;
              const next = last && interval ? new Date(last.getTime() + interval * 86400000) : null;
              const overdue = next ? next < new Date() : false;
              return (
                <tr key={ss.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{ss.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{sys.code} · {ss.code}</div>
                  </td>
                  <td className="px-2 py-3 text-xs text-muted-foreground">{ss.discipline}</td>
                  <td className="px-2 py-3">
                    <input type="number" value={interval} onChange={e => update(project.id, sys.id, ss.id, { preservation: { ...ss.preservation, interval: Number(e.target.value) } })}
                      className="w-20 bg-input border border-border rounded px-2 py-1 text-xs" />
                  </td>
                  <td className="px-2 py-3 text-xs">
                    <input type="date" value={ss.preservation?.lastDone?.slice(0,10) ?? ""} onChange={e => update(project.id, sys.id, ss.id, { preservation: { ...ss.preservation, interval, lastDone: e.target.value ? new Date(e.target.value).toISOString() : undefined } })}
                      className="bg-input border border-border rounded px-2 py-1 text-xs" />
                  </td>
                  <td className={cn("px-2 py-3 text-xs", overdue && "text-destructive font-bold")}>
                    {next ? next.toLocaleDateString() : "—"}
                  </td>
                  <td className="px-2 py-3">
                    <span className={cn("tag-chip", overdue ? "!bg-destructive/15 !border-destructive/40 text-destructive" : interval ? "!bg-success/15 !border-success/40 text-success" : "")}>
                      {overdue ? "Overdue" : interval ? "Active" : "Not set"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <EngineeringInsight
        title="Preservation — silent killer of commissioning schedules"
        defaultOpen
        why={<>Equipment in lay-up degrades — bearings flat-spot, motor windings absorb moisture, instrument transmitters drift, piping internals corrode. Failures appear at first run, weeks after MC, with no clear owner.</>}
        problems={<>Logs stop after MC; rotating equipment not turned monthly; N₂ blanket pressure not maintained; battery rooms left without trickle charge.</>}
        best={<>Treat preservation as a live register from delivery to start-up; assign owner per subsystem; audit monthly with operations; re-baseline preservation when systems change custody.</>}
      />

      <WorkflowNav
        prev={{ to: "/projects/$projectId/systems", projectId: project.id, label: "Systemization" }}
        next={{ to: "/projects/$projectId/punch", projectId: project.id, label: "Punch List" }}
      />
    </div>
  );
}
