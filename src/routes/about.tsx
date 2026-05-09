import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck, ListChecks, Activity, PackageCheck, Wrench, Network,
  FileText, GitBranch, Gauge, AlertTriangle, ArrowRight, HardHat, Factory
} from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Completions & Commissioning Pro" },
      { name: "description", content: "What Completions & Commissioning Pro does: a field execution platform for EPC mechanical completion, commissioning, punch list, preservation, and turnover management." },
      { property: "og:title", content: "About — Completions & Commissioning Pro" },
      { property: "og:description", content: "Field execution platform for EPC completions, commissioning and turnover." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      <header>
        <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">About this app</div>
        <h1 className="text-3xl font-bold mt-1">Completions & Commissioning Pro</h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">
          A field-execution platform for <b>EPC completions, mechanical completion (MC), commissioning, and turnover</b> on
          oil &amp; gas, refinery, petrochemical, LNG, offshore, FPSO, pipeline, and utility projects. It replaces the
          tangle of spreadsheets, PDFs and emails that completions teams normally use to drive a project from
          construction to operations.
        </p>
      </header>

      <section className="panel p-6">
        <div className="flex items-center gap-2">
          <Factory className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Who it is for</h2>
        </div>
        <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
          <Li>Completions Managers &amp; Commissioning Managers</Li>
          <Li>Systems Completion Engineers</Li>
          <Li>Discipline Engineers (Piping, E&amp;I, Mechanical, F&amp;G)</Li>
          <Li>Construction &amp; QA/QC Supervisors</Li>
          <Li>Operations Readiness &amp; Start-up Teams</Li>
          <Li>EPC Project Controls &amp; Turnover Coordinators</Li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">What it does</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Card icon={<Network className="text-primary" />} title="Systemization"
            text="Break the project into systems and subsystems with disciplines, priority, tags, and turnover boundaries — the foundation every other module uses." />
          <Card icon={<Wrench className="text-info" />} title="Preservation"
            text="Track equipment lay-up, preservation intervals, and overdue actions so rotating equipment and instruments don't degrade before start-up." />
          <Card icon={<ListChecks className="text-warning" />} title="Punch List"
            text="Manage Category A/B/C punches by discipline, system and responsibility. A-punches block MC; B/C are tracked through start-up." />
          <Card icon={<ShieldCheck className="text-success" />} title="Mechanical Completion"
            text="Walkdown, hydrotest, flushing, reinstatement, preservation and A-punch checks per subsystem with a one-click MC dossier." />
          <Card icon={<Activity className="text-primary" />} title="Commissioning"
            text="Energization sequence, loop checks, function tests, cause &amp; effect, and dynamic testing per subsystem with RAG status." />
          <Card icon={<PackageCheck className="text-accent" />} title="Turnover & Handover"
            text="Phased handover (RFSU → RFO → Care, Custody &amp; Control) with witness sign-off and outstanding work captured." />
          <Card icon={<FileText className="text-muted-foreground" />} title="Documentation"
            text="Per-project document register for ITRs, certificates, vendor packs and final dossiers." />
          <Card icon={<GitBranch className="text-info" />} title="Workflow Engine"
            text="A connected execution flow — Construction → MC → Pre-comm → Commissioning → Start-up → Handover — with gate criteria." />
        </div>
      </section>

      <section className="panel p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/30">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">How it works in practice</h2>
        </div>
        <ol className="mt-4 space-y-3 text-sm">
          <Step n={1} title="Create a project" text="Operator, site, project type, and scope description." />
          <Step n={2} title="Define systems & subsystems" text="Set boundaries, disciplines, priority and tags." />
          <Step n={3} title="Run preservation & raise punches" text="Capture defects from walkdowns; keep preservation alive during lay-up." />
          <Step n={4} title="Drive subsystems through MC" text="Close A-punches, complete walkdown / hydrotest / flushing, declare MC." />
          <Step n={5} title="Commission and energise" text="Loop check, function test, dynamic run — by subsystem, in sequence." />
          <Step n={6} title="Hand over to operations" text="RFSU → RFO with witness sign-off and final dossier." />
        </ol>
      </section>

      <section className="panel p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h2 className="text-lg font-bold">What this app is NOT</h2>
        </div>
        <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
          <Li>Not a training course or e-learning handbook</Li>
          <Li>Not a generic project management / Gantt tool</Li>
          <Li>Not a document management system replacement</Li>
          <Li>Not a CMMS (it complements, doesn't replace SAP/Maximo)</Li>
        </ul>
      </section>

      <section className="panel p-6">
        <div className="flex items-center gap-2">
          <HardHat className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold">Why it exists</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          On industrial projects, the gap between &ldquo;construction finished&rdquo; and &ldquo;plant producing&rdquo; is where schedules slip
          and budgets blow out. Completions, MC, commissioning and turnover are usually run on disconnected
          spreadsheets, with no shared view of subsystem readiness, punch posture or preservation status. This app
          gives the completions team one execution surface — built around how EPC projects actually run — so
          handover decisions are driven by data, not opinion.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link to="/projects" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Open Projects <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-muted/50">
          Portfolio Dashboard
        </Link>
      </div>
    </div>
  );
}

function Card({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2">
        <div className="[&_svg]:h-4 [&_svg]:w-4">{icon}</div>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex-shrink-0 h-7 w-7 rounded-md bg-primary/15 border border-primary/30 text-primary font-bold text-xs flex items-center justify-center font-mono">{n}</span>
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{text}</div>
      </div>
    </li>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="flex items-start gap-2"><span className="text-primary mt-1">▸</span><span>{children}</span></li>;
}
