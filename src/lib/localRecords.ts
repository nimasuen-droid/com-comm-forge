import * as XLSX from "xlsx";
import type { Project, RecordsArchive } from "./types";
import {
  commProgress,
  mcProgress,
  reliabilityProgress,
  startupProgress,
  turnoverProgress,
  workflowEvidence,
  deriveWorkflow,
} from "./derive";
import { normalizeProject } from "./dataLifecycle";

type FileSystemDirectoryHandleLike = {
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FileSystemDirectoryHandleLike>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandleLike>;
};

type FileSystemFileHandleLike = {
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: Blob | string | ArrayBuffer): Promise<void>;
    close(): Promise<void>;
  }>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: "read" | "readwrite";
    startIn?: string;
  }) => Promise<FileSystemDirectoryHandleLike>;
};

const APP_FILE = "project.ccpro.json";
const WORKBOOK_FILE = "project_records.xlsx";
const README_FILE = "README_PROJECT_RECORDS.txt";

function safeName(name: string) {
  return name
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function projectRecordFolderName(project: Project) {
  return `${safeName(project.name || "project")}_${project.id}`;
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(rows: unknown[][]) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function writeFile(
  directory: FileSystemDirectoryHandleLike,
  filename: string,
  content: Blob | string,
) {
  const handle = await directory.getFileHandle(filename, { create: true });
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

function workbookBlob(project: Project) {
  const wf = deriveWorkflow(project);
  const evidence = workflowEvidence(project);
  const wb = XLSX.utils.book_new();
  const sheet = (rows: unknown[][]) => XLSX.utils.aoa_to_sheet(rows);

  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      ["Project", project.name],
      ["Client", project.client],
      ["Location", project.location],
      ["Type", project.type],
      ["Project ID", project.id],
      ["Generated", new Date().toISOString()],
      ["Restore file", APP_FILE],
    ]),
    "Read Me",
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      ["Step", "Percent", "Evidence Done", "Evidence Total", "Source"],
      ...Object.entries(wf).map(([key, pct]) => [
        key,
        pct,
        evidence[key as keyof typeof evidence].done,
        evidence[key as keyof typeof evidence].total,
        evidence[key as keyof typeof evidence].source,
      ]),
    ]),
    "Workflow",
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      [
        "System ID",
        "System Code",
        "System",
        "Priority",
        "Owner Discipline",
        "Subsystem ID",
        "Subsystem Code",
        "Subsystem",
        "Discipline",
        "Tags",
        "MC %",
        "Startup %",
        "Reliability %",
        "Turnover %",
      ],
      ...project.systems.flatMap((system) =>
        system.subsystems.length
          ? system.subsystems.map((ss) => [
              system.id,
              system.code,
              system.name,
              system.priority,
              system.ownerDiscipline,
              ss.id,
              ss.code,
              ss.name,
              ss.discipline,
              ss.tags.join("; "),
              mcProgress(ss).pct,
              startupProgress(ss).pct,
              reliabilityProgress(ss).pct,
              turnoverProgress(ss).pct,
            ])
          : [[system.id, system.code, system.name, system.priority, system.ownerDiscipline]],
      ),
    ]),
    "Systems Subsystems",
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      ["Punch ID", "Title", "Category", "Status", "Discipline", "Responsible", "System", "Due"],
      ...project.punches.map((punch) => [
        punch.id,
        punch.title,
        punch.category,
        punch.status,
        punch.discipline,
        punch.responsible ?? "",
        punch.systemId ?? "",
        punch.dueDate ?? "",
      ]),
    ]),
    "Punches",
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      ["Document ID", "Name", "Type", "System", "Uploaded At", "Size"],
      ...project.documents.map((doc) => [
        doc.id,
        doc.name,
        doc.type,
        doc.systemId ?? "",
        doc.uploadedAt,
        doc.size ?? "",
      ]),
    ]),
    "Documents",
  );

  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      ["Seq", "At", "Actor", "Role", "Action", "Entity", "Entity ID", "Reason", "Hash"],
      ...(project.auditLog ?? []).map((event) => [
        event.sequence,
        event.at,
        event.actorName,
        event.actorRole,
        event.action,
        event.entity.type,
        event.entity.id,
        event.reason ?? "",
        event.hash,
      ]),
    ]),
    "Audit Log",
  );

  const data = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function readme(project: Project) {
  return [
    `${project.name} - project records`,
    "",
    "This folder is a durable local archive for the project.",
    "",
    `To reopen the project in the app, choose: ${APP_FILE}`,
    `Human-readable workbook: ${WORKBOOK_FILE}`,
    "",
    "Keep this folder with the owner/client project records. The app restore file preserves the full app data model; the workbook preserves readable registers if the app is no longer available.",
    "",
    `Generated: ${new Date().toISOString()}`,
  ].join("\r\n");
}

