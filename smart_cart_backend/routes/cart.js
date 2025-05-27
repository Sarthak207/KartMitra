// routes/cart.js - Cart API with MariaDB
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Get cart items for user (stored in session/memory for now)
let userCarts = {}; // In production, use Redis or database

router.get('/:userId', (req, res) => {
    const { userId } = req.params;
    const cart = userCarts[userId] || [];
    res.json(cart);
});

// Add item to cart
router.post('/:userId/add', async (req, res) => {
    const { userId } = req.params;
    const { productId, quantity = 1 } = req.body;
    let conn;
    
    try {
        conn = await pool.getConnection();
        
        // Get product details
        const products = await conn.query('SELECT * FROM products WHERE id = ?', [productId]);
        if (products.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const product = products[0];
        
        // Initialize cart if doesn't exist
        if (!userCarts[userId]) {
            userCarts[userId] = [];
        }
        
        // Check if item already in cart
        const existingItemIndex = userCarts[userId].findIndex(item => item.id === productId);
        
        if (existingItemIndex > -1) {
            userCarts[userId][existingItemIndex].quantity += quantity;
        } else {
            userCarts[userId].push({
                ...product,
                quantity: quantity
            });
        }
        
        res.json({ message: 'Item added to cart', cart: userCarts[userId] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add item to cart' });
    } finally {
        if (conn) conn.release();
    }
});

// Remove item from cart
router.delete('/:userId/remove/:productId', (req, res) => {
    const { userId, productId } = req.params;
    
    if (userCarts[userId]) {
        userCarts[userId] = userCarts[userId].filter(item => item.id != productId);
    }
    
    res.json({ message: 'Item removed from cart', cart: userCarts[userId] || [] });
});

// Update item quantity
router.put('/:userId/update', (req, res) => {
    const { userId } = req.params;
    const { productId, quantity } = req.body;
    
    if (userCarts[userId]) {
        const itemIndex = userCarts[userId].findIndex(item => item.id == productId);
        if (itemIndex > -1) {
            if (quantity <= 0) {
                userCarts[userId].splice(itemIndex, 1);
            } else {
                userCarts[userId][itemIndex].quantity = quantity;
            }
        }
    }
    
    res.json({ message: 'Cart updated', cart: userCarts[userId] || [] });
});

// Clear cart
router.delete('/:userId/clear', (req, res) => {
    const { userId } = req.params;
    userCarts[userId] = [];
    res.json({ message: 'Cart cleared' });
});

module.exports = router;
