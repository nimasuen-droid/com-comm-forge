import * as XLSX from "xlsx";
import type { Project } from "./types";
import {
  mcProgress,
  commProgress,
  turnoverProgress,
  openAPunchesFor,
  MC_CHECK_LABELS,
  COMM_CHECK_LABELS,
  TURNOVER_CHECK_LABELS,
} from "./derive";
import { MC_CHECK_KEYS, COMM_CHECK_KEYS, TURNOVER_CHECK_KEYS } from "./types";

function save(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}
function safe(name: string) {
  return name.replace(/[^A-Za-z0-9_-]+/g, "_");
}
type SheetCell = string | number | boolean | Date | null | undefined;

function sheet(rows: SheetCell[][], headerRow = 0) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  // best-fit column widths
  const widths =
    rows[headerRow]?.map((_, i) => ({
      wch: Math.min(40, Math.max(10, ...rows.map((r) => String(r[i] ?? "").length))),
    })) ?? [];
  ws["!cols"] = widths;
  return ws;
}

export function exportPunchRegister(p: Project) {
  const header = [
    "Punch ID",
    "Title",
    "Category",
    "Status",
    "Discipline",
    "System",
    "Subsystem",
    "Responsible",
    "Raised",
    "Due",
    "Closed",
  ];
  const rows = p.punches.map((x) => {
    const sys = p.systems.find((s) => s.id === x.systemId);
    const ss = sys?.subsystems.find((s) => s.id === x.subsystemId);
    return [
      x.id,
      x.title,
      x.category,
      x.status,
      x.discipline,
      sys?.code ?? "",
      ss?.code ?? "",
      x.responsible ?? "",
      x.createdAt.slice(0, 10),
      x.dueDate?.slice(0, 10) ?? "",
      x.closedAt?.slice(0, 10) ?? "",
    ];
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet([header, ...rows]), "Punch Register");
  // summary
  const summary = [
    ["Project", p.name],
    ["Client", p.client],
    ["Generated", new Date().toLocaleString()],
    [],
    ["Category", "Open", "In Progress", "Closed", "Total"],
    ...(["A", "B", "C"] as const).map((c) => {
      const list = p.punches.filter((x) => x.category === c);
      return [
        c,
        list.filter((x) => x.status === "open").length,
        list.filter((x) => x.status === "in_progress").length,
        list.filter((x) => x.status === "closed").length,
        list.length,
      ];
    }),
  ];
  XLSX.utils.book_append_sheet(wb, sheet(summary), "Summary");
  save(wb, `${safe(p.name)}_Punch_Register.xlsx`);
}

export function exportMcDossier(p: Project) {
  const wb = XLSX.utils.book_new();
  // Summary sheet
  const totals = p.systems.flatMap((s) => s.subsystems).map((ss) => mcProgress(ss).pct);
  const avg = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      ["Mechanical Completion Dossier"],
      ["Project", p.name],
      ["Client", p.client],
      ["Location", p.location],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Subsystems", totals.length],
      ["Avg MC %", avg + "%"],
      [
        "Open A-Punches",
        p.punches.filter((x) => x.category === "A" && x.status !== "closed").length,
      ],
    ]),
    "Cover",
  );
  // Per-subsystem checklist matrix
  const head = [
    "System",
    "Subsystem Code",
    "Subsystem",
    "Discipline",
    ...MC_CHECK_KEYS.map((k) => MC_CHECK_LABELS[k]),
    "Open A",
    "MC %",
    "Status",
  ];
  const rows = p.systems.flatMap((sys) =>
    sys.subsystems.map((ss) => {
      const openA = openAPunchesFor(p, sys, ss).length;
      const checks = MC_CHECK_KEYS.map((k) =>
        k === "punchA" ? (openA === 0 ? "✓" : "") : ss.mcChecks?.[k] ? "✓" : "",
      );
      const pct = mcProgress(ss, openA === 0).pct;
      return [
        sys.code + " " + sys.name,
        ss.code,
        ss.name,
        ss.discipline,
        ...checks,
        openA || "",
        pct + "%",
        ss.mcStatus.toUpperCase(),
      ];
    }),
  );
  XLSX.utils.book_append_sheet(wb, sheet([head, ...rows]), "MC Checklist");
  // Open A-punches
  const aHead = ["Punch", "Category", "System", "Subsystem", "Discipline", "Responsible", "Due"];
  const aRows = p.punches
    .filter((x) => x.category === "A" && x.status !== "closed")
    .map((x) => {
      const sys = p.systems.find((s) => s.id === x.systemId);
      const ss = sys?.subsystems.find((s) => s.id === x.subsystemId);
      return [
        x.title,
        x.category,
        sys?.code ?? "",
        ss?.code ?? "",
        x.discipline,
        x.responsible ?? "",
        x.dueDate?.slice(0, 10) ?? "",
      ];
    });
  XLSX.utils.book_append_sheet(wb, sheet([aHead, ...aRows]), "Open A-Punches");
  save(wb, `${safe(p.name)}_MC_Dossier.xlsx`);
}

