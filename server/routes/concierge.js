const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const archiver = require('archiver');
const sharp = require('sharp'); // For image processing and grid overlay
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
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

// Intent classification categories
const INTENT_CATEGORIES = {
  GREETING: 'greeting',
  PROJECT_QUESTION: 'project_question',
  SYSTEM_SPECIFIC: 'system_specific',
  GENERATE_OUTPUT: 'generate_output',
  PRICING_QUESTION: 'pricing_question',
  CODE_COMPLIANCE: 'code_compliance',
  GENERAL_HELP: 'general_help',
  CLARIFICATION: 'clarification'
};

// Map intents to agents
const INTENT_AGENT_MAP = {
  fireAlarm: ['fire alarm', 'smoke detector', 'pull station', 'horn strobe', 'nfpa 72', 'facp', 'notification', 'duct detector', 'heat detector', 'fire panel'],
  dataCabling: ['data', 'cabling', 'cat6', 'fiber', 'network', 'ethernet', 'patch panel', 'rack', 'idf', 'mdf', 'wifi', 'access point', 'wap'],
  cctv: ['camera', 'cctv', 'surveillance', 'nvr', 'video', 'ptz', 'security camera', 'recording', 'vms'],
  accessControl: ['access control', 'card reader', 'door', 'credential', 'badge', 'mag lock', 'electric strike', 'rex', 'entry'],
  security: ['intrusion', 'alarm', 'motion sensor', 'glass break', 'security system', 'monitoring', 'burglar'],
  audioVisual: ['audio', 'speaker', 'av', 'display', 'projector', 'conference', 'sound', 'paging'],
  twoWay: ['area of refuge', 'aor', 'elevator phone', 'emergency communication', 'two-way', '2-way'],
  nurseCall: ['nurse call', 'patient', 'hospital', 'healthcare', 'pillow speaker', 'dome light'],
  proposal: ['proposal', 'quote', 'bid', 'pricing', 'estimate'],
  budget: ['budget', 'cost', 'margin', 'markup', 'labor rate', 'pricing calculation'],
  blueprintVision: ['floor plan', 'blueprint', 'drawing', 'plan analysis', 'device count']
};

// Output types that can be generated (keyed by lowercase id for easy lookup)
const OUTPUT_TYPES = {
  proposal: {
    id: 'proposal',
    name: 'Professional Proposal',
    description: 'Client-ready proposal with scope, pricing, and terms',
    icon: '📋',
    agentId: 'proposal'
  },
  bom: {
    id: 'bom',
    name: 'Bill of Materials',
    description: 'Detailed material list with part numbers and quantities',
    icon: '📦',
    agentId: 'orchestrator'
  },
  labor: {
    id: 'labor',
    name: 'Labor Estimate',
    description: 'Detailed labor breakdown by task and phase',
    icon: '⏱️',
    agentId: 'budget'
  },
  schedule: {
    id: 'schedule',
    name: 'Project Schedule',
    description: 'Installation timeline with milestones',
    icon: '📅',
    agentId: 'orchestrator'
  },
  submittal: {
    id: 'submittal',
    name: 'Submittal Package',
    description: 'Equipment cut sheets and specifications',
    icon: '📑',
    agentId: 'orchestrator'
  },
  scope: {
    id: 'scope',
    name: 'Scope Narrative',
    description: 'Detailed scope of work description',
    icon: '📝',
    agentId: 'proposal'
  },
  exclusions: {
    id: 'exclusions',
    name: 'Clarifications & Exclusions',
    description: 'What\'s included and excluded from scope',
    icon: '⚠️',
    agentId: 'proposal'
  },
  system_summary: {
    id: 'system_summary',
    name: 'System Summary',
    description: 'Overview of all systems with key metrics',
    icon: '📊',
    agentId: 'orchestrator'
  },
  rfi: {
    id: 'rfi',
    name: 'Request for Information',
    description: 'Intelligent questions for customer clarification',
    icon: '❓',
    agentId: 'rfi'
  },
  device_count: {
    id: 'device_count',
    name: 'Device Count (Vision)',
    description: 'Count devices from floor plan images',
    icon: '📐',
    agentId: 'blueprintVision',
    requiresVision: true,
    analysisType: 'count'
  },
  cable_estimate: {
    id: 'cable_estimate',
    name: 'Cable Estimate (Vision)',
    description: 'Estimate cable runs from floor plans',
    icon: '🔌',
    agentId: 'blueprintVision',
    requiresVision: true,
    analysisType: 'cable'
  },
  // === EPIC NEW OUTPUTS ===
  pm_handoff: {
    id: 'pm_handoff',
    name: 'PM Handoff Package',
    description: 'Complete project manager handoff with scope, risks, and milestones',
    icon: '📋',
    agentId: 'orchestrator',
    category: 'management'
  },
  executive_summary: {
    id: 'executive_summary',
    name: 'Executive Summary',
    description: 'One-page stakeholder overview with key metrics',
    icon: '📊',
    agentId: 'proposal',
    category: 'management'
  },
  work_packets: {
    id: 'work_packets',
    name: 'Installation Work Packets',
    description: 'Per-area work packets for field technicians',
    icon: '🔧',
    agentId: 'blueprintVision',
    requiresVision: true,
    analysisType: 'work_packets',
    category: 'field'
  },
  device_matrix: {
    id: 'device_matrix',
    name: 'Device Location Matrix',
    description: 'Spreadsheet-ready device list by room/area',
    icon: '📍',
    agentId: 'blueprintVision',
    requiresVision: true,
    analysisType: 'device_matrix',
    category: 'field'
  },
  commissioning: {
    id: 'commissioning',
    name: 'Commissioning Checklist',
    description: 'System-by-system testing and verification checklist',
    icon: '✅',
    agentId: 'orchestrator',
    category: 'field'
  },
  safety_plan: {
    id: 'safety_plan',
    name: 'Site Safety Plan',
    description: 'Job site safety requirements and protocols',
    icon: '🦺',
    agentId: 'orchestrator',
    category: 'field'
  },
  punch_list: {
    id: 'punch_list',
    name: 'Punch List Template',
    description: 'Pre-formatted punch list organized by system and area',
    icon: '📝',
    agentId: 'orchestrator',
    category: 'closeout'
  },
  closeout_package: {
    id: 'closeout_package',
    name: 'Closeout Documentation',
    description: 'As-built documentation and warranty info package',
    icon: '📁',
    agentId: 'orchestrator',
    category: 'closeout'
  },
  training_outline: {
    id: 'training_outline',
    name: 'Training Outline',
    description: 'End-user training curriculum for installed systems',
    icon: '🎓',
    agentId: 'orchestrator',
    category: 'closeout'
  },
  change_order: {
    id: 'change_order',
    name: 'Change Order Template',
    description: 'Pre-filled change order with scope and pricing',
    icon: '📄',
    agentId: 'budget',
    category: 'management'
  }
};

// Concierge system prompt
const CONCIERGE_PROMPT = `You are the TakeoffAI Concierge - a friendly, expert assistant for low-voltage system estimating and design. You help users navigate their projects with ease, hiding complexity while delivering professional results.

PERSONALITY:
- Warm, professional, and confident
- Explain technical concepts in simple terms
- Proactively suggest helpful actions
- Never make users feel lost or overwhelmed

CAPABILITIES:
You can help with:
1. Analyzing project documents (plans, specs, RFPs)
2. Designing systems: Fire Alarm, CCTV, Access Control, Data/Cabling, Security, Audio/Visual, Nurse Call, 2-Way Communications
3. Generating estimates, proposals, and material lists
4. Answering code compliance questions (NFPA, NEC, ADA, IBC)
5. Calculating labor hours and pricing
6. Creating BOMs with detailed device specifications
7. Comparing manufacturers (Axis vs Pelco, Honeywell vs Notifier, etc.)

DOCUMENT CREATION:
When the user asks you to create a document, BOM, comparison, or any deliverable:
1. First discuss and refine their requirements
2. When they're ready, create the document with full detail
3. Include a special marker at the END of your response when you've created a saveable document:

[SAVEABLE_DOCUMENT]
{
  "title": "Document Title",
  "type": "bom|comparison|analysis|proposal|spec|custom",
  "content": "The full document content in markdown format"
}
[/SAVEABLE_DOCUMENT]

BOM REQUIREMENTS:
When creating Bills of Materials, ALWAYS include for each device:
- Manufacturer and full model number (e.g., "Axis Q6135-LE PTZ Network Camera")
- Part number / SKU
- Brief description of key features
- Resolution, lens, or technical specs where applicable
- Unit price estimate (if known)
- Quantity needed
- Extended price
- Notes on installation requirements

MANUFACTURER KNOWLEDGE:
You have deep knowledge of these manufacturers and their product lines:
- CCTV: Axis, Pelco, Hanwha/Samsung, Hikvision, Dahua, Bosch, Avigilon, Verkada
- Fire Alarm: Notifier, EST/Edwards, Simplex, Siemens, Honeywell, Hochiki, Potter
- Access Control: HID, LenelS2, Genetec, Brivo, Openpath, Paxton, Salto
- Intrusion: DSC, Honeywell, Bosch, DMP, Napco
- Intercom: Aiphone, 2N, Doorbird, Akuvox, Commend
- Nurse Call: Rauland, TekTone, Jeron, Critical Alert, Hill-Rom

RESPONSE FORMAT:
- Keep responses concise but complete
- Use bullet points for lists
- Bold important numbers and recommendations
- Always end with a suggested next action or question

WHEN ANALYZING PROJECTS:
- Identify all systems in scope
- Note key quantities and requirements
- Flag potential issues or missing information
- Suggest clarifications needed

Remember: The user may not be technical. Make everything easy to understand while maintaining professional accuracy.`;

