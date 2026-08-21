// bdd/database.js
const { Pool } = require('pg');
const path = require('path');
const s = require('../set');

let dbUrl = s.DATABASE_URL || process.env.DATABASE_URL || "postgres://db_7xp9_user:6hwmTN7rGPNsjlBEHyX49CXwrG7cDeYi@dpg-cj7ldu5jeehc73b2p7g0-a.oregon-postgres.render.com/db_7xp9";
dbUrl = dbUrl.trim();

const proConfig = {
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
    max: 3, // Max connections in pool
};

const pool = new Pool(proConfig);

// Connection test with retry
async function testConnection(retries = 3) {
    for (let i = 0; i < retries; i++) {
        let client;
        try {
            client = await pool.connect();
            console.log(`✅ Database connected successfully!`);
            client.release();
            return true;
        } catch (error) {
            console.log(`⚠️ Database connection attempt ${i + 1}/${retries} failed:`, error.message);
            if (client) client.release();
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
            }
        }
    }
    console.log('❌ All database connection attempts failed');
    return false;
}

// Wrapper for queries with retry
async function query(text, params, retries = 2) {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await pool.query(text, params);
            return result;
        } catch (error) {
            if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                console.log(`⚠️ Query retry ${i + 1}/${retries}...`);
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
            }
            throw error;
        }
    }
}

module.exports = {
    pool,
    testConnection,
    query,
};
