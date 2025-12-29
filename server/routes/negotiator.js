const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const { AGENTS } = require('../config/agents');

const router = express.Router();

// Initialize Anthropic Client
const getAnthropicClient = () => {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};

// VENDOR PROFILES (Mock Database)
const VENDORS = [
    { id: 'graybar', name: 'Graybar', type: 'general', contact: 'sales@graybar.com' },
    { id: 'adi', name: 'ADI Global', type: 'security', contact: 'quotes@adiglobal.com' },
    { id: 'anixter', name: 'Wesco / Anixter', type: 'data', contact: 'bid.desk@anixter.com' },
    { id: 'jci', name: 'Johnson Controls', type: 'fire', contact: 'parts@jci.com' }
];

// MODEL TO USE
const MODEL = 'claude-sonnet-4-5-20250929'; // The "Brain"

/**
 * THE NEGOTIATOR AGENT
 * Analyzes a BOM (Bill of Materials) and drafts competitive bid request emails.
 */
router.post('/draft-emails', async (req, res) => {
    try {
        const { project, bomItems } = req.body;

        if (!bomItems || bomItems.length === 0) {
            return res.status(400).json({ error: 'No items provided for negotiation' });
        }

        logger.info('Starting Negotiation Sequence', {
            project: project.name,
            itemCount: bomItems.length
        });

        const client = getAnthropicClient();

        // 1. STRATEGY STEP: Analyze the BOM to decide which vendors to target
        const strategyPrompt = `
      You are "The Negotiator", a ruthless but professional procurement agent for a billion-dollar construction firm.
      
      PROJECT: ${project.name}
      LOCATION: ${project.city}, ${project.address}
      
      BOM SUMMARY:
      ${JSON.stringify(bomItems, null, 2)}
      
      AVAILABLE VENDORS:
      ${JSON.stringify(VENDORS, null, 2)}
      
      TASK:
      1. Group materials by trade (Data, Fire, Security).
      2. Select the best 2-3 vendors from the list for each group.
      3. Identify "Leverage Points" (e.g., "high quantity of CAT6 cable", "expensive fire alarm panels").
      
      Output JSON only:
      {
        "strategy": "Brief explanation of negotiation strategy",
        "batches": [
          {
            "vendorId": "adi",
            "items": ["list of item names/ids"],
            "focus": "Security Cameras",
            "leveragePoint": "High volume of cameras"
          }
        ]
      }
    `;

        const strategyResponse = await client.messages.create({
            model: MODEL,
            max_tokens: 4096,
            messages: [{ role: 'user', content: strategyPrompt }]
        });

        const strategyText = strategyResponse.content[0].text;
        const strategyJson = JSON.parse(strategyText.match(/\{[\s\S]*\}/)[0]);

        // 2. EXECUTION STEP: Draft the actual emails
        const draftedEmails = [];

        for (const batch of strategyJson.batches) {
            const vendor = VENDORS.find(v => v.id === batch.vendorId);
            const batchItems = bomItems.filter(i => batch.items.includes(i.name) || batch.items.includes(i.id));

            // Calculate estimated total for leverage
            const estimatedValue = batchItems.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 100)), 0);

            const emailPrompt = `
        Draft a high-stakes, professional bid request email to ${vendor.name}.
        
        SENDER: TakeoffAI Procurement Team (on behalf of ${project.customer})
        RECIPIENT: ${vendor.name} (${vendor.contact})
        DATE: ${new Date().toLocaleDateString()}
        
        CONTEXT:
        We are bidding the ${project.name} project. It's a competitive bid.
        We have roughly $${estimatedValue.toLocaleString()} of material in this batch.
        
        ITEMS TO QUOTE:
        ${batchItems.map(i => `- ${i.quantity}x ${i.name} (${i.description || ''})`).join('\n')}
        
        INSTRUCTIONS:
        - Be assertive but polite.
        - Demand "Project Registered Pricing" (SPA).
        - Mention we are getting quotes from competitors (don't name them, just imply it).
        - Ask for a response by 5:00 PM tomorrow.
        - Format as a clean HTML body for an email client.
        
        Return JSON Key: "emailBody", "subjectLine"
      `;

            const emailResponse = await client.messages.create({
                model: MODEL,
                max_tokens: 4096,
                messages: [{ role: 'user', content: emailPrompt }]
            });

            const emailText = emailResponse.content[0].text;
            const emailJson = JSON.parse(emailText.match(/\{[\s\S]*\}/)[0]);

            draftedEmails.push({
                vendorName: vendor.name,
                vendorContact: vendor.contact,
                subject: emailJson.subjectLine,
                body: emailJson.emailBody,
                itemsIncluded: batchItems.length,
                estimatedValue: estimatedValue
            });
        }

        res.json({
            success: true,
            strategy: strategyJson.strategy,
            emails: draftedEmails
        });

    } catch (error) {
        logger.error('Negotiator Agent Failed', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
