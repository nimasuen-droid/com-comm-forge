import { createFileRoute, useParams } from "@tanstack/react-router";
import { useProject, useStore } from "@/lib/store";
import { ragColor } from "@/lib/kpi";
import { commProgress, COMM_CHECK_LABELS } from "@/lib/derive";
import { COMM_CHECK_KEYS } from "@/lib/types";
import { EngineeringInsight } from "@/components/EngineeringInsight";
import { WorkflowNav } from "@/components/WorkflowNav";
import { Activity, Zap, Cpu, Flame, Wind, Droplets, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/$projectId/commissioning")({
  component: CommPage,
});

const STAGE_META = {
  energization: { icon: Zap, desc: "MV/LV bus, breakers, MCC tested" },
  loops: { icon: Cpu, desc: "Field-to-DCS continuity & calibration" },
  ce: { icon: Flame, desc: "F&G/SIS interlock validation" },
  functional: { icon: Activity, desc: "End-to-end logic & sequence" },
  performance: { icon: Wind, desc: "Capacity & guarantee" },
  reliability: { icon: Droplets, desc: "72-hr / 7-day continuous run" },
} as const;

function CommPage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId)!;
  const setCheck = useStore(s => s.setSubsystemCheck);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Commissioning Sequence</h2>

      <div className="panel p-5">
        <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Commissioning Stage Map</div>
        <ol className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {COMM_CHECK_KEYS.map((k, i) => {
            const Meta = STAGE_META[k];
            return (
              <li key={k} className="rounded-md border border-border bg-card p-3 relative">
                <div className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{i+1}</div>
                <Meta.icon className="h-5 w-5 text-primary mb-2" />
                <div className="font-semibold text-sm">{COMM_CHECK_LABELS[k]}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-tight">{Meta.desc}</div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Subsystem</th>
              {COMM_CHECK_KEYS.map((k, i) => <th key={k} className="px-2 py-3 text-center">{i+1}. {COMM_CHECK_LABELS[k].split(" ")[0]}</th>)}
              <th className="px-2 py-3 text-center">Progress</th>
              <th className="px-2 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {project.systems.flatMap(sys => sys.subsystems.map(ss => {
              const { pct } = commProgress(ss);
              const mcDone = (ss.mcChecks?.walkdown && ss.mcChecks?.hydrotest && ss.mcChecks?.flushing && ss.mcChecks?.reinstatement);
              return (
                <tr key={ss.id} className={cn("hover:bg-muted/20", !mcDone && "opacity-60")}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{ss.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{sys.code} · {ss.code} · {ss.discipline}</div>
                    {!mcDone && <div className="text-[10px] text-warning mt-0.5">MC incomplete — commissioning gated</div>}
                  </td>
                  {COMM_CHECK_KEYS.map(k => {
                    const checked = !!ss.commChecks?.[k];
                    return (
                      <td key={k} className="px-2 py-3 text-center">
                        <button
                          onClick={() => setCheck(project.id, sys.id, ss.id, "comm", k, !checked)}
                          title={COMM_CHECK_LABELS[k]}
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded border transition",
                            checked ? "bg-primary border-primary text-primary-foreground" : "border-border bg-background hover:bg-muted/40"
                          )}
                        >
                          {checked && <Check className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-2 py-3 text-center text-xs font-bold tabular-nums">{pct}%</td>
                  <td className="px-2 py-3 text-center">
                    <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-bold", ragColor[ss.commStatus])}>{ss.commStatus}</span>
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>

      <EngineeringInsight
        title="Why commissioning sequence matters"
        defaultOpen
        why={<>Each tick advances commissioning RAG automatically. Sequence (utilities first, then process) determines whether commissioning takes weeks or months.</>}
        problems={<>Schedule pressure pushes process loop checks before ICSS is stable; vendors arrive after their package is needed; reliability runs start with open A-punches.</>}
        best={<>Lock energisation order with operations and SIMOPS team; align vendor mobilisation to readiness; never enter reliability run with open A-punches.</>}
      />

      <WorkflowNav
        prev={{ to: "/projects/$projectId/mc", projectId: project.id, label: "Mechanical Completion" }}
        next={{ to: "/projects/$projectId/turnover", projectId: project.id, label: "Turnover & Handover" }}
        dependency={{ to: "/projects/$projectId/mc", projectId: project.id, label: "MC Complete" }}
      />
    </div>
  );
}
