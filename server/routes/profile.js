const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Config file path for persistent storage
const configDir = path.join(__dirname, '../../config');
const configFile = path.join(configDir, 'settings.json');

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Load saved settings from file
function loadSettings() {
  try {
    if (fs.existsSync(configFile)) {
      const data = fs.readFileSync(configFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error('Failed to load settings', { error: error.message });
  }
  return null;
}

// Save settings to file
function saveSettings(settings) {
  try {
    fs.writeFileSync(configFile, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    logger.error('Failed to save settings', { error: error.message });
    return false;
  }
}

// Update environment variable and .env file
function updateApiKey(apiKey) {
  // Update runtime environment
  process.env.ANTHROPIC_API_KEY = apiKey;
  
  // Update .env file for persistence
  const envPath = path.join(__dirname, '../../.env');
  try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Replace or add ANTHROPIC_API_KEY
    if (envContent.includes('ANTHROPIC_API_KEY=')) {
      envContent = envContent.replace(/ANTHROPIC_API_KEY=.*/g, `ANTHROPIC_API_KEY=${apiKey}`);
    } else {
      envContent += `\nANTHROPIC_API_KEY=${apiKey}`;
    }
    
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    return true;
  } catch (error) {
    logger.error('Failed to update .env file', { error: error.message });
    return false;
  }
}

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/logos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, SVG, and WebP are allowed.'));
    }
  }
});

// Load saved settings or use defaults
const savedSettings = loadSettings();

// In-memory storage for profile (replace with database in production)
let companyProfile = savedSettings || {
  id: 'default',
  companyName: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  email: '',
  website: '',
  license: '',
  // Contact person
  contactName: '',
  contactTitle: '',
  contactPhone: '',
  contactEmail: '',
  // Logo
  logoUrl: null,
  logoFilename: null,
  // Branding
  primaryColor: '#FFB81C',
  secondaryColor: '#17B2B2',
  // Default labor rates
  laborRates: {
    projectManager: { base: 50, sell: 110 },
    cadDesign: { base: 40, sell: 90 },
    installer: { base: 40, sell: 95 },
    technician: { base: 45, sell: 105 },
    warehouse: { base: 25, sell: 45 },
    admin: { base: 25, sell: 45 }
  },
  // Default margins by system
  margins: {
    fireAlarm: 35,
    dataCabling: 30,
    cctv: 35,
    accessControl: 35,
    security: 35,
    audioVisual: 30,
    nurseCall: 35,
    twoWay: 30
  },
  // Burden rate (PT&I)
  burdenRate: 55,
  // Tax rate
  taxRate: 8.25,
  // Standard exclusions
  standardExclusions: [
    'Performance and payment bonds',
    'Overtime or shift work premium',
    'Conduit, EMT, stub-ups, and boxes (by Electrical Contractor)',
    'Cable tray and ladder rack (by Electrical Contractor)',
    'Fire stopping and sleeves',
    '120V power to equipment',
    'Phone lines and monitoring services',
    'Plywood backboards and painting',
    'Equipment room HVAC',
    'Telecommunications grounding busbar (TGB/TBB)',
    'Core drilling and concrete cutting',
    'As-built drawings and O&M manuals',
    'Engineering stamps and PE certification'
  ],
  // Standard terms
  paymentTerms: 'Net 30',
  proposalValidity: '30 days',
  warrantyPeriod: '1 year parts and labor',
  updatedAt: new Date().toISOString()
};

