import { createFileRoute, useParams } from "@tanstack/react-router";
import { useProject, useStore } from "@/lib/store";
import { ragDot } from "@/lib/kpi";
import { EngineeringInsight } from "@/components/EngineeringInsight";
import { WorkflowNav } from "@/components/WorkflowNav";
import { Activity, Zap, Cpu, Flame, Droplets, Wind } from "lucide-react";
import type { RAG } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/$projectId/commissioning")({
  component: CommPage,
});

const stages = [
  { key: "energization", label: "Energisation", icon: Zap, desc: "MV/LV bus, breakers, MCC tested" },
  { key: "loops", label: "Loop Checks", icon: Cpu, desc: "Field-to-DCS continuity & calibration" },
  { key: "ce", label: "Cause & Effect", icon: Flame, desc: "F&G/SIS interlock validation" },
  { key: "functional", label: "Functional Test", icon: Activity, desc: "End-to-end logic & sequence" },
  { key: "performance", label: "Performance Test", icon: Wind, desc: "Capacity & guarantee" },
  { key: "reliability", label: "Reliability Run", icon: Droplets, desc: "72-hr/7-day continuous run" },
];

const rags: RAG[] = ["grey","red","amber","green"];

function CommPage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId)!;
  const update = useStore(s => s.updateSubsystem);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Commissioning Sequence</h2>

      <div className="panel p-5">
        <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Commissioning Stage Map</div>
        <ol className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {stages.map((s, i) => (
            <li key={s.key} className="rounded-md border border-border bg-card p-3 relative">
              <div className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{i+1}</div>
              <s.icon className="h-5 w-5 text-primary mb-2" />
              <div className="font-semibold text-sm">{s.label}</div>
              <div className="text-xs text-muted-foreground mt-1 leading-tight">{s.desc}</div>
            </li>
          ))}
        </ol>
      </div>

      <div className="panel">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold">System Readiness Matrix</h3>
            <p className="text-xs text-muted-foreground">Set commissioning RAG per subsystem; utilities should be green before process systems energise.</p>
          </div>
        </div>
        <div className="p-4 grid gap-2">
          {project.systems.map(sys => (
            <div key={sys.id} className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-accent">{sys.code}</span>
                  <span className="font-semibold text-sm">{sys.name}</span>
                  <span className="tag-chip">{sys.priority}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {sys.subsystems.map(ss => (
                  <div key={ss.id} className="flex items-center gap-2 px-3 py-2 rounded border border-border bg-card text-sm">
                    <span className={cn("h-2 w-2 rounded-full", ragDot[ss.commStatus])} />
                    <span className="font-mono text-[10px] text-muted-foreground">{ss.code}</span>
                    <span className="flex-1 truncate">{ss.name}</span>
                    <select value={ss.commStatus} onChange={e => update(project.id, sys.id, ss.id, { commStatus: e.target.value as RAG })}
                      className="bg-input border border-border rounded px-1.5 py-0.5 text-xs">
                      {rags.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="panel p-4">
          <h3 className="text-sm font-semibold mb-2">Energisation Sequence</h3>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Main intake → MV switchgear → essential bus</li>
            <li>UPS &amp; battery rooms — 24 V DC for ICSS</li>
            <li>Instrument air compressors → dryers → ring main</li>
            <li>Cooling water / N₂ utility distribution</li>
            <li>Process unit MCCs &amp; field instruments</li>
            <li>SIS / F&amp;G activation → live cause &amp; effect</li>
          </ol>
        </div>
        <div className="panel p-4">
          <h3 className="text-sm font-semibold mb-2">Common Commissioning Bottlenecks</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>ICSS not stable when loop checks start — re-runs everywhere</li>
            <li>F&amp;G C&amp;E fails because field devices not in scan</li>
            <li>Vendors not on site for first start (compressors, turbines)</li>
            <li>Operations not ready to take custody — readiness review missed</li>
          </ul>
        </div>
      </div>

      <EngineeringInsight
        title="Why commissioning sequence matters"
        defaultOpen
        why={<>Sequence determines whether commissioning takes weeks or months. <b>Utilities-first</b> (power, IA, N₂, cooling water, ICSS) lets every downstream activity proceed. Process systems energised before utilities create cascading delays.</>}
        problems={<>Schedule pressure pushes process loop checks before ICSS is stable; vendors arrive after their package is needed; reliability runs start with open Cat-A items.</>}
        best={<>Lock the energisation order with operations and SIMOPS team; align vendor mobilisation to the readiness matrix; never skip a 72-hour reliability run; punch closure must trail commissioning, not block it — but never enter reliability with open A-punches.</>}
      />

      <WorkflowNav
        prev={{ to: `/projects/${project.id}/mc`, label: "Mechanical Completion" }}
        next={{ to: `/projects/${project.id}/turnover`, label: "Turnover & Handover" }}
        dependency={{ to: `/projects/${project.id}/mc`, label: "MC Complete" }}
      />
    </div>
  );
}