// Classify user intent
function classifyIntent(message) {
  const lowerMessage = message.toLowerCase();

  // Check for greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|howdy)\b/i.test(lowerMessage)) {
    return { category: INTENT_CATEGORIES.GREETING, agents: ['orchestrator'] };
  }

  // Check for output generation requests
  const outputKeywords = ['generate', 'create', 'make', 'produce', 'export', 'download'];
  const outputTypes = ['proposal', 'quote', 'bid', 'bom', 'bill of materials', 'schedule', 'estimate', 'submittal'];
  if (outputKeywords.some(k => lowerMessage.includes(k)) && outputTypes.some(t => lowerMessage.includes(t))) {
    return { category: INTENT_CATEGORIES.GENERATE_OUTPUT, agents: ['proposal', 'budget'] };
  }

  // Check for system-specific questions
  const detectedAgents = [];
  for (const [agentId, keywords] of Object.entries(INTENT_AGENT_MAP)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      detectedAgents.push(agentId);
    }
  }

  if (detectedAgents.length > 0) {
    return { category: INTENT_CATEGORIES.SYSTEM_SPECIFIC, agents: detectedAgents };
  }

  // Check for pricing questions
  if (/price|cost|budget|how much|total|margin|markup/i.test(lowerMessage)) {
    return { category: INTENT_CATEGORIES.PRICING_QUESTION, agents: ['budget'] };
  }

  // Check for code compliance
  if (/code|nfpa|nec|ada|ibc|compliance|requirement|standard/i.test(lowerMessage)) {
    return { category: INTENT_CATEGORIES.CODE_COMPLIANCE, agents: ['orchestrator'] };
  }

  // Default to general help
  return { category: INTENT_CATEGORIES.GENERAL_HELP, agents: ['orchestrator'] };
}

// Build context from project data
function buildProjectContext(project, documents) {
  let context = '';

  if (project) {
    context += `\n**CURRENT PROJECT:**\n`;
    context += `- Name: ${project.name || 'Unnamed'}\n`;
    context += `- Customer: ${project.customer || 'Not specified'}\n`;
    context += `- Location: ${project.address || ''} ${project.city || ''}\n`;
    context += `- Due Date: ${project.dueDate || 'Not specified'}\n`;
    context += `- Status: ${project.status || 'draft'}\n`;

    if (project.systems && project.systems.length > 0) {
      context += `- Systems in scope: ${project.systems.join(', ')}\n`;
    }

    if (project.analysis) {
      context += `\n**PROJECT ANALYSIS:**\n${project.analysis.substring(0, 3000)}\n`;
    }

    if (project.estimates && Object.keys(project.estimates).length > 0) {
      context += `\n**CURRENT ESTIMATES:**\n`;
      for (const [system, estimate] of Object.entries(project.estimates)) {
        context += `- ${system}: $${estimate.total?.toLocaleString() || 'TBD'}\n`;
      }
    }
  }

  if (documents && documents.length > 0) {
    context += `\n**UPLOADED DOCUMENTS (${documents.length}):**\n`;
    documents.forEach((doc, i) => {
      context += `\n--- Document ${i + 1}: ${doc.filename} ---\n`;
      context += (doc.content || '[No content extracted]').substring(0, 2000);
      if (doc.content?.length > 2000) {
        context += '\n[... content truncated ...]';
      }
      context += '\n';
    });
  }

  return context;
}

// Main chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [], project, documents, companyProfile, knowledgeBase } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 50000) {
      return res.status(400).json({ error: 'Message too long (max 50,000 characters)' });
    }

    const client = getAnthropicClient();

    // Classify intent
    const intent = classifyIntent(message);

    // Build system prompt with context
    let systemPrompt = CONCIERGE_PROMPT;

    // Add company context if available
    if (companyProfile?.companyName) {
      systemPrompt += `\n\nYou are representing ${companyProfile.companyName}.`;
    }

    // =========================================================================
    // DEEP RESEARCH KNOWLEDGE BASE - Comprehensive project understanding
    // =========================================================================
    if (knowledgeBase && knowledgeBase.confidence) {
      systemPrompt += `\n\n=== DEEP RESEARCH KNOWLEDGE BASE (Confidence: ${knowledgeBase.confidence.toUpperCase()}) ===\n`;

      // Project info from research
      if (knowledgeBase.projectInfo) {
        const pi = knowledgeBase.projectInfo;
        systemPrompt += `\n**PROJECT DETAILS:**\n`;
        if (pi.name) systemPrompt += `- Project: ${pi.name}\n`;
        if (pi.address) systemPrompt += `- Address: ${pi.address}\n`;
        if (pi.buildingType) systemPrompt += `- Building Type: ${pi.buildingType}\n`;
        if (pi.squareFootage) systemPrompt += `- Square Footage: ${pi.squareFootage}\n`;
      }

      // Blueprint knowledge
      if (knowledgeBase.blueprints?.analyzed) {
        const bp = knowledgeBase.blueprints;
        systemPrompt += `\n**BLUEPRINT ANALYSIS:**\n`;
        systemPrompt += `- Pages Analyzed: ${bp.totalPages}\n`;
        systemPrompt += `- Total Devices Found: ${bp.allDevices?.length || 0}\n`;
        systemPrompt += `- Panels: ${bp.panels?.length || 0}\n`;
        systemPrompt += `- Rooms Identified: ${bp.roomList?.length || 0}\n`;

        if (bp.scale) systemPrompt += `- Scale: ${bp.scale}\n`;

        if (bp.devicesBySystem && Object.keys(bp.devicesBySystem).length > 0) {
          systemPrompt += `\n**DEVICE COUNTS BY SYSTEM:**\n`;
          Object.entries(bp.devicesBySystem).forEach(([system, count]) => {
            systemPrompt += `- ${system.replace('_', ' ')}: ${count}\n`;
          });
        }

        if (bp.devicesByFloor && Object.keys(bp.devicesByFloor).length > 0) {
          systemPrompt += `\n**DEVICES BY FLOOR:**\n`;
          Object.entries(bp.devicesByFloor).forEach(([floor, systems]) => {
            const total = Object.values(systems).reduce((a, b) => a + b, 0);
            systemPrompt += `- ${floor}: ${total} devices\n`;
          });
        }

        if (bp.legend?.legendFound && bp.legend.symbols?.length > 0) {
          systemPrompt += `\n**SYMBOL LEGEND (${bp.legend.symbols.length} symbols):**\n`;
          bp.legend.symbols.slice(0, 20).forEach(s => {
            systemPrompt += `- ${s.abbreviation || s.symbol}: ${s.meaning} (${s.system})\n`;
          });
        }
      }

      // Specification knowledge
      if (knowledgeBase.specifications?.analyzed) {
        const spec = knowledgeBase.specifications;
        systemPrompt += `\n**SPECIFICATION REQUIREMENTS:**\n`;

        if (spec.systems) {
          Object.entries(spec.systems).forEach(([system, info]) => {
            if (info?.required) {
              systemPrompt += `\n[${system.replace('_', ' ').toUpperCase()}]\n`;
              if (info.description) systemPrompt += `${info.description.substring(0, 200)}\n`;
              if (info.deviceTypes?.length) systemPrompt += `Devices: ${info.deviceTypes.join(', ')}\n`;
            }
          });
        }

        if (spec.approvedManufacturers && Object.keys(spec.approvedManufacturers).length > 0) {
          systemPrompt += `\n**APPROVED MANUFACTURERS:**\n`;
          Object.entries(spec.approvedManufacturers).forEach(([system, mfrs]) => {
            if (mfrs?.length) systemPrompt += `- ${system}: ${mfrs.join(', ')}\n`;
          });
        }

        if (spec.specialRequirements?.length > 0) {
          systemPrompt += `\n**SPECIAL REQUIREMENTS:**\n`;
          spec.specialRequirements.slice(0, 10).forEach(req => {
            systemPrompt += `- ${req}\n`;
          });
        }
      }

      // Contract knowledge
      if (knowledgeBase.contract?.analyzed) {
        const contract = knowledgeBase.contract;
        systemPrompt += `\n**CONTRACT/RFP REQUIREMENTS:**\n`;
        if (contract.bidDueDate) systemPrompt += `- Bid Due: ${contract.bidDueDate}\n`;
        if (contract.liquidatedDamages) systemPrompt += `- Liquidated Damages: ${contract.liquidatedDamages}\n`;
        if (contract.scope?.length) {
          systemPrompt += `- Scope Items: ${contract.scope.length}\n`;
        }
      }

      systemPrompt += `\n=== END KNOWLEDGE BASE ===\n`;
    }

    // Build project context (legacy - for projects without deep research)
    const projectContext = buildProjectContext(project, documents);
    if (projectContext && !knowledgeBase) {
      systemPrompt += `\n\n${projectContext}`;
    }

    // Add specialist knowledge based on detected intent
    if (intent.agents.length > 0 && intent.category === INTENT_CATEGORIES.SYSTEM_SPECIFIC) {
      // If we have agent-specific knowledge from deep research, include it
      if (knowledgeBase?.agentKnowledge) {
        intent.agents.forEach(agentId => {
          const agentKey = agentId === 'dataCabling' ? 'dataCabling' :
            agentId === 'fireAlarm' ? 'fire_alarm' :
              agentId === 'accessControl' ? 'access_control' :
                agentId === 'audioVisual' ? 'av' : agentId;

          const agentData = knowledgeBase.agentKnowledge[agentKey] || knowledgeBase.agentKnowledge[agentId];
          if (agentData) {
            systemPrompt += `\n\n[DEEP RESEARCH - ${agentId.toUpperCase()} SPECIFIC DATA]:\n`;
            systemPrompt += `- Device Count: ${agentData.deviceCount}\n`;
            if (agentData.panels?.length) {
              systemPrompt += `- Panels: ${agentData.panels.map(p => p.label || p.type).join(', ')}\n`;
            }
            if (agentData.approvedManufacturers?.length) {
              systemPrompt += `- Approved Manufacturers: ${agentData.approvedManufacturers.join(', ')}\n`;
            }
            if (agentData.devicesByFloor && Object.keys(agentData.devicesByFloor).length > 0) {
              systemPrompt += `- By Floor: ${Object.entries(agentData.devicesByFloor).map(([f, c]) => `${f}: ${c}`).join(', ')}\n`;
            }
          }
        });
      }

      const specialistPrompts = intent.agents
        .filter(agentId => AGENTS[agentId])
        .map(agentId => `\n[${AGENTS[agentId].name} Knowledge]:\n${AGENTS[agentId].prompt.substring(0, 1500)}`)
        .join('\n');

      if (specialistPrompts) {
        systemPrompt += `\n\nFor this question, draw on your specialist knowledge:\n${specialistPrompts}`;
      }
    }

    // Build messages array
    const messages = [
      ...conversationHistory.slice(-20).map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: message.trim() }
    ];

    logger.info('Concierge chat request', {
      intent: intent.category,
      detectedAgents: intent.agents,
      messageLength: message.length,
      requestId: req.requestId
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      messages
    });

    const assistantMessage = response.content[0]?.text || '';

    // Check for saveable document in response
    let saveableDocument = null;
    let cleanMessage = assistantMessage;

    const docMatch = assistantMessage.match(/\[SAVEABLE_DOCUMENT\]\s*([\s\S]*?)\s*\[\/SAVEABLE_DOCUMENT\]/);
    if (docMatch) {
      try {
        // Extract and parse the document JSON
        const docJson = docMatch[1].trim();
        saveableDocument = JSON.parse(docJson);
        saveableDocument.id = `chat_doc_${Date.now()}`;
        saveableDocument.createdAt = new Date().toISOString();

        // Remove the marker from the displayed message but keep the content visible
        cleanMessage = assistantMessage.replace(/\[SAVEABLE_DOCUMENT\][\s\S]*?\[\/SAVEABLE_DOCUMENT\]/, '').trim();

        logger.info('Saveable document detected', {
          title: saveableDocument.title,
          type: saveableDocument.type,
          requestId: req.requestId
        });
      } catch (parseError) {
        logger.error('Failed to parse saveable document', { error: parseError.message });
      }
    }

    // Determine suggested actions based on context
    const suggestedActions = getSuggestedActions(intent, project, assistantMessage);

    // Add save document action if we have a saveable document
    if (saveableDocument) {
      suggestedActions.unshift({
        id: 'save_document',
        label: `Save "${saveableDocument.title}"`,
        icon: '💾',
        type: 'save_document',
        document: saveableDocument
      });
    }

    logger.info('Concierge response sent', {
      responseLength: assistantMessage.length,
      suggestedActions: suggestedActions.length,
      hasSaveableDocument: !!saveableDocument,
      requestId: req.requestId
    });

    res.json({
      success: true,
      message: cleanMessage,
      intent: intent.category,
      detectedAgents: intent.agents,
      suggestedActions,
      saveableDocument,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens
      }
    });

  } catch (error) {
    logger.error('Concierge chat error', {
      error: error.message,
      requestId: req.requestId
    });

    // Check for billing/credit issues
    if (error.message?.includes('credit balance') || error.status === 400) {
      return res.status(402).json({
        error: 'API credits exhausted. Please add credits to your Anthropic account at console.anthropic.com',
        code: 'INSUFFICIENT_CREDITS'
      });
    }
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    res.status(500).json({ error: 'Failed to process your request: ' + error.message });
  }
});

