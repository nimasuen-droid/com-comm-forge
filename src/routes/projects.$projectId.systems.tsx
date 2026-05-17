import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, useProject } from "@/lib/store";
import { ragTextColor } from "@/lib/kpi";
import { EngineeringInsight } from "@/components/EngineeringInsight";
import { LearnRail } from "@/components/LearnCard";
import { WorkflowNav } from "@/components/WorkflowNav";
import { RagLegend } from "@/components/RagLegend";
import { SaveBar } from "@/components/SaveBar";
import { useDirtyForm } from "@/lib/useDirtyForm";
import { Plus, ChevronRight, ChevronDown, Trash2, Search, Pencil } from "lucide-react";
import type { Discipline, RAG, SystemPriority, SystemNode, Subsystem } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/$projectId/systems")({
  component: SystemsPage,
});

const disciplines: Discipline[] = [
  "Piping",
  "Mechanical",
  "Electrical",
  "Instrumentation",
  "Civil",
  "Process",
  "Telecom",
  "HVAC",
  "Fire & Gas",
];
const priorities: SystemPriority[] = ["Low", "Medium", "High", "Critical"];
const rags: RAG[] = ["grey", "red", "amber", "green"];

const uid = () => Math.random().toString(36).slice(2, 10);
type NewSubsystemInput = Omit<Subsystem, "id">;
type NewSystemInput = Omit<SystemNode, "id" | "subsystems">;

