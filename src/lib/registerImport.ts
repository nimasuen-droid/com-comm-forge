import * as XLSX from "xlsx";
import type {
  Discipline,
  PunchCategory,
  PunchItem,
  PunchStatus,
  SystemNode,
  SystemPriority,
} from "./types";

type RawRow = Record<string, unknown>;

export interface RegisterImportResult {
  systems: SystemNode[];
  punches: PunchItem[];
  warnings: string[];
}

const DISCIPLINES: Discipline[] = [
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

const PRIORITIES: SystemPriority[] = ["Low", "Medium", "High", "Critical"];

function keyOf(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function get(row: RawRow, names: string[]) {
  const entries = Object.entries(row);
  for (const name of names.map(keyOf)) {
    const found = entries.find(([key]) => keyOf(key) === name);
    if (found && found[1] !== undefined && found[1] !== null && String(found[1]).trim() !== "") {
      return String(found[1]).trim();
    }
  }
  return "";
}

function id(prefix: string, value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return `${prefix}-${slug || Math.random().toString(36).slice(2, 8)}`;
}

function discipline(value: string, fallback: Discipline = "Mechanical"): Discipline {
  const normalized = keyOf(value);
  return DISCIPLINES.find((item) => keyOf(item) === normalized) ?? fallback;
}

function priority(value: string): SystemPriority {
  const normalized = keyOf(value);
  return PRIORITIES.find((item) => keyOf(item) === normalized) ?? "Medium";
}

function category(value: string): PunchCategory {
  const normalized = value.trim().toUpperCase();
  return normalized === "A" || normalized === "B" || normalized === "C" ? normalized : "C";
}

function status(value: string): PunchStatus {
  const normalized = keyOf(value);
  if (normalized === "closed" || normalized === "complete") return "closed";
  if (normalized === "inprogress" || normalized === "progress") return "in_progress";
  return "open";
}

function parseDate(value: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function parseRows(rows: RawRow[], sheetName: string, result: RegisterImportResult) {
  const isPunchSheet = keyOf(sheetName).includes("punch");

  rows.forEach((row, index) => {
    const type = keyOf(get(row, ["type", "record type", "record"]));
    const title = get(row, ["punch title", "title", "punch"]);
    const punchLike =
      isPunchSheet || type === "punch" || !!get(row, ["category", "punch category"]);

    if (punchLike && title) {
      const systemCode = get(row, ["system code", "system", "system id"]);
      const subsystemCode = get(row, ["subsystem code", "subsystem", "subsystem id"]);
      result.punches.push({
        id: get(row, ["punch id", "id"]) || id("punch", `${systemCode}-${title}-${index}`),
        title,
        category: category(get(row, ["category", "punch category"])),
        status: status(get(row, ["status", "punch status"])),
        discipline: discipline(get(row, ["discipline"]), "Piping"),
        responsible: get(row, ["responsible", "owner", "assignee"]) || undefined,
        systemId: systemCode ? id("sys", systemCode) : undefined,
        subsystemId: subsystemCode ? id("sub", subsystemCode) : undefined,
        dueDate: parseDate(get(row, ["due", "due date", "target date"])),
        createdAt:
          parseDate(get(row, ["created", "created at", "raised"])) ?? new Date().toISOString(),
      });
      return;
    }

    const systemCode = get(row, ["system code", "system id", "system"]);
    const systemName = get(row, ["system name", "system"]);
    const subsystemCode = get(row, ["subsystem code", "subsystem id", "subsystem"]);
    const subsystemName = get(row, ["subsystem name", "subsystem"]);

    if (!systemCode && !systemName) {
      result.warnings.push(`${sheetName} row ${index + 2}: skipped, no system code/name.`);
      return;
    }

    const sysId = id("sys", systemCode || systemName);
    let system = result.systems.find((item) => item.id === sysId);
    if (!system) {
      system = {
        id: sysId,
        code: systemCode || systemName,
        name: systemName || systemCode,
        priority: priority(get(row, ["priority", "criticality"])),
        ownerDiscipline: discipline(
          get(row, ["owner discipline", "system discipline", "discipline"]),
        ),
        description: get(row, ["description", "system description"]) || undefined,
        subsystems: [],
      };
      result.systems.push(system);
    }

    if (subsystemCode || subsystemName) {
      const subId = id("sub", subsystemCode || `${system.code}-${subsystemName}`);
      if (!system.subsystems.some((item) => item.id === subId)) {
        system.subsystems.push({
          id: subId,
          code: subsystemCode || subsystemName,
          name: subsystemName || subsystemCode,
          discipline: discipline(
            get(row, ["subsystem discipline", "discipline"]),
            system.ownerDiscipline,
          ),
          tags: get(row, ["tags", "tag list", "tag"])
            .split(/[;,]/)
            .map((tag) => tag.trim())
            .filter(Boolean),
          mcStatus: "grey",
          rfsuStatus: "grey",
          commStatus: "grey",
          turnoverStatus: "grey",
        });
      }
    }
  });
}

function rowsFromWorksheet(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });
}

export async function parseRegisterFile(file: File): Promise<RegisterImportResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array", cellDates: true });
  const result: RegisterImportResult = { systems: [], punches: [], warnings: [] };
  workbook.SheetNames.forEach((name) =>
    parseRows(rowsFromWorksheet(workbook.Sheets[name]), name, result),
  );
  return result;
}

export function parseRegisterPaste(text: string): RegisterImportResult {
  const workbook = XLSX.read(text, { type: "string", raw: false });
  const result: RegisterImportResult = { systems: [], punches: [], warnings: [] };
  workbook.SheetNames.forEach((name) =>
    parseRows(rowsFromWorksheet(workbook.Sheets[name]), name, result),
  );
  return result;
}

export function registerImportTemplate() {
  return [
    "Type,System Code,System Name,Priority,Owner Discipline,Subsystem Code,Subsystem Name,Discipline,Tags,Title,Category,Status,Responsible,Due Date",
    "subsystem,20-IA,Instrument Air System,Critical,Mechanical,20-IA-001,IA Compressor Package,Mechanical,K-2001A;K-2001B,,,,,",
    "subsystem,20-IA,Instrument Air System,Critical,Mechanical,20-IA-002,IA Dryers,Mechanical,D-2010;D-2011,,,,,",
    "punch,20-IA,Instrument Air System,Critical,Mechanical,20-IA-002,IA Dryers,Instrumentation,,IA dryer outlet PT not calibrated,B,open,Vendor Atlas,2026-01-20",
  ].join("\n");
}
