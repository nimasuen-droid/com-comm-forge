import { Link, useRouterState } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Search, Bell, Plus } from "lucide-react";

export function TopBar() {
  const pathname = useRouterState({ select: r => r.location.pathname });
  const projects = useStore(s => s.projects);
  const activeId = useStore(s => s.activeProjectId);
  const active = projects.find(p => p.id === activeId);

  const crumbs = pathname.split("/").filter(Boolean);

  return (
    <header className="h-14 border-b border-border bg-panel/80 backdrop-blur flex items-center px-5 gap-4 sticky top-0 z-20">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="text-muted-foreground/50">/</span>
            <span className="font-mono text-xs text-foreground/80 capitalize">{c.length > 12 ? c.slice(0, 6) + "…" : c}</span>
          </span>
        ))}
      </div>
      <div className="flex-1" />
      {active && (
        <div className="hidden lg:flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="font-mono text-muted-foreground">PROJECT:</span>
          <span className="font-medium">{active.name}</span>
        </div>
      )}
      <button className="h-9 w-9 rounded-md border border-border hover:bg-muted/50 flex items-center justify-center">
        <Search className="h-4 w-4" />
      </button>
      <button className="h-9 w-9 rounded-md border border-border hover:bg-muted/50 flex items-center justify-center relative">
        <Bell className="h-4 w-4" />
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
      </button>
      <Link to="/projects" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 h-9 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
        <Plus className="h-3.5 w-3.5" /> New Project
      </Link>
    </header>
  );
}
