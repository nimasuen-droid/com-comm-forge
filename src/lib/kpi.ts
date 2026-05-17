import type { Project, RAG } from "./types";
import { turnoverProgress } from "./derive";

export const ragColor: Record<RAG, string> = {
  red: "bg-destructive text-destructive-foreground",
  amber: "bg-warning text-warning-foreground",
  green: "bg-success text-success-foreground",
  grey: "bg-muted text-white",
};

export const ragDot: Record<RAG, string> = {
  red: "bg-destructive",
  amber: "bg-warning",
  green: "bg-success",
  grey: "bg-muted-foreground/40",
};

export const ragTextColor: Record<RAG, string> = {
  red: "text-destructive",
  amber: "text-warning",
  green: "text-success",
  grey: "text-white",
};

const ragScore: Record<RAG, number> = { green: 100, amber: 50, red: 10, grey: 0 };

export function projectKpis(p: Project) {
  const subs = p.systems.flatMap((s) => s.subsystems);
  const total = subs.length || 1;
  const avg = (key: "mcStatus" | "rfsuStatus" | "commStatus" | "turnoverStatus") =>
    Math.round(subs.reduce((acc, s) => acc + ragScore[s[key]], 0) / total);
  const avgProgress = (pctFor: (ss: (typeof subs)[number]) => number) =>
    Math.round(subs.reduce((acc, ss) => acc + pctFor(ss), 0) / total);
  const punchOpen = p.punches.filter((x) => x.status !== "closed");
  return {
    systems: p.systems.length,
    subsystems: subs.length,
    mcPct: avg("mcStatus"),
    rfsuPct: avg("rfsuStatus"),
    commPct: avg("commStatus"),
    handoverPct: avgProgress((ss) => turnoverProgress(ss, p).pct),
    punchTotal: p.punches.length,
    punchOpen: punchOpen.length,
    punchA: punchOpen.filter((x) => x.category === "A").length,
    punchB: punchOpen.filter((x) => x.category === "B").length,
    punchC: punchOpen.filter((x) => x.category === "C").length,
  };
}

export function pctRag(pct: number): RAG {
  if (pct >= 80) return "green";
  if (pct >= 40) return "amber";
  if (pct > 0) return "red";
  return "grey";
}
