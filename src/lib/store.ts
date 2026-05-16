import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type {
  AuditEvent,
  DocumentItem,
  EntityRef,
  Project,
  PunchItem,
  SignatureRecord,
  SystemNode,
  Subsystem,
  UserRole,
} from "./types";
import { deriveMcStatus, deriveRfsuStatus, deriveCommStatus, deriveTurnoverStatus } from "./derive";
import { APP_DATA_VERSION } from "./projectSchema";
import {
  DEFAULT_COMPLIANCE_POLICY,
  migratePersistedState,
  normalizeProject,
} from "./dataLifecycle";

const isBrowser = typeof window !== "undefined";

const uid = () => Math.random().toString(36).slice(2, 10);
const SAMPLE_NOW = "2026-01-15T12:00:00.000Z";
const LOCAL_ACTOR = {
  id: "local-completions-lead",
  name: "Local Completions Lead",
  role: "completions_lead" as UserRole,
};

const touchProject = (project: Project): Project => ({
  ...project,
  updatedAt: new Date().toISOString(),
  syncStatus: "pending",
});

type AuditDraft = Omit<
  AuditEvent,
  | "id"
  | "projectId"
  | "sequence"
  | "actorId"
  | "actorName"
  | "actorRole"
  | "at"
  | "previousHash"
  | "hash"
