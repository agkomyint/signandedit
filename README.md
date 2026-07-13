# SignCraft Studio ✒️✨
**State-of-the-Art Client-Side PDF Signature Studio & Document Editor**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)
[![100% Client-Side](https://img.shields.io/badge/Privacy-100%25_Local_Browser-10b981.svg)](#why-client-side-signing)
[![Built with Vite](https://img.shields.io/badge/Built_with-Vite_%2F_ESM-646cff.svg)](#tech-stack)

SignCraft Studio is an open-source, modern web application for signing, annotating, and editing PDF documents **entirely inside the user's web browser**. Unlike traditional electronic signature platforms that upload sensitive files to remote servers, SignCraft Studio processes 100% of PDF rendering, signature generation, and embedding locally on the client device.

---

## 🌟 Key Features

### 🔒 100% Private & Client-Side Execution
- **Zero Server Uploads**: Documents never leave your browser or get transmitted over the network.
- **Local PDF Rendering**: Powered by [`pdfjs-dist`](https://mozilla.github.io/pdf.js/) for fast, high-fidelity PDF rendering.
- **Native PDF Modification**: Uses [`pdf-lib`](https://pdf-lib.js.org/) to embed vector and raster signatures, text, and stamps directly into standard PDF binary structures.

### ✍️ Comprehensive Signature Studio
- **Handwritten Signature Pad**: Draw smooth, responsive signatures using mouse, stylus, or touch screen.
- **Cursive Script Signatures**: Type your name and render instant signatures using curated script fonts (*Dancing Script*, *Caveat*, *Great Vibes*, *Pacifico*).
- **Image Signatures**: Upload existing transparent PNG or JPEG signature images.

### 📝 Annotation & Form Tools
- **Text Annotations**: Place custom text anywhere on document pages with adjustable font sizing, bolding, and colors.
- **Date Stamps**: Insert current date stamps with one click.
- **Form Stamps**: Stamp crisp vector checkmarks (**☑**) and cross/void badges (**☒**) onto checkboxes or contract clauses.
- **Interactive Canvas**: Select, drag, reposition, and resize placed elements interactively before finalizing.

### 🧭 Productivity & Navigation
- **Multi-Page Support**: Thumbnail drawer with interactive page navigation and page counter badge.
- **Zoom & Viewport Control**: Zoom in/out smoothly (with interactive zoom level readout).
- **History Management**: Full **Undo / Redo** support across all annotation actions.
- **Instant Demo Mode**: Preloaded sample contract (`Sample_Agreement_2026.pdf`) for instant evaluation and testing.

---

## 🛡️ Why Client-Side Signing?

| Feature | Traditional Cloud E-Sign Tools | **SignCraft Studio** |
| :--- | :--- | :--- |
| **Privacy & Security** | Files uploaded to third-party servers | **100% Local Browser Execution** |
| **Account Required** | Mandatory signup / subscription | **No account needed** |
| **Network Dependency** | Requires active internet connection | **Works offline once loaded** |
| **Data Retention** | Cloud storage risks & data mining | **Zero server footprint** |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (v9+ or equivalent package manager)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/signandedit.git
   cd signandedit
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

4. **Build for production:**
   ```bash
   npm run build
   ```
   The production-ready static files will be output to the `dist/` directory. You can preview the production build using `npm run preview`.

---

## 🏗️ Project Architecture

```
signandedit/
├── index.html               # Main application layout, header, sidebars & workspace UI
├── package.json             # Dependencies & Vite scripts
├── public/                  # Static assets
└── src/
    ├── main.js              # Application entry point & UI controller
    ├── editorState.js       # Centralized state management & Undo/Redo history stack
    ├── pdfManager.js        # PDF rendering (pdfjs-dist) & export engine (pdf-lib)
    ├── signaturePad.js      # Signature creation modal (Draw, Type, Upload)
    ├── samplePdf.js         # Built-in demo contract generator
    └── style.css            # Modern styling & responsive design system
```

---

## 📖 Usage Guide

1. **Upload or Try Sample PDF**: Click **Upload Any PDF** in the top right to load your document, or explore the default loaded sample agreement.
2. **Choose a Tool**:
   - Click **Add Signature** (`Popular`) to draw, type, or upload your signature.
   - Select **Text Annotation** (`T`) to add custom text blocks.
   - Select **Date Stamp** (`D`), **Checkmark ☑**, or **Cross Badge ☒** to stamp standard form elements.
3. **Position & Adjust**: Use the **Select / Move** (`V`) tool to drag annotations to precise locations on the document.
4. **Export Signed PDF**: Click **Export & Download Signed PDF** to generate a standard, compliant PDF file with all signatures and annotations permanently embedded.

---

## 🤝 Contributing

SignCraft Studio is open-source and welcomes contributions! Whether it's adding new PDF tools, improving accessibility, or optimizing mobile touch gestures:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open-source and available under the **MIT License**. Feel free to use, modify, and distribute it in your personal and commercial projects.
