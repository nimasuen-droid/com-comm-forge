import type { AuditEvent, Project } from "./types";
import { normalizeProject, normalizeProjects } from "./dataLifecycle";

export type ProjectMutation =
  | { type: "project.upsert"; project: Project }
  | { type: "project.delete"; projectId: string }
  | { type: "audit.append"; event: AuditEvent };

export interface ProjectRepository {
  listProjects(): Promise<Project[]>;
  getProject(projectId: string): Promise<Project | null>;
  apply(mutation: ProjectMutation): Promise<void>;
}

export class BrowserProjectRepository implements ProjectRepository {
  constructor(private readonly storageKey = "ccpro-store-v3") {}

  async listProjects(): Promise<Project[]> {
    return normalizeProjects(this.readStore().state?.projects);
  }

  async getProject(projectId: string): Promise<Project | null> {
    const projects = await this.listProjects();
    return projects.find((project) => project.id === projectId) ?? null;
  }

  async apply(mutation: ProjectMutation): Promise<void> {
    const store = this.readStore();
    const projects = normalizeProjects(store.state?.projects);
    const nextProjects = applyProjectMutation(projects, mutation);
    this.writeStore({ ...store, state: { ...store.state, projects: nextProjects } });
  }

  private readStore(): { state?: { projects?: unknown[]; activeProjectId?: string | null } } {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as {
        state?: { projects?: unknown[]; activeProjectId?: string | null };
      };
    } catch {
      return {};
    }
  }

  private writeStore(store: unknown) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(this.storageKey, JSON.stringify(store));
  }
}

export function applyProjectMutation(projects: Project[], mutation: ProjectMutation): Project[] {
  switch (mutation.type) {
    case "project.upsert": {
      const project = normalizeProject(mutation.project);
      const exists = projects.some((p) => p.id === project.id);
      return exists
        ? projects.map((p) => (p.id === project.id ? project : p))
        : [...projects, project];
    }
    case "project.delete":
      return projects.filter((project) => project.id !== mutation.projectId);
    case "audit.append":
      return projects.map((project) =>
        project.id === mutation.event.projectId
          ? { ...project, auditLog: [...(project.auditLog ?? []), mutation.event] }
          : project,
      );
  }
}
