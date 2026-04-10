const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initializeDatabase } = require('./src/db/database');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const shiftRoutes = require('./src/routes/shiftRoutes');
const assignmentRoutes = require('./src/routes/assignmentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/assignments', assignmentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log('📚 API Documentation:');
      console.log('  POST   /api/auth/register');
      console.log('  POST   /api/auth/login');
      console.log('  GET    /api/shifts');
      console.log('  POST   /api/shifts (admin)');
      console.log('  DELETE /api/shifts/:id (admin)');
      console.log('  POST   /api/assignments');
      console.log('  DELETE /api/assignments/:id');
      console.log('  GET    /api/assignments');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

module.exports = app;
