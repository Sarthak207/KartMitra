// routes/admin.js - Admin Management API
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db } = require('../db');

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Admin access token required' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smart_cart_secret_key_change_in_production');
        
        // Check if user is admin (including demo admin)
        if (decoded.id === 998 || decoded.role === 'admin') {
            req.user = decoded;
            next();
        } else {
            return res.status(403).json({ error: 'Admin privileges required' });
        }
    } catch (err) {
        return res.status(401).json({ error: 'Invalid admin token' });
    }
};

// Store Map Management
router.get('/store-layout', requireAdmin, async (req, res) => {
    try {
        // Get current store layout
        const layout = await db.query(`
            SELECT 
                aisle_number,
                aisle_name,
                category,
                position_x,
                position_y,
                width,
                height
            FROM store_layout 
            ORDER BY aisle_number
        `);
        
        res.json({ layout });
    } catch (err) {
        console.error('Get store layout error:', err);
        res.status(500).json({ error: 'Failed to fetch store layout' });
    }
});

router.post('/store-layout', requireAdmin, async (req, res) => {
    const { aisles } = req.body;
    
    try {
        await db.transaction(async (conn) => {
            // Clear existing layout
            await conn.query('DELETE FROM store_layout');
            
            // Insert new layout
            for (const aisle of aisles) {
                await conn.query(`
                    INSERT INTO store_layout 
                    (aisle_number, aisle_name, category, position_x, position_y, width, height)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [aisle.number, aisle.name, aisle.category, aisle.x, aisle.y, aisle.width, aisle.height]);
            }
        });
        
        console.log(`✅ Store layout updated by admin ${req.user.username}`);
        res.json({ message: 'Store layout updated successfully' });
    } catch (err) {
        console.error('Update store layout error:', err);
        res.status(500).json({ error: 'Failed to update store layout' });
    }
});

// Bulk Product Management
router.post('/products/bulk-add', requireAdmin, async (req, res) => {
    const { products } = req.body;
    
    try {
        const results = [];
        
        await db.transaction(async (conn) => {
            for (const product of products) {
                const result = await conn.query(`
                    INSERT INTO products 
                    (name, price, category, stock, location, aisle_number, map_x, map_y, rfid_tag)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    product.name,
                    product.price,
                    product.category,
                    product.stock,
                    product.location,
                    product.aisle,
                    product.map_x,
                    product.map_y,
                    product.rfid_tag
                ]);
                
                results.push({ id: result.insertId, name: product.name });
            }
        });
        
        console.log(`✅ Bulk products added: ${results.length} items by admin ${req.user.username}`);
        res.json({ message: `${results.length} products added successfully`, products: results });
    } catch (err) {
        console.error('Bulk add products error:', err);
        res.status(500).json({ error: 'Failed to add products in bulk' });
    }
});

// Analytics Dashboard
router.get('/analytics/dashboard', requireAdmin, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM products) as total_products,
                (SELECT COUNT(*) FROM orders) as total_orders,
                (SELECT COUNT(DISTINCT user_id) FROM orders) as total_customers,
                (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'delivered') as total_revenue,
                (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
                (SELECT AVG(total) FROM orders WHERE status = 'delivered') as avg_order_value
        `);
        
        // Get popular products
        const popularProducts = await db.query(`
            SELECT 
                p.name,
                p.category,
                SUM(oi.quantity) as total_sold,
                SUM(oi.quantity * oi.price) as revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'delivered'
            GROUP BY p.id
            ORDER BY total_sold DESC
            LIMIT 10
        `);
        
        // Get recent activity
        const recentActivity = await db.query(`
            SELECT 
                o.id as order_id,
                u.name as customer_name,
                o.total,
                o.status,
                o.created_at
            FROM orders o
            JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `);
        
        res.json({
            stats: stats[0],
            popularProducts,
            recentActivity
        });
    } catch (err) {
        console.error('Get analytics error:', err);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});

// Customer Management
router.get('/customers', requireAdmin, async (req, res) => {
    try {
        const customers = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.created_at,
                u.last_login,
                COUNT(o.id) as total_orders,
                COALESCE(SUM(o.total), 0) as total_spent
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'delivered'
            WHERE u.role = 'customer'
            GROUP BY u.id
            ORDER BY total_spent DESC
        `);
        
        res.json({ customers });
    } catch (err) {
        console.error('Get customers error:', err);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// Order Management
router.get('/orders', requireAdmin, async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    
    try {
        let whereClause = '';
        let queryParams = [];
        
        if (status) {
            whereClause = 'WHERE o.status = ?';
            queryParams.push(status);
        }
        
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;
        
        const orders = await db.query(`
            SELECT 
                o.id,
                o.user_id,
                u.name as customer_name,
                u.email as customer_email,
                o.total,
                o.status,
                o.payment_method,
                o.created_at,
                COUNT(oi.id) as item_count
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            ${whereClause}
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limitNum, offset]);
        
        res.json({ orders });
    } catch (err) {
        console.error('Get admin orders error:', err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Update order status
router.put('/orders/:id/status', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    try {
        await db.query(
            'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, parseInt(id)]
        );
        
        console.log(`✅ Order ${id} status updated to ${status} by admin ${req.user.username}`);
        res.json({ message: 'Order status updated successfully' });
    } catch (err) {
        console.error('Update order status error:', err);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Store Settings
router.get('/settings', requireAdmin, async (req, res) => {
    try {
        const settings = await db.query('SELECT * FROM store_settings LIMIT 1');
        res.json({ settings: settings[0] || {} });
    } catch (err) {
        console.error('Get settings error:', err);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

router.post('/settings', requireAdmin, async (req, res) => {
    const { storeName, currency, taxRate, defaultAisleSize } = req.body;
    
    try {
        await db.query(`
            INSERT INTO store_settings (store_name, currency, tax_rate, default_aisle_size, updated_at)
            VALUES (?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
            store_name = VALUES(store_name),
            currency = VALUES(currency),
            tax_rate = VALUES(tax_rate),
            default_aisle_size = VALUES(default_aisle_size),
            updated_at = NOW()
        `, [storeName, currency, taxRate, defaultAisleSize]);
        
        console.log(`✅ Store settings updated by admin ${req.user.username}`);
        res.json({ message: 'Settings updated successfully' });
    } catch (err) {
        console.error('Update settings error:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
