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
}

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

export interface Project {
  id: string;
  name: string;
  client: string;
  location: string;
  type: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  systems: SystemNode[];
  punches: PunchItem[];
  documents: DocumentItem[];
  workflow: WorkflowState;
}
