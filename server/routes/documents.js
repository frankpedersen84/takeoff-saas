const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const pdfParse = require('pdf-parse');
const xlsx = require('xlsx');
const sharp = require('sharp');
const logger = require('../utils/logger');

// Polyfill DOMMatrix for pdfjs-dist (required for Node.js environment)
try {
  const canvas = require('canvas');
  if (canvas && canvas.DOMMatrix) {
    global.DOMMatrix = canvas.DOMMatrix;
  }
} catch (e) {
  // Ignore if canvas is missing (handler below covers it)
}

// Try to load canvas (may fail on some systems without build tools)
let createCanvas;
let canvasAvailable = false;
try {
  const canvasModule = require('canvas');
  createCanvas = canvasModule.createCanvas;
  canvasAvailable = true;
  logger.info('Canvas module loaded successfully - PDF vision enabled');
} catch (e) {
  logger.warn('Canvas module not available - PDF vision will be limited. This is OK for text-based documents.');
}

// Import pdf-to-img for PDF to image conversion (pure JS, no system dependencies!)
let pdfToImg;
async function getPdfToImg() {
  if (!pdfToImg) {
    const module = await import('pdf-to-img');
    pdfToImg = module.pdf;
  }
  return pdfToImg;
}

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff'
  ];

  const allowedExtensions = ['.pdf', '.xlsx', '.xls', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024,
    files: parseInt(process.env.MAX_FILES_PER_UPLOAD) || 10
  }
});

// Check if file is likely a blueprint/floor plan based on name
function isLikelyBlueprint(filename) {
  const lowerName = filename.toLowerCase();

  // Common blueprint keywords
  const blueprintKeywords = [
    'floor', 'plan', 'blueprint', 'drawing', 'drwg', 'layout', 'elevation',
    'section', 'detail', 'sheet', 'dwg', 'arch', 'mep', 'elec', 'technology',
    'reflected', 'ceiling', 'rcp', 'site', 'civil', 'structural',
    'mechanical', 'plumbing', 'fire', 'life safety', 'security', 'magnolia'
  ];

  // Sheet number patterns like A0.01, E-101, M1.1, etc.
  const sheetPatterns = [
    /^a\d/i,      // A0, A1, A2...
    /^e\d/i,      // E1, E2...
    /^m\d/i,      // M1, M2...
    /^p\d/i,      // P1, P2...
    /^s\d/i,      // S1, S2...
    /^fp\d/i,     // FP1...
    /^fa\d/i,     // FA1...
    /^ls\d/i,     // LS1...
    /[aemps]-?\d+\.\d+/i,  // A0.01, E-1.01, etc.
  ];

  // Check keywords
  if (blueprintKeywords.some(kw => lowerName.includes(kw))) {
    return true;
  }

  // Check sheet patterns
  if (sheetPatterns.some(pattern => pattern.test(lowerName))) {
    return true;
  }

  return false;
}

// Custom canvas factory for PDF.js with node-canvas
class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  }

  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

// Convert PDF pages to images for vision analysis using pdf-to-img
async function convertPdfToImages(filePath, maxPages = 10) {
  try {
    const pdf = await getPdfToImg();
    if (!pdf) {
      console.log('[VISION] pdf-to-img not available - skipping PDF to image conversion');
      return [];
    }

    const images = [];
    let pageNum = 0;

    console.log(`[VISION] Converting PDF: ${path.basename(filePath)}`);

    // pdf-to-img returns an async iterator of PNG buffers
    for await (const pageBuffer of await pdf(filePath, { scale: 1.5 })) {
      pageNum++;
      if (pageNum > maxPages) break;

      try {
        // Convert PNG to JPEG and resize if needed
        let buffer = await sharp(pageBuffer)
          .jpeg({ quality: 85 })
          .toBuffer();

        // Resize if too large for Claude vision (max ~4MB)
        if (buffer.length > 4 * 1024 * 1024) {
          buffer = await sharp(buffer)
            .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
        }

        const base64 = buffer.toString('base64');

        images.push({
          page: pageNum,
          base64,
          mediaType: 'image/jpeg',
          filename: `page-${pageNum}.jpg`
        });

        console.log(`[VISION] Converted page ${pageNum} (${Math.round(buffer.length / 1024)}KB)`);

      } catch (pageError) {
        console.error(`[VISION] Failed to convert page ${pageNum}:`, pageError.message);
      }
    }

    console.log(`[VISION] Converted ${images.length} pages total`);
    return images;
  } catch (error) {
    console.error('[VISION] PDF conversion error:', error.message);
    return [];
  }
}

// Convert image file to base64 for vision
async function processImageForVision(filePath) {
  try {
    const stats = await fs.stat(filePath);
    let finalPath = filePath;

    // Resize if too large
    if (stats.size > 4 * 1024 * 1024) {
      const ext = path.extname(filePath).toLowerCase();
      const resizedPath = filePath.replace(new RegExp(`${ext}$`), '_resized.jpg');
      await sharp(filePath)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(resizedPath);
      finalPath = resizedPath;
    }

    const buffer = await fs.readFile(finalPath);
    const base64 = buffer.toString('base64');

    // Determine media type
    const ext = path.extname(filePath).toLowerCase();
    const mediaTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    return {
      base64,
      mediaType: mediaTypes[ext] || 'image/jpeg'
    };
  } catch (error) {
    logger.error('Image processing error', { error: error.message, filePath });
    return null;
  }
}

