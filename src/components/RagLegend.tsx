import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reusable RAG (Red/Amber/Green/Grey) status legend.
 * Explains what the colours mean on subsystem rows and where they come from,
 * so users without project-controls background can self-serve.
 */
export function RagLegend({ defaultOpen = false, className }: { defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("panel overflow-hidden", className)}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors">
        <div className="h-8 w-8 rounded-md bg-info/15 flex items-center justify-center border border-info/30">
          <Info className="h-4 w-4 text-info" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Status colours — what they mean & how they're driven</div>
          <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
            <Dot tone="success" /> Green
            <Dot tone="warning" /> Amber
            <Dot tone="destructive" /> Red
            <Dot tone="muted" /> Grey
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <Row tone="success" title="Green — Complete" desc="Weighted progress = 100% and no open A-punches." />
            <Row tone="warning" title="Amber — In progress" desc="Weighted progress ≥ 50% but gates still open." />
            <Row tone="destructive" title="Red — Started / blocked" desc="Some progress but critical items or A-punches open." />
            <Row tone="muted" title="Grey — Not started" desc="No checks completed for this subsystem yet." />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Card title="Four columns per subsystem">
              <ul className="space-y-1 text-sm leading-relaxed">
                <li><b>MC</b> — Mechanical Completion (walkdown, hydrotest, flushing, reinstatement, preservation, A-punch closure).</li>
                <li><b>RFSU</b> — Ready For Start-Up (MC + pre-comm gates).</li>
                <li><b>Comm</b> — Commissioning (energise, loops, C&E, functional, performance, reliability).</li>
                <li><b>Handover</b> — Turnover to Ops (MC cert, RFSU cert, comm complete, ops accept, CCC).</li>
              </ul>
            </Card>
            <Card title="How status is driven">
              <ul className="space-y-1 text-sm leading-relaxed">
                <li>1. <b>Module checklists</b> — ticks in the MC, Commissioning and Turnover modules contribute <b>weighted</b> % (see Weighting Basis on each module page).</li>
                <li>2. <b>Punch List</b> — any open <b>Cat-A</b> punch on a subsystem acts as a hard gate and prevents MC going Green.</li>
                <li>3. <b>Manual override</b> — the dropdowns on this page let you set a baseline or capture vendor/external scope. Once you tick checks in the modules, derived status takes over.</li>
              </ul>
            </Card>
          </div>

          <div className="text-xs text-muted-foreground">
            Weighting basis follows global industry practice (CII, IPA, Shell DEP, Aramco SAEP, IOGP). Open the <b>Weighting Basis</b> panel on the MC, Commissioning or Turnover modules to view or override the percentages.
          </div>
        </div>
      )}
    </div>
  );
}

function Dot({ tone }: { tone: "success" | "warning" | "destructive" | "muted" }) {
  const cls = {
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    muted: "bg-muted-foreground/40",
  }[tone];
  return <span className={cn("inline-block h-2 w-2 rounded-full", cls)} />;
}

function Row({ tone, title, desc }: { tone: "success" | "warning" | "destructive" | "muted"; title: string; desc: string }) {
  const border = {
    success: "border-success/30",
    warning: "border-warning/30",
    destructive: "border-destructive/30",
    muted: "border-border",
  }[tone];
  return (
    <div className={cn("rounded-md border bg-card/50 p-2.5", border)}>
      <div className="flex items-center gap-2 mb-1">
        <Dot tone={tone} />
        <div className="text-xs font-semibold">{title}</div>
      </div>
      <div className="text-xs text-muted-foreground leading-snug">{desc}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card/50 p-3">
      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}
