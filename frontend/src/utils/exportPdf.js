import { jsPDF } from 'jspdf';

export function exportRecordToPdf(record, username) {
  const doc = new jsPDF();

  // Header Banner
  doc.setFillColor(2, 132, 199); // MediVault Primary #0284c7
  doc.rect(0, 0, 210, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MediVault Medical Record', 14, 16);

  // Document Metadata
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const genTimestamp = new Date().toLocaleString();
  doc.text(`Exported: ${genTimestamp}`, 140, 16);

  let y = 38;

  // Patient Info Box
  doc.setLineWidth(0.3);
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 20, 3, 3, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Patient Account: ${username || 'Patient'}`, 20, y + 9);
  doc.text(`Record ID: #${record.id}`, 20, y + 15);

  y += 32;

  // Title
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(3, 105, 161);
  doc.text(record.title || 'Medical Record', 14, y);

  y += 10;

  // Details Grid
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);

  doc.setFont('helvetica', 'bold');
  doc.text('Record Type:', 14, y);
  doc.setFont('helvetica', 'normal');
  const recordTypeFormatted = (record.record_type || 'other').replace('_', ' ').toUpperCase();
  doc.text(recordTypeFormatted, 55, y);

  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Record Date:', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(record.record_date || 'N/A', 55, y);

  if (record.provider_name) {
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Healthcare Provider:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(record.provider_name, 55, y);
  }

  y += 14;

  // Clinical Notes & Description Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Description & Clinical Notes:', 14, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);

  const notesText = record.description || 'No description provided.';
  const splitNotes = doc.splitTextToSize(notesText, 180);

  for (let i = 0; i < splitNotes.length; i++) {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(splitNotes[i], 14, y);
    y += 6;
  }

  y += 10;

  // Footer Disclaimer
  if (y > 270) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, 196, y);
  y += 7;

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'MediVault Confidential Health Document - Generated for patient personal reference.',
    105,
    y,
    { align: 'center' }
  );

  const safeTitle = (record.title || 'Export').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`MediVault_Record_${record.id}_${safeTitle}.pdf`);
}