// Extract text from PDF
async function extractPdfText(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    logger.error('PDF extraction error', { error: error.message, filePath });
    throw new Error('Failed to extract text from PDF');
  }
}

// Extract text from Excel
async function extractExcelText(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    let text = '';

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const csv = xlsx.utils.sheet_to_csv(sheet);
      text += `\n--- Sheet: ${sheetName} ---\n${csv}`;
    });

    return text;
  } catch (error) {
    logger.error('Excel extraction error', { error: error.message, filePath });
    throw new Error('Failed to extract text from Excel file');
  }
}

// Extract text from plain text/doc files
async function extractTextFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    logger.error('Text extraction error', { error: error.message, filePath });
    throw new Error('Failed to read text file');
  }
}

// Process uploaded file and extract content
async function processFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  let content = '';
  let visionData = null;
  let isBlueprint = false;

  try {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif'];

    // Check if this is likely a blueprint
    isBlueprint = isLikelyBlueprint(file.originalname);

    switch (ext) {
      case '.pdf':
        // Extract text content
        content = await extractPdfText(file.path);

        // ALWAYS try to convert PDFs to images for vision analysis
        // This enables vision for all PDFs - users can analyze any document visually
        console.log(`[VISION] Processing PDF: ${file.originalname}, isBlueprint=${isBlueprint}`);

        try {
          const images = await convertPdfToImages(file.path);
          console.log(`[VISION] Converted ${images.length} pages from ${file.originalname}`);

          if (images.length > 0) {
            visionData = {
              type: 'pdf_pages',
              pageCount: images.length,
              pages: images
            };
            // Mark as blueprint if detected or if we got vision data
            isBlueprint = isBlueprint || true;
          }
        } catch (conversionError) {
          console.error(`[VISION] PDF conversion failed for ${file.originalname}:`, conversionError.message);
        }
        break;

      case '.xlsx':
      case '.xls':
        content = await extractExcelText(file.path);
        break;

      case '.txt':
        content = await extractTextFile(file.path);
        break;

      case '.doc':
      case '.docx':
        content = '[Word document - text extraction requires additional processing]';
        break;

      default:
        // Check if it's an image file
        if (imageExtensions.includes(ext)) {
          const imageData = await processImageForVision(file.path);
          if (imageData) {
            visionData = {
              type: 'image',
              pageCount: 1,
              pages: [{
                page: 1,
                base64: imageData.base64,
                mediaType: imageData.mediaType,
                filename: file.originalname
              }]
            };
            isBlueprint = true;
            content = '[Image file - ready for vision analysis]';
          }
        } else {
          content = '[Unsupported file format]';
        }
    }

    // Log extraction results for debugging
    logger.info('File content extracted', {
      filename: file.originalname,
      contentLength: content?.length || 0,
      hasVisionData: !!visionData,
      visionPages: visionData?.pageCount || 0,
      isBlueprint,
      preview: content?.substring(0, 200) || '[empty]'
    });

    // Clean up uploaded file after processing
    await fs.unlink(file.path).catch(() => { });

    return {
      filename: file.originalname,
      size: file.size,
      type: ext,
      content: content.substring(0, 100000), // Limit content size
      visionData, // Include vision data if available
      isBlueprint, // Flag for UI to know this can be visually analyzed
      extractedAt: new Date().toISOString()
    };
  } catch (error) {
    // Clean up on error
    await fs.unlink(file.path).catch(() => { });
    throw error;
  }
}

// Upload and process documents
router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    logger.info('Processing uploaded files', {
      fileCount: req.files.length,
      requestId: req.requestId
    });

    const results = await Promise.all(
      req.files.map(async (file) => {
        try {
          const result = await processFile(file);
          // Log vision data status for debugging
          console.log(`[VISION DEBUG] ${file.originalname}: hasVisionData=${!!result.visionData}, pages=${result.visionData?.pageCount || 0}, isBlueprint=${result.isBlueprint}`);
          return result;
        } catch (error) {
          console.error(`[VISION DEBUG] ${file.originalname}: ERROR - ${error.message}`);
          return {
            filename: file.originalname,
            error: error.message
          };
        }
      })
    );

    const successful = results.filter(r => !r.error);
    const failed = results.filter(r => r.error);

    // Log summary
    console.log(`[VISION DEBUG] Upload complete: ${successful.length} successful, ${failed.length} failed`);
    successful.forEach(doc => {
      console.log(`[VISION DEBUG] - ${doc.filename}: visionData=${!!doc.visionData}`);
    });

    res.json({
      success: true,
      processed: successful.length,
      failed: failed.length,
      documents: successful,
      errors: failed
    });

  } catch (error) {
    logger.error('File upload error', {
      error: error.message,
      requestId: req.requestId
    });

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }

    res.status(500).json({ error: 'Failed to process uploaded files' });
  }
});

// Multer error handling
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
    return res.status(400).json({ error: error.message });
  }
  next(error);
});

module.exports = router;
