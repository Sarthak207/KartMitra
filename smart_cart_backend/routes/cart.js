// routes/cart.js - Cart API for Original SmartCart UI
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db } = require('../db');

// Demo user support for original UI
const DEMO_USERS = {
    999: { id: 999, username: 'demo', role: 'customer' },
    998: { id: 998, username: 'admin', role: 'admin' }
};

// Authentication middleware (enhanced for original UI with demo support)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Access token required',
            uiHint: 'Please login to access cart features'
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

// Input validation middleware (optimized for original UI)
const validateCartItem = (req, res, next) => {
    const { product_id, user_id, quantity } = req.body;
    
    // Handle both product_id and productId naming conventions
    const productId = product_id || req.body.productId;
    const userId = user_id || req.body.userId;
    
    if (!productId || isNaN(productId)) {
        return res.status(400).json({ 
            error: 'Valid product ID is required',
            uiHint: 'Please select a valid product from the catalog'
        });
    }
    
    if (quantity !== undefined && (isNaN(quantity) || parseInt(quantity) < 1)) {
        return res.status(400).json({ 
            error: 'Quantity must be a positive number',
            uiHint: 'Please enter a valid quantity'
        });
    }
    
    req.body.product_id = parseInt(productId);
    req.body.user_id = userId ? parseInt(userId) : req.user.id;
    req.body.quantity = quantity ? parseInt(quantity) : 1;
    
    next();
};

// Get cart items for user (optimized for original UI real-time updates)
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        // For demo users, use in-memory cart simulation
        if (parseInt(userId) >= 998) {
            // Demo cart with sample items matching original UI products
            const demoCart = [
                {
                    cart_item_id: 1,
                    id: 1,
                    quantity: 2,
                    added_at: new Date().toISOString(),
                    name: 'Red Apples',
                    price: 2.59,
                    category: 'fruits',
                    stock: 50,
                    location: 'Aisle 1 • Shelf A',
                    image_url: null,
                    subtotal: 5.18
                },
                {
                    cart_item_id: 2,
                    id: 3,
                    quantity: 1,
                    added_at: new Date().toISOString(),
                    name: 'Fresh Milk',
                    price: 3.49,
                    category: 'dairy',
                    stock: 30,
                    location: 'Aisle 3 • Shelf C',
                    image_url: null,
                    subtotal: 3.49
                }
            ];
            
            const total = demoCart.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
            
            return res.json({
                items: demoCart,
                total: parseFloat(total.toFixed(2)),
                itemCount: demoCart.length,
                isDemoCart: true
            });
        }
        
        // Regular database cart for real users
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
            itemCount: cartItems.length,
            isDemoCart: false
        });
    } catch (err) {
        console.error('Get cart error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch cart',
            uiHint: 'Please refresh the page and try again'
        });
    }
});

// Add item to cart (optimized for original UI "Add to Cart" buttons)
router.post('/add', validateCartItem, async (req, res) => {
    const { user_id, product_id, quantity } = req.body;
    
    try {
        // For demo users, simulate successful addition
        if (user_id >= 998) {
            console.log(`✅ Demo cart: Added product ${product_id} (qty: ${quantity}) for demo user ${user_id}`);
            
            return res.json({ 
                message: 'Item added to cart successfully',
                success: true,
                addedItem: {
                    id: product_id,
                    name: 'Demo Product',
                    quantity: quantity
                },
                uiHint: 'Product added! Check your cart to see updates.'
            });
        }
        
        // Check if product exists and has sufficient stock
        const products = await db.query(
            'SELECT id, name, price, stock, category FROM products WHERE id = ?', 
            [product_id]
        );
        
        if (products.length === 0) {
            return res.status(404).json({ 
                error: 'Product not found',
                uiHint: 'This product may no longer be available'
            });
        }
        
        const product = products[0];
        
        // Check if product is in stock
        if (product.stock < quantity) {
            return res.status(400).json({ 
                error: `Insufficient stock. Available: ${product.stock}`,
                uiHint: `Only ${product.stock} items left in stock`
            });
        }
        
        // Check if item already exists in cart
        const existingCartItem = await db.query(
            'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
            [user_id, product_id]
        );
        
        if (existingCartItem.length > 0) {
            // Update existing item quantity
            const newQuantity = existingCartItem[0].quantity + quantity;
            
            // Check total quantity against stock
            if (newQuantity > product.stock) {
                return res.status(400).json({ 
                    error: `Cannot add ${quantity} more. Total would exceed available stock (${product.stock})`,
                    uiHint: `You already have ${existingCartItem[0].quantity} in cart`
                });
            }
            
            await db.query(
                'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ?',
                [newQuantity, existingCartItem[0].id]
            );
            
            console.log(`✅ Updated cart: ${product.name} quantity to ${newQuantity} for user ${user_id}`);
        } else {
            // Add new item to cart
            await db.query(
                'INSERT INTO cart_items (user_id, product_id, quantity, added_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
                [user_id, product_id, quantity]
            );
            
            console.log(`✅ Added to cart: ${product.name} (qty: ${quantity}) for user ${user_id}`);
        }
        
        res.json({ 
            message: 'Item added to cart successfully',
            success: true,
            addedItem: {
                id: product_id,
                name: product.name,
                quantity: quantity,
                category: product.category
            },
            uiHint: 'Product added! Cart count updated in header.'
        });
    } catch (err) {
        console.error('Add to cart error:', err);
        res.status(500).json({ 
            error: 'Failed to add item to cart',
            uiHint: 'Please try again or refresh the page'
        });
    }
});

