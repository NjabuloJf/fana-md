// Import dotenv and load environment variables
require("dotenv").config();

const { Pool } = require("pg");
const s = require("../set");

// ========== FIXED DATABASE CONNECTION ==========
let dbUrl = s.DATABASE_URL || process.env.DATABASE_URL || "postgres://db_7xp9_user:6hwmTN7rGPNsjlBEHyX49CXwrG7cDeYi@dpg-cj7ldu5jeehc73b2p7g0-a.oregon-postgres.render.com/db_7xp9";
dbUrl = dbUrl.trim();

const proConfig = {
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
};

const pool = new Pool(proConfig);

// ========== TEST CONNECTION ==========
async function testConnection() {
    let client;
    try {
        client = await pool.connect();
        console.log("✅ rank - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ rank - PostgreSQL connection failed:", error.message);
        return false;
    }
}

// ========== CREATE TABLE ==========
async function createUsersRankTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ rank - Skipping table creation (no database connection)");
            return;
        }
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS users_rank (
                id SERIAL PRIMARY KEY,
                jid VARCHAR(255) UNIQUE,
                xp INTEGER DEFAULT 0,
                messages INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Table 'users_rank' created successfully!");
    } catch (error) {
        console.error("❌ Error creating 'users_rank' table:", error.message);
    } finally {
        if (client) client.release();
    }
}

createUsersRankTable();

// ========== FUNCTION: Add or update user data ==========
async function ajouterOuMettreAJourUserData(jid) {
    if (!jid) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const result = await client.query('SELECT * FROM users_rank WHERE jid = $1', [jid]);
        const jidExiste = result.rows.length > 0;
        if (jidExiste) {
            await client.query(
                'UPDATE users_rank SET xp = xp + 10, messages = messages + 1, updated_at = CURRENT_TIMESTAMP WHERE jid = $1',
                [jid]
            );
        } else {
            await client.query(
                'INSERT INTO users_rank (jid, xp, messages, level) VALUES ($1, $2, $3, $4)',
                [jid, 10, 1, 1]
            );
        }
        return true;
    } catch (error) {
        console.error("❌ Error updating user data:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get messages and XP by JID ==========
async function getMessagesAndXPByJID(jid) {
    if (!jid) return { messages: 0, xp: 0, level: 1 };
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return { messages: 0, xp: 0, level: 1 };
        client = await pool.connect();
        const query = 'SELECT messages, xp, level FROM users_rank WHERE jid = $1';
        const result = await client.query(query, [jid]);
        if (result.rows.length > 0) {
            const { messages, xp, level } = result.rows[0];
            return { 
                messages: parseInt(messages) || 0, 
                xp: parseInt(xp) || 0,
                level: parseInt(level) || 1
            };
        }
        return { messages: 0, xp: 0, level: 1 };
    } catch (error) {
        console.error("❌ Error getting user data:", error.message);
        return { messages: 0, xp: 0, level: 1 };
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get top 10 users ==========
async function getTop10Users() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return [];
        client = await pool.connect();
        const query = 'SELECT jid, xp, messages, level FROM users_rank ORDER BY xp DESC LIMIT 10';
        const result = await client.query(query);
        return result.rows || [];
    } catch (error) {
        console.error("❌ Error getting top 10 users:", error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get bottom 10 users ==========
async function getBottom10Users() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return [];
        client = await pool.connect();
        const query = 'SELECT jid, xp, messages, level FROM users_rank ORDER BY xp ASC LIMIT 10';
        const result = await client.query(query);
        return result.rows || [];
    } catch (error) {
        console.error("❌ Error getting bottom 10 users:", error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get user rank ==========
async function getUserRank(jid) {
    if (!jid) return null;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return null;
        client = await pool.connect();
        const query = `
            SELECT 
                jid, 
                xp, 
                messages, 
                level,
                RANK() OVER (ORDER BY xp DESC) as rank
            FROM users_rank 
            WHERE jid = $1
        `;
        const result = await client.query(query, [jid]);
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    } catch (error) {
        console.error("❌ Error getting user rank:", error.message);
        return null;
    } finally {
        if (client) client.release();
    }
}

module.exports = {
    ajouterOuMettreAJourUserData,
    getMessagesAndXPByJID,
    getBottom10Users,
    getTop10Users,
    getUserRank,
};
