const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const logger = require('../utils/logger');
const { AGENTS } = require('../config/agents');

const router = express.Router();

// Configure multer for image/PDF uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/vision');
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

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for images
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'), false);
    }
  }
});

// Initialize Anthropic client
const getAnthropicClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

// Convert image to base64
async function imageToBase64(filePath) {
  const buffer = await fs.readFile(filePath);
  return buffer.toString('base64');
}

// Get media type from file extension
function getMediaType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return types[ext] || 'image/jpeg';
}

// Resize image if too large (Claude has limits)
async function prepareImage(filePath) {
  const stats = await fs.stat(filePath);
  const maxSize = 5 * 1024 * 1024; // 5MB max for Claude vision

  if (stats.size > maxSize) {
    // Resize the image
    const resizedPath = filePath.replace(/(\.[^.]+)$/, '_resized$1');
    await sharp(filePath)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(resizedPath);

    // Clean up original
    await fs.unlink(filePath).catch(() => { });
    return resizedPath;
  }

  return filePath;
}

// Analyze floor plan image with Claude Vision
router.post('/analyze-floorplan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const { analysisType = 'full', systemFocus = 'all' } = req.body;

    logger.info('Analyzing floor plan', {
      filename: req.file.originalname,
      size: req.file.size,
      analysisType,
      systemFocus,
      requestId: req.requestId
    });

    // Prepare image
    let imagePath = req.file.path;

    // If PDF, we need to convert first page to image
    if (req.file.mimetype === 'application/pdf') {
      // For now, return error - PDF conversion requires poppler binaries
      await fs.unlink(imagePath).catch(() => { });
      return res.status(400).json({
        error: 'PDF upload not yet supported for vision. Please export floor plan pages as PNG or JPG images.',
        suggestion: 'Most PDF viewers allow you to export individual pages as images.'
      });
    }

    // Resize if needed
    imagePath = await prepareImage(imagePath);

    // Convert to base64
    const imageBase64 = await imageToBase64(imagePath);
    const mediaType = getMediaType(imagePath);

    // Clean up file
    await fs.unlink(imagePath).catch(() => { });

    // Get the Blueprint Vision Agent prompt
    const agent = AGENTS.blueprintVision;

    // Build analysis prompt based on type
    let analysisPrompt = '';

    switch (analysisType) {
      case 'count':
        analysisPrompt = `Analyze this floor plan and provide a detailed DEVICE COUNT for all low-voltage systems visible.

Focus on counting:
- Fire alarm devices (smoke detectors, heat detectors, pull stations, horn/strobes, speakers)
- Security devices (cameras, motion sensors, door contacts)
- Access control (card readers, REX devices)
- Data/telecom (data outlets, phone outlets, WAPs)
- Other low-voltage devices

Provide counts organized by:
1. Device type
2. Room/area location
3. Total quantities

Be specific about what symbols you see and how you're identifying each device type.`;
        break;

      case 'cable':
        analysisPrompt = `Analyze this floor plan and provide CABLE RUN ESTIMATES for all low-voltage systems.

For each system, calculate:
1. Identify the scale of the drawing (look for scale notation or estimate from door widths)
2. Locate the MDF/IDF/TR (telecom room) locations
3. Measure/estimate distances from each device to the nearest TR
4. Calculate total cable footage needed

Provide:
- Device-by-device cable run estimates
- Total footage by cable type
- Recommended cable quantities (add 15% waste factor)
- Pathway recommendations (ceiling type, conduit needs)`;
        break;

      case 'pathway':
        analysisPrompt = `Analyze this floor plan for PATHWAY AND INFRASTRUCTURE requirements.

Identify and document:
1. Ceiling types (drop ceiling, hard lid, open structure)
2. Existing conduit runs visible
3. Cable tray locations
4. Rated walls and barriers requiring firestopping
5. Recommended J-hook/support spacing
6. Vertical pathway needs (risers, sleeves)
7. Equipment room locations and sizes

Provide recommendations for:
- Cable tray sizing and routing
- Conduit requirements
- Firestop locations
- Support hardware quantities`;
        break;

      default: // 'full'
        analysisPrompt = `Perform a COMPREHENSIVE ANALYSIS of this floor plan for low-voltage system estimation.

Provide a complete takeoff including:

1. **DRAWING INFORMATION**
   - Scale (if visible) or estimated scale
   - Floor/level identification
   - Total square footage estimate
   - Building type and occupancy

2. **DEVICE COUNTS** (by room/area)
   - Fire alarm devices
   - Security/CCTV devices
   - Access control devices
   - Data/voice outlets
   - Other low-voltage devices

3. **CABLE RUN ESTIMATES**
   - Identify TR/IDF locations
   - Calculate average run lengths
   - Total footage by cable type
   - Include 15% waste factor

4. **PATHWAY ANALYSIS**
   - Ceiling types
   - Conduit requirements
   - Cable tray needs
   - Support hardware

5. **LABOR ESTIMATES**
   - Installation hours by task
   - Crew size recommendations

6. **NOTES & CLARIFICATIONS**
   - Items requiring RFI
   - Assumptions made
   - Areas with unclear details`;
    }

    // Add system focus if specified
    if (systemFocus !== 'all') {
      analysisPrompt += `\n\nFOCUS SPECIFICALLY ON: ${systemFocus} system components and requirements.`;
    }

    // Call Claude Vision API
    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      system: agent.prompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64
              }
            },
            {
              type: 'text',
              text: analysisPrompt
            }
          ]
        }
      ]
    });

    const analysis = response.content[0]?.text || '';

    logger.info('Floor plan analysis complete', {
      analysisLength: analysis.length,
      requestId: req.requestId
    });

    res.json({
      success: true,
      analysis,
      filename: req.file.originalname,
      analysisType,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens
      }
    });

  } catch (error) {
    logger.error('Floor plan analysis error', {
      error: error.message,
      requestId: req.requestId
    });

    // Clean up file on error
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => { });
    }

    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    res.status(500).json({ error: 'Failed to analyze floor plan: ' + error.message });
  }
});

