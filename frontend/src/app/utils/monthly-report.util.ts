import { jsPDF } from 'jspdf';
import { IncomeEntryResponse } from '../services/api.service';

export interface ReportHustler {
  firstName: string;
  lastName: string;
  businessName: string;
  businessType: string;
  communityName?: string;
  cohortNumber?: number | string;
}

interface WeekData {
  cashSales: number; creditSales: number; inAppSales: number; cogs: number;
  transport: number; runnerFee: number; electricity: number;
  wages: number; airtimeData: number; overhead1: number; overhead2: number;
  savings: number; grantsSassa: number; otherSalary: number; otherHousehold: number;
}

function blank(): WeekData {
  return {
    cashSales: 0, creditSales: 0, inAppSales: 0, cogs: 0,
    transport: 0, runnerFee: 0, electricity: 0,
    wages: 0, airtimeData: 0, overhead1: 0, overhead2: 0,
    savings: 0, grantsSassa: 0, otherSalary: 0, otherHousehold: 0,
  };
}

function weekIndex(day: number): number {
  if (day <= 7) return 0;
  if (day <= 14) return 1;
  if (day <= 21) return 2;
  return 3;
}

function resolveCategory(e: IncomeEntryResponse): string {
  if (e.category) return e.category;
  if (e.entryType === 'EXPENSE') return 'COST_OF_GOODS';
  return e.channel === 'MARKETPLACE' ? 'CREDIT_SALES' : 'CASH_SALES';
}

function buildWeeks(entries: IncomeEntryResponse[], year: number, month: number): WeekData[] {
  const weeks = [blank(), blank(), blank(), blank()];
  for (const e of entries) {
    const d = new Date(e.date + 'T00:00:00');
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;
    const w = weeks[weekIndex(d.getDate())];
    const a = Number(e.amount);
    switch (resolveCategory(e)) {
      case 'CASH_SALES':         w.cashSales      += a; break;
      case 'CREDIT_SALES':       w.creditSales    += a; break;
      case 'IN_APP_SALES':       w.inAppSales     += a; break;
      case 'COST_OF_GOODS':      w.cogs           += a; break;
      case 'TRANSPORT':          w.transport      += a; break;
      case 'RUNNER_FEE':         w.runnerFee      += a; break;
      case 'ELECTRICITY':        w.electricity    += a; break;
      case 'WAGES':              w.wages          += a; break;
      case 'AIRTIME_DATA':       w.airtimeData    += a; break;
      case 'OTHER_OVERHEAD_1':   w.overhead1      += a; break;
      case 'OTHER_OVERHEAD_2':   w.overhead2      += a; break;
      case 'SAVINGS':            w.savings        += a; break;
      case 'GRANTS_SASSA':       w.grantsSassa    += a; break;
      case 'OTHER_SALARY_WAGES': w.otherSalary    += a; break;
      case 'OTHER_HOUSEHOLD':    w.otherHousehold += a; break;
    }
  }
  return weeks;
}

function sumW(weeks: WeekData[], key: keyof WeekData): number {
  return weeks.reduce((s, w) => s + (w[key] as number), 0);
}