// Update item quantity (optimized for original UI cart controls)
router.put('/update', validateCartItem, async (req, res) => {
    const { cart_item_id, quantity } = req.body;
    
    if (!cart_item_id || isNaN(cart_item_id)) {
        return res.status(400).json({ 
            error: 'Valid cart item ID is required',
            uiHint: 'Please refresh your cart and try again'
        });
    }
    
    try {
        // For demo users, simulate successful update
        if (cart_item_id <= 10) { // Demo cart item IDs
            console.log(`✅ Demo cart: Updated item ${cart_item_id} quantity to ${quantity}`);
            
            return res.json({ 
                message: 'Cart updated successfully',
                success: true,
                uiHint: 'Quantity updated! Total recalculated.'
            });
        }
        
        // Get cart item details
        const cartItems = await db.query(`
            SELECT ci.user_id, ci.product_id, p.name, p.stock 
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.id = ?
        `, [parseInt(cart_item_id)]);
        
        if (cartItems.length === 0) {
            return res.status(404).json({ 
                error: 'Cart item not found',
                uiHint: 'This item may have been removed. Please refresh your cart.'
            });
        }
        
        const cartItem = cartItems[0];
        
        // Check stock availability
        if (quantity > cartItem.stock) {
            return res.status(400).json({ 
                error: `Insufficient stock. Available: ${cartItem.stock}`,
                uiHint: `Only ${cartItem.stock} items available`
            });
        }
        
        // Update quantity
        await db.query(
            'UPDATE cart_items SET quantity = ?, updated_at = NOW() WHERE id = ?',
            [quantity, parseInt(cart_item_id)]
        );
        
        console.log(`✅ Updated cart item ${cart_item_id}: ${cartItem.name} quantity to ${quantity}`);
        
        res.json({ 
            message: 'Cart updated successfully',
            success: true,
            uiHint: 'Quantity updated! Check the new total.'
        });
    } catch (err) {
        console.error('Update cart error:', err);
        res.status(500).json({ 
            error: 'Failed to update cart',
            uiHint: 'Please try again or refresh the page'
        });
    }
});

// Remove item from cart (optimized for original UI remove buttons)
router.delete('/remove', async (req, res) => {
    const { cart_item_id } = req.body;
    
    if (!cart_item_id || isNaN(cart_item_id)) {
        return res.status(400).json({ 
            error: 'Valid cart item ID is required',
            uiHint: 'Please refresh your cart and try again'
        });
    }
    
    try {
        // For demo users, simulate successful removal
        if (cart_item_id <= 10) { // Demo cart item IDs
            console.log(`✅ Demo cart: Removed item ${cart_item_id}`);
            
            return res.json({ 
                message: 'Item removed from cart',
                success: true,
                uiHint: 'Item removed! Cart updated.'
            });
        }
        
        // Check if item exists in cart
        const cartItem = await db.query(
            'SELECT id, product_id FROM cart_items WHERE id = ?',
            [parseInt(cart_item_id)]
        );
        
        if (cartItem.length === 0) {
            return res.status(404).json({ 
                error: 'Item not found in cart',
                uiHint: 'This item may have already been removed'
            });
        }
        
        // Remove item from cart
        await db.query(
            'DELETE FROM cart_items WHERE id = ?',
            [parseInt(cart_item_id)]
        );
        
        console.log(`✅ Removed cart item ${cart_item_id}`);
        
        res.json({ 
            message: 'Item removed from cart',
            success: true,
            uiHint: 'Item removed! Cart count updated.'
        });
    } catch (err) {
        console.error('Remove from cart error:', err);
        res.status(500).json({ 
            error: 'Failed to remove item from cart',
            uiHint: 'Please try again or refresh the page'
        });
    }
});

