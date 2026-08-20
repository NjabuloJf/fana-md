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
        console.log("✅ onlyAdmin - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ onlyAdmin - PostgreSQL connection failed:", error.message);
        console.log("⚠️ onlyAdmin - Database features will be disabled");
        return false;
    }
}

// ========== CREATE TABLE ==========
const creerTableOnlyAdmin = async () => {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ onlyAdmin - Skipping table creation (no database connection)");
            return;
        }

        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS onlyAdmin (
                groupeJid TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                added_by TEXT
            );
        `);
        console.log("✅ Table 'onlyAdmin' created successfully!");
    } catch (e) {
        console.error("❌ Error creating 'onlyAdmin' table:", e.message);
    } finally {
        if (client) client.release();
    }
};

// Call table creation
creerTableOnlyAdmin();

// ========== FUNCTION: Add group to onlyAdmin list ==========
async function addGroupToOnlyAdminList(groupeJid, addedBy = null) {
    if (!groupeJid) {
        console.log("⚠️ onlyAdmin - No group JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ onlyAdmin - No database connection, cannot add group");
            return false;
        }

        client = await pool.connect();
        
        // Check if group already exists
        const checkQuery = "SELECT EXISTS (SELECT 1 FROM onlyAdmin WHERE groupeJid = $1)";
        const checkResult = await client.query(checkQuery, [groupeJid]);
        
        if (checkResult.rows[0].exists) {
            console.log(`ℹ️ onlyAdmin - Group ${groupeJid} is already in onlyAdmin list`);
            return true;
        }

        // Insert group into onlyAdmin list
        const query = "INSERT INTO onlyAdmin (groupeJid, added_by) VALUES ($1, $2)";
        const values = [groupeJid, addedBy];
        await client.query(query, values);
        
        console.log(`✅ onlyAdmin - Group ${groupeJid} added to onlyAdmin list`);
        return true;
    } catch (error) {
        console.error("❌ Error adding group to onlyAdmin list:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if group is onlyAdmin ==========
async function isGroupOnlyAdmin(groupeJid) {
    if (!groupeJid) {
        console.log("⚠️ onlyAdmin - No group JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ onlyAdmin - No database connection, returning false");
            return false;
        }

        client = await pool.connect();
        const query = "SELECT EXISTS (SELECT 1 FROM onlyAdmin WHERE groupeJid = $1)";
        const values = [groupeJid];
        const result = await client.query(query, values);
        return result.rows[0].exists || false;
    } catch (error) {
        console.error("❌ Error checking if group is onlyAdmin:", error.message);
        return false; // Return false on error (fail safe)
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Remove group from onlyAdmin list ==========
async function removeGroupFromOnlyAdminList(groupeJid) {
    if (!groupeJid) {
        console.log("⚠️ onlyAdmin - No group JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ onlyAdmin - No database connection, cannot remove group");
            return false;
        }

        client = await pool.connect();
        const query = "DELETE FROM onlyAdmin WHERE groupeJid = $1";
        const values = [groupeJid];
        const result = await client.query(query, values);
        
        if (result.rowCount > 0) {
            console.log(`✅ onlyAdmin - Group ${groupeJid} removed from onlyAdmin list`);
            return true;
        } else {
            console.log(`ℹ️ onlyAdmin - Group ${groupeJid} was not in onlyAdmin list`);
            return false;
        }
    } catch (error) {
        console.error("❌ Error removing group from onlyAdmin list:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get all onlyAdmin groups ==========
async function getAllOnlyAdminGroups() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ onlyAdmin - No database connection, returning empty array");
            return [];
        }

        client = await pool.connect();
        const query = "SELECT groupeJid, created_at, added_by FROM onlyAdmin ORDER BY created_at DESC";
        const result = await client.query(query);
        return result.rows || [];
    } catch (error) {
        console.error("❌ Error getting onlyAdmin groups:", error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get onlyAdmin count ==========
async function getOnlyAdminCount() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return 0;
        }

        client = await pool.connect();
        const result = await client.query('SELECT COUNT(*) FROM onlyAdmin');
        return parseInt(result.rows[0].count) || 0;
    } catch (error) {
        console.error('❌ Error getting onlyAdmin count:', error.message);
        return 0;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if group exists ==========
async function onlyAdminGroupExists(groupeJid) {
    if (!groupeJid) {
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        const query = "SELECT EXISTS (SELECT 1 FROM onlyAdmin WHERE groupeJid = $1)";
        const result = await client.query(query, [groupeJid]);
        return result.rows[0].exists || false;
    } catch (error) {
        console.error('❌ Error checking if onlyAdmin group exists:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Clear all onlyAdmin groups ==========
async function clearAllOnlyAdmin() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        const result = await client.query('DELETE FROM onlyAdmin');
        
        if (result.rowCount > 0) {
            console.log(`✅ onlyAdmin - Cleared ${result.rowCount} groups from onlyAdmin list`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Error clearing onlyAdmin table:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if database is working ==========
async function onlyAdminIsDatabaseWorking() {
    try {
        const isConnected = await testConnection();
        return isConnected;
    } catch (error) {
        console.error("❌ onlyAdmin - Database connection check failed:", error.message);
        return false;
    }
}

// ========== EXPORT MODULE ==========
module.exports = {
    addGroupToOnlyAdminList,
    isGroupOnlyAdmin,
    removeGroupFromOnlyAdminList,
    getAllOnlyAdminGroups,
    getOnlyAdminCount,
    onlyAdminGroupExists,
    clearAllOnlyAdmin,
    onlyAdminIsDatabaseWorking,
    testConnection
};
