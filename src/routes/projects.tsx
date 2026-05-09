import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { exportProject, useStore } from "@/lib/store";
import { projectKpis } from "@/lib/kpi";
import { PercentBar } from "@/components/StatusBits";
import { Plus, Copy, Archive, ArchiveRestore, Trash2, Download, Upload, FolderOpen } from "lucide-react";
import type { Project } from "@/lib/types";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects — Completions & Commissioning Pro" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const projects = useStore(s => s.projects);
  const create = useStore(s => s.createProject);
  const dup = useStore(s => s.duplicateProject);
  const arch = useStore(s => s.archiveProject);
  const del = useStore(s => s.deleteProject);
  const importP = useStore(s => s.importProject);
  const setActive = useStore(s => s.setActive);

  const [showNew, setShowNew] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const visible = projects.filter(p => showArchived ? p.archived : !p.archived);

  const handleImport = (file: File) => {
    file.text().then(t => {
      try { importP(JSON.parse(t)); } catch { alert("Invalid project file"); }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Project Management</div>
          <h1 className="text-3xl font-bold mt-1">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">Create, duplicate, archive, and exchange completions projects.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowArchived(s => !s)} className="rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted/50">
            {showArchived ? "Show Active" : "Show Archived"}
          </button>
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted/50">
            <Upload className="h-3.5 w-3.5" /> Import JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} />
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> New Project
          </button>
        </div>
      </div>

      {showNew && <NewProjectDialog onClose={() => setShowNew(false)} onCreate={(d) => { const id = create(d); setActive(id); setShowNew(false); }} />}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.length === 0 && (
          <div className="panel col-span-full p-10 text-center text-muted-foreground">
            No {showArchived ? "archived" : "active"} projects.
          </div>
        )}
        {visible.map(p => {
          const k = projectKpis(p);
          return (
            <div key={p.id} className="panel p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{p.client}</div>
                  <div className="text-base font-bold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.location} · {p.type}</div>
                </div>
                <span className="tag-chip">{k.systems}S / {k.subsystems}SS</span>
              </div>

              <div className="mt-4 space-y-2.5">
                <Row label="MC" value={k.mcPct} tone="success" />
                <Row label="Comm" value={k.commPct} tone="primary" />
                <Row label="Handover" value={k.handoverPct} tone="accent" />
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="tag-chip !bg-destructive/15 !border-destructive/30 text-destructive">A {k.punchA}</span>
                <span className="tag-chip !bg-warning/15 !border-warning/30 text-warning">B {k.punchB}</span>
                <span className="tag-chip">C {k.punchC}</span>
              </div>

              <div className="mt-5 flex items-center gap-1.5 flex-wrap">
                <Link to="/projects/$projectId/systems" params={{ projectId: p.id }} onClick={() => setActive(p.id)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  <FolderOpen className="h-3.5 w-3.5" /> Open
                </Link>
                <IconBtn onClick={() => dup(p.id)} title="Duplicate"><Copy className="h-3.5 w-3.5" /></IconBtn>
                <IconBtn onClick={() => exportProject(p)} title="Export JSON"><Download className="h-3.5 w-3.5" /></IconBtn>
                <IconBtn onClick={() => arch(p.id, !p.archived)} title={p.archived ? "Unarchive" : "Archive"}>
                  {p.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                </IconBtn>
                <IconBtn onClick={() => confirm(`Delete project "${p.name}"?`) && del(p.id)} title="Delete" tone="destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </IconBtn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: number; tone: any }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold tabular-nums">{value}%</span>
      </div>
      <div className="mt-1"><PercentBar value={value} tone={tone} /></div>
    </div>
  );
}

function IconBtn({ children, onClick, title, tone = "default" }: { children: React.ReactNode; onClick: () => void; title: string; tone?: "default" | "destructive" }) {
  return (
    <button onClick={onClick} title={title}
      className={`h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-muted/50 ${tone === "destructive" ? "hover:bg-destructive/20 hover:text-destructive hover:border-destructive/40" : ""}`}>
      {children}
    </button>
  );
}

function NewProjectDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (d: Pick<Project,"name"|"client"|"location"|"type"|"description">) => void }) {
  const [form, setForm] = useState({ name: "", client: "", location: "", type: "Refinery Brownfield Revamp", description: "" });
  return (
    <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="panel max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold">Create New Project</h2>
        <p className="text-sm text-muted-foreground mt-1">Set up a completions workspace for an EPC project.</p>
        <div className="mt-5 grid gap-3">
          <Field label="Project Name"><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Yamal LNG Train 4 Pre-Comm" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Client"><input className="input" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} placeholder="Operator" /></Field>
            <Field label="Location"><input className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Site / country" /></Field>
          </div>
          <Field label="Project Type">
            <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option>Refinery Brownfield Revamp</option>
              <option>Refinery Greenfield</option>
              <option>Petrochemical Complex</option>
              <option>LNG Liquefaction</option>
              <option>Offshore Platform</option>
              <option>FPSO</option>
              <option>Pipeline / Terminal</option>
              <option>Utilities / Power</option>
            </select>
          </Field>
          <Field label="Description"><textarea className="input min-h-20" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Scope, units in scope, milestones…" /></Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/50">Cancel</button>
          <button disabled={!form.name || !form.client} onClick={() => onCreate(form)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
            Create Project
          </button>
        </div>
      </div>
      <style>{`.input{width:100%;background:var(--color-input);border:1px solid var(--color-border);border-radius:.375rem;padding:.5rem .65rem;font-size:.875rem;color:var(--color-foreground);outline:none}.input:focus{border-color:var(--color-primary)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
