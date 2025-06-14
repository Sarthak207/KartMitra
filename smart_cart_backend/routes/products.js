// routes/products.js - Complete Products API with Image Upload Support
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { db } = require('../db');
const { uploadProductImage, uploadCSV, uploadMultipleImages } = require('../middleware/upload');

// Demo user support for original UI
const DEMO_USERS = {
    999: { id: 999, username: 'demo', role: 'customer' },
    998: { id: 998, username: 'admin', role: 'admin' }
};

// Demo products with image URLs
const DEMO_PRODUCTS = [
    {
        id: 1,
        name: 'Red Apples',
        price: 2.59,
        category: 'fruits',
        stock: 50,
        location: 'Aisle 1 • Shelf A',
        image_url: '/uploads/products/demo-apple.jpg',
        rfid_tag: 'APPLE001',
        map_x: 100,
        map_y: 150,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 2,
        name: 'Whole Wheat Bread',
        price: 1.99,
        category: 'bakery',
        stock: 25,
        location: 'Aisle 2 • Shelf B',
        image_url: '/uploads/products/demo-bread.jpg',
        rfid_tag: 'BREAD001',
        map_x: 200,
        map_y: 150,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 3,
        name: 'Fresh Milk',
        price: 3.49,
        category: 'dairy',
        stock: 30,
        location: 'Aisle 3 • Shelf C',
        image_url: '/uploads/products/demo-milk.jpg',
        rfid_tag: 'MILK001',
        map_x: 300,
        map_y: 150,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 4,
        name: 'Bananas',
        price: 1.29,
        category: 'fruits',
        stock: 60,
        location: 'Aisle 1 • Shelf A',
        image_url: '/uploads/products/demo-banana.jpg',
        rfid_tag: 'BANANA001',
        map_x: 100,
        map_y: 200,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 5,
        name: 'Cheddar Cheese',
        price: 4.99,
        category: 'dairy',
        stock: 20,
        location: 'Aisle 3 • Shelf C',
        image_url: '/uploads/products/demo-cheese.jpg',
        rfid_tag: 'CHEESE001',
        map_x: 300,
        map_y: 200,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 6,
        name: 'Croissants',
        price: 3.99,
        category: 'bakery',
        stock: 15,
        location: 'Aisle 2 • Shelf B',
        image_url: '/uploads/products/demo-croissant.jpg',
        rfid_tag: 'CROISSANT001',
        map_x: 200,
        map_y: 200,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 7,
        name: 'Orange Juice',
        price: 2.79,
        category: 'beverages',
        stock: 35,
        location: 'Aisle 4 • Shelf D',
        image_url: '/uploads/products/demo-juice.jpg',
        rfid_tag: 'JUICE001',
        map_x: 400,
        map_y: 150,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 8,
        name: 'Chicken Breast',
        price: 7.99,
        category: 'meat',
        stock: 12,
        location: 'Aisle 5 • Shelf E',
        image_url: '/uploads/products/demo-chicken.jpg',
        rfid_tag: 'CHICKEN001',
        map_x: 500,
        map_y: 150,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

// Aisle mapping for original UI store map
const AISLE_MAPPING = {
    'fruits': 1,
    'bakery': 2,
    'dairy': 3,
    'beverages': 4,
    'meat': 5
};

// Authentication middleware (enhanced for original UI with demo support)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Access token required',
            uiHint: 'Please login to access product management'
        });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'smart_cart_secret_key_change_in_production', async (err, decoded) => {
        if (err) {
            return res.status(403).json({ 
                error: 'Invalid or expired token',
                uiHint: 'Please login again'
            });
        }
        
        try {
            let user = null;
            
            // Check demo users first (for original UI)
            if (decoded.id === 999 || decoded.id === 998) {
                user = DEMO_USERS[decoded.id];
            } else {
                // Check database users
                const users = await db.query(
                    'SELECT id, username, role FROM users WHERE id = ? AND is_active = true',
                    [decoded.id]
                );
                
                if (users.length > 0) {
                    user = users[0];
                }
            }
            
            if (!user) {
                return res.status(401).json({ 
                    error: 'User not found or inactive',
                    uiHint: 'Please login again'
                });
            }
            
            req.user = {
                id: user.id,
                username: user.username,
                role: user.role
            };
            next();
        } catch (dbErr) {
            console.error('Token verification DB error:', dbErr);
            return res.status(500).json({ 
                error: 'Authentication failed',
                uiHint: 'Please try again'
            });
        }
    });
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            error: 'Admin access required',
            uiHint: 'This feature requires admin privileges'
        });
    }
    next();
};

