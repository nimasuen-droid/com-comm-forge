import pptxgen from "pptxgenjs";
import jsPDF from "jspdf";
import type { Project } from "./types";
import { projectKpis } from "./kpi";
import { mcProgress, commProgress, turnoverProgress, openAPunchesFor } from "./derive";

// Brand palette (hex; pptx & jspdf both want hex/rgb, not oklch)
const C = {
  bg: "0F1A2A",
  panel: "1A2740",
  text: "F1F5FB",
  muted: "9AA8BF",
  primary: "3FA7E0",
  accent: "F2A93B",
  green: "4FBF7C",
  amber: "F2C24B",
  red: "E0574F",
  grey: "566175",
};

function safe(name: string) { return name.replace(/[^A-Za-z0-9_-]+/g, "_"); }
function ragHex(r: string) {
  return r === "green" ? C.green : r === "amber" ? C.amber : r === "red" ? C.red : C.grey;
}

/* =========================================================
   POWERPOINT — executive status deck
   ========================================================= */
export function exportStatusPresentation(p: Project) {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pres.title = `${p.name} — Status`;
  pres.company = p.client;

  const k = projectKpis(p);
  const subs = p.systems.flatMap(s => s.subsystems);

  // ---------- Slide 1: Cover ----------
  const s1 = pres.addSlide();
  s1.background = { color: C.bg };
  s1.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 0.25, h: 7.5, fill: { color: C.accent } });
  s1.addText("COMPLETIONS & COMMISSIONING", {
    x: 0.7, y: 0.6, w: 12, h: 0.4, color: C.muted, fontFace: "Calibri", fontSize: 14, bold: true, charSpacing: 4,
  });
  s1.addText(p.name, {
    x: 0.7, y: 1.2, w: 12, h: 1.4, color: C.text, fontFace: "Georgia", fontSize: 44, bold: true,
  });
  s1.addText(`${p.client}  ·  ${p.location}  ·  ${p.type}`, {
    x: 0.7, y: 2.7, w: 12, h: 0.5, color: C.primary, fontFace: "Calibri", fontSize: 18,
  });
  s1.addText(`Issued ${new Date().toLocaleDateString()}`, {
    x: 0.7, y: 6.7, w: 12, h: 0.4, color: C.muted, fontFace: "Calibri", fontSize: 12,
  });

  // ---------- Slide 2: KPI dashboard ----------
  const s2 = pres.addSlide();
  s2.background = { color: C.bg };
  s2.addText("Project Status at a Glance", {
    x: 0.5, y: 0.3, w: 12.3, h: 0.6, color: C.text, fontFace: "Georgia", fontSize: 28, bold: true,
  });
  s2.addText(`${p.name} · ${new Date().toLocaleDateString()}`, {
    x: 0.5, y: 0.95, w: 12.3, h: 0.3, color: C.muted, fontSize: 12,
  });

  const tiles = [
    { label: "Systems", value: String(k.systems), tone: C.primary },
    { label: "Subsystems", value: String(k.subsystems), tone: C.primary },
    { label: "MC %", value: `${k.mcPct}%`, tone: C.green },
    { label: "RFSU %", value: `${k.rfsuPct}%`, tone: C.green },
    { label: "Comm %", value: `${k.commPct}%`, tone: C.accent },
    { label: "Handover %", value: `${k.handoverPct}%`, tone: C.accent },
    { label: "Open A-Punches", value: String(k.punchA), tone: k.punchA > 0 ? C.red : C.green },
    { label: "Open Punches", value: String(k.punchOpen), tone: k.punchOpen > 0 ? C.amber : C.green },
  ];
  const tileW = 2.95, tileH = 1.6, gap = 0.2;
  tiles.forEach((t, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 0.5 + col * (tileW + gap);
    const y = 1.5 + row * (tileH + gap);
    s2.addShape(pres.ShapeType.roundRect, {
      x, y, w: tileW, h: tileH, fill: { color: C.panel }, line: { color: C.panel }, rectRadius: 0.08,
    });
    s2.addShape(pres.ShapeType.rect, { x, y, w: 0.08, h: tileH, fill: { color: t.tone }, line: { color: t.tone } });
    s2.addText(t.label, { x: x + 0.25, y: y + 0.15, w: tileW - 0.4, h: 0.35, color: C.muted, fontSize: 11, bold: true, charSpacing: 2 });
    s2.addText(t.value, { x: x + 0.25, y: y + 0.5, w: tileW - 0.4, h: 1, color: C.text, fontFace: "Georgia", fontSize: 36, bold: true });
  });

  // Punch breakdown chart
  s2.addText("Open Punch Breakdown", { x: 0.5, y: 5.1, w: 6, h: 0.35, color: C.text, fontSize: 14, bold: true });
  s2.addChart(pres.ChartType.bar, [{
    name: "Open",
    labels: ["Cat A", "Cat B", "Cat C"],
    values: [k.punchA, k.punchB, k.punchC],
  }], {
    x: 0.5, y: 5.4, w: 6, h: 1.9,
    chartColors: [C.red, C.amber, C.primary],
    showLegend: false, showValue: true,
    catAxisLabelColor: C.muted, valAxisLabelColor: C.muted,
    plotArea: { fill: { color: C.bg } },
  });

  // Workflow gauge bars
  s2.addText("Workflow Progress", { x: 7, y: 5.1, w: 6, h: 0.35, color: C.text, fontSize: 14, bold: true });
  const wf: [string, number][] = [
    ["Construction", p.workflow.construction],
    ["MC", k.mcPct],
    ["Pre-Comm", Math.round((k.mcPct + k.commPct) / 2)],
    ["Commissioning", k.commPct],
    ["Handover", k.handoverPct],
  ];
  wf.forEach((row, i) => {
    const yy = 5.5 + i * 0.36;
    s2.addText(row[0], { x: 7, y: yy, w: 1.6, h: 0.3, color: C.muted, fontSize: 10 });
    s2.addShape(pres.ShapeType.rect, { x: 8.6, y: yy + 0.05, w: 4.0, h: 0.18, fill: { color: C.panel }, line: { color: C.panel } });
    const barW = Math.max(0.05, 4.0 * (row[1] / 100));
    s2.addShape(pres.ShapeType.rect, { x: 8.6, y: yy + 0.05, w: barW, h: 0.18, fill: { color: C.primary }, line: { color: C.primary } });
    s2.addText(`${row[1]}%`, { x: 12.65, y: yy, w: 0.65, h: 0.3, color: C.text, fontSize: 10, bold: true });
  });

  // ---------- Slide 3: System status matrix ----------
  const s3 = pres.addSlide();
  s3.background = { color: C.bg };
  s3.addText("System Status Matrix", { x: 0.5, y: 0.3, w: 12.3, h: 0.5, color: C.text, fontFace: "Georgia", fontSize: 26, bold: true });
  s3.addText("RAG status across MC · RFSU · Commissioning · Handover", { x: 0.5, y: 0.85, w: 12.3, h: 0.3, color: C.muted, fontSize: 11 });

  const head = [
    ["System", "Subsystem", "Disc", "MC %", "MC", "Comm %", "Comm", "T/O %", "T/O", "Open A"],
  ];
  const rows = subs.slice(0, 16).map(ss => {
    const sys = p.systems.find(s => s.subsystems.some(x => x.id === ss.id))!;
    const openA = openAPunchesFor(p, sys, ss).length;
    const mc = mcProgress(ss, openA === 0).pct;
    const co = commProgress(ss).pct;
    const to = turnoverProgress(ss).pct;
    return [
      { text: sys.code, options: { color: C.text, bold: true } },
      { text: ss.name, options: { color: C.text } },
      { text: ss.discipline.slice(0, 4), options: { color: C.muted } },
      { text: `${mc}%`, options: { color: C.text } },
      { text: "●", options: { color: ragHex(ss.mcStatus), bold: true, align: "center" as const } },
      { text: `${co}%`, options: { color: C.text } },
      { text: "●", options: { color: ragHex(ss.commStatus), bold: true, align: "center" as const } },
      { text: `${to}%`, options: { color: C.text } },
      { text: "●", options: { color: ragHex(ss.turnoverStatus), bold: true, align: "center" as const } },
      { text: openA ? String(openA) : "—", options: { color: openA ? C.red : C.muted, bold: openA > 0 } },
    ];
  });
  s3.addTable([
    head[0].map(h => ({ text: h, options: { bold: true, color: C.bg, fill: { color: C.accent }, align: "left" as const } })),
    ...rows,
  ], {
    x: 0.5, y: 1.2, w: 12.3, h: 5.8,
    colW: [1.3, 3.5, 0.9, 1.0, 0.7, 1.0, 0.8, 1.0, 0.8, 1.3],
    fontSize: 10, fontFace: "Calibri",
    border: { type: "solid", pt: 0.5, color: C.panel },
  });
  if (subs.length > 16) {
    s3.addText(`+ ${subs.length - 16} more subsystems — see full register export`, {
      x: 0.5, y: 7.05, w: 12.3, h: 0.3, color: C.muted, fontSize: 10, italic: true,
    });
  }

  // ---------- Slide 4: Risks & next steps ----------
  const s4 = pres.addSlide();
  s4.background = { color: C.bg };
  s4.addText("Risks & Next Actions", { x: 0.5, y: 0.3, w: 12.3, h: 0.5, color: C.text, fontFace: "Georgia", fontSize: 26, bold: true });

  // Top open A-punches
  const openA = p.punches.filter(x => x.category === "A" && x.status !== "closed").slice(0, 6);
  s4.addText("Top Open A-Punches (gates MC)", { x: 0.5, y: 1.0, w: 6, h: 0.35, color: C.red, fontSize: 14, bold: true });
  if (openA.length === 0) {
    s4.addText("No open A-punches — MC gate clear.", { x: 0.5, y: 1.4, w: 6, h: 0.4, color: C.green, fontSize: 12, italic: true });
  } else {
    openA.forEach((x, i) => {
      const sys = p.systems.find(s => s.id === x.systemId);
      s4.addText(`• ${x.title}  ·  ${sys?.code ?? ""}  ·  ${x.discipline}`, {
        x: 0.5, y: 1.4 + i * 0.4, w: 6, h: 0.35, color: C.text, fontSize: 11,
      });
    });
  }

  // Recommendations
  const recs = [
    `Drive open A-punches to closure — gate to MC certificates.`,
    `Reconcile preservation register; ${subs.filter(s => !s.preservation?.interval).length} subsystems have no interval set.`,
    `Lift Commissioning average (${k.commPct}%) by clearing loop checks & C&E validations.`,
    `Compile Turnover dossier per subsystem — avoid end-of-project crunch.`,
  ];
  s4.addText("Recommended Actions", { x: 7, y: 1.0, w: 6, h: 0.35, color: C.accent, fontSize: 14, bold: true });
  recs.forEach((r, i) => {
    s4.addText(`${i + 1}. ${r}`, { x: 7, y: 1.4 + i * 0.55, w: 6, h: 0.5, color: C.text, fontSize: 11 });
  });

  s4.addText("Generated by Completions & Commissioning Pro", {
    x: 0.5, y: 7.0, w: 12.3, h: 0.3, color: C.muted, fontSize: 10, italic: true, align: "center",
  });

  pres.writeFile({ fileName: `${safe(p.name)}_Status_Presentation.pptx` });
}

