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
        console.log("✅ banGroup - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ banGroup - PostgreSQL connection failed:", error.message);
        return false;
    }
}

const creerTableBanGroup = async () => {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return;
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS banGroup (
                groupeJid TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                banned_by TEXT
            );
        `);
        console.log("✅ Table 'banGroup' created successfully!");
    } catch (e) {
        console.error("❌ Error creating 'banGroup' table:", e.message);
    } finally {
        if (client) client.release();
    }
};

creerTableBanGroup();

async function addGroupToBanList(groupeJid, bannedBy = null) {
    if (!groupeJid) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const checkQuery = "SELECT EXISTS (SELECT 1 FROM banGroup WHERE groupeJid = $1)";
        const checkResult = await client.query(checkQuery, [groupeJid]);
        if (checkResult.rows[0].exists) return true;
        const query = "INSERT INTO banGroup (groupeJid, banned_by) VALUES ($1, $2)";
        await client.query(query, [groupeJid, bannedBy]);
        return true;
    } catch (error) {
        console.error("❌ Error adding group to ban list:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

async function isGroupBanned(groupeJid) {
    if (!groupeJid) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const query = "SELECT EXISTS (SELECT 1 FROM banGroup WHERE groupeJid = $1)";
        const result = await client.query(query, [groupeJid]);
        return result.rows[0].exists || false;
    } catch (error) {
        console.error("❌ Error checking if group is banned:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

async function removeGroupFromBanList(groupeJid) {
    if (!groupeJid) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const query = "DELETE FROM banGroup WHERE groupeJid = $1";
        const result = await client.query(query, [groupeJid]);
        return result.rowCount > 0;
    } catch (error) {
        console.error("❌ Error removing group from ban list:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

module.exports = {
    addGroupToBanList,
    isGroupBanned,
    removeGroupFromBanList,
};