// Input validation middleware (optimized for original UI)
const validateProduct = (req, res, next) => {
    const { name, price, category, stock } = req.body;
    const errors = [];
    
    if (!name || name.trim().length < 2) {
        errors.push('Product name must be at least 2 characters long');
    }
    
    if (!price || isNaN(price) || parseFloat(price) < 0) {
        errors.push('Valid price is required (must be a positive number)');
    }
    
    if (!category || category.trim().length < 2) {
        errors.push('Category must be at least 2 characters long');
    }
    
    if (stock !== undefined && (isNaN(stock) || parseInt(stock) < 0)) {
        errors.push('Stock must be a non-negative number');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ 
            error: errors.join(', '),
            uiHint: 'Please check the product form and try again'
        });
    }
    
    // Sanitize inputs
    req.body.name = name.trim();
    req.body.category = category.trim().toLowerCase();
    req.body.location = req.body.location ? req.body.location.trim() : '';
    req.body.price = parseFloat(price);
    req.body.stock = stock !== undefined ? parseInt(stock) : 0;
    
    next();
};

// Get all products (enhanced with image support and filtering)
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            category,
            search,
            minPrice,
            maxPrice,
            inStock,
            sortBy = 'name',
            sortOrder = 'ASC'
        } = req.query;
        
        // For demo/development, return demo products with images
        let products = DEMO_PRODUCTS;
        
        // Try to get real products from database, fall back to demo
        try {
            const dbProducts = await db.query(`
                SELECT id, name, price, category, stock, location, image_url, rfid_tag, map_x, map_y, 
                       created_at, updated_at
                FROM products 
                ORDER BY name ASC
            `);
            
            if (dbProducts.length > 0) {
                products = dbProducts;
            }
        } catch (dbErr) {
            console.log('Using demo products with images - database not available:', dbErr.message);
        }
        
        // Apply filters for original UI
        let filteredProducts = products;
        
        if (category && category !== 'all') {
            filteredProducts = filteredProducts.filter(p => 
                p.category && p.category.toLowerCase() === category.toLowerCase()
            );
        }
        
        if (search) {
            const searchTerm = search.toLowerCase();
            filteredProducts = filteredProducts.filter(p => 
                p.name.toLowerCase().includes(searchTerm) ||
                p.category.toLowerCase().includes(searchTerm) ||
                (p.location && p.location.toLowerCase().includes(searchTerm))
            );
        }
        
        if (minPrice) {
            filteredProducts = filteredProducts.filter(p => p.price >= parseFloat(minPrice));
        }
        
        if (maxPrice) {
            filteredProducts = filteredProducts.filter(p => p.price <= parseFloat(maxPrice));
        }
        
        if (inStock === 'true') {
            filteredProducts = filteredProducts.filter(p => p.stock > 0);
        }
        
        // Sort products
        if (sortBy === 'price') {
            filteredProducts.sort((a, b) => {
                return sortOrder === 'DESC' ? b.price - a.price : a.price - b.price;
            });
        } else {
            filteredProducts.sort((a, b) => {
                const aVal = a[sortBy] || '';
                const bVal = b[sortBy] || '';
                if (sortOrder === 'DESC') {
                    return bVal.toString().localeCompare(aVal.toString());
                }
                return aVal.toString().localeCompare(bVal.toString());
            });
        }
        
        // Add aisle information for original UI store map
        filteredProducts = filteredProducts.map(product => ({
            ...product,
            aisle: AISLE_MAPPING[product.category] || 1,
            emoji: getProductEmoji(product.category)
        }));
        
        // Pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
        
        const totalPages = Math.ceil(filteredProducts.length / limitNum);
        
        res.json({
            products: paginatedProducts,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems: filteredProducts.length,
                itemsPerPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            },
            filters: {
                category,
                search,
                minPrice,
                maxPrice,
                inStock,
                sortBy,
                sortOrder
            },
            aisleMapping: AISLE_MAPPING,
            isDemoData: products === DEMO_PRODUCTS,
            imageSupport: true
        });
    } catch (err) {
        console.error('Get products error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch products',
            uiHint: 'Please refresh the page and try again'
        });
    }
});

