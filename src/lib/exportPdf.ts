import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export const downloadReportAsPDF = async (elementId: string, filename: string = 'LexGuard_Threat_Report.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Report container not found");
    return;
  }
  
  try {
    // toPng tricks the browser into natively rendering the modern CSS
    const dataUrl = await toPng(element, { quality: 1.0, pixelRatio: 2 });
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    
    // Calculate aspect ratio to fit the image on the PDF properly
    const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;
    
    // Basic pagination if it's longer than one page
    const pageHeight = pdf.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    // Add first page
    pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    // Pagination for long reports
    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(filename);
  } catch (error) {
    console.error("Failed to generate PDF:", error);
  }
};
