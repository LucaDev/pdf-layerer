// Import PDF.js
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

class PDFLayerPrinter {
    constructor() {
        this.pdfDoc = null;
        this.currentPage = 1;
        this.scale = 1;
        this.layers = [];
        this.canvas = document.getElementById('pdf-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.optionalContentConfig = null;
        this.groupsMap = new Map(); // Store original groups by ID
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // File input
        const fileInput = document.getElementById('pdf-input');
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Drag and drop
        const uploadSection = document.getElementById('upload-section');
        uploadSection.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadSection.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadSection.addEventListener('drop', this.handleDrop.bind(this));

        // Navigation buttons
        document.getElementById('prev-page').addEventListener('click', this.prevPage.bind(this));
        document.getElementById('next-page').addEventListener('click', this.nextPage.bind(this));

        // Zoom control
        document.getElementById('zoom-select').addEventListener('change', this.handleZoomChange.bind(this));

        // Layer controls
        document.getElementById('select-all').addEventListener('click', this.selectAllLayers.bind(this));
        document.getElementById('select-none').addEventListener('click', this.selectNoLayers.bind(this));

        // Print button
        document.getElementById('print-btn').addEventListener('click', this.printSelectedLayers.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            this.loadPDF(files[0]);
        } else {
            this.showError('Please drop a valid PDF file.');
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            this.loadPDF(file);
        } else {
            this.showError('Please select a valid PDF file.');
        }
    }

    async loadPDF(file) {
        this.showLoading(true);
        this.hideError();

        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            this.pdfDoc = await loadingTask.promise;

            // Initialize page navigation
            this.currentPage = 1;
            this.updatePageInfo();

            // Extract layers
            await this.extractLayers();

            // Render first page
            await this.renderPage();

            // Show main content
            document.getElementById('upload-section').style.display = 'none';
            document.getElementById('main-content').classList.remove('hidden');

        } catch (error) {
            console.error('Error loading PDF:', error);
            this.showError('Failed to load PDF. Please ensure the file is not corrupted.');
        } finally {
            this.showLoading(false);
        }
    }