// Get product categories (optimized for original UI filters)
router.get('/categories', async (req, res) => {
    try {
        // Return categories matching original UI
        const categories = [
            { category: 'all', count: DEMO_PRODUCTS.length, emoji: '🛍️', aisle: null },
            { category: 'fruits', count: DEMO_PRODUCTS.filter(p => p.category === 'fruits').length, emoji: '🍎', aisle: 1 },
            { category: 'bakery', count: DEMO_PRODUCTS.filter(p => p.category === 'bakery').length, emoji: '🍞', aisle: 2 },
            { category: 'dairy', count: DEMO_PRODUCTS.filter(p => p.category === 'dairy').length, emoji: '🥛', aisle: 3 },
            { category: 'beverages', count: DEMO_PRODUCTS.filter(p => p.category === 'beverages').length, emoji: '🥤', aisle: 4 },
            { category: 'meat', count: DEMO_PRODUCTS.filter(p => p.category === 'meat').length, emoji: '🥩', aisle: 5 }
        ];
        
        res.json(categories);
    } catch (err) {
        console.error('Get categories error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch categories',
            uiHint: 'Category filters may not work properly'
        });
    }
});

// Get product by ID (enhanced for original UI)
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    
    if (isNaN(id)) {
        return res.status(400).json({ 
            error: 'Invalid product ID',
            uiHint: 'Please select a valid product'
        });
    }
    
    try {
        // Check demo products first
        const demoProduct = DEMO_PRODUCTS.find(p => p.id === parseInt(id));
        if (demoProduct) {
            return res.json({
                ...demoProduct,
                aisle: AISLE_MAPPING[demoProduct.category] || 1,
                emoji: getProductEmoji(demoProduct.category)
            });
        }
        
        // Check database
        const product = await db.query(
            'SELECT * FROM products WHERE id = ?', 
            [parseInt(id)]
        );
        
        if (product.length === 0) {
            return res.status(404).json({ 
                error: 'Product not found',
                uiHint: 'This product may no longer be available'
            });
        }
        
        const foundProduct = product[0];
        res.json({
            ...foundProduct,
            aisle: AISLE_MAPPING[foundProduct.category] || 1,
            emoji: getProductEmoji(foundProduct.category)
        });
    } catch (err) {
        console.error('Get product by ID error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch product',
            uiHint: 'Please try again'
        });
    }
});

