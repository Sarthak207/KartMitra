// routes/products.js - Enhanced Products API with MariaDB
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db } = require('../db');

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'smart_cart_secret_key_change_in_production', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Input validation middleware for products
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
        return res.status(400).json({ error: errors.join(', ') });
    }
    
    // Sanitize inputs
    req.body.name = name.trim();
    req.body.category = category.trim();
    req.body.location = req.body.location ? req.body.location.trim() : '';
    req.body.price = parseFloat(price);
    req.body.stock = stock !== undefined ? parseInt(stock) : 0;
    
    next();
};

// Get all products with filtering, search, and pagination
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            category,
            search,
            minPrice,
            maxPrice,
            inStock,
            sortBy = 'name',
            sortOrder = 'ASC'
        } = req.query;
        
        // Validate pagination parameters
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
        const offset = (pageNum - 1) * limitNum;
        
        // Validate sort parameters
        const validSortFields = ['name', 'price', 'category', 'stock', 'created_at'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
        const sortDir = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        
        // Build WHERE clause
        let whereConditions = [];
        let queryParams = [];
        
        if (category) {
            whereConditions.push('category = ?');
            queryParams.push(category);
        }
        
        if (search) {
            whereConditions.push('(name LIKE ? OR category LIKE ? OR location LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }
        
        if (minPrice) {
            whereConditions.push('price >= ?');
            queryParams.push(parseFloat(minPrice));
        }
        
        if (maxPrice) {
            whereConditions.push('price <= ?');
            queryParams.push(parseFloat(maxPrice));
        }
        
        if (inStock === 'true') {
            whereConditions.push('stock > 0');
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // Get total count for pagination
        const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
        const countResult = await db.query(countQuery, queryParams);
        const totalItems = countResult[0].total;
        
        // Get products
        const productsQuery = `
            SELECT id, name, price, category, stock, location, image_url, rfid_tag, map_x, map_y, created_at, updated_at
            FROM products 
            ${whereClause}
            ORDER BY ${sortField} ${sortDir}
            LIMIT ? OFFSET ?
        `;
        
        const products = await db.query(productsQuery, [...queryParams, limitNum, offset]);
        
        // Calculate pagination info
        const totalPages = Math.ceil(totalItems / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;
        
        res.json({
            products,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalItems,
                itemsPerPage: limitNum,
                hasNextPage,
                hasPrevPage
            },
            filters: {
                category,
                search,
                minPrice,
                maxPrice,
                inStock,
                sortBy: sortField,
                sortOrder: sortDir
            }
        });
    } catch (err) {
        console.error('Get products error:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get product categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await db.query(
            'SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY category'
        );
        res.json(categories);
    } catch (err) {
        console.error('Get categories error:', err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    try {
        const product = await db.query(
            'SELECT * FROM products WHERE id = ?', 
            [parseInt(id)]
        );
        
        if (product.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(product[0]);
    } catch (err) {
        console.error('Get product by ID error:', err);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Get product by RFID tag
router.get('/rfid/:tag', async (req, res) => {
    const { tag } = req.params;
    
    if (!tag || tag.trim().length === 0) {
        return res.status(400).json({ error: 'RFID tag is required' });
    }
    
    try {
        const product = await db.query(
            'SELECT * FROM products WHERE rfid_tag = ?', 
            [tag.trim()]
        );
        
        if (product.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(product[0]);
    } catch (err) {
        console.error('Get product by RFID error:', err);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Add new product (Admin only)
router.post('/', authenticateToken, requireAdmin, validateProduct, async (req, res) => {
    const { name, price, category, stock, location, image_url, rfid_tag, map_x, map_y } = req.body;
    
    try {
        // Check if RFID tag already exists (if provided)
        if (rfid_tag) {
            const existingRFID = await db.query(
                'SELECT id FROM products WHERE rfid_tag = ?',
                [rfid_tag]
            );
            
            if (existingRFID.length > 0) {
                return res.status(409).json({ error: 'RFID tag already exists' });
            }
        }
        
        const result = await db.query(
            `INSERT INTO products (name, price, category, stock, location, image_url, rfid_tag, map_x, map_y, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [name, price, category, stock, location || '', image_url || '', rfid_tag || null, map_x || 0, map_y || 0]
        );
        
        console.log(`✅ Product added: ${name} (ID: ${result.insertId}) by admin ${req.user.username}`);
        
        res.status(201).json({ 
            id: result.insertId.toString(), 
            message: 'Product added successfully',
            product: {
                id: result.insertId.toString(),
                name,
                price,
                category,
                stock,
                location: location || '',
                image_url: image_url || '',
                rfid_tag: rfid_tag || null
            }
        });
    } catch (err) {
        console.error('Add product error:', err);
        
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Product with this RFID tag already exists' });
        }
        
        res.status(500).json({ error: 'Failed to add product' });
    }
});

// Update product (Admin only)
router.put('/:id', authenticateToken, requireAdmin, validateProduct, async (req, res) => {
    const { id } = req.params;
    const { name, price, category, stock, location, image_url, rfid_tag, map_x, map_y } = req.body;
    
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    try {
        // Check if product exists
        const existingProduct = await db.query('SELECT id FROM products WHERE id = ?', [parseInt(id)]);
        if (existingProduct.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Check if RFID tag already exists on another product (if provided)
        if (rfid_tag) {
            const existingRFID = await db.query(
                'SELECT id FROM products WHERE rfid_tag = ? AND id != ?',
                [rfid_tag, parseInt(id)]
            );
            
            if (existingRFID.length > 0) {
                return res.status(409).json({ error: 'RFID tag already exists on another product' });
            }
        }
        
        await db.query(
            `UPDATE products SET 
             name = ?, price = ?, category = ?, stock = ?, location = ?, 
             image_url = ?, rfid_tag = ?, map_x = ?, map_y = ?, updated_at = NOW() 
             WHERE id = ?`,
            [name, price, category, stock, location || '', image_url || '', rfid_tag || null, map_x || 0, map_y || 0, parseInt(id)]
        );
        
        console.log(`✅ Product updated: ${name} (ID: ${id}) by admin ${req.user.username}`);
        
        res.json({ 
            message: 'Product updated successfully',
            id: id
        });
    } catch (err) {
        console.error('Update product error:', err);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Update product stock (Admin only)
router.patch('/:id/stock', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { stock } = req.body;
    
    if (isNaN(id) || isNaN(stock) || parseInt(stock) < 0) {
        return res.status(400).json({ error: 'Invalid product ID or stock value' });
    }
    
    try {
        const result = await db.query(
            'UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?',
            [parseInt(stock), parseInt(id)]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json({ message: 'Stock updated successfully' });
    } catch (err) {
        console.error('Update stock error:', err);
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

// Delete product (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    try {
        // Check if product exists
        const existingProduct = await db.query('SELECT name FROM products WHERE id = ?', [parseInt(id)]);
        if (existingProduct.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Check if product is in any carts or orders (optional safety check)
        const inUse = await db.query(
            'SELECT COUNT(*) as count FROM cart_items WHERE product_id = ?',
            [parseInt(id)]
        );
        
        if (inUse[0].count > 0) {
            return res.status(409).json({ 
                error: 'Cannot delete product that is currently in shopping carts' 
            });
        }
        
        await db.query('DELETE FROM products WHERE id = ?', [parseInt(id)]);
        
        console.log(`✅ Product deleted: ${existingProduct[0].name} (ID: ${id}) by admin ${req.user.username}`);
        
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error('Delete product error:', err);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

module.exports = router;
