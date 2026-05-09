import { createFileRoute, useParams } from "@tanstack/react-router";
import { useProject } from "@/lib/store";
import { deriveWorkflow } from "@/lib/derive";
import { PercentBar } from "@/components/StatusBits";
import { EngineeringInsight } from "@/components/EngineeringInsight";
import { WorkflowNav } from "@/components/WorkflowNav";
import { GitBranch, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/projects/$projectId/workflow")({
  component: WorkflowPage,
});

const steps = [
  { key: "construction", label: "Construction Completion", desc: "Mechanical erection, welding, painting, insulation complete." },
  { key: "mc", label: "Mechanical Completion", desc: "Hydrotest, flushing, reinstatement, FME closed, A-punches = 0." },
  { key: "precomm", label: "Pre-commissioning", desc: "Cold work — alignment, lubrication, energisation prep." },
  { key: "commissioning", label: "Commissioning", desc: "Loop checks, C&E, functional test, performance." },
  { key: "startup", label: "Start-up", desc: "First feed introduction, transition to operating conditions." },
  { key: "reliability", label: "Reliability Run", desc: "Continuous operation at design — typically 72 hr to 7 days." },
  { key: "handover", label: "Handover", desc: "Operations Acceptance — Care, Custody & Control transfer." },
] as const;

function WorkflowPage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId)!;
  const wf = deriveWorkflow(project);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><GitBranch className="h-5 w-5 text-accent" /> Workflow Engine</h2>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Auto-derived from MC, Commissioning & Turnover modules</span>
      </div>

      <div className="panel p-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {steps.map((s, i) => {
            const v = wf[s.key];
            return (
              <div key={s.key} className="flex items-center gap-2 shrink-0">
                <div className="rounded-md border border-border bg-card px-3 py-2 min-w-44">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Step {i+1}</div>
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="mt-2"><PercentBar value={v} tone={v >= 80 ? "success" : v >= 40 ? "warning" : "destructive"} /></div>
                  <div className="text-[10px] mt-1 text-muted-foreground tabular-nums">{v}%</div>
                </div>
                {i < steps.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel divide-y divide-border">
        {steps.map(s => (
          <div key={s.key} className="p-4 grid md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-4">
              <div className="font-semibold text-sm">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.desc}</div>
            </div>
            <div className="md:col-span-7"><PercentBar value={wf[s.key]} tone="primary" /></div>
            <div className="md:col-span-1 text-right text-sm font-bold tabular-nums">{wf[s.key]}%</div>
          </div>
        ))}
      </div>

      <EngineeringInsight
        title="The completions value chain"
        defaultOpen
        why={<>Percentages here are <b>derived live</b> from the per-subsystem MC, Commissioning, and Turnover checklists. To advance a step, tick the underlying gates in those modules.</>}
        problems={<>Construction declared complete with open weld NDE; commissioning loops run on unstable ICSS; reliability run aborted early due to instrument drift.</>}
        best={<>Hard-gate every transition. This workflow is the single source of truth across construction, commissioning, vendors, and operations.</>}
      />

      <WorkflowNav prev={{ to: "/projects/$projectId/documents", projectId: project.id, label: "Documentation" }} />
    </div>
  );
}