    async extractLayers() {
        try {
            console.log('Starting layer extraction...');
            
            // Try to get optional content configuration
            this.optionalContentConfig = await this.pdfDoc.getOptionalContentConfig();
            console.log('Optional content config:', this.optionalContentConfig);
            
            if (this.optionalContentConfig) {
                console.log('Optional content config found');
                console.log('Config properties:', Object.keys(this.optionalContentConfig));
                
                let groups = [];
                let groupsResult = null;
                
                // Method 1: Try getGroups() - handle both array and object returns
                if (typeof this.optionalContentConfig.getGroups === 'function') {
                    try {
                        console.log('Trying getGroups()...');
                        groupsResult = this.optionalContentConfig.getGroups();
                        console.log('getGroups() result:', groupsResult);
                        
                        if (Array.isArray(groupsResult)) {
                            groups = groupsResult;
                            console.log('Found groups via getGroups() (array):', groups.length);
                        } else if (typeof groupsResult === 'object' && groupsResult !== null) {
                            // Handle object with layer IDs as keys
                            groups = Object.values(groupsResult);
                            console.log('Found groups via getGroups() (object):', groups.length);
                            
                            // Store the original groups map for ID lookup
                            this.groupsMap = new Map(Object.entries(groupsResult));
                        }
                    } catch (e) {
                        console.log('getGroups() failed:', e);
                    }
                }
                
                // Method 2: Try accessing groups property directly
                if (groups.length === 0 && this.optionalContentConfig.groups) {
                    console.log('Trying groups property...');
                    if (Array.isArray(this.optionalContentConfig.groups)) {
                        groups = this.optionalContentConfig.groups;
                        console.log('Found groups via groups property (array):', groups.length);
                    } else if (typeof this.optionalContentConfig.groups === 'object') {
                        groups = Object.values(this.optionalContentConfig.groups);
                        this.groupsMap = new Map(Object.entries(this.optionalContentConfig.groups));
                        console.log('Found groups via groups property (object):', groups.length);
                    }
                }
                
                // Method 3: Try _groups property
                if (groups.length === 0 && this.optionalContentConfig._groups) {
                    console.log('Trying _groups property...');
                    if (Array.isArray(this.optionalContentConfig._groups)) {
                        groups = this.optionalContentConfig._groups;
                        console.log('Found groups via _groups property (array):', groups.length);
                    } else if (typeof this.optionalContentConfig._groups === 'object') {
                        groups = Object.values(this.optionalContentConfig._groups);
                        this.groupsMap = new Map(Object.entries(this.optionalContentConfig._groups));
                        console.log('Found groups via _groups property (object):', groups.length);
                    }
                }
                
                // Method 4: Try to access internal structure
                if (groups.length === 0) {
                    console.log('Trying to find groups in internal structure...');
                    // Look for any property that might contain groups
                    for (let prop in this.optionalContentConfig) {
                        const value = this.optionalContentConfig[prop];
                        if (Array.isArray(value) && value.length > 0) {
                            // Check if this looks like a groups array
                            const firstItem = value[0];
                            if (firstItem && (firstItem.name || firstItem.id || firstItem.type)) {
                                console.log(`Found potential groups in property ${prop}:`, value.length);
                                groups = value;
                                break;
                            }
                        } else if (typeof value === 'object' && value !== null) {
                            // Check if this is an object containing groups
                            const keys = Object.keys(value);
                            if (keys.length > 0) {
                                const firstValue = value[keys[0]];
                                if (firstValue && (firstValue.name || firstValue.id || firstValue.type)) {
                                    console.log(`Found potential groups in object property ${prop}:`, keys.length);
                                    groups = Object.values(value);
                                    this.groupsMap = new Map(Object.entries(value));
                                    break;
                                }
                            }
                        }
                    }
                }
                
                console.log('Final groups found:', groups.length);
                console.log('Groups map:', this.groupsMap);
                
                if (groups.length > 0) {
                    console.log('Processing groups...');
                    this.layers = groups.map((group, index) => {
                        console.log(`Group ${index}:`, group);
                        
                        // Find the group ID from the map
                        let groupId = null;
                        for (let [id, groupObj] of this.groupsMap) {
                            if (groupObj === group) {
                                groupId = id;
                                break;
                            }
                        }
                        
                        return {
                            id: group.id || group.name || `layer-${index}`,
                            name: group.name || group.id || `Layer ${index + 1}`,
                            visible: this.optionalContentConfig.isVisible ? this.optionalContentConfig.isVisible(group) : true,
                            group: group,
                            groupId: groupId // Store the ID for setVisibility calls
                        };
                    });
                    console.log('Created layers:', this.layers);
                } else {
                    console.log('No groups found, using default layer');
                    this.layers = [{
                        id: 'default',
                        name: 'All Content',
                        visible: true,
                        group: null,
                        groupId: null
                    }];
                }
            } else {
                console.log('No optional content configuration found');
                this.layers = [{
                    id: 'default',
                    name: 'All Content',
                    visible: true,
                    group: null,
                    groupId: null
                }];
            }

            this.renderLayerControls();
        } catch (error) {
            console.error('Error extracting layers:', error);
            // Fallback to default layer
            this.layers = [{
                id: 'default',
                name: 'All Content',
                visible: true,
                group: null,
                groupId: null
            }];
            this.renderLayerControls();
        }
    }

    renderLayerControls() {
        const layersList = document.getElementById('layers-list');
        layersList.innerHTML = '';

        if (this.layers.length === 0 || (this.layers.length === 1 && this.layers[0].id === 'default')) {
            layersList.innerHTML = `
                <div class="text-sm text-gray-500 text-center py-4">
                    <p>This PDF does not contain layers.</p>
                    <p class="mt-1">All content will be printed.</p>
                </div>
            `;
            return;
        }

        this.layers.forEach(layer => {
            const layerElement = document.createElement('div');
            layerElement.className = 'flex items-center gap-3 p-2 rounded hover:bg-gray-50';
            layerElement.innerHTML = `
                <input type="checkbox" 
                       id="layer-${layer.id}" 
                       class="layer-checkbox" 
                       ${layer.visible ? 'checked' : ''}>
                <label for="layer-${layer.id}" 
                       class="flex-1 text-sm text-gray-700 cursor-pointer">
                    ${this.escapeHtml(layer.name)}
                </label>
            `;

            const checkbox = layerElement.querySelector('input');
            checkbox.addEventListener('change', () => {
                layer.visible = checkbox.checked;
                this.updateLayerVisibility();
                this.renderPage();
            });

            layersList.appendChild(layerElement);
        });
    }

