// db.js - MariaDB Connection with your credentials
const mariadb = require('mariadb');
require('dotenv').config();

// Create connection pool
const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'Sarthak',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'smart_cart',
    connectionLimit: 5,
    acquireTimeout: 10000,
    timeout: 10000
});

// Test connection
async function testConnection() {
    let conn;
    try {
        console.log('Attempting to connect to MariaDB with user: Sarthak...');
        conn = await pool.getConnection();
        console.log('Connected to MariaDB successfully');
        const rows = await conn.query('SELECT 1 as test');
        console.log('Test query result:', rows);
    } catch (err) {
        console.error('Database connection error:', err.message);
        console.error('Error code:', err.code);
        
        if (err.code === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR') {
            console.error('Fix: Check username/password - should be Sarthak/1234');
        }
    } finally {
        if (conn) conn.release();
    }
}

testConnection();

module.exports = { pool };
