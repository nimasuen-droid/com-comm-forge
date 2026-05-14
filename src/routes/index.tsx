import { createFileRoute, Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { useStore } from "@/lib/store";
import { projectKpis } from "@/lib/kpi";
import { PercentBar } from "@/components/StatusBits";
import { EngineeringInsight } from "@/components/EngineeringInsight";
import {
  Activity,
  AlertTriangle,
  ListChecks,
  Package,
  TrendingUp,
  Zap,
  ArrowRight,
  Gauge,
} from "lucide-react";

type ProgressTone = ComponentProps<typeof PercentBar>["tone"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Portfolio Dashboard — Completions & Commissioning Pro" },
      {
        name: "description",
        content: "Multi-project EPC completions and commissioning portfolio dashboard.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const allProjects = useStore((s) => s.projects);
  const setActive = useStore((s) => s.setActive);
  const projects = allProjects.filter((p) => !p.archived);

  const totals = projects.reduce(
    (acc, p) => {
      const k = projectKpis(p);
      acc.systems += k.systems;
      acc.subs += k.subsystems;
      acc.openA += k.punchA;
      acc.openB += k.punchB;
      acc.openC += k.punchC;
      acc.mc += k.mcPct;
      acc.comm += k.commPct;
      return acc;
    },
    { systems: 0, subs: 0, openA: 0, openB: 0, openC: 0, mc: 0, comm: 0 },
  );
  const n = projects.length || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            Portfolio Overview
          </div>
          <h1 className="text-3xl font-bold mt-1">Completions Command Center</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live readiness, punch posture, and commissioning sequence across {projects.length}{" "}
            active project{projects.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-semibold hover:bg-accent/90"
        >
          Manage Projects <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          icon={<Package />}
          label="Active Projects"
          value={projects.length}
          accent="primary"
        />
        <KpiTile
          icon={<Gauge />}
          label="Avg MC Readiness"
          value={`${Math.round(totals.mc / n)}%`}
          accent="success"
        />
        <KpiTile
          icon={<Activity />}
          label="Avg Commissioning"
          value={`${Math.round(totals.comm / n)}%`}
          accent="info"
        />
        <KpiTile
          icon={<AlertTriangle />}
          label="Open A-Punches"
          value={totals.openA}
          accent="destructive"
          sub={`${totals.openB} B · ${totals.openC} C`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground px-1">
            Project Portfolio
          </h2>
          {projects.length === 0 ? (
            <div className="panel p-10 text-center">
              <p className="text-muted-foreground">
                No active projects. Create one to get started.
              </p>
              <Link
                to="/projects"
                className="inline-block mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                New Project
              </Link>
            </div>
          ) : (
            projects.map((p) => {
              const k = projectKpis(p);
              return (
                <Link
                  key={p.id}
                  to="/projects/$projectId/systems"
                  params={{ projectId: p.id }}
                  onClick={() => setActive(p.id)}
                  className="panel block p-5 hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                        {p.client} · {p.location}
                      </div>
                      <div className="text-lg font-bold mt-0.5 group-hover:text-primary transition-colors">
                        {p.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{p.type}</div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {k.punchA > 0 && (
                        <span className="tag-chip !bg-destructive/20 !border-destructive/40 text-destructive">
                          A:{k.punchA}
                        </span>
                      )}
                      {k.punchB > 0 && (
                        <span className="tag-chip !bg-warning/20 !border-warning/40 text-warning">
                          B:{k.punchB}
                        </span>
                      )}
                      {k.punchC > 0 && <span className="tag-chip">C:{k.punchC}</span>}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Mini label="MC" value={k.mcPct} tone="success" />
                    <Mini label="RFSU" value={k.rfsuPct} tone="warning" />
                    <Mini label="Commissioning" value={k.commPct} tone="primary" />
                    <Mini label="Handover" value={k.handoverPct} tone="accent" />
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground font-mono">
                    <span>{k.systems} systems</span>
                    <span>·</span>
                    <span>{k.subsystems} subsystems</span>
                    <span>·</span>
                    <span>
                      {k.punchOpen}/{k.punchTotal} punches open
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        <aside className="space-y-4">
          <div className="panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold">Critical Path Alerts</h3>
            </div>
            <ul className="space-y-2.5 text-sm">
              {projects.flatMap((p) =>
                p.punches
                  .filter((x) => x.category === "A" && x.status !== "closed")
                  .slice(0, 4)
                  .map((x) => (
                    <li
                      key={x.id}
                      className="flex items-start gap-2 border-l-2 border-destructive pl-3 py-0.5"
                    >
                      <span className="flex-1">
                        <span className="font-medium">{x.title}</span>
                        <div className="text-xs text-muted-foreground">{p.name}</div>
                      </span>
                    </li>
                  )),
              )}
              {projects.every(
                (p) => !p.punches.some((x) => x.category === "A" && x.status !== "closed"),
              ) && <li className="text-xs text-muted-foreground">No critical A-punches open. ✓</li>}
            </ul>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-info" />
              <h3 className="text-sm font-semibold">Upcoming Activities</h3>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>• Loop check campaign — ICSS Cabinet Room</li>
              <li>• Cause &amp; Effect functional test — F&amp;G Loops Unit 10</li>
              <li>• Hydrotest reinstatement — IA Distribution Network</li>
              <li>• Walkdown — P-1001 A/B mechanical alignment</li>
            </ul>
          </div>
        </aside>
      </div>

      <EngineeringInsight
        title="Why a phased completion strategy matters"
        defaultOpen
        why="Subsystem-based completion lets utilities and ICSS reach RFSU first, so process systems can be energised, instrument-air can be supplied, and loop checks can run before bulk commissioning. Without this sequencing, commissioning teams stall waiting on cross-discipline readiness."
        problems="Teams declare full systems 'mechanically complete' too early, hiding rework; A-punches accumulate because B/C are deprioritised; vendor scopes (compressors, ICSS) aren't sequenced with operations acceptance windows."
        best="Lock turnover boundaries early; treat A-punches as walkdown blockers; track RFSU per subsystem, not per system; involve operations in walkdowns from MC-1 onward; keep preservation logs alive until startup."
      />
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent: string;
  sub?: string;
}) {
  const colors: Record<string, string> = {
    primary: "from-primary/30 to-primary/5 border-primary/30 text-primary",
    success: "from-success/30 to-success/5 border-success/30 text-success",
    info: "from-info/30 to-info/5 border-info/30 text-info",
    destructive: "from-destructive/30 to-destructive/5 border-destructive/30 text-destructive",
  };
  return (
    <div className="stat-tile relative overflow-hidden">
      <div
        className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${colors[accent]} blur-xl opacity-40`}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {label}
          </div>
          <div
            className={`h-8 w-8 rounded-md border flex items-center justify-center ${colors[accent].split(" ").slice(-1)[0]}`}
          >
            <div className="[&_svg]:h-4 [&_svg]:w-4">{icon}</div>
          </div>
        </div>
        <div className="text-3xl font-bold mt-2 tabular-nums">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone: ProgressTone }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
          {label}
        </span>
        <span className="font-bold tabular-nums">{value}%</span>
      </div>
      <div className="mt-1.5">
        <PercentBar value={value} tone={tone} />
      </div>
    </div>
  );
}
