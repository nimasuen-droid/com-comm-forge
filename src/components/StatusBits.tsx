import { ragDot } from "@/lib/kpi";
import type { RAG } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusDot({
  status,
  label,
  className,
}: {
  status: RAG;
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span className={cn("h-2 w-2 rounded-full ring-2 ring-background", ragDot[status])} />
      {label && <span className="text-muted-foreground">{label}</span>}
    </span>
  );
}

export function PercentBar({
  value,
  tone = "primary",
}: {
  value: number;
  tone?: "primary" | "success" | "warning" | "destructive" | "accent";
}) {
  const colorClass = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    accent: "bg-accent",
  }[tone];
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn("h-full transition-all", colorClass)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