export function exportHandoverDossier(p: Project) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      ["Turnover & Handover Dossier"],
      ["Project", p.name],
      ["Client", p.client],
      ["Location", p.location],
      ["Generated", new Date().toLocaleString()],
    ]),
    "Cover",
  );
  const tHead = [
    "System",
    "Subsystem",
    "Discipline",
    ...TURNOVER_CHECK_KEYS.map((k) => TURNOVER_CHECK_LABELS[k]),
    "Turnover %",
    "Status",
    "Open A",
    "Open B",
  ];
  const tRows = p.systems.flatMap((sys) =>
    sys.subsystems.map((ss) => {
      const openA = p.punches.filter(
        (x) => x.systemId === sys.id && x.category === "A" && x.status !== "closed",
      ).length;
      const openB = p.punches.filter(
        (x) => x.systemId === sys.id && x.category === "B" && x.status !== "closed",
      ).length;
      const checks = TURNOVER_CHECK_KEYS.map((k) => (ss.turnoverChecks?.[k] ? "✓" : ""));
      return [
        sys.code + " " + sys.name,
        ss.code + " " + ss.name,
        ss.discipline,
        ...checks,
        turnoverProgress(ss).pct + "%",
        ss.turnoverStatus.toUpperCase(),
        openA || "",
        openB || "",
      ];
    }),
  );
  XLSX.utils.book_append_sheet(wb, sheet([tHead, ...tRows]), "Turnover Matrix");
  // Commissioning summary
  const cHead = ["Subsystem", ...COMM_CHECK_KEYS.map((k) => COMM_CHECK_LABELS[k]), "Comm %"];
  const cRows = p.systems.flatMap((sys) =>
    sys.subsystems.map((ss) => [
      sys.code + " " + ss.code,
      ...COMM_CHECK_KEYS.map((k) => (ss.commChecks?.[k] ? "✓" : "")),
      commProgress(ss).pct + "%",
    ]),
  );
  XLSX.utils.book_append_sheet(wb, sheet([cHead, ...cRows]), "Commissioning");
  // Document index
  const dHead = ["Document", "Type", "System", "Registered"];
  const dRows = p.documents.map((d) => [
    d.name,
    d.type,
    p.systems.find((s) => s.id === d.systemId)?.code ?? "",
    d.uploadedAt.slice(0, 10),
  ]);
  XLSX.utils.book_append_sheet(wb, sheet([dHead, ...dRows]), "Document Index");
  save(wb, `${safe(p.name)}_Handover_Dossier.xlsx`);
}

export function exportPreservation(p: Project) {
  const head = [
    "System",
    "Subsystem",
    "Discipline",
    "Interval (days)",
    "Last Done",
    "Next Due",
    "Status",
  ];
  const rows = p.systems.flatMap((sys) =>
    sys.subsystems.map((ss) => {
      const interval = ss.preservation?.interval ?? 0;
      const last = ss.preservation?.lastDone ? new Date(ss.preservation.lastDone) : null;
      const next = last && interval ? new Date(last.getTime() + interval * 86400000) : null;
      const overdue = next ? next < new Date() : false;
      return [
        sys.code,
        ss.code + " " + ss.name,
        ss.discipline,
        interval || "",
        last?.toLocaleDateString() ?? "",
        next?.toLocaleDateString() ?? "",
        overdue ? "OVERDUE" : interval ? "Active" : "Not set",
      ];
    }),
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet([head, ...rows]), "Preservation");
  save(wb, `${safe(p.name)}_Preservation_Log.xlsx`);
}