function SystemsPage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId)!;
  const replaceSystems = useStore((s) => s.replaceSystems);
  const form = useDirtyForm(project.systems);

  const updateSubsystem = (sysId: string, subId: string, patch: Partial<Subsystem>) => {
    form.setDraft((systems) =>
      systems.map((s) =>
        s.id !== sysId
          ? s
          : {
              ...s,
              subsystems: s.subsystems.map((ss) => (ss.id === subId ? { ...ss, ...patch } : ss)),
            },
      ),
    );
  };
  const deleteSubsystem = (sysId: string, subId: string) => {
    form.setDraft((systems) =>
      systems.map((s) =>
        s.id !== sysId
          ? s
          : {
              ...s,
              subsystems: s.subsystems.filter((ss) => ss.id !== subId),
            },
      ),
    );
  };
  const addSubsystem = (sysId: string, sub: Omit<Subsystem, "id">) => {
    const newSub: Subsystem = { id: uid(), ...sub };
    form.setDraft((systems) =>
      systems.map((s) => (s.id !== sysId ? s : { ...s, subsystems: [...s.subsystems, newSub] })),
    );
  };
  const addSystem = (sys: Omit<SystemNode, "id" | "subsystems">) => {
    const newSys: SystemNode = { id: uid(), subsystems: [], ...sys };
    form.setDraft((systems) => [...systems, newSys]);
  };
  const updateSystem = (sysId: string, patch: Partial<SystemNode>) => {
    form.setDraft((systems) => systems.map((s) => (s.id === sysId ? { ...s, ...patch } : s)));
  };
  const deleteSystem = (sysId: string) => {
    form.setDraft((systems) => systems.filter((s) => s.id !== sysId));
  };

  const handleSave = () => {
    const next = form.getDraft();
    replaceSystems(project.id, next);
    form.commit(next);
  };

  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(project.systems.map((s) => [s.id, true])),
  );
  const [showNewSys, setShowNewSys] = useState(false);
  const [editingSystem, setEditingSystem] = useState<SystemNode | null>(null);
  const [editingSubsystem, setEditingSubsystem] = useState<{
    systemId: string;
    subsystem: Subsystem;
  } | null>(null);
  const [q, setQ] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<Discipline | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<SystemPriority | "all">("all");
  const visibleSystems = form.draft.filter((sys) => {
    const query = q.trim().toLowerCase();
    const matchesQuery =
      query === "" ||
      sys.name.toLowerCase().includes(query) ||
      sys.code.toLowerCase().includes(query) ||
      sys.subsystems.some(
        (ss) =>
          ss.name.toLowerCase().includes(query) ||
          ss.code.toLowerCase().includes(query) ||
          ss.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    return (
      matchesQuery &&
      (disciplineFilter === "all" || sys.ownerDiscipline === disciplineFilter) &&
      (priorityFilter === "all" || sys.priority === priorityFilter)
    );
  });

  return (
    <div className="space-y-5">
      <LearnRail module="systems" title="Learn: Systemization" />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Systemization</h2>
        <button
          onClick={() => setShowNewSys(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> New System
        </button>
      </div>

      <RagLegend />

      <div className="panel p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search systems, subsystems, tags"
            className="w-full bg-input border border-border rounded-md pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={disciplineFilter}
          onChange={(e) => setDisciplineFilter(e.target.value as Discipline | "all")}
          className="bg-input border border-border rounded-md px-3 py-2 text-xs"
        >
          <option value="all">All disciplines</option>
          {disciplines.map((discipline) => (
            <option key={discipline} value={discipline}>
              {discipline}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as SystemPriority | "all")}
          className="bg-input border border-border rounded-md px-3 py-2 text-xs"
        >
          <option value="all">All priorities</option>
          {priorities.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        <div className="text-xs text-muted-foreground">
          Showing <span className="font-bold text-foreground">{visibleSystems.length}</span> of{" "}
          {form.draft.length}
        </div>
      </div>

      <div className="panel divide-y divide-border">
        {form.draft.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No systems defined. Create your first system to start subsystem breakdown.
          </div>
        )}
        {form.draft.length > 0 && visibleSystems.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No systems match the current filters.
          </div>
        )}
        {visibleSystems.map((sys) => (
          <div key={sys.id}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 hover:bg-muted/20">
              <button
                onClick={() => setOpen((o) => ({ ...o, [sys.id]: !o[sys.id] }))}
                className="text-muted-foreground"
              >
                {open[sys.id] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-accent">{sys.code}</span>
                  <span className="font-semibold">{sys.name}</span>
                  <span
                    className={cn(
                      "tag-chip",
                      sys.priority === "Critical" &&
                        "!bg-destructive/15 !border-destructive/40 text-destructive",
                    )}
                  >
                    {sys.priority}
                  </span>
                  <span className="tag-chip">{sys.ownerDiscipline}</span>
                </div>
                {sys.description && (
                  <div className="text-xs text-muted-foreground mt-0.5">{sys.description}</div>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-mono sm:text-right">
                {sys.subsystems.length} subsystems
              </span>
              <button
                onClick={() => setEditingSystem(sys)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete system and all its subsystems? (Save to commit)"))
                    deleteSystem(sys.id);
                }}
                className="text-muted-foreground hover:text-destructive p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {open[sys.id] && (
              <div className="bg-background/40 border-t border-border">
                <div className="hidden md:grid px-4 py-2 grid-cols-12 gap-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  <div className="col-span-2">Code</div>
                  <div className="col-span-3">Subsystem</div>
                  <div className="col-span-2">Discipline</div>
                  <div className="col-span-1 text-center">MC</div>
                  <div className="col-span-1 text-center">RFSU</div>
                  <div className="col-span-1 text-center">Comm</div>
                  <div className="col-span-1 text-center">Handover</div>
                  <div className="col-span-1"></div>
                </div>
                {sys.subsystems.map((ss) => (
                  <div
                    key={ss.id}
                    className="px-4 py-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-start md:items-center text-sm border-t border-border/50 hover:bg-muted/20"
                  >
                    <div className="md:col-span-2 font-mono text-xs text-accent">{ss.code}</div>
                    <div className="md:col-span-3 min-w-0">
                      <div className="font-medium">{ss.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {ss.tags.join(", ")}
                      </div>
                    </div>
                    <div className="md:col-span-2 text-xs text-muted-foreground">
                      {ss.discipline}
                    </div>
                    {(["mcStatus", "rfsuStatus", "commStatus", "turnoverStatus"] as const).map(
                      (k) => (
                        <div
                          key={k}
                          className="md:col-span-1 flex items-center justify-between md:justify-center gap-2"
                        >
                          <span className="md:hidden text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                            {k.replace("Status", "")}
                          </span>
                          <select
                            value={ss[k]}
                            onChange={(e) =>
                              updateSubsystem(sys.id, ss.id, { [k]: e.target.value as RAG })
                            }
                            className={cn(
                              "bg-transparent border border-border rounded px-1 py-0.5 text-xs font-semibold",
                              ragTextColor[ss[k]],
                            )}
                          >
                            {rags.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      ),
                    )}
                    <div className="md:col-span-1 flex justify-end gap-1">
                      <button
                        onClick={() => setEditingSubsystem({ systemId: sys.id, subsystem: ss })}
                        className="text-muted-foreground hover:text-foreground p-1"
                        aria-label={`Edit subsystem ${ss.code}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteSubsystem(sys.id, ss.id)}
                        className="text-muted-foreground hover:text-destructive p-1"
                        aria-label={`Delete subsystem ${ss.code}`}
                      >
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

      {showNewSys && (
        <SystemDialog
          title="New System"
          submitLabel="Create"
          onClose={() => setShowNewSys(false)}
          onAdd={(d) => {
            addSystem(d);
            setShowNewSys(false);
          }}
        />
      )}
      {editingSystem && (
        <SystemDialog
          title="Edit System"
          submitLabel="Update"
          initial={editingSystem}
          onClose={() => setEditingSystem(null)}
          onAdd={(d) => {
            updateSystem(editingSystem.id, d);
            setEditingSystem(null);
          }}
        />
      )}
      {editingSubsystem && (
        <SubsystemDialog
          initial={editingSubsystem.subsystem}
          onClose={() => setEditingSubsystem(null)}
          onSave={(patch) => {
            updateSubsystem(editingSubsystem.systemId, editingSubsystem.subsystem.id, patch);
            setEditingSubsystem(null);
          }}
        />
      )}

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
        why={
          <>
            Systems carve the plant into commissioning packages. Subsystems are the smallest units
            that can be <b>walked down, energised, and turned over</b> independently. The breakdown
            drives MC, RFSU, commissioning sequence, and operations acceptance.
          </>
        }
        problems={
          <>
            Boundaries follow P&IDs only — ignoring constructibility; utilities not split first;
            ICSS loops span multiple subsystems creating turnover deadlocks; vendor packages lumped
            with field-erected scope.
          </>
        }
        best={
          <>
            Split utilities (IA, N₂, cooling water, electrical) ahead of process; align subsystem
            boundaries with isolation valves and electrical breakers; lock the SBS in the project's{" "}
            <b>Master Tag Register</b> before walkdowns begin.
          </>
        }
      />

      <WorkflowNav
        next={{
          to: "/projects/$projectId/preservation",
          projectId: project.id,
          label: "Preservation",
        }}
        related={{
          to: "/projects/$projectId/workflow",
          projectId: project.id,
          label: "Workflow Engine",
        }}
      />
    </div>
  );
}

function AddSubsystemRow({ onAdd }: { onAdd: (d: NewSubsystemInput) => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [disc, setDisc] = useState<Discipline>("Piping");
  return (
    <div className="px-4 py-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
      <input
        className="sm:col-span-2 bg-input border border-border rounded px-2 py-2 sm:py-1 text-xs"
        placeholder="Code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <input
        className="sm:col-span-4 bg-input border border-border rounded px-2 py-2 sm:py-1 text-xs"
        placeholder="Subsystem name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <select
        className="sm:col-span-3 bg-input border border-border rounded px-2 py-2 sm:py-1 text-xs"
        value={disc}
        onChange={(e) => setDisc(e.target.value as Discipline)}
      >
        {disciplines.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>
      <button
        disabled={!name || !code}
        onClick={() => {
          onAdd({
            name,
            code,
            discipline: disc,
            tags: [],
            mcStatus: "grey",
            rfsuStatus: "grey",
            commStatus: "grey",
            turnoverStatus: "grey",
          });
          setName("");
          setCode("");
        }}
        className="sm:col-span-3 inline-flex items-center justify-center gap-1.5 rounded bg-secondary border border-border px-2 py-2 sm:py-1 text-xs hover:bg-secondary/80 disabled:opacity-40"
      >
        <Plus className="h-3 w-3" /> Add Subsystem
      </button>
    </div>
  );
}

function SystemDialog({
  title,
  submitLabel,
  initial,
  onClose,
  onAdd,
}: {
  title: string;
  submitLabel: string;
  initial?: SystemNode;
  onClose: () => void;
  onAdd: (d: NewSystemInput) => void;
}) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    code: initial?.code ?? "",
    description: initial?.description ?? "",
    priority: initial?.priority ?? ("Medium" as SystemPriority),
    ownerDiscipline: initial?.ownerDiscipline ?? ("Mechanical" as Discipline),
  });
  return (
    <div
      className="fixed inset-0 z-40 bg-background/80 backdrop-blur flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="panel max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold">{title}</h3>
        <div className="mt-4 grid gap-3">
          <input
            className="bg-input border border-border rounded-md px-3 py-2 text-sm"
            placeholder="System code (e.g. 30-CW)"
            value={f.code}
            onChange={(e) => setF({ ...f, code: e.target.value })}
          />
          <input
            className="bg-input border border-border rounded-md px-3 py-2 text-sm"
            placeholder="System name"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
          <textarea
            className="bg-input border border-border rounded-md px-3 py-2 text-sm min-h-20"
            placeholder="Description"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              className="bg-input border border-border rounded-md px-3 py-2 text-sm"
              value={f.priority}
              onChange={(e) => setF({ ...f, priority: e.target.value as SystemPriority })}
            >
              {priorities.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select
              className="bg-input border border-border rounded-md px-3 py-2 text-sm"
              value={f.ownerDiscipline}
              onChange={(e) => setF({ ...f, ownerDiscipline: e.target.value as Discipline })}
            >
              {disciplines.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            disabled={!f.name || !f.code}
            onClick={() => onAdd(f)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubsystemDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: Subsystem;
  onClose: () => void;
  onSave: (patch: Partial<Subsystem>) => void;
}) {
  const [f, setF] = useState({
    name: initial.name,
    code: initial.code,
    discipline: initial.discipline,
    tags: initial.tags.join(", "),
    mcStatus: initial.mcStatus,
    rfsuStatus: initial.rfsuStatus,
    commStatus: initial.commStatus,
    turnoverStatus: initial.turnoverStatus,
    notes: initial.notes ?? "",
  });
  const tagList = f.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-40 bg-background/80 backdrop-blur flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="panel max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold">Edit Subsystem</h3>
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              className="bg-input border border-border rounded-md px-3 py-2 text-sm"
              placeholder="Subsystem code"
              value={f.code}
              onChange={(e) => setF({ ...f, code: e.target.value })}
            />
            <select
              className="bg-input border border-border rounded-md px-3 py-2 text-sm"
              value={f.discipline}
              onChange={(e) => setF({ ...f, discipline: e.target.value as Discipline })}
            >
              {disciplines.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <input
            className="bg-input border border-border rounded-md px-3 py-2 text-sm"
            placeholder="Subsystem name"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
          <input
            className="bg-input border border-border rounded-md px-3 py-2 text-sm"
            placeholder="Tags, separated by commas"
            value={f.tags}
            onChange={(e) => setF({ ...f, tags: e.target.value })}
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                ["mcStatus", "MC"],
                ["rfsuStatus", "RFSU"],
                ["commStatus", "Comm"],
                ["turnoverStatus", "Handover"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="grid gap-1 text-xs">
                <span className="font-mono uppercase tracking-wider text-muted-foreground">
                  {label}
                </span>
                <select
                  className="bg-input border border-border rounded-md px-2 py-2 text-xs"
                  value={f[key]}
                  onChange={(e) => setF({ ...f, [key]: e.target.value as RAG })}
                >
                  {rags.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <textarea
            className="bg-input border border-border rounded-md px-3 py-2 text-sm min-h-20"
            placeholder="Notes"
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            disabled={!f.name || !f.code}
            onClick={() =>
              onSave({
                name: f.name,
                code: f.code,
                discipline: f.discipline,
                tags: tagList,
                mcStatus: f.mcStatus,
                rfsuStatus: f.rfsuStatus,
                commStatus: f.commStatus,
                turnoverStatus: f.turnoverStatus,
                notes: f.notes || undefined,
              })
            }
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
