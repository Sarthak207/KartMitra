// routes/products.js - Products API with MariaDB
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Get all products
router.get('/', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const products = await conn.query('SELECT * FROM products');
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        if (conn) conn.release();
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        const product = await conn.query('SELECT * FROM products WHERE id = ?', [id]);
        if (product.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        if (conn) conn.release();
    }
});

// Get product by RFID tag
router.get('/rfid/:tag', async (req, res) => {
    const { tag } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        const product = await conn.query('SELECT * FROM products WHERE rfid_tag = ?', [tag]);
        if (product.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        if (conn) conn.release();
    }
});

// Add new product
router.post('/', async (req, res) => {
    const { name, price, category, stock, location, image_url, rfid_tag, map_x, map_y } = req.body;
    let conn;
    try {
        conn = await pool.getConnection();
        const result = await conn.query(
            'INSERT INTO products (name, price, category, stock, location, image_url, rfid_tag, map_x, map_y) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, price, category, stock, location, image_url, rfid_tag, map_x, map_y]
        );
        res.json({ id: result.insertId, message: 'Product added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add product' });
    } finally {
        if (conn) conn.release();
    }
});

// Update product
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, price, category, stock, location, image_url } = req.body;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query(
            'UPDATE products SET name = ?, price = ?, category = ?, stock = ?, location = ?, image_url = ? WHERE id = ?',
            [name, price, category, stock, location, image_url, id]
        );
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update product' });
    } finally {
        if (conn) conn.release();
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete product' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