// Get product location for "Find on Map" feature
router.get('/:id/location', async (req, res) => {
    const { id } = req.params;
    
    if (isNaN(id)) {
        return res.status(400).json({ 
            error: 'Invalid product ID',
            uiHint: 'Please select a valid product'
        });
    }
    
    try {
        // Check demo products first
        const demoProduct = DEMO_PRODUCTS.find(p => p.id === parseInt(id));
        if (demoProduct) {
            return res.json({
                productId: demoProduct.id,
                name: demoProduct.name,
                aisle: AISLE_MAPPING[demoProduct.category] || 1,
                position: { x: demoProduct.map_x, y: demoProduct.map_y },
                category: demoProduct.category,
                location: demoProduct.location,
                highlighted: true,
                path: [
                    { x: 50, y: 400 },   // User location (red dot)
                    { x: demoProduct.map_x, y: demoProduct.map_y }   // Product location (green dot)
                ]
            });
        }
        
        // Check database
        const product = await db.query(
            'SELECT id, name, category, location, map_x, map_y FROM products WHERE id = ?', 
            [parseInt(id)]
        );
        
        if (product.length === 0) {
            return res.status(404).json({ 
                error: 'Product not found',
                uiHint: 'This product may no longer be available'
            });
        }
        
        const foundProduct = product[0];
        res.json({
            productId: foundProduct.id,
            name: foundProduct.name,
            aisle: AISLE_MAPPING[foundProduct.category] || 1,
            position: { x: foundProduct.map_x || 100, y: foundProduct.map_y || 150 },
            category: foundProduct.category,
            location: foundProduct.location,
            highlighted: true,
            path: [
                { x: 50, y: 400 },   // User location
                { x: foundProduct.map_x || 100, y: foundProduct.map_y || 150 }   // Product location
            ]
        });
    } catch (err) {
        console.error('Get product location error:', err);
        res.status(500).json({ 
            error: 'Failed to get product location',
            uiHint: 'Map feature temporarily unavailable'
        });
    }
});

// Get product by RFID tag (for smart cart scanning)
router.get('/rfid/:tag', async (req, res) => {
    const { tag } = req.params;
    
    if (!tag || tag.trim().length === 0) {
        return res.status(400).json({ 
            error: 'RFID tag is required',
            uiHint: 'Please scan a valid RFID tag'
        });
    }
    
    try {
        // Check demo products first
        const demoProduct = DEMO_PRODUCTS.find(p => p.rfid_tag === tag.trim());
        if (demoProduct) {
            return res.json({
                ...demoProduct,
                aisle: AISLE_MAPPING[demoProduct.category] || 1,
                emoji: getProductEmoji(demoProduct.category)
            });
        }
        
        // Check database
        const product = await db.query(
            'SELECT * FROM products WHERE rfid_tag = ?', 
            [tag.trim()]
        );
        
        if (product.length === 0) {
            return res.status(404).json({ 
                error: 'Product not found',
                uiHint: 'This RFID tag is not recognized'
            });
        }
        
        const foundProduct = product[0];
        res.json({
            ...foundProduct,
            aisle: AISLE_MAPPING[foundProduct.category] || 1,
            emoji: getProductEmoji(foundProduct.category)
        });
    } catch (err) {
        console.error('Get product by RFID error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch product',
            uiHint: 'RFID scanning temporarily unavailable'
        });
    }
});

// Get products by location (for store mapping)
router.get('/location/:location', async (req, res) => {
    const { location } = req.params;
    
    if (!location || location.trim().length === 0) {
        return res.status(400).json({ 
            error: 'Location is required',
            uiHint: 'Please specify a valid location'
        });
    }
    
    try {
        // Check demo products first
        const demoProducts = DEMO_PRODUCTS.filter(p => 
            p.location && p.location.toLowerCase().includes(location.trim().toLowerCase())
        );
        
        if (demoProducts.length > 0) {
            return res.json(demoProducts.map(product => ({
                ...product,
                aisle: AISLE_MAPPING[product.category] || 1,
                emoji: getProductEmoji(product.category)
            })));
        }
        
        // Check database
        const products = await db.query(
            'SELECT * FROM products WHERE location LIKE ? ORDER BY name',
            [`%${location.trim()}%`]
        );
        
        const enhancedProducts = products.map(product => ({
            ...product,
            aisle: AISLE_MAPPING[product.category] || 1,
            emoji: getProductEmoji(product.category)
        }));
        
        res.json(enhancedProducts);
    } catch (err) {
        console.error('Get products by location error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch products by location',
            uiHint: 'Location search temporarily unavailable'
        });
    }
});

