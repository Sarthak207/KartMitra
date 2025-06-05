// routes/cart.js - Enhanced Cart API with MariaDB Persistence
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

// Authorization middleware - ensure user can only access their own cart
const authorizeUser = (req, res, next) => {
    const { userId } = req.params;
    
    if (req.user.id.toString() !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
};

// Input validation middleware
const validateCartItem = (req, res, next) => {
    const { productId, quantity } = req.body;
    
    if (!productId || isNaN(productId)) {
        return res.status(400).json({ error: 'Valid product ID is required' });
    }
    
    if (quantity !== undefined && (isNaN(quantity) || parseInt(quantity) < 1)) {
        return res.status(400).json({ error: 'Quantity must be a positive number' });
    }
    
    req.body.productId = parseInt(productId);
    req.body.quantity = quantity ? parseInt(quantity) : 1;
    
    next();
};

// Get cart items for user with product details
router.get('/:userId', authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    
    try {
        const cartItems = await db.query(`
            SELECT 
                ci.id as cart_item_id,
                ci.product_id as id,
                ci.quantity,
                ci.added_at,
                p.name,
                p.price,
                p.category,
                p.stock,
                p.location,
                p.image_url,
                (ci.quantity * p.price) as subtotal
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = ?
            ORDER BY ci.added_at DESC
        `, [parseInt(userId)]);
        
        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
        
        res.json({
            items: cartItems,
            total: parseFloat(total.toFixed(2)),
            itemCount: cartItems.length
        });
    } catch (err) {
        console.error('Get cart error:', err);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

// Add item to cart
router.post('/:userId/add', authenticateToken, authorizeUser, validateCartItem, async (req, res) => {
    const { userId } = req.params;
    const { productId, quantity } = req.body;
    
    try {
        // Check if product exists and has sufficient stock
        const products = await db.query(
            'SELECT id, name, price, stock FROM products WHERE id = ?', 
            [productId]
        );
        
        if (products.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const product = products[0];
        
        // Check if product is in stock
        if (product.stock < quantity) {
            return res.status(400).json({ 
                error: `Insufficient stock. Available: ${product.stock}` 
            });
        }
        
        // Check if item already exists in cart
        const existingCartItem = await db.query(
            'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
            [parseInt(userId), productId]
        );
        
        if (existingCartItem.length > 0) {
            // Update existing item quantity
            const newQuantity = existingCartItem[0].quantity + quantity;
            
            // Check total quantity against stock
            if (newQuantity > product.stock) {
                return res.status(400).json({ 
                    error: `Cannot add ${quantity} more. Total would exceed available stock (${product.stock})` 
                });
            }
            
            await db.query(
                'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ?',
                [newQuantity, existingCartItem[0].id]
            );
        } else {
            // Add new item to cart
            await db.query(
                'INSERT INTO cart_items (user_id, product_id, quantity, added_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
                [parseInt(userId), productId, quantity]
            );
        }
        
        // Get updated cart
        const updatedCart = await db.query(`
            SELECT 
                ci.id as cart_item_id,
                ci.product_id as id,
                ci.quantity,
                p.name,
                p.price,
                p.category,
                p.stock,
                p.location,
                p.image_url,
                (ci.quantity * p.price) as subtotal
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = ?
            ORDER BY ci.added_at DESC
        `, [parseInt(userId)]);
        
        console.log(`✅ Added to cart: ${product.name} (qty: ${quantity}) for user ${userId}`);
        
        res.json({ 
            message: 'Item added to cart successfully',
            cart: updatedCart,
            addedItem: {
                id: productId,
                name: product.name,
                quantity: quantity
            }
        });
    } catch (err) {
        console.error('Add to cart error:', err);
        res.status(500).json({ error: 'Failed to add item to cart' });
    }
});

// Remove item from cart
router.delete('/:userId/remove/:productId', authenticateToken, authorizeUser, async (req, res) => {
    const { userId, productId } = req.params;
    
    if (isNaN(productId)) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    try {
        // Check if item exists in cart
        const cartItem = await db.query(
            'SELECT id FROM cart_items WHERE user_id = ? AND product_id = ?',
            [parseInt(userId), parseInt(productId)]
        );
        
        if (cartItem.length === 0) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }
        
        // Remove item from cart
        await db.query(
            'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?',
            [parseInt(userId), parseInt(productId)]
        );
        
        // Get updated cart
        const updatedCart = await db.query(`
            SELECT 
                ci.id as cart_item_id,
                ci.product_id as id,
                ci.quantity,
                p.name,
                p.price,
                p.category,
                p.stock,
                p.location,
                p.image_url,
                (ci.quantity * p.price) as subtotal
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = ?
            ORDER BY ci.added_at DESC
        `, [parseInt(userId)]);
        
        console.log(`✅ Removed from cart: Product ${productId} for user ${userId}`);
        
        res.json({ 
            message: 'Item removed from cart',
            cart: updatedCart
        });
    } catch (err) {
        console.error('Remove from cart error:', err);
        res.status(500).json({ error: 'Failed to remove item from cart' });
    }
});

// Update item quantity
router.put('/:userId/update', authenticateToken, authorizeUser, validateCartItem, async (req, res) => {
    const { userId } = req.params;
    const { productId, quantity } = req.body;
    
    try {
        // Check if product exists and has sufficient stock
        const products = await db.query(
            'SELECT id, name, stock FROM products WHERE id = ?', 
            [productId]
        );
        
        if (products.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const product = products[0];
        
        // Check stock availability
        if (quantity > product.stock) {
            return res.status(400).json({ 
                error: `Insufficient stock. Available: ${product.stock}` 
            });
        }
        
        // Check if item exists in cart
        const cartItem = await db.query(
            'SELECT id FROM cart_items WHERE user_id = ? AND product_id = ?',
            [parseInt(userId), productId]
        );
        
        if (cartItem.length === 0) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }
        
        // Update quantity
        await db.query(
            'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE user_id = ? AND product_id = ?',
            [quantity, parseInt(userId), productId]
        );
        
        // Get updated cart
        const updatedCart = await db.query(`
            SELECT 
                ci.id as cart_item_id,
                ci.product_id as id,
                ci.quantity,
                p.name,
                p.price,
                p.category,
                p.stock,
                p.location,
                p.image_url,
                (ci.quantity * p.price) as subtotal
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = ?
            ORDER BY ci.added_at DESC
        `, [parseInt(userId)]);
        
        console.log(`✅ Updated cart: Product ${productId} quantity to ${quantity} for user ${userId}`);
        
        res.json({ 
            message: 'Cart updated successfully',
            cart: updatedCart
        });
    } catch (err) {
        console.error('Update cart error:', err);
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

// Clear cart
router.delete('/:userId/clear', authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    
    try {
        const result = await db.query(
            'DELETE FROM cart_items WHERE user_id = ?',
            [parseInt(userId)]
        );
        
        console.log(`✅ Cleared cart for user ${userId} (${result.affectedRows} items removed)`);
        
        res.json({ 
            message: 'Cart cleared successfully',
            itemsRemoved: result.affectedRows
        });
    } catch (err) {
        console.error('Clear cart error:', err);
        res.status(500).json({ error: 'Failed to clear cart' });
    }
});

// Get cart summary (item count and total)
router.get('/:userId/summary', authenticateToken, authorizeUser, async (req, res) => {
    const { userId } = req.params;
    
    try {
        const summary = await db.query(`
            SELECT 
                COUNT(*) as itemCount,
                COALESCE(SUM(ci.quantity * p.price), 0) as total
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = ?
        `, [parseInt(userId)]);
        
        res.json({
            itemCount: parseInt(summary[0].itemCount),
            total: parseFloat(summary[0].total).toFixed(2)
        });
    } catch (err) {
        console.error('Get cart summary error:', err);
        res.status(500).json({ error: 'Failed to get cart summary' });
    }
});

module.exports = router;
