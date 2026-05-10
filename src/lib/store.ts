import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type { Project, PunchItem, SystemNode, Subsystem, DocumentItem } from "./types";
import { deriveMcStatus, deriveCommStatus, deriveTurnoverStatus } from "./derive";

const isBrowser = typeof window !== "undefined";

const uid = () => Math.random().toString(36).slice(2, 10);
const SAMPLE_NOW = "2026-01-15T12:00:00.000Z";

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
      { id: "sub-ia-compressors", name: "IA Compressor Package", code: "20-IA-001", discipline: "Mechanical", tags: ["K-2001A","K-2001B"], mcStatus: "green", rfsuStatus: "amber", commStatus: "amber", turnoverStatus: "grey", preservation: { interval: 14 }, mcChecks: { walkdown: true, hydrotest: true, flushing: true, reinstatement: true, preservation: true, punchA: true }, commChecks: { energization: true, loops: true, ce: true } },
      { id: "sub-ia-dryers", name: "IA Dryers", code: "20-IA-002", discipline: "Mechanical", tags: ["D-2010","D-2011"], mcStatus: "amber", rfsuStatus: "red", commStatus: "red", turnoverStatus: "grey", mcChecks: { walkdown: true, hydrotest: true, flushing: true } },
      { id: "sub-ia-distribution", name: "IA Distribution Network", code: "20-IA-003", discipline: "Piping", tags: ["L-200-IA"], mcStatus: "green", rfsuStatus: "green", commStatus: "amber", turnoverStatus: "grey", mcChecks: { walkdown: true, hydrotest: true, flushing: true, reinstatement: true, preservation: true, punchA: true }, commChecks: { energization: true, loops: true } },
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
      { id: "sub-crude-pumps-train", name: "P-1001 A/B Train", code: "10-PUM-001", discipline: "Mechanical", tags: ["P-1001A","P-1001B"], mcStatus: "amber", rfsuStatus: "red", commStatus: "grey", turnoverStatus: "grey", preservation: { interval: 7 }, mcChecks: { walkdown: true, hydrotest: true, flushing: true, reinstatement: true } },
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
      { id: "sub-icss-cabinet-room", name: "ICSS Cabinet Room", code: "70-ICSS-001", discipline: "Instrumentation", tags: ["UCP-01","UCP-02"], mcStatus: "green", rfsuStatus: "green", commStatus: "green", turnoverStatus: "amber", mcChecks: { walkdown: true, hydrotest: true, flushing: true, reinstatement: true, preservation: true, punchA: true }, commChecks: { energization: true, loops: true, ce: true, functional: true, performance: true, reliability: true }, turnoverChecks: { mc: true, rfsu: true, commComplete: true } },
      { id: "sub-fg-loops-unit-10", name: "F&G Loops Unit 10", code: "70-ICSS-FG-10", discipline: "Fire & Gas", tags: ["FG-10-LOOPS"], mcStatus: "green", rfsuStatus: "amber", commStatus: "red", turnoverStatus: "grey", mcChecks: { walkdown: true, hydrotest: true, flushing: true, reinstatement: true, preservation: true } },
    ],
  };

  const punches: PunchItem[] = [
    { id: "punch-missing-gasket", title: "Missing flange gasket P-1001A discharge", category: "A", status: "open", discipline: "Piping", responsible: "Site Piping", systemId: sys2.id, dueDate: "2026-01-18T12:00:00.000Z", createdAt: now },
    { id: "punch-ia-pt-calibration", title: "IA dryer outlet PT not calibrated", category: "B", status: "in_progress", discipline: "Instrumentation", responsible: "Vendor Atlas", systemId: sys1.id, createdAt: now },
    { id: "punch-touch-up-paint", title: "Touch-up paint on K-2001B base frame", category: "C", status: "open", discipline: "Mechanical", systemId: sys1.id, createdAt: now },
    { id: "punch-fg-loop-ce-test", title: "F&G loop FG-10-23 fails C&E test", category: "A", status: "open", discipline: "Fire & Gas", systemId: sys3.id, dueDate: "2026-01-16T12:00:00.000Z", createdAt: now },
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
    systems: [sys1, sys2, sys3],
    punches,
    documents: [],
    workflow: { construction: 92, mc: 74, precomm: 55, commissioning: 28, startup: 0, reliability: 0, handover: 0 },
  };
};

