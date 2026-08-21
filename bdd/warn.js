require("dotenv").config();
const { Pool } = require("pg");
const s = require("../set");

let dbUrl = s.DATABASE_URL || process.env.DATABASE_URL || "postgres://db_7xp9_user:6hwmTN7rGPNsjlBEHyX49CXwrG7cDeYi@dpg-cj7ldu5jeehc73b2p7g0-a.oregon-postgres.render.com/db_7xp9";
dbUrl = dbUrl.trim();

const proConfig = {
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
};

const pool = new Pool(proConfig);

async function testConnection() {
    let client;
    try {
        client = await pool.connect();
        console.log("✅ warn - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ warn - PostgreSQL connection failed:", error.message);
        return false;
    }
}

async function createWarnTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return;
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS warn (
                id SERIAL PRIMARY KEY,
                jid TEXT NOT NULL UNIQUE,
                warn_count INTEGER DEFAULT 1,
                reason TEXT,
                warned_by TEXT,
                warned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Table 'warn' created successfully!");
    } catch (error) {
        console.error("❌ Error creating 'warn' table:", error.message);
    } finally {
        if (client) client.release();
    }
}

createWarnTable();

async function getWarnCountByJID(jid) {
    if (!jid) return 0;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return 0;
        client = await pool.connect();
        const query = "SELECT warn_count FROM warn WHERE jid = $1";
        const result = await client.query(query, [jid]);
        if (result.rows.length > 0) {
            return parseInt(result.rows[0].warn_count) || 1;
        }
        return 0;
    } catch (error) {
        console.error("❌ Error getting warn count:", error.message);
        return 0;
    } finally {
        if (client) client.release();
    }
}

async function ajouterUtilisateurAvecWarnCount(jid, reason = null, warnedBy = null) {
    if (!jid) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const checkQuery = "SELECT * FROM warn WHERE jid = $1";
        const checkResult = await client.query(checkQuery, [jid]);
        const exists = checkResult.rows.length > 0;
        if (exists) {
            const currentCount = parseInt(checkResult.rows[0].warn_count) || 1;
            const newCount = currentCount + 1;
            await client.query(
                'UPDATE warn SET warn_count = $1, reason = $2, warned_by = $3 WHERE jid = $4',
                [newCount, reason, warnedBy, jid]
            );
        } else {
            await client.query(
                'INSERT INTO warn (jid, warn_count, reason, warned_by) VALUES ($1, $2, $3, $4)',
                [jid, 1, reason, warnedBy]
            );
        }
        return true;
    } catch (error) {
        console.error("❌ Error adding warn:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

async function resetWarnCount(jid) {
    if (!jid) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const query = "DELETE FROM warn WHERE jid = $1";
        const result = await client.query(query, [jid]);
        return result.rowCount > 0;
    } catch (error) {
        console.error("❌ Error resetting warn count:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

module.exports = {
    getWarnCountByJID,
    ajouterUtilisateurAvecWarnCount,
    resetWarnCount,
};