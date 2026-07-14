import './style.css';
import { EditorState } from './editorState.js';
import { PDFManager } from './pdfManager.js';
import { SignaturePadModal } from './signaturePad.js';
import { generateSamplePDF } from './samplePdf.js';

class AppController {
  constructor() {
    this.state = new EditorState();
    this.pdfManager = new PDFManager(this.state);
    this.selectedElementId = null;
    this.selectedPageIndex = null;

    this.init();
  }

  async init() {
    this.fitDocumentToMobile();

    this.pdfManager.setContainers(
      document.getElementById('pdf-container'),
      document.getElementById('pdf-thumbnails')
    );

    this.bindEvents();
    this.subscribeState();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.fitDocumentToMobile(true), 180);
    });

    try {
      this.showToast('Loading document...', 'info');
      const sampleBytes = await generateSamplePDF();
      await this.pdfManager.loadPDF(sampleBytes, 'Sample_Agreement_2026.pdf');
      this.updateDocMetadata('Sample_Agreement_2026.pdf');
      this.showToast('Document loaded and ready to sign!', 'success');
    } catch (err) {
      console.error('Failed to load sample PDF:', err);
      this.showToast('Error loading sample PDF', 'error');
    }
  }

  fitDocumentToMobile(onlyIfLoaded = false) {
    if (!window.matchMedia('(max-width: 700px)').matches) return;

    const pageWidth = this.state.pageDimensions[0]?.width || 595.28;
    const availableWidth = Math.max(280, window.innerWidth - 24);
    const fittedScale = Math.min(1, Math.max(0.5, availableWidth / pageWidth));

    if (onlyIfLoaded && !this.state.pdfjsDoc) return;
    if (Math.abs(this.state.scale - fittedScale) < 0.02) return;

    if (this.state.pdfjsDoc) {
      this.state.setZoom(fittedScale);
    } else {
      this.state.scale = fittedScale;
    }
  }

  subscribeState() {
    this.state.subscribe((event, payload) => {
      if (event === 'pdfLoaded') {
        this.renderAllOverlays();
        this.setupScrollObserver();
      } else if (event === 'zoomChanged') {
        document.getElementById('zoom-level-text').textContent = `${Math.round(payload.scale * 100)}%`;
        this.pdfManager.updateScale();
        this.renderAllOverlays();
        this.setupScrollObserver();
      } else if (event === 'toolChanged') {
        this.updateToolUI(payload.tool);
      } else if (event === 'pageChanged') {
        document.querySelectorAll('.thumbnail-item').forEach((item) => {
          const pageNum = parseInt(item.dataset.page, 10);
          item.classList.toggle('active', pageNum === payload.page);
        });
      } else if (event === 'elementsChanged' || event === 'allElementsCleared') {
        this.renderAllOverlays();
        this.updatePlacedElementsSidebar();
      } else if (event === 'historyChanged') {
        document.getElementById('btn-undo').disabled = this.state.undoStack.length === 0;
        document.getElementById('btn-redo').disabled = this.state.redoStack.length === 0;
      }
    });
  }

  setupScrollObserver() {
    if (this.pageObserver) {
      this.pageObserver.disconnect();
    }
    const options = {
      root: null,
      threshold: 0.45,
    };
    this.pageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const pageNum = parseInt(entry.target.dataset.page, 10);
          if (pageNum && pageNum !== this.state.currentPage) {
            this.state.setCurrentPage(pageNum);
          }
        }
      });
    }, options);

    document.querySelectorAll('.pdf-page-wrapper').forEach((wrapper) => {
      this.pageObserver.observe(wrapper);
    });
  }

  bindEvents() {
    // Toolbar buttons
    document.querySelectorAll('.tool-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        this.state.setActiveTool(tool);
        if (tool === 'sig') {
          this.showSignatureModal((sigData) => {
            const pageIndex = this.state.currentPage - 1;
            const dim = this.state.pageDimensions[pageIndex] || { width: 595.28, height: 841.89 };
            const width = 180;
            const height = 65;
            const x = Math.max(20, (dim.width - width) / 2);
            const y = Math.max(20, dim.height / 2 - 32);

            const newSig = {
              id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              type: 'signature',
              x,
              y,
              width,
              height,
              content: sigData.content,
              color: sigData.color,
            };
            this.state.addElement(pageIndex, newSig);
            this.selectedElementId = newSig.id;
            this.selectedPageIndex = pageIndex;
            this.state.setActiveTool('select');

            const pageWrapper = document.querySelector(`.pdf-page-wrapper[data-page="${this.state.currentPage}"]`);
            if (pageWrapper) {
              pageWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            this.showToast(`Signature placed on Page ${this.state.currentPage}! Drag to move or resize.`, 'success');
          });
        }
      });
    });

    // Zoom buttons
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      this.state.setZoom(this.state.scale - 0.15);
    });

    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      this.state.setZoom(this.state.scale + 0.15);
    });

    // Undo / Redo
    document.getElementById('btn-undo').addEventListener('click', () => {
      this.state.undo();
    });

    document.getElementById('btn-redo').addEventListener('click', () => {
      this.state.redo();
    });

    // Clear all elements
    document.getElementById('btn-clear-elements').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all placed signatures and annotations?')) {
        this.state.clearAllElements();
        this.showToast('All items cleared', 'info');
      }
    });

    // Reset sample document
    document.getElementById('btn-reset-sample').addEventListener('click', async () => {
      this.state.clearAllElements();
      const sampleBytes = await generateSamplePDF();
      await this.pdfManager.loadPDF(sampleBytes, 'Sample_Agreement_2026.pdf');
      this.updateDocMetadata('Sample_Agreement_2026.pdf');
      this.showToast('Sample contract reloaded', 'success');
    });

    // Upload PDF
    const fileInput = document.getElementById('pdf-file-input');
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      this.state.clearAllElements();
      await this.pdfManager.loadPDF(bytes, file.name);
      this.updateDocMetadata(file.name);
      this.showToast(`Loaded ${file.name}`, 'success');
    });

    // Export PDF
    document.getElementById('btn-export-pdf').addEventListener('click', async () => {
      try {
        this.showToast('Baking signatures & exporting PDF...', 'info');
        const modifiedBytes = await this.pdfManager.exportSignedPDF();

        const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const baseName = document.getElementById('doc-filename').textContent.replace(/\.pdf$/i, '');
        a.download = `${baseName}_Signed.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Signed PDF downloaded successfully!', 'success');
      } catch (err) {
        console.error('Export error:', err);
        this.showToast('Failed to export PDF', 'error');
      }
    });

    window.addEventListener('click', (e) => {
      if (
        !e.target.closest('.overlay-element') &&
        !e.target.closest('.tool-btn') &&
        !e.target.closest('.placed-item-card') &&
        !e.target.closest('.modal-dialog')
      ) {
        this.deselectElement();
      }
    });
  }

  updateToolUI(toolName) {
    document.querySelectorAll('.tool-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tool === toolName);
    });

    const bannerHint = document.getElementById('hint-text');
    const hints = {
      select: 'Click and drag any placed signature or item to reposition or resize it.',
      sig: 'Click anywhere on the document to place a signature.',
      text: 'Click anywhere on the document to add custom text annotation.',
      date: 'Click anywhere on the document to stamp current date.',
      check: 'Click anywhere on the document to stamp a checkmark ☑.',
      cross: 'Click anywhere on the document to stamp a cross badge ☒.',
    };
    if (bannerHint && hints[toolName]) {
      bannerHint.textContent = hints[toolName];
    }
  }

  updateDocMetadata(filename) {
    document.getElementById('doc-filename').textContent = filename;
    document.getElementById('page-count-badge').textContent = this.state.pageCount;
    document.getElementById('meta-pages').textContent = `${this.state.pageCount} ${
      this.state.pageCount === 1 ? 'Page' : 'Pages'
    }`;
  }

  showSignatureModal(onSaveCallback) {
    const modal = new SignaturePadModal({
      onSave: onSaveCallback,
    });
    modal.open();
  }

  renderAllOverlays() {
    const overlays = document.querySelectorAll('.pdf-page-overlay');
    overlays.forEach((overlay) => {
      const pageIndex = parseInt(overlay.dataset.pageIndex, 10);
      this.renderOverlayForPage(pageIndex, overlay);
    });
  }

  renderOverlayForPage(pageIndex, overlayEl) {
    overlayEl.innerHTML = '';
    const elements = this.state.getElementsForPage(pageIndex);

    // Click handler on overlay for stamping / adding items
    overlayEl.onclick = (e) => {
      if (e.target !== overlayEl) return;
      const rect = overlayEl.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / this.state.scale;
      const clickY = (e.clientY - rect.top) / this.state.scale;

      if (this.state.activeTool === 'sig') {
        this.showSignatureModal((sigData) => {
          const width = 180;
          const height = 65;
          const newSig = {
            id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: 'signature',
            x: Math.max(10, clickX - width / 2),
            y: Math.max(10, clickY - height / 2),
            width,
            height,
            content: sigData.content,
            color: sigData.color,
          };
          this.state.addElement(pageIndex, newSig);
          this.selectedElementId = newSig.id;
          this.selectedPageIndex = pageIndex;
          this.state.setActiveTool('select');
          this.showToast('Signature placed onto document! Drag to move or resize.', 'success');
        });
      } else if (this.state.activeTool === 'text') {
        const text = prompt('Enter your text annotation:', 'Approved & Reviewed');
        if (text && text.trim()) {
          const newEl = {
            id: `el_${Date.now()}`,
            type: 'text',
            x: clickX,
            y: clickY,
            width: 180,
            height: 28,
            content: text.trim(),
            color: '#0f172a',
            fontSize: 13,
            bold: false,
          };
          this.state.addElement(pageIndex, newEl);
          this.state.setActiveTool('select');
        }
      } else if (this.state.activeTool === 'date') {
        const today = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        const newEl = {
          id: `el_${Date.now()}`,
          type: 'date',
          x: clickX,
          y: clickY,
          width: 140,
          height: 24,
          content: today,
          color: '#0f172a',
          fontSize: 12.5,
        };
        this.state.addElement(pageIndex, newEl);
        this.state.setActiveTool('select');
      } else if (this.state.activeTool === 'check') {
        const newEl = {
          id: `el_${Date.now()}`,
          type: 'stamp',
          x: clickX - 8,
          y: clickY - 8,
          width: 24,
          height: 24,
          content: '☑',
          color: '#10b981',
          fontSize: 16,
        };
        this.state.addElement(pageIndex, newEl);
      } else if (this.state.activeTool === 'cross') {
        const newEl = {
          id: `el_${Date.now()}`,
          type: 'stamp',
          x: clickX - 8,
          y: clickY - 8,
          width: 24,
          height: 24,
          content: '☒',
          color: '#ef4444',
          fontSize: 16,
        };
        this.state.addElement(pageIndex, newEl);
      }
    };

    elements.forEach((el) => {
      const elDiv = document.createElement('div');
      elDiv.className = `overlay-element ${el.id === this.selectedElementId ? 'selected' : ''}`;
      elDiv.dataset.id = el.id;

      elDiv.style.left = `${el.x * this.state.scale}px`;
      elDiv.style.top = `${el.y * this.state.scale}px`;
      elDiv.style.width = `${el.width * this.state.scale}px`;
      elDiv.style.height = `${el.height * this.state.scale}px`;

      if (el.type === 'signature') {
        const img = document.createElement('img');
        img.src = el.content;
        img.alt = 'Signature';
        elDiv.appendChild(img);
      } else if (el.type === 'text' || el.type === 'date') {
        const span = document.createElement('div');
        span.className = 'text-content';
        span.style.fontSize = `${(el.fontSize || 13) * this.state.scale}px`;
        span.style.color = el.color || '#0f172a';
        span.textContent = el.content;
        elDiv.appendChild(span);
      } else if (el.type === 'stamp') {
        const span = document.createElement('div');
        span.className = 'stamp-content';
        span.style.fontSize = `${(el.fontSize || 16) * this.state.scale}px`;
        span.style.color = el.color || '#0f172a';
        span.textContent = el.content;
        elDiv.appendChild(span);
      }

      const delBtn = document.createElement('button');
      delBtn.className = 'el-delete-btn';
      delBtn.title = 'Delete Item';
      delBtn.innerHTML = '✕';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.state.deleteElement(pageIndex, el.id);
        if (this.selectedElementId === el.id) {
          this.selectedElementId = null;
        }
      });
      elDiv.appendChild(delBtn);

      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'resize-handle se';
      elDiv.appendChild(resizeHandle);

      this.bindElementInteractions(elDiv, el, pageIndex);

      overlayEl.appendChild(elDiv);
    });
  }

  bindElementInteractions(elDiv, el, pageIndex) {
    elDiv.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.selectedElementId = el.id;
      this.selectedPageIndex = pageIndex;

      document.querySelectorAll('.overlay-element.selected').forEach((domEl) => {
        domEl.classList.remove('selected');
      });
      elDiv.classList.add('selected');
      this.updatePlacedElementsSidebar();

      if (e.target.classList.contains('resize-handle')) {
        this.handleResize(e, elDiv, el, pageIndex);
        return;
      }

      elDiv.setPointerCapture(e.pointerId);

      let currentPageIndex = pageIndex;
      let startX = e.clientX;
      let startY = e.clientY;
      let initialX = el.x;
      let initialY = el.y;

      let rafId = null;
      let targetX = initialX;
      let targetY = initialY;

      const onPointerMove = (moveE) => {
        const wrappers = document.querySelectorAll('.pdf-page-wrapper');
        wrappers.forEach((wrapper) => {
          const rect = wrapper.getBoundingClientRect();
          if (
            moveE.clientX >= rect.left &&
            moveE.clientX <= rect.right &&
            moveE.clientY >= rect.top &&
            moveE.clientY <= rect.bottom
          ) {
            const hoveredPageIndex = parseInt(wrapper.dataset.page, 10) - 1;
            if (!isNaN(hoveredPageIndex) && hoveredPageIndex !== currentPageIndex) {
              const newOverlay = wrapper.querySelector('.pdf-page-overlay');
              if (newOverlay) {
                newOverlay.appendChild(elDiv);
                this.state.pageElements[currentPageIndex] = (this.state.pageElements[currentPageIndex] || []).filter(
                  (item) => item.id !== el.id
                );
                if (!this.state.pageElements[hoveredPageIndex]) {
                  this.state.pageElements[hoveredPageIndex] = [];
                }
                this.state.pageElements[hoveredPageIndex].push(el);

                currentPageIndex = hoveredPageIndex;
                this.selectedPageIndex = hoveredPageIndex;
                this.state.setCurrentPage(hoveredPageIndex + 1);

                startX = moveE.clientX;
                startY = moveE.clientY;
                initialX = (moveE.clientX - rect.left) / this.state.scale - el.width / 2;
                initialY = (moveE.clientY - rect.top) / this.state.scale - el.height / 2;
                targetX = initialX;
                targetY = initialY;
                el.x = targetX;
                el.y = targetY;
                this.updatePlacedElementsSidebar();
              }
            }
          }
        });

        const deltaX = (moveE.clientX - startX) / this.state.scale;
        const deltaY = (moveE.clientY - startY) / this.state.scale;
        targetX = initialX + deltaX;
        targetY = initialY + deltaY;

        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            elDiv.style.left = `${targetX * this.state.scale}px`;
            elDiv.style.top = `${targetY * this.state.scale}px`;
            rafId = null;
          });
        }
      };

      const onPointerUp = () => {
        if (rafId) cancelAnimationFrame(rafId);
        try { elDiv.releasePointerCapture(e.pointerId); } catch (_) {}
        elDiv.removeEventListener('pointermove', onPointerMove);
        elDiv.removeEventListener('pointerup', onPointerUp);
        elDiv.removeEventListener('pointercancel', onPointerUp);

        el.x = targetX;
        el.y = targetY;
        this.state.updateElement(currentPageIndex, el.id, { x: el.x, y: el.y });
      };

      elDiv.addEventListener('pointermove', onPointerMove);
      elDiv.addEventListener('pointerup', onPointerUp);
      elDiv.addEventListener('pointercancel', onPointerUp);
    });
  }

  handleResize(e, elDiv, el, pageIndex) {
    elDiv.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidth = el.width;
    const initialHeight = el.height;

    let rafId = null;
    let targetW = initialWidth;
    let targetH = initialHeight;

    const onPointerMove = (moveE) => {
      const deltaX = (moveE.clientX - startX) / this.state.scale;
      const deltaY = (moveE.clientY - startY) / this.state.scale;
      targetW = Math.max(30, initialWidth + deltaX);
      targetH = Math.max(15, initialHeight + deltaY);

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          elDiv.style.width = `${targetW * this.state.scale}px`;
          elDiv.style.height = `${targetH * this.state.scale}px`;
          rafId = null;
        });
      }
    };

    const onPointerUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      try { elDiv.releasePointerCapture(e.pointerId); } catch (_) {}
      elDiv.removeEventListener('pointermove', onPointerMove);
      elDiv.removeEventListener('pointerup', onPointerUp);
      elDiv.removeEventListener('pointercancel', onPointerUp);

      el.width = targetW;
      el.height = targetH;
      this.state.updateElement(pageIndex, el.id, { width: el.width, height: el.height });
    };

    elDiv.addEventListener('pointermove', onPointerMove);
    elDiv.addEventListener('pointerup', onPointerUp);
    elDiv.addEventListener('pointercancel', onPointerUp);
  }

  deselectElement() {
    if (this.selectedElementId) {
      this.selectedElementId = null;
      document.querySelectorAll('.overlay-element.selected').forEach((domEl) => {
        domEl.classList.remove('selected');
      });
      this.updatePlacedElementsSidebar();
    }
  }

  updatePlacedElementsSidebar() {
    const listContainer = document.getElementById('placed-elements-list');
    let allElementsCount = 0;

    for (const pageIdx in this.state.pageElements) {
      allElementsCount += this.state.pageElements[pageIdx].length;
    }

    document.getElementById('meta-signatures').textContent = `${allElementsCount} Placed`;

    if (allElementsCount === 0) {
      listContainer.innerHTML = `
        <div class="empty-elements-msg">
          No signatures or annotations added yet. Click <strong>Add Signature</strong> to place one.
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    for (const pageIdx in this.state.pageElements) {
      const pageElements = this.state.pageElements[pageIdx];
      pageElements.forEach((el, index) => {
        const itemCard = document.createElement('div');
        itemCard.className = `placed-item-card ${el.id === this.selectedElementId ? 'selected' : ''}`;

        const iconMap = {
          signature: '✍️',
          text: '📝',
          date: '📅',
          stamp: '🏷️',
        };

        const labelMap = {
          signature: `Signature #${index + 1}`,
          text: el.content ? `"${el.content.substring(0, 18)}..."` : `Text #${index + 1}`,
          date: `Date: ${el.content}`,
          stamp: `Stamp: ${el.content}`,
        };

        itemCard.innerHTML = `
          <div class="placed-item-info">
            <span>${iconMap[el.type] || '📌'}</span>
            <div>
              <div class="placed-item-title">${labelMap[el.type] || el.type}</div>
              <div class="placed-item-sub">Page ${parseInt(pageIdx, 10) + 1}</div>
            </div>
          </div>
          <button class="item-delete-btn" title="Delete">✕</button>
        `;

        itemCard.addEventListener('click', () => {
          this.selectedElementId = el.id;
          this.selectedPageIndex = parseInt(pageIdx, 10);
          this.state.setCurrentPage(parseInt(pageIdx, 10) + 1);
          this.renderAllOverlays();
          this.updatePlacedElementsSidebar();
        });

        itemCard.querySelector('.item-delete-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          this.state.deleteElement(parseInt(pageIdx, 10), el.id);
        });

        listContainer.appendChild(itemCard);
      });
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AppController();
});
