import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useProject, useStore } from "@/lib/store";
import { exportMcDossier, exportHandoverDossier, exportPunchRegister, exportPreservation, exportSystemRegister } from "@/lib/exports";
import { EngineeringInsight } from "@/components/EngineeringInsight";
import { WorkflowNav } from "@/components/WorkflowNav";
import { FileText, Plus, Trash2, Download, ShieldCheck, PackageCheck, ListChecks, Wrench, Network } from "lucide-react";

export const Route = createFileRoute("/projects/$projectId/documents")({
  component: DocsPage,
});

const docTypes = ["MC Certificate","Hydrotest Pack","Loop Folder","Preservation Record","SAT Report","FAT Report","Vendor Manual","Turnover Dossier","Punch Register"];

function DocsPage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId)!;
  const add = useStore(s => s.addDocument);
  const del = useStore(s => s.deleteDocument);
  const [name, setName] = useState(""); const [type, setType] = useState(docTypes[0]); const [sysId, setSysId] = useState("");

  const reports = [
    { label: "System Register", icon: Network, run: () => exportSystemRegister(project) },
    { label: "Punch Register", icon: ListChecks, run: () => exportPunchRegister(project) },
    { label: "MC Dossier", icon: ShieldCheck, run: () => exportMcDossier(project) },
    { label: "Handover Dossier", icon: PackageCheck, run: () => exportHandoverDossier(project) },
    { label: "Preservation Log", icon: Wrench, run: () => exportPreservation(project) },
  ];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-info" /> Documentation & Reports</h2>

      <div className="panel p-4">
        <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Generate project deliverables (Excel)</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {reports.map(r => (
            <button key={r.label} onClick={r.run} className="flex items-center gap-2 rounded-md border border-border bg-card hover:bg-muted/40 px-3 py-3 text-left">
              <r.icon className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{r.label}</div>
                <div className="text-[10px] text-muted-foreground">.xlsx</div>
              </div>
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      <div className="panel p-4 grid md:grid-cols-4 gap-2">
        <input className="bg-input border border-border rounded-md px-3 py-2 text-sm md:col-span-2" placeholder="Document name (e.g. 20-IA-001 MC Certificate)" value={name} onChange={e => setName(e.target.value)} />
        <select className="bg-input border border-border rounded-md px-3 py-2 text-sm" value={type} onChange={e => setType(e.target.value)}>{docTypes.map(t => <option key={t}>{t}</option>)}</select>
        <select className="bg-input border border-border rounded-md px-3 py-2 text-sm" value={sysId} onChange={e => setSysId(e.target.value)}>
          <option value="">— No system —</option>
          {project.systems.map(s => <option key={s.id} value={s.id}>{s.code}</option>)}
        </select>
        <button disabled={!name} onClick={() => { add(project.id, { name, type, systemId: sysId || undefined }); setName(""); }}
          className="md:col-span-4 inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
          <Plus className="h-3.5 w-3.5" /> Register Document
        </button>
      </div>

      <div className="panel divide-y divide-border">
        {project.documents.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No documents registered.</div>}
        {project.documents.map(d => {
          const sys = project.systems.find(s => s.id === d.systemId);
          return (
            <div key={d.id} className="p-3 flex items-center gap-3 hover:bg-muted/20">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{d.name}</div>
                <div className="text-xs text-muted-foreground">{d.type}{sys ? ` · ${sys.code}` : ""} · {new Date(d.uploadedAt).toLocaleDateString()}</div>
              </div>
              <button onClick={() => del(project.id, d.id)} className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-destructive/20 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <EngineeringInsight
        title="Documentation drives handover acceptance"
        why={<>The dossier is the deliverable. If MC certificates, hydrotest packs, loop folders, and vendor manuals aren't reconciled, operations will refuse acceptance regardless of physical readiness.</>}
        problems={<>Dossier compiled at the end → missing signatures, lost certificates; vendor docs not in dossier index; punch register not reconciled with closeout records.</>}
        best={<>Build the dossier per subsystem in real time; require document numbers on every workflow gate; one master dossier index per turnover package.</>}
      />

      <WorkflowNav
        prev={{ to: "/projects/$projectId/preservation", projectId: project.id, label: "Preservation" }}
        next={{ to: "/projects/$projectId/workflow", projectId: project.id, label: "Workflow Engine" }}
      />
    </div>
  );
}
