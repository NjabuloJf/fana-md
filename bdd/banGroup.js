// Import dotenv and load environment variables
require("dotenv").config();

const { Pool } = require("pg");
const s = require("../set");

// ========== FIXED DATABASE CONNECTION ==========
let dbUrl = s.DATABASE_URL || process.env.DATABASE_URL || "postgres://db_7xp9_user:6hwmTN7rGPNsjlBEHyX49CXwrG7cDeYi@dpg-cj7ldu5jeehc73b2p7g0-a.oregon-postgres.render.com/db_7xp9";

// Clean the URL
dbUrl = dbUrl.trim();

const proConfig = {
    connectionString: dbUrl,
    ssl: {
        rejectUnauthorized: false,
    },
    // Add connection timeout to prevent hanging
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
};

// Create PostgreSQL connection pool
const pool = new Pool(proConfig);

// ========== TEST CONNECTION ==========
async function testConnection() {
    let client;
    try {
        client = await pool.connect();
        console.log("✅ banGroup - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ banGroup - PostgreSQL connection failed:", error.message);
        console.log("⚠️ banGroup - Database features will be disabled");
        return false;
    }
}

// ========== CREATE TABLE ==========
const creerTableBanGroup = async () => {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ banGroup - Skipping table creation (no database connection)");
            return;
        }

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

// Call table creation
creerTableBanGroup();

// ========== FUNCTION: Add group to ban list ==========
async function addGroupToBanList(groupeJid, bannedBy = null) {
    if (!groupeJid) {
        console.log("⚠️ banGroup - No group JID provided");
        return false;
    }

    let client;
    try {
        client = await pool.connect();
        
        // Check if group already exists
        const checkQuery = "SELECT EXISTS (SELECT 1 FROM banGroup WHERE groupeJid = $1)";
        const checkResult = await client.query(checkQuery, [groupeJid]);
        
        if (checkResult.rows[0].exists) {
            console.log(`ℹ️ Group ${groupeJid} is already banned`);
            return true;
        }

        // Insert group into ban list
        const query = "INSERT INTO banGroup (groupeJid, banned_by) VALUES ($1, $2)";
        const values = [groupeJid, bannedBy];
        await client.query(query, values);
        
        console.log(`✅ Group ${groupeJid} added to ban list`);
        return true;
    } catch (error) {
        console.error("❌ Error adding group to ban list:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if group is banned ==========
async function isGroupBanned(groupeJid) {
    if (!groupeJid) return false;

    let client;
    try {
        client = await pool.connect();
        const query = "SELECT EXISTS (SELECT 1 FROM banGroup WHERE groupeJid = $1)";
        const values = [groupeJid];
        const result = await client.query(query, values);
        return result.rows[0].exists || false;
    } catch (error) {
        console.error("❌ Error checking if group is banned:", error.message);
        return false; // Return false on error (fail safe)
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Remove group from ban list ==========
async function removeGroupFromBanList(groupeJid) {
    if (!groupeJid) {
        console.log("⚠️ banGroup - No group JID provided");
        return false;
    }

    let client;
    try {
        client = await pool.connect();
        const query = "DELETE FROM banGroup WHERE groupeJid = $1";
        const values = [groupeJid];
        const result = await client.query(query, values);
        
        if (result.rowCount > 0) {
            console.log(`✅ Group ${groupeJid} removed from ban list`);
            return true;
        } else {
            console.log(`ℹ️ Group ${groupeJid} was not in ban list`);
            return false;
        }
    } catch (error) {
        console.error("❌ Error removing group from ban list:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get all banned groups ==========
async function getAllBannedGroups() {
    let client;
    try {
        client = await pool.connect();
        const query = "SELECT groupeJid, created_at, banned_by FROM banGroup ORDER BY created_at DESC";
        const result = await client.query(query);
        return result.rows;
    } catch (error) {
        console.error("❌ Error getting banned groups:", error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if database is working ==========
async function isDatabaseWorking() {
    try {
        const isConnected = await testConnection();
        return isConnected;
    } catch (error) {
        console.error("❌ Database connection check failed:", error.message);
        return false;
    }
}

// ========== EXPORT MODULE ==========
module.exports = {
    addGroupToBanList,
    isGroupBanned,
    removeGroupFromBanList,
    getAllBannedGroups,
    isDatabaseWorking,
    testConnection
};
