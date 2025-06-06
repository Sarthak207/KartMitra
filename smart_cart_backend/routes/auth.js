// routes/auth.js - Authentication API for Original SmartCart UI
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');

// Demo credentials for original UI (as shown in login screen)
const DEMO_CREDENTIALS = {
    demo: {
        id: 999,
        username: 'demo',
        email: 'demo@smartcart.com',
        name: 'Demo User',
        password: 'demo123',
        role: 'customer'
    },
    admin: {
        id: 998,
        username: 'admin',
        email: 'admin@smartcart.com', 
        name: 'Admin User',
        password: 'admin123',
        role: 'admin'
    }
};

// Input validation middleware for original UI
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
    
    // Name validation (required for original UI)
    if (!name || name.trim().length < 2) {
        errors.push('Full name is required and must be at least 2 characters long');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ 
            error: errors.join(', '),
            uiHint: 'Check the registration form in your green interface'
        });
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
        return res.status(400).json({ 
            error: 'Username and password are required',
            uiHint: 'Try demo credentials: demo/demo123 or admin/admin123'
        });
    }
    
    // Sanitize username
    req.body.username = username.toLowerCase().trim();
    
    next();
};

// Rate limiting store (optimized for original UI testing)
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 10; // Increased for demo testing

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
            retryAfter: Math.ceil((attempts.resetTime - now) / 1000),
            uiHint: 'Wait a few minutes before trying again'
        });
    }
    
    next();
};

// Demo credentials endpoint for original UI
router.get('/demo-credentials', (req, res) => {
    res.json({
        message: 'Demo credentials for original SmartCart UI',
        credentials: {
            customer: {
                username: 'demo',
                password: 'demo123',
                description: 'Regular customer account'
            },
            admin: {
                username: 'admin',
                password: 'admin123', 
                description: 'Administrator account'
            }
        },
        note: 'These credentials are displayed in the original UI login screen'
    });
});

