import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project, PunchItem, SystemNode, Subsystem, DocumentItem } from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);

const sampleProject = (): Project => {
  const now = new Date().toISOString();
  const sys1: SystemNode = {
    id: uid(),
    name: "Instrument Air System",
    code: "20-IA",
    description: "Plant and instrument air generation, drying and distribution.",
    priority: "Critical",
    ownerDiscipline: "Mechanical",
    subsystems: [
      { id: uid(), name: "IA Compressor Package", code: "20-IA-001", discipline: "Mechanical", tags: ["K-2001A","K-2001B"], mcStatus: "green", rfsuStatus: "amber", commStatus: "amber", turnoverStatus: "grey", preservation: { interval: 14 } },
      { id: uid(), name: "IA Dryers", code: "20-IA-002", discipline: "Mechanical", tags: ["D-2010","D-2011"], mcStatus: "amber", rfsuStatus: "red", commStatus: "red", turnoverStatus: "grey" },
      { id: uid(), name: "IA Distribution Network", code: "20-IA-003", discipline: "Piping", tags: ["L-200-IA"], mcStatus: "green", rfsuStatus: "green", commStatus: "amber", turnoverStatus: "grey" },
    ],
  };
  const sys2: SystemNode = {
    id: uid(),
    name: "Crude Charge Pumps",
    code: "10-PUM",
    description: "Main crude feed pumps to the distillation column.",
    priority: "High",
    ownerDiscipline: "Mechanical",
    subsystems: [
      { id: uid(), name: "P-1001 A/B Train", code: "10-PUM-001", discipline: "Mechanical", tags: ["P-1001A","P-1001B"], mcStatus: "amber", rfsuStatus: "red", commStatus: "grey", turnoverStatus: "grey", preservation: { interval: 7 } },
    ],
  };
  const sys3: SystemNode = {
    id: uid(),
    name: "ICSS / DCS",
    code: "70-ICSS",
    description: "Integrated Control & Safety System cabinets, marshalling, network.",
    priority: "Critical",
    ownerDiscipline: "Instrumentation",
    subsystems: [
      { id: uid(), name: "ICSS Cabinet Room", code: "70-ICSS-001", discipline: "Instrumentation", tags: ["UCP-01","UCP-02"], mcStatus: "green", rfsuStatus: "green", commStatus: "green", turnoverStatus: "amber" },
      { id: uid(), name: "F&G Loops Unit 10", code: "70-ICSS-FG-10", discipline: "Fire & Gas", tags: ["FG-10-LOOPS"], mcStatus: "green", rfsuStatus: "amber", commStatus: "red", turnoverStatus: "grey" },
    ],
  };

  const punches: PunchItem[] = [
    { id: uid(), title: "Missing flange gasket P-1001A discharge", category: "A", status: "open", discipline: "Piping", responsible: "Site Piping", systemId: sys2.id, dueDate: new Date(Date.now()+86400000*3).toISOString(), createdAt: now },
    { id: uid(), title: "IA dryer outlet PT not calibrated", category: "B", status: "in_progress", discipline: "Instrumentation", responsible: "Vendor Atlas", systemId: sys1.id, createdAt: now },
    { id: uid(), title: "Touch-up paint on K-2001B base frame", category: "C", status: "open", discipline: "Mechanical", systemId: sys1.id, createdAt: now },
    { id: uid(), title: "F&G loop FG-10-23 fails C&E test", category: "A", status: "open", discipline: "Fire & Gas", systemId: sys3.id, dueDate: new Date(Date.now()+86400000*1).toISOString(), createdAt: now },
  ];

  return {
    id: uid(),
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

  addPunch: (projectId: string, p: Omit<PunchItem, "id" | "createdAt">) => void;
  updatePunch: (projectId: string, punchId: string, patch: Partial<PunchItem>) => void;
  deletePunch: (projectId: string, punchId: string) => void;

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
    { name: "ccpro-store-v1" }
  )
);

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
