require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const dbConfig = require('./config/db');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ====================
// 🔹 Global Middleware
// ====================
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging (dev-friendly)
app.use(morgan('dev'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ====================
// 🔹 Routes
// ====================
app.use('/api', apiRoutes);

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

// View route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// ====================
// 🔹 404 Handler
// ====================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// ====================
// 🔹 Global Error Handler
// ====================
app.use((err, req, res, next) => {
    console.error('🔥 Error:', err.stack);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// ====================
// 🔹 Server Start
// ====================
async function startServer() {
    try {
        await dbConfig.initDb();

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

startServer();