// Get suggested actions based on context
function getSuggestedActions(intent, project, response) {
  const actions = [];

  // Always suggest outputs if project has analysis
  if (project?.analysis) {
    actions.push({
      id: 'generate_proposal',
      label: 'Generate Proposal',
      icon: '📋',
      type: 'output',
      outputType: 'proposal'
    });
    actions.push({
      id: 'generate_bom',
      label: 'Create BOM',
      icon: '📦',
      type: 'output',
      outputType: 'bom'
    });
  }

  // Suggest analysis if documents exist but no analysis
  if (project?.documents?.length > 0 && !project?.analysis) {
    actions.push({
      id: 'analyze_project',
      label: 'Analyze Documents',
      icon: '🔍',
      type: 'action',
      action: 'analyze'
    });
  }

  // System-specific suggestions
  if (intent.category === INTENT_CATEGORIES.SYSTEM_SPECIFIC) {
    intent.agents.forEach(agentId => {
      const agent = AGENTS[agentId];
      if (agent) {
        actions.push({
          id: `detail_${agentId}`,
          label: `${agent.name} Details`,
          icon: agent.icon,
          type: 'specialist',
          agentId
        });
      }
    });
  }

  // Limit to 4 actions
  return actions.slice(0, 4);
}

// Get available output types
router.get('/outputs', (req, res) => {
  res.json({ outputs: Object.values(OUTPUT_TYPES) });
});

// Generate specific output
router.post('/generate-output', async (req, res) => {
  try {
    const { outputType, project, documents, companyProfile } = req.body;

    if (!outputType || !OUTPUT_TYPES[outputType.toLowerCase()]) {
      return res.status(400).json({ error: 'Invalid output type' });
    }

    if (!project) {
      return res.status(400).json({ error: 'Project data is required' });
    }

    const client = getAnthropicClient();
    const output = OUTPUT_TYPES[outputType.toLowerCase()];
    const agent = AGENTS[output.agentId] || AGENTS.orchestrator;

    // Handle vision-based outputs differently
    if (output.requiresVision) {
      // Filter documents that have vision data
      const blueprintDocs = (documents || []).filter(doc => doc.visionData && doc.visionData.pages?.length > 0);

      if (blueprintDocs.length === 0) {
        return res.status(400).json({
          error: 'No blueprint images found',
          suggestion: 'Upload PDF floor plans or image files (JPG, PNG) of your blueprints first'
        });
      }

      // Build content array with all images
      const content = [];
      let totalPages = 0;

      for (const doc of blueprintDocs) {
        for (const page of doc.visionData.pages) {
          if (totalPages >= 20) break;

          content.push({
            type: 'text',
            text: `\n--- ${doc.filename} (Page ${page.page}) ---\n`
          });

          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: page.mediaType,
              data: page.base64
            }
          });

          totalPages++;
        }
      }

      // Build analysis prompt based on type
      let analysisPrompt = '';

      if (output.analysisType === 'count') {
        analysisPrompt = `Analyze these floor plans and provide a detailed DEVICE COUNT for all low-voltage systems visible.

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
      } else if (output.analysisType === 'cable') {
        analysisPrompt = `Analyze these floor plans and provide CABLE RUN ESTIMATES for all low-voltage systems.

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
      } else if (output.analysisType === 'work_packets') {
        analysisPrompt = `Create INSTALLATION WORK PACKETS for field technicians based on these floor plans.

For each floor/area, create a work packet that includes:

1. **AREA IDENTIFICATION**
   - Floor/wing/zone name
   - Room numbers covered
   - Square footage estimate

2. **DEVICE INSTALLATION LIST**
   For each device in this area:
   - Device type and model (if visible)
   - Exact location (room, wall, ceiling)
   - Mounting height requirements
   - Backbox/mounting requirements

3. **CABLE REQUIREMENTS**
   - Cable types needed (Cat6, coax, fire alarm, etc.)
   - Estimated lengths per device
   - Home run destination (TR/MDF/FACP)
   - Pathway notes (ceiling type, conduit, J-hooks)

4. **MATERIALS CHECKLIST**
   - Devices needed for this area
   - Cable quantities
   - Mounting hardware
   - Labels/identifiers

5. **INSTALLATION SEQUENCE**
   - Recommended order of operations
   - Dependencies (rough-in before drywall, etc.)
   - Coordination notes with other trades

Format each work packet as a standalone document a technician can take to the field.`;
      } else if (output.analysisType === 'device_matrix') {
        analysisPrompt = `Create a DEVICE LOCATION MATRIX from these floor plans in a spreadsheet-ready format.

Generate a table with these columns:
| Device ID | Device Type | System | Floor | Room/Area | Location Detail | Cable Type | Home Run | Panel/Port | Notes |

For each device visible on the plans:
1. Assign a unique Device ID (e.g., CAM-001, SD-001, DR-001)
2. Identify the device type
3. Categorize by system (Security, Fire Alarm, Access Control, Data, AV)
4. Note the floor level
5. Identify room number or area name
6. Describe specific location (N wall, ceiling center, etc.)
7. Specify required cable type
8. Identify home run destination
9. Note panel and port assignment if determinable
10. Add any special notes

Format as a clean table that can be copied into Excel or Google Sheets.
Include summary counts at the bottom by system and by floor.`;
      }

      // Add project context
      if (project?.name) {
        analysisPrompt = `Project: ${project.name}\n${project.customer ? `Customer: ${project.customer}\n` : ''}${project.address ? `Location: ${project.address}\n` : ''}\n\n${analysisPrompt}`;
      }

      content.push({
        type: 'text',
        text: analysisPrompt
      });

      logger.info('Generating vision output', {
        outputType,
        documentCount: blueprintDocs.length,
        totalPages,
        requestId: req.requestId
      });

      const response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8192,
        system: agent.prompt,
        messages: [{ role: 'user', content }]
      });

      const responseContent = response.content[0]?.text || '';

      return res.json({
        success: true,
        output: {
          type: output.id,
          name: output.name,
          content: responseContent,
          generatedAt: new Date().toISOString(),
          pagesAnalyzed: totalPages
        },
        usage: {
          inputTokens: response.usage?.input_tokens,
          outputTokens: response.usage?.output_tokens
        }
      });
    }

    // Standard text-based output generation
    let prompt = `Generate a ${output.name} for this project.\n\n`;
    prompt += buildProjectContext(project, documents);

    if (companyProfile) {
      prompt += `\n**COMPANY INFORMATION:**\n`;
      prompt += `- Company: ${companyProfile.companyName || 'TBD'}\n`;
      prompt += `- Address: ${companyProfile.address || ''} ${companyProfile.city || ''}, ${companyProfile.state || ''} ${companyProfile.zip || ''}\n`;
      prompt += `- Phone: ${companyProfile.phone || ''}\n`;
      prompt += `- Email: ${companyProfile.email || ''}\n`;
      prompt += `- Contact: ${companyProfile.contactName || ''}, ${companyProfile.contactTitle || ''}\n`;
      prompt += `- License: ${companyProfile.license || ''}\n`;
      prompt += `- Payment Terms: ${companyProfile.paymentTerms || 'Net 30'}\n`;
      prompt += `- Warranty: ${companyProfile.warrantyPeriod || '1 year'}\n`;

      if (companyProfile.standardExclusions?.length > 0) {
        prompt += `\n**STANDARD EXCLUSIONS:**\n`;
        companyProfile.standardExclusions.forEach(exc => {
          prompt += `- ${exc}\n`;
        });
      }
    }

    prompt += `\n\nGenerate a professional, complete ${output.name}. Format it clearly with sections and be specific with quantities and pricing.`;

    logger.info('Generating output', {
      outputType,
      projectName: project.name,
      requestId: req.requestId
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      system: agent.prompt,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0]?.text || '';

    res.json({
      success: true,
      output: {
        type: output.id,
        name: output.name,
        content,
        generatedAt: new Date().toISOString()
      },
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens
      }
    });

  } catch (error) {
    logger.error('Generate output error', {
      error: error.message,
      stack: error.stack,
      status: error.status,
      requestId: req.requestId
    });

    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    res.status(500).json({ error: 'Failed to generate output: ' + error.message });
  }
});

