// server.js - Updated version
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import AI routes
const aiRoutes = require('./ai-routes');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// API Routes
app.use('/api/ai', aiRoutes);

// Test AI endpoint
app.get('/api/test-ai', async (req, res) => {
    try {
        const { getAIAssistant } = require('./ai-assistant');
        const ai = getAIAssistant();
        
        res.json({
            success: true,
            message: 'AI Assistant API is running',
            model: process.env.GEMINI_MODEL || 'gemini-pro',
            endpoints: {
                query: 'POST /api/ai/query',
                status: 'GET /api/ai/status'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'AI Assistant initialization failed'
        });
    }
});

// Serve HTML files
const routes = [
  '/',
  '/login',
  '/register',
  '/forget',
  '/homepage',
  '/merchant',
  '/product-details',
  '/merchant-register-information',
  '/ADMIN/admin-dashboard',
  '/ADMIN/admin-login'
];

routes.forEach(route => {
  app.get(route, (req, res) => {
    let filePath;
    
    if (route === '/') {
      filePath = path.join(__dirname, 'homepage.html');
    } else if (route.startsWith('/ADMIN/')) {
      filePath = path.join(__dirname, route.substring(1) + '.html');
    } else {
      filePath = path.join(__dirname, route + '.html');
    }
    
    res.sendFile(filePath, err => {
      if (err) {
        res.sendFile(path.join(__dirname, 'homepage.html'));
      }
    });
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'homepage.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🤖 AI Assistant API: http://localhost:${PORT}/api/ai/status`);
  console.log(`📊 Test endpoint: http://localhost:${PORT}/api/test-ai`);
  console.log(`🌐 Available routes:`);
  routes.forEach(route => {
    console.log(`  http://localhost:${PORT}${route}`);
  });
});