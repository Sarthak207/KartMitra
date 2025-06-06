// routes/orders.js - Orders API for Original SmartCart UI
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db } = require('../db');

// Demo user support for original UI
const DEMO_USERS = {
    999: { id: 999, username: 'demo', role: 'customer', name: 'Demo User' },
    998: { id: 998, username: 'admin', role: 'admin', name: 'Admin User' }
};

// Authentication middleware (enhanced for original UI with demo support)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Access token required',
            uiHint: 'Please login to access order features'
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

// User authorization middleware
const authorizeUser = (req, res, next) => {
    const { userId } = req.params;
    
    if (req.user.id.toString() !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ 
            error: 'Access denied',
            uiHint: 'You can only view your own orders'
        });
    }
    
    next();
};

// Order validation middleware (optimized for original UI checkout)
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
    
    // Validate items structure for original UI products
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
        return res.status(400).json({ 
            error: errors.join(', '),
            uiHint: 'Please check your cart items and try again'
        });
    }
    
    // Sanitize inputs
    req.body.userId = parseInt(userId);
    req.body.total = parseFloat(total);
    req.body.paymentMethod = paymentMethod.trim();
    
    next();
};

// Get all orders for a user (optimized for original UI)
router.get('/user/:userId', authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    
    try {
        // For demo users, return demo orders
        if (parseInt(userId) >= 998) {
            const demoOrders = [
                {
                    id: 1001,
                    total: 8.67,
                    status: 'delivered',
                    payment_method: 'cash',
                    created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                    updated_at: new Date().toISOString(),
                    item_count: 2,
                    items: [
                        {
                            product_id: 1,
                            quantity: 2,
                            price: 2.59,
                            name: 'Red Apples',
                            category: 'fruits',
                            image_url: null
                        },
                        {
                            product_id: 3,
                            quantity: 1,
                            price: 3.49,
                            name: 'Fresh Milk',
                            category: 'dairy',
                            image_url: null
                        }
                    ]
                },
                {
                    id: 1002,
                    total: 5.98,
                    status: 'pending',
                    payment_method: 'card',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    item_count: 2,
                    items: [
                        {
                            product_id: 2,
                            quantity: 3,
                            price: 1.99,
                            name: 'Whole Wheat Bread',
                            category: 'bakery',
                            image_url: null
                        }
                    ]
                }
            ];
            
            return res.json({
                orders: demoOrders,
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalOrders: 2,
                    ordersPerPage: 10,
                    hasNextPage: false,
                    hasPrevPage: false
                },
                isDemoData: true
            });
        }
        
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
            },
            isDemoData: false
        });
    } catch (err) {
        console.error('Get user orders error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch orders',
            uiHint: 'Please refresh and try again'
        });
    }
});

// Get single order details (optimized for original UI)
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    
    if (isNaN(id)) {
        return res.status(400).json({ 
            error: 'Invalid order ID',
            uiHint: 'Please select a valid order'
        });
    }
    
    try {
        // For demo orders
        if (parseInt(id) >= 1000) {
            const demoOrder = {
                id: parseInt(id),
                user_id: 999,
                total: 8.67,
                status: 'delivered',
                payment_method: 'cash',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                user_name: 'Demo User',
                user_email: 'demo@smartcart.com',
                items: [
                    {
                        product_id: 1,
                        quantity: 2,
                        price: 2.59,
                        subtotal: 5.18,
                        name: 'Red Apples',
                        category: 'fruits',
                        image_url: null
                    },
                    {
                        product_id: 3,
                        quantity: 1,
                        price: 3.49,
                        subtotal: 3.49,
                        name: 'Fresh Milk',
                        category: 'dairy',
                        image_url: null
                    }
                ]
            };
            
            return res.json(demoOrder);
        }
        
        // Get order details from database
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
            return res.status(404).json({ 
                error: 'Order not found',
                uiHint: 'This order may not exist'
            });
        }
        
        const order = orders[0];
        
        // Check authorization
        if (req.user.id.toString() !== order.user_id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ 
                error: 'Access denied',
                uiHint: 'You can only view your own orders'
            });
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
        res.status(500).json({ 
            error: 'Failed to fetch order details',
            uiHint: 'Please try again'
        });
    }
});

