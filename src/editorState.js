export class EditorState {
  constructor() {
    this.pdfBytes = null;
    this.pdfjsDoc = null;
    this.pageCount = 0;
    this.currentPage = 1;
    this.scale = 1.25; // Default zoom
    this.activeTool = 'select'; // 'select', 'sig', 'text', 'date', 'check', 'cross', 'draw'
    this.textColor = '#0f172a';
    this.textSize = 14;

    // Map of pageIndex (0-indexed) => Array of Element objects
    this.pageElements = {};
    this.pageDimensions = {}; // pageIndex => { width, height } in PDF pt

    this.undoStack = [];
    this.redoStack = [];

    this.listeners = [];
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify(event, payload = {}) {
    this.listeners.forEach((cb) => cb(event, payload));
  }

  setZoom(newScale) {
    this.scale = Math.max(0.5, Math.min(2.5, newScale));
    this.notify('zoomChanged', { scale: this.scale });
  }

  setActiveTool(toolName) {
    this.activeTool = toolName;
    this.notify('toolChanged', { tool: toolName });
  }

  setCurrentPage(pageNum) {
    if (pageNum >= 1 && pageNum <= this.pageCount) {
      this.currentPage = pageNum;
      this.notify('pageChanged', { page: this.currentPage });
    }
  }

  getElementsForPage(pageIndex) {
    return this.pageElements[pageIndex] || [];
  }

  addElement(pageIndex, element) {
    this.saveUndoState();
    if (!this.pageElements[pageIndex]) {
      this.pageElements[pageIndex] = [];
    }
    this.pageElements[pageIndex].push(element);
    this.notify('elementsChanged', { pageIndex });
  }

  updateElement(pageIndex, elementId, updates) {
    const list = this.pageElements[pageIndex];
    if (!list) return;
    const item = list.find((el) => el.id === elementId);
    if (item) {
      Object.assign(item, updates);
      this.notify('elementsChanged', { pageIndex });
    }
  }

  deleteElement(pageIndex, elementId) {
    this.saveUndoState();
    const list = this.pageElements[pageIndex];
    if (!list) return;
    this.pageElements[pageIndex] = list.filter((el) => el.id !== elementId);
    this.notify('elementsChanged', { pageIndex });
  }

  clearAllElements() {
    this.saveUndoState();
    this.pageElements = {};
    this.notify('allElementsCleared');
  }

  saveUndoState() {
    // Deep copy current elements state
    const snapshot = JSON.parse(JSON.stringify(this.pageElements));
    this.undoStack.push(snapshot);
    if (this.undoStack.length > 30) this.undoStack.shift();
    this.redoStack = [];
    this.notify('historyChanged');
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const current = JSON.parse(JSON.stringify(this.pageElements));
    this.redoStack.push(current);
    this.pageElements = this.undoStack.pop();
    this.notify('elementsChanged', { pageIndex: this.currentPage - 1 });
    this.notify('historyChanged');
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const current = JSON.parse(JSON.stringify(this.pageElements));
    this.undoStack.push(current);
    this.pageElements = this.redoStack.pop();
    this.notify('elementsChanged', { pageIndex: this.currentPage - 1 });
    this.notify('historyChanged');
  }
}