// Add new product with image upload
router.post('/', authenticateToken, requireAdmin, uploadProductImage.single('image'), async (req, res) => {
    const { name, price, category, stock, location, rfid_tag, map_x, map_y, description } = req.body;
    
    // Validate required fields
    if (!name || !price || !category || stock === undefined) {
        return res.status(400).json({ 
            error: 'Name, price, category, and stock are required',
            uiHint: 'Please fill in all required fields'
        });
    }
    
    try {
        // For demo admin, simulate successful addition
        if (req.user.id >= 998) {
            const newId = Math.max(...DEMO_PRODUCTS.map(p => p.id)) + 1;
            const imageUrl = req.file ? `/uploads/products/${req.file.filename}` : null;
            
            console.log(`✅ Demo product added: ${name} (ID: ${newId}) by demo admin ${req.user.username}`);
            
            return res.status(201).json({ 
                id: newId.toString(), 
                message: 'Product added successfully',
                product: {
                    id: newId.toString(),
                    name,
                    price: parseFloat(price),
                    category,
                    stock: parseInt(stock),
                    location: location || `Aisle ${AISLE_MAPPING[category] || 1} • Shelf A`,
                    image_url: imageUrl,
                    rfid_tag: rfid_tag || null,
                    map_x: parseInt(map_x) || (AISLE_MAPPING[category] * 100) || 100,
                    map_y: parseInt(map_y) || 150,
                    aisle: AISLE_MAPPING[category] || 1,
                    emoji: getProductEmoji(category)
                },
                uiHint: 'Product with image added to catalog!'
            });
        }
        
        // Check if RFID tag already exists (if provided)
        if (rfid_tag) {
            const existingRFID = await db.query(
                'SELECT id FROM products WHERE rfid_tag = ?',
                [rfid_tag]
            );
            
            if (existingRFID.length > 0) {
                return res.status(409).json({ 
                    error: 'RFID tag already exists',
                    uiHint: 'Please use a different RFID tag'
                });
            }
        }
        
        // Set default location based on category
        const defaultLocation = location || `Aisle ${AISLE_MAPPING[category] || 1} • Shelf A`;
        const defaultMapX = parseInt(map_x) || (AISLE_MAPPING[category] * 100) || 100;
        const defaultMapY = parseInt(map_y) || 150;
        const imageUrl = req.file ? `/uploads/products/${req.file.filename}` : null;
        
        const result = await db.query(
            `INSERT INTO products (name, price, category, stock, location, image_url, rfid_tag, map_x, map_y, description, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [name, parseFloat(price), category, parseInt(stock), defaultLocation, imageUrl, rfid_tag || null, defaultMapX, defaultMapY, description || '']
        );
        
        console.log(`✅ Product with image added: ${name} (ID: ${result.insertId}) by admin ${req.user.username}`);
        
        res.status(201).json({ 
            id: result.insertId.toString(), 
            message: 'Product added successfully',
            product: {
                id: result.insertId.toString(),
                name,
                price: parseFloat(price),
                category,
                stock: parseInt(stock),
                location: defaultLocation,
                image_url: imageUrl,
                rfid_tag: rfid_tag || null,
                map_x: defaultMapX,
                map_y: defaultMapY,
                description: description || '',
                aisle: AISLE_MAPPING[category] || 1,
                emoji: getProductEmoji(category)
            },
            uiHint: 'Product with image added successfully!'
        });
    } catch (err) {
        console.error('Add product error:', err);
        
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                error: 'Product with this RFID tag already exists',
                uiHint: 'Please use a different RFID tag'
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to add product',
            uiHint: 'Please try again or contact support'
        });
    }
});

// Bulk upload products via CSV
router.post('/bulk-upload', authenticateToken, requireAdmin, uploadCSV.single('csvFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            error: 'CSV file is required',
            uiHint: 'Please select a CSV file to upload'
        });
    }
    
    const results = [];
    const errors = [];
    
    try {
        // For demo admin, simulate successful bulk upload
        if (req.user.id >= 998) {
            console.log(`✅ Demo bulk upload: CSV processed by demo admin ${req.user.username}`);
            
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            
            return res.json({
                message: 'Bulk upload completed successfully',
                results: {
                    total: 5,
                    successful: 5,
                    failed: 0,
                    products: [
                        { name: 'Demo Product 1', status: 'success' },
                        { name: 'Demo Product 2', status: 'success' },
                        { name: 'Demo Product 3', status: 'success' },
                        { name: 'Demo Product 4', status: 'success' },
                        { name: 'Demo Product 5', status: 'success' }
                    ]
                },
                uiHint: 'Demo bulk upload completed! Products added to catalog.'
            });
        }
        
        // Parse CSV file
        const products = [];
        
        await new Promise((resolve, reject) => {
            fs.createReadStream(req.file.path)
                .pipe(csv())
                .on('data', (data) => {
                    products.push(data);
                })
                .on('end', resolve)
                .on('error', reject);
        });
        
        // Process each product
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            
            try {
                // Validate required fields
                if (!product.name || !product.price || !product.category || product.stock === undefined) {
                    errors.push({
                        row: i + 1,
                        error: 'Missing required fields (name, price, category, stock)',
                        data: product
                    });
                    continue;
                }
                
                // Set defaults
                const category = product.category.toLowerCase();
                const location = product.location || `Aisle ${AISLE_MAPPING[category] || 1} • Shelf A`;
                const mapX = parseInt(product.map_x) || (AISLE_MAPPING[category] * 100) || 100;
                const mapY = parseInt(product.map_y) || 150;
                
                // Insert into database
                const result = await db.query(
                    `INSERT INTO products (name, price, category, stock, location, image_url, rfid_tag, map_x, map_y, description, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [
                        product.name.trim(),
                        parseFloat(product.price),
                        category,
                        parseInt(product.stock),
                        location,
                        product.image_url || null,
                        product.rfid_tag || null,
                        mapX,
                        mapY,
                        product.description || ''
                    ]
                );
                
                results.push({
                    row: i + 1,
                    id: result.insertId,
                    name: product.name,
                    status: 'success'
                });
                
            } catch (err) {
                console.error(`Error processing row ${i + 1}:`, err);
                errors.push({
                    row: i + 1,
                    error: err.message,
                    data: product
                });
            }
        }
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        console.log(`✅ Bulk upload completed: ${results.length} successful, ${errors.length} failed by admin ${req.user.username}`);
        
        res.json({
            message: 'Bulk upload completed',
            results: {
                total: products.length,
                successful: results.length,
                failed: errors.length,
                products: results,
                errors: errors
            },
            uiHint: `Bulk upload completed! ${results.length} products added, ${errors.length} failed.`
        });
        
    } catch (err) {
        console.error('Bulk upload error:', err);
        
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
            error: 'Failed to process bulk upload',
            uiHint: 'Please check your CSV format and try again'
        });
    }
});

