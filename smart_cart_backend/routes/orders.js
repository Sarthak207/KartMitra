// routes/orders.js - Enhanced Orders API with MariaDB
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

// User authorization middleware
const authorizeUser = (req, res, next) => {
    const { userId } = req.params;
    
    if (req.user.id.toString() !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
};

// Order validation middleware
const validateOrder = (req, res, next) => {
    const { userId, items, total, paymentMethod } = req.body;
    const errors = [];
    
    if (!userId || isNaN(userId)) {
        errors.push('Valid user ID is required');
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
        errors.push('Order must contain at least one item');
    }
    
    if (!total || isNaN(total) || parseFloat(total) <= 0) {
        errors.push('Valid total amount is required');
    }
    
    if (!paymentMethod || paymentMethod.trim().length === 0) {
        errors.push('Payment method is required');
    }
    
    // Validate items structure
    if (items) {
        items.forEach((item, index) => {
            if (!item.id || isNaN(item.id)) {
                errors.push(`Item ${index + 1}: Valid product ID is required`);
            }
            if (!item.quantity || isNaN(item.quantity) || parseInt(item.quantity) <= 0) {
                errors.push(`Item ${index + 1}: Valid quantity is required`);
            }
            if (!item.price || isNaN(item.price) || parseFloat(item.price) <= 0) {
                errors.push(`Item ${index + 1}: Valid price is required`);
            }
        });
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
    }
    
    // Sanitize inputs
    req.body.userId = parseInt(userId);
    req.body.total = parseFloat(total);
    req.body.paymentMethod = paymentMethod.trim();
    
    next();
};

// Get all orders for a user with detailed information
router.get('/user/:userId', authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    
    try {
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;
        
        // Build WHERE clause for status filter
        let whereClause = 'WHERE o.user_id = ?';
        let queryParams = [parseInt(userId)];
        
        if (status) {
            whereClause += ' AND o.status = ?';
            queryParams.push(status);
        }
        
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM orders o ${whereClause}`;
        const countResult = await db.query(countQuery, queryParams);
        const totalOrders = countResult[0].total;
        
        // Get orders with items
        const orders = await db.query(`
            SELECT 
                o.id,
                o.total,
                o.status,
                o.payment_method,
                o.created_at,
                o.updated_at,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            ${whereClause}
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limitNum, offset]);
        
        // Get order items for each order
        for (let order of orders) {
            const items = await db.query(`
                SELECT 
                    oi.product_id,
                    oi.quantity,
                    oi.price,
                    p.name,
                    p.category,
                    p.image_url
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            `, [order.id]);
            
            order.items = items;
        }
        
        const totalPages = Math.ceil(totalOrders / limitNum);
        
        res.json({
            orders,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalOrders,
                ordersPerPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });
    } catch (err) {
        console.error('Get user orders error:', err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get single order details
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid order ID' });
    }
    
    try {
        // Get order details
        const orders = await db.query(`
            SELECT 
                o.*,
                u.name as user_name,
                u.email as user_email
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `, [parseInt(id)]);
        
        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const order = orders[0];
        
        // Check authorization
        if (req.user.id.toString() !== order.user_id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Get order items
        const items = await db.query(`
            SELECT 
                oi.product_id,
                oi.quantity,
                oi.price,
                oi.quantity * oi.price as subtotal,
                p.name,
                p.category,
                p.image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [parseInt(id)]);
        
        order.items = items;
        
        res.json(order);
    } catch (err) {
        console.error('Get order details error:', err);
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
});

// Get all orders (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    const { page = 1, limit = 20, status, userId, startDate, endDate } = req.query;
    
    try {
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;
        
        // Build WHERE clause
        let whereConditions = [];
        let queryParams = [];
        
        if (status) {
            whereConditions.push('o.status = ?');
            queryParams.push(status);
        }
        
        if (userId) {
            whereConditions.push('o.user_id = ?');
            queryParams.push(parseInt(userId));
        }
        
        if (startDate) {
            whereConditions.push('o.created_at >= ?');
            queryParams.push(startDate);
        }
        
        if (endDate) {
            whereConditions.push('o.created_at <= ?');
            queryParams.push(endDate);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM orders o ${whereClause}`;
        const countResult = await db.query(countQuery, queryParams);
        const totalOrders = countResult[0].total;
        
        // Get orders
        const orders = await db.query(`
            SELECT 
                o.id,
                o.user_id,
                o.total,
                o.status,
                o.payment_method,
                o.created_at,
                o.updated_at,
                u.name as user_name,
                u.email as user_email,
                COUNT(oi.id) as item_count
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            LEFT JOIN order_items oi ON o.id = oi.order_id
            ${whereClause}
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limitNum, offset]);
        
        const totalPages = Math.ceil(totalOrders / limitNum);
        
        res.json({
            orders,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalOrders,
                ordersPerPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            },
            filters: {
                status,
                userId,
                startDate,
                endDate
            }
        });
    } catch (err) {
        console.error('Get all orders error:', err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Create new order
router.post('/', authenticateToken, validateOrder, async (req, res) => {
    const { userId, items, total, paymentMethod } = req.body;
    
    // Verify user can create order for this userId
    if (req.user.id.toString() !== userId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Cannot create order for another user' });
    }
    
    try {
        const result = await db.transaction(async (conn) => {
            // Verify all products exist and have sufficient stock
            for (const item of items) {
                const products = await conn.query(
                    'SELECT id, name, stock, price FROM products WHERE id = ?',
                    [item.id]
                );
                
                if (products.length === 0) {
                    throw new Error(`Product with ID ${item.id} not found`);
                }
                
                const product = products[0];
                
                if (product.stock < item.quantity) {
                    throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
                }
                
                // Verify price hasn't changed significantly
                const priceDiff = Math.abs(parseFloat(product.price) - parseFloat(item.price));
                if (priceDiff > 0.01) {
                    throw new Error(`Price mismatch for ${product.name}. Current price: ${product.price}`);
                }
            }
            
            // Create order
            const orderResult = await conn.query(
                'INSERT INTO orders (user_id, total, status, payment_method, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
                [userId, total, 'pending', paymentMethod]
            );
            
            const orderId = orderResult.insertId;
            
            // Add order items and update stock
            for (const item of items) {
                await conn.query(
                    'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                    [orderId, item.id, item.quantity, item.price]
                );
                
                // Update product stock
                await conn.query(
                    'UPDATE products SET stock = stock - ?, updated_at = NOW() WHERE id = ?',
                    [item.quantity, item.id]
                );
            }
            
            // Clear user's cart after successful order
            await conn.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
            
            return orderId;
        });
        
        console.log(`✅ Order created: ID ${result} for user ${userId}, total: $${total}`);
        
        res.status(201).json({ 
            id: result.toString(), 
            message: 'Order created successfully',
            status: 'pending',
            total: total
        });
    } catch (err) {
        console.error('Create order error:', err);
        
        if (err.message.includes('not found') || err.message.includes('Insufficient stock') || err.message.includes('Price mismatch')) {
            return res.status(400).json({ error: err.message });
        }
        
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Update order status (admin only)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ 
            error: `Invalid status. Valid statuses: ${validStatuses.join(', ')}` 
        });
    }
    
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid order ID' });
    }
    
    try {
        // Check if order exists
        const orders = await db.query('SELECT id, status FROM orders WHERE id = ?', [parseInt(id)]);
        
        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const currentStatus = orders[0].status;
        
        // Update order status
        await db.query(
            'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, parseInt(id)]
        );
        
        console.log(`✅ Order ${id} status updated: ${currentStatus} → ${status} by admin ${req.user.username}`);
        
        res.json({ 
            message: 'Order status updated successfully',
            orderId: id,
            previousStatus: currentStatus,
            newStatus: status
        });
    } catch (err) {
        console.error('Update order status error:', err);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Get order statistics (admin only)
router.get('/stats/summary', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(total) as total_revenue,
                AVG(total) as average_order_value,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
            FROM orders
        `);
        
        res.json(stats[0]);
    } catch (err) {
        console.error('Get order stats error:', err);
        res.status(500).json({ error: 'Failed to fetch order statistics' });
    }
});

module.exports = router;
