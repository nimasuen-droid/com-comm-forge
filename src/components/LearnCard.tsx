import { useState, type ReactNode } from "react";
import { GraduationCap, X, BookOpen, Cog, Package, Target, AlertTriangle, FileText, Library } from "lucide-react";
import { LEARN, type ModuleKey, type LearnConcept } from "@/lib/learn";
import { ABBREVIATIONS } from "@/lib/abbreviations";
import { AbbrText } from "@/components/AbbrText";
import { cn } from "@/lib/utils";

/**
 * Horizontal strip of "Learn" chips for a module. Click any chip → a focused
 * pop-up card explains Why / How / What / Drivers (+ pitfalls + standards).
 *
 * Drop one <LearnRail module="mc" /> into each module page to give zero-experience
 * users an in-context competency path while they execute.
 */
export function LearnRail({ module, title = "Build competency" }: { module: ModuleKey; title?: string }) {
  const [active, setActive] = useState<LearnConcept | null>(null);
  const concepts = LEARN[module] ?? [];

  return (
    <div className="panel p-4 bg-gradient-to-br from-accent/8 to-transparent border-accent/30">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center">
          <GraduationCap className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold leading-tight">{title}</div>
          <div className="text-[11px] text-muted-foreground">Tap a topic — Why · How · What · Drivers</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {concepts.map(c => (
          <button
            key={c.id}
            onClick={() => setActive(c)}
            className="group inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent/10 hover:border-accent/50 transition-colors"
          >
            <BookOpen className="h-3 w-3 text-accent" />
            <span>{c.title}</span>
            {c.tag && <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground group-hover:text-accent">{c.tag}</span>}
          </button>
        ))}
      </div>

      {active && <LearnModal concept={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function LearnModal({ concept, onClose }: { concept: LearnConcept; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="panel max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start gap-3 p-5 border-b border-border bg-card/95 backdrop-blur">
          <div className="h-10 w-10 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
            <GraduationCap className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            {concept.tag && (
              <div className="text-[10px] font-mono uppercase tracking-widest text-accent">{concept.tag}</div>
            )}
            <h3 className="text-lg font-bold leading-tight">{concept.title}</h3>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <Block icon={<BookOpen className="h-4 w-4 text-info" />} label="Why this matters" tone="info">
            {concept.why}
          </Block>
          <Block icon={<Cog className="h-4 w-4 text-primary" />} label="How it's done in the field" tone="primary">
            {concept.how}
          </Block>
          <Block icon={<Package className="h-4 w-4 text-success" />} label="What it produces" tone="success">
            {concept.what}
          </Block>
          <Block icon={<Target className="h-4 w-4 text-accent" />} label="What it drives" tone="accent">
            {concept.drives}
          </Block>
          {concept.pitfalls && (
            <Block icon={<AlertTriangle className="h-4 w-4 text-warning" />} label="Common pitfalls" tone="warning">
              {concept.pitfalls}
            </Block>
          )}
          {concept.standards && (
            <Block icon={<FileText className="h-4 w-4 text-muted-foreground" />} label="Standards & references" tone="muted">
              {concept.standards}
            </Block>
          )}
        </div>
      </div>
    </div>
  );
}

function Block({ icon, label, children, tone }: { icon: ReactNode; label: string; children: ReactNode; tone: "info" | "primary" | "success" | "accent" | "warning" | "muted" }) {
  const border = {
    info: "border-info/30 bg-info/5",
    primary: "border-primary/30 bg-primary/5",
    success: "border-success/30 bg-success/5",
    accent: "border-accent/30 bg-accent/5",
    warning: "border-warning/30 bg-warning/5",
    muted: "border-border bg-muted/20",
  }[tone];
  return (
    <div className={cn("rounded-md border p-3", border)}>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
      <div className="text-sm text-foreground/90 leading-relaxed">{children}</div>
    </div>
  );
}