export function exportSystemRegister(p: Project) {
  const head = [
    "System Code",
    "System",
    "Priority",
    "Owner",
    "Subsystem Code",
    "Subsystem",
    "Discipline",
    "MC",
    "RFSU",
    "Comm",
    "Turnover",
    "Tags",
  ];
  const rows = p.systems.flatMap((sys) =>
    sys.subsystems.length
      ? sys.subsystems.map((ss) => [
          sys.code,
          sys.name,
          sys.priority,
          sys.ownerDiscipline,
          ss.code,
          ss.name,
          ss.discipline,
          ss.mcStatus,
          ss.rfsuStatus,
          ss.commStatus,
          ss.turnoverStatus,
          ss.tags.join(", "),
        ])
      : [[sys.code, sys.name, sys.priority, sys.ownerDiscipline, "", "", "", "", "", "", "", ""]],
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet([head, ...rows]), "System Register");
  save(wb, `${safe(p.name)}_System_Register.xlsx`);
}

export function exportComplianceAuditReport(p: Project) {
  const wb = XLSX.utils.book_new();
  const generated = new Date().toLocaleString();
  const policy = p.compliancePolicy;

  XLSX.utils.book_append_sheet(
    wb,
    sheet([
      ["Compliance & Audit Report"],
      ["Project", p.name],
      ["Client", p.client],
      ["Location", p.location],
      ["Generated", generated],
      ["Schema Version", p.schemaVersion ?? ""],
      ["Tenant / Org", p.orgId ?? "local-tenant"],
      ["Audit Events", p.auditLog?.length ?? 0],
      ["Active Signatures", (p.signatures ?? []).filter((s) => s.status === "active").length],
      ["Revoked Signatures", (p.signatures ?? []).filter((s) => s.status === "revoked").length],
    ]),
    "Cover",
  );

  const auditHead = [
    "Seq",
    "Timestamp",
    "Actor",
    "Role",
    "Action",
    "Entity Type",
    "Entity ID",
    "Reason",
    "Source",
    "Previous Hash",
    "Hash",
  ];
  const auditRows = (p.auditLog ?? []).map((event) => [
    event.sequence,
    event.at,
    event.actorName,
    event.actorRole,
    event.action,
    event.entity.type,
    event.entity.id,
    event.reason ?? "",
    event.source,
    event.previousHash ?? "",
    event.hash,
  ]);
  XLSX.utils.book_append_sheet(wb, sheet([auditHead, ...auditRows]), "Immutable Audit Log");

  const signatureHead = [
    "Signature ID",
    "Entity Type",
    "Entity ID",
    "Signer",
    "Role",
    "Meaning",
    "Signed At",
    "Status",
    "Revocation Rule",
    "Revoked At",
    "Revoked By",
    "Revoked Reason",
  ];
  const signatureRows = (p.signatures ?? []).map((sig) => [
    sig.id,
    sig.entity.type,
    sig.entity.id,
    sig.signerName,
    sig.signerRole,
    sig.meaning,
    sig.signedAt,
    sig.status,
    sig.revocationRule,
    sig.revokedAt ?? "",
    sig.revokedBy ?? "",
    sig.revokedReason ?? "",
  ]);
  XLSX.utils.book_append_sheet(wb, sheet([signatureHead, ...signatureRows]), "E-Signatures");

  const policyRows = policy
    ? [
        ["Retention", "Audit log years", policy.retention.auditLogYears],
        ["Retention", "Project record years", policy.retention.projectRecordYears],
        ["Retention", "Signature record years", policy.retention.signatureRecordYears],
        ["Retention", "Legal hold supported", policy.retention.legalHoldSupported],
        ["Backup", "Local export frequency", policy.backup.localExportFrequency],
        ["Backup", "Owner archive required", policy.backup.ownerArchiveRequired],
        ["Backup", "Encrypted backup required", policy.backup.encryptedBackupRequired],
        ["Disaster Recovery", "RPO hours", policy.disasterRecovery.rpoHours],
        ["Disaster Recovery", "RTO hours", policy.disasterRecovery.rtoHours],
        [
          "Disaster Recovery",
          "Restore test frequency",
          policy.disasterRecovery.restoreTestFrequency,
        ],
        ["Tenant Isolation", "Org ID required", policy.tenantIsolation.orgIdRequired],
        ["Tenant Isolation", "Project-scoped access", policy.tenantIsolation.projectScopedAccess],
        [
          "Tenant Isolation",
          "Cross-tenant export blocked",
          policy.tenantIsolation.crossTenantExportBlocked,
        ],
      ]
    : [["Policy", "Status", "No policy defined"]];
  XLSX.utils.book_append_sheet(
    wb,
    sheet([["Domain", "Control", "Value"], ...policyRows]),
    "Policies",
  );

  save(wb, `${safe(p.name)}_Compliance_Audit_Report.xlsx`);
}
