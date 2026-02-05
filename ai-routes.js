// ai-routes.js
const express = require('express');
const router = express.Router();
const { getAIAssistant } = require('./ai-assistant');

// Initialize AI assistant
const aiAssistant = getAIAssistant();

// AI query endpoint
router.post('/query', async (req, res) => {
    try {
        const { message, currentPage = '/', pageDetails = null } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                error: 'Message is required and must be a string',
                success: false
            });
        }
        
        console.log(`AI Query received: "${message.substring(0, 50)}..." on ${currentPage}`);
        
        // Pass pageDetails to the assistant
        const response = await aiAssistant.processQuery(message, currentPage, pageDetails);
        
        res.json({
            success: true,
            data: response
        });
        
    } catch (error) {
        console.error('AI route error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process AI query',
            message: error.message
        });
    }
});


// Test endpoint
router.get('/status', (req, res) => {
    res.json({
        success: true,
        status: 'AI Assistant is running',
        timestamp: new Date().toISOString(),
        model: 'gemini-1.5-flash'
    });
});

module.exports = router;