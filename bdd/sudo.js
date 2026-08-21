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
        console.log("✅ sudo - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ sudo - PostgreSQL connection failed:", error.message);
        return false;
    }
}

async function createSudoTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return;
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS sudo (
                id SERIAL PRIMARY KEY,
                jid TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                added_by TEXT
            );
        `);
        console.log("✅ Table 'sudo' created successfully!");
    } catch (error) {
        console.error("❌ Error creating 'sudo' table:", error.message);
    } finally {
        if (client) client.release();
    }
}

createSudoTable();

async function issudo(jid) {
    if (!jid) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const query = "SELECT EXISTS (SELECT 1 FROM sudo WHERE jid = $1)";
        const result = await client.query(query, [jid]);
        return result.rows[0].exists || false;
    } catch (error) {
        console.error("❌ Error checking sudo status:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

async function addSudoNumber(jid, addedBy = null) {
    if (!jid) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const checkQuery = "SELECT EXISTS (SELECT 1 FROM sudo WHERE jid = $1)";
        const checkResult = await client.query(checkQuery, [jid]);
        if (checkResult.rows[0].exists) return true;
        const query = "INSERT INTO sudo (jid, added_by) VALUES ($1, $2)";
        await client.query(query, [jid, addedBy]);
        return true;
    } catch (error) {
        console.error("❌ Error adding sudo number:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

async function removeSudoNumber(jid) {
    if (!jid) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const query = "DELETE FROM sudo WHERE jid = $1";
        const result = await client.query(query, [jid]);
        return result.rowCount > 0;
    } catch (error) {
        console.error("❌ Error removing sudo number:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

async function getAllSudoNumbers() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return [];
        client = await pool.connect();
        const query = "SELECT jid FROM sudo";
        const result = await client.query(query);
        return result.rows.map((row) => row.jid);
    } catch (error) {
        console.error("❌ Error getting sudo numbers:", error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

async function isSudoTableNotEmpty() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const result = await client.query('SELECT COUNT(*) FROM sudo');
        return parseInt(result.rows[0].count) > 0;
    } catch (error) {
        console.error('❌ Error checking sudo table:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

module.exports = {
    issudo,
    addSudoNumber,
    removeSudoNumber,
    getAllSudoNumbers,
    isSudoTableNotEmpty,
};