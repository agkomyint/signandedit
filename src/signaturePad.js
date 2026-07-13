export class SignaturePadModal {
  constructor({ onSave }) {
    this.onSave = onSave;
    this.activeTab = 'draw'; // 'draw', 'type', 'upload'
    this.strokeColor = '#0f172a'; // default dark navy
    this.strokeWidth = 2.8;
    this.isDrawing = false;
    this.typedText = 'Alex Rivera';
    this.typedFont = "'Caveat', cursive";
    this.uploadedImageSrc = null;

    this.modalEl = null;
    this.canvas = null;
    this.ctx = null;
    this.lastX = 0;
    this.lastY = 0;
  }

  open() {
    this.renderModal();
    this.bindEvents();
    this.initCanvas();
  }

  close() {
    if (this.modalEl) {
      this.modalEl.classList.add('closing');
      setTimeout(() => {
        if (this.modalEl && this.modalEl.parentNode) {
          this.modalEl.parentNode.removeChild(this.modalEl);
        }
      }, 200);
    }
  }

  renderModal() {
    const existing = document.getElementById('signature-modal');
    if (existing) existing.remove();

    const modalHtml = `
      <div class="modal-backdrop" id="signature-modal">
        <div class="modal-dialog signature-modal-card">
          <div class="modal-header">
            <div class="modal-title-wrap">
              <div class="modal-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15.2 3a2 2 0 0 1 2.8 2.8l-10 10A2 2 0 0 1 6.6 16.4l-3.2.8.8-3.2a2 2 0 0 1 .6-1.4l10.4-9.6z"/><path d="M13.5 6.5l4 4"/></svg>
              </div>
              <div>
                <h3 class="modal-title">Create Your Signature</h3>
                <p class="modal-subtitle">Draw with mouse/touch, type your name, or upload an image</p>
              </div>
            </div>
            <button class="modal-close-btn" id="sig-close-btn" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="signature-tabs">
            <button class="sig-tab active" data-tab="draw">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
              Draw Pen
            </button>
            <button class="sig-tab" data-tab="type">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
              Type Signature
            </button>
            <button class="sig-tab" data-tab="upload">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Upload Image
            </button>
          </div>

          <!-- Color & Width Controls -->
          <div class="signature-controls">
            <div class="color-picker-group">
              <span class="control-label">Ink Color:</span>
              <button class="ink-color-btn active" data-color="#0f172a" style="background: #0f172a;" title="Executive Navy"></button>
              <button class="ink-color-btn" data-color="#1e40af" style="background: #1e40af;" title="Royal Blue"></button>
              <button class="ink-color-btn" data-color="#047857" style="background: #047857;" title="Emerald Green"></button>
              <button class="ink-color-btn" data-color="#b91c1c" style="background: #b91c1c;" title="Crimson Red"></button>
            </div>
            <div class="stroke-width-group" id="stroke-controls">
              <span class="control-label">Pen Thickness:</span>
              <button class="stroke-btn" data-width="1.8">Fine</button>
              <button class="stroke-btn active" data-width="2.8">Medium</button>
              <button class="stroke-btn" data-width="4.2">Bold</button>
            </div>
          </div>

          <!-- Tab Contents -->
          <div class="signature-workspace">
            <!-- Draw Tab -->
            <div class="sig-tab-content active" id="tab-draw">
              <div class="canvas-wrapper">
                <canvas id="signature-canvas" width="560" height="220" style="touch-action: none;"></canvas>
                <div class="signature-baseline">Sign on the line above</div>
                <button class="clear-canvas-btn" id="sig-clear-btn" title="Clear Canvas">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  Clear
                </button>
              </div>
            </div>

            <!-- Type Tab -->
            <div class="sig-tab-content" id="tab-type">
              <div class="type-input-group">
                <input type="text" id="sig-type-input" value="Alex Rivera" placeholder="Type your full name here..." />
              </div>
              <div class="type-fonts-grid">
                <div class="typed-font-card active" data-font="'Caveat', cursive">
                  <span class="font-preview" style="font-family: 'Caveat', cursive;">Alex Rivera</span>
                  <span class="font-name">Modern Script</span>
                </div>
                <div class="typed-font-card" data-font="'Dancing Script', cursive">
                  <span class="font-preview" style="font-family: 'Dancing Script', cursive;">Alex Rivera</span>
                  <span class="font-name">Elegant Cursive</span>
                </div>
                <div class="typed-font-card" data-font="'Pacifico', cursive">
                  <span class="font-preview" style="font-family: 'Pacifico', cursive;">Alex Rivera</span>
                  <span class="font-name">Signature Bold</span>
                </div>
                <div class="typed-font-card" data-font="'Great Vibes', cursive">
                  <span class="font-preview" style="font-family: 'Great Vibes', cursive;">Alex Rivera</span>
                  <span class="font-name">Executive Calligraphy</span>
                </div>
              </div>
            </div>

            <!-- Upload Tab -->
            <div class="sig-tab-content" id="tab-upload">
              <div class="upload-dropzone" id="sig-upload-dropzone">
                <input type="file" id="sig-file-input" accept="image/png,image/jpeg,image/webp" hidden />
                <div class="upload-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <div class="upload-text">
                  <strong>Click to upload</strong> or drag and drop a signature PNG / JPG
                </div>
                <p class="upload-hint">Transparent PNG works best for contracts</p>
                <div class="uploaded-preview-container" id="uploaded-preview-container" style="display:none;">
                  <img id="uploaded-preview-img" alt="Uploaded Signature" />
                  <button class="remove-upload-btn" id="remove-upload-btn">Remove</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="modal-footer">
            <button class="btn btn-secondary" id="sig-cancel-btn">Cancel</button>
            <button class="btn btn-primary glow-btn" id="sig-insert-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              Place Signature on Document
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.modalEl = document.getElementById('signature-modal');
  }

  bindEvents() {
    document.getElementById('sig-close-btn').addEventListener('click', () => this.close());
    document.getElementById('sig-cancel-btn').addEventListener('click', () => this.close());

    // Tabs
    const tabs = document.querySelectorAll('.sig-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeTab = tab.dataset.tab;

        document.querySelectorAll('.sig-tab-content').forEach((c) => c.classList.remove('active'));
        document.getElementById(`tab-${this.activeTab}`).classList.add('active');

        const strokeControls = document.getElementById('stroke-controls');
        strokeControls.style.display = this.activeTab === 'draw' ? 'flex' : 'none';
      });
    });

    // Ink colors
    document.querySelectorAll('.ink-color-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ink-color-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.strokeColor = btn.dataset.color;
        this.updateTypedFontPreviews();
      });
    });

    // Stroke width
    document.querySelectorAll('.stroke-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.stroke-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.strokeWidth = parseFloat(btn.dataset.width);
      });
    });

    // Clear Canvas
    document.getElementById('sig-clear-btn').addEventListener('click', () => {
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    });

    // Type tab live input
    const typeInput = document.getElementById('sig-type-input');
    typeInput.addEventListener('input', (e) => {
      this.typedText = e.target.value || 'Alex Rivera';
      this.updateTypedFontPreviews();
    });

    document.querySelectorAll('.typed-font-card').forEach((card) => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.typed-font-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        this.typedFont = card.dataset.font;
      });
    });

    // Upload tab
    const dropzone = document.getElementById('sig-upload-dropzone');
    const fileInput = document.getElementById('sig-file-input');
    dropzone.addEventListener('click', (e) => {
      if (e.target.id !== 'remove-upload-btn') {
        fileInput.click();
      }
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

    document.getElementById('remove-upload-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.uploadedImageSrc = null;
      document.getElementById('uploaded-preview-container').style.display = 'none';
      fileInput.value = '';
    });

    document.getElementById('sig-insert-btn').addEventListener('click', () => this.handleInsert());
  }

  updateTypedFontPreviews() {
    document.querySelectorAll('.typed-font-card .font-preview').forEach((preview) => {
      preview.textContent = this.typedText;
      preview.style.color = this.strokeColor;
    });
  }

  handleFileUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedImageSrc = e.target.result;
      const previewImg = document.getElementById('uploaded-preview-img');
      previewImg.src = this.uploadedImageSrc;
      document.getElementById('uploaded-preview-container').style.display = 'flex';
    };
    reader.readAsDataURL(file);
  }

  initCanvas() {
    this.canvas = document.getElementById('signature-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const startDrawing = (e) => {
      e.preventDefault();
      this.isDrawing = true;
      const pos = getPos(e);
      this.lastX = pos.x;
      this.lastY = pos.y;
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);

      this.ctx.strokeStyle = this.strokeColor;
      this.ctx.lineWidth = this.strokeWidth * 1.5;

      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();

      this.lastX = pos.x;
      this.lastY = pos.y;
    };

    const stopDrawing = () => {
      this.isDrawing = false;
    };

    // Use PointerEvents for universal support (Mouse, Touch, Stylus on Windows)
    this.canvas.addEventListener('pointerdown', startDrawing);
    this.canvas.addEventListener('pointermove', draw);
    window.addEventListener('pointerup', stopDrawing);
    window.addEventListener('pointercancel', stopDrawing);
  }

  async handleInsert() {
    let dataUrl = null;

    if (this.activeTab === 'draw') {
      const blankCanvas = document.createElement('canvas');
      blankCanvas.width = this.canvas.width;
      blankCanvas.height = this.canvas.height;
      if (this.canvas.toDataURL() === blankCanvas.toDataURL()) {
        alert('Please draw a signature first!');
        return;
      }
      dataUrl = this.canvas.toDataURL('image/png');
    } else if (this.activeTab === 'type') {
      if (!this.typedText.trim()) {
        alert('Please type your name first!');
        return;
      }
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 600;
      offCanvas.height = 180;
      const offCtx = offCanvas.getContext('2d');

      await document.fonts.ready;
      offCtx.font = `72px ${this.typedFont}`;
      offCtx.fillStyle = this.strokeColor;
      offCtx.textBaseline = 'middle';
      offCtx.textAlign = 'center';
      offCtx.fillText(this.typedText, 300, 95);

      dataUrl = offCanvas.toDataURL('image/png');
    } else if (this.activeTab === 'upload') {
      if (!this.uploadedImageSrc) {
        alert('Please upload a signature image first!');
        return;
      }
      dataUrl = this.uploadedImageSrc;
    }

    if (dataUrl && this.onSave) {
      this.onSave({
        type: 'signature',
        content: dataUrl,
        color: this.strokeColor,
      });
      this.close();
    }
  }
}
