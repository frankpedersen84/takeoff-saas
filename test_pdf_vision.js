// Test PDF to image conversion
const fs = require('fs').promises;
const path = require('path');
const { createCanvas } = require('canvas');

async function testPdfConversion() {
  try {
    console.log('Loading PDF.js...');
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    console.log('PDF.js loaded successfully');
    
    // Find a PDF file in uploads or use a test
    const uploadsDir = path.join(__dirname, 'uploads');
    let pdfPath = null;
    
    try {
      const files = await fs.readdir(uploadsDir);
      const pdfFile = files.find(f => f.endsWith('.pdf'));
      if (pdfFile) {
        pdfPath = path.join(uploadsDir, pdfFile);
        console.log('Found PDF:', pdfPath);
      }
    } catch (e) {
      console.log('No uploads directory or no PDFs found');
    }
    
    if (!pdfPath) {
      console.log('No PDF to test with. Upload a PDF first.');
      return;
    }
    
    console.log('Reading PDF file...');
    const pdfData = await fs.readFile(pdfPath);
    console.log('PDF size:', pdfData.length, 'bytes');
    
    console.log('Loading PDF document...');
    const pdfDoc = await pdfjs.getDocument({ data: pdfData }).promise;
    console.log('PDF has', pdfDoc.numPages, 'pages');
    
    console.log('Getting page 1...');
    const page = await pdfDoc.getPage(1);
    
    const scale = 2.0;
    const viewport = page.getViewport({ scale });
    console.log('Viewport:', viewport.width, 'x', viewport.height);
    
    console.log('Creating canvas...');
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    console.log('Rendering page to canvas...');
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    console.log('Converting to JPEG...');
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.85 });
    console.log('Image size:', buffer.length, 'bytes');
    
    // Save test image
    const testImagePath = path.join(__dirname, 'test_page.jpg');
    await fs.writeFile(testImagePath, buffer);
    console.log('Saved test image to:', testImagePath);
    
    console.log('\n✅ PDF to image conversion WORKS!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

testPdfConversion();
