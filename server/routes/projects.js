const express = require('express');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const storage = require('../services/storage');

const router = express.Router();

// Create a new project
router.post('/', async (req, res) => {
  try {
    const { name, customer, address, city, contact, dueDate } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const projectId = uuidv4();
    const project = {
      id: projectId,
      name: name.trim(),
      customer: customer?.trim() || '',
      address: address?.trim() || '',
      city: city?.trim() || '',
      contact: contact?.trim() || '',
      dueDate: dueDate || null,
      status: 'draft',
      systems: [],
      documents: [],
      analysis: null,
      estimates: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const savedProject = await storage.createProject(project);

    logger.info('Project created', { projectId, name: project.name, requestId: req.requestId });

    res.status(201).json({ success: true, project: savedProject });
  } catch (error) {
    logger.error('Create project error', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get all projects
router.get('/', async (req, res) => {
  try {
    const projectList = await storage.getAllProjects();
    res.json({ projects: projectList });
  } catch (error) {
    logger.error('Get projects error', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to retrieve projects' });
  }
});

// Get a specific project
router.get('/:id', async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    logger.error('Get project error', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to retrieve project' });
  }
});

// Update a project
router.put('/:id', async (req, res) => {
  try {
    const existing = await storage.getProject(req.params.id);

    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const allowedUpdates = ['name', 'customer', 'address', 'city', 'contact', 'dueDate', 'status', 'systems', 'documents', 'analysis', 'estimates', 'markups', 'outputs'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedProject = await storage.updateProject(req.params.id, updates);

    logger.info('Project updated', { projectId: req.params.id, requestId: req.requestId });

    res.json({ success: true, project: updatedProject });
  } catch (error) {
    logger.error('Update project error', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete a project
router.delete('/:id', async (req, res) => {
  try {
    const success = await storage.deleteProject(req.params.id);

    if (!success) {
      return res.status(404).json({ error: 'Project not found' });
    }

    logger.info('Project deleted', { projectId: req.params.id, requestId: req.requestId });

    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    logger.error('Delete project error', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Add documents to a project
router.post('/:id/documents', async (req, res) => {
  try {
    const { documents } = req.body;

    if (!Array.isArray(documents)) {
      return res.status(400).json({ error: 'Documents must be an array' });
    }

    // In a real implementation with Supabase, we'd handle the 'addDocuments' logic inside storage service
    // which might insert rows into a 'documents' table.
    // For now, our storage.addDocuments handles both.
    const updated = await storage.addDocuments(req.params.id, documents);

    res.json({ success: true, project: updated });
  } catch (error) {
    logger.error('Add documents error', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to add documents' });
  }
});

// Save system estimates to a project
// Note: This route might need specific logic in StorageService if estimates move to their own table
// For now, we update the project object directly.
router.post('/:id/estimates', async (req, res) => {
  try {
    const { systemId, estimate } = req.body;

    if (!systemId || !estimate) {
      return res.status(400).json({ error: 'System ID and estimate are required' });
    }

    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const currentEstimates = project.estimates || {};
    const updates = {
      estimates: {
        ...currentEstimates,
        [systemId]: {
          ...estimate,
          updatedAt: new Date().toISOString()
        }
      }
    };

    const updatedProject = await storage.updateProject(req.params.id, updates);

    res.json({ success: true, project: updatedProject });
  } catch (error) {
    logger.error('Save estimate error', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to save estimate' });
  }
});

module.exports = router;
