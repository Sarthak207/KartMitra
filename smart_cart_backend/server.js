// server.js - Smart Cart Backend API Server (Optimized for Original UI)
BigInt.prototype.toJSON = function () { return this.toString(); };

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Enhanced CORS configuration for Smart Cart Original UI
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (file://, mobile apps, Postman)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'http://localhost:5000',
            'http://127.0.0.1:5000',
            'file://',
            'null' // This handles file:// protocol for local development
        ];
        
        // In development, allow all origins for smart cart features
        if (NODE_ENV === 'development') {
            return callback(null, true);
        }
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    preflightContinue: false
};

// Apply CORS middleware BEFORE other middleware
app.use(cors(corsOptions));

// Explicitly handle preflight requests for all routes
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});

// Other middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging optimized for original UI debugging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url} - Origin: ${req.get('Origin') || 'null'}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        version: '1.0.0',
        service: 'Smart Cart API - Original UI Compatible',
        features: {
            storeMap: '5 aisles with product locations',
            categoryFilters: 'All, Fruits, Bakery, Dairy, Beverages, Meat',
            findOnMap: 'Product location highlighting',
            authentication: 'Login/Register with demo credentials'
        }
    });
});

// API Routes for Smart Cart Original UI functionality
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));

// Store mapping endpoint for original UI 5-aisle layout
app.get('/api/store/layout', (req, res) => {
    res.json({
        aisles: [
            { id: 1, name: 'Aisle 1', categories: ['fruits'] },
            { id: 2, name: 'Aisle 2', categories: ['bakery'] },
            { id: 3, name: 'Aisle 3', categories: ['dairy'] },
            { id: 4, name: 'Aisle 4', categories: ['beverages'] },
            { id: 5, name: 'Aisle 5', categories: ['meat'] }
        ],
        userLocation: { x: 50, y: 400 },
        pathfinding: true
    });
});

// Category mapping for original UI filters
app.get('/api/categories', (req, res) => {
    res.json({
        categories: [
            { id: 'all', name: 'All', aisle: null },
            { id: 'fruits', name: 'Fruits', aisle: 1, emoji: '🍎' },
            { id: 'bakery', name: 'Bakery', aisle: 2, emoji: '🍞' },
            { id: 'dairy', name: 'Dairy', aisle: 3, emoji: '🥛' },
            { id: 'beverages', name: 'Beverages', aisle: 4, emoji: '🥤' },
            { id: 'meat', name: 'Meat', aisle: 5, emoji: '🥩' }
        ]
    });
});

// Product location endpoint for "Find on Map" feature
app.get('/api/products/:id/location', (req, res) => {
    const { id } = req.params;
    
    // This will be enhanced by your products route
    res.json({
        productId: id,
        aisle: 1, // Will be determined by category
        position: { x: 100, y: 150 },
        highlighted: true,
        path: [
            { x: 50, y: 400 },   // User location
            { x: 100, y: 150 }   // Product location
        ]
    });
});

// Demo credentials endpoint for original UI login
app.get('/api/demo-credentials', (req, res) => {
    res.json({
        demo: {
            username: 'demo',
            password: 'demo123',
            role: 'customer'
        },
        admin: {
            username: 'admin', 
            password: 'admin123',
            role: 'admin'
        }
    });
});

// Basic route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Smart Cart API Server Running - Original UI Compatible',
        version: '1.0.0',
        environment: NODE_ENV,
        originalUIFeatures: [
            '5-Aisle Store Map with Product Dots',
            'Category Filters: All, Fruits, Bakery, Dairy, Beverages, Meat',
            'Find on Map Product Location',
            'Green Theme Authentication',
            'Real-time Cart Updates',
            'Demo Credentials Support'
        ],
        cors: 'Enabled for file:// and all localhost origins'
    });
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Smart Cart API - Original UI',
        version: '1.0.0',
        description: 'Backend optimized for original green-themed SmartCart interface',
        endpoints: {
            auth: '/api/auth - Authentication with demo credentials',
            products: '/api/products - Product management with category filtering',
            cart: '/api/cart - Shopping cart operations with real-time updates',
            orders: '/api/orders - Order processing',
            store: '/api/store/layout - 5-aisle store map layout',
            categories: '/api/categories - Category filters for original UI',
            demo: '/api/demo-credentials - Demo login credentials'
        },
        originalUISupport: {
            storeMap: '5 aisles with product location dots',
            categoryFilters: 'All, Fruits, Bakery, Dairy, Beverages, Meat',
            findOnMap: 'Product highlighting and pathfinding',
            authentication: 'Demo credentials for testing'
        }
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: [
            '/api/auth - Authentication',
            '/api/products - Product management', 
            '/api/cart - Cart operations',
            '/api/orders - Order processing',
            '/api/store/layout - Store map',
            '/api/categories - Category filters',
            '/api/demo-credentials - Demo login'
        ],
        note: 'This API is optimized for the original SmartCart UI design'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Handle specific error types for original UI
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.message,
            uiHint: 'Check form inputs in original UI'
        });
    }
    
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or missing authentication token',
            uiHint: 'Try demo credentials: demo/demo123 or admin/admin123'
        });
    }
    
    res.status(err.status || 500).json({
        error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
        stack: NODE_ENV === 'development' ? err.stack : undefined,
        uiHint: 'Check browser console for frontend errors'
    });
});

// Start server with original UI compatibility messages
const server = app.listen(PORT, () => {
    console.log(`🚀 Smart Cart API Server running on port ${PORT}`);
    console.log(`📍 Environment: ${NODE_ENV}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`📋 API docs: http://localhost:${PORT}/api`);
    console.log(`🔧 CORS enabled for file:// and all localhost origins`);
    console.log(`🛒 Original UI Features Supported:`);
    console.log(`   ✅ 5-Aisle Store Map with Product Dots`);
    console.log(`   ✅ Category Filters: All, Fruits, Bakery, Dairy, Beverages, Meat`);
    console.log(`   ✅ Find on Map Product Location`);
    console.log(`   ✅ Green Theme Authentication`);
    console.log(`   ✅ Demo Credentials: demo/demo123, admin/admin123`);
    console.log(`🎨 Optimized for Original SmartCart Interface Design`);
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = app;