/* =========================================================
   PDF — printable visual one-pager
   ========================================================= */
export function exportVisualPdf(p: Project) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const k = projectKpis(p);

  // Background
  doc.setFillColor(C.bg);
  doc.rect(0, 0, W, H, "F");
  // Accent strip
  doc.setFillColor(C.accent);
  doc.rect(0, 0, 8, H, "F");

  // Header
  doc.setTextColor(C.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("COMPLETIONS & COMMISSIONING — STATUS REPORT", 28, 36);
  doc.setTextColor(C.text);
  doc.setFontSize(22);
  doc.text(p.name, 28, 66);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(C.primary);
  doc.text(`${p.client}  ·  ${p.location}  ·  ${p.type}`, 28, 86);
  doc.setTextColor(C.muted);
  doc.setFontSize(9);
  doc.text(`Issued ${new Date().toLocaleString()}`, W - 28, 36, { align: "right" });

  // KPI tiles
  const tiles: [string, string, string][] = [
    ["Systems", String(k.systems), C.primary],
    ["Subsystems", String(k.subsystems), C.primary],
    ["MC %", `${k.mcPct}%`, C.green],
    ["RFSU %", `${k.rfsuPct}%`, C.green],
    ["Comm %", `${k.commPct}%`, C.accent],
    ["Handover %", `${k.handoverPct}%`, C.accent],
    ["Open A", String(k.punchA), k.punchA > 0 ? C.red : C.green],
    ["Open Punch", String(k.punchOpen), k.punchOpen > 0 ? C.amber : C.green],
  ];
  const tx = 28, ty = 110, tw = (W - 56 - 7 * 8) / 8, th = 70;
  tiles.forEach((t, i) => {
    const x = tx + i * (tw + 8);
    doc.setFillColor(C.panel);
    doc.roundedRect(x, ty, tw, th, 4, 4, "F");
    doc.setFillColor(t[2]);
    doc.rect(x, ty, 3, th, "F");
    doc.setTextColor(C.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(t[0].toUpperCase(), x + 10, ty + 16);
    doc.setTextColor(C.text);
    doc.setFontSize(20);
    doc.text(t[1], x + 10, ty + 50);
  });

  // Workflow bars
  let y = ty + th + 24;
  doc.setTextColor(C.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Workflow Progress", 28, y);
  y += 14;
  const wf: [string, number][] = [
    ["Construction", p.workflow.construction],
    ["MC", k.mcPct],
    ["Pre-Comm", Math.round((k.mcPct + k.commPct) / 2)],
    ["Commissioning", k.commPct],
    ["Handover", k.handoverPct],
  ];
  const barX = 160, barW = (W / 2) - barX - 28;
  wf.forEach((row, i) => {
    const yy = y + i * 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(C.muted);
    doc.text(row[0], 28, yy + 10);
    doc.setFillColor(C.panel);
    doc.roundedRect(barX, yy, barW, 12, 3, 3, "F");
    doc.setFillColor(C.primary);
    doc.roundedRect(barX, yy, Math.max(2, barW * (row[1] / 100)), 12, 3, 3, "F");
    doc.setTextColor(C.text);
    doc.setFont("helvetica", "bold");
    doc.text(`${row[1]}%`, barX + barW + 8, yy + 10);
  });

  // Punch breakdown — right column
  const rx = W / 2 + 14;
  let ry = ty + th + 24;
  doc.setTextColor(C.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Open Punch Items", rx, ry);
  ry += 14;
  const punchRows: [string, number, string][] = [
    ["Category A (gates MC)", k.punchA, C.red],
    ["Category B", k.punchB, C.amber],
    ["Category C", k.punchC, C.primary],
  ];
  const max = Math.max(1, ...punchRows.map(r => r[1]));
  const pBarX = rx + 140, pBarW = W - 28 - pBarX;
  punchRows.forEach((row, i) => {
    const yy = ry + i * 26;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(C.muted);
    doc.text(row[0], rx, yy + 12);
    doc.setFillColor(C.panel);
    doc.roundedRect(pBarX, yy, pBarW, 16, 3, 3, "F");
    doc.setFillColor(row[2]);
    doc.roundedRect(pBarX, yy, Math.max(2, pBarW * (row[1] / max)), 16, 3, 3, "F");
    doc.setTextColor(C.text);
    doc.setFont("helvetica", "bold");
    doc.text(String(row[1]), pBarX + pBarW + 8, yy + 12);
  });

  // Top systems table
  y = Math.max(y + wf.length * 22, ry + punchRows.length * 26) + 30;
  doc.setTextColor(C.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Top Systems", 28, y);
  y += 14;
  doc.setFillColor(C.accent);
  doc.rect(28, y, W - 56, 18, "F");
  doc.setTextColor(C.bg);
  doc.setFontSize(9);
  const cols = [
    { label: "SYSTEM", x: 36, w: 80 },
    { label: "NAME", x: 120, w: 220 },
    { label: "MC", x: 350, w: 60 },
    { label: "COMM", x: 420, w: 60 },
    { label: "T/O", x: 490, w: 60 },
    { label: "OPEN A", x: 560, w: 60 },
    { label: "PRIORITY", x: 630, w: 80 },
  ];
  cols.forEach(c => doc.text(c.label, c.x, y + 12));
  y += 18;

  const topSystems = p.systems.slice(0, 8);
  topSystems.forEach((sys, i) => {
    const yy = y + i * 22;
    if (i % 2 === 0) {
      doc.setFillColor(C.panel);
      doc.rect(28, yy, W - 56, 22, "F");
    }
    const subAvgMc = sys.subsystems.length
      ? Math.round(sys.subsystems.reduce((a, ss) => a + mcProgress(ss, openAPunchesFor(p, sys, ss).length === 0).pct, 0) / sys.subsystems.length)
      : 0;
    const subAvgCo = sys.subsystems.length
      ? Math.round(sys.subsystems.reduce((a, ss) => a + commProgress(ss).pct, 0) / sys.subsystems.length)
      : 0;
    const subAvgTo = sys.subsystems.length
      ? Math.round(sys.subsystems.reduce((a, ss) => a + turnoverProgress(ss).pct, 0) / sys.subsystems.length)
      : 0;
    const oA = p.punches.filter(x => x.systemId === sys.id && x.category === "A" && x.status !== "closed").length;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(C.text);
    doc.text(sys.code, 36, yy + 14);
    doc.setFont("helvetica", "normal");
    doc.text(sys.name.slice(0, 38), 120, yy + 14);
    doc.text(`${subAvgMc}%`, 350, yy + 14);
    doc.text(`${subAvgCo}%`, 420, yy + 14);
    doc.text(`${subAvgTo}%`, 490, yy + 14);
    doc.setTextColor(oA > 0 ? C.red : C.muted);
    doc.text(oA ? String(oA) : "—", 560, yy + 14);
    doc.setTextColor(C.text);
    doc.text(sys.priority, 630, yy + 14);
  });

  // Footer
  doc.setTextColor(C.muted);
  doc.setFontSize(8);
  doc.text("Completions & Commissioning Pro · confidential", 28, H - 18);
  doc.text(`Page 1 of 1`, W - 28, H - 18, { align: "right" });

  doc.save(`${safe(p.name)}_Visual_Status.pdf`);
}