// Get company profile
router.get('/', (req, res) => {
  try {
    res.json({ profile: companyProfile });
  } catch (error) {
    logger.error('Get profile error', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// Update company profile
router.put('/', (req, res) => {
  try {
    const allowedFields = [
      'companyName', 'address', 'city', 'state', 'zip', 'phone', 'email', 'website', 'license',
      'contactName', 'contactTitle', 'contactPhone', 'contactEmail',
      'primaryColor', 'secondaryColor',
      'laborRates', 'margins', 'burdenRate', 'taxRate',
      'standardExclusions', 'paymentTerms', 'proposalValidity', 'warrantyPeriod'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        companyProfile[field] = req.body[field];
      }
    });

    companyProfile.updatedAt = new Date().toISOString();

    logger.info('Profile updated', { requestId: req.requestId });
    res.json({ success: true, profile: companyProfile });
  } catch (error) {
    logger.error('Update profile error', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload company logo
router.post('/logo', upload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file provided' });
    }

    // Delete old logo if exists
    if (companyProfile.logoFilename) {
      const oldLogoPath = path.join(uploadsDir, companyProfile.logoFilename);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    companyProfile.logoFilename = req.file.filename;
    companyProfile.logoUrl = `/api/profile/logo/${req.file.filename}`;
    companyProfile.updatedAt = new Date().toISOString();

    logger.info('Logo uploaded', { filename: req.file.filename, requestId: req.requestId });
    res.json({ 
      success: true, 
      logoUrl: companyProfile.logoUrl,
      profile: companyProfile 
    });
  } catch (error) {
    logger.error('Logo upload error', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Serve logo file
router.get('/logo/:filename', (req, res) => {
  try {
    const filePath = path.join(uploadsDir, req.params.filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'Logo not found' });
    }
  } catch (error) {
    logger.error('Serve logo error', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to serve logo' });
  }
});

// Delete logo
router.delete('/logo', (req, res) => {
  try {
    if (companyProfile.logoFilename) {
      const logoPath = path.join(uploadsDir, companyProfile.logoFilename);
      if (fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
      companyProfile.logoFilename = null;
      companyProfile.logoUrl = null;
      companyProfile.updatedAt = new Date().toISOString();
    }

    logger.info('Logo deleted', { requestId: req.requestId });
    res.json({ success: true, profile: companyProfile });
  } catch (error) {
    logger.error('Delete logo error', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to delete logo' });
  }
});

// Get labor rates
router.get('/labor-rates', (req, res) => {
  res.json({ laborRates: companyProfile.laborRates });
});

// Get margins
router.get('/margins', (req, res) => {
  res.json({ margins: companyProfile.margins });
});

// Get API key status (not the actual key for security)
router.get('/api-key-status', (req, res) => {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  const keyPreview = hasKey ? 
    `${process.env.ANTHROPIC_API_KEY.substring(0, 10)}...${process.env.ANTHROPIC_API_KEY.slice(-4)}` : 
    null;
  
  res.json({ 
    configured: hasKey,
    preview: keyPreview
  });
});

// Set API key
router.post('/api-key', (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    if (!apiKey.startsWith('sk-ant-')) {
      return res.status(400).json({ error: 'Invalid API key format. Anthropic keys start with sk-ant-' });
    }
    
    // Update the API key
    const success = updateApiKey(apiKey);
    
    if (success) {
      logger.info('API key updated', { requestId: req.requestId });
      res.json({ 
        success: true, 
        message: 'API key saved successfully',
        preview: `${apiKey.substring(0, 10)}...${apiKey.slice(-4)}`
      });
    } else {
      res.status(500).json({ error: 'Failed to save API key' });
    }
  } catch (error) {
    logger.error('Set API key error', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to set API key' });
  }
});

// Test API key
router.post('/test-api-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const keyToTest = apiKey || process.env.ANTHROPIC_API_KEY;
    
    if (!keyToTest) {
      return res.status(400).json({ error: 'No API key provided or configured' });
    }
    
    // Test the key with a minimal API call
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: keyToTest });
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }]
    });
    
    res.json({ 
      success: true, 
      message: 'API key is valid and working'
    });
  } catch (error) {
    logger.error('Test API key error', { error: error.message, requestId: req.requestId });
    
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limited - but key appears valid' });
    }
    
    res.status(500).json({ error: error.message || 'Failed to test API key' });
  }
});

module.exports = router;
