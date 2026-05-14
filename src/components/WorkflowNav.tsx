import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, GitBranch, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  to:
    | "/projects/$projectId/systems"
    | "/projects/$projectId/punch"
    | "/projects/$projectId/mc"
    | "/projects/$projectId/commissioning"
    | "/projects/$projectId/turnover"
    | "/projects/$projectId/preservation"
    | "/projects/$projectId/documents"
    | "/projects/$projectId/workflow";
  projectId: string;
  label: string;
}

export function WorkflowNav({
  prev,
  next,
  related,
  dependency,
  className,
}: {
  prev?: Step;
  next?: Step;
  related?: Step;
  dependency?: Step;
  className?: string;
}) {
  return (
    <div className={cn("panel flex flex-wrap items-center gap-2 p-3", className)}>
      {prev && (
        <Link
          to={prev.to}
          params={{ projectId: prev.projectId }}
          className="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs font-medium hover:bg-secondary"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" /> <span>Previous / {prev.label}</span>
        </Link>
      )}
      {dependency && (
        <Link
          to={dependency.to}
          params={{ projectId: dependency.projectId }}
          className="inline-flex max-w-full items-center gap-2 rounded-md border border-info/40 bg-info/10 px-3 py-2 text-xs font-medium text-info hover:bg-info/20"
        >
          <Link2 className="h-3.5 w-3.5 shrink-0" /> <span>Upstream / {dependency.label}</span>
        </Link>
      )}
      {related && (
        <Link
          to={related.to}
          params={{ projectId: related.projectId }}
          className="inline-flex max-w-full items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent hover:bg-accent/20"
        >
          <GitBranch className="h-3.5 w-3.5 shrink-0" /> <span>Related / {related.label}</span>
        </Link>
      )}
      <div className="flex-1" />
      {next && (
        <Link
          to={next.to}
          params={{ projectId: next.projectId }}
          className="inline-flex max-w-full items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <span>Next / {next.label}</span> <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </Link>
      )}
    </div>
  );
}
