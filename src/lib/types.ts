export type PunchCategory = "A" | "B" | "C";
export type PunchStatus = "open" | "in_progress" | "closed";
export type Discipline =
  | "Piping"
  | "Mechanical"
  | "Electrical"
  | "Instrumentation"
  | "Civil"
  | "Process"
  | "Telecom"
  | "HVAC"
  | "Fire & Gas";

export type SystemPriority = "Low" | "Medium" | "High" | "Critical";
export type RAG = "red" | "amber" | "green" | "grey";
export type SyncStatus = "local" | "pending" | "synced" | "conflict";
export type UserRole =
  | "owner"
  | "admin"
  | "completions_lead"
  | "commissioning_lead"
  | "field_engineer"
  | "viewer";

export interface EntityRef {
  type: "project" | "system" | "subsystem" | "punch" | "document" | "workflow" | "signature";
  id: string;
}

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "import"
  | "export"
  | "sign"
  | "revoke_signature"
  | "sync";

export interface AuditEvent {
  id: string;
  projectId: string;
  sequence: number;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditAction;
  entity: EntityRef;
  at: string;
  source: "local" | "api" | "import" | "system";
  before?: unknown;
  after?: unknown;
  reason?: string;
  metadata?: Record<string, string | number | boolean | null>;
  previousHash?: string;
  hash: string;
}

export interface SignatureRecord {
  id: string;
  projectId: string;
  entity: EntityRef;
  signerId: string;
  signerName: string;
  signerRole: UserRole;
  meaning: string;
  signedAt: string;
  auditEventId: string;
  status: "active" | "revoked";
  revocationRule:
    | "no_revocation_after_owner_acceptance"
    | "revocable_by_same_role_with_reason"
    | "admin_revocation_with_dual_control";
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
  revokedAuditEventId?: string;
}

export interface ProjectMember {
  userId: string;
  name: string;
  email?: string;
  role: UserRole;
  addedAt: string;
}

export interface PunchItem {
  id: string;
  title: string;
  description?: string;
  category: PunchCategory;
  status: PunchStatus;
  discipline: Discipline;
  responsible?: string;
  systemId?: string;
  subsystemId?: string;
  dueDate?: string;
  createdAt: string;
  closedAt?: string;
  comments?: { author: string; text: string; at: string }[];
  evidence?: {
    id: string;
    type: "photo" | "voice" | "note" | "document";
    name: string;
    capturedAt: string;
    size?: number;
  }[];
}

export const MC_CHECK_KEYS = [
  "walkdown",
  "hydrotest",
  "flushing",
  "reinstatement",
  "preservation",
  "punchA",
] as const;
export const COMM_CHECK_KEYS = [
  "energization",
  "loops",
  "ce",
  "functional",
  "performance",
  "reliability",
] as const;
export const TURNOVER_CHECK_KEYS = ["mc", "rfsu", "commComplete", "opsAccept", "ccc"] as const;
export const STARTUP_CHECK_KEYS = ["firstFeed", "stableOps", "safeguards", "opsStaffed"] as const;
export const RELIABILITY_CHECK_KEYS = [
  "runStarted",
  "atDesignRate",
  "noTrips",
  "noCriticalPunches",
  "ownerAccepted",
] as const;
export type MCCheckKey = (typeof MC_CHECK_KEYS)[number];
export type CommCheckKey = (typeof COMM_CHECK_KEYS)[number];
export type TurnoverCheckKey = (typeof TURNOVER_CHECK_KEYS)[number];
export type StartupCheckKey = (typeof STARTUP_CHECK_KEYS)[number];
export type ReliabilityCheckKey = (typeof RELIABILITY_CHECK_KEYS)[number];

export interface Subsystem {
  id: string;
  name: string;
  code: string;
  discipline: Discipline;
  tags: string[];
  mcStatus: RAG;
  rfsuStatus: RAG;
  commStatus: RAG;
  turnoverStatus: RAG;
  mcChecks?: Partial<Record<MCCheckKey, boolean>>;
  commChecks?: Partial<Record<CommCheckKey, boolean>>;
  turnoverChecks?: Partial<Record<TurnoverCheckKey, boolean>>;
  startupChecks?: Partial<Record<StartupCheckKey, boolean>>;
  reliabilityChecks?: Partial<Record<ReliabilityCheckKey, boolean>>;
  preservation?: { interval: number; lastDone?: string; notes?: string };
  notes?: string;
}

export interface SystemNode {
  id: string;
  name: string;
  code: string;
  description?: string;
  priority: SystemPriority;
  ownerDiscipline: Discipline;
  subsystems: Subsystem[];
}

export interface WorkflowState {
  construction: number;
  mc: number;
  precomm: number;
  commissioning: number;
  startup: number;
  reliability: number;
  handover: number;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  systemId?: string;
  uploadedAt: string;
  size?: number;
}

export interface CompliancePolicy {
  retention: {
    auditLogYears: number;
    projectRecordYears: number;
    signatureRecordYears: number;
    legalHoldSupported: boolean;
  };
  backup: {
    localExportFrequency: "daily" | "weekly" | "monthly";
    ownerArchiveRequired: boolean;
    encryptedBackupRequired: boolean;
  };
  disasterRecovery: {
    rpoHours: number;
    rtoHours: number;
    restoreTestFrequency: "quarterly" | "semiannual" | "annual";
  };
  tenantIsolation: {
    orgIdRequired: boolean;
    projectScopedAccess: boolean;
    crossTenantExportBlocked: boolean;
  };
}

export interface Project {
  id: string;
  orgId?: string;
  name: string;
  client: string;
  location: string;
  type: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  archived?: boolean;
  syncStatus?: SyncStatus;
  schemaVersion?: number;
  systems: SystemNode[];
  punches: PunchItem[];
  documents: DocumentItem[];
  workflow: WorkflowState;
  members?: ProjectMember[];
  auditLog?: AuditEvent[];
  signatures?: SignatureRecord[];
  compliancePolicy?: CompliancePolicy;
  /** Optional override of the global default progress weighting profile. */
  progressWeights?: {
    mc?: Partial<Record<MCCheckKey, number>>;
    comm?: Partial<Record<CommCheckKey, number>>;
    turnover?: Partial<Record<TurnoverCheckKey, number>>;
  };
}