function projectJson(project: Project) {
  return JSON.stringify(normalizeProject(project), null, 2);
}

function csvFiles(project: Project) {
  return {
    "workflow.csv": csv([
      ["Step", "Percent", "Evidence Done", "Evidence Total"],
      ...Object.entries(deriveWorkflow(project)).map(([step, pct]) => {
        const ev = workflowEvidence(project)[step as keyof ReturnType<typeof workflowEvidence>];
        return [step, pct, ev.done, ev.total];
      }),
    ]),
    "systems_subsystems.csv": csv([
      ["System Code", "System", "Subsystem Code", "Subsystem", "Discipline", "MC %", "Comm %"],
      ...project.systems.flatMap((system) =>
        system.subsystems.map((ss) => [
          system.code,
          system.name,
          ss.code,
          ss.name,
          ss.discipline,
          mcProgress(ss).pct,
          commProgress(ss).pct,
        ]),
      ),
    ]),
    "punch_register.csv": csv([
      ["Punch ID", "Title", "Category", "Status", "Discipline", "Responsible"],
      ...project.punches.map((punch) => [
        punch.id,
        punch.title,
        punch.category,
        punch.status,
        punch.discipline,
        punch.responsible ?? "",
      ]),
    ]),
    "audit_log.csv": csv([
      ["Seq", "At", "Actor", "Role", "Action", "Entity", "Reason", "Hash"],
      ...(project.auditLog ?? []).map((event) => [
        event.sequence,
        event.at,
        event.actorName,
        event.actorRole,
        event.action,
        `${event.entity.type}:${event.entity.id}`,
        event.reason ?? "",
        event.hash,
      ]),
    ]),
  };
}

export function canUseProjectFolders() {
  return typeof window !== "undefined" && !!(window as DirectoryPickerWindow).showDirectoryPicker;
}

export async function saveProjectRecordPackage(project: Project): Promise<RecordsArchive> {
  const folderName = projectRecordFolderName(project);
  const files = [README_FILE, APP_FILE, WORKBOOK_FILE, ...Object.keys(csvFiles(project))];
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;

  if (picker) {
    const root = await picker({ id: "ccpro-project-records", mode: "readwrite" });
    const folder = await root.getDirectoryHandle(folderName, { create: true });
    await writeFile(folder, README_FILE, readme(project));
    await writeFile(folder, APP_FILE, projectJson(project));
    await writeFile(folder, WORKBOOK_FILE, workbookBlob(project));
    await Promise.all(
      Object.entries(csvFiles(project)).map(([filename, content]) =>
        writeFile(folder, filename, content),
      ),
    );
    return {
      folderName,
      appFileName: APP_FILE,
      userFiles: files.filter((file) => file !== APP_FILE),
      lastSavedAt: new Date().toISOString(),
      mode: "folder",
    };
  }

  downloadBlob(new Blob([readme(project)], { type: "text/plain" }), `${folderName}_${README_FILE}`);
  downloadBlob(
    new Blob([projectJson(project)], { type: "application/json" }),
    `${folderName}_${APP_FILE}`,
  );
  downloadBlob(workbookBlob(project), `${folderName}_${WORKBOOK_FILE}`);
  Object.entries(csvFiles(project)).forEach(([filename, content]) => {
    downloadBlob(new Blob([content], { type: "text/csv" }), `${folderName}_${filename}`);
  });
  return {
    folderName,
    appFileName: APP_FILE,
    userFiles: files.filter((file) => file !== APP_FILE),
    lastSavedAt: new Date().toISOString(),
    mode: "download",
  };
}

export async function loadProjectFromRecordFolder(): Promise<Project> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) throw new Error("Folder loading is not supported by this browser.");
  const directory = await picker({ id: "ccpro-project-records", mode: "read" });
  const file = await (await directory.getFileHandle(APP_FILE)).getFile();
  return normalizeProject(JSON.parse(await file.text()));
}

export async function loadProjectFromRecordFile(file: File): Promise<Project> {
  return normalizeProject(JSON.parse(await file.text()));
}

export const PROJECT_RECORD_APP_FILE = APP_FILE;
