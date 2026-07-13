import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export class PDFManager {
  constructor(state) {
    this.state = state;
    this.container = null;
    this.thumbnailsContainer = null;
  }

  setContainers(mainContainer, thumbnailsContainer) {
    this.container = mainContainer;
    this.thumbnailsContainer = thumbnailsContainer;
  }

  async loadPDF(pdfBytes, fileName = 'Document.pdf') {
    this.state.pdfBytes = new Uint8Array(pdfBytes);
    const workerBytes = new Uint8Array(pdfBytes);
    const loadingTask = pdfjsLib.getDocument({ data: workerBytes });
    const pdf = await loadingTask.promise;
    this.state.pdfjsDoc = pdf;
    this.state.pageCount = pdf.numPages;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      this.state.pageDimensions[i - 1] = {
        width: viewport.width,
        height: viewport.height,
      };
    }

    this.state.setCurrentPage(1);
    await this.renderAllPages();
    await this.renderThumbnails();
  }

  async renderAllPages() {
    if (!this.container || !this.state.pdfjsDoc) return;
    this.container.innerHTML = '';

    for (let pageNum = 1; pageNum <= this.state.pageCount; pageNum++) {
      const pageIndex = pageNum - 1;
      const dim = this.state.pageDimensions[pageIndex];

      const pageWrapper = document.createElement('div');
      pageWrapper.className = 'pdf-page-wrapper';
      pageWrapper.dataset.page = pageNum;
      pageWrapper.style.width = `${dim.width * this.state.scale}px`;
      pageWrapper.style.height = `${dim.height * this.state.scale}px`;

      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-page-canvas';
      const ctx = canvas.getContext('2d');

      const dpr = window.devicePixelRatio || 1;
      canvas.width = dim.width * this.state.scale * dpr;
      canvas.height = dim.height * this.state.scale * dpr;
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      pageWrapper.appendChild(canvas);

      const overlay = document.createElement('div');
      overlay.className = 'pdf-page-overlay';
      overlay.dataset.pageIndex = pageIndex;
      pageWrapper.appendChild(overlay);

      this.container.appendChild(pageWrapper);

      const page = await this.state.pdfjsDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: this.state.scale * dpr });

      await page.render({
        canvasContext: ctx,
        viewport: viewport,
      }).promise;
    }
  }

  async renderThumbnails() {
    if (!this.thumbnailsContainer || !this.state.pdfjsDoc) return;
    this.thumbnailsContainer.innerHTML = '';

    for (let pageNum = 1; pageNum <= this.state.pageCount; pageNum++) {
      const thumbItem = document.createElement('div');
      thumbItem.className = `thumbnail-item ${pageNum === this.state.currentPage ? 'active' : ''}`;
      thumbItem.dataset.page = pageNum;

      const page = await this.state.pdfjsDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.25 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({ canvasContext: ctx, viewport }).promise;

      const label = document.createElement('span');
      label.className = 'thumb-label';
      label.textContent = `Page ${pageNum}`;

      thumbItem.appendChild(canvas);
      thumbItem.appendChild(label);

      thumbItem.addEventListener('click', () => {
        this.state.setCurrentPage(pageNum);
        const targetPageEl = this.container.querySelector(`[data-page="${pageNum}"]`);
        if (targetPageEl) {
          targetPageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      this.thumbnailsContainer.appendChild(thumbItem);
    }
  }

  updateScale() {
    if (!this.container) return;
    const wrappers = this.container.querySelectorAll('.pdf-page-wrapper');
    wrappers.forEach((wrapper) => {
      const pageNum = parseInt(wrapper.dataset.page, 10);
      const dim = this.state.pageDimensions[pageNum - 1];
      wrapper.style.width = `${dim.width * this.state.scale}px`;
      wrapper.style.height = `${dim.height * this.state.scale}px`;
    });
    this.renderAllPages();
  }

  hexToRgb(hex) {
    if (!hex) return rgb(0.06, 0.09, 0.16);
    const cleanHex = hex.replace('#', '');
    const bigint = parseInt(cleanHex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return rgb(r / 255, g / 255, b / 255);
  }

  dataUrlToUint8Array(dataUrl) {
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }

  sanitizeWinAnsiText(text) {
    if (!text) return '';
    return text
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/—/g, '--')
      .replace(/–/g, '-')
      .replace(/[^\x20-\x7E]/g, ''); // Keep safe ASCII printable range
  }

  async exportSignedPDF() {
    if (!this.state.pdfBytes) {
      throw new Error('No PDF document loaded');
    }

    const sourceBytes = new Uint8Array(this.state.pdfBytes);
    const pdfDoc = await PDFDocument.load(sourceBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pages = pdfDoc.getPages();

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      const { height } = page.getSize();
      const elements = this.state.getElementsForPage(pageIndex);

      for (const el of elements) {
        try {
          if (el.type === 'signature') {
            const imageBytes = this.dataUrlToUint8Array(el.content);
            let embeddedImage;
            if (el.content.startsWith('data:image/jpeg') || el.content.startsWith('data:image/jpg')) {
              embeddedImage = await pdfDoc.embedJpg(imageBytes);
            } else {
              embeddedImage = await pdfDoc.embedPng(imageBytes);
            }
            page.drawImage(embeddedImage, {
              x: el.x,
              y: height - el.y - el.height,
              width: el.width,
              height: el.height,
            });
          } else if (el.type === 'text' || el.type === 'date') {
            const textColor = this.hexToRgb(el.color || '#0f172a');
            const lines = (el.content || '').split('\n');
            let currentY = height - el.y - (el.fontSize || 14);
            for (const line of lines) {
              const safeLine = this.sanitizeWinAnsiText(line);
              if (safeLine) {
                page.drawText(safeLine, {
                  x: el.x,
                  y: currentY,
                  size: el.fontSize || 14,
                  font: el.bold ? helveticaFont : regularFont,
                  color: textColor,
                });
              }
              currentY -= (el.fontSize || 14) * 1.25;
            }
          } else if (el.type === 'stamp') {
            const boxSize = el.width || 24;
            const pdfY = height - el.y - boxSize;

            if (el.content === '☑' || el.color === '#10b981') {
              // Draw vector checkmark box
              page.drawRectangle({
                x: el.x,
                y: pdfY,
                width: boxSize,
                height: boxSize,
                borderColor: rgb(0.06, 0.72, 0.5),
                borderWidth: 1.8,
                color: rgb(0.92, 0.99, 0.95),
              });
              // Checkmark strokes
              page.drawLine({
                start: { x: el.x + boxSize * 0.22, y: pdfY + boxSize * 0.48 },
                end: { x: el.x + boxSize * 0.42, y: pdfY + boxSize * 0.25 },
                thickness: 2.2,
                color: rgb(0.06, 0.72, 0.5),
              });
              page.drawLine({
                start: { x: el.x + boxSize * 0.42, y: pdfY + boxSize * 0.25 },
                end: { x: el.x + boxSize * 0.78, y: pdfY + boxSize * 0.75 },
                thickness: 2.2,
                color: rgb(0.06, 0.72, 0.5),
              });
            } else {
              // Draw vector cross X box
              page.drawRectangle({
                x: el.x,
                y: pdfY,
                width: boxSize,
                height: boxSize,
                borderColor: rgb(0.93, 0.26, 0.26),
                borderWidth: 1.8,
                color: rgb(0.99, 0.94, 0.94),
              });
              // X strokes
              page.drawLine({
                start: { x: el.x + boxSize * 0.25, y: pdfY + boxSize * 0.75 },
                end: { x: el.x + boxSize * 0.75, y: pdfY + boxSize * 0.25 },
                thickness: 2.2,
                color: rgb(0.93, 0.26, 0.26),
              });
              page.drawLine({
                start: { x: el.x + boxSize * 0.25, y: pdfY + boxSize * 0.25 },
                end: { x: el.x + boxSize * 0.75, y: pdfY + boxSize * 0.75 },
                thickness: 2.2,
                color: rgb(0.93, 0.26, 0.26),
              });
            }
          }
        } catch (elErr) {
          console.error(`Error embedding element on page ${pageIndex + 1}:`, elErr, el);
        }
      }
    }

    const modifiedBytes = await pdfDoc.save();
    return modifiedBytes;
  }
}
