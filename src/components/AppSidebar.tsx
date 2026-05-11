import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FolderKanban, Network, ListChecks, ShieldCheck,
  Activity, PackageCheck, Wrench, FileText, GitBranch, Cog, Info
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type ProjectRoute = "/projects/$projectId/systems" | "/projects/$projectId/punch" | "/projects/$projectId/mc" | "/projects/$projectId/commissioning" | "/projects/$projectId/turnover" | "/projects/$projectId/preservation" | "/projects/$projectId/documents" | "/projects/$projectId/workflow";

export function AppSidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarBody />
    </aside>
  );
}

export function SidebarBody() {
  const pathname = useRouterState({ select: r => r.location.pathname });
  const activeId = useStore(s => s.activeProjectId);
  const projectExists = useStore(s => activeId ? s.projects.some(p => p.id === activeId) : false);

  const top = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/projects", label: "Projects", icon: FolderKanban },
    { to: "/about", label: "About this app", icon: Info },
  ];

  const projectNav = projectExists && activeId ? [
    { to: "/projects/$projectId/systems" as const, slug: "systems", label: "Systemization", icon: Network },
    { to: "/projects/$projectId/preservation" as const, slug: "preservation", label: "Preservation", icon: Wrench },
    { to: "/projects/$projectId/punch" as const, slug: "punch", label: "Punch List", icon: ListChecks },
    { to: "/projects/$projectId/mc" as const, slug: "mc", label: "Mechanical Completion", icon: ShieldCheck },
    { to: "/projects/$projectId/commissioning" as const, slug: "commissioning", label: "Commissioning", icon: Activity },
    { to: "/projects/$projectId/turnover" as const, slug: "turnover", label: "Turnover & Handover", icon: PackageCheck },
    { to: "/projects/$projectId/documents" as const, slug: "documents", label: "Documentation", icon: FileText },
    { to: "/projects/$projectId/workflow" as const, slug: "workflow", label: "Workflow Engine", icon: GitBranch },
  ] : [];

  return (
    <div className="flex flex-col h-full w-full bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-primary to-info flex items-center justify-center">
            <Cog className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">Completions &</div>
            <div className="text-sm font-bold leading-tight">Commissioning <span className="text-accent">Pro</span></div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        <Section title="Workspace">
          {top.map(i => (
            <NavItem key={i.to} to={i.to} icon={i.icon} label={i.label}
              active={i.exact ? pathname === i.to : pathname.startsWith(i.to)} />
          ))}
        </Section>

        {projectNav.length > 0 && (
          <Section title="Active Project">
            {projectNav.map(i => (
              <ProjectNavItem key={i.to} to={i.to} projectId={activeId!} icon={i.icon} label={i.label}
                active={pathname.startsWith(`/projects/${activeId}/${i.slug}`)} />
            ))}
          </Section>
        )}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          v1.0 · Local Storage
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-2 mb-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function NavItem({ to, icon: Icon, label, active }: { to: string; icon: any; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function ProjectNavItem({ to, projectId, icon: Icon, label, active }: { to: ProjectRoute; projectId: string; icon: any; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      params={{ projectId }}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
