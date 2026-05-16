import { createFileRoute, Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { useState, useRef } from "react";
import { exportProject, useStore } from "@/lib/store";
import {
  canUseProjectFolders,
  loadProjectFromRecordFile,
  loadProjectFromRecordFolder,
  PROJECT_RECORD_APP_FILE,
  saveProjectRecordPackage,
} from "@/lib/localRecords";
import {
  parseRegisterFile,
  parseRegisterPaste,
  registerImportTemplate,
  type RegisterImportResult,
} from "@/lib/registerImport";
import { projectKpis } from "@/lib/kpi";
import { PercentBar } from "@/components/StatusBits";
import {
  Plus,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  Download,
  Upload,
  FolderOpen,
  HardDrive,
  FileJson,
  Table,
  AlertTriangle,
  CheckCircle2,
  MoreHorizontal,
  Settings,
  FileSpreadsheet,
} from "lucide-react";
import type { Project } from "@/lib/types";

type ProgressTone = ComponentProps<typeof PercentBar>["tone"];

export const Route = createFileRoute("/projects/")({
  head: () => ({ meta: [{ title: "Projects — Completions & Commissioning Pro" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const projects = useStore((s) => s.projects);
  const create = useStore((s) => s.createProject);
  const dup = useStore((s) => s.duplicateProject);
  const arch = useStore((s) => s.archiveProject);
  const del = useStore((s) => s.deleteProject);
  const importP = useStore((s) => s.importProject);
  const loadProject = useStore((s) => s.loadProject);
  const overwriteProjectFromArchive = useStore((s) => s.overwriteProjectFromArchive);
  const setActive = useStore((s) => s.setActive);
  const updateProject = useStore((s) => s.updateProject);
  const recordExport = useStore((s) => s.recordExport);
  const recordRecordsArchive = useStore((s) => s.recordRecordsArchive);
  const replaceSystems = useStore((s) => s.replaceSystems);
  const replacePunches = useStore((s) => s.replacePunches);

  const [showNew, setShowNew] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [recordsProjectId, setRecordsProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [showRegisterImport, setShowRegisterImport] = useState(false);
  const [recordsMessage, setRecordsMessage] = useState<string | null>(null);
  const [pendingArchiveOverwrite, setPendingArchiveOverwrite] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recordFileRef = useRef<HTMLInputElement>(null);

  const visible = projects.filter((p) => (showArchived ? p.archived : !p.archived));
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  const recordsProject = projects.find((p) => p.id === recordsProjectId);
  const editingProject = projects.find((p) => p.id === editingProjectId);

  const handleImport = (file: File) => {
    file.text().then((t) => {
      try {
        importP(JSON.parse(t));
      } catch {
        alert("Invalid project file");
      }
    });
  };

  const handleRecordFileLoad = async (file: File, overwriteSelected = false) => {
    try {
      const project = await loadProjectFromRecordFile(file);
      if (overwriteSelected && selectedProject) {
        if (
          !confirm(
            `Overwrite selected project "${selectedProject.name}" with records from "${project.name}"? This replaces the selected project in browser storage. Save a records package first if you need a backup.`,
          )
        ) {
          return;
        }
        overwriteProjectFromArchive(selectedProject.id, project);
        setActive(selectedProject.id);
        setSelectedProjectId(selectedProject.id);
        setRecordsMessage(`Overwrote ${selectedProject.name} from ${PROJECT_RECORD_APP_FILE}.`);
      } else {
        loadProject(project);
        setActive(project.id);
        setSelectedProjectId(project.id);
        setRecordsMessage(`Loaded ${project.name} from ${PROJECT_RECORD_APP_FILE}.`);
      }
    } catch {
      alert(
        `Could not load project. Select the ${PROJECT_RECORD_APP_FILE} file from the project records folder.`,
      );
    }
  };

  const handleFolderLoad = async (overwriteSelected = false) => {
    if (!canUseProjectFolders()) {
      setPendingArchiveOverwrite(!!overwriteSelected);
      recordFileRef.current?.click();
      return;
    }
    try {
      const project = await loadProjectFromRecordFolder();
      if (overwriteSelected && selectedProject) {
        if (
          !confirm(
            `Overwrite selected project "${selectedProject.name}" with records from "${project.name}"? This replaces the selected project in browser storage.`,
          )
        ) {
          return;
        }
        overwriteProjectFromArchive(selectedProject.id, project);
        setActive(selectedProject.id);
        setSelectedProjectId(selectedProject.id);
        setRecordsMessage(`Overwrote ${selectedProject.name} from its project records folder.`);
      } else {
        loadProject(project);
        setActive(project.id);
        setSelectedProjectId(project.id);
        setRecordsMessage(`Loaded ${project.name} from its project records folder.`);
      }
    } catch {
      alert(
        `Could not load the folder. Open the project folder that contains ${PROJECT_RECORD_APP_FILE}.`,
      );
    }
  };

  const applyRegisterImport = (
    result: RegisterImportResult,
    mode: "append" | "update" | "overwrite",
  ) => {
    if (!selectedProject) return;
    const mergeSystems = () => {
      if (mode === "overwrite") return result.systems;
      const byId = new Map(selectedProject.systems.map((system) => [system.id, system]));
      result.systems.forEach((system) => {
        const existing = byId.get(system.id);
        if (!existing || mode === "append") {
          const appendedSystem =
            mode === "append" && existing
              ? { ...system, id: `${system.id}-${crypto.randomUUID().slice(0, 8)}` }
              : system;
          byId.set(appendedSystem.id, appendedSystem);
          return;
        }
        const subs = new Map(existing.subsystems.map((subsystem) => [subsystem.id, subsystem]));
        system.subsystems.forEach((subsystem) => subs.set(subsystem.id, subsystem));
        byId.set(system.id, { ...existing, ...system, subsystems: Array.from(subs.values()) });
      });
      return Array.from(byId.values());
    };
    const mergePunches = () => {
      if (mode === "overwrite") return result.punches;
      if (mode === "append") return [...selectedProject.punches, ...result.punches];
      const byId = new Map(selectedProject.punches.map((punch) => [punch.id, punch]));
      result.punches.forEach((punch) => byId.set(punch.id, { ...byId.get(punch.id), ...punch }));
      return Array.from(byId.values());
    };
    if (result.systems.length) replaceSystems(selectedProject.id, mergeSystems());
    if (result.punches.length) replacePunches(selectedProject.id, mergePunches());
    setRecordsMessage(
      `${mode === "overwrite" ? "Overwrote" : mode === "update" ? "Updated" : "Appended"} ${result.systems.length} systems and ${result.punches.length} punches in ${selectedProject.name}.`,
    );
  };

  const saveRecords = async (project: Project) => {
    try {
      const archive = await saveProjectRecordPackage(project);
      recordRecordsArchive(project.id, archive);
      setRecordsMessage(
        archive.mode === "folder"
          ? `Saved records to ${archive.folderName}. Use ${archive.appFileName} to reload this project later.`
          : `Downloaded project records. Keep the ${archive.appFileName} restore file with the human-readable records.`,
      );
    } catch {
      alert("Project records were not saved. Choose a writable folder and allow file access.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            Project Management
          </div>
          <h1 className="text-3xl font-bold mt-1">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create, duplicate, archive, and exchange completions projects.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowArchived((s) => !s)}
            className="rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted/50"
          >
            {showArchived ? "Show Active" : "Show Archived"}
          </button>
          <button
            onClick={() => handleFolderLoad(false)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted/50"
          >
            <FolderOpen className="h-3.5 w-3.5" /> Load from Folder
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted/50"
          >
            <Upload className="h-3.5 w-3.5" /> Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
          />
          <input
            ref={recordFileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleRecordFileLoad(file, pendingArchiveOverwrite);
              setPendingArchiveOverwrite(false);
              e.currentTarget.value = "";
            }}
          />
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> New Project
          </button>
        </div>
      </div>

      {showNew && (
        <NewProjectDialog
          onClose={() => setShowNew(false)}
          onCreate={(d) => {
            const id = create(d);
            setActive(id);
            setShowNew(false);
            setRecordsProjectId(id);
          }}
        />
      )}

      {editingProject && (
        <ProjectSettingsDialog
          project={editingProject}
          onClose={() => setEditingProjectId(null)}
          onSave={(patch) => {
            updateProject(editingProject.id, patch);
            setEditingProjectId(null);
          }}
        />
      )}

      <div className="panel border-primary/25 bg-primary/5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <HardDrive className="h-4 w-4 text-primary" /> Local hard-drive project records
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Save each project to a local records folder with {PROJECT_RECORD_APP_FILE} for app
              restore, plus workbook/CSV files for owner records if the app is unavailable.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleFolderLoad(false)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted/50"
            >
              <FolderOpen className="h-3.5 w-3.5" /> Load records folder
            </button>
            {selectedProject && (
              <>
                <button
                  onClick={() => setEditingProjectId(selectedProject.id)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted/50"
                >
                  <Settings className="h-3.5 w-3.5" /> Edit settings
                </button>
                <button
                  onClick={() => setRecordsProjectId(selectedProject.id)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <HardDrive className="h-3.5 w-3.5" /> Save project records
                </button>
              </>
            )}
          </div>
        </div>
        {recordsMessage && <div className="mt-3 text-xs text-success">{recordsMessage}</div>}
      </div>

      {selectedProject && (
        <div className="panel border-accent/30 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-accent" /> Selected project
              </div>
              <div className="mt-1 text-base font-bold">{selectedProject.name}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Actions below apply only to the highlighted project. Overwrite and register import
                replace browser-local records for this selected project.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRecordsProjectId(selectedProject.id)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <HardDrive className="h-3.5 w-3.5" /> Save selected
              </button>
              <button
                onClick={() => handleFolderLoad(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-semibold text-warning hover:bg-warning/20"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Overwrite from folder
              </button>
              <button
                onClick={() => setShowRegisterImport(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted/50"
              >
                <Table className="h-3.5 w-3.5" /> Import registers
              </button>
            </div>
          </div>
        </div>
      )}

      {recordsProject && (
        <RecordsDialog
          project={recordsProject}
          onClose={() => setRecordsProjectId(null)}
          onSave={() => saveRecords(recordsProject)}
        />
      )}

      {showRegisterImport && selectedProject && (
        <RegisterImportDialog
          project={selectedProject}
          onClose={() => setShowRegisterImport(false)}
          onApply={applyRegisterImport}
        />
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.length === 0 && (
          <div className="panel col-span-full p-10 text-center text-muted-foreground">
            No {showArchived ? "archived" : "active"} projects.
          </div>
        )}
        {visible.map((p) => {
          const k = projectKpis(p);
          const selected = selectedProject?.id === p.id;
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onClick={() => {
                setSelectedProjectId(p.id);
                setActive(p.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedProjectId(p.id);
                  setActive(p.id);
                }
              }}
              className={`panel flex flex-col p-5 text-left transition ${selected ? "border-accent ring-2 ring-accent/40 bg-accent/5" : "hover:border-primary/40"}`}
            >
              {selected && (
                <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-accent">
                  <CheckCircle2 className="h-3 w-3" /> Selected
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {p.client}
                  </div>
                  <div className="text-base font-bold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {p.location} · {p.type}
                  </div>
                </div>
                <span className="tag-chip">
                  {k.systems}S / {k.subsystems}SS
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                <Row label="MC" value={k.mcPct} tone="success" />
                <Row label="Comm" value={k.commPct} tone="primary" />
                <Row label="Handover" value={k.handoverPct} tone="accent" />
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="tag-chip !bg-destructive/15 !border-destructive/30 text-destructive">
                  A {k.punchA}
                </span>
                <span className="tag-chip !bg-warning/15 !border-warning/30 text-warning">
                  B {k.punchB}
                </span>
                <span className="tag-chip">C {k.punchC}</span>
              </div>

              <div className="mt-5 flex items-center gap-1.5 flex-wrap">
                <Link
                  to="/projects/$projectId/systems"
                  params={{ projectId: p.id }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedProjectId(p.id);
                    setActive(p.id);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <FolderOpen className="h-3.5 w-3.5" /> Open
                </Link>
                <ProjectMoreActions
                  project={p}
                  onEdit={() => setEditingProjectId(p.id)}
                  onDuplicate={() => dup(p.id)}
                  onExportJson={() => {
                    recordExport(p.id, "Project JSON");
                    exportProject(p);
                  }}
                  onSaveRecords={() => setRecordsProjectId(p.id)}
                  onArchive={() => arch(p.id, !p.archived)}
                  onDelete={() => confirm(`Delete project "${p.name}"?`) && del(p.id)}
                />
              </div>
              {p.recordsArchive && (
                <div className="mt-3 rounded-md border border-border bg-muted/20 p-2 text-[11px] text-muted-foreground">
                  Records saved {new Date(p.recordsArchive.lastSavedAt).toLocaleString()} ·{" "}
                  {p.recordsArchive.folderName}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecordsDialog({
  project,
  onClose,
  onSave,
}: {
  project: Project;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const folderName = `${project.name.replace(/[^A-Za-z0-9_-]+/g, "_")}_${project.id}`;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div className="panel w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-primary/30 bg-primary/10 p-2 text-primary">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Save local project records</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create or update a hard-drive records folder for <b>{project.name}</b>.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-md border border-border bg-muted/20 p-4 text-sm">
          <div className="font-semibold">Recommended folder</div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">{folderName}</div>
          <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileJson className="h-3.5 w-3.5 text-primary" />
              <span>
                <b>{PROJECT_RECORD_APP_FILE}</b> restores the full project back into the app.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Download className="h-3.5 w-3.5 text-primary" />
              <span>Workbook, CSV, and README files keep records readable without this app.</span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          If your browser asks for a location, choose the parent records directory. The app will
          create the project folder inside it. If folder writing is unavailable, the same files will
          download and you can place them in that folder manually.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/50"
          >
            Close
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onSave();
              setBusy(false);
              onClose();
            }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <HardDrive className="h-4 w-4" /> {busy ? "Saving..." : "Save records"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectMoreActions({
  project,
  onEdit,
  onDuplicate,
  onExportJson,
  onSaveRecords,
  onArchive,
  onDelete,
}: {
  project: Project;
  onEdit: () => void;
  onDuplicate: () => void;
  onExportJson: () => void;
  onSaveRecords: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <details className="relative" onClick={(event) => event.stopPropagation()}>
      <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
        <MoreHorizontal className="h-3.5 w-3.5" /> More
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-48 rounded-md border border-border bg-popover p-1 text-sm shadow-xl">
        <MenuAction icon={<Settings />} label="Edit Project" onClick={onEdit} />
        <MenuAction icon={<Copy />} label="Duplicate" onClick={onDuplicate} />
        <MenuAction icon={<Download />} label="Export JSON" onClick={onExportJson} />
        <MenuAction icon={<HardDrive />} label="Save Records Folder" onClick={onSaveRecords} />
        <MenuAction
          icon={project.archived ? <ArchiveRestore /> : <Archive />}
          label={project.archived ? "Unarchive" : "Archive"}
          onClick={onArchive}
        />
        <MenuAction icon={<Trash2 />} label="Delete" onClick={onDelete} danger />
      </div>
    </details>
  );
}

function MenuAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs hover:bg-muted/50 ${danger ? "text-destructive hover:bg-destructive/15" : ""} [&_svg]:h-3.5 [&_svg]:w-3.5`}
    >
      {icon}
      {label}
    </button>
  );
}

function ProjectSettingsDialog({
  project,
  onClose,
  onSave,
}: {
  project: Project;
  onClose: () => void;
  onSave: (patch: Pick<Project, "name" | "client" | "location" | "type" | "description">) => void;
}) {
  const [form, setForm] = useState({
    name: project.name,
    client: project.client,
    location: project.location,
    type: project.type,
    description: project.description ?? "",
  });

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div className="panel w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-primary/30 bg-primary/10 p-2 text-primary">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Project Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Edit the project name and details shown across dashboards, exports, and records.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          <Field label="Project Name">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Client">
              <input
                className="input"
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
              />
            </Field>
            <Field label="Location">
              <input
                className="input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Project Type">
            <input
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
          </Field>
          <Field label="Description">
            <textarea
              className="input min-h-24"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            disabled={!form.name.trim() || !form.client.trim()}
            onClick={() => onSave(form)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            Update Project
          </button>
        </div>
        <style>{`.input{width:100%;background:var(--color-input);border:1px solid var(--color-border);border-radius:.375rem;padding:.5rem .65rem;font-size:.875rem;color:var(--color-foreground);outline:none}.input:focus{border-color:var(--color-primary)}`}</style>
      </div>
    </div>
  );
}

function RegisterImportDialog({
  project,
  onClose,
  onApply,
}: {
  project: Project;
  onClose: () => void;
  onApply: (result: RegisterImportResult, mode: "append" | "update" | "overwrite") => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState(registerImportTemplate());
  const [result, setResult] = useState<RegisterImportResult | null>(null);
  const [mode, setMode] = useState<"append" | "update" | "overwrite">("update");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const downloadTemplate = () => {
    const blob = new Blob([registerImportTemplate()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ccpro_register_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadFile = async (file: File) => {
    try {
      const parsed = await parseRegisterFile(file);
      setResult(parsed);
      setMessage(`Loaded ${file.name}. Review the counts before replacing project registers.`);
    } catch {
      setMessage("Could not read that file. Use .xlsx, .xls, .csv, or paste tabular data.");
    }
  };

  const parsePaste = () => {
    try {
      const parsed = parseRegisterPaste(paste);
      setResult(parsed);
      setMessage("Parsed pasted data. Review the counts before replacing project registers.");
    } catch {
      setMessage("Could not parse pasted data. Keep the first row as headers.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="panel max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-warning/30 bg-warning/10 p-2 text-warning">
            <Table className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Import systems, subsystems, and punch lists</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One source can be an Excel workbook, CSV file, or pasted table. Use a `Type` column
              with `subsystem` and `punch`, or separate workbook sheets named Systems and Punches.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <div className="font-semibold text-warning">Import change warning</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Applying this import changes the selected project registers in browser storage.
                Update mode preserves other records, append mode adds rows, and overwrite mode
                replaces supplied registers after a final confirmation.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border border-border p-4">
            <div className="font-semibold">File source</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Recommended: one Excel workbook with Systems/Subsystems and Punches sheets.
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Upload className="h-3.5 w-3.5" /> Choose Excel or CSV
            </button>
            <button
              onClick={downloadTemplate}
              className="ml-2 mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted/50"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Export template
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
            />
          </div>

          <div className="rounded-md border border-border p-4">
            <div className="font-semibold">Paste source</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Paste from Excel or CSV. The template below shows the preferred headers.
            </p>
            <button
              onClick={parsePaste}
              className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted/50"
            >
              <Table className="h-3.5 w-3.5" /> Parse pasted table
            </button>
          </div>
        </div>

        <textarea
          className="mt-4 min-h-44 w-full rounded-md border border-border bg-input p-3 font-mono text-xs text-foreground outline-none focus:border-primary"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          spellCheck={false}
        />

        {message && <div className="mt-3 text-xs text-muted-foreground">{message}</div>}

        {result && (
          <div className="mt-4 rounded-md border border-border bg-muted/20 p-4">
            <div className="font-semibold">Import preview for {project.name}</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                ["update", "Update matching IDs, keep other records"],
                ["append", "Append imported rows"],
                ["overwrite", "Replace supplied registers"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className={`rounded-md border p-3 text-xs ${mode === value ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                >
                  <input
                    type="radio"
                    name="register-import-mode"
                    value={value}
                    checked={mode === value}
                    onChange={() => setMode(value as "append" | "update" | "overwrite")}
                    className="mr-2"
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Systems
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums">{result.systems.length}</div>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Subsystems
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums">
                  {result.systems.reduce((sum, system) => sum + system.subsystems.length, 0)}
                </div>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Punches
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums">{result.punches.length}</div>
              </div>
            </div>
            {result.warnings.length > 0 && (
              <div className="mt-3 max-h-24 overflow-auto rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-muted-foreground">
                {result.warnings.slice(0, 8).map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <label className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I understand this import will change supplied systems/subsystems and punch registers for
            the selected project in browser local storage. Overwrite mode can replace records.
          </span>
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            disabled={!result || !confirmed || (!result.systems.length && !result.punches.length)}
            onClick={() => {
              if (!result) return;
              if (
                mode === "overwrite" &&
                !confirm(
                  `Overwrite supplied registers in "${project.name}"? This can replace existing systems/subsystems or punch records in browser storage.`,
                )
              ) {
                return;
              }
              onApply(result, mode);
              onClose();
            }}
            className="inline-flex items-center gap-2 rounded-md bg-warning px-4 py-2 text-sm font-semibold text-warning-foreground hover:bg-warning/90 disabled:opacity-40"
          >
            <AlertTriangle className="h-4 w-4" /> Apply import
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: number; tone: ProgressTone }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold tabular-nums">{value}%</span>
      </div>
      <div className="mt-1">
        <PercentBar value={value} tone={tone} />
      </div>
    </div>
  );
}

function NewProjectDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (d: Pick<Project, "name" | "client" | "location" | "type" | "description">) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    client: "",
    location: "",
    type: "Refinery Brownfield Revamp",
    description: "",
  });
  return (
    <div
      className="fixed inset-0 z-40 bg-background/80 backdrop-blur flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="panel max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">Create New Project</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set up a completions workspace for an EPC project.
        </p>
        <div className="mt-5 grid gap-3">
          <Field label="Project Name">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Yamal LNG Train 4 Pre-Comm"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Client">
              <input
                className="input"
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                placeholder="Operator"
              />
            </Field>
            <Field label="Location">
              <input
                className="input"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Site / country"
              />
            </Field>
          </div>
          <Field label="Project Type">
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
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
          <Field label="Description">
            <textarea
              className="input min-h-20"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Scope, units in scope, milestones…"
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/50"
          >
            Cancel
          </button>
          <button
            disabled={!form.name || !form.client}
            onClick={() => onCreate(form)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
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
      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}