// Register new user (enhanced for original UI)
router.post('/register', validateRegistration, async (req, res) => {
    const { username, email, password, name } = req.body;
    
    try {
        // Check against demo usernames
        if (username === 'demo' || username === 'admin') {
            return res.status(409).json({ 
                error: 'Username reserved for demo purposes',
                uiHint: 'Choose a different username'
            });
        }
        
        // Check if user already exists
        const existingUser = await db.query(
            'SELECT id, username, email FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existingUser.length > 0) {
            const existing = existingUser[0];
            if (existing.username === username) {
                return res.status(409).json({ 
                    error: 'Username already exists',
                    uiHint: 'Try a different username'
                });
            }
            if (existing.email === email) {
                return res.status(409).json({ 
                    error: 'Email already exists',
                    uiHint: 'Try a different email address'
                });
            }
        }
        
        // Hash password
        const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Insert new user with original UI defaults
        const result = await db.query(
            `INSERT INTO users (username, email, password_hash, name, role, created_at, is_active) 
             VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
            [username, email, hashedPassword, name, 'customer', true]
        );
        
        console.log(`✅ New user registered: ${username} (${name}) - ID: ${result.insertId}`);
        
        res.status(201).json({ 
            id: result.insertId.toString(), 
            message: 'Registration successful! You can now login.',
            username: username,
            name: name,
            success: true,
            uiHint: 'Switch to login tab to sign in'
        });
    } catch (err) {
        console.error('Registration error:', err);
        
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                error: 'User already exists',
                uiHint: 'Try different credentials'
            });
        }
        
        res.status(500).json({ 
            error: 'Registration failed. Please try again.',
            uiHint: 'Check your internet connection'
        });
    }
});

// Login user (enhanced with demo credentials support)
router.post('/login', rateLimitMiddleware, validateLogin, async (req, res) => {
    const { username, password } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;
    
    try {
        let user = null;
        let isValidPassword = false;
        
        // Check demo credentials first (for original UI)
        if (username === 'demo' && password === 'demo123') {
            user = DEMO_CREDENTIALS.demo;
            isValidPassword = true;
            console.log(`✅ Demo user login: ${username}`);
        } else if (username === 'admin' && password === 'admin123') {
            user = DEMO_CREDENTIALS.admin;
            isValidPassword = true;
            console.log(`✅ Demo admin login: ${username}`);
        } else {
            // Check database users
            const users = await db.query(
                'SELECT id, username, email, password_hash, name, role, created_at, is_active FROM users WHERE (username = ? OR email = ?) AND is_active = true',
                [username, username]
            );
            
            if (users.length > 0) {
                user = users[0];
                isValidPassword = await bcrypt.compare(password, user.password_hash);
            }
        }
        
        if (!user || !isValidPassword) {
            // Increment failed attempts
            const attempts = loginAttempts.get(clientIP) || { count: 0, resetTime: Date.now() + RATE_LIMIT_WINDOW };
            attempts.count++;
            loginAttempts.set(clientIP, attempts);
            
            return res.status(401).json({ 
                error: 'Invalid username or password',
                uiHint: 'Try demo/demo123 or admin/admin123 for testing'
            });
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
        
        // Update last login for database users
        if (user.id < 998) { // Not demo users
            try {
                await db.query(
                    'UPDATE users SET last_login = NOW() WHERE id = ?',
                    [user.id]
                );
            } catch (updateErr) {
                console.error('Failed to update last_login:', updateErr);
            }
        }
        
        console.log(`✅ User logged in: ${user.username} (${user.name || user.username}) - Role: ${user.role}`);
        
        res.json({
            token,
            user: {
                id: user.id.toString(),
                username: user.username,
                email: user.email,
                name: user.name || user.username,
                role: user.role,
                createdAt: user.created_at || new Date().toISOString()
            },
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            success: true,
            welcomeMessage: `Welcome back, ${user.name || user.username}!`,
            uiHint: 'Redirecting to main dashboard...'
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            error: 'Login failed. Please try again.',
            uiHint: 'Check your internet connection'
        });
    }
});

// Verify token endpoint (enhanced for original UI)
router.post('/verify', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ 
            error: 'No token provided',
            uiHint: 'Please login again'
        });
    }
    
    try {
        const decoded = jwt.verify(
            token, 
            process.env.JWT_SECRET || 'smart_cart_secret_key_change_in_production'
        );
        
        let user = null;
        
        // Check if it's a demo user
        if (decoded.id === 999) {
            user = DEMO_CREDENTIALS.demo;
        } else if (decoded.id === 998) {
            user = DEMO_CREDENTIALS.admin;
        } else {
            // Check database
            const users = await db.query(
                'SELECT id, username, email, name, role FROM users WHERE id = ? AND is_active = true',
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
        
        res.json({ 
            valid: true, 
            user: {
                id: user.id.toString(),
                username: user.username,
                email: user.email,
                name: user.name || user.username,
                role: user.role
            }
        });
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired',
                uiHint: 'Please login again'
            });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Invalid token',
                uiHint: 'Please login again'
            });
        }
        
        console.error('Token verification error:', err);
        res.status(500).json({ 
            error: 'Token verification failed',
            uiHint: 'Please try logging in again'
        });
    }
});

// Logout endpoint (enhanced for original UI)
router.post('/logout', (req, res) => {
    res.json({ 
        message: 'Logged out successfully', 
        success: true,
        uiHint: 'Redirecting to login screen...'
    });
});

// Get current user profile (enhanced for original UI)
router.get('/profile', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ 
            error: 'No token provided',
            uiHint: 'Please login to view profile'
        });
    }
    
    try {
        const decoded = jwt.verify(
            token, 
            process.env.JWT_SECRET || 'smart_cart_secret_key_change_in_production'
        );
        
        let user = null;
        
        // Check demo users
        if (decoded.id === 999) {
            user = DEMO_CREDENTIALS.demo;
        } else if (decoded.id === 998) {
            user = DEMO_CREDENTIALS.admin;
        } else {
            const users = await db.query(
                'SELECT id, username, email, name, role, created_at, last_login FROM users WHERE id = ? AND is_active = true',
                [decoded.id]
            );
            
            if (users.length > 0) {
                user = users[0];
            }
        }
        
        if (!user) {
            return res.status(404).json({ 
                error: 'User not found',
                uiHint: 'Please login again'
            });
        }
        
        res.json({
            id: user.id.toString(),
            username: user.username,
            email: user.email,
            name: user.name || user.username,
            role: user.role,
            createdAt: user.created_at || '2025-01-01T00:00:00.000Z',
            lastLogin: user.last_login || new Date().toISOString(),
            isDemoAccount: user.id >= 998
        });
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(401).json({ 
            error: 'Invalid token',
            uiHint: 'Please login again'
        });
    }
});

// Middleware to authenticate requests (enhanced for original UI)
const authenticateToken = async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ 
            error: 'Access token required',
            uiHint: 'Please login to access this feature'
        });
    }
    
    try {
        const decoded = jwt.verify(
            token, 
            process.env.JWT_SECRET || 'smart_cart_secret_key_change_in_production'
        );
        
        let user = null;
        
        // Check demo users
        if (decoded.id === 999) {
            user = DEMO_CREDENTIALS.demo;
        } else if (decoded.id === 998) {
            user = DEMO_CREDENTIALS.admin;
        } else {
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
    } catch (err) {
        return res.status(401).json({ 
            error: 'Invalid or expired token',
            uiHint: 'Please login again'
        });
    }
};

// Export the authentication middleware for use in other routes
router.authenticateToken = authenticateToken;

module.exports = router;