interface State {
  projects: Project[];
  activeProjectId: string | null;
  createProject: (data: Pick<Project, "name" | "client" | "location" | "type" | "description">) => string;
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
  updateSubsystem: (projectId: string, sysId: string, subId: string, patch: Partial<Subsystem>) => void;
  deleteSubsystem: (projectId: string, sysId: string, subId: string) => void;
  setSubsystemCheck: (projectId: string, sysId: string, subId: string, area: "mc" | "comm" | "turnover", key: string, value: boolean) => void;

  replaceSystems: (projectId: string, systems: SystemNode[]) => void;

  addPunch: (projectId: string, p: Omit<PunchItem, "id" | "createdAt">) => void;
  updatePunch: (projectId: string, punchId: string, patch: Partial<PunchItem>) => void;
  deletePunch: (projectId: string, punchId: string) => void;
  replacePunches: (projectId: string, punches: PunchItem[]) => void;

  addDocument: (projectId: string, d: Omit<DocumentItem, "id" | "uploadedAt">) => void;
  deleteDocument: (projectId: string, docId: string) => void;

  updateWorkflow: (projectId: string, patch: Partial<Project["workflow"]>) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      projects: [sampleProject()],
      activeProjectId: null,

      createProject: (data) => {
        const now = new Date().toISOString();
        const p: Project = {
          id: uid(), ...data, createdAt: now, updatedAt: now,
          systems: [], punches: [], documents: [],
          workflow: { construction: 0, mc: 0, precomm: 0, commissioning: 0, startup: 0, reliability: 0, handover: 0 },
        };
        set({ projects: [...get().projects, p] });
        return p.id;
      },
      duplicateProject: (id) => {
        const src = get().projects.find(p => p.id === id);
        if (!src) return;
        const copy: Project = JSON.parse(JSON.stringify(src));
        copy.id = uid();
        copy.name = src.name + " (Copy)";
        copy.createdAt = new Date().toISOString();
        copy.updatedAt = copy.createdAt;
        set({ projects: [...get().projects, copy] });
      },
      archiveProject: (id, archived) =>
        set({ projects: get().projects.map(p => p.id === id ? { ...p, archived } : p) }),
      deleteProject: (id) =>
        set({ projects: get().projects.filter(p => p.id !== id) }),
      importProject: (p) =>
        set({ projects: [...get().projects, { ...p, id: uid() }] }),
      setActive: (id) => set({ activeProjectId: id }),

      updateProject: (id, patch) =>
        set({ projects: get().projects.map(p => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p) }),

      addSystem: (projectId, sys) => {
        const newSys: SystemNode = { id: uid(), subsystems: [], ...sys };
        set({ projects: get().projects.map(p => p.id === projectId ? { ...p, systems: [...p.systems, newSys], updatedAt: new Date().toISOString() } : p) });
      },
      updateSystem: (projectId, sysId, patch) =>
        set({ projects: get().projects.map(p => p.id !== projectId ? p : { ...p, systems: p.systems.map(s => s.id === sysId ? { ...s, ...patch } : s), updatedAt: new Date().toISOString() }) }),
      deleteSystem: (projectId, sysId) =>
        set({ projects: get().projects.map(p => p.id !== projectId ? p : { ...p, systems: p.systems.filter(s => s.id !== sysId) }) }),