// Get CSV template for bulk upload
router.get('/csv-template', (req, res) => {
    const csvTemplate = `name,price,category,stock,location,rfid_tag,description,image_url
Red Apples,2.59,fruits,50,Aisle 1 • Shelf A,APPLE001,Fresh red apples,
Whole Wheat Bread,1.99,bakery,25,Aisle 2 • Shelf B,BREAD001,Healthy whole wheat bread,
Fresh Milk,3.49,dairy,30,Aisle 3 • Shelf C,MILK001,Fresh dairy milk,
Orange Juice,2.79,beverages,35,Aisle 4 • Shelf D,JUICE001,100% pure orange juice,
Chicken Breast,7.99,meat,12,Aisle 5 • Shelf E,CHICKEN001,Fresh chicken breast,`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products-template.csv');
    res.send(csvTemplate);
});

// Update product (Admin only - enhanced for original UI with image support)
router.put('/:id', authenticateToken, requireAdmin, uploadProductImage.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, price, category, stock, location, rfid_tag, map_x, map_y, description } = req.body;
    
    if (isNaN(id)) {
        return res.status(400).json({ 
            error: 'Invalid product ID',
            uiHint: 'Please select a valid product'
        });
    }
    
    try {
        // For demo admin, simulate successful update
        if (req.user.id >= 998) {
            console.log(`✅ Demo product updated: ${name} (ID: ${id}) by demo admin ${req.user.username}`);
            
            return res.json({ 
                message: 'Product updated successfully',
                id: id,
                uiHint: 'Product updated in catalog!'
            });
        }
        
        // Check if product exists
        const existingProduct = await db.query('SELECT id, image_url FROM products WHERE id = ?', [parseInt(id)]);
        if (existingProduct.length === 0) {
            return res.status(404).json({ 
                error: 'Product not found',
                uiHint: 'This product may no longer exist'
            });
        }
        
        // Check if RFID tag already exists on another product (if provided)
        if (rfid_tag) {
            const existingRFID = await db.query(
                'SELECT id FROM products WHERE rfid_tag = ? AND id != ?',
                [rfid_tag, parseInt(id)]
            );
            
            if (existingRFID.length > 0) {
                return res.status(409).json({ 
                    error: 'RFID tag already exists on another product',
                    uiHint: 'Please use a different RFID tag'
                });
            }
        }
        
        // Handle image update
        let imageUrl = existingProduct[0].image_url; // Keep existing image by default
        if (req.file) {
            // Delete old image if it exists
            if (imageUrl && imageUrl.startsWith('/uploads/')) {
                const oldImagePath = path.join(__dirname, '..', imageUrl);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            imageUrl = `/uploads/products/${req.file.filename}`;
        }
        
        // Set default location based on category
        const defaultLocation = location || `Aisle ${AISLE_MAPPING[category] || 1} • Shelf A`;
        const defaultMapX = map_x || (AISLE_MAPPING[category] * 100) || 100;
        const defaultMapY = map_y || 150;
        
        await db.query(
            `UPDATE products SET 
             name = ?, price = ?, category = ?, stock = ?, location = ?, 
             image_url = ?, rfid_tag = ?, map_x = ?, map_y = ?, description = ?, updated_at = NOW() 
             WHERE id = ?`,
            [name, price, category, stock, defaultLocation, imageUrl, rfid_tag || null, defaultMapX, defaultMapY, description || '', parseInt(id)]
        );
        
        console.log(`✅ Product updated: ${name} (ID: ${id}) by admin ${req.user.username}`);
        
        res.json({ 
            message: 'Product updated successfully',
            id: id,
            uiHint: 'Product updated successfully!'
        });
    } catch (err) {
        console.error('Update product error:', err);
        res.status(500).json({ 
            error: 'Failed to update product',
            uiHint: 'Please try again'
        });
    }
});

