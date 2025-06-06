// db.js - Enhanced MariaDB Connection for Original SmartCart UI
const mariadb = require('mariadb');
require('dotenv').config();

// Database configuration optimized for SmartCart original UI
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'Sarthak',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'smart_cart',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 30000,
    timeout: parseInt(process.env.DB_TIMEOUT) || 30000,
    idleTimeout: 600000, // 10 minutes
    minimumIdle: 2,
    resetAfterUse: true,
    leakDetectionTimeout: 30000,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci'
};

// Create connection pool
const pool = mariadb.createPool(dbConfig);

// Connection retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Enhanced connection test with automatic schema fixes
async function testConnection(retryCount = 0) {
    let conn;
    try {
        console.log(`🔄 Attempting to connect to MariaDB (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`);
        console.log(`📍 Host: ${dbConfig.host}:${dbConfig.port}, Database: ${dbConfig.database}, User: ${dbConfig.user}`);
        
        conn = await pool.getConnection();
        console.log('✅ Connected to MariaDB successfully');
        
        // Test query
        const rows = await conn.query('SELECT 1 as test, NOW() as timestamp');
        console.log('✅ Test query successful:', rows[0]);
        
        // Auto-fix database schema for original UI
        await autoFixDatabaseSchema(conn);
        
        return true;
    } catch (err) {
        console.error('❌ Database connection error:', err.message);
        console.error('Error code:', err.code);
        
        if (err.code === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('🔐 Authentication failed - Check credentials');
            console.error('💡 Your beautiful SmartCart UI will use demo data');
        } else if (err.code === 'ER_BAD_DB_ERROR') {
            console.error('🗄️ Database does not exist');
            console.error('💡 Run: CREATE DATABASE smart_cart;');
        } else if (err.code === 'ECONNREFUSED') {
            console.error('🔌 MariaDB server not running');
            console.error('💡 Try: sudo systemctl start mariadb');
        }
        
        // Retry logic
        if (retryCount < MAX_RETRIES) {
            console.log(`🔄 Retrying in ${RETRY_DELAY/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return testConnection(retryCount + 1);
        } else {
            console.log('🎨 SmartCart will use demo data for seamless experience');
            return false;
        }
    } finally {
        if (conn) conn.release();
    }
}

// Auto-fix database schema for original UI
async function autoFixDatabaseSchema(conn) {
    try {
        console.log('🔧 Auto-fixing database schema for original SmartCart UI...');
        
        // Check and fix users table
        try {
            await conn.query("SELECT is_active FROM users LIMIT 1");
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('🔧 Adding is_active column to users table...');
                await conn.query("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE");
            }
        }
        
        try {
            await conn.query("SELECT name FROM users LIMIT 1");
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('🔧 Adding name column to users table...');
                await conn.query("ALTER TABLE users ADD COLUMN name VARCHAR(255) DEFAULT ''");
            }
        }
        
        try {
            await conn.query("SELECT last_login FROM users LIMIT 1");
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('🔧 Adding last_login column to users table...');
                await conn.query("ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL");
            }
        }
        
        // Check and fix products table
        try {
            await conn.query("SELECT created_at FROM products LIMIT 1");
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('🔧 Adding timestamp columns to products table...');
                await conn.query("ALTER TABLE products ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
                await conn.query("ALTER TABLE products ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
            }
        }
        
        try {
            await conn.query("SELECT map_x FROM products LIMIT 1");
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('🔧 Adding map coordinate columns to products table...');
                await conn.query("ALTER TABLE products ADD COLUMN map_x INT DEFAULT 100");
                await conn.query("ALTER TABLE products ADD COLUMN map_y INT DEFAULT 150");
            }
        }
        
        try {
            await conn.query("SELECT rfid_tag FROM products LIMIT 1");
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log('🔧 Adding RFID tag column to products table...');
                await conn.query("ALTER TABLE products ADD COLUMN rfid_tag VARCHAR(50) UNIQUE");
            }
        }
        
        // Create cart_items table if missing
        try {
            await conn.query("SELECT 1 FROM cart_items LIMIT 1");
        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('🔧 Creating cart_items table...');
                await conn.query(`
                    CREATE TABLE cart_items (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        product_id INT NOT NULL,
                        quantity INT NOT NULL DEFAULT 1,
                        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                        UNIQUE KEY unique_user_product (user_id, product_id)
                    )
                `);
            }
        }
        
        // Create orders table if missing
        try {
            await conn.query("SELECT 1 FROM orders LIMIT 1");
        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('🔧 Creating orders table...');
                await conn.query(`
                    CREATE TABLE orders (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        total DECIMAL(10,2) NOT NULL,
                        status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
                        payment_method VARCHAR(50) DEFAULT 'cash',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                `);
            }
        }
        
        // Create order_items table if missing
        try {
            await conn.query("SELECT 1 FROM order_items LIMIT 1");
        } catch (err) {
            if (err.code === 'ER_NO_SUCH_TABLE') {
                console.log('🔧 Creating order_items table...');
                await conn.query(`
                    CREATE TABLE order_items (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        order_id INT NOT NULL,
                        product_id INT NOT NULL,
                        quantity INT NOT NULL,
                        price DECIMAL(10,2) NOT NULL,
                        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
                    )
                `);
            }
        }
        
        // Insert demo products if products table is empty
        const productCount = await conn.query("SELECT COUNT(*) as count FROM products");
        if (productCount[0].count === 0) {
            console.log('🔧 Inserting demo products for original UI...');
            await conn.query(`
                INSERT INTO products (id, name, price, category, stock, location, map_x, map_y, rfid_tag) VALUES
                (1, 'Red Apples', 2.59, 'fruits', 50, 'Aisle 1 • Shelf A', 100, 150, 'APPLE001'),
                (2, 'Whole Wheat Bread', 1.99, 'bakery', 25, 'Aisle 2 • Shelf B', 200, 150, 'BREAD001'),
                (3, 'Fresh Milk', 3.49, 'dairy', 30, 'Aisle 3 • Shelf C', 300, 150, 'MILK001'),
                (4, 'Bananas', 1.29, 'fruits', 60, 'Aisle 1 • Shelf A', 100, 200, 'BANANA001'),
                (5, 'Cheddar Cheese', 4.99, 'dairy', 20, 'Aisle 3 • Shelf C', 300, 200, 'CHEESE001'),
                (6, 'Croissants', 3.99, 'bakery', 15, 'Aisle 2 • Shelf B', 200, 200, 'CROISSANT001'),
                (7, 'Orange Juice', 2.79, 'beverages', 35, 'Aisle 4 • Shelf D', 400, 150, 'JUICE001'),
                (8, 'Chicken Breast', 7.99, 'meat', 12, 'Aisle 5 • Shelf E', 500, 150, 'CHICKEN001')
            `);
        }
        
        console.log('✅ Database schema auto-fix completed for original SmartCart UI');
        console.log('🎨 Your beautiful interface now has full database support!');
        
    } catch (err) {
        console.warn('⚠️ Auto-fix encountered issues:', err.message);
        console.log('🎨 Original UI will use demo data as fallback');
    }
}

// Database helper functions
const db = {
    async query(sql, params = []) {
        let conn;
        try {
            conn = await pool.getConnection();
            const result = await conn.query(sql, params);
            return result;
        } catch (err) {
            console.error('Database query error:', err.message);
            throw err;
        } finally {
            if (conn) conn.release();
        }
    },
    
    async transaction(callback) {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            const result = await callback(conn);
            await conn.commit();
            return result;
        } catch (err) {
            if (conn) {
                try {
                    await conn.rollback();
                } catch (rollbackErr) {
                    console.error('Rollback failed:', rollbackErr.message);
                }
            }
            throw err;
        } finally {
            if (conn) conn.release();
        }
    },
    
    async close() {
        try {
            await pool.end();
            console.log('✅ Database connection pool closed');
        } catch (err) {
            console.error('❌ Error closing database pool:', err.message);
        }
    }
};

// Initialize database
async function initializeDatabase() {
    console.log('🚀 Initializing SmartCart database for original UI...');
    const isConnected = await testConnection();
    
    if (isConnected) {
        console.log('🎉 Database ready for your beautiful SmartCart interface!');
        console.log('🎨 Features: Store Map, Product Catalog, Cart, Orders');
    } else {
        console.log('🎨 Using demo data - your interface will still work perfectly!');
    }
}

// Initialize on load
initializeDatabase();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down database connections...');
    await db.close();
    process.exit(0);
});

module.exports = { pool, db };
