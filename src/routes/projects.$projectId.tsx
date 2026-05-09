import { createFileRoute, Outlet, Link, useRouterState, useParams, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useStore, useProject } from "@/lib/store";
import { projectKpis } from "@/lib/kpi";
import { PercentBar } from "@/components/StatusBits";
import { Network, ListChecks, ShieldCheck, Activity, PackageCheck, Wrench, FileText, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/$projectId")({
  beforeLoad: ({ params }) => {
    // ensure exists handled in component (store is client-only)
    return { projectId: params.projectId };
  },
  component: ProjectLayout,
});

const tabs = [
  { slug: "systems", label: "Systems", icon: Network },
  { slug: "punch", label: "Punch", icon: ListChecks },
  { slug: "mc", label: "MC", icon: ShieldCheck },
  { slug: "commissioning", label: "Commissioning", icon: Activity },
  { slug: "turnover", label: "Turnover", icon: PackageCheck },
  { slug: "preservation", label: "Preservation", icon: Wrench },
  { slug: "documents", label: "Documents", icon: FileText },
  { slug: "workflow", label: "Workflow", icon: GitBranch },
];

function ProjectLayout() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId);
  const setActive = useStore(s => s.setActive);
  const pathname = useRouterState({ select: r => r.location.pathname });

  useEffect(() => { if (project) setActive(project.id); }, [project, setActive]);

  if (!project) {
    return (
      <div className="panel p-10 text-center">
        <p className="text-muted-foreground">Project not found.</p>
        <Link to="/projects" className="inline-block mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Back to Projects</Link>
      </div>
    );
  }

  const k = projectKpis(project);

  return (
    <div className="space-y-5">
      <div className="panel p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{project.client} · {project.location}</div>
            <h1 className="text-2xl font-bold mt-0.5">{project.name}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{project.description || project.type}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 min-w-[280px]">
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

      <nav className="panel p-1.5 flex gap-1 overflow-x-auto">
        {tabs.map(t => {
          const to = `/projects/${project.id}/${t.slug}`;
          const active = pathname.startsWith(to);
          return (
            <Link key={t.slug} to={to} className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default"|"destructive"|"warning" }) {
  const c = tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("text-2xl font-bold tabular-nums", c)}>{value}</div>
    </div>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: any }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">{label}</span>
        <span className="font-bold tabular-nums">{value}%</span>
      </div>
      <div className="mt-1.5"><PercentBar value={value} tone={tone} /></div>
    </div>
  );
}
