import { jsPDF } from 'jspdf';

export interface SurveyReportMeta {
  businessName: string;
  templateName: string;
  templateType: string;
  generatedAt?: Date;
}

const DARK: [number, number, number] = [28, 25, 23];
const MID_GRAY: [number, number, number] = [87, 83, 78];
const LT_GRAY: [number, number, number] = [231, 229, 228];

function renderSurveyReport(doc: jsPDF, reportText: string, meta: SurveyReportMeta): void {
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
}

export function generateSurveyReportPdf(reportText: string, meta: SurveyReportMeta): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  renderSurveyReport(doc, reportText, meta);
  const safeName = meta.businessName.replace(/\s+/g, '_');
  doc.save(`survey-report-${safeName}-${meta.templateType.toLowerCase()}.pdf`);
}

export function generateBulkSurveyReportPdf(
  reports: { reportText: string; meta: SurveyReportMeta }[],
  templateTypeLabel: string,
): void {
  if (!reports.length) return;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  for (let i = 0; i < reports.length; i++) {
    if (i > 0) doc.addPage();
    renderSurveyReport(doc, reports[i].reportText, reports[i].meta);
  }
  doc.save(`survey-reports-${templateTypeLabel.toLowerCase()}-all.pdf`);
}