function fmtR(v: number): string {
  if (v === 0) return 'R  -';
  return 'R ' + v.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const GREEN: [number, number, number]      = [146, 208, 80];
const LT_GRAY: [number, number, number]    = [220, 220, 220];
const WHITE: [number, number, number]      = [255, 255, 255];
const DARK: [number, number, number]       = [30, 30, 30];
const MID_GRAY: [number, number, number]   = [110, 110, 110];

// Per-column background colours: W1, W2, W3, W4, TOTAL
const COL_BG: [number, number, number][] = [
  [244, 250, 238],  // W1 — pale lime
  [238, 247, 244],  // W2 — pale mint
  [244, 250, 238],  // W3 — pale lime
  [238, 247, 244],  // W4 — pale mint
  [228, 239, 252],  // TOTAL — pale blue
];
const COL_HL: [number, number, number][] = [
  [146, 208, 80],   // W1 — brand green
  [138, 200, 74],   // W2 — slightly cooler
  [146, 208, 80],   // W3 — brand green
  [138, 200, 74],   // W4 — slightly cooler
  [122, 185, 62],   // TOTAL — deeper green
];
const COL_HDR: [number, number, number][] = [
  [213, 222, 206],  // W1 — warm gray-green
  [207, 218, 213],  // W2 — cool gray-mint
  [213, 222, 206],  // W3 — warm gray-green
  [207, 218, 213],  // W4 — cool gray-mint
  [198, 212, 226],  // TOTAL — blue-gray
];

// Renders one hustler's monthly report onto the current page of `doc`.
function renderReport(doc: jsPDF, hustler: ReportHustler, entries: IncomeEntryResponse[], monthStr: string): void {
  const [yr, mo] = monthStr.split('-').map(Number);
  const weeks = buildWeeks(entries, yr, mo);

  const totalSales  = (i: number) => weeks[i].cashSales + weeks[i].creditSales + weeks[i].inAppSales;
  const grossProfit = (i: number) => totalSales(i) - weeks[i].cogs;
  const overheads   = (i: number) =>
    weeks[i].transport + weeks[i].runnerFee + weeks[i].electricity +
    weeks[i].wages + weeks[i].airtimeData + weeks[i].overhead1 + weeks[i].overhead2;
  const distOwner   = (i: number) => grossProfit(i) - overheads(i);
  const hhIncome    = (i: number) => weeks[i].grantsSassa + weeks[i].otherSalary + weeks[i].otherHousehold;
  const hhBudget    = (i: number) => distOwner(i) + hhIncome(i);

  const T = {
    cashSales: sumW(weeks, 'cashSales'), creditSales: sumW(weeks, 'creditSales'),
    inAppSales: sumW(weeks, 'inAppSales'),
    cogs: sumW(weeks, 'cogs'), transport: sumW(weeks, 'transport'),
    runnerFee: sumW(weeks, 'runnerFee'), electricity: sumW(weeks, 'electricity'),
    wages: sumW(weeks, 'wages'), airtimeData: sumW(weeks, 'airtimeData'),
    overhead1: sumW(weeks, 'overhead1'), overhead2: sumW(weeks, 'overhead2'),
    savings: sumW(weeks, 'savings'), grantsSassa: sumW(weeks, 'grantsSassa'),
    otherSalary: sumW(weeks, 'otherSalary'), otherHousehold: sumW(weeks, 'otherHousehold'),
  };
  const tTotalSales  = T.cashSales + T.creditSales + T.inAppSales;
  const tGrossProfit = tTotalSales - T.cogs;
  const tOverheads   = T.transport + T.runnerFee + T.electricity + T.wages + T.airtimeData + T.overhead1 + T.overhead2;
  const tDistOwner   = tGrossProfit - tOverheads;
  const tHhIncome    = T.grantsSassa + T.otherSalary + T.otherHousehold;
  const tHhBudget    = tDistOwner + tHhIncome;
  const tTotalExp    = T.cogs + tOverheads;

  // layout constants
  const LM = 8, RM = 202, W = RM - LM;
  const C0W = 7, C1W = 52, CW = 27;
  const C0X = LM, C1X = C0X + C0W;
  const C2X = C1X + C1W, C3X = C2X + CW, C4X = C3X + CW;
  const C5X = C4X + CW, C6X = C5X + CW;
  const ROW_H = 7;
  const NUM_ROWS = 21;

  let y = 12;

  // header
  doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text('HUSTLE ECONOMY', LM, y); y += 5;
  doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(...MID_GRAY);
  doc.text('SizoPopa Sonke One Day!', LM, y); y += 4;
  doc.setDrawColor(...LT_GRAY); doc.setLineWidth(0.4); doc.line(LM, y, RM, y); y += 4;

  doc.setFillColor(...LT_GRAY); doc.roundedRect(LM, y, W, 7, 1, 1, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text('4 Weeks — Hustle Economy — Financial Reporting Template', LM + W / 2, y + 4.8, { align: 'center' });
  y += 10;

  const monthName = new Date(yr, mo - 1, 1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' });
  const infoRow = (label1: string, val1: string, label2: string, val2: string) => {
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
    doc.text(label1, LM, y);
    doc.setFont('helvetica', 'normal'); doc.text(val1, LM + label1.length * 1.8 + 2, y);
    doc.setFont('helvetica', 'bold');   doc.text(label2, LM + W / 2, y);
    doc.setFont('helvetica', 'normal'); doc.text(val2, LM + W / 2 + label2.length * 1.8 + 2, y);
    y += 5;
  };
  infoRow('Name:', `${hustler.firstName} ${hustler.lastName}`, 'Cohort:', hustler.cohortNumber ? String(hustler.cohortNumber) : '—');
  infoRow('Business Type:', hustler.businessType ?? '—', 'Community:', hustler.communityName ?? '—');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text('Month:', LM, y); doc.setFont('helvetica', 'normal'); doc.text(monthName, LM + 12, y);
  y += 7;

  // table header
  doc.setFillColor(...LT_GRAY); doc.rect(LM, y, C2X - LM, ROW_H, 'F');
  for (let ci = 0; ci < 5; ci++) {
    doc.setFillColor(...COL_HDR[ci]);
    doc.rect([C2X, C3X, C4X, C5X, C6X][ci], y, CW, ROW_H, 'F');
  }
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text('#', C0X + 1, y + 4.8);
  doc.text('Weekly Report', C1X + 1, y + 4.8);
  for (const [cx, lbl] of [[C2X, 'Week 1'], [C3X, 'Week 2'], [C4X, 'Week 3'], [C5X, 'Week 4'], [C6X, 'TOTAL']] as [number, string][]) {
    doc.text(lbl, cx + CW / 2, y + 4.8, { align: 'center' });
  }
  const tableTop = y;
  y += ROW_H;

  // row helper
  const row = (num: string, label: string, vals: number[], highlight: boolean, bold: boolean) => {
    // label column
    doc.setFillColor(...(highlight ? GREEN : WHITE));
    doc.rect(LM, y, C2X - LM, ROW_H, 'F');
    // per-column backgrounds
    const cols = highlight ? COL_HL : COL_BG;
    for (let ci = 0; ci < 5; ci++) {
      doc.setFillColor(...cols[ci]);
      doc.rect([C2X, C3X, C4X, C5X, C6X][ci], y, CW, ROW_H, 'F');
    }
    doc.setDrawColor(...LT_GRAY); doc.setLineWidth(0.2); doc.line(LM, y + ROW_H, RM, y + ROW_H);
    doc.setTextColor(...DARK);
    doc.setFontSize(7); doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(num, C0X + 1, y + 4.8);
    doc.setFontSize(7.5);
    doc.text(label, C1X + 1, y + 4.8);
    doc.setFontSize(7);
    for (const [i, cx] of [[0, C2X], [1, C3X], [2, C4X], [3, C5X], [4, C6X]] as [number, number][]) {
      doc.text(fmtR(vals[i]), cx + CW - 1, y + 4.8, { align: 'right' });
    }
    y += ROW_H;
  };

  const wv = (fn: (i: number) => number) => [0,1,2,3].map(fn).concat([fn(0)+fn(1)+fn(2)+fn(3)]);
  const wk = (key: keyof WeekData) => [...[0,1,2,3].map(i => weeks[i][key] as number), sumW(weeks, key)];

  row('1',   '(1.1+1.2+1.3) = TOTAL SALES',              wv(totalSales),    true,  true);
  row('1.1', 'Cash Sales',                               wk('cashSales'),   false, false);
  row('1.2', 'Credit Sale',                              wk('creditSales'), false, false);
  row('1.3', 'In-App Sales',                             wk('inAppSales'),  false, false);
  row('2',   'Minus: COST OF GOODS SOLD (Direct Cost)',  wk('cogs'),        false, false);
  row('3',   '(1-2) = GROSS PROFIT',                     wv(grossProfit), true,  true);
  row('4',   'Minus: OVERHEADS (Other Expenses)',        wv(overheads),   true,  true);
  row('4.1', 'Transport',                                wk('transport'), false, false);
  row('4.2', 'Runner Fee',                               wk('runnerFee'), false, false);
  row('4.3', 'Electricity',                              wk('electricity'), false, false);
  row('4.4', 'Wages',                                    wk('wages'),     false, false);
  row('4.5', 'Airtime/Data',                             wk('airtimeData'), false, false);
  row('4.6', '',                                         wk('overhead1'), false, false);
  row('4.7', '',                                         wk('overhead2'), false, false);
  row('5',   '3-4 = Distribution to Owner (Profit)',     wv(distOwner),   true,  true);
  row('6',   'Minus: Savings',                           wk('savings'),   false, false);
  row('7',   'Total Household income',                   wv(hhIncome),    true,  true);
  row('7.1', 'GRANTS (Sassa)',                           wk('grantsSassa'), false, false);
  row('7.2', 'Other Salary / Wages',                     wk('otherSalary'), false, false);
  row('7.3', 'Other',                                    wk('otherHousehold'), false, false);
  row('8',   '(5+7) = Household Budget Available',       wv(hhBudget),    true,  true);

  doc.setDrawColor(...DARK); doc.setLineWidth(0.3);
  doc.rect(LM, tableTop, W, ROW_H * (NUM_ROWS + 1), 'S');
  y += 5;

  // summary + FOR OFFICE USE ONLY
  const SX = C4X, SW = RM - SX, SH = 37;
  const OX = LM, OW = SX - LM - 4;
  doc.setFillColor(...LT_GRAY); doc.setDrawColor(...DARK); doc.setLineWidth(0.3);
  doc.rect(OX, y, OW, SH, 'FD');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
  doc.text('FOR OFFICE USE ONLY', OX + OW / 2, y + SH / 2, { align: 'center' });

  doc.setFillColor(...WHITE); doc.rect(SX, y, SW, SH, 'FD');
  const summaryRows: [string, number][] = [
    ['Total Sales', tTotalSales],
    ['Total Expenses', tTotalExp],
    ['Distribution to owner', tDistOwner],
    ['Total Household income', tHhIncome],
    ['Household Budget Available', tHhBudget],
  ];
  let sy = y + 6;
  for (const [lbl, val] of summaryRows) {
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...DARK);
    doc.text(lbl, SX + 2, sy);
    doc.setFont('helvetica', 'normal'); doc.text(fmtR(val), SX + SW - 2, sy, { align: 'right' });
    sy += 6;
  }
  y += SH + 5;

  // signature
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MID_GRAY);
  doc.text('Signature', LM, y + 4);
  doc.setDrawColor(...DARK); doc.setLineWidth(0.3);
  doc.line(LM + 22, y + 4, LM + 85, y + 4);
}

export function generateMonthlyReportPdf(
  hustler: ReportHustler, entries: IncomeEntryResponse[], monthStr: string,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  renderReport(doc, hustler, entries, monthStr);
  const safeName = `${hustler.firstName}_${hustler.lastName}`.replace(/\s+/g, '_');
  doc.save(`monthly-report-${safeName}-${monthStr}.pdf`);
}

export function generateBulkMonthlyReportPdf(
  hustlers: { hustler: ReportHustler; entries: IncomeEntryResponse[] }[],
  monthStr: string,
): void {
  if (!hustlers.length) return;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  for (let i = 0; i < hustlers.length; i++) {
    if (i > 0) doc.addPage();
    renderReport(doc, hustlers[i].hustler, hustlers[i].entries, monthStr);
  }
  const [yr, mo] = monthStr.split('-').map(Number);
  const label = new Date(yr, mo - 1, 1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' }).replace(/\s/g, '-');
  doc.save(`monthly-reports-${label}.pdf`);
}
