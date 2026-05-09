import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, useProject } from "@/lib/store";
import { EngineeringInsight } from "@/components/EngineeringInsight";
import { WorkflowNav } from "@/components/WorkflowNav";
import { Plus, Search, Trash2, RotateCcw, Check, Download } from "lucide-react";
import type { Discipline, PunchCategory, PunchStatus } from "@/lib/types";
import { exportPunchRegister } from "@/lib/exports";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/projects/$projectId/punch")({
  component: PunchPage,
});

const cats: PunchCategory[] = ["A","B","C"];
const statuses: PunchStatus[] = ["open","in_progress","closed"];
const disciplines: Discipline[] = ["Piping","Mechanical","Electrical","Instrumentation","Civil","Process","Telecom","HVAC","Fire & Gas"];

function PunchPage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId)!;
  const add = useStore(s => s.addPunch);
  const upd = useStore(s => s.updatePunch);
  const del = useStore(s => s.deletePunch);

  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState<PunchCategory | "all">("all");
  const [fStat, setFStat] = useState<PunchStatus | "all">("all");
  const [fDisc, setFDisc] = useState<Discipline | "all">("all");
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => project.punches.filter(p =>
    (fCat === "all" || p.category === fCat) &&
    (fStat === "all" || p.status === fStat) &&
    (fDisc === "all" || p.discipline === fDisc) &&
    (q === "" || p.title.toLowerCase().includes(q.toLowerCase()))
  ), [project.punches, q, fCat, fStat, fDisc]);

  const stats = {
    A: { open: project.punches.filter(p => p.category === "A" && p.status !== "closed").length, total: project.punches.filter(p => p.category === "A").length },
    B: { open: project.punches.filter(p => p.category === "B" && p.status !== "closed").length, total: project.punches.filter(p => p.category === "B").length },
    C: { open: project.punches.filter(p => p.category === "C" && p.status !== "closed").length, total: project.punches.filter(p => p.category === "C").length },
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <CatStat cat="A" tone="destructive" stats={stats.A} desc="Blocks MC / RFSU" />
        <CatStat cat="B" tone="warning" stats={stats.B} desc="Blocks Operations" />
        <CatStat cat="C" tone="muted" stats={stats.C} desc="Cosmetic / minor" />
      </div>

      <div className="panel p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search punch items…"
            className="w-full bg-input border border-border rounded-md pl-9 pr-3 py-2 text-sm" />
        </div>
        <Select value={fCat} onChange={setFCat as any} options={["all", ...cats]} label="Cat" />
        <Select value={fStat} onChange={setFStat as any} options={["all", ...statuses]} label="Status" />
        <Select value={fDisc} onChange={setFDisc as any} options={["all", ...disciplines]} label="Discipline" />
        <button onClick={() => exportPunchRegister(project)} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-semibold hover:bg-secondary/80">
          <Download className="h-3.5 w-3.5" /> Export
        </button>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> Raise Punch
        </button>
      </div>

      <div className="panel divide-y divide-border">
        {filtered.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No punch items match.</div>}
        {filtered.map(p => {
          const sys = project.systems.find(s => s.id === p.systemId);
          return (
            <div key={p.id} className="p-4 hover:bg-muted/20 flex items-start gap-4">
              <div className={cn(
                "h-10 w-10 rounded-md flex items-center justify-center font-bold text-sm",
                p.category === "A" && "bg-destructive/15 text-destructive border border-destructive/40",
                p.category === "B" && "bg-warning/15 text-warning border border-warning/40",
                p.category === "C" && "bg-muted text-muted-foreground border border-border",
              )}>{p.category}</div>
              <div className="flex-1 min-w-0">
                <div className={cn("font-medium", p.status === "closed" && "line-through text-muted-foreground")}>{p.title}</div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                  <span>{p.discipline}</span>
                  {sys && <><span>·</span><span className="font-mono text-accent">{sys.code}</span></>}
                  {p.responsible && <><span>·</span><span>{p.responsible}</span></>}
                  <span>·</span><span>raised {formatDistanceToNow(new Date(p.createdAt))} ago</span>
                  {p.dueDate && <><span>·</span><span className="text-warning">due {new Date(p.dueDate).toLocaleDateString()}</span></>}
                </div>
              </div>
              <select value={p.status} onChange={e => upd(project.id, p.id, { status: e.target.value as PunchStatus })}
                className="bg-input border border-border rounded-md px-2 py-1 text-xs">
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="closed">Closed</option>
              </select>
              {p.status === "closed" ? (
                <button onClick={() => upd(project.id, p.id, { status: "open" })} title="Reopen" className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-muted/50"><RotateCcw className="h-3.5 w-3.5" /></button>
              ) : (
                <button onClick={() => upd(project.id, p.id, { status: "closed" })} title="Close" className="h-8 w-8 rounded-md border border-success/40 text-success flex items-center justify-center hover:bg-success/10"><Check className="h-3.5 w-3.5" /></button>
              )}
              <button onClick={() => del(project.id, p.id)} title="Delete" className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-destructive/20 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          );
        })}
      </div>

      {showNew && <NewPunchDialog systems={project.systems} onClose={() => setShowNew(false)} onAdd={(d: any) => { add(project.id, d); setShowNew(false); }} />}

      <EngineeringInsight
        title="Punch Categories & Closeout Strategy"
        defaultOpen
        why={<><b>A</b>-punches block Mechanical Completion or RFSU — safety, integrity, and code-compliance issues. <b>B</b>-punches must be cleared before Operations Acceptance. <b>C</b>-punches are cosmetic and tracked through the warranty period.</>}
        problems={<>A-punches re-categorised to B to make milestones look better; punches raised without traceable tag/loop reference; no aging report so old items hide; vendor punches not segregated.</>}
        best={<>Walkdown teams own A/B classification — not project controls; every punch references a tag or weld; review aging weekly; use punch dashboards to drive turnover go/no-go meetings; never RFSU with open A-punches.</>}
      />

      <WorkflowNav
        prev={{ to: "/projects/$projectId/preservation", projectId: project.id, label: "Preservation" }}
        next={{ to: "/projects/$projectId/mc", projectId: project.id, label: "Mechanical Completion" }}
        related={{ to: "/projects/$projectId/workflow", projectId: project.id, label: "Workflow Engine" }}
      />
    </div>
  );
}

