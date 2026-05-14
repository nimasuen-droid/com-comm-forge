import { z } from "zod";
import { COMM_CHECK_KEYS, MC_CHECK_KEYS, TURNOVER_CHECK_KEYS } from "./types";

export const APP_DATA_VERSION = 5;

const DisciplineSchema = z.enum([
  "Piping",
  "Mechanical",
  "Electrical",
  "Instrumentation",
  "Civil",
  "Process",
  "Telecom",
  "HVAC",
  "Fire & Gas",
]);
const RagSchema = z.enum(["red", "amber", "green", "grey"]);
const PunchCategorySchema = z.enum(["A", "B", "C"]);
const PunchStatusSchema = z.enum(["open", "in_progress", "closed"]);
const PrioritySchema = z.enum(["Low", "Medium", "High", "Critical"]);
const SyncStatusSchema = z.enum(["local", "pending", "synced", "conflict"]);
const UserRoleSchema = z.enum([
  "owner",
  "admin",
  "completions_lead",
  "commissioning_lead",
  "field_engineer",
  "viewer",
]);

const isoDateString = z.string().min(1);
const numberPct = z.number().finite().min(0).max(100);

const optionalBooleanMap = <T extends readonly [string, ...string[]]>(keys: T) =>
  z.object(Object.fromEntries(keys.map((key) => [key, z.boolean().optional()]))).partial();

const optionalNumberMap = <T extends readonly [string, ...string[]]>(keys: T) =>
  z
    .object(Object.fromEntries(keys.map((key) => [key, z.number().finite().min(0).optional()])))
    .partial();

export const EntityRefSchema = z.object({
  type: z.enum(["project", "system", "subsystem", "punch", "document", "workflow", "signature"]),
  id: z.string().min(1),
});

export const AuditEventSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  sequence: z.number().int().min(1),
  actorId: z.string().min(1),
  actorName: z.string().min(1),
  actorRole: UserRoleSchema,
  action: z.enum([
    "create",
    "update",
    "delete",
    "import",
    "export",
    "sign",
    "revoke_signature",
    "sync",
  ]),
  entity: EntityRefSchema,
  at: isoDateString,
  source: z.enum(["local", "api", "import", "system"]),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  reason: z.string().optional(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
  previousHash: z.string().optional(),
  hash: z.string().min(1),
});

export const SignatureRecordSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  entity: EntityRefSchema,
  signerId: z.string().min(1),
  signerName: z.string().min(1),
  signerRole: UserRoleSchema,
  meaning: z.string().min(1),
  signedAt: isoDateString,
  auditEventId: z.string().min(1),
  status: z.enum(["active", "revoked"]),
  revocationRule: z.enum([
    "no_revocation_after_owner_acceptance",
    "revocable_by_same_role_with_reason",
    "admin_revocation_with_dual_control",
  ]),
  revokedAt: isoDateString.optional(),
  revokedBy: z.string().optional(),
  revokedReason: z.string().optional(),
  revokedAuditEventId: z.string().optional(),
});

export const ProjectMemberSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional(),
  role: UserRoleSchema,
  addedAt: isoDateString,
});

export const PunchItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  category: PunchCategorySchema,
  status: PunchStatusSchema,
  discipline: DisciplineSchema,
  responsible: z.string().optional(),
  systemId: z.string().optional(),
  subsystemId: z.string().optional(),
  dueDate: isoDateString.optional(),
  createdAt: isoDateString,
  closedAt: isoDateString.optional(),
  comments: z
    .array(z.object({ author: z.string().min(1), text: z.string().min(1), at: isoDateString }))
    .optional(),
  evidence: z
    .array(
      z.object({
        id: z.string().min(1),
        type: z.enum(["photo", "voice", "note", "document"]),
        name: z.string().min(1),
        capturedAt: isoDateString,
        size: z.number().int().min(0).optional(),
      }),
    )
    .optional(),
});

export const SubsystemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
  discipline: DisciplineSchema,
  tags: z.array(z.string()).default([]),
  mcStatus: RagSchema,
  rfsuStatus: RagSchema,
  commStatus: RagSchema,
  turnoverStatus: RagSchema,
  mcChecks: optionalBooleanMap(MC_CHECK_KEYS).optional(),
  commChecks: optionalBooleanMap(COMM_CHECK_KEYS).optional(),
  turnoverChecks: optionalBooleanMap(TURNOVER_CHECK_KEYS).optional(),
  preservation: z
    .object({
      interval: z.number().int().min(0),
      lastDone: isoDateString.optional(),
      notes: z.string().optional(),
    })
    .optional(),
  notes: z.string().optional(),
});

export const SystemNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  priority: PrioritySchema,
  ownerDiscipline: DisciplineSchema,
  subsystems: z.array(SubsystemSchema).default([]),
});

export const WorkflowStateSchema = z.object({
  construction: numberPct,
  mc: numberPct,
  precomm: numberPct,
  commissioning: numberPct,
  startup: numberPct,
  reliability: numberPct,
  handover: numberPct,
});

export const DocumentItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  systemId: z.string().optional(),
  uploadedAt: isoDateString,
  size: z.number().int().min(0).optional(),
});

const ProgressWeightsSchema = z.object({
  mc: optionalNumberMap(MC_CHECK_KEYS).optional(),
  comm: optionalNumberMap(COMM_CHECK_KEYS).optional(),
  turnover: optionalNumberMap(TURNOVER_CHECK_KEYS).optional(),
});

const CompliancePolicySchema = z.object({
  retention: z.object({
    auditLogYears: z.number().int().min(1),
    projectRecordYears: z.number().int().min(1),
    signatureRecordYears: z.number().int().min(1),
    legalHoldSupported: z.boolean(),
  }),
  backup: z.object({
    localExportFrequency: z.enum(["daily", "weekly", "monthly"]),
    ownerArchiveRequired: z.boolean(),
    encryptedBackupRequired: z.boolean(),
  }),
  disasterRecovery: z.object({
    rpoHours: z.number().int().min(1),
    rtoHours: z.number().int().min(1),
    restoreTestFrequency: z.enum(["quarterly", "semiannual", "annual"]),
  }),
  tenantIsolation: z.object({
    orgIdRequired: z.boolean(),
    projectScopedAccess: z.boolean(),
    crossTenantExportBlocked: z.boolean(),
  }),
});

export const ProjectSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().optional(),
  name: z.string().min(1),
  client: z.string().min(1),
  location: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  archived: z.boolean().optional(),
  syncStatus: SyncStatusSchema.optional(),
  schemaVersion: z.number().int().min(1).optional(),
  systems: z.array(SystemNodeSchema).default([]),
  punches: z.array(PunchItemSchema).default([]),
  documents: z.array(DocumentItemSchema).default([]),
  workflow: WorkflowStateSchema,
  members: z.array(ProjectMemberSchema).optional(),
  auditLog: z.array(AuditEventSchema).optional(),
  signatures: z.array(SignatureRecordSchema).optional(),
  compliancePolicy: CompliancePolicySchema.optional(),
  progressWeights: ProgressWeightsSchema.optional(),
});

export const ProjectExportSchema = ProjectSchema.extend({
  schemaVersion: z.number().int().min(1).default(APP_DATA_VERSION),
});