// Update product stock (Admin only - enhanced for original UI)
router.patch('/:id/stock', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { stock } = req.body;
    
    if (isNaN(id) || isNaN(stock) || parseInt(stock) < 0) {
        return res.status(400).json({ 
            error: 'Invalid product ID or stock value',
            uiHint: 'Please enter a valid stock number'
        });
    }
    
    try {
        // For demo admin, simulate successful update
        if (req.user.id >= 998) {
            console.log(`✅ Demo stock updated for product ID: ${id} to ${stock} by demo admin ${req.user.username}`);
            
            return res.json({ 
                message: 'Stock updated successfully',
                uiHint: 'Product stock updated!'
            });
        }
        
        const result = await db.query(
            'UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?',
            [parseInt(stock), parseInt(id)]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                error: 'Product not found',
                uiHint: 'This product may no longer exist'
            });
        }
        
        console.log(`✅ Stock updated for product ID: ${id} to ${stock} by admin ${req.user.username}`);
        
        res.json({ 
            message: 'Stock updated successfully',
            uiHint: 'Stock updated successfully!'
        });
    } catch (err) {
        console.error('Update stock error:', err);
        res.status(500).json({ 
            error: 'Failed to update stock',
            uiHint: 'Please try again'
        });
    }
});

// Delete product (Admin only - enhanced for original UI)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    
    if (isNaN(id)) {
        return res.status(400).json({ 
            error: 'Invalid product ID',
            uiHint: 'Please select a valid product'
        });
    }
    
    try {
        // For demo admin, simulate successful deletion
        if (req.user.id >= 998) {
            console.log(`✅ Demo product deleted: ID ${id} by demo admin ${req.user.username}`);
            
            return res.json({ 
                message: 'Product deleted successfully',
                uiHint: 'Product removed from catalog!'
            });
        }
        
        // Check if product exists and get image URL
        const existingProduct = await db.query('SELECT name, image_url FROM products WHERE id = ?', [parseInt(id)]);
        if (existingProduct.length === 0) {
            return res.status(404).json({ 
                error: 'Product not found',
                uiHint: 'This product may no longer exist'
            });
        }
        
        // Check if product is in any carts or orders (optional safety check)
        const inUse = await db.query(
            'SELECT COUNT(*) as count FROM cart_items WHERE product_id = ?',
            [parseInt(id)]
        );
        
        if (inUse[0].count > 0) {
            return res.status(409).json({ 
                error: 'Cannot delete product that is currently in shopping carts',
                uiHint: 'Remove this product from all carts first'
            });
        }
        
        // Delete associated image file
        const imageUrl = existingProduct[0].image_url;
        if (imageUrl && imageUrl.startsWith('/uploads/')) {
            const imagePath = path.join(__dirname, '..', imageUrl);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        await db.query('DELETE FROM products WHERE id = ?', [parseInt(id)]);
        
        console.log(`✅ Product deleted: ${existingProduct[0].name} (ID: ${id}) by admin ${req.user.username}`);
        
        res.json({ 
            message: 'Product deleted successfully',
            uiHint: 'Product deleted successfully!'
        });
    } catch (err) {
        console.error('Delete product error:', err);
        res.status(500).json({ 
            error: 'Failed to delete product',
            uiHint: 'Please try again'
        });
    }
});

