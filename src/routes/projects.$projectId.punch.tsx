import { createFileRoute, useParams } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { useStore, useProject } from "@/lib/store";
import { EngineeringInsight } from "@/components/EngineeringInsight";
import { LearnRail } from "@/components/LearnCard";
import { WorkflowNav } from "@/components/WorkflowNav";
import { SaveBar } from "@/components/SaveBar";
import { useDirtyForm } from "@/lib/useDirtyForm";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  Plus,
  Search,
  Trash2,
  RotateCcw,
  Check,
  Download,
  Wifi,
  WifiOff,
  Camera,
  ClipboardCheck,
  Clock,
  X,
} from "lucide-react";
import type { Discipline, PunchCategory, PunchItem, PunchStatus, SystemNode } from "@/lib/types";
import { exportPunchRegister } from "@/lib/exports";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/projects/$projectId/punch")({
  component: PunchPage,
});

const cats: PunchCategory[] = ["A", "B", "C"];
const statuses: PunchStatus[] = ["open", "in_progress", "closed"];
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

const uid = () => Math.random().toString(36).slice(2, 10);
type PunchView = "all" | "critical" | "overdue" | "field";
type PunchSort = "age_desc" | "due_asc" | "category" | "system";

const optionLabel = (value: string) =>
  value === "all"
    ? "All"
    : value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .replace("Asc", "ASC")
        .replace("Desc", "DESC");

function punchAgeDays(punch: PunchItem) {
  return Math.max(0, Math.floor((Date.now() - new Date(punch.createdAt).getTime()) / 86400000));
}

function isOverdue(punch: PunchItem) {
  return !!punch.dueDate && punch.status !== "closed" && new Date(punch.dueDate) < new Date();
}

