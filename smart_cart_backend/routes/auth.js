// routes/auth.js - Authentication API with MariaDB
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

// Register new user
router.post('/register', async (req, res) => {
    const { username, email, password, name } = req.body;
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Check if user already exists
        const existingUser = await conn.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert new user
        const result = await conn.query(
            'INSERT INTO users (username, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, name, 'customer']
        );
        
        res.json({ id: result.insertId, message: 'User registered successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    } finally {
        if (conn) conn.release();
    }
});

// Login user
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Find user
        const users = await conn.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, username]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'smart_cart_secret',
            { expiresIn: '24h' }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
