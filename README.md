# PDF Layer Printer

A minimalistic web application that allows users to selectively print specific layers from PDF documents using PDF.js and Tailwind CSS.

## Features

- **Layer Detection**: Automatically detects and displays Optional Content Groups (OCGs) in PDF files
- **Interactive Preview**: Real-time PDF preview with layer visibility controls
- **Selective Printing**: Print only the selected layers from your PDF
- **Drag & Drop**: Easy file upload via drag and drop or file selection
- **Responsive Design**: Clean, minimalistic interface built with Tailwind CSS
- **Multi-page Support**: Navigate through multi-page PDFs with zoom controls

## Technology Stack

- **PDF.js**: Mozilla's JavaScript PDF rendering library
- **Tailwind CSS v4**: Utility-first CSS framework for styling
- **Vanilla JavaScript**: No additional frameworks required
- **HTML5 Canvas**: For PDF rendering and print preparation

## Getting Started

### Prerequisites

- A modern web browser with JavaScript enabled
- A local web server (due to CORS restrictions with PDF.js)

### Installation

1. Clone or download this repository
2. Start a local web server in the project directory

#### Using Python (if installed):
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Using Node.js (if installed):
```bash
npx serve .
```

#### Using PHP (if installed):
```bash
php -S localhost:8000
```

3. Open your browser and navigate to `http://localhost:8000`

## Usage

1. **Upload a PDF**: 
   - Click the upload area or drag and drop a PDF file
   - The application supports PDF files with layers (Optional Content Groups)

2. **View Layers**:
   - Once loaded, available layers will appear in the left panel
   - If no layers are detected, all content will be treated as a single layer

3. **Select Layers**:
   - Check/uncheck layers to control visibility
   - Use "Select All" or "Select None" for quick selection
   - The preview updates in real-time

4. **Navigate**:
   - Use the navigation controls to browse multi-page documents
   - Adjust zoom level for better viewing

5. **Print**:
   - Click "Print Selected Layers" to print only the visible layers
   - The browser's print dialog will open with the prepared document

## File Structure

```
pdf-layer-printer/
├── index.html          # Main HTML structure
├── styles.css          # Tailwind CSS and custom styles
├── app.js              # Main JavaScript application
└── README.md           # This file
```

## Browser Compatibility

- Chrome/Chromium 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Limitations

- Requires a web server to run (cannot be opened directly as a file)
- PDF files must contain Optional Content Groups (layers) for layer selection
- Print quality depends on the browser's print implementation
- Large PDF files may take longer to process

## Technical Details

### PDF Layer Detection

The application uses PDF.js's `getOptionalContentConfig()` method to detect and manage PDF layers:

```javascript
const optionalContentConfig = await pdfDoc.getOptionalContentConfig();
const groups = optionalContentConfig.getGroups();
```

### Layer Visibility Control

Layer visibility is controlled through PDF.js's optional content configuration:

```javascript
optionalContentConfig.setVisibility(layerGroup, isVisible);
```

### Print Implementation

The print functionality creates a separate canvas with all pages rendered according to the current layer visibility settings, then uses the browser's native print API.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [Mozilla PDF.js](https://mozilla.github.io/pdf.js/) for PDF rendering capabilities
- [Tailwind CSS](https://tailwindcss.com/) for the styling framework
- The PDF specification for Optional Content Groups (layers)