> & { id?: string };

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map(
      (key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
    )
    .join(",")}}`;
}

function auditHash(value: unknown) {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function appendAudit(project: Project, drafts: AuditDraft | AuditDraft[]): Project {
  const list = Array.isArray(drafts) ? drafts : [drafts];
  if (list.length === 0) return touchProject(project);

  const existing = project.auditLog ?? [];
  const nextEvents = list.reduce<AuditEvent[]>((events, draft) => {
    const previous = events.at(-1) ?? existing.at(-1);
    const sequence = existing.length + events.length + 1;
    const base = {
      ...draft,
      id: draft.id ?? uid(),
      projectId: project.id,
      sequence,
      actorId: LOCAL_ACTOR.id,
      actorName: LOCAL_ACTOR.name,
      actorRole: LOCAL_ACTOR.role,
      at: new Date().toISOString(),
      previousHash: previous?.hash,
    };
    return [...events, { ...base, hash: auditHash(base) }];
  }, []);

  return touchProject(
    recalculateProjectStatuses({ ...project, auditLog: [...existing, ...nextEvents] }),
  );
}

function entity(type: EntityRef["type"], id: string): EntityRef {
  return { type, id };
}

function booleanMapValue(value: unknown, key: string) {
  if (!value || typeof value !== "object") return false;
  return Boolean((value as Record<string, boolean | undefined>)[key]);
}

function recalculateProjectStatuses(project: Project): Project {
  const base: Project = { ...project };
  return {
    ...project,
    systems: project.systems.map((sys) => ({
      ...sys,
      subsystems: sys.subsystems.map((ss) => ({
        ...ss,
        mcStatus: deriveMcStatus(base, sys, ss),
        rfsuStatus: deriveRfsuStatus(base, sys, ss),
        commStatus: deriveCommStatus(base, sys, ss),
        turnoverStatus: deriveTurnoverStatus(base, sys, ss),
      })),
    })),
  };
}

function diffSubsystems(before: SystemNode[], after: SystemNode[]): AuditDraft[] {
  const drafts: AuditDraft[] = [];
  const beforeSystems = new Map(before.map((system) => [system.id, system]));
  const afterSystems = new Map(after.map((system) => [system.id, system]));

  after.forEach((system) => {
    const oldSystem = beforeSystems.get(system.id);
    if (!oldSystem) {
      drafts.push({
        action: "create",
        entity: entity("system", system.id),
        source: "local",
        after: system,
        reason: "System created",
      });
      return;
    }

    const oldSubsystems = new Map(
      oldSystem.subsystems.map((subsystem) => [subsystem.id, subsystem]),
    );
    system.subsystems.forEach((subsystem) => {
      const oldSubsystem = oldSubsystems.get(subsystem.id);
      if (!oldSubsystem) {
        drafts.push({
          action: "create",
          entity: entity("subsystem", subsystem.id),
          source: "local",
          after: subsystem,
          reason: "Subsystem created",
          metadata: { systemId: system.id },
        });
        return;
      }

      (["mcStatus", "rfsuStatus", "commStatus", "turnoverStatus"] as const).forEach((field) => {
        if (oldSubsystem[field] !== subsystem[field]) {
          drafts.push({
            action: "update",
            entity: entity("subsystem", subsystem.id),
            source: "local",
            before: { [field]: oldSubsystem[field] },
            after: { [field]: subsystem[field] },
            reason: `${field} status changed`,
            metadata: { systemId: system.id, field },
          });
        }
      });

      (
        ["mcChecks", "commChecks", "turnoverChecks", "startupChecks", "reliabilityChecks"] as const
      ).forEach((field) => {
        const keys = new Set([
          ...Object.keys(oldSubsystem[field] ?? {}),
          ...Object.keys(subsystem[field] ?? {}),
        ]);
        keys.forEach((key) => {
          const beforeValue = booleanMapValue(oldSubsystem[field], key);
          const afterValue = booleanMapValue(subsystem[field], key);
          if (beforeValue !== afterValue) {
            drafts.push({
              action: "update",
              entity: entity("subsystem", subsystem.id),
              source: "local",
              before: { [key]: beforeValue },
              after: { [key]: afterValue },
              reason: `${field} checklist tick changed`,
              metadata: { systemId: system.id, checklist: field, key },
            });
          }
        });
      });
    });
  });

  before.forEach((system) => {
    if (!afterSystems.has(system.id)) {
      drafts.push({
        action: "delete",
        entity: entity("system", system.id),
        source: "local",
        before: system,
        reason: "System deleted",
      });
    }
  });

  return drafts;
}

function diffPunches(before: PunchItem[], after: PunchItem[]): AuditDraft[] {
  const oldById = new Map(before.map((punch) => [punch.id, punch]));
  const nextById = new Map(after.map((punch) => [punch.id, punch]));
  const drafts: AuditDraft[] = [];
  after.forEach((punch) => {
    const old = oldById.get(punch.id);
    if (!old) {
      drafts.push({
        action: "create",
        entity: entity("punch", punch.id),
        source: "local",
        after: punch,
        reason: "Punch raised",
      });
      return;
    }
    if (stableStringify(old) !== stableStringify(punch)) {
      drafts.push({
        action: "update",
        entity: entity("punch", punch.id),
        source: "local",
        before: old,
        after: punch,
        reason: old.status !== punch.status ? "Punch status changed" : "Punch edited",
        metadata: old.status !== punch.status ? { field: "status" } : undefined,
      });
    }
  });
  before.forEach((punch) => {
    if (!nextById.has(punch.id)) {
      drafts.push({
        action: "delete",
        entity: entity("punch", punch.id),
        source: "local",
        before: punch,
        reason: "Punch deleted",
      });
    }
  });
  return drafts;
}

const sampleProject = (): Project => {
  const now = SAMPLE_NOW;
  const sys1: SystemNode = {
    id: "sys-instrument-air",
    name: "Instrument Air System",
    code: "20-IA",
    description: "Plant and instrument air generation, drying and distribution.",
    priority: "Critical",
    ownerDiscipline: "Mechanical",
    subsystems: [
      {
        id: "sub-ia-compressors",
        name: "IA Compressor Package",
        code: "20-IA-001",
        discipline: "Mechanical",
        tags: ["K-2001A", "K-2001B"],
        mcStatus: "green",
        rfsuStatus: "amber",
        commStatus: "amber",
        turnoverStatus: "grey",
        preservation: { interval: 14 },
        mcChecks: {
          walkdown: true,
          hydrotest: true,
          flushing: true,
          reinstatement: true,
          preservation: true,
          punchA: true,
        },
        commChecks: { energization: true, loops: true, ce: true },
      },
      {
        id: "sub-ia-dryers",
        name: "IA Dryers",
        code: "20-IA-002",
        discipline: "Mechanical",
        tags: ["D-2010", "D-2011"],
        mcStatus: "amber",
        rfsuStatus: "red",
        commStatus: "red",
        turnoverStatus: "grey",
        mcChecks: { walkdown: true, hydrotest: true, flushing: true },
      },
      {
        id: "sub-ia-distribution",
        name: "IA Distribution Network",
        code: "20-IA-003",
        discipline: "Piping",
        tags: ["L-200-IA"],
        mcStatus: "green",
        rfsuStatus: "green",
        commStatus: "amber",
        turnoverStatus: "grey",
        mcChecks: {
          walkdown: true,
          hydrotest: true,
          flushing: true,
          reinstatement: true,
          preservation: true,
          punchA: true,
        },
        commChecks: { energization: true, loops: true },
      },
    ],
  };
  const sys2: SystemNode = {
    id: "sys-crude-charge-pumps",
    name: "Crude Charge Pumps",
    code: "10-PUM",
    description: "Main crude feed pumps to the distillation column.",
    priority: "High",
    ownerDiscipline: "Mechanical",
    subsystems: [
      {
        id: "sub-crude-pumps-train",
        name: "P-1001 A/B Train",
        code: "10-PUM-001",
        discipline: "Mechanical",
        tags: ["P-1001A", "P-1001B"],
        mcStatus: "amber",
        rfsuStatus: "red",
        commStatus: "grey",
        turnoverStatus: "grey",
        preservation: { interval: 7 },
        mcChecks: { walkdown: true, hydrotest: true, flushing: true, reinstatement: true },
      },
    ],
  };
  const sys3: SystemNode = {
    id: "sys-icss-dcs",
    name: "ICSS / DCS",
    code: "70-ICSS",
    description: "Integrated Control & Safety System cabinets, marshalling, network.",
    priority: "Critical",
    ownerDiscipline: "Instrumentation",
    subsystems: [
      {
        id: "sub-icss-cabinet-room",
        name: "ICSS Cabinet Room",
        code: "70-ICSS-001",
        discipline: "Instrumentation",
        tags: ["UCP-01", "UCP-02"],
        mcStatus: "green",
        rfsuStatus: "green",
        commStatus: "green",
        turnoverStatus: "amber",
        mcChecks: {
          walkdown: true,
          hydrotest: true,
          flushing: true,
          reinstatement: true,
          preservation: true,
          punchA: true,
        },
        commChecks: {
          energization: true,
          loops: true,
          ce: true,
          functional: true,
          performance: true,
          reliability: true,
        },
        turnoverChecks: { mc: true, rfsu: true, commComplete: true },
      },
      {
        id: "sub-fg-loops-unit-10",
        name: "F&G Loops Unit 10",
        code: "70-ICSS-FG-10",
        discipline: "Fire & Gas",
        tags: ["FG-10-LOOPS"],
        mcStatus: "green",
        rfsuStatus: "amber",
        commStatus: "red",
        turnoverStatus: "grey",
        mcChecks: {
          walkdown: true,
          hydrotest: true,
          flushing: true,
          reinstatement: true,
          preservation: true,
        },
      },
    ],
  };

  const punches: PunchItem[] = [
    {
      id: "punch-missing-gasket",
      title: "Missing flange gasket P-1001A discharge",
      category: "A",
      status: "open",
      discipline: "Piping",
      responsible: "Site Piping",
      systemId: sys2.id,
      dueDate: "2026-01-18T12:00:00.000Z",
      createdAt: now,
    },
    {
      id: "punch-ia-pt-calibration",
      title: "IA dryer outlet PT not calibrated",
      category: "B",
      status: "in_progress",
      discipline: "Instrumentation",
      responsible: "Vendor Atlas",
      systemId: sys1.id,
      createdAt: now,
    },
    {
      id: "punch-touch-up-paint",
      title: "Touch-up paint on K-2001B base frame",
      category: "C",
      status: "open",
      discipline: "Mechanical",
      systemId: sys1.id,
      createdAt: now,
    },
    {
      id: "punch-fg-loop-ce-test",
      title: "F&G loop FG-10-23 fails C&E test",
      category: "A",
      status: "open",
      discipline: "Fire & Gas",
      systemId: sys3.id,
      dueDate: "2026-01-16T12:00:00.000Z",
      createdAt: now,
    },
  ];

  return {
    id: "marathon-unit-10-revamp",
    name: "Marathon Refinery — Unit 10 Revamp",
    client: "Marathon Petroleum",
    location: "Garyville, LA",
    type: "Refinery Brownfield Revamp",
    description: "Revamp of crude unit 10 with new charge pumps and upgraded ICSS.",
    createdAt: now,
    updatedAt: now,
    createdBy: LOCAL_ACTOR.id,
    updatedBy: LOCAL_ACTOR.id,
    schemaVersion: APP_DATA_VERSION,
    syncStatus: "local",
    orgId: "local-tenant",
    members: [
      {
        userId: LOCAL_ACTOR.id,
        name: LOCAL_ACTOR.name,
        role: LOCAL_ACTOR.role,
        addedAt: now,
      },
    ],
    auditLog: [],
    signatures: [],
    compliancePolicy: DEFAULT_COMPLIANCE_POLICY,
    systems: [sys1, sys2, sys3],
    punches,
    documents: [],
    workflow: {
      construction: 92,
      mc: 74,
      precomm: 55,
      commissioning: 28,
      startup: 0,
      reliability: 0,
      handover: 0,
    },
  };
};

interface State {
  projects: Project[];
  activeProjectId: string | null;
  createProject: (
    data: Pick<Project, "name" | "client" | "location" | "type" | "description">,
  ) => string;
  duplicateProject: (id: string) => void;
  archiveProject: (id: string, archived: boolean) => void;
  deleteProject: (id: string) => void;
  importProject: (p: Project) => void;
  setActive: (id: string | null) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;

  addSystem: (projectId: string, sys: Omit<SystemNode, "id" | "subsystems">) => void;
  updateSystem: (projectId: string, sysId: string, patch: Partial<SystemNode>) => void;
  deleteSystem: (projectId: string, sysId: string) => void;
  addSubsystem: (projectId: string, sysId: string, sub: Omit<Subsystem, "id">) => void;
  updateSubsystem: (
    projectId: string,
    sysId: string,
    subId: string,
    patch: Partial<Subsystem>,
  ) => void;
  deleteSubsystem: (projectId: string, sysId: string, subId: string) => void;
  setSubsystemCheck: (
    projectId: string,
    sysId: string,
    subId: string,
    area: "mc" | "comm" | "turnover",
    key: string,
    value: boolean,
  ) => void;

  replaceSystems: (projectId: string, systems: SystemNode[]) => void;

  addPunch: (projectId: string, p: Omit<PunchItem, "id" | "createdAt">) => void;
  updatePunch: (projectId: string, punchId: string, patch: Partial<PunchItem>) => void;
  deletePunch: (projectId: string, punchId: string) => void;
  replacePunches: (projectId: string, punches: PunchItem[]) => void;

  addDocument: (projectId: string, d: Omit<DocumentItem, "id" | "uploadedAt">) => void;
  deleteDocument: (projectId: string, docId: string) => void;

  updateWorkflow: (projectId: string, patch: Partial<Project["workflow"]>) => void;
  recordExport: (projectId: string, reportName: string) => void;
  signEntity: (projectId: string, target: EntityRef, meaning: string, role?: UserRole) => void;
  revokeSignature: (projectId: string, signatureId: string, reason: string) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      projects: [sampleProject()],
      activeProjectId: null,

      createProject: (data) => {
        const now = new Date().toISOString();
        const p: Project = {
          id: uid(),
          ...data,
          createdAt: now,
          updatedAt: now,
          createdBy: LOCAL_ACTOR.id,
          updatedBy: LOCAL_ACTOR.id,
          orgId: "local-tenant",
          schemaVersion: APP_DATA_VERSION,
          syncStatus: "local",
          members: [
            {
              userId: LOCAL_ACTOR.id,
              name: LOCAL_ACTOR.name,
              role: LOCAL_ACTOR.role,
              addedAt: now,
            },
          ],
          auditLog: [],
          signatures: [],
          compliancePolicy: DEFAULT_COMPLIANCE_POLICY,
          systems: [],
          punches: [],
          documents: [],
          workflow: {
            construction: 0,
            mc: 0,
            precomm: 0,
            commissioning: 0,
            startup: 0,
            reliability: 0,
            handover: 0,
          },
        };
        set({
          projects: [
            ...get().projects,
            appendAudit(p, {
              action: "create",
              entity: entity("project", p.id),
              source: "local",
              after: p,
              reason: "Project created",
            }),
          ],
        });
        return p.id;
      },
      duplicateProject: (id) => {
        const src = get().projects.find((p) => p.id === id);
        if (!src) return;
        const copy: Project = JSON.parse(JSON.stringify(src));
        copy.id = uid();
        copy.name = src.name + " (Copy)";
        copy.createdAt = new Date().toISOString();
        copy.updatedAt = copy.createdAt;
        copy.auditLog = [];
        copy.signatures = [];
        set({
          projects: [
            ...get().projects,
            appendAudit(copy, {
              action: "create",
              entity: entity("project", copy.id),
              source: "local",
              after: copy,
              reason: `Project duplicated from ${src.id}`,
            }),
          ],
        });
      },
      archiveProject: (id, archived) =>
        set({
          projects: get().projects.map((p) =>
            p.id === id
              ? appendAudit(
                  { ...p, archived },
                  {
                    action: "update",
                    entity: entity("project", p.id),
                    source: "local",
                    before: { archived: p.archived ?? false },
                    after: { archived },
                    reason: archived ? "Project archived" : "Project restored",
                  },
                )
              : p,
          ),
        }),
      deleteProject: (id) => set({ projects: get().projects.filter((p) => p.id !== id) }),
      importProject: (p) =>
        set({
          projects: [
            ...get().projects,
            appendAudit(
              normalizeProject({
                ...p,
                id: uid(),
                schemaVersion: APP_DATA_VERSION,
                syncStatus: "local",
              }),
              {
                action: "import",
                entity: entity("project", p.id),
                source: "import",
                after: { name: p.name, sourceProjectId: p.id },
                reason: "Project JSON imported",
              },
            ),
          ],
        }),
      setActive: (id) => set({ activeProjectId: id }),

      updateProject: (id, patch) =>
        set({
          projects: get().projects.map((p) =>
            p.id === id
              ? appendAudit(
                  { ...p, ...patch, updatedBy: LOCAL_ACTOR.id },
                  {
                    action: "update",
                    entity: entity("project", p.id),
                    source: "local",
                    before: patch.documents ? { documents: p.documents } : p,
                    after: patch,
                    reason: patch.documents ? "Document register updated" : "Project updated",
                  },
                )
              : p,
          ),
        }),

      addSystem: (projectId, sys) => {
        const newSys: SystemNode = { id: uid(), subsystems: [], ...sys };
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? appendAudit(
                  { ...p, systems: [...p.systems, newSys], updatedBy: LOCAL_ACTOR.id },
                  {
                    action: "create",
                    entity: entity("system", newSys.id),
                    source: "local",
                    after: newSys,
                    reason: "System created",
                  },
                )
              : p,
          ),
        });
      },
      updateSystem: (projectId, sysId, patch) =>
        set({
          projects: get().projects.map((p) =>
            p.id !== projectId
              ? p
              : appendAudit(
                  {
                    ...p,
                    updatedBy: LOCAL_ACTOR.id,
                    systems: p.systems.map((s) => (s.id === sysId ? { ...s, ...patch } : s)),
                  },
                  {
                    action: "update",
                    entity: entity("system", sysId),
                    source: "local",
                    before: p.systems.find((s) => s.id === sysId),
                    after: patch,
                    reason: "System updated",
                  },
                ),
          ),
        }),
      deleteSystem: (projectId, sysId) =>
        set({
          projects: get().projects.map((p) =>
            p.id !== projectId
              ? p
              : appendAudit(
                  {
                    ...p,
                    updatedBy: LOCAL_ACTOR.id,
                    systems: p.systems.filter((s) => s.id !== sysId),
                  },
                  {
                    action: "delete",
                    entity: entity("system", sysId),
                    source: "local",
                    before: p.systems.find((s) => s.id === sysId),
                    reason: "System deleted",
                  },
                ),
          ),
        }),

      addSubsystem: (projectId, sysId, sub) => {
        const newSub: Subsystem = { id: uid(), ...sub };
        set({
          projects: get().projects.map((p) =>
            p.id !== projectId
              ? p
              : appendAudit(
                  {
                    ...p,
                    updatedBy: LOCAL_ACTOR.id,
                    systems: p.systems.map((s) =>
                      s.id !== sysId ? s : { ...s, subsystems: [...s.subsystems, newSub] },
                    ),
                  },
                  {
                    action: "create",
                    entity: entity("subsystem", newSub.id),
                    source: "local",
                    after: newSub,
                    reason: "Subsystem created",
                    metadata: { systemId: sysId },
                  },
                ),
          ),
        });
      },
      updateSubsystem: (projectId, sysId, subId, patch) =>
        set({
          projects: get().projects.map((p) =>
            p.id !== projectId
              ? p
              : appendAudit(
                  {
                    ...p,
                    updatedBy: LOCAL_ACTOR.id,
                    systems: p.systems.map((s) =>
                      s.id !== sysId
                        ? s
                        : {
                            ...s,
                            subsystems: s.subsystems.map((ss) =>
                              ss.id === subId ? { ...ss, ...patch } : ss,
                            ),
                          },
                    ),
                  },
                  {
                    action: "update",
                    entity: entity("subsystem", subId),
                    source: "local",
                    before: p.systems
                      .find((s) => s.id === sysId)
                      ?.subsystems.find((ss) => ss.id === subId),
                    after: patch,
                    reason: "Subsystem updated",
                    metadata: { systemId: sysId },
                  },
                ),
          ),
        }),
      deleteSubsystem: (projectId, sysId, subId) =>
        set({
          projects: get().projects.map((p) =>
            p.id !== projectId
              ? p
              : appendAudit(
                  {
                    ...p,
                    updatedBy: LOCAL_ACTOR.id,
                    systems: p.systems.map((s) =>
                      s.id !== sysId
                        ? s
                        : { ...s, subsystems: s.subsystems.filter((ss) => ss.id !== subId) },
                    ),
                  },
                  {
                    action: "delete",
                    entity: entity("subsystem", subId),
                    source: "local",
                    before: p.systems
                      .find((s) => s.id === sysId)
                      ?.subsystems.find((ss) => ss.id === subId),
                    reason: "Subsystem deleted",
                    metadata: { systemId: sysId },
                  },
                ),
          ),
        }),
      replaceSystems: (projectId, systems) =>
        set({
          projects: get().projects.map((p) =>
            p.id !== projectId
              ? p
              : appendAudit(
                  { ...p, systems, updatedBy: LOCAL_ACTOR.id },
                  diffSubsystems(p.systems, systems),
                ),
          ),
        }),
      replacePunches: (projectId, punches) =>
        set({
          projects: get().projects.map((p) =>
            p.id !== projectId
              ? p
              : appendAudit(
                  { ...p, punches, updatedBy: LOCAL_ACTOR.id },
                  diffPunches(p.punches, punches),
                ),
          ),
        }),

      setSubsystemCheck: (projectId, sysId, subId, area, key, value) => {
        set({
          projects: get().projects.map((p) => {
            if (p.id !== projectId) return p;
            const sys = p.systems.find((s) => s.id === sysId);
            if (!sys) return p;
            const ss = sys.subsystems.find((x) => x.id === subId);
            if (!ss) return p;
            const field =
              area === "mc" ? "mcChecks" : area === "comm" ? "commChecks" : "turnoverChecks";
            const next: Subsystem = {
              ...ss,
              [field]: { ...(ss[field] ?? {}), [key]: value },
            } as Subsystem;
            // auto-derive RAG for the touched area
            const tempProject = p;
            if (area === "mc") next.mcStatus = deriveMcStatus(tempProject, sys, next);
            if (area === "comm") next.commStatus = deriveCommStatus(tempProject, sys, next);
            if (area === "turnover")
              next.turnoverStatus = deriveTurnoverStatus(tempProject, sys, next);
            return appendAudit(
              {
                ...p,
                updatedBy: LOCAL_ACTOR.id,
                systems: p.systems.map((s) =>
                  s.id !== sysId
                    ? s
                    : { ...s, subsystems: s.subsystems.map((x) => (x.id === subId ? next : x)) },
                ),
              },
              {
                action: "update",
                entity: entity("subsystem", subId),
                source: "local",
                before: { [field]: booleanMapValue(ss[field], key) },
                after: { [field]: booleanMapValue(next[field], key) },
                reason: `${area.toUpperCase()} checklist tick changed`,
                metadata: { systemId: sysId, checklist: field, key },
              },
            );
          }),
        });
      },

      addPunch: (projectId, p) => {
        const np: PunchItem = { id: uid(), createdAt: new Date().toISOString(), ...p };
        set({
          projects: get().projects.map((pr) =>
            pr.id === projectId
              ? appendAudit(
                  { ...pr, punches: [np, ...pr.punches], updatedBy: LOCAL_ACTOR.id },
                  {
                    action: "create",
                    entity: entity("punch", np.id),
                    source: "local",
                    after: np,
                    reason: "Punch raised",
                  },
                )
              : pr,
          ),
        });
      },
      updatePunch: (projectId, punchId, patch) =>
        set({
          projects: get().projects.map((pr) =>
            pr.id !== projectId
              ? pr
              : appendAudit(
                  {
                    ...pr,
                    updatedBy: LOCAL_ACTOR.id,
                    punches: pr.punches.map((x) =>
                      x.id === punchId
                        ? {
                            ...x,
                            ...patch,
                            closedAt:
                              patch.status === "closed" ? new Date().toISOString() : x.closedAt,
                          }
                        : x,
                    ),
                  },
                  {
                    action: "update",
                    entity: entity("punch", punchId),
                    source: "local",
                    before: pr.punches.find((x) => x.id === punchId),
                    after: patch,
                    reason: patch.status ? "Punch status changed" : "Punch edited",
                    metadata: patch.status ? { field: "status" } : undefined,
                  },
                ),
          ),
        }),
      deletePunch: (projectId, punchId) =>
        set({
          projects: get().projects.map((pr) =>
            pr.id !== projectId
              ? pr
              : appendAudit(
                  {
                    ...pr,
                    updatedBy: LOCAL_ACTOR.id,
                    punches: pr.punches.filter((x) => x.id !== punchId),
                  },
                  {
                    action: "delete",
                    entity: entity("punch", punchId),
                    source: "local",
                    before: pr.punches.find((x) => x.id === punchId),
                    reason: "Punch deleted",
                  },
                ),
          ),
        }),

      addDocument: (projectId, d) => {
        const nd: DocumentItem = { id: uid(), uploadedAt: new Date().toISOString(), ...d };
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? appendAudit(
                  { ...p, documents: [nd, ...p.documents], updatedBy: LOCAL_ACTOR.id },
                  {
                    action: "create",
                    entity: entity("document", nd.id),
                    source: "local",
                    after: nd,
                    reason: "Document registered",
                  },
                )
              : p,
          ),
        });
      },
      deleteDocument: (projectId, docId) =>
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? appendAudit(
                  {
                    ...p,
                    updatedBy: LOCAL_ACTOR.id,
                    documents: p.documents.filter((d) => d.id !== docId),
                  },
                  {
                    action: "delete",
                    entity: entity("document", docId),
                    source: "local",
                    before: p.documents.find((d) => d.id === docId),
                    reason: "Document removed",
                  },
                )
              : p,
          ),
        }),

      updateWorkflow: (projectId, patch) =>
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? appendAudit(
                  {
                    ...p,
                    updatedBy: LOCAL_ACTOR.id,
                    workflow: { ...p.workflow, ...patch },
                  },
                  {
                    action: "update",
                    entity: entity("workflow", p.id),
                    source: "local",
                    before: p.workflow,
                    after: patch,
                    reason: "Workflow updated",
                  },
                )
              : p,
          ),
        }),
      recordExport: (projectId, reportName) =>
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? appendAudit(p, {
                  action: "export",
                  entity: entity("project", p.id),
                  source: "local",
                  after: { reportName },
                  reason: `${reportName} exported`,
                })
              : p,
          ),
        }),
      signEntity: (projectId, target, meaning, role = LOCAL_ACTOR.role) =>
        set({
          projects: get().projects.map((p) => {
            if (p.id !== projectId) return p;
            const auditId = uid();
            const signature: SignatureRecord = {
              id: uid(),
              projectId,
              entity: target,
              signerId: LOCAL_ACTOR.id,
              signerName: LOCAL_ACTOR.name,
              signerRole: role,
              meaning,
              signedAt: new Date().toISOString(),
              auditEventId: auditId,
              status: "active",
              revocationRule: "revocable_by_same_role_with_reason",
            };
            return appendAudit(
              { ...p, signatures: [...(p.signatures ?? []), signature], updatedBy: LOCAL_ACTOR.id },
              {
                id: auditId,
                action: "sign",
                entity: target,
                source: "local",
                after: signature,
                reason: meaning,
                metadata: { signatureId: signature.id },
              },
            );
          }),
        }),
      revokeSignature: (projectId, signatureId, reason) =>
        set({
          projects: get().projects.map((p) => {
            if (p.id !== projectId) return p;
            const signature = p.signatures?.find((s) => s.id === signatureId);
            if (!signature || signature.status === "revoked") return p;
            const revokedAt = new Date().toISOString();
            const revokedAuditEventId = uid();
            const updatedSignature: SignatureRecord = {
              ...signature,
              status: "revoked",
              revokedAt,
              revokedBy: LOCAL_ACTOR.id,
              revokedReason: reason,
              revokedAuditEventId,
            };
            return appendAudit(
              {
                ...p,
                updatedBy: LOCAL_ACTOR.id,
                signatures: (p.signatures ?? []).map((s) =>
                  s.id === signatureId ? updatedSignature : s,
                ),
              },
              {
                id: revokedAuditEventId,
                action: "revoke_signature",
                entity: entity("signature", signatureId),
                source: "local",
                before: signature,
                after: updatedSignature,
                reason,
              },
            );
          }),
        }),
    }),
    {
      name: "ccpro-store-v3",
      version: APP_DATA_VERSION,
      migrate: migratePersistedState,
      storage: createJSONStorage(() =>
        isBrowser
          ? localStorage
          : ({
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            } as unknown as Storage),
      ),
      skipHydration: true,
    },
  ),
);

export const hydrateStore = () => useStore.persist.rehydrate();
export const hasHydratedStore = () => useStore.persist.hasHydrated();

/** Returns true only after the client has mounted and rehydrated the store.
 *  Always returns false during SSR and on the very first client render to
 *  guarantee identical server/client HTML and avoid hydration mismatches. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (!cancelled) setHydrated(true);
    };
    if (useStore.persist.hasHydrated()) {
      finish();
    } else {
      const p = useStore.persist.rehydrate();
      if (p && typeof (p as Promise<unknown>).then === "function") {
        (p as Promise<unknown>).then(finish, finish);
      } else {
        finish();
      }
    }
    return () => {
      cancelled = true;
    };
  }, []);
  return hydrated;
}

export const useProject = (id: string | undefined) =>
  useStore((s) => s.projects.find((p) => p.id === id));

export function exportProject(p: Project) {
  const blob = new Blob([JSON.stringify(normalizeProject(p), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${p.name.replace(/\s+/g, "_")}.ccpro.json`;
  a.click();
  URL.revokeObjectURL(url);
}