// Helper function to convert markdown to docx paragraphs
function markdownToDocx(content) {
  const paragraphs = [];
  const lines = content.split('\n');

  for (const line of lines) {
    if (!line.trim()) {
      paragraphs.push(new Paragraph({ text: '' }));
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        text: line.replace('### ', ''),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 }
      }));
    } else if (line.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        text: line.replace('## ', ''),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 }
      }));
    } else if (line.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        text: line.replace('# ', ''),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }));
    } else if (line.startsWith('**') && line.endsWith('**')) {
      // Bold line
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/\*\*/g, ''), bold: true })],
        spacing: { before: 100, after: 50 }
      }));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Bullet point
      paragraphs.push(new Paragraph({
        text: line.substring(2),
        bullet: { level: 0 },
        spacing: { before: 50, after: 50 }
      }));
    } else if (line.match(/^\d+\.\s/)) {
      // Numbered list
      paragraphs.push(new Paragraph({
        text: line.replace(/^\d+\.\s/, ''),
        numbering: { reference: 'default-numbering', level: 0 },
        spacing: { before: 50, after: 50 }
      }));
    } else {
      // Regular paragraph - handle inline bold
      const parts = line.split(/(\*\*[^*]+\*\*)/);
      const children = parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return new TextRun({ text: part.replace(/\*\*/g, ''), bold: true });
        }
        return new TextRun({ text: part });
      });
      paragraphs.push(new Paragraph({ children, spacing: { before: 50, after: 50 } }));
    }
  }

  return paragraphs;
}

// Generate all outputs and return as ZIP
router.post('/export-all', async (req, res) => {
  try {
    const { project, documents, companyProfile, outputTypes: requestedTypes } = req.body;

    if (!project) {
      return res.status(400).json({ error: 'Project data is required' });
    }

    const client = getAnthropicClient();

    // Determine which outputs to generate
    const hasBlueprints = (documents || []).some(doc => doc.visionData?.pages?.length > 0);

    // Default output types to generate (non-vision ones, plus vision if blueprints available)
    const outputsToGenerate = requestedTypes || [
      'proposal', 'bom', 'labor', 'schedule', 'scope', 'exclusions',
      'pm_handoff', 'executive_summary', 'commissioning',
      ...(hasBlueprints ? ['device_count', 'cable_estimate', 'device_matrix'] : [])
    ];

    logger.info('Starting export all', {
      projectName: project.name,
      outputCount: outputsToGenerate.length,
      hasBlueprints,
      requestId: req.requestId
    });

    // Generate each output
    const generatedOutputs = [];
    const errors = [];

    for (const outputType of outputsToGenerate) {
      const output = OUTPUT_TYPES[outputType];
      if (!output) {
        errors.push({ type: outputType, error: 'Unknown output type' });
        continue;
      }

      // Skip vision outputs if no blueprints
      if (output.requiresVision && !hasBlueprints) {
        continue;
      }

      try {
        logger.info(`Generating ${output.name}...`, { requestId: req.requestId });

        let content = '';
        const agent = AGENTS[output.agentId] || AGENTS.orchestrator;

        if (output.requiresVision) {
          // Vision-based output
          const blueprintDocs = documents.filter(doc => doc.visionData?.pages?.length > 0);
          const messageContent = [];
          let totalPages = 0;

          for (const doc of blueprintDocs) {
            for (const page of doc.visionData.pages) {
              if (totalPages >= 10) break; // Limit pages for export
              messageContent.push({
                type: 'image',
                source: { type: 'base64', media_type: page.mediaType, data: page.base64 }
              });
              totalPages++;
            }
          }

          // Build analysis prompt
          let analysisPrompt = `Project: ${project.name}\n\n`;
          if (output.analysisType === 'count') {
            analysisPrompt += 'Analyze these floor plans and provide a detailed DEVICE COUNT for all low-voltage systems.';
          } else if (output.analysisType === 'cable') {
            analysisPrompt += 'Analyze these floor plans and provide CABLE RUN ESTIMATES.';
          } else if (output.analysisType === 'device_matrix') {
            analysisPrompt += 'Create a DEVICE LOCATION MATRIX from these floor plans.';
          }

          messageContent.push({ type: 'text', text: analysisPrompt });

          const response = await client.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            system: agent.prompt,
            messages: [{ role: 'user', content: messageContent }]
          });
          content = response.content[0]?.text || '';
        } else {
          // Text-based output
          let prompt = `Generate a ${output.name} for this project.\n\n`;
          prompt += buildProjectContext(project, documents);

          if (companyProfile) {
            prompt += `\n**COMPANY:** ${companyProfile.companyName || 'TBD'}\n`;
          }
          prompt += `\n\nGenerate a professional, complete ${output.name}.`;

          const response = await client.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            system: agent.prompt,
            messages: [{ role: 'user', content: prompt }]
          });
          content = response.content[0]?.text || '';
        }

        generatedOutputs.push({
          type: outputType,
          name: output.name,
          content,
          icon: output.icon
        });

      } catch (outputError) {
        logger.error(`Failed to generate ${outputType}`, { error: outputError.message });
        errors.push({ type: outputType, error: outputError.message });
      }
    }

    // Create ZIP file with Word documents
    const sanitizedName = project.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedName}_Project_Package.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    // Add each output as a Word document
    for (const output of generatedOutputs) {
      const doc = new Document({
        numbering: {
          config: [{
            reference: 'default-numbering',
            levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: 'start' }]
          }]
        },
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: output.name,
              heading: HeadingLevel.TITLE,
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Project: ${project.name}`, italics: true }),
              ],
              spacing: { after: 400 }
            }),
            ...markdownToDocx(output.content)
          ]
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      const fileName = `${output.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_')}.docx`;
      archive.append(buffer, { name: fileName });
    }

    // Add a summary text file
    const summaryContent = `
${project.name} - Project Package
Generated: ${new Date().toLocaleString()}
=====================================

This package contains ${generatedOutputs.length} documents:

${generatedOutputs.map((o, i) => `${i + 1}. ${o.name}`).join('\n')}

${errors.length > 0 ? `\nErrors (${errors.length}):\n${errors.map(e => `- ${e.type}: ${e.error}`).join('\n')}` : ''}

Generated by TakeoffAI
    `.trim();

    archive.append(summaryContent, { name: '_README.txt' });

    await archive.finalize();

    logger.info('Export complete', {
      projectName: project.name,
      documentsGenerated: generatedOutputs.length,
      errors: errors.length,
      requestId: req.requestId
    });

  } catch (error) {
    logger.error('Export all error', { error: error.message, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to export project package' });
  }
});

// Extract project info from documents
router.post('/extract-project-info', async (req, res) => {
  try {
    const { documents } = req.body;

    if (!documents || documents.length === 0) {
      return res.status(400).json({ error: 'No documents provided' });
    }

    const client = getAnthropicClient();
    const agent = AGENTS.documentAnalyzer;

    // Build extraction prompt
    let prompt = `Analyze the following document(s) and extract project information.\n\n`;

    documents.forEach((doc, i) => {
      prompt += `--- Document ${i + 1}: ${doc.filename} ---\n`;
      prompt += (doc.content || '[No content]').substring(0, 10000);
      prompt += '\n\n';
    });

    prompt += `\nExtract all project information you can find and return ONLY a valid JSON object as specified in your instructions.`;

    logger.info('Extracting project info from documents', {
      documentCount: documents.length,
      requestId: req.requestId
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: agent.prompt,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = response.content[0]?.text || '{}';

    // Parse JSON from response
    let extractedInfo;
    try {
      // Try to find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedInfo = JSON.parse(jsonMatch[0]);
      } else {
        extractedInfo = JSON.parse(responseText);
      }
    } catch (parseError) {
      logger.error('Failed to parse extracted info', {
        error: parseError.message,
        responseText: responseText.substring(0, 500),
        requestId: req.requestId
      });
      extractedInfo = {
        projectName: null,
        customer: null,
        address: null,
        city: null,
        state: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        dueDate: null,
        projectType: null,
        buildingType: null,
        squareFootage: null,
        floors: null,
        systemsInScope: [],
        notes: 'Could not parse document content automatically',
        confidence: 'low'
      };
    }

    res.json({
      success: true,
      extractedInfo,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens
      }
    });

  } catch (error) {
    logger.error('Extract project info error', {
      error: error.message,
      requestId: req.requestId
    });

    // Check for billing/credit issues
    if (error.message?.includes('credit balance') || error.status === 400) {
      return res.status(402).json({
        error: 'API credits exhausted. Please add credits to your Anthropic account.',
        code: 'INSUFFICIENT_CREDITS'
      });
    }
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    res.status(500).json({ error: 'Failed to extract project information: ' + error.message });
  }
});

