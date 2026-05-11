import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Plus, Menu, X } from "lucide-react";
import { SidebarBody } from "./AppSidebar";

export function TopBar() {
  const pathname = useRouterState({ select: r => r.location.pathname });
  const projects = useStore(s => s.projects);
  const activeId = useStore(s => s.activeProjectId);
  const active = projects.find(p => p.id === activeId);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Build readable breadcrumbs: replace project IDs with project name
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((s, i) => {
    if (segments[i - 1] === "projects" && active && s === activeId) {
      return active.name;
    }
    return s.replace(/-/g, " ");
  });

  return (
    <>
      <header className="h-14 border-b border-border bg-panel/80 backdrop-blur flex items-center px-3 sm:px-5 gap-2 sm:gap-4 sticky top-0 z-20">
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden h-9 w-9 rounded-md border border-border hover:bg-muted/50 flex items-center justify-center shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5 text-sm min-w-0 flex-1 overflow-hidden">
          <Link to="/" className="text-muted-foreground hover:text-foreground shrink-0">Home</Link>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              <span className="text-muted-foreground/50 shrink-0">/</span>
              <span className="font-mono text-xs text-foreground/80 capitalize truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
                {c}
              </span>
            </span>
          ))}
        </div>

        {active && (
          <div className="hidden lg:flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs shrink-0">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="font-mono text-muted-foreground">PROJECT:</span>
            <span className="font-medium truncate max-w-[200px]">{active.name}</span>
          </div>
        )}
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2 sm:px-3 h-9 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Project</span>
        </Link>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 shadow-xl" onClick={() => setMobileOpen(false)}>
            <SidebarBody />
          </div>
        </div>
      )}
    </>
  );
}
