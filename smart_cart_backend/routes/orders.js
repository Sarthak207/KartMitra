// routes/orders.js - Orders API with MariaDB
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Get all orders for a user
router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        const orders = await conn.query(
            'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    } finally {
        if (conn) conn.release();
    }
});

// Get all orders (admin only)
router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const orders = await conn.query(`
            SELECT o.*, u.name as user_name 
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC
        `);
        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    } finally {
        if (conn) conn.release();
    }
});

// Create new order
router.post('/', async (req, res) => {
    const { userId, items, total, paymentMethod } = req.body;
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Start transaction
        await conn.beginTransaction();
        
        // Create order
        const orderResult = await conn.query(
            'INSERT INTO orders (user_id, total, status, payment_method) VALUES (?, ?, ?, ?)',
            [userId, total, 'completed', paymentMethod]
        );
        
        const orderId = orderResult.insertId;
        
        // Add order items
        for (const item of items) {
            await conn.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.id, item.quantity, item.price]
            );
            
            // Update product stock
            await conn.query(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.id]
            );
        }
        
        await conn.commit();
        res.json({ id: orderId, message: 'Order created successfully' });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to create order' });
    } finally {
        if (conn) conn.release();
    }
});

// Update order status
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Order status updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update order status' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
