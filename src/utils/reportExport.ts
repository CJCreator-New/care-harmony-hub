import { DailySummary, ReportStats } from '@/hooks/useReports';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ExportData {
  stats: ReportStats | undefined;
  dailyData: DailySummary[] | undefined;
  period: string;
  hospitalName: string;
}

export function exportToCSV({ stats, dailyData, period, hospitalName }: ExportData): void {
  if (!dailyData) return;

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const today = format(new Date(), 'yyyy-MM-dd');
  
  let csv = `Hospital Report - ${hospitalName}\n`;
  csv += `Generated: ${format(new Date(), 'PPP')}\n`;
  csv += `Period: Last ${period} Days\n\n`;

  // Summary section
  if (stats) {
    csv += `SUMMARY\n`;
    csv += `Metric,Today,This Week,This Month\n`;
    csv += `Consultations,${stats.today.consultations},${stats.week.consultations},${stats.month.consultations}\n`;
    csv += `Prescriptions,${stats.today.prescriptions},${stats.week.prescriptions},${stats.month.prescriptions}\n`;
    csv += `Revenue,${formatCurrency(stats.today.revenue)},${formatCurrency(stats.week.revenue)},${formatCurrency(stats.month.revenue)}\n`;
    csv += `Patients Seen,${stats.today.patients},${stats.week.patients},${stats.month.patients}\n\n`;
  }

  // Daily breakdown
  csv += `DAILY BREAKDOWN\n`;
  csv += `Date,Consultations,Prescriptions,Revenue,Patients Seen\n`;
  
  dailyData.forEach((day) => {
    csv += `${format(new Date(day.date), 'MMM dd, yyyy')},${day.consultations},${day.prescriptions},${formatCurrency(day.revenue)},${day.patients_seen}\n`;
  });

  // Totals
  const totals = dailyData.reduce(
    (acc, day) => ({
      consultations: acc.consultations + day.consultations,
      prescriptions: acc.prescriptions + day.prescriptions,
      revenue: acc.revenue + day.revenue,
      patients_seen: acc.patients_seen + day.patients_seen,
    }),
    { consultations: 0, prescriptions: 0, revenue: 0, patients_seen: 0 }
  );
  
  csv += `Total,${totals.consultations},${totals.prescriptions},${formatCurrency(totals.revenue)},${totals.patients_seen}\n`;

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `hospital-report-${today}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportToPDF({ stats, dailyData, period, hospitalName }: ExportData): void {
  if (!dailyData) return;

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const today = format(new Date(), 'yyyy-MM-dd');

  // Generate HTML for print-to-PDF
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Hospital Report - ${hospitalName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        h1 { color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px; }
        h2 { color: #2c5282; margin-top: 30px; }
        .meta { color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
        th { background: #edf2f7; font-weight: 600; }
        tr:nth-child(even) { background: #f7fafc; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
        .summary-card { background: #f7fafc; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #4a5568; font-size: 14px; }
        .summary-card .value { font-size: 24px; font-weight: bold; color: #2d3748; }
        .summary-card .sub { font-size: 12px; color: #718096; margin-top: 5px; }
        .totals { font-weight: bold; background: #edf2f7 !important; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>Hospital Report</h1>
      <div class="meta">
        <strong>${hospitalName}</strong><br>
        Generated: ${format(new Date(), 'PPP')}<br>
        Period: Last ${period} Days
      </div>

      ${stats ? `
      <h2>Summary</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <h3>Today's Consultations</h3>
          <div class="value">${stats.today.consultations}</div>
          <div class="sub">${stats.week.consultations} this week</div>
        </div>
        <div class="summary-card">
          <h3>Today's Prescriptions</h3>
          <div class="value">${stats.today.prescriptions}</div>
          <div class="sub">${stats.week.prescriptions} this week</div>
        </div>
        <div class="summary-card">
          <h3>Today's Revenue</h3>
          <div class="value">${formatCurrency(stats.today.revenue)}</div>
          <div class="sub">${formatCurrency(stats.week.revenue)} this week</div>
        </div>
        <div class="summary-card">
          <h3>Patients Seen Today</h3>
          <div class="value">${stats.today.patients}</div>
          <div class="sub">${stats.week.patients} this week</div>
        </div>
      </div>
      ` : ''}

      <h2>Daily Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Consultations</th>
            <th>Prescriptions</th>
            <th>Revenue</th>
            <th>Patients Seen</th>
          </tr>
        </thead>
        <tbody>
          ${dailyData.map(day => `
            <tr>
              <td>${format(new Date(day.date), 'EEE, MMM d, yyyy')}</td>
              <td>${day.consultations}</td>
              <td>${day.prescriptions}</td>
              <td>${formatCurrency(day.revenue)}</td>
              <td>${day.patients_seen}</td>
            </tr>
          `).join('')}
          <tr class="totals">
            <td>Total</td>
            <td>${dailyData.reduce((sum, d) => sum + d.consultations, 0)}</td>
            <td>${dailyData.reduce((sum, d) => sum + d.prescriptions, 0)}</td>
            <td>${formatCurrency(dailyData.reduce((sum, d) => sum + d.revenue, 0))}</td>
            <td>${dailyData.reduce((sum, d) => sum + d.patients_seen, 0)}</td>
          </tr>
        </tbody>
      </table>
    </body>
    </html>
  `;

  // Open in new window for printing/saving as PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

export async function sendReportByEmail({
  stats,
  dailyData,
  period,
  hospitalName,
  recipientEmail,
}: ExportData & { recipientEmail: string }): Promise<void> {
  if (!dailyData) return;

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const today = format(new Date(), 'yyyy-MM-dd');
  
  let reportContent = `Hospital Report - ${hospitalName}\n`;
  reportContent += `Generated: ${format(new Date(), 'PPP')}\n`;
  reportContent += `Period: Last ${period} Days\n\n`;

  // Summary section
  if (stats) {
    reportContent += `SUMMARY\n`;
    reportContent += `Metric\tToday\tThis Week\tThis Month\n`;
    reportContent += `Consultations\t${stats.today.consultations}\t${stats.week.consultations}\t${stats.month.consultations}\n`;
    reportContent += `Prescriptions\t${stats.today.prescriptions}\t${stats.week.prescriptions}\t${stats.month.prescriptions}\n`;
    reportContent += `Revenue\t${formatCurrency(stats.today.revenue)}\t${formatCurrency(stats.week.revenue)}\t${formatCurrency(stats.month.revenue)}\n`;
    reportContent += `Patients Seen\t${stats.today.patients}\t${stats.week.patients}\t${stats.month.patients}\n\n`;
  }

  // Daily breakdown
  reportContent += `DAILY BREAKDOWN\n`;
  reportContent += `Date\tConsultations\tPrescriptions\tRevenue\tPatients Seen\n`;
  
  dailyData.forEach((day) => {
    reportContent += `${format(new Date(day.date), 'MMM dd, yyyy')}\t${day.consultations}\t${day.prescriptions}\t${formatCurrency(day.revenue)}\t${day.patients_seen}\n`;
  });

  // Totals
  const totals = dailyData.reduce(
    (acc, day) => ({
      consultations: acc.consultations + day.consultations,
      prescriptions: acc.prescriptions + day.prescriptions,
      revenue: acc.revenue + day.revenue,
      patients_seen: acc.patients_seen + day.patients_seen,
    }),
    { consultations: 0, prescriptions: 0, revenue: 0, patients_seen: 0 }
  );
  
  reportContent += `Total\t${totals.consultations}\t${totals.prescriptions}\t${formatCurrency(totals.revenue)}\t${totals.patients_seen}\n`;

  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: recipientEmail,
        subject: `Hospital Report - ${hospitalName} (${today})`,
        text: reportContent,
        html: reportContent.replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;'),
      },
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error sending report email:', error);
    throw new Error('Failed to send report email');
  }
}
