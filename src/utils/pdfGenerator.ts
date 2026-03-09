/**
 * PDF Generation Utility with Dynamic Imports
 * 
 * This module uses dynamic imports to load heavy PDF libraries only when needed,
 * reducing initial bundle size by ~2.5MB.
 * 
 * @module pdfGenerator
 * @version 1.0.0
 */

import type { jsPDF } from 'jspdf';
import type html2canvas from 'html2canvas';

interface PDFOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  unit?: 'mm' | 'cm' | 'in' | 'pt';
  format?: string | number[];
}

interface GenerateOptions extends PDFOptions {
  element: HTMLElement;
  quality?: number;
}

/**
 * Dynamically imports jspdf only when needed
 * Reduces initial bundle by ~2.5MB
 */
async function loadJSPDF(): Promise<typeof jsPDF> {
  const { jsPDF } = await import('jspdf');
  return jsPDF;
}

/**
 * Dynamically imports html2canvas only when needed
 * Reduces initial bundle by ~800KB
 */
async function loadHtml2Canvas(): Promise<typeof html2canvas> {
  const html2canvas = await import('html2canvas');
  return html2canvas.default;
}

/**
 * Generate PDF from HTML element
 * Uses dynamic imports to minimize bundle size
 * 
 * @example
 * ```typescript
 * const element = document.getElementById('invoice');
 * await generatePDF({ element, filename: 'invoice-123.pdf' });
 * ```
 */
export async function generatePDF(options: GenerateOptions): Promise<void> {
  const startTime = performance.now();
  
  try {
    // Load libraries on-demand
    const [jsPDFModule, html2canvasModule] = await Promise.all([
      loadJSPDF(),
      loadHtml2Canvas()
    ]);

    const { element, filename = 'document.pdf', quality = 2 } = options;

    // Convert HTML to canvas
    const canvas = await html2canvasModule(element, {
      scale: quality,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Calculate PDF dimensions
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDFModule({
      orientation: options.orientation || 'portrait',
      unit: options.unit || 'mm',
      format: options.format || 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 10;

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    
    // Save PDF
    pdf.save(filename);

    const duration = performance.now() - startTime;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`PDF generated in ${duration.toFixed(2)}ms`);
    }
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw new Error('PDF generation failed. Please try again.');
  }
}

/**
 * Generate patient report PDF
 * Pre-configured for patient medical records
 */
export async function generatePatientReport(
  element: HTMLElement,
  patientName: string,
  mrn: string
): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  await generatePDF({
    element,
    filename: `patient-report-${mrn}-${date}.pdf`,
    orientation: 'portrait'
  });
}

/**
 * Generate invoice PDF
 * Pre-configured for billing documents
 */
export async function generateInvoicePDF(
  element: HTMLElement,
  invoiceNumber: string
): Promise<void> {
  await generatePDF({
    element,
    filename: `invoice-${invoiceNumber}.pdf`,
    orientation: 'portrait'
  });
}

/**
 * Generate prescription PDF
 * Pre-configured for prescription documents
 */
export async function generatePrescriptionPDF(
  element: HTMLElement,
  prescriptionId: string
): Promise<void> {
  await generatePDF({
    element,
    filename: `prescription-${prescriptionId}.pdf`,
    orientation: 'portrait'
  });
}

/**
 * Check if PDF generation is supported
 */
export function isPDFSupported(): boolean {
  return typeof window !== 'undefined' && 'HTMLCanvasElement' in window;
}

/**
 * Preload PDF libraries (optional optimization)
 * Call this when user navigates to a page that will need PDF generation
 */
export async function preloadPDFLibraries(): Promise<void> {
  try {
    await Promise.all([
      loadJSPDF(),
      loadHtml2Canvas()
    ]);
  } catch (error) {
    console.warn('Failed to preload PDF libraries:', error);
  }
}

export default {
  generatePDF,
  generatePatientReport,
  generateInvoicePDF,
  generatePrescriptionPDF,
  isPDFSupported,
  preloadPDFLibraries
};