// Create new order from cart (optimized for original UI checkout)
router.post('/create-from-cart', authenticateToken, async (req, res) => {
    const { paymentMethod = 'cash' } = req.body;
    const userId = req.user.id;
    
    try {
        // For demo users, simulate successful order creation
        if (userId >= 998) {
            const demoOrderId = Math.floor(Math.random() * 1000) + 1000;
            console.log(`✅ Demo order created: ID ${demoOrderId} for demo user ${userId}`);
            
            return res.status(201).json({ 
                id: demoOrderId.toString(), 
                message: 'Order created successfully',
                status: 'pending',
                total: 8.67,
                itemCount: 2,
                success: true,
                uiHint: 'Order placed! You can track it in your order history.'
            });
        }
        
        const result = await db.transaction(async (conn) => {
            // Get cart items
            const cartItems = await conn.query(`
                SELECT 
                    ci.product_id,
                    ci.quantity,
                    p.name,
                    p.price,
                    p.stock,
                    (ci.quantity * p.price) as subtotal
                FROM cart_items ci
                JOIN products p ON ci.product_id = p.id
                WHERE ci.user_id = ?
            `, [userId]);
            
            if (cartItems.length === 0) {
                throw new Error('Cart is empty');
            }
            
            // Verify stock availability for original UI products
            for (const item of cartItems) {
                if (item.stock < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.name}. Available: ${item.stock}, Requested: ${item.quantity}`);
                }
            }
            
            // Calculate total
            const total = cartItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
            
            // Create order
            const orderResult = await conn.query(
                'INSERT INTO orders (user_id, total, status, payment_method, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
                [userId, total, 'pending', paymentMethod]
            );
            
            const orderId = orderResult.insertId;
            
            // Add order items and update stock
            for (const item of cartItems) {
                await conn.query(
                    'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                    [orderId, item.product_id, item.quantity, item.price]
                );
                
                // Update product stock
                await conn.query(
                    'UPDATE products SET stock = stock - ?, updated_at = NOW() WHERE id = ?',
                    [item.quantity, item.product_id]
                );
            }
            
            // Clear user's cart
            await conn.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
            
            return { orderId, total, itemCount: cartItems.length };
        });
        
        console.log(`✅ Order created from cart: ID ${result.orderId} for user ${userId}, total: ₹${result.total}`);
        
        res.status(201).json({ 
            id: result.orderId.toString(), 
            message: 'Order created successfully',
            status: 'pending',
            total: result.total,
            itemCount: result.itemCount,
            success: true,
            uiHint: 'Order placed successfully! Cart has been cleared.'
        });
    } catch (err) {
        console.error('Create order from cart error:', err);
        
        if (err.message.includes('empty') || err.message.includes('Insufficient stock')) {
            return res.status(400).json({ 
                error: err.message,
                uiHint: 'Please check your cart and try again'
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to create order',
            uiHint: 'Please try again or contact support'
        });
    }
});

// Create new order (manual - for original UI)
router.post('/', authenticateToken, validateOrder, async (req, res) => {
    const { userId, items, total, paymentMethod } = req.body;
    
    // Verify user can create order for this userId
    if (req.user.id.toString() !== userId.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ 
            error: 'Cannot create order for another user',
            uiHint: 'You can only create orders for yourself'
        });
    }
    
    try {
        // For demo users, simulate successful order creation
        if (userId >= 998) {
            const demoOrderId = Math.floor(Math.random() * 1000) + 1000;
            console.log(`✅ Demo manual order created: ID ${demoOrderId} for demo user ${userId}, total: ₹${total}`);
            
            return res.status(201).json({ 
                id: demoOrderId.toString(), 
                message: 'Order created successfully',
                status: 'pending',
                total: total,
                success: true,
                uiHint: 'Order placed successfully!'
            });
        }
        
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
                    throw new Error(`Price mismatch for ${product.name}. Current price: ₹${product.price}`);
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
            
            return orderId;
        });
        
        console.log(`✅ Order created: ID ${result} for user ${userId}, total: ₹${total}`);
        
        res.status(201).json({ 
            id: result.toString(), 
            message: 'Order created successfully',
            status: 'pending',
            total: total,
            success: true,
            uiHint: 'Order placed successfully!'
        });
    } catch (err) {
        console.error('Create order error:', err);
        
        if (err.message.includes('not found') || err.message.includes('Insufficient stock') || err.message.includes('Price mismatch')) {
            return res.status(400).json({ 
                error: err.message,
                uiHint: 'Please check product availability and try again'
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to create order',
            uiHint: 'Please try again or contact support'
        });
    }
});

// Get all orders (admin only - enhanced for original UI)
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
        res.status(500).json({ 
            error: 'Failed to fetch orders',
            uiHint: 'Please refresh and try again'
        });
    }
});

// Update order status (admin only - enhanced for original UI)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ 
            error: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`,
            uiHint: 'Please select a valid order status'
        });
    }
    
    if (isNaN(id)) {
        return res.status(400).json({ 
            error: 'Invalid order ID',
            uiHint: 'Please select a valid order'
        });
    }
    
    try {
        // For demo orders, simulate successful update
        if (parseInt(id) >= 1000) {
            console.log(`✅ Demo order ${id} status updated to ${status} by admin ${req.user.username}`);
            
            return res.json({ 
                message: 'Order status updated successfully',
                orderId: id,
                previousStatus: 'pending',
                newStatus: status,
                success: true,
                uiHint: 'Demo order status updated!'
            });
        }
        
        // Check if order exists
        const orders = await db.query('SELECT id, status FROM orders WHERE id = ?', [parseInt(id)]);
        
        if (orders.length === 0) {
            return res.status(404).json({ 
                error: 'Order not found',
                uiHint: 'This order may not exist'
            });
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
            newStatus: status,
            success: true,
            uiHint: 'Order status updated successfully!'
        });
    } catch (err) {
        console.error('Update order status error:', err);
        res.status(500).json({ 
            error: 'Failed to update order status',
            uiHint: 'Please try again'
        });
    }
});

// Get order statistics (admin only - enhanced for original UI)
router.get('/stats/summary', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(total) as total_revenue,
                AVG(total) as average_order_value,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
                COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
            FROM orders
        `);
        
        res.json({
            ...stats[0],
            currency: 'INR',
            period: 'All time',
            lastUpdated: new Date().toISOString()
        });
    } catch (err) {
        console.error('Get order stats error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch order statistics',
            uiHint: 'Statistics temporarily unavailable'
        });
    }
});

module.exports = router;
