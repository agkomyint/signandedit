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
    this.state.pdfBytes = pdfBytes;
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
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
    const cleanHex = hex.replace('#', '');
    const bigint = parseInt(cleanHex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return rgb(r / 255, g / 255, b / 255);
  }

  async exportSignedPDF() {
    if (!this.state.pdfBytes) {
      throw new Error('No PDF document loaded');
    }

    const pdfDoc = await PDFDocument.load(this.state.pdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pages = pdfDoc.getPages();

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      const { height } = page.getSize();
      const elements = this.state.getElementsForPage(pageIndex);

      for (const el of elements) {
        if (el.type === 'signature') {
          try {
            let embeddedImage;
            if (el.content.startsWith('data:image/jpeg') || el.content.startsWith('data:image/jpg')) {
              embeddedImage = await pdfDoc.embedJpg(el.content);
            } else {
              embeddedImage = await pdfDoc.embedPng(el.content);
            }
            page.drawImage(embeddedImage, {
              x: el.x,
              y: height - el.y - el.height,
              width: el.width,
              height: el.height,
            });
          } catch (err) {
            console.error('Error embedding signature image:', err);
          }
        } else if (el.type === 'text' || el.type === 'date') {
          const textColor = this.hexToRgb(el.color || '#0f172a');
          const lines = (el.content || '').split('\n');
          let currentY = height - el.y - el.fontSize;
          for (const line of lines) {
            page.drawText(line, {
              x: el.x,
              y: currentY,
              size: el.fontSize || 14,
              font: el.bold ? helveticaFont : regularFont,
              color: textColor,
            });
            currentY -= (el.fontSize || 14) * 1.2;
          }
        } else if (el.type === 'stamp') {
          const textColor = this.hexToRgb(el.color || '#0f172a');
          page.drawText(el.content, {
            x: el.x,
            y: height - el.y - el.fontSize,
            size: el.fontSize || 18,
            font: helveticaFont,
            color: textColor,
          });
        }
      }
    }

    const modifiedBytes = await pdfDoc.save();
    return modifiedBytes;
  }
}
