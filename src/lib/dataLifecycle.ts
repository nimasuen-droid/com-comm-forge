import type { Project } from "./types";
import { APP_DATA_VERSION, ProjectSchema } from "./projectSchema";

type PersistedShape = {
  state?: {
    projects?: unknown[];
    activeProjectId?: unknown;
  };
};

const fallbackWorkflow: Project["workflow"] = {
  construction: 0,
  mc: 0,
  precomm: 0,
  commissioning: 0,
  startup: 0,
  reliability: 0,
  handover: 0,
};

export const DEFAULT_COMPLIANCE_POLICY: Project["compliancePolicy"] = {
  retention: {
    auditLogYears: 10,
    projectRecordYears: 10,
    signatureRecordYears: 10,
    legalHoldSupported: true,
  },
  backup: {
    localExportFrequency: "daily",
    ownerArchiveRequired: true,
    encryptedBackupRequired: true,
  },
  disasterRecovery: {
    rpoHours: 24,
    rtoHours: 48,
    restoreTestFrequency: "quarterly",
  },
  tenantIsolation: {
    orgIdRequired: true,
    projectScopedAccess: true,
    crossTenantExportBlocked: true,
  },
};

function idFallback() {
  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);
  return randomId;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function legacyAuditLog(value: unknown, projectId: string) {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    const raw = asRecord(entry);
    return {
      ...raw,
      id: String(raw.id ?? idFallback()),
      projectId,
      sequence: Number(raw.sequence ?? index + 1),
      actorId: String(raw.actorId ?? "legacy-user"),
      actorName: String(raw.actorName ?? "Legacy User"),
      actorRole: raw.actorRole ?? "completions_lead",
      action: raw.action ?? "update",
      entity: raw.entity ?? { type: "project", id: projectId },
      at: String(raw.at ?? new Date().toISOString()),
      source: raw.source ?? "import",
      hash: String(raw.hash ?? `legacy-${index + 1}`),
    };
  });
}

function legacySignatures(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const raw = asRecord(entry);
    return {
      ...raw,
      auditEventId: String(raw.auditEventId ?? idFallback()),
      status: raw.status ?? (raw.revokedAt ? "revoked" : "active"),
      revocationRule: raw.revocationRule ?? "revocable_by_same_role_with_reason",
    };
  });
}

export function normalizeProject(input: unknown): Project {
  const raw = asRecord(input);
  const now = new Date().toISOString();
  const id = String(raw.id ?? idFallback());
  const candidate = {
    ...raw,
    id,
    name: String(raw.name ?? "Untitled Project"),
    client: String(raw.client ?? "Unknown Client"),
    location: String(raw.location ?? "Unknown Location"),
    type: String(raw.type ?? "Completions Project"),
    createdAt: String(raw.createdAt ?? now),
    updatedAt: String(raw.updatedAt ?? now),
    schemaVersion: APP_DATA_VERSION,
    syncStatus: raw.syncStatus ?? "local",
    systems: Array.isArray(raw.systems) ? raw.systems : [],
    punches: Array.isArray(raw.punches) ? raw.punches : [],
    documents: Array.isArray(raw.documents) ? raw.documents : [],
    workflow: { ...fallbackWorkflow, ...asRecord(raw.workflow) },
    members: Array.isArray(raw.members) ? raw.members : [],
    auditLog: legacyAuditLog(raw.auditLog, id),
    signatures: legacySignatures(raw.signatures),
    compliancePolicy: { ...DEFAULT_COMPLIANCE_POLICY, ...asRecord(raw.compliancePolicy) },
  };

  const parsed = ProjectSchema.safeParse(candidate);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.path.join(".") || issue.message);
    throw new Error(`Invalid project data: ${issues.slice(0, 5).join(", ")}`);
  }
  return parsed.data as Project;
}

export function normalizeProjects(input: unknown): Project[] {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeProject);
}

export function migratePersistedState(persisted: unknown): unknown {
  const data = persisted as PersistedShape;
  if (!data?.state) return persisted;
  return {
    ...data,
    state: {
      ...data.state,
      projects: normalizeProjects(data.state.projects),
      activeProjectId:
        typeof data.state.activeProjectId === "string" ? data.state.activeProjectId : null,
    },
  };
}
