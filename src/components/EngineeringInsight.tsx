import { useState, type ReactNode } from "react";
import { Lightbulb, ChevronDown, AlertTriangle, CheckCircle2, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  why?: ReactNode;
  problems?: ReactNode;
  best?: ReactNode;
  defaultOpen?: boolean;
  variant?: "default" | "compact";
}

export function EngineeringInsight({
  title = "Engineering Insight",
  why,
  problems,
  best,
  defaultOpen = false,
  variant = "default",
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("panel overflow-hidden", variant === "compact" && "text-sm")}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="h-8 w-8 rounded-md bg-accent/15 flex items-center justify-center border border-accent/30">
          <Lightbulb className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">
            Why it matters · Common field issues · Best practice
          </div>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 grid md:grid-cols-3 gap-3 border-t border-border">
          <Block
            icon={<BookOpen className="h-4 w-4 text-info" />}
            label="Why this matters"
            tone="info"
          >
            {why}
          </Block>
          <Block
            icon={<AlertTriangle className="h-4 w-4 text-warning" />}
            label="Common field problems"
            tone="warning"
          >
            {problems}
          </Block>
          <Block
            icon={<CheckCircle2 className="h-4 w-4 text-success" />}
            label="Best practice"
            tone="success"
          >
            {best}
          </Block>
        </div>
      )}
    </div>
  );
}

function Block({
  icon,
  label,
  children,
  tone,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  tone: "info" | "warning" | "success";
}) {
  const border =
    tone === "info"
      ? "border-info/30"
      : tone === "warning"
        ? "border-warning/30"
        : "border-success/30";
  return (
    <div className={cn("rounded-md border bg-card/50 p-3", border)}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      </div>
      <div className="text-sm text-foreground/90 leading-relaxed">{children}</div>
    </div>
  );
}
