import { jsPDF } from 'jspdf';

export interface SurveyReportMeta {
  businessName: string;
  templateName: string;
  templateType: string;
  generatedAt?: Date;
}

export interface FinancialImpactRange {
  before: number | null;
  after: number | null;
}

export interface FinancialImpact {
  revenue: FinancialImpactRange;
  expenses: FinancialImpactRange;
  profit: FinancialImpactRange;
  seedCapital: {
    totalItemCost: number | null;
    businessSavings: number | null;
    amountRequested: number | null;
  };
}

const DARK: [number, number, number] = [28, 25, 23];
const MID_GRAY: [number, number, number] = [87, 83, 78];
const LT_GRAY: [number, number, number] = [231, 229, 228];

export function parseFinancialImpact(json: string | null | undefined): FinancialImpact | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as FinancialImpact;
  } catch {
    return null;
  }
}

function fmtRand(n: number | null): string {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return 'R' + n.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function renderFinancialImpactTable(doc: jsPDF, impact: FinancialImpact, y: number, LM: number, RM: number, PAGE_BOTTOM: number): number {
  const W = RM - LM;
  const labelColW = W * 0.4, valueColW = W * 0.3;
  const rowH = 8;

  if (y + rowH * 5 > PAGE_BOTTOM) { doc.addPage(); y = 18; }

  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text('FINANCIAL IMPACT OF SEED CAPITAL', LM, y); y += 7;

  const rows: [string, FinancialImpactRange, boolean][] = [
    ['Revenue', impact.revenue, false],
    ['Expenses', impact.expenses, false],
    ['Profit', impact.profit, true],
  ];

  doc.setDrawColor(...LT_GRAY); doc.setLineWidth(0.3);

  // Header row
  doc.setFillColor(...LT_GRAY);
  doc.rect(LM, y, W, rowH, 'F');
  doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text('', LM + 2, y + rowH / 2 + 1.5);
  doc.text('Before', LM + labelColW + 2, y + rowH / 2 + 1.5);
  doc.text('After', LM + labelColW + valueColW + 2, y + rowH / 2 + 1.5);
  doc.rect(LM, y, W, rowH);
  doc.line(LM + labelColW, y, LM + labelColW, y + rowH);
  doc.line(LM + labelColW + valueColW, y, LM + labelColW + valueColW, y + rowH);
  y += rowH;

  doc.setFont('helvetica', 'normal');
  for (const [label, range, emphasize] of rows) {
    if (y + rowH > PAGE_BOTTOM) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', emphasize ? 'bold' : 'normal');
    doc.setFontSize(9.5); doc.setTextColor(...DARK);
    doc.text(label, LM + 2, y + rowH / 2 + 1.5);
    doc.text(fmtRand(range.before), LM + labelColW + 2, y + rowH / 2 + 1.5);
    doc.text(fmtRand(range.after), LM + labelColW + valueColW + 2, y + rowH / 2 + 1.5);
    doc.rect(LM, y, W, rowH);
    doc.line(LM + labelColW, y, LM + labelColW, y + rowH);
    doc.line(LM + labelColW + valueColW, y, LM + labelColW + valueColW, y + rowH);
    y += rowH;
  }

  y += 6;
  const sc = impact.seedCapital;
  if (sc.totalItemCost !== null || sc.businessSavings !== null || sc.amountRequested !== null) {
    if (y + 6 > PAGE_BOTTOM) { doc.addPage(); y = 18; }
    doc.setFontSize(9.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MID_GRAY);
    const line = `Seed capital request — total item cost: ${fmtRand(sc.totalItemCost)}, business savings contribution: ${fmtRand(sc.businessSavings)}, amount requested: ${fmtRand(sc.amountRequested)}.`;
    const wrapped: string[] = doc.splitTextToSize(line, W);
    for (const l of wrapped) {
      if (y > PAGE_BOTTOM) { doc.addPage(); y = 18; }
      doc.text(l, LM, y);
      y += 5;
    }
  }

  return y;
}

function renderSurveyReport(doc: jsPDF, reportText: string, meta: SurveyReportMeta, financialImpact?: FinancialImpact | null): void {
  const LM = 15, RM = 195, W = RM - LM, PAGE_BOTTOM = 280;
  let y = 18;

  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text('HUSTLE ECONOMY', LM, y); y += 6;
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MID_GRAY);
  doc.text(meta.templateName, LM, y); y += 5;
  doc.setFontSize(9); doc.setTextColor(...MID_GRAY);
  doc.text(meta.businessName, LM, y); y += 4;
  const dateStr = (meta.generatedAt ?? new Date()).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Generated ${dateStr}`, LM, y); y += 6;
  doc.setDrawColor(...LT_GRAY); doc.setLineWidth(0.4); doc.line(LM, y, RM, y); y += 8;

  doc.setFontSize(10.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK);
  const lineHeight = 5.5;
  for (const paragraph of reportText.split(/\n+/)) {
    if (!paragraph.trim()) { y += lineHeight / 2; continue; }
    const lines: string[] = doc.splitTextToSize(paragraph, W);
    for (const line of lines) {
      if (y > PAGE_BOTTOM) { doc.addPage(); y = 18; }
      doc.text(line, LM, y);
      y += lineHeight;
    }
    y += lineHeight / 2;
  }

  if (financialImpact) {
    y += 3;
    renderFinancialImpactTable(doc, financialImpact, y, LM, RM, PAGE_BOTTOM);
  }
}

export function generateSurveyReportPdf(reportText: string, meta: SurveyReportMeta, financialImpact?: FinancialImpact | null): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  renderSurveyReport(doc, reportText, meta, financialImpact);
  const safeName = meta.businessName.replace(/\s+/g, '_');
  doc.save(`survey-report-${safeName}-${meta.templateType.toLowerCase()}.pdf`);
}

export function generateBulkSurveyReportPdf(
  reports: { reportText: string; meta: SurveyReportMeta; financialImpact?: FinancialImpact | null }[],
  templateTypeLabel: string,
): void {
  if (!reports.length) return;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  for (let i = 0; i < reports.length; i++) {
    if (i > 0) doc.addPage();
    renderSurveyReport(doc, reports[i].reportText, reports[i].meta, reports[i].financialImpact);
  }
  doc.save(`survey-reports-${templateTypeLabel.toLowerCase()}-all.pdf`);
}
