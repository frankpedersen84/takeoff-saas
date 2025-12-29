const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const { AGENTS } = require('../config/agents');

const router = express.Router();

// Initialize Anthropic client
const getAnthropicClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

// Validate agent ID
const validateAgentId = (agentId) => {
  if (!agentId || !AGENTS[agentId]) {
    return false;
  }
  return true;
};

// Chat with an agent
router.post('/chat', async (req, res) => {
  try {
    const { agentId, message, conversationHistory = [] } = req.body;

    // Validation
    if (!validateAgentId(agentId)) {
      return res.status(400).json({ error: 'Invalid agent ID' });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 50000) {
      return res.status(400).json({ error: 'Message too long (max 50,000 characters)' });
    }

    const agent = AGENTS[agentId];
    const client = getAnthropicClient();

    // Build messages array
    const messages = [
      ...conversationHistory.slice(-20).map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: message.trim() }
    ];

    logger.info('Calling Anthropic API', {
      agentId,
      messageLength: message.length,
      historyLength: conversationHistory.length,
      requestId: req.requestId
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      system: agent.prompt,
      messages
    });

    const assistantMessage = response.content[0]?.text || '';

    logger.info('Anthropic API response received', {
      agentId,
      responseLength: assistantMessage.length,
      requestId: req.requestId
    });

    res.json({
      success: true,
      message: assistantMessage,
      agent: {
        id: agent.id,
        name: agent.name,
        icon: agent.icon
      },
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens
      }
    });

  } catch (error) {
    logger.error('Anthropic API error', {
      error: error.message,
      requestId: req.requestId
    });

    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }
    if (error.status === 400) {
      return res.status(400).json({ error: 'Invalid request to AI service' });
    }

    res.status(500).json({ error: 'Failed to communicate with AI service' });
  }
});

// Analyze project documents
router.post('/analyze', async (req, res) => {
  try {
    const { projectInfo, documentContents, systemsToAnalyze = [] } = req.body;

    if (!documentContents || documentContents.length === 0) {
      return res.status(400).json({ error: 'No document contents provided' });
    }

    const client = getAnthropicClient();
    const orchestrator = AGENTS.orchestrator;

    // Build analysis prompt
    // Build multimodal messages
    const userContent = [];

    // Build analysis prompt
    const analysisPrompt = `
PROJECT INFORMATION:
- Name: ${projectInfo?.name || 'Not specified'}
- Customer: ${projectInfo?.customer || 'Not specified'}
- Location: ${projectInfo?.address || ''} ${projectInfo?.city || ''}
- Due Date: ${projectInfo?.dueDate || 'Not specified'}

DOCUMENT CONTENTS:
${documentContents.map((doc, i) => `
--- Document ${i + 1}: ${doc.filename} ---
${doc.content}
`).join('\n')}

Please analyze these documents and provide:
1. Project summary and scope identification
2. Systems required (Fire Alarm, CCTV, Access Control, Data/Cabling, etc.)
3. Initial device counts and estimates
4. Key requirements and constraints
5. Recommended clarifications and exclusions
`;

    // 1. Add text context first
    userContent.push({
      type: 'text',
      text: analysisPrompt
    });

    // 2. Add images from documents
    let totalImages = 0;
    documentContents.forEach(doc => {
      if (doc.visionData && doc.visionData.pages && doc.visionData.pages.length > 0) {
        doc.visionData.pages.forEach(page => {
          // Safety check for base64
          if (page.base64 && page.base64.length > 100) {
            userContent.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: page.mediaType || 'image/jpeg',
                data: page.base64
              }
            });
            totalImages++;
          }
        });
      }
    });

    logger.info('Starting project analysis', {
      projectName: projectInfo?.name,
      documentCount: documentContents.length,
      imageCount: totalImages,
      requestId: req.requestId
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Explicitly using Sonnet 3.5 for best vision
      max_tokens: 8192,
      system: orchestrator.prompt,
      messages: [{ role: 'user', content: userContent }]
    });

    const analysis = response.content[0]?.text || '';

    res.json({
      success: true,
      analysis,
      projectInfo,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens
      }
    });

  } catch (error) {
    logger.error('Project analysis error', {
      error: error.message,
      requestId: req.requestId
    });
    res.status(500).json({ error: 'Failed to analyze project documents' });
  }
});

// Get available agents
router.get('/agents', (req, res) => {
  const agentList = Object.values(AGENTS).map(agent => ({
    id: agent.id,
    name: agent.name,
    icon: agent.icon,
    color: agent.color,
    description: agent.description,
    specialty: agent.specialty
  }));

  res.json({ agents: agentList });
});

module.exports = router;
