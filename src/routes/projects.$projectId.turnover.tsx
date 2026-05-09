import { createFileRoute, useParams } from "@tanstack/react-router";
import { useProject, useStore } from "@/lib/store";
import { ragDot } from "@/lib/kpi";
import { EngineeringInsight } from "@/components/EngineeringInsight";
import { WorkflowNav } from "@/components/WorkflowNav";
import { PackageCheck, FileCheck2 } from "lucide-react";
import type { RAG } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/$projectId/turnover")({
  component: TurnoverPage,
});

const rags: RAG[] = ["grey","red","amber","green"];

function TurnoverPage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId)!;
  const update = useStore(s => s.updateSubsystem);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><PackageCheck className="h-5 w-5 text-accent" /> Turnover & Handover</h2>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
          <FileCheck2 className="h-3.5 w-3.5" /> Generate Handover Dossier
        </button>
      </div>

      <div className="panel p-5">
        <h3 className="font-semibold mb-3">Turnover Phases</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {["Subsystem MC", "RFSU", "Commissioning Complete", "Operations Acceptance", "Care, Custody & Control"].map((p, i) => (
            <div key={p} className="rounded border border-border bg-card p-3 text-center">
              <div className="text-[10px] font-mono text-muted-foreground">PHASE {i+1}</div>
              <div className="text-sm font-semibold mt-1">{p}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel divide-y divide-border">
        {project.systems.map(sys => (
          <div key={sys.id} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-xs text-accent">{sys.code}</span>
              <span className="font-semibold">{sys.name}</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {sys.subsystems.map(ss => (
                <div key={ss.id} className="flex items-center gap-3 rounded border border-border bg-background/40 px-3 py-2">
                  <span className={cn("h-2 w-2 rounded-full", ragDot[ss.turnoverStatus])} />
                  <span className="font-mono text-[10px] text-muted-foreground">{ss.code}</span>
                  <span className="flex-1 text-sm truncate">{ss.name}</span>
                  <select value={ss.turnoverStatus} onChange={e => update(project.id, sys.id, ss.id, { turnoverStatus: e.target.value as RAG })}
                    className="bg-input border border-border rounded px-1.5 py-0.5 text-xs">
                    {rags.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <EngineeringInsight
        title="Why turnover is phased"
        defaultOpen
        why={<>Operations cannot accept the entire plant in one go. Phased turnover allows utilities and shared systems to be operated by the asset team while construction continues elsewhere. Each turnover boundary is a contractual and safety transfer of <b>care, custody &amp; control</b>.</>}
        problems={<>Turnover dossiers incomplete (missing as-builts, vendor manuals); operations refuses to sign because punch lists not reconciled; ambiguity over who maintains preservation post-MC.</>}
        best={<>Build the dossier as you go — never at the end; require operations witnessing from MC walkdowns; use a turnover certificate that lists every required document with sign-off.</>}
      />

      <WorkflowNav
        prev={{ to: `/projects/${project.id}/commissioning`, label: "Commissioning" }}
        next={{ to: `/projects/${project.id}/preservation`, label: "Preservation" }}
        related={{ to: `/projects/${project.id}/documents`, label: "Documentation" }}
      />
    </div>
  );
}
