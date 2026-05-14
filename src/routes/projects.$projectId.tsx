import { createFileRoute, Outlet, Link, useRouterState, useParams } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { useEffect } from "react";
import { useStore, useProject } from "@/lib/store";
import { projectKpis } from "@/lib/kpi";
import { PercentBar } from "@/components/StatusBits";
import {
  Network,
  ListChecks,
  ShieldCheck,
  Activity,
  PackageCheck,
  Wrench,
  FileText,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ProgressTone = ComponentProps<typeof PercentBar>["tone"];

export const Route = createFileRoute("/projects/$projectId")({
  beforeLoad: ({ params }) => {
    // ensure exists handled in component (store is client-only)
    return { projectId: params.projectId };
  },
  component: ProjectLayout,
});

const tabs = [
  { route: "/projects/$projectId/systems", slug: "systems", label: "Systems", icon: Network },
  {
    route: "/projects/$projectId/preservation",
    slug: "preservation",
    label: "Preservation",
    icon: Wrench,
  },
  { route: "/projects/$projectId/punch", slug: "punch", label: "Punch", icon: ListChecks },
  { route: "/projects/$projectId/mc", slug: "mc", label: "MC", icon: ShieldCheck },
  {
    route: "/projects/$projectId/commissioning",
    slug: "commissioning",
    label: "Commissioning",
    icon: Activity,
  },
  {
    route: "/projects/$projectId/turnover",
    slug: "turnover",
    label: "Turnover",
    icon: PackageCheck,
  },
  {
    route: "/projects/$projectId/documents",
    slug: "documents",
    label: "Documents",
    icon: FileText,
  },
  { route: "/projects/$projectId/workflow", slug: "workflow", label: "Workflow", icon: GitBranch },
];

function ProjectLayout() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId);
  const fallbackProjectId = useStore((s) => s.projects[0]?.id);
  const setActive = useStore((s) => s.setActive);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (project) setActive(project.id);
  }, [project, setActive]);

  if (!project) {
    return (
      <div className="panel p-10 text-center">
        <p className="text-muted-foreground">Project not found.</p>
        <div className="mt-4 flex justify-center gap-2">
          {fallbackProjectId && (
            <Link
              to="/projects/$projectId/systems"
              params={{ projectId: fallbackProjectId }}
              className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Open available project
            </Link>
          )}
          <Link
            to="/projects"
            className="inline-block rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted/50"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const k = projectKpis(project);

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {project.client} / {project.location}
            </div>
            <h1 className="text-2xl font-bold mt-0.5">{project.name}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {project.description || project.type}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full sm:w-auto sm:min-w-[280px]">
            <Stat label="Systems" value={k.systems} />
            <Stat label="Subsystems" value={k.subsystems} />
            <Stat label="Open A" value={k.punchA} tone="destructive" />
            <Stat label="Open B" value={k.punchB} tone="warning" />
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Bar label="MC" value={k.mcPct} tone="success" />
          <Bar label="RFSU" value={k.rfsuPct} tone="warning" />
          <Bar label="Comm." value={k.commPct} tone="primary" />
          <Bar label="Handover" value={k.handoverPct} tone="accent" />
        </div>
      </div>

      <nav
        aria-label="Project modules"
        className="panel no-scrollbar flex snap-x gap-1 overflow-x-auto p-1.5"
      >
        {tabs.map((t) => {
          const active = pathname.startsWith(`/projects/${project.id}/${t.slug}`);
          return (
            <Link
              key={t.slug}
              to={t.route}
              params={{ projectId: project.id }}
              className={cn(
                "flex shrink-0 snap-start items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "destructive" | "warning";
}) {
  const c =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : "text-foreground";
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={cn("text-xl sm:text-2xl font-bold tabular-nums", c)}>{value}</div>
    </div>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: ProgressTone }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
          {label}
        </span>
        <span className="font-bold tabular-nums">{value}%</span>
      </div>
      <div className="mt-1.5">
        <PercentBar value={value} tone={tone} />
      </div>
    </div>
  );
}
