/**
 * Setup utilities for TakeoffAI
 * Handles automatic dependency installation and system checks
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if canvas module is available
function checkCanvasAvailable() {
  try {
    require('canvas');
    return { available: true, message: 'Canvas module loaded successfully' };
  } catch (e) {
    return { 
      available: false, 
      message: 'Canvas module not available',
      error: e.message 
    };
  }
}

// Check if PDF.js is available
async function checkPdfJsAvailable() {
  try {
    await import('pdfjs-dist/legacy/build/pdf.mjs');
    return { available: true, message: 'PDF.js loaded successfully' };
  } catch (e) {
    return { 
      available: false, 
      message: 'PDF.js not available',
      error: e.message 
    };
  }
}

// Get system info
function getSystemInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cwd: process.cwd()
  };
}

// Check all vision dependencies
async function checkVisionCapabilities() {
  const canvas = checkCanvasAvailable();
  const pdfjs = await checkPdfJsAvailable();
  
  return {
    system: getSystemInfo(),
    canvas,
    pdfjs,
    visionEnabled: canvas.available && pdfjs.available,
    recommendations: getRecommendations(canvas, pdfjs)
  };
}

// Get recommendations based on what's missing
function getRecommendations(canvas, pdfjs) {
  const recommendations = [];
  
  if (!canvas.available) {
    if (process.platform === 'win32') {
      recommendations.push({
        issue: 'Canvas module requires build tools on Windows',
        solutions: [
          'Option 1: Install Windows Build Tools by running as Administrator: npm install --global windows-build-tools',
          'Option 2: Install Visual Studio Build Tools from https://visualstudio.microsoft.com/visual-cpp-build-tools/',
          'Option 3: Use image files (JPG, PNG) directly instead of PDF blueprints'
        ]
      });
    } else if (process.platform === 'darwin') {
      recommendations.push({
        issue: 'Canvas module requires Cairo on macOS',
        solutions: [
          'Install with Homebrew: brew install pkg-config cairo pango libpng jpeg giflib librsvg pixman',
          'Then reinstall canvas: npm rebuild canvas'
        ]
      });
    } else {
      recommendations.push({
        issue: 'Canvas module requires Cairo on Linux',
        solutions: [
          'Ubuntu/Debian: sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev',
          'Then reinstall canvas: npm rebuild canvas'
        ]
      });
    }
  }
  
  if (!pdfjs.available) {
    recommendations.push({
      issue: 'PDF.js not available',
      solutions: [
        'Reinstall: npm install pdfjs-dist'
      ]
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      issue: 'None - all vision capabilities are working!',
      solutions: []
    });
  }
  
  return recommendations;
}

// Try to install canvas with prebuilt binaries
async function tryInstallCanvas() {
  console.log('Attempting to install canvas with prebuilt binaries...');
  
  try {
    // Try installing with prebuild-install which downloads prebuilt binaries
    execSync('npm install canvas --build-from-source=false', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..')
    });
    return { success: true, message: 'Canvas installed successfully' };
  } catch (e) {
    return { 
      success: false, 
      message: 'Could not install canvas automatically',
      error: e.message,
      manualSteps: getRecommendations({ available: false }, { available: true })[0]?.solutions || []
    };
  }
}

module.exports = {
  checkCanvasAvailable,
  checkPdfJsAvailable,
  checkVisionCapabilities,
  getSystemInfo,
  tryInstallCanvas
};