// Analyze blueprints/floor plans with vision
router.post('/analyze-blueprints', async (req, res) => {
  try {
    const { documents, project, analysisType = 'full' } = req.body;

    // Filter documents that have vision data
    const blueprintDocs = (documents || []).filter(doc => doc.visionData && doc.visionData.pages?.length > 0);

    if (blueprintDocs.length === 0) {
      return res.status(400).json({
        error: 'No blueprint images found',
        suggestion: 'Upload PDF floor plans or image files (JPG, PNG) of your blueprints'
      });
    }

    const client = getAnthropicClient();
    const agent = AGENTS.blueprintVision;

    // Build content array with all images
    const content = [];
    let totalPages = 0;

    for (const doc of blueprintDocs) {
      for (const page of doc.visionData.pages) {
        if (totalPages >= 20) break; // Limit to 20 pages total

        content.push({
          type: 'text',
          text: `\n--- ${doc.filename} (Page ${page.page}) ---\n`
        });

        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: page.mediaType,
            data: page.base64
          }
        });

        totalPages++;
      }
    }

    // Build analysis prompt based on type
    let analysisPrompt = '';

    switch (analysisType) {
      case 'count':
        analysisPrompt = `Analyze these floor plans and provide a detailed DEVICE COUNT for all low-voltage systems visible.

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
        analysisPrompt = `Analyze these floor plans and provide CABLE RUN ESTIMATES for all low-voltage systems.

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

      default: // 'full'
        analysisPrompt = `Perform a COMPREHENSIVE ANALYSIS of these floor plans for low-voltage system estimation.

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

    // Add project context if available
    if (project?.name) {
      analysisPrompt = `Project: ${project.name}\n${project.customer ? `Customer: ${project.customer}\n` : ''}${project.address ? `Location: ${project.address}\n` : ''}\n\n${analysisPrompt}`;
    }

    content.push({
      type: 'text',
      text: analysisPrompt
    });

    logger.info('Analyzing blueprints with vision', {
      documentCount: blueprintDocs.length,
      totalPages,
      analysisType,
      requestId: req.requestId
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
      documentsAnalyzed: blueprintDocs.length,
      pagesAnalyzed: totalPages,
      analysisType,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens
      }
    });

  } catch (error) {
    logger.error('Blueprint analysis error', {
      error: error.message,
      requestId: req.requestId
    });

    // Check for billing/credit issues
    if (error.message?.includes('credit balance') || error.status === 400) {
      return res.status(402).json({
        error: 'API credits exhausted. Please add credits to your Anthropic account at console.anthropic.com',
        code: 'INSUFFICIENT_CREDITS'
      });
    }
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    res.status(500).json({ error: 'Failed to analyze blueprints: ' + error.message });
  }
});

// =============================================================================
// DEEP RESEARCH SYSTEM - Comprehensive Project Intelligence
// =============================================================================
// This system performs thorough analysis of ALL project documents:
// 1. Blueprints - extracts legend, devices, rooms, panels from every page
// 2. Specifications - extracts requirements, standards, approved products
// 3. RFPs/Contracts - extracts scope, deadlines, special requirements
// 4. Builds a unified knowledge base that ALL agents can access
// =============================================================================

router.post('/deep-research', async (req, res) => {
  try {
    const { documents, projectId, projectName = 'Project', companyProfile } = req.body;

    if (!documents || documents.length === 0) {
      return res.status(400).json({
        error: 'No documents provided',
        suggestion: 'Upload blueprints, specifications, or other project documents first'
      });
    }

    const client = getAnthropicClient();

    logger.info('Starting Deep Research analysis', {
      projectName,
      documentCount: documents.length,
      requestId: req.requestId
    });

    // Categorize documents
    const blueprintDocs = documents.filter(doc => doc.visionData?.pages?.length > 0);
    const specDocs = documents.filter(doc =>
      doc.content && doc.content.length > 500 &&
      (doc.filename?.toLowerCase().includes('spec') ||
        doc.content?.toLowerCase().includes('division') ||
        doc.content?.toLowerCase().includes('section'))
    );
    const rfpDocs = documents.filter(doc =>
      doc.content &&
      (doc.filename?.toLowerCase().includes('rfp') ||
        doc.filename?.toLowerCase().includes('bid') ||
        doc.content?.toLowerCase().includes('request for proposal'))
    );
    const otherDocs = documents.filter(doc =>
      doc.content && doc.content.length > 200 &&
      !specDocs.includes(doc) && !rfpDocs.includes(doc) && !blueprintDocs.includes(doc)
    );

    // Initialize knowledge base
    const knowledgeBase = {
      projectId,
      projectName,
      researchedAt: new Date().toISOString(),
      confidence: 'building',

      // Project Overview
      projectInfo: {
        name: projectName,
        address: null,
        buildingType: null,
        squareFootage: null,
        floors: null,
        occupancyType: null
      },

      // Blueprint Knowledge
      blueprints: {
        analyzed: false,
        totalPages: 0,
        legend: null,
        scale: null,
        sheetIndex: [],
        panels: [],
        allDevices: [],
        devicesBySystem: {},
        devicesByFloor: {},
        roomList: [],
        cablePathways: []
      },

      // Specification Knowledge
      specifications: {
        analyzed: false,
        systems: {},
        approvedManufacturers: {},
        codeRequirements: [],
        testingRequirements: [],
        submittals: [],
        warranties: []
      },

      // RFP/Contract Knowledge
      contract: {
        analyzed: false,
        scope: [],
        exclusions: [],
        deadlines: [],
        specialRequirements: [],
        liquidatedDamages: null,
        bondRequirements: null
      },

      // Cross-Reference Analysis
      crossReference: {
        specToDrawingMatches: [],
        missingFromSpecs: [],
        missingFromDrawings: [],
        conflicts: [],
        questions: []
      },

      // Agent-Specific Knowledge Packets
      agentKnowledge: {
        fireAlarm: null,
        security: null,
        accessControl: null,
        dataCabling: null,
        audioVisual: null,
        nurseCall: null
      }
    };

    // =========================================================================
    // PHASE 1: BLUEPRINT DEEP ANALYSIS
    // =========================================================================
    if (blueprintDocs.length > 0) {
      logger.info('Phase 1: Analyzing blueprints', { count: blueprintDocs.length });

      // Step 1A: Extract legend from first pages
      const legendContent = [];
      for (const doc of blueprintDocs) {
        for (const page of doc.visionData.pages.slice(0, 4)) {
          legendContent.push({
            type: 'text',
            text: `--- ${doc.filename} (Page ${page.page}) ---`
          });
          legendContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: page.mediaType,
              data: page.base64
            }
          });
        }
      }

      legendContent.push({
        type: 'text',
        text: `DEEP RESEARCH TASK - LEGEND EXTRACTION

You are performing deep research on a set of construction blueprints.
Your goal is to extract EVERY piece of information from the legend/symbol key.

ANALYZE THOROUGHLY:
1. Find ALL symbol legends on these pages
2. Extract EVERY symbol definition - don't miss any
3. Note the drawing scale
4. Extract project information from title blocks
5. List all sheet numbers/names visible
6. Identify the drawing discipline (fire alarm, security, electrical, etc.)

Return comprehensive JSON:
{
  "legendFound": true/false,
  "legendPages": [page numbers where legend was found],
  "symbols": [
    {
      "symbol": "visual description",
      "abbreviation": "SD, CAM, CR, etc.",
      "meaning": "full device name",
      "system": "fire_alarm|security|access_control|data|av|nurse_call|electrical|mechanical",
      "deviceCategory": "detector|notification|initiating|control|reader|camera|sensor|outlet|panel",
      "cableType": "18-2|18-4|cat6|fiber|coax|composite|shielded",
      "notes": "any additional notes about this device"
    }
  ],
  "scale": "1/8 inch = 1 foot" or similar,
  "projectInfo": {
    "projectName": "from title block",
    "projectNumber": "if visible",
    "address": "full address if visible",
    "architect": "architect name",
    "engineer": "engineer name",
    "date": "drawing date",
    "revision": "revision number"
  },
  "sheetIndex": [
    {"sheetNumber": "E1.1", "sheetName": "First Floor Fire Alarm Plan", "discipline": "fire_alarm"}
  ],
  "generalNotes": ["list all general notes visible on the drawings"],
  "codeReferences": ["NFPA 72", "IBC 2021", etc. - any codes referenced]
}

Be THOROUGH. This information will be used by all other analysis systems.`
      });

      try {
        const legendResponse = await client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 8192,
          messages: [{ role: 'user', content: legendContent }]
        });

        const legendText = legendResponse.content[0]?.text || '{}';
        const legendMatch = legendText.match(/\{[\s\S]*\}/);
        if (legendMatch) {
          const legendData = JSON.parse(legendMatch[0]);
          knowledgeBase.blueprints.legend = legendData;
          knowledgeBase.blueprints.scale = legendData.scale;
          knowledgeBase.blueprints.sheetIndex = legendData.sheetIndex || [];
          if (legendData.projectInfo) {
            knowledgeBase.projectInfo = { ...knowledgeBase.projectInfo, ...legendData.projectInfo };
          }
        }
      } catch (legendError) {
        logger.error('Legend extraction failed', { error: legendError.message });
      }

      // Step 1B: Deep analyze each page with legend context
      const legendSymbols = knowledgeBase.blueprints.legend?.symbols || [];
      const legendContext = legendSymbols.length > 0
        ? legendSymbols.map(s => `${s.abbreviation || s.symbol}: ${s.meaning} (${s.system})`).join('\\n')
        : 'No legend extracted - use standard industry symbols';

      let pageCount = 0;
      for (const doc of blueprintDocs) {
        for (const page of doc.visionData.pages) {
          if (pageCount >= 20) break; // Limit for API costs

          try {
            const pageResponse = await client.messages.create({
              model: 'claude-sonnet-4-5-20250929',
              max_tokens: 4096,
              messages: [{
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `DEEP RESEARCH - PAGE ANALYSIS

Page ${page.page} of ${doc.filename}
Project: ${projectName}

KNOWN LEGEND:
${legendContext}

SCALE: ${knowledgeBase.blueprints.scale || 'Estimate from door widths (3ft standard)'}

ANALYZE THIS PAGE THOROUGHLY:
1. Identify the sheet number and name from title block
2. Identify what floor/area this covers
3. Find EVERY device symbol - count them precisely
4. Note room names and their purposes
5. Identify panel locations (FACP, MDF, IDF, ACP)
6. Note any conduit/pathway routing shown
7. Look for any notes or callouts

Return JSON:
{
  "sheetNumber": "E1.1",
  "sheetName": "First Floor Fire Alarm",
  "floorLevel": "1st Floor",
  "areasCovered": ["Building A", "East Wing"],
  "rooms": [
    {"name": "Office 101", "type": "office", "x": 0.0-1.0, "y": 0.0-1.0}
  ],
  "devices": [
    {
      "id": "unique_id",
      "type": "from legend",
      "system": "fire_alarm|security|access_control|data|av",
      "label": "device tag (SD-1, CAM-2)",
      "x": 0.0-1.0,
      "y": 0.0-1.0,
      "room": "room name",
      "mounting": "ceiling|wall|surface",
      "confidence": "high|medium"
    }
  ],
  "panels": [
    {"type": "FACP|MDF|IDF|ACP", "label": "panel name", "x": 0.0-1.0, "y": 0.0-1.0, "room": "room name"}
  ],
  "conduitPaths": [
    {"from": "panel", "to": "area", "type": "EMT|MC|plenum", "size": "3/4 inch"}
  ],
  "notes": ["any notes visible on this page"],
  "deviceCounts": {"smoke": 5, "horn_strobe": 3, "pull_station": 1}
}

Be PRECISE with device locations and counts.`
                  },
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: page.mediaType,
                      data: page.base64
                    }
                  }
                ]
              }]
            });

            const pageText = pageResponse.content[0]?.text || '{}';
            const pageMatch = pageText.match(/\{[\s\S]*\}/);
            if (pageMatch) {
              const pageData = JSON.parse(pageMatch[0]);
              pageData.filename = doc.filename;
              pageData.pageIndex = page.page;

              // Aggregate data
              if (pageData.devices) {
                pageData.devices.forEach(device => {
                  knowledgeBase.blueprints.allDevices.push({
                    ...device,
                    page: page.page,
                    filename: doc.filename,
                    sheetNumber: pageData.sheetNumber
                  });

                  // Count by system
                  const system = device.system || 'unknown';
                  knowledgeBase.blueprints.devicesBySystem[system] =
                    (knowledgeBase.blueprints.devicesBySystem[system] || 0) + 1;

                  // Count by floor
                  const floor = pageData.floorLevel || 'unknown';
                  if (!knowledgeBase.blueprints.devicesByFloor[floor]) {
                    knowledgeBase.blueprints.devicesByFloor[floor] = {};
                  }
                  knowledgeBase.blueprints.devicesByFloor[floor][system] =
                    (knowledgeBase.blueprints.devicesByFloor[floor][system] || 0) + 1;
                });
              }

              if (pageData.panels) {
                knowledgeBase.blueprints.panels.push(...pageData.panels.map(p => ({
                  ...p,
                  page: page.page,
                  filename: doc.filename
                })));
              }

              if (pageData.rooms) {
                pageData.rooms.forEach(room => {
                  if (!knowledgeBase.blueprints.roomList.find(r => r.name === room.name)) {
                    knowledgeBase.blueprints.roomList.push({
                      ...room,
                      floor: pageData.floorLevel
                    });
                  }
                });
              }
            }
          } catch (pageError) {
            logger.error('Page analysis failed', { page: page.page, error: pageError.message });
          }

          pageCount++;
        }
      }

      knowledgeBase.blueprints.totalPages = pageCount;
      knowledgeBase.blueprints.analyzed = true;
    }

    // =========================================================================
    // PHASE 2: SPECIFICATION DEEP ANALYSIS
    // =========================================================================
    if (specDocs.length > 0 || otherDocs.length > 0) {
      logger.info('Phase 2: Analyzing specifications', { specCount: specDocs.length, otherCount: otherDocs.length });

      const allTextDocs = [...specDocs, ...otherDocs];
      const combinedSpecText = allTextDocs
        .map(doc => `=== ${doc.filename} ===\\n${doc.content?.substring(0, 15000) || ''}`)
        .join('\\n\\n');

      if (combinedSpecText.length > 500) {
        try {
          const specResponse = await client.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 8192,
            messages: [{
              role: 'user',
              content: `DEEP RESEARCH - SPECIFICATION ANALYSIS

You are analyzing project specifications and documents for a low-voltage systems project.
Extract ALL relevant information that would help with bidding and installation.

PROJECT: ${projectName}

DOCUMENTS:
${combinedSpecText.substring(0, 50000)}

EXTRACT THE FOLLOWING:

1. SYSTEM REQUIREMENTS by discipline:
   - Fire Alarm (NFPA 72 requirements, device types, monitoring)
   - Security/Intrusion (sensors, panels, monitoring)
   - Access Control (readers, credentials, doors)
   - CCTV (cameras, storage, VMS)
   - Data/Network (cabling, racks, WiFi)
   - Audio Visual (speakers, displays, conferencing)
   - Nurse Call (if healthcare)

2. APPROVED MANUFACTURERS for each system

3. CODE REQUIREMENTS (NFPA, IBC, ADA, local codes)

4. TESTING REQUIREMENTS (acceptance testing, commissioning)

5. SUBMITTAL REQUIREMENTS (what needs to be submitted, when)

6. WARRANTY REQUIREMENTS

7. SPECIAL REQUIREMENTS (prevailing wage, bonding, insurance, certifications)

Return comprehensive JSON:
{
  "systems": {
    "fire_alarm": {
      "required": true/false,
      "description": "system description from specs",
      "deviceTypes": ["smoke detectors", "horn/strobes", etc.],
      "panelRequirements": "addressable, networkable, etc.",
      "monitoringRequirements": "central station, proprietary",
      "codeReferences": ["NFPA 72-2022", "IBC 2021"],
      "specialRequirements": ["voice evacuation", "mass notification"]
    },
    "security": { ... },
    "access_control": { ... },
    "cctv": { ... },
    "data": { ... },
    "av": { ... },
    "nurse_call": { ... }
  },
  "approvedManufacturers": {
    "fire_alarm": ["Notifier", "EST", "Simplex"],
    "access_control": ["Lenel", "AMAG", "Genetec"],
    ...
  },
  "codeRequirements": [
    {"code": "NFPA 72-2022", "relevantSections": ["Chapter 18", "Chapter 24"]},
    ...
  ],
  "testingRequirements": [
    {"system": "fire_alarm", "tests": ["100% device test", "battery test", "ground fault test"]}
  ],
  "submittals": [
    {"item": "Shop drawings", "timing": "within 30 days", "copies": 3}
  ],
  "warranties": [
    {"system": "all", "duration": "1 year", "type": "parts and labor"}
  ],
  "specialRequirements": [
    "Prevailing wage required",
    "NICET Level III technician required for fire alarm",
    "Background checks for all personnel"
  ],
  "scopeItems": ["furnish and install complete fire alarm system", ...],
  "exclusions": ["core drilling", "painting", ...]
}

Be THOROUGH. Extract every requirement that affects bidding or installation.`
            }]
          });

          const specText = specResponse.content[0]?.text || '{}';
          const specMatch = specText.match(/\{[\s\S]*\}/);
          if (specMatch) {
            const specData = JSON.parse(specMatch[0]);
            knowledgeBase.specifications = {
              analyzed: true,
              ...specData
            };
          }
        } catch (specError) {
          logger.error('Specification analysis failed', { error: specError.message });
        }
      }
    }

    // =========================================================================
    // PHASE 3: RFP/CONTRACT ANALYSIS
    // =========================================================================
    if (rfpDocs.length > 0) {
      logger.info('Phase 3: Analyzing RFP/Contract documents', { count: rfpDocs.length });

      const rfpText = rfpDocs
        .map(doc => `=== ${doc.filename} ===\\n${doc.content?.substring(0, 10000) || ''}`)
        .join('\\n\\n');

      try {
        const rfpResponse = await client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: `DEEP RESEARCH - RFP/CONTRACT ANALYSIS

Extract all contractual and bidding requirements:

${rfpText.substring(0, 30000)}

Return JSON:
{
  "bidDueDate": "date",
  "projectTimeline": {
    "start": "date",
    "completion": "date",
    "milestones": [{"name": "milestone", "date": "date"}]
  },
  "scope": ["list of scope items"],
  "exclusions": ["list of exclusions"],
  "alternates": [{"number": "Alt 1", "description": "description"}],
  "bondRequirements": {"bid": "5%", "performance": "100%", "payment": "100%"},
  "insuranceRequirements": {"general": "$1M", "auto": "$1M", "umbrella": "$5M"},
  "liquidatedDamages": "$X per day",
  "retainage": "10%",
  "paymentTerms": "Net 30",
  "specialConditions": ["list any special conditions"],
  "prequalificationRequired": true/false,
  "siteVisitRequired": true/false,
  "siteVisitDate": "date if applicable"
}`
          }]
        });

        const rfpText2 = rfpResponse.content[0]?.text || '{}';
        const rfpMatch = rfpText2.match(/\{[\s\S]*\}/);
        if (rfpMatch) {
          knowledgeBase.contract = {
            analyzed: true,
            ...JSON.parse(rfpMatch[0])
          };
        }
      } catch (rfpError) {
        logger.error('RFP analysis failed', { error: rfpError.message });
      }
    }

    // =========================================================================
    // PHASE 4: CROSS-REFERENCE AND VALIDATION
    // =========================================================================
    logger.info('Phase 4: Cross-referencing and building agent knowledge');

    // Build agent-specific knowledge packets
    const systems = ['fire_alarm', 'security', 'access_control', 'data', 'av', 'nurse_call'];

    for (const system of systems) {
      const deviceCount = knowledgeBase.blueprints.devicesBySystem[system] || 0;
      const specInfo = knowledgeBase.specifications.systems?.[system];
      const manufacturers = knowledgeBase.specifications.approvedManufacturers?.[system];

      if (deviceCount > 0 || specInfo?.required) {
        knowledgeBase.agentKnowledge[system === 'data' ? 'dataCabling' : system] = {
          deviceCount,
          devices: knowledgeBase.blueprints.allDevices.filter(d => d.system === system),
          panels: knowledgeBase.blueprints.panels.filter(p =>
            (system === 'fire_alarm' && p.type === 'FACP') ||
            (system === 'data' && (p.type === 'MDF' || p.type === 'IDF')) ||
            (system === 'access_control' && p.type === 'ACP')
          ),
          specRequirements: specInfo,
          approvedManufacturers: manufacturers,
          devicesByFloor: Object.fromEntries(
            Object.entries(knowledgeBase.blueprints.devicesByFloor)
              .map(([floor, systems]) => [floor, systems[system] || 0])
              .filter(([_, count]) => count > 0)
          ),
          legend: knowledgeBase.blueprints.legend?.symbols?.filter(s => s.system === system) || []
        };
      }
    }

    // Calculate confidence level
    const hasBlueprints = knowledgeBase.blueprints.analyzed && knowledgeBase.blueprints.totalPages > 0;
    const hasSpecs = knowledgeBase.specifications.analyzed;
    const hasDevices = knowledgeBase.blueprints.allDevices.length > 0;
    const hasLegend = knowledgeBase.blueprints.legend?.legendFound;

    if (hasBlueprints && hasSpecs && hasDevices && hasLegend) {
      knowledgeBase.confidence = 'high';
    } else if (hasBlueprints && hasDevices) {
      knowledgeBase.confidence = 'medium';
    } else {
      knowledgeBase.confidence = 'low';
    }

    // Build summary
    const summary = {
      totalDocuments: documents.length,
      blueprintPages: knowledgeBase.blueprints.totalPages,
      totalDevices: knowledgeBase.blueprints.allDevices.length,
      devicesBySystem: knowledgeBase.blueprints.devicesBySystem,
      panelsFound: knowledgeBase.blueprints.panels.length,
      roomsIdentified: knowledgeBase.blueprints.roomList.length,
      legendSymbols: knowledgeBase.blueprints.legend?.symbols?.length || 0,
      systemsInSpec: Object.keys(knowledgeBase.specifications.systems || {}).length,
      confidence: knowledgeBase.confidence
    };

    logger.info('Deep Research complete', {
      ...summary,
      requestId: req.requestId
    });

    res.json({
      success: true,
      knowledgeBase,
      summary,
      message: `Deep research complete. Analyzed ${summary.blueprintPages} blueprint pages, found ${summary.totalDevices} devices across ${Object.keys(summary.devicesBySystem).length} systems. Confidence: ${summary.confidence}`
    });

  } catch (error) {
    logger.error('Deep Research error', {
      error: error.message,
      stack: error.stack,
      requestId: req.requestId
    });

    if (error.message?.includes('credit balance') || error.status === 400) {
      return res.status(402).json({
        error: 'API credits exhausted. Please add credits to your Anthropic account.',
        code: 'INSUFFICIENT_CREDITS'
      });
    }

    res.status(500).json({ error: 'Deep research failed: ' + error.message });
  }
});

// Blueprint Intelligence - Analyze ALL pages, extract legend, create shared context
// This should be called ONCE when blueprints are uploaded to build the knowledge base
router.post('/blueprint-intelligence', async (req, res) => {
  try {
    const { documents, projectId, projectName = 'Project' } = req.body;

    // Filter documents that have vision data
    const blueprintDocs = (documents || []).filter(doc => doc.visionData && doc.visionData.pages?.length > 0);

    if (blueprintDocs.length === 0) {
      return res.status(400).json({
        error: 'No blueprint images found',
        suggestion: 'Upload PDF floor plans or image files first'
      });
    }

    const client = getAnthropicClient();

    logger.info('Starting Blueprint Intelligence analysis', {
      projectName,
      documentCount: blueprintDocs.length,
      requestId: req.requestId
    });

    // PHASE 1: Find and analyze the legend/symbol key (usually on first page or cover sheet)
    const legendContent = [];
    let legendPage = null;

    // Look at first few pages for legend
    for (const doc of blueprintDocs) {
      for (const page of doc.visionData.pages.slice(0, 3)) {
        legendContent.push({
          type: 'text',
          text: `--- ${doc.filename} (Page ${page.page}) ---`
        });
        legendContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: page.mediaType,
            data: page.base64
          }
        });
      }
    }

    legendContent.push({
      type: 'text',
      text: `TASK: Find and extract the SYMBOL LEGEND/KEY from these blueprint pages.

Look for:
1. A dedicated legend box/table showing symbols and their meanings
2. Symbol definitions in the title block or notes
3. Device abbreviations and their full names

Return a JSON object:
{
  "legendFound": true/false,
  "legendPageNumber": number or null,
  "symbols": [
    {
      "symbol": "description of the symbol (e.g., 'circle with S inside')",
      "abbreviation": "SD, CAM, CR, etc.",
      "meaning": "Smoke Detector, Camera, Card Reader, etc.",
      "system": "fire_alarm|security|access_control|data|av|nurse_call",
      "cableType": "18-2|cat6|composite|etc."
    }
  ],
  "scale": "1/8\" = 1'-0\"" or null if not found,
  "projectInfo": {
    "projectName": "from title block",
    "address": "if visible",
    "architect": "if visible",
    "sheetList": ["list of sheet numbers if visible"]
  },
  "notes": ["any important general notes from the drawings"]
}

Return ONLY the JSON object.`
    });

    const legendResponse = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{ role: 'user', content: legendContent }]
    });

    let legendData = {};
    try {
      const legendText = legendResponse.content[0]?.text || '{}';
      const jsonMatch = legendText.match(/\{[\s\S]*\}/);
      legendData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (e) {
      logger.error('Failed to parse legend data', { error: e.message });
      legendData = { legendFound: false, symbols: [] };
    }

    // PHASE 2: Analyze each page with the legend context
    const pageAnalyses = [];
    const allDevices = [];
    let totalPages = 0;

    for (const doc of blueprintDocs) {
      for (const page of doc.visionData.pages) {
        if (totalPages >= 15) break; // Limit pages

        const pageContent = [
          {
            type: 'text',
            text: `You are analyzing page ${page.page} of ${doc.filename}.

KNOWN SYMBOL LEGEND (from cover sheet):
${legendData.symbols?.length > 0
                ? legendData.symbols.map(s => `- ${s.abbreviation || s.symbol}: ${s.meaning} (${s.system})`).join('\n')
                : 'No legend available - identify symbols by standard industry conventions'}

SCALE: ${legendData.scale || 'Not specified - estimate from door widths (standard 3ft)'}

TASK: Identify ALL devices on this page using the legend above.
For each device, provide PRECISE coordinates (0.0-1.0 range).

Return JSON:
{
  "pageNumber": ${page.page},
  "sheetName": "sheet name/number if visible",
  "floorLevel": "floor level if identifiable",
  "rooms": [{"name": "room name", "x": 0.0-1.0, "y": 0.0-1.0, "width": 0.0-1.0, "height": 0.0-1.0}],
  "devices": [
    {
      "id": "unique_id",
      "type": "from legend",
      "system": "fire_alarm|security|access_control|data|av",
      "label": "device tag if visible",
      "x": 0.0-1.0,
      "y": 0.0-1.0,
      "room": "room name",
      "confidence": "high|medium"
    }
  ],
  "panelLocations": [{"type": "FACP|MDF|IDF|ACP", "label": "panel name", "x": 0.0-1.0, "y": 0.0-1.0}],
  "observations": ["notes about this page"]
}

Only include devices you can CLEARLY see. Use the legend to identify them correctly.`
          },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: page.mediaType,
              data: page.base64
            }
          }
        ];

        try {
          const pageResponse = await client.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            messages: [{ role: 'user', content: pageContent }]
          });

          const pageText = pageResponse.content[0]?.text || '{}';
          const pageJsonMatch = pageText.match(/\{[\s\S]*\}/);
          const pageData = pageJsonMatch ? JSON.parse(pageJsonMatch[0]) : {};

          pageData.filename = doc.filename;
          pageData.pageIndex = page.page;
          pageAnalyses.push(pageData);

          // Collect all devices with page reference
          if (pageData.devices?.length > 0) {
            pageData.devices.forEach(device => {
              allDevices.push({
                ...device,
                page: page.page,
                filename: doc.filename,
                sheetName: pageData.sheetName
              });
            });
          }
        } catch (pageError) {
          logger.error('Failed to analyze page', { page: page.page, error: pageError.message });
        }

        totalPages++;
      }
    }

    // PHASE 3: Build comprehensive summary
    const devicesBySystem = {};
    const devicesByType = {};
    const devicesByFloor = {};

    allDevices.forEach(device => {
      // By system
      const system = device.system || 'unknown';
      devicesBySystem[system] = (devicesBySystem[system] || 0) + 1;

      // By type
      const type = device.type || 'unknown';
      devicesByType[type] = (devicesByType[type] || 0) + 1;

      // By floor
      const floor = device.room || 'unassigned';
      devicesByFloor[floor] = (devicesByFloor[floor] || 0) + 1;
    });

    // Build the blueprint intelligence context
    const blueprintContext = {
      projectId,
      projectName,
      analyzedAt: new Date().toISOString(),
      legend: legendData,
      scale: legendData.scale,
      totalPages: totalPages,
      totalDevices: allDevices.length,
      summary: {
        devicesBySystem,
        devicesByType,
        devicesByFloor
      },
      pageAnalyses,
      allDevices,
      panels: pageAnalyses.flatMap(p => p.panelLocations || [])
    };

    logger.info('Blueprint Intelligence complete', {
      totalPages,
      totalDevices: allDevices.length,
      legendFound: legendData.legendFound,
      requestId: req.requestId
    });

    res.json({
      success: true,
      blueprintContext,
      usage: {
        pagesAnalyzed: totalPages,
        devicesFound: allDevices.length
      }
    });

  } catch (error) {
    logger.error('Blueprint Intelligence error', {
      error: error.message,
      requestId: req.requestId
    });

    if (error.message?.includes('credit balance') || error.status === 400) {
      return res.status(402).json({
        error: 'API credits exhausted. Please add credits to your Anthropic account.',
        code: 'INSUFFICIENT_CREDITS'
      });
    }

    res.status(500).json({ error: 'Failed to analyze blueprints: ' + error.message });
  }
});

// AI Auto-Markup - Analyze blueprint and return device locations/annotations
// Now accepts blueprintContext for legend-aware analysis
router.post('/auto-markup', async (req, res) => {
  try {
    const { imageData, mediaType = 'image/jpeg', pageNumber = 1, projectName = 'Project', pixelsPerFoot = null, blueprintContext = null } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const client = getAnthropicClient();

    // Check if we have legend context from Blueprint Intelligence
    const hasLegendContext = blueprintContext?.legend?.symbols?.length > 0;

    logger.info('Starting AI auto-markup analysis', {
      pageNumber,
      projectName,
      hasScale: !!pixelsPerFoot,
      hasLegendContext,
      requestId: req.requestId
    });

    // Build the vision analysis prompt - use legend context if available
    let analysisPrompt;

    if (hasLegendContext) {
      // LEGEND-AWARE ANALYSIS - More accurate with known symbols
      const legendSymbols = blueprintContext.legend.symbols
        .map(s => `- ${s.abbreviation || s.symbol}: ${s.meaning} (${s.system})`)
        .join('\n');

      analysisPrompt = `You are analyzing page ${pageNumber} of a blueprint set.

KNOWN SYMBOL LEGEND (extracted from cover sheet):
${legendSymbols}

SCALE: ${blueprintContext.scale || pixelsPerFoot ? `${pixelsPerFoot} pixels per foot` : 'Estimate from door widths (standard 3ft)'}

PROJECT: ${blueprintContext.projectName || projectName}

YOUR TASK: Find ALL devices on this page that match the symbols in the legend above.
- Use the legend to correctly identify each symbol
- Provide PRECISE x,y coordinates (0.0-1.0 range)
- Only mark devices you can clearly see

Return JSON:
{
  "pageNumber": ${pageNumber},
  "sheetName": "sheet name if visible in title block",
  "panelLocation": {
    "x": 0.0-1.0, "y": 0.0-1.0,
    "label": "Panel name", "type": "mdf|idf|facp|acp",
    "confidence": "high|medium"
  } or null,
  "devices": [
    {
      "id": "unique_id",
      "type": "device type from legend",
      "system": "fire_alarm|security|access_control|data|av",
      "label": "device tag if visible (e.g., SD-1)",
      "x": 0.0-1.0,
      "y": 0.0-1.0,
      "room": "room name if identifiable",
      "confidence": "high|medium"
    }
  ],
  "areas": [{"name": "room name", "x": 0.0-1.0, "y": 0.0-1.0, "width": 0.0-1.0, "height": 0.0-1.0}],
  "callouts": [{"text": "observation", "x": 0.0-1.0, "y": 0.0-1.0, "type": "info|warning"}],
  "summary": {
    "totalDevices": number,
    "devicesByType": {},
    "observations": []
  }
}

Return ONLY the JSON object.`;
    } else {
      // NO LEGEND - Conservative analysis
      analysisPrompt = `You are analyzing a floor plan/blueprint for low-voltage device symbols.

CRITICAL RULES:
1. ONLY identify devices you can CLEARLY SEE as distinct symbols
2. Do NOT guess or infer device locations
3. Look for a LEGEND/SYMBOL KEY on this page first
4. If this is an architectural plan without LV symbols, return empty arrays
5. Coordinates must be PRECISE (0.0-1.0 range)

COMMON SYMBOLS TO LOOK FOR:
- Circles with letters (S=smoke, H=heat, HS=horn/strobe)
- Triangles or squares for cameras
- Rectangles for card readers
- Data outlets (often small squares)

Return JSON:
{
  "legendFound": true/false,
  "legendDescription": "describe legend if found",
  "panelLocation": {
    "x": 0.0-1.0, "y": 0.0-1.0,
    "label": "Panel name", "type": "mdf|idf|facp|acp",
    "confidence": "high|medium|low"
  } or null,
  "devices": [
    {
      "id": "unique_id",
      "type": "camera|smoke|speaker|pull|reader|motion|data|wap|panel|intercom|unknown",
      "system": "security|fire_alarm|access_control|data|av|unknown",
      "label": "label if visible",
      "x": 0.0-1.0,
      "y": 0.0-1.0,
      "symbolDescription": "what the symbol looks like",
      "confidence": "high|medium|low"
    }
  ],
  "areas": [{"name": "room name", "x": 0.0-1.0, "y": 0.0-1.0, "width": 0.0-1.0, "height": 0.0-1.0}],
  "callouts": [{"text": "observation", "x": 0.0-1.0, "y": 0.0-1.0, "type": "info|warning"}],
  "summary": {
    "totalDevices": number,
    "devicesByType": {},
    "drawingType": "fire_alarm|security|access_control|data|architectural|unknown",
    "observations": [],
    "limitations": []
  }
}

Return ONLY the JSON object.`;
    }

    // OPTIMIZATION: Overlay a coordinate grid to help the AI map 0.0-1.0 coordinates accurately
    // This fixes the "floating symbol" issue by giving the AI a visual reference frame.
    let processedImageData = imageData;
    let gridInfo = '';

    try {
      const imgBuffer = Buffer.from(imageData, 'base64');
      const metadata = await sharp(imgBuffer).metadata();
      const { width, height } = metadata;

      // Create a 10x10 grid SVG
      const gridSvg = `
        <svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="${width / 10}" height="${height / 10}" patternUnits="userSpaceOnUse">
              <path d="M ${width / 10} 0 L 0 0 0 ${height / 10}" fill="none" stroke="red" stroke-width="2" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <rect width="100%" height="100%" fill="none" stroke="red" stroke-width="5" />
        </svg>
      `;

      const processedBuffer = await sharp(imgBuffer)
        .composite([{ input: Buffer.from(gridSvg), blend: 'over' }])
        .toFormat('jpeg')
        .toBuffer();

      processedImageData = processedBuffer.toString('base64');
      gridInfo = '\nNOTE: A 10x10 red grid has been overlaid on the image to help you align coordinates. The grid lines mark 0.1 increments.';

      logger.info('Applied AI reference grid to blueprint', { width, height });
    } catch (gridError) {
      logger.warn('Failed to apply grid overlay', { error: gridError.message });
      // Continue with original image if grid fails
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Upgrade to Claude 4.5 Sonnet
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: processedImageData
            }
          },
          {
            type: 'text',
            text: analysisPrompt + gridInfo
          }
        ]
      }]
    });

    const responseText = response.content[0]?.text || '{}';

    // Parse JSON from response
    let analysisResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = JSON.parse(responseText);
      }
    } catch (parseError) {
      logger.error('Failed to parse AI markup response', { error: parseError.message });
      analysisResult = {
        devices: [],
        areas: [],
        callouts: [{
          text: 'AI analysis completed but could not parse structured results',
          x: 0.5,
          y: 0.1,
          type: 'warning'
        }],
        cableRuns: [],
        summary: {
          totalDevices: 0,
          devicesByType: {},
          observations: ['Analysis completed - manual review recommended']
        }
      };
    }

    logger.info('AI auto-markup complete', {
      devicesFound: analysisResult.devices?.length || 0,
      areasFound: analysisResult.areas?.length || 0,
      requestId: req.requestId
    });

    res.json({
      success: true,
      analysis: analysisResult,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens
      }
    });

  } catch (error) {
    logger.error('Auto-markup error', {
      error: error.message,
      requestId: req.requestId
    });

    // Check for billing/credit issues
    if (error.message?.includes('credit balance') || error.status === 400) {
      return res.status(402).json({
        error: 'API credits exhausted. Please add credits to your Anthropic account at console.anthropic.com',
        code: 'INSUFFICIENT_CREDITS'
      });
    }
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    res.status(500).json({ error: 'Failed to analyze blueprint: ' + error.message });
  }
});

module.exports = router;