function PunchPage() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId)!;
  const replacePunches = useStore((s) => s.replacePunches);
  const form = useDirtyForm(project.punches);
  const isMobile = useIsMobile();
  const online = useOnlineStatus();

  const upd = (punchId: string, patch: Partial<PunchItem>) => {
    form.setDraft((punches) =>
      punches.map((x) =>
        x.id === punchId
          ? {
              ...x,
              ...patch,
              closedAt: patch.status === "closed" ? new Date().toISOString() : x.closedAt,
            }
          : x,
      ),
    );
  };
  const del = (punchId: string) => {
    form.setDraft((punches) => punches.filter((x) => x.id !== punchId));
  };
  const add = (data: Omit<PunchItem, "id" | "createdAt">) => {
    const np: PunchItem = { id: uid(), createdAt: new Date().toISOString(), ...data };
    form.setDraft((punches) => [np, ...punches]);
  };
  const handleSave = () => {
    replacePunches(project.id, form.draft);
    form.commit();
  };

  const [q, setQ] = useState("");
  const [fCat, setFCat] = useState<PunchCategory | "all">("all");
  const [fStat, setFStat] = useState<PunchStatus | "all">("all");
  const [fDisc, setFDisc] = useState<Discipline | "all">("all");
  const [view, setView] = useState<PunchView>("all");
  const [sort, setSort] = useState<PunchSort>("age_desc");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(
    () =>
      form.draft
        .filter(
          (p) =>
            (fCat === "all" || p.category === fCat) &&
            (fStat === "all" || p.status === fStat) &&
            (fDisc === "all" || p.discipline === fDisc) &&
            (view === "all" || view === "field" || p.category === "A" || view !== "critical") &&
            (view !== "overdue" || isOverdue(p)) &&
            (q === "" || p.title.toLowerCase().includes(q.toLowerCase())),
        )
        .sort((a, b) => {
          if (sort === "due_asc") {
            return (
              new Date(a.dueDate ?? "2999-12-31").getTime() -
              new Date(b.dueDate ?? "2999-12-31").getTime()
            );
          }
          if (sort === "category") return a.category.localeCompare(b.category);
          if (sort === "system") return (a.systemId ?? "").localeCompare(b.systemId ?? "");
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
    [form.draft, q, fCat, fStat, fDisc, view, sort],
  );

  const selectedIds = Object.entries(selected)
    .filter(([, value]) => value)
    .map(([id]) => id);
  const selectedCount = selectedIds.length;

  const bulkUpdateStatus = (status: PunchStatus) => {
    form.setDraft((punches) =>
      punches.map((punch) =>
        selected[punch.id]
          ? {
              ...punch,
              status,
              closedAt: status === "closed" ? new Date().toISOString() : punch.closedAt,
            }
          : punch,
      ),
    );
    setSelected({});
  };

  const bulkDelete = () => {
    form.setDraft((punches) => punches.filter((punch) => !selected[punch.id]));
    setSelected({});
  };

  const stats = {
    A: {
      open: form.draft.filter((p) => p.category === "A" && p.status !== "closed").length,
      total: form.draft.filter((p) => p.category === "A").length,
    },
    B: {
      open: form.draft.filter((p) => p.category === "B" && p.status !== "closed").length,
      total: form.draft.filter((p) => p.category === "B").length,
    },
    C: {
      open: form.draft.filter((p) => p.category === "C" && p.status !== "closed").length,
      total: form.draft.filter((p) => p.category === "C").length,
    },
  };
  const overdueCount = form.draft.filter(isOverdue).length;
  const pendingSync = project.syncStatus === "pending" || form.isDirty;

  return (
    <div className="space-y-5">
      <LearnRail module="punch" title="Learn: Punch List" />
      <FieldStatusBar online={online} pendingSync={pendingSync} isMobile={isMobile} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CatStat cat="A" tone="destructive" stats={stats.A} desc="Blocks MC / RFSU" />
        <CatStat cat="B" tone="warning" stats={stats.B} desc="Blocks Operations" />
        <CatStat cat="C" tone="muted" stats={stats.C} desc="Cosmetic / minor" />
      </div>

      <div className="panel p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-full sm:min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search punch items…"
            className="w-full bg-input border border-border rounded-md pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <Select<PunchCategory | "all">
          value={fCat}
          onChange={setFCat}
          options={["all", ...cats]}
          label="Cat"
        />
        <Select<PunchStatus | "all">
          value={fStat}
          onChange={setFStat}
          options={["all", ...statuses]}
          label="Status"
        />
        <Select<Discipline | "all">
          value={fDisc}
          onChange={setFDisc}
          options={["all", ...disciplines]}
          label="Discipline"
        />
        <Select<PunchSort>
          value={sort}
          onChange={setSort}
          options={["age_desc", "due_asc", "category", "system"]}
          label="Sort"
        />
        <button
          onClick={() => exportPunchRegister(project)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-semibold hover:bg-secondary/80"
        >
          <Download className="h-3.5 w-3.5" /> Export
        </button>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Raise Punch
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <ViewButton active={view === "all"} onClick={() => setView("all")}>
          All ({form.draft.length})
        </ViewButton>
        <ViewButton active={view === "critical"} onClick={() => setView("critical")}>
          Cat A ({stats.A.open})
        </ViewButton>
        <ViewButton active={view === "overdue"} onClick={() => setView("overdue")}>
          Overdue ({overdueCount})
        </ViewButton>
        <ViewButton active={view === "field"} onClick={() => setView("field")}>
          Field queue
        </ViewButton>
      </div>

      {selectedCount > 0 && (
        <div className="panel p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <span className="font-bold tabular-nums">{selectedCount}</span>{" "}
            <span className="text-muted-foreground">selected for desktop batch action</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => bulkUpdateStatus("in_progress")}
              className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-muted/50"
            >
              Set In Progress
            </button>
            <button
              onClick={() => bulkUpdateStatus("closed")}
              className="rounded-md border border-success/40 px-3 py-2 text-xs font-semibold text-success hover:bg-success/10"
            >
              Close Selected
            </button>
            <button
              onClick={bulkDelete}
              className="rounded-md border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
            >
              Delete Selected
            </button>
            <button
              onClick={() => setSelected({})}
              className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-muted/50"
              aria-label="Clear selected punch items"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="panel divide-y divide-border">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">No punch items match.</div>
        )}
        {filtered.map((p) => {
          const sys = project.systems.find((s) => s.id === p.systemId);
          const ageDays = punchAgeDays(p);
          return (
            <div
              key={p.id}
              className="p-4 hover:bg-muted/20 flex flex-col sm:flex-row items-start gap-4"
            >
              <input
                type="checkbox"
                checked={!!selected[p.id]}
                onChange={(e) => setSelected((next) => ({ ...next, [p.id]: e.target.checked }))}
                className="mt-2 h-4 w-4 rounded border-border bg-input"
                aria-label={`Select punch ${p.title}`}
              />
              <div
                className={cn(
                  "h-10 w-10 rounded-md flex items-center justify-center font-bold text-sm",
                  p.category === "A" &&
                    "bg-destructive/15 text-destructive border border-destructive/40",
                  p.category === "B" && "bg-warning/15 text-warning border border-warning/40",
                  p.category === "C" && "bg-muted text-muted-foreground border border-border",
                )}
              >
                {p.category}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "font-medium",
                    p.status === "closed" && "line-through text-muted-foreground",
                  )}
                >
                  {p.title}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                  <span>{p.discipline}</span>
                  {sys && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-accent">{sys.code}</span>
                    </>
                  )}
                  {p.responsible && (
                    <>
                      <span>·</span>
                      <span>{p.responsible}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>raised {formatDistanceToNow(new Date(p.createdAt))} ago</span>
                  {p.dueDate && (
                    <>
                      <span>·</span>
                      <span className={cn("text-warning", isOverdue(p) && "text-destructive")}>
                        due {new Date(p.dueDate).toLocaleDateString()}
                      </span>
                    </>
                  )}
                  <span>/</span>
                  <span className={ageDays > 14 && p.status !== "closed" ? "text-warning" : ""}>
                    {ageDays}d old
                  </span>
                  {p.evidence?.length ? (
                    <>
                      <span>/</span>
                      <span className="inline-flex items-center gap-1 text-info">
                        <Camera className="h-3 w-3" /> {p.evidence.length}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
              <select
                value={p.status}
                onChange={(e) => upd(p.id, { status: e.target.value as PunchStatus })}
                className="bg-input border border-border rounded-md px-2 py-1 text-xs"
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="closed">Closed</option>
              </select>
              {p.status === "closed" ? (
                <button
                  onClick={() => upd(p.id, { status: "open" })}
                  title="Reopen"
                  className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-muted/50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => upd(p.id, { status: "closed" })}
                  title="Close"
                  className="h-8 w-8 rounded-md border border-success/40 text-success flex items-center justify-center hover:bg-success/10"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => del(p.id)}
                title="Delete"
                className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-destructive/20 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {showNew && (
        <NewPunchDialog
          systems={project.systems}
          onClose={() => setShowNew(false)}
          onAdd={(d: Omit<PunchItem, "id" | "createdAt">) => {
            add(d);
            setShowNew(false);
          }}
        />
      )}

      <SaveBar
        moduleLabel="Punch List"
        isDirty={form.isDirty}
        lastSaved={form.lastSaved}
        onSave={handleSave}
        onDiscard={form.discard}
      />

      <EngineeringInsight
        title="Punch Categories & Closeout Strategy"
        defaultOpen
        why={
          <>
            <b>A</b>-punches block Mechanical Completion or RFSU — safety, integrity, and
            code-compliance issues. <b>B</b>-punches must be cleared before Operations Acceptance.{" "}
            <b>C</b>-punches are cosmetic and tracked through the warranty period.
          </>
        }
        problems={
          <>
            A-punches re-categorised to B to make milestones look better; punches raised without
            traceable tag/loop reference; no aging report so old items hide; vendor punches not
            segregated.
          </>
        }
        best={
          <>
            Walkdown teams own A/B classification — not project controls; every punch references a
            tag or weld; review aging weekly; use punch dashboards to drive turnover go/no-go
            meetings; never RFSU with open A-punches.
          </>
        }
      />

      <WorkflowNav
        prev={{
          to: "/projects/$projectId/preservation",
          projectId: project.id,
          label: "Preservation",
        }}
        next={{
          to: "/projects/$projectId/mc",
          projectId: project.id,
          label: "Mechanical Completion",
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

function CatStat({
  cat,
  tone,
  stats,
  desc,
}: {
  cat: PunchCategory;
  tone: string;
  stats: { open: number; total: number };
  desc: string;
}) {
  const colorMap: Record<string, string> = {
    destructive: "text-destructive border-destructive/40 bg-destructive/10",
    warning: "text-warning border-warning/40 bg-warning/10",
    muted: "text-muted-foreground border-border bg-muted/30",
  };
  return (
    <div className={cn("rounded-lg border p-4", colorMap[tone])}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest opacity-80">
            Category {cat}
          </div>
          <div className="text-3xl font-bold tabular-nums mt-1">
            {stats.open}
            <span className="text-base opacity-50">/{stats.total}</span>
          </div>
          <div className="text-xs opacity-80 mt-1">{desc}</div>
        </div>
        <div className="text-5xl font-black opacity-20">{cat}</div>
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-2 text-xs font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function FieldStatusBar({
  online,
  pendingSync,
  isMobile,
}: {
  online: boolean;
  pendingSync: boolean;
  isMobile: boolean;
}) {
  return (
    <div className="panel p-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-semibold",
            online
              ? "border-success/40 bg-success/10 text-success"
              : "border-warning/40 bg-warning/10 text-warning",
          )}
        >
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {online ? "Online" : "Offline field mode"}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-semibold",
            pendingSync
              ? "border-warning/40 bg-warning/10 text-warning"
              : "border-border bg-muted/20 text-muted-foreground",
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          {pendingSync ? "Unsynced changes" : "No local queue"}
        </span>
        {isMobile && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-info/40 bg-info/10 px-2 py-1 font-semibold text-info">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Field capture
          </span>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        Mobile entries keep working offline and are marked pending until saved/synced.
      </div>
    </div>
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: T[];
  label: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="bg-input border border-border rounded-md px-2 py-1.5"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {optionLabel(o)}
          </option>
        ))}
      </select>
    </label>
  );
}

function NewPunchDialog({
  systems,
  onClose,
  onAdd,
}: {
  systems: SystemNode[];
  onClose: () => void;
  onAdd: (data: Omit<PunchItem, "id" | "createdAt">) => void;
}) {
  const [f, setF] = useState({
    title: "",
    category: "B" as PunchCategory,
    status: "open" as PunchStatus,
    discipline: "Piping" as Discipline,
    responsible: "",
    systemId: systems[0]?.id || "",
    dueDate: "",
    description: "",
  });
  const photoRef = useRef<HTMLInputElement>(null);
  const [evidence, setEvidence] = useState<PunchItem["evidence"]>([]);
  return (
    <div
      className="fixed inset-0 z-40 bg-background/80 backdrop-blur flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="panel max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold">Raise Punch Item</h3>
        <div className="mt-4 grid gap-3">
          <input
            className="bg-input border border-border rounded-md px-3 py-2 text-sm"
            placeholder="Punch description (e.g. Missing flange gasket on P-1001A discharge)"
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              className="bg-input border border-border rounded-md px-3 py-2 text-sm"
              value={f.category}
              onChange={(e) => setF({ ...f, category: e.target.value as PunchCategory })}
            >
              {cats.map((c) => (
                <option key={c} value={c}>
                  Cat {c}
                </option>
              ))}
            </select>
            <select
              className="bg-input border border-border rounded-md px-3 py-2 text-sm"
              value={f.discipline}
              onChange={(e) => setF({ ...f, discipline: e.target.value as Discipline })}
            >
              {disciplines.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <select
              className="bg-input border border-border rounded-md px-3 py-2 text-sm"
              value={f.systemId}
              onChange={(e) => setF({ ...f, systemId: e.target.value })}
            >
              {systems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              className="bg-input border border-border rounded-md px-3 py-2 text-sm"
              placeholder="Responsible"
              value={f.responsible}
              onChange={(e) => setF({ ...f, responsible: e.target.value })}
            />
            <input
              type="date"
              className="bg-input border border-border rounded-md px-3 py-2 text-sm"
              value={f.dueDate}
              onChange={(e) => setF({ ...f, dueDate: e.target.value })}
            />
          </div>
          <textarea
            className="bg-input border border-border rounded-md px-3 py-2 text-sm min-h-20"
            placeholder="Field notes, tag location, action required"
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
          />
          <div className="rounded-md border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold">Evidence</div>
                <div className="text-[11px] text-muted-foreground">
                  Capture photos on mobile or attach field evidence metadata.
                </div>
              </div>
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-muted/50"
              >
                <Camera className="h-3.5 w-3.5" /> Add Photo
              </button>
            </div>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setEvidence((items = []) => [
                  ...items,
                  {
                    id: uid(),
                    type: "photo",
                    name: file.name,
                    size: file.size,
                    capturedAt: new Date().toISOString(),
                  },
                ]);
                event.currentTarget.value = "";
              }}
            />
            {evidence?.length ? (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {evidence.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{item.name}</span>
                    <span>{Math.max(1, Math.round((item.size ?? 0) / 1024))} KB</span>
                  </li>
                ))}
              </ul>
            ) : null}
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
            disabled={!f.title}
            onClick={() =>
              onAdd({
                ...f,
                description: f.description || undefined,
                dueDate: f.dueDate ? new Date(f.dueDate).toISOString() : undefined,
                evidence,
              })
            }
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            Create Punch
          </button>
        </div>
      </div>
    </div>
  );
}
