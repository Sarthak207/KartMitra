// routes/auth.js - Enhanced Authentication API with MariaDB
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');

// Input validation middleware
const validateRegistration = (req, res, next) => {
    const { username, email, password, name } = req.body;
    const errors = [];
    
    // Username validation
    if (!username || username.length < 3) {
        errors.push('Username must be at least 3 characters long');
    }
    if (username && !/^[a-zA-Z0-9_]+$/.test(username)) {
        errors.push('Username can only contain letters, numbers, and underscores');
    }
    
    // Email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Valid email is required');
    }
    
    // Password validation
    if (!password || password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }
    
    // Name validation
    if (!name || name.trim().length < 2) {
        errors.push('Name must be at least 2 characters long');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
    }
    
    // Sanitize inputs
    req.body.username = username.toLowerCase().trim();
    req.body.email = email.toLowerCase().trim();
    req.body.name = name.trim();
    
    next();
};

const validateLogin = (req, res, next) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Sanitize username
    req.body.username = username.toLowerCase().trim();
    
    next();
};

// Rate limiting store (in production, use Redis)
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;

const rateLimitMiddleware = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!loginAttempts.has(clientIP)) {
        loginAttempts.set(clientIP, { count: 0, resetTime: now + RATE_LIMIT_WINDOW });
    }
    
    const attempts = loginAttempts.get(clientIP);
    
    if (now > attempts.resetTime) {
        attempts.count = 0;
        attempts.resetTime = now + RATE_LIMIT_WINDOW;
    }
    
    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
        return res.status(429).json({ 
            error: 'Too many login attempts. Please try again later.',
            retryAfter: Math.ceil((attempts.resetTime - now) / 1000)
        });
    }
    
    next();
};

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
    const { username, email, password, name } = req.body;
    
    try {
        // Check if user already exists
        const existingUser = await db.query(
            'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existingUser.length > 0) {
            const existing = existingUser[0];
            if (existing.username === username) {
                return res.status(409).json({ error: 'Username already exists' });
            }
            if (existing.email === email) {
                return res.status(409).json({ error: 'Email already exists' });
            }
        }
        
        // Hash password with higher cost for better security
        const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Insert new user
        const result = await db.query(
            `INSERT INTO users (username, email, password_hash, name, role, created_at) 
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [username, email, hashedPassword, name, 'customer']
        );
        
        console.log(`✅ New user registered: ${username} (ID: ${result.insertId})`);
        
        res.status(201).json({ 
            id: result.insertId.toString(), 
            message: 'User registered successfully',
            username: username
        });
    } catch (err) {
        console.error('Registration error:', err);
        
        // Handle specific database errors
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'User already exists' });
        }
        
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// Login user
router.post('/login', rateLimitMiddleware, validateLogin, async (req, res) => {
    const { username, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    
    try {
        // Find user by username or email
        const users = await db.query(
            'SELECT id, username, email, password_hash, name, role, created_at FROM users WHERE username = ? OR email = ?',
            [username, username]
        );
        
        if (users.length === 0) {
            // Increment failed attempts
            const attempts = loginAttempts.get(clientIP) || { count: 0, resetTime: Date.now() + RATE_LIMIT_WINDOW };
            attempts.count++;
            loginAttempts.set(clientIP, attempts);
            
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const user = users[0];
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            // Increment failed attempts
            const attempts = loginAttempts.get(clientIP) || { count: 0, resetTime: Date.now() + RATE_LIMIT_WINDOW };
            attempts.count++;
            loginAttempts.set(clientIP, attempts);
            
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Reset failed attempts on successful login
        loginAttempts.delete(clientIP);
        
        // Generate JWT token
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role,
            iat: Math.floor(Date.now() / 1000)
        };
        
        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET || 'smart_cart_secret_key_change_in_production',
            { 
                expiresIn: process.env.JWT_EXPIRES_IN || '24h',
                issuer: 'smart-cart-api',
                audience: 'smart-cart-app'
            }
        );
        
        // Update last login
        await db.query(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );
        
        console.log(`✅ User logged in: ${user.username} (ID: ${user.id})`);
        
        res.json({
            token,
            user: {
                id: user.id.toString(),
                username: user.username,
                email: user.email,
                name: user.name,
                role: user.role,
                createdAt: user.created_at
            },
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// Verify token endpoint
router.post('/verify', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(
            token, 
            process.env.JWT_SECRET || 'smart_cart_secret_key_change_in_production'
        );
        
        // Check if user still exists
        const users = await db.query(
            'SELECT id, username, email, name, role FROM users WHERE id = ?',
            [decoded.id]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        res.json({ 
            valid: true, 
            user: {
                id: users[0].id.toString(),
                username: users[0].username,
                email: users[0].email,
                name: users[0].name,
                role: users[0].role
            }
        });
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        console.error('Token verification error:', err);
        res.status(500).json({ error: 'Token verification failed' });
    }
});

// Logout endpoint (for token blacklisting in production)
router.post('/logout', (req, res) => {
    // In production, you would add the token to a blacklist
    res.json({ message: 'Logged out successfully' });
});

// Get current user profile
router.get('/profile', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(
            token, 
            process.env.JWT_SECRET || 'smart_cart_secret_key_change_in_production'
        );
        
        const users = await db.query(
            'SELECT id, username, email, name, role, created_at, last_login FROM users WHERE id = ?',
            [decoded.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = users[0];
        res.json({
            id: user.id.toString(),
            username: user.username,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.created_at,
            lastLogin: user.last_login
        });
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
