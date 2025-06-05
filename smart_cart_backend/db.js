// db.js - Enhanced MariaDB Connection with Connection Management
const mariadb = require('mariadb');
require('dotenv').config();

// Database configuration
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
    leakDetectionTimeout: 30000
};

// Create connection pool
const pool = mariadb.createPool(dbConfig);

// Connection retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Enhanced connection test with retry logic
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
        
        // Check database tables
        await checkDatabaseTables(conn);
        
        return true;
    } catch (err) {
        console.error('❌ Database connection error:', err.message);
        console.error('Error code:', err.code);
        console.error('SQL State:', err.sqlState);
        
        // Handle specific error types
        if (err.code === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('🔑 Authentication failed - Check username/password in .env file');
            console.error('Expected: DB_USER=Sarthak, DB_PASSWORD=1234');
        } else if (err.code === 'ER_BAD_DB_ERROR') {
            console.error('🗄️  Database does not exist - Create the smart_cart database first');
        } else if (err.code === 'ECONNREFUSED') {
            console.error('🔌 Connection refused - Check if MariaDB server is running');
        } else if (err.code === 'ETIMEDOUT' || err.code === 'ER_GET_CONNECTION_TIMEOUT') {
            console.error('⏰ Connection timeout - Check network connectivity');
        }
        
        // Retry logic
        if (retryCount < MAX_RETRIES) {
            console.log(`🔄 Retrying connection in ${RETRY_DELAY/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return testConnection(retryCount + 1);
        } else {
            console.error('💥 Max retries reached. Database connection failed.');
            return false;
        }
    } finally {
        if (conn) conn.release();
    }
}

// Check if required tables exist
async function checkDatabaseTables(conn) {
    try {
        const tables = await conn.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME IN ('users', 'products', 'cart_items', 'orders', 'order_items')
        `, [dbConfig.database]);
        
        const existingTables = tables.map(row => row.TABLE_NAME);
        const requiredTables = ['users', 'products', 'cart_items', 'orders', 'order_items'];
        const missingTables = requiredTables.filter(table => !existingTables.includes(table));
        
        if (missingTables.length > 0) {
            console.warn('⚠️  Missing database tables:', missingTables.join(', '));
            console.warn('📋 Run database initialization script to create missing tables');
        } else {
            console.log('✅ All required database tables exist');
        }
        
        return { existingTables, missingTables };
    } catch (err) {
        console.warn('⚠️  Could not check database tables:', err.message);
        return { existingTables: [], missingTables: [] };
    }
}

// Database helper functions
const db = {
    // Execute query with error handling
    async query(sql, params = []) {
        let conn;
        try {
            conn = await pool.getConnection();
            const result = await conn.query(sql, params);
            return result;
        } catch (err) {
            console.error('Database query error:', err.message);
            console.error('SQL:', sql);
            console.error('Params:', params);
            throw err;
        } finally {
            if (conn) conn.release();
        }
    },
    
    // Execute transaction
    async transaction(callback) {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();
            
            const result = await callback(conn);
            
            await conn.commit();
            return result;
        } catch (err) {
            if (conn) await conn.rollback();
            console.error('Transaction error:', err.message);
            throw err;
        } finally {
            if (conn) conn.release();
        }
    },
    
    // Get connection pool stats
    getPoolStats() {
        return {
            totalConnections: pool.totalConnections(),
            activeConnections: pool.activeConnections(),
            idleConnections: pool.idleConnections(),
            taskQueueSize: pool.taskQueueSize()
        };
    },
    
    // Close pool gracefully
    async close() {
        try {
            await pool.end();
            console.log('✅ Database connection pool closed');
        } catch (err) {
            console.error('❌ Error closing database pool:', err.message);
        }
    }
};

// Pool event listeners
pool.on('connection', (conn) => {
    console.log(`🔗 New database connection established (ID: ${conn.threadId})`);
});

pool.on('error', (err) => {
    console.error('💥 Database pool error:', err.message);
});

// Initialize database connection
async function initializeDatabase() {
    const isConnected = await testConnection();
    if (isConnected) {
        console.log('🎉 Database initialization completed successfully');
        
        // Log pool configuration
        console.log('📊 Pool configuration:', {
            host: dbConfig.host,
            port: dbConfig.port,
            database: dbConfig.database,
            connectionLimit: dbConfig.connectionLimit,
            acquireTimeout: dbConfig.acquireTimeout
        });
    } else {
        console.error('💥 Database initialization failed');
        process.exit(1);
    }
}

// Initialize on module load
initializeDatabase();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT, closing database connections...');
    await db.close();
});

process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, closing database connections...');
    await db.close();
});

module.exports = { 
    pool, 
    db,
    testConnection,
    checkDatabaseTables,
    getPoolStats: db.getPoolStats
};