// Bulk product management (Admin only)
router.post('/bulk-add', authenticateToken, requireAdmin, async (req, res) => {
    const { products } = req.body;
    
    try {
        const results = [];
        await db.transaction(async (conn) => {
            for (const product of products) {
                const result = await conn.query(`
                    INSERT INTO products 
                    (name, price, category, stock, location, aisle_number, map_x, map_y, rfid_tag, image_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    product.name, product.price, product.category, product.stock,
                    product.location, product.aisle, product.map_x, product.map_y, 
                    product.rfid_tag, product.image_url
                ]);
                results.push({ id: result.insertId, name: product.name });
            }
        });
        
        res.json({ message: `${results.length} products added successfully`, products: results });
    } catch (err) {
        console.error('Bulk add products error:', err);
        res.status(500).json({ error: 'Failed to add products in bulk' });
    }
});

// Utility function to get product emoji for original UI
function getProductEmoji(category) {
    const emojis = {
        'fruits': '🍎',
        'bakery': '🍞',
        'dairy': '🥛',
        'beverages': '🥤',
        'meat': '🥩',
        'vegetables': '🥕',
        'snacks': '🍿',
        'frozen': '🧊',
        'household': '🧽',
        'personal care': '🧴',
        'electronics': '📱'
    };
    
    return emojis[category?.toLowerCase()] || '📦';
}

module.exports = router;
