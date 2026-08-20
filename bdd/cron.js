require("dotenv").config();
const { Pool } = require("pg");
let s = require("../set");

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

const pool = new Pool(proConfig);

// ========== TEST CONNECTION ==========
async function testConnection() {
    let client;
    try {
        client = await pool.connect();
        console.log("✅ cron - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ cron - PostgreSQL connection failed:", error.message);
        console.log("⚠️ cron - Database features will be disabled");
        return false;
    }
}

// ========== CREATE TABLE ==========
async function createTablecron() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ cron - Skipping table creation (no database connection)");
            return;
        }

        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS cron (
                group_id TEXT PRIMARY KEY,
                mute_at TEXT DEFAULT NULL,
                unmute_at TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Table 'cron' created successfully!");
    } catch (error) {
        console.error("❌ Error creating 'cron' table:", error.message);
    } finally {
        if (client) client.release();
    }
}

// Call table creation
createTablecron();

// ========== FUNCTION: Get all cron entries ==========
async function getCron() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ cron - No database connection, returning empty array");
            return [];
        }

        client = await pool.connect();
        const result = await client.query('SELECT * FROM cron ORDER BY created_at DESC');
        return result.rows || [];
    } catch (error) {
        console.error('❌ Error fetching cron data:', error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Add or update cron entry ==========
async function addCron(group_id, rows, value) {
    if (!group_id) {
        console.log("⚠️ cron - No group ID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ cron - No database connection, cannot add cron");
            return false;
        }

        client = await pool.connect();
        
        // Check if entry exists
        const response = await client.query('SELECT * FROM cron WHERE group_id = $1', [group_id]);
        const exist = response.rows.length > 0;

        if (exist) {
            // Update existing entry
            await client.query(
                `UPDATE cron SET ${rows} = $1 WHERE group_id = $2`,
                [value, group_id]
            );
            console.log(`✅ cron - Updated ${rows} for group ${group_id}`);
        } else {
            // Insert new entry
            const query = `INSERT INTO cron (group_id, ${rows}) VALUES ($1, $2)`;
            await client.query(query, [group_id, value]);
            console.log(`✅ cron - Added ${rows} for group ${group_id}`);
        }
        return true;
    } catch (error) {
        console.error('❌ Error adding cron data:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get cron entry by group ID ==========
async function getCronById(group_id) {
    if (!group_id) {
        console.log("⚠️ cron - No group ID provided");
        return null;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ cron - No database connection");
            return null;
        }

        client = await pool.connect();
        const result = await client.query('SELECT * FROM cron WHERE group_id = $1', [group_id]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('❌ Error fetching cron by ID:', error.message);
        return null;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Delete cron entry ==========
async function delCron(group_id) {
    if (!group_id) {
        console.log("⚠️ cron - No group ID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ cron - No database connection, cannot delete");
            return false;
        }

        client = await pool.connect();
        const result = await client.query('DELETE FROM cron WHERE group_id = $1', [group_id]);
        
        if (result.rowCount > 0) {
            console.log(`✅ cron - Deleted entry for group ${group_id}`);
            return true;
        } else {
            console.log(`ℹ️ cron - No entry found for group ${group_id}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Error deleting cron entry:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get active cron entries ==========
async function getActiveCrons() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return [];
        }

        client = await pool.connect();
        const result = await client.query(`
            SELECT * FROM cron 
            WHERE mute_at IS NOT NULL OR unmute_at IS NOT NULL
        `);
        return result.rows || [];
    } catch (error) {
        console.error('❌ Error getting active crons:', error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Update mute time ==========
async function updateMuteTime(group_id, mute_at) {
    if (!group_id) return false;
    
    let client;
    try {
        client = await pool.connect();
        await client.query(
            'UPDATE cron SET mute_at = $1 WHERE group_id = $2',
            [mute_at, group_id]
        );
        return true;
    } catch (error) {
        console.error('❌ Error updating mute time:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Update unmute time ==========
async function updateUnmuteTime(group_id, unmute_at) {
    if (!group_id) return false;
    
    let client;
    try {
        client = await pool.connect();
        await client.query(
            'UPDATE cron SET unmute_at = $1 WHERE group_id = $2',
            [unmute_at, group_id]
        );
        return true;
    } catch (error) {
        console.error('❌ Error updating unmute time:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== EXPORT MODULE ==========
module.exports = {
    getCron,
    addCron,
    delCron,
    getCronById,
    getActiveCrons,
    updateMuteTime,
    updateUnmuteTime,
    testConnection
};