function CatStat({ cat, tone, stats, desc }: { cat: PunchCategory; tone: string; stats: { open: number; total: number }; desc: string }) {
  const colorMap: Record<string, string> = {
    destructive: "text-destructive border-destructive/40 bg-destructive/10",
    warning: "text-warning border-warning/40 bg-warning/10",
    muted: "text-muted-foreground border-border bg-muted/30",
  };
  return (
    <div className={cn("rounded-lg border p-4", colorMap[tone])}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest opacity-80">Category {cat}</div>
          <div className="text-3xl font-bold tabular-nums mt-1">{stats.open}<span className="text-base opacity-50">/{stats.total}</span></div>
          <div className="text-xs opacity-80 mt-1">{desc}</div>
        </div>
        <div className="text-5xl font-black opacity-20">{cat}</div>
      </div>
    </div>
  );
}

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: string[]; label: string }) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className="bg-input border border-border rounded-md px-2 py-1.5">
        {options.map(o => <option key={o} value={o}>{o === "all" ? "All" : o}</option>)}
      </select>
    </label>
  );
}

function NewPunchDialog({ systems, onClose, onAdd }: any) {
  const [f, setF] = useState({ title: "", category: "B" as PunchCategory, status: "open" as PunchStatus, discipline: "Piping" as Discipline, responsible: "", systemId: systems[0]?.id || "", dueDate: "", description: "" });
  return (
    <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="panel max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold">Raise Punch Item</h3>
        <div className="mt-4 grid gap-3">
          <input className="bg-input border border-border rounded-md px-3 py-2 text-sm" placeholder="Punch description (e.g. Missing flange gasket on P-1001A discharge)" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <select className="bg-input border border-border rounded-md px-3 py-2 text-sm" value={f.category} onChange={e => setF({ ...f, category: e.target.value as PunchCategory })}>
              {cats.map(c => <option key={c} value={c}>Cat {c}</option>)}
            </select>
            <select className="bg-input border border-border rounded-md px-3 py-2 text-sm" value={f.discipline} onChange={e => setF({ ...f, discipline: e.target.value as Discipline })}>
              {disciplines.map(d => <option key={d}>{d}</option>)}
            </select>
            <select className="bg-input border border-border rounded-md px-3 py-2 text-sm" value={f.systemId} onChange={e => setF({ ...f, systemId: e.target.value })}>
              {systems.map((s: any) => <option key={s.id} value={s.id}>{s.code}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="bg-input border border-border rounded-md px-3 py-2 text-sm" placeholder="Responsible" value={f.responsible} onChange={e => setF({ ...f, responsible: e.target.value })} />
            <input type="date" className="bg-input border border-border rounded-md px-3 py-2 text-sm" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/50">Cancel</button>
          <button disabled={!f.title} onClick={() => onAdd({ ...f, dueDate: f.dueDate ? new Date(f.dueDate).toISOString() : undefined })} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40">Create Punch</button>
        </div>
      </div>
    </div>
  );
}