      addSubsystem: (projectId, sysId, sub) => {
        const newSub: Subsystem = { id: uid(), ...sub };
        set({ projects: get().projects.map(p => p.id !== projectId ? p : { ...p, systems: p.systems.map(s => s.id !== sysId ? s : { ...s, subsystems: [...s.subsystems, newSub] }) }) });
      },
      updateSubsystem: (projectId, sysId, subId, patch) =>
        set({ projects: get().projects.map(p => p.id !== projectId ? p : { ...p, systems: p.systems.map(s => s.id !== sysId ? s : { ...s, subsystems: s.subsystems.map(ss => ss.id === subId ? { ...ss, ...patch } : ss) }) }) }),
      deleteSubsystem: (projectId, sysId, subId) =>
        set({ projects: get().projects.map(p => p.id !== projectId ? p : { ...p, systems: p.systems.map(s => s.id !== sysId ? s : { ...s, subsystems: s.subsystems.filter(ss => ss.id !== subId) }) }) }),

      setSubsystemCheck: (projectId, sysId, subId, area, key, value) => {
        set({ projects: get().projects.map(p => {
          if (p.id !== projectId) return p;
          const sys = p.systems.find(s => s.id === sysId);
          if (!sys) return p;
          const ss = sys.subsystems.find(x => x.id === subId);
          if (!ss) return p;
          const field = area === "mc" ? "mcChecks" : area === "comm" ? "commChecks" : "turnoverChecks";
          const next: Subsystem = { ...ss, [field]: { ...(ss[field] ?? {}), [key]: value } } as Subsystem;
          // auto-derive RAG for the touched area
          const tempProject = p;
          if (area === "mc") next.mcStatus = deriveMcStatus(tempProject, sys, next);
          if (area === "comm") next.commStatus = deriveCommStatus(tempProject, sys, next);
          if (area === "turnover") next.turnoverStatus = deriveTurnoverStatus(tempProject, sys, next);
          return { ...p, systems: p.systems.map(s => s.id !== sysId ? s : { ...s, subsystems: s.subsystems.map(x => x.id === subId ? next : x) }), updatedAt: new Date().toISOString() };
        }) });
      },

      addPunch: (projectId, p) => {
        const np: PunchItem = { id: uid(), createdAt: new Date().toISOString(), ...p };
        set({ projects: get().projects.map(pr => pr.id === projectId ? { ...pr, punches: [np, ...pr.punches] } : pr) });
      },
      updatePunch: (projectId, punchId, patch) =>
        set({ projects: get().projects.map(pr => pr.id !== projectId ? pr : { ...pr, punches: pr.punches.map(x => x.id === punchId ? { ...x, ...patch, closedAt: patch.status === "closed" ? new Date().toISOString() : x.closedAt } : x) }) }),
      deletePunch: (projectId, punchId) =>
        set({ projects: get().projects.map(pr => pr.id !== projectId ? pr : { ...pr, punches: pr.punches.filter(x => x.id !== punchId) }) }),

      addDocument: (projectId, d) => {
        const nd: DocumentItem = { id: uid(), uploadedAt: new Date().toISOString(), ...d };
        set({ projects: get().projects.map(p => p.id === projectId ? { ...p, documents: [nd, ...p.documents] } : p) });
      },
      deleteDocument: (projectId, docId) =>
        set({ projects: get().projects.map(p => p.id === projectId ? { ...p, documents: p.documents.filter(d => d.id !== docId) } : p) }),

      updateWorkflow: (projectId, patch) =>
        set({ projects: get().projects.map(p => p.id === projectId ? { ...p, workflow: { ...p.workflow, ...patch } } : p) }),
    }),
    {
      name: "ccpro-store-v3",
      storage: createJSONStorage(() =>
        isBrowser
          ? localStorage
          : ({ getItem: () => null, setItem: () => {}, removeItem: () => {} } as unknown as Storage)
      ),
      skipHydration: true,
    }
  )
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
    const finish = () => { if (!cancelled) setHydrated(true); };
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
    return () => { cancelled = true; };
  }, []);
  return hydrated;
}

export const useProject = (id: string | undefined) =>
  useStore(s => s.projects.find(p => p.id === id));

export function exportProject(p: Project) {
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${p.name.replace(/\s+/g, "_")}.ccpro.json`;
  a.click();
  URL.revokeObjectURL(url);
}
