const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Initialize Gemini Client
const getGeminiClient = () => {
    if (!process.env.GOOGLE_API_KEY) {
        throw new Error('GOOGLE_API_KEY is not configured');
    }
    return new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
};

/**
 * THE PROJECT MEMORY (The Warehouse)
 * Ingests ALL project documents (Specs, Plans, RFIs) into a single massive context window.
 */
router.post('/query', async (req, res) => {
    try {
        const { project, documents, query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        logger.info('Project Memory Query', {
            project: project?.name,
            docCount: documents?.length,
            query
        });

        // 1. CONTEXT BUILDER: Aggregating "The Warehouse"
        // We construct a single massive text block. 
        // In a production system, we might use caching or a vector DB, 
        // but Gemini 1.5 Pro's 2M context allows us to be "lazy" and just send it all for maximum reasoning.

        let fullContext = `PROJECT: ${project.name}\nLOCATION: ${project.city || 'Unknown'}\n\n`;

        // Add Document Contents
        if (documents && documents.length > 0) {
            fullContext += "--- PROJECT DOCUMENTS ---\n\n";

            for (const doc of documents) {
                fullContext += `DOCUMENT: ${doc.filename}\n`;

                // Add text content if available
                if (doc.content) {
                    fullContext += `CONTENT:\n${doc.content}\n\n`;
                }
                // If we only have extensive vision data (like from the plan markup), we could summary it
                else if (doc.visionData && doc.visionData.summary) {
                    fullContext += `SUMMARY:\n${JSON.stringify(doc.visionData.summary, null, 2)}\n\n`;
                }

                fullContext += "---\n\n";
            }
        }

        // 2. QUERY EXECUTION
        const genAI = getGeminiClient();
        // Use the model with the massive context window
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

        const systemInstruction = `
      You are "The Project Memory", an omniscient AI that knows every detail of this construction project.
      
      YOUR CAPABILITIES:
      - You have read every specification page, every drawing note, and every RFI.
      - You can find contradictions between specs and plans.
      - You can answer specific technical questions instantly.
      
      INSTRUCTIONS:
      - Answer the user's query based STRICTLY on the provided project context.
      - Cite the document name when providing specific facts (e.g., "According to Spec 28000...").
      - If the answer is not in the documents, say so.
      - valid markdown formatting.
    `;

        const result = await model.generateContent([
            systemInstruction,
            `CONTEXT:\n${fullContext}`,
            `USER QUERY: ${query}`
        ]);

        const response = await result.response;
        const text = response.text();

        res.json({
            success: true,
            answer: text,
            sources: documents?.map(d => d.filename)
        });

    } catch (error) {
        logger.error('Project Memory Failed', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