    async updateLayerVisibility() {
        if (!this.optionalContentConfig) return;

        try {
            console.log('Updating layer visibility...');
            this.layers.forEach(layer => {
                if (layer.group && layer.groupId) {
                    console.log(`Setting layer ${layer.name} (ID: ${layer.groupId}) visibility to ${layer.visible}`);
                    try {
                        // Use the group ID string instead of the group object
                        if (typeof this.optionalContentConfig.setVisibility === 'function') {
                            this.optionalContentConfig.setVisibility(layer.groupId, layer.visible);
                        } else if (typeof this.optionalContentConfig.setVisible === 'function') {
                            this.optionalContentConfig.setVisible(layer.groupId, layer.visible);
                        }
                    } catch (e) {
                        console.error(`Error setting visibility for layer ${layer.name}:`, e);
                        // Fallback: try with the group object
                        try {
                            if (typeof this.optionalContentConfig.setVisibility === 'function') {
                                this.optionalContentConfig.setVisibility(layer.group, layer.visible);
                            } else if (typeof this.optionalContentConfig.setVisible === 'function') {
                                this.optionalContentConfig.setVisible(layer.group, layer.visible);
                            }
                        } catch (e2) {
                            console.error(`Fallback also failed for layer ${layer.name}:`, e2);
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error updating layer visibility:', error);
        }
    }

    async renderPage() {
        if (!this.pdfDoc) return;

        try {
            const page = await this.pdfDoc.getPage(this.currentPage);
            const viewport = page.getViewport({ scale: this.scale });

            // Support HiDPI screens
            const outputScale = window.devicePixelRatio || 1;
            this.canvas.width = Math.floor(viewport.width * outputScale);
            this.canvas.height = Math.floor(viewport.height * outputScale);
            this.canvas.style.width = Math.floor(viewport.width) + 'px';
            this.canvas.style.height = Math.floor(viewport.height) + 'px';

            const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

            const renderContext = {
                canvasContext: this.ctx,
                transform: transform,
                viewport: viewport,
                optionalContentConfigPromise: Promise.resolve(this.optionalContentConfig)
            };

            await page.render(renderContext).promise;
        } catch (error) {
            console.error('Error rendering page:', error);
            this.showError('Failed to render PDF page.');
        }
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePageInfo();
            this.renderPage();
        }
    }

    nextPage() {
        if (this.currentPage < this.pdfDoc.numPages) {
            this.currentPage++;
            this.updatePageInfo();
            this.renderPage();
        }
    }

    updatePageInfo() {
        const pageInfo = document.getElementById('page-info');
        pageInfo.textContent = `Page ${this.currentPage} of ${this.pdfDoc ? this.pdfDoc.numPages : 1}`;

        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = !this.pdfDoc || this.currentPage >= this.pdfDoc.numPages;
    }

    handleZoomChange(e) {
        this.scale = parseFloat(e.target.value);
        this.renderPage();
    }

    selectAllLayers() {
        this.layers.forEach(layer => {
            layer.visible = true;
        });
        this.updateLayerCheckboxes();
        this.updateLayerVisibility();
        this.renderPage();
    }

    selectNoLayers() {
        this.layers.forEach(layer => {
            layer.visible = false;
        });
        this.updateLayerCheckboxes();
        this.updateLayerVisibility();
        this.renderPage();
    }

    updateLayerCheckboxes() {
        this.layers.forEach(layer => {
            const checkbox = document.getElementById(`layer-${layer.id}`);
            if (checkbox) {
                checkbox.checked = layer.visible;
            }
        });
    }

    async printSelectedLayers() {
        if (!this.pdfDoc) return;

        try {
            console.log('Starting print process...');
            
            // Ensure layer visibility is set before printing
            await this.updateLayerVisibility();

            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>PDF Print</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 0;
                            background: white;
                        }
                        .page {
                            page-break-after: always;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                        }
                        .page:last-child {
                            page-break-after: avoid;
                        }
                        img {
                            max-width: 100%;
                            max-height: 100vh;
                            object-fit: contain;
                        }
                        @media print {
                            .page {
                                min-height: 100vh;
                                margin: 0;
                                padding: 0;
                            }
                        }
                    </style>
                </head>
                <body>
            `);

            // Render all pages with current layer settings
            for (let pageNum = 1; pageNum <= this.pdfDoc.numPages; pageNum++) {
                console.log(`Rendering page ${pageNum} for print...`);
                
                const page = await this.pdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2 }); // Higher resolution for printing

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                // Ensure we use the same optional content config with current visibility settings
                const renderContext = {
                    canvasContext: ctx,
                    viewport: viewport,
                    optionalContentConfigPromise: Promise.resolve(this.optionalContentConfig)
                };

                await page.render(renderContext).promise;
                
                // Convert canvas to data URL and add to print window
                const dataURL = canvas.toDataURL('image/png');
                printWindow.document.write(`
                    <div class="page">
                        <img src="${dataURL}" alt="Page ${pageNum}" />
                    </div>
                `);
            }

            printWindow.document.write(`
                </body>
                </html>
            `);
            
            printWindow.document.close();
            
            // Wait for images to load, then print
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            };

            console.log('Print window created and populated');

        } catch (error) {
            console.error('Error printing:', error);
            this.showError('Failed to prepare document for printing.');
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');
        errorText.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    hideError() {
        const errorDiv = document.getElementById('error-message');
        errorDiv.classList.add('hidden');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PDFLayerPrinter();
});