// Analyze multiple floor plan images
router.post('/analyze-multiple', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    logger.info('Analyzing multiple floor plans', {
      fileCount: req.files.length,
      requestId: req.requestId
    });

    const client = getAnthropicClient();
    const agent = AGENTS.blueprintVision;

    // Build content array with all images
    const content = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];

      // Skip PDFs for now
      if (file.mimetype === 'application/pdf') {
        await fs.unlink(file.path).catch(() => { });
        continue;
      }

      let imagePath = await prepareImage(file.path);
      const imageBase64 = await imageToBase64(imagePath);
      const mediaType = getMediaType(imagePath);

      // Clean up
      await fs.unlink(imagePath).catch(() => { });

      content.push({
        type: 'text',
        text: `\n--- FLOOR PLAN ${i + 1}: ${file.originalname} ---\n`
      });

      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: imageBase64
        }
      });
    }

    if (content.length === 0) {
      return res.status(400).json({ error: 'No valid images to analyze' });
    }

    // Add analysis prompt
    content.push({
      type: 'text',
      text: `Analyze ALL of the floor plans shown above and provide a CONSOLIDATED TAKEOFF.

For each floor/drawing:
1. Identify the floor level
2. Count all devices by type
3. Estimate cable runs to TR locations
4. Note pathway requirements

Then provide:
- COMBINED device totals across all floors
- TOTAL cable footage by type
- COMPLETE material list
- TOTAL labor hours
- Riser/backbone requirements between floors

Format as a professional takeoff document ready for pricing.`
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      system: agent.prompt,
      messages: [{ role: 'user', content }]
    });

    const analysis = response.content[0]?.text || '';

    res.json({
      success: true,
      analysis,
      filesAnalyzed: req.files.length,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens
      }
    });

  } catch (error) {
    logger.error('Multiple floor plan analysis error', {
      error: error.message,
      requestId: req.requestId
    });

    // Clean up files
    for (const file of (req.files || [])) {
      await fs.unlink(file.path).catch(() => { });
    }

    res.status(500).json({ error: 'Failed to analyze floor plans: ' + error.message });
  }
});

module.exports = router;