// Clear cart (optimized for original UI "Clear All" button)
router.delete('/:userId/clear', async (req, res) => {
    const { userId } = req.params;
    
    try {
        // For demo users, simulate successful clear
        if (parseInt(userId) >= 998) {
            console.log(`✅ Demo cart: Cleared cart for demo user ${userId}`);
            
            return res.json({ 
                message: 'Cart cleared successfully',
                itemsRemoved: 2, // Demo count
                success: true,
                uiHint: 'Cart is now empty! Start shopping again.'
            });
        }
        
        const result = await db.query(
            'DELETE FROM cart_items WHERE user_id = ?',
            [parseInt(userId)]
        );
        
        console.log(`✅ Cleared cart for user ${userId} (${result.affectedRows} items removed)`);
        
        res.json({ 
            message: 'Cart cleared successfully',
            itemsRemoved: result.affectedRows,
            success: true,
            uiHint: 'Cart is now empty! Browse products to add items.'
        });
    } catch (err) {
        console.error('Clear cart error:', err);
        res.status(500).json({ 
            error: 'Failed to clear cart',
            uiHint: 'Please try again or refresh the page'
        });
    }
});

// Get cart summary (optimized for original UI header display)
router.get('/:userId/summary', async (req, res) => {
    const { userId } = req.params;
    
    try {
        // For demo users, return demo summary
        if (parseInt(userId) >= 998) {
            return res.json({
                itemCount: 3,
                total: '8.67',
                isDemoCart: true
            });
        }
        
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
            total: parseFloat(summary[0].total).toFixed(2),
            isDemoCart: false
        });
    } catch (err) {
        console.error('Get cart summary error:', err);
        res.status(500).json({ 
            error: 'Failed to get cart summary',
            uiHint: 'Cart count may not be accurate'
        });
    }
});

// Legacy routes for backward compatibility (enhanced for original UI)
router.post('/:userId/add', authenticateToken, validateCartItem, async (req, res) => {
    const { userId } = req.params;
    req.body.user_id = parseInt(userId);
    
    // Forward to the main add route
    const addRoute = router.stack.find(layer => layer.route && layer.route.path === '/add' && layer.route.methods.post);
    if (addRoute) {
        addRoute.route.stack[1].handle(req, res);
    }
});

router.delete('/:userId/remove/:productId', authenticateToken, async (req, res) => {
    const { userId, productId } = req.params;
    
    if (isNaN(productId)) {
        return res.status(400).json({ 
            error: 'Invalid product ID',
            uiHint: 'Please select a valid product'
        });
    }
    
    try {
        // For demo users, simulate successful removal
        if (parseInt(userId) >= 998) {
            console.log(`✅ Demo cart: Removed product ${productId} for demo user ${userId}`);
            
            return res.json({ 
                message: 'Item removed from cart',
                success: true,
                uiHint: 'Product removed from cart!'
            });
        }
        
        // Find cart item by user and product
        const cartItem = await db.query(
            'SELECT id FROM cart_items WHERE user_id = ? AND product_id = ?',
            [parseInt(userId), parseInt(productId)]
        );
        
        if (cartItem.length === 0) {
            return res.status(404).json({ 
                error: 'Item not found in cart',
                uiHint: 'This item may not be in your cart'
            });
        }
        
        // Remove item from cart
        await db.query(
            'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?',
            [parseInt(userId), parseInt(productId)]
        );
        
        console.log(`✅ Removed from cart: Product ${productId} for user ${userId}`);
        
        res.json({ 
            message: 'Item removed from cart',
            success: true,
            uiHint: 'Product removed from cart!'
        });
    } catch (err) {
        console.error('Remove from cart error:', err);
        res.status(500).json({ 
            error: 'Failed to remove item from cart',
            uiHint: 'Please try again'
        });
    }
});

module.exports = router;
