import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, useProject } from "@/lib/store";
import { ragDot } from "@/lib/kpi";
import { EngineeringInsight } from "@/components/EngineeringInsight";
import { LearnRail } from "@/components/LearnCard";
import { WorkflowNav } from "@/components/WorkflowNav";
import { SaveBar } from "@/components/SaveBar";
import { useDirtyForm } from "@/lib/useDirtyForm";
import { Plus, ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import type { Discipline, RAG, SystemPriority, SystemNode, Subsystem } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/$projectId/systems")({
  component: SystemsPage,
});

const disciplines: Discipline[] = ["Piping","Mechanical","Electrical","Instrumentation","Civil","Process","Telecom","HVAC","Fire & Gas"];
const priorities: SystemPriority[] = ["Low","Medium","High","Critical"];
const rags: RAG[] = ["grey","red","amber","green"];

const uid = () => Math.random().toString(36).slice(2, 10);

function SystemsPage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId)!;
  const replaceSystems = useStore(s => s.replaceSystems);
  const form = useDirtyForm(project.systems);

  const updateSubsystem = (sysId: string, subId: string, patch: Partial<Subsystem>) => {
    form.setDraft(systems => systems.map(s => s.id !== sysId ? s : {
      ...s,
      subsystems: s.subsystems.map(ss => ss.id === subId ? { ...ss, ...patch } : ss),
    }));
  };
  const deleteSubsystem = (sysId: string, subId: string) => {
    form.setDraft(systems => systems.map(s => s.id !== sysId ? s : {
      ...s,
      subsystems: s.subsystems.filter(ss => ss.id !== subId),
    }));
  };
  const addSubsystem = (sysId: string, sub: Omit<Subsystem, "id">) => {
    const newSub: Subsystem = { id: uid(), ...sub };
    form.setDraft(systems => systems.map(s => s.id !== sysId ? s : { ...s, subsystems: [...s.subsystems, newSub] }));
  };
  const addSystem = (sys: Omit<SystemNode, "id" | "subsystems">) => {
    const newSys: SystemNode = { id: uid(), subsystems: [], ...sys };
    form.setDraft(systems => [...systems, newSys]);
  };
  const deleteSystem = (sysId: string) => {
    form.setDraft(systems => systems.filter(s => s.id !== sysId));
  };

  const handleSave = () => {
    replaceSystems(project.id, form.draft);
    form.commit();
  };

  const [open, setOpen] = useState<Record<string, boolean>>(Object.fromEntries(project.systems.map(s => [s.id, true])));
  const [showNewSys, setShowNewSys] = useState(false);

  return (
    <div className="space-y-5">
      <LearnRail module="systems" title="Learn: Systemization" />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Systemization</h2>
        <button onClick={() => setShowNewSys(true)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> New System
        </button>
      </div>

      <div className="panel divide-y divide-border">
        {project.systems.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">No systems defined. Create your first system to start subsystem breakdown.</div>
        )}
        {form.draft.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">No systems defined. Create your first system to start subsystem breakdown.</div>
        )}
        {form.draft.map(sys => (
          <div key={sys.id}>
            <div className="flex items-center gap-3 p-4 hover:bg-muted/20">
              <button onClick={() => setOpen(o => ({ ...o, [sys.id]: !o[sys.id] }))} className="text-muted-foreground">
                {open[sys.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-accent">{sys.code}</span>
                  <span className="font-semibold">{sys.name}</span>
                  <span className={cn("tag-chip", sys.priority === "Critical" && "!bg-destructive/15 !border-destructive/40 text-destructive")}>{sys.priority}</span>
                  <span className="tag-chip">{sys.ownerDiscipline}</span>
                </div>
                {sys.description && <div className="text-xs text-muted-foreground mt-0.5">{sys.description}</div>}
              </div>
              <span className="text-xs text-muted-foreground font-mono">{sys.subsystems.length} subsystems</span>
              <button onClick={() => { if (confirm("Delete system and all its subsystems? (Save to commit)")) deleteSystem(sys.id); }} className="text-muted-foreground hover:text-destructive p-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {open[sys.id] && (
              <div className="bg-background/40 border-t border-border">
                <div className="px-4 py-2 grid grid-cols-12 gap-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  <div className="col-span-2">Code</div>
                  <div className="col-span-3">Subsystem</div>
                  <div className="col-span-2">Discipline</div>
                  <div className="col-span-1 text-center">MC</div>
                  <div className="col-span-1 text-center">RFSU</div>
                  <div className="col-span-1 text-center">Comm</div>
                  <div className="col-span-1 text-center">Handover</div>
                  <div className="col-span-1"></div>
                </div>
                {sys.subsystems.map(ss => (
                  <div key={ss.id} className="px-4 py-2.5 grid grid-cols-12 gap-3 items-center text-sm border-t border-border/50 hover:bg-muted/20">
                    <div className="col-span-2 font-mono text-xs text-accent">{ss.code}</div>
                    <div className="col-span-3">
                      <div className="font-medium">{ss.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{ss.tags.join(", ")}</div>
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground">{ss.discipline}</div>
                    {(["mcStatus","rfsuStatus","commStatus","turnoverStatus"] as const).map(k => (
                      <div key={k} className="col-span-1 flex justify-center">
                        <select value={ss[k]} onChange={e => updateSubsystem(sys.id, ss.id, { [k]: e.target.value as RAG })}
                          className="bg-transparent border border-border rounded px-1 py-0.5 text-xs">
                          {rags.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    ))}
                    <div className="col-span-1 flex justify-end">
                      <button onClick={() => deleteSubsystem(sys.id, ss.id)} className="text-muted-foreground hover:text-destructive p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <AddSubsystemRow onAdd={(d) => addSubsystem(sys.id, d)} />
              </div>
            )}
          </div>
        ))}
      </div>

      {showNewSys && <NewSystemDialog onClose={() => setShowNewSys(false)} onAdd={(d) => { addSystem(d); setShowNewSys(false); }} />}

      <SaveBar
        moduleLabel="Systemization"
        isDirty={form.isDirty}
        lastSaved={form.lastSaved}
        onSave={handleSave}
        onDiscard={form.discard}
      />

      <EngineeringInsight
        title="Systemization & Subsystem Breakdown"
        defaultOpen
        why={<>Systems carve the plant into commissioning packages. Subsystems are the smallest units that can be <b>walked down, energised, and turned over</b> independently. The breakdown drives MC, RFSU, commissioning sequence, and operations acceptance.</>}
        problems={<>Boundaries follow P&IDs only — ignoring constructibility; utilities not split first; ICSS loops span multiple subsystems creating turnover deadlocks; vendor packages lumped with field-erected scope.</>}
        best={<>Split utilities (IA, N₂, cooling water, electrical) ahead of process; align subsystem boundaries with isolation valves and electrical breakers; lock the SBS in the project's <b>Master Tag Register</b> before walkdowns begin.</>}
      />

      <WorkflowNav
        next={{ to: "/projects/$projectId/preservation", projectId: project.id, label: "Preservation" }}
        related={{ to: "/projects/$projectId/workflow", projectId: project.id, label: "Workflow Engine" }}
      />
    </div>
  );
}

function AddSubsystemRow({ onAdd }: { onAdd: (d: any) => void }) {
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [disc, setDisc] = useState<Discipline>("Piping");
  return (
    <div className="px-4 py-2.5 border-t border-border/50 grid grid-cols-12 gap-2 items-center">
      <input className="col-span-2 bg-input border border-border rounded px-2 py-1 text-xs" placeholder="Code" value={code} onChange={e => setCode(e.target.value)} />
      <input className="col-span-4 bg-input border border-border rounded px-2 py-1 text-xs" placeholder="Subsystem name" value={name} onChange={e => setName(e.target.value)} />
      <select className="col-span-3 bg-input border border-border rounded px-2 py-1 text-xs" value={disc} onChange={e => setDisc(e.target.value as Discipline)}>
        {disciplines.map(d => <option key={d}>{d}</option>)}
      </select>
      <button disabled={!name || !code} onClick={() => { onAdd({ name, code, discipline: disc, tags: [], mcStatus: "grey", rfsuStatus: "grey", commStatus: "grey", turnoverStatus: "grey" }); setName(""); setCode(""); }}
        className="col-span-3 inline-flex items-center justify-center gap-1.5 rounded bg-secondary border border-border px-2 py-1 text-xs hover:bg-secondary/80 disabled:opacity-40">
        <Plus className="h-3 w-3" /> Add Subsystem
      </button>
    </div>
  );
}

function NewSystemDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (d: any) => void }) {
  const [f, setF] = useState({ name: "", code: "", description: "", priority: "Medium" as SystemPriority, ownerDiscipline: "Mechanical" as Discipline });
  return (
    <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="panel max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold">New System</h3>
        <div className="mt-4 grid gap-3">
          <input className="bg-input border border-border rounded-md px-3 py-2 text-sm" placeholder="System code (e.g. 30-CW)" value={f.code} onChange={e => setF({ ...f, code: e.target.value })} />
          <input className="bg-input border border-border rounded-md px-3 py-2 text-sm" placeholder="System name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          <textarea className="bg-input border border-border rounded-md px-3 py-2 text-sm min-h-20" placeholder="Description" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <select className="bg-input border border-border rounded-md px-3 py-2 text-sm" value={f.priority} onChange={e => setF({ ...f, priority: e.target.value as SystemPriority })}>
              {priorities.map(p => <option key={p}>{p}</option>)}
            </select>
            <select className="bg-input border border-border rounded-md px-3 py-2 text-sm" value={f.ownerDiscipline} onChange={e => setF({ ...f, ownerDiscipline: e.target.value as Discipline })}>
              {disciplines.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/50">Cancel</button>
          <button disabled={!f.name || !f.code} onClick={() => onAdd(f)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40">Create</button>
        </div>
      </div>
    </div>
  );
}
