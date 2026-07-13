import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateSamplePDF() {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page 1: Agreement Header & Clauses
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions
  const { width, height } = page1.getSize();

  // Header decorative bar
  page1.drawRectangle({
    x: 0,
    y: height - 60,
    width: width,
    height: 60,
    color: rgb(0.09, 0.15, 0.28),
  });

  page1.drawText('SIGNCRAFT SECURE DIGITAL CONTRACT', {
    x: 45,
    y: height - 37,
    size: 14,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page1.drawText('REF: SC-2026-9948 • CONFIDENTIAL', {
    x: width - 215,
    y: height - 37,
    size: 10,
    font: timesRomanFont,
    color: rgb(0.7, 0.8, 0.95),
  });

  // Document Title
  page1.drawText('MASTER CONSULTING & SERVICE AGREEMENT', {
    x: 45,
    y: height - 110,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.15, 0.25),
  });

  page1.drawText('Effective Date: July 14, 2026', {
    x: 45,
    y: height - 135,
    size: 11,
    font: timesRomanFont,
    color: rgb(0.4, 0.45, 0.55),
  });

  // Divider line
  page1.drawLine({
    start: { x: 45, y: height - 150 },
    end: { x: width - 45, y: height - 150 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  // Body paragraphs
  const clauses = [
    {
      title: '1. SCOPE OF SERVICES & CLIENT AGREEMENT',
      body: 'This Agreement sets forth the terms under which SignCraft Digital Solutions ("Provider") shall render software consulting, design review, and cryptographic verification workflows to the undersigned Client. All deliverables shall be completed in accordance with the specifications detailed in Exhibit A.',
    },
    {
      title: '2. INTELLECTUAL PROPERTY & DATA PRIVACY',
      body: 'Client retains all ownership rights to proprietary documents, data, and digital signatures processed within client-side sessions. All PDF modifications occur entirely locally inside the user browser without external data transmission.',
    },
    {
      title: '3. ELECTRONIC SIGNATURE VALIDITY',
      body: 'By executing this document below, both parties acknowledge and agree that electronic signatures placed via SignCraft Studio constitute legally binding execution under applicable E-SIGN and eIDAS digital transaction standards.',
    },
    {
      title: '4. CLIENT VERIFICATION CHECKLIST',
      body: 'Please verify the following items before signing:',
    },
  ];

  let currentY = height - 185;
  for (const clause of clauses) {
    page1.drawText(clause.title, {
      x: 45,
      y: currentY,
      size: 12,
      font: boldFont,
      color: rgb(0.12, 0.18, 0.3),
    });
    currentY -= 20;

    // Wrap text into lines
    const words = clause.body.split(' ');
    let line = '';
    for (const word of words) {
      const testLine = line + word + ' ';
      const testWidth = timesRomanFont.widthOfTextAtSize(testLine, 10.5);
      if (testWidth > width - 90 && line.length > 0) {
        page1.drawText(line.trim(), {
          x: 45,
          y: currentY,
          size: 10.5,
          font: timesRomanFont,
          color: rgb(0.25, 0.3, 0.38),
        });
        line = word + ' ';
        currentY -= 16;
      } else {
        line = testLine;
      }
    }
    if (line.length > 0) {
      page1.drawText(line.trim(), {
        x: 45,
        y: currentY,
        size: 10.5,
        font: timesRomanFont,
        color: rgb(0.25, 0.3, 0.38),
      });
      currentY -= 26;
    }
  }

  // Draw Checkbox areas for user to stamp checkmarks
  const checkItems = [
    'I confirm that I have reviewed the technical scope and privacy terms.',
    'I authorize digital execution and local browser PDF processing.',
  ];

  for (const item of checkItems) {
    page1.drawRectangle({
      x: 45,
      y: currentY - 2,
      width: 14,
      height: 14,
      borderColor: rgb(0.4, 0.5, 0.65),
      borderWidth: 1.2,
      color: rgb(0.97, 0.98, 1),
    });
    page1.drawText(item, {
      x: 68,
      y: currentY + 1,
      size: 10.5,
      font: timesRomanFont,
      color: rgb(0.2, 0.25, 0.35),
    });
    currentY -= 24;
  }

  // Signature Block Box
  currentY -= 15;
  page1.drawRectangle({
    x: 45,
    y: currentY - 140,
    width: width - 90,
    height: 140,
    color: rgb(0.96, 0.975, 0.99),
    borderColor: rgb(0.82, 0.86, 0.92),
    borderWidth: 1,
  });

  page1.drawText('EXECUTION & SIGNATURES', {
    x: 60,
    y: currentY - 25,
    size: 11,
    font: boldFont,
    color: rgb(0.15, 0.22, 0.35),
  });

  // Client Signature box
  page1.drawText('Authorized Client Signature:', {
    x: 60,
    y: currentY - 60,
    size: 10,
    font: boldFont,
    color: rgb(0.35, 0.4, 0.5),
  });

  page1.drawLine({
    start: { x: 60, y: currentY - 105 },
    end: { x: 280, y: currentY - 105 },
    thickness: 1,
    color: rgb(0.6, 0.65, 0.75),
  });

  page1.drawText('(Sign Above)', {
    x: 60,
    y: currentY - 118,
    size: 8.5,
    font: timesRomanFont,
    color: rgb(0.55, 0.6, 0.7),
  });

  // Date & Print Name
  page1.drawText('Date Executed:', {
    x: 310,
    y: currentY - 60,
    size: 10,
    font: boldFont,
    color: rgb(0.35, 0.4, 0.5),
  });

  page1.drawLine({
    start: { x: 310, y: currentY - 105 },
    end: { x: width - 60, y: currentY - 105 },
    thickness: 1,
    color: rgb(0.6, 0.65, 0.75),
  });

  page1.drawText('(Date / Name Above)', {
    x: 310,
    y: currentY - 118,
    size: 8.5,
    font: timesRomanFont,
    color: rgb(0.55, 0.6, 0.7),
  });

  // Footer
  page1.drawText('Page 1 of 1  •  SignCraft Client-Side PDF Studio  •  All data processed locally', {
    x: 130,
    y: 25,
    size: 8.5,
    font: timesRomanFont,
    color: rgb(0.55, 0.6, 0.7),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
