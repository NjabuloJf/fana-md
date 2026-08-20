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
        console.log("✅ warn - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ warn - PostgreSQL connection failed:", error.message);
        console.log("⚠️ warn - Database features will be disabled");
        return false;
    }
}

// ========== CREATE TABLE ==========
async function createWarnTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ warn - Skipping table creation (no database connection)");
            return;
        }

        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS warn (
                id SERIAL PRIMARY KEY,
                jid TEXT NOT NULL,
                warn_count INTEGER DEFAULT 1,
                reason TEXT,
                warned_by TEXT,
                warned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(jid)
            );
        `);
        console.log("✅ Table 'warn' created successfully!");
    } catch (error) {
        console.error("❌ Error creating 'warn' table:", error.message);
    } finally {
        if (client) client.release();
    }
}

// Call table creation
createWarnTable();

// ========== FUNCTION: Get warn count by JID ==========
async function getWarnCountByJID(jid) {
    if (!jid) {
        console.log("⚠️ warn - No JID provided");
        return 0;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ warn - No database connection, returning 0");
            return 0;
        }

        client = await pool.connect();
        const query = "SELECT warn_count FROM warn WHERE jid = $1";
        const result = await client.query(query, [jid]);
        
        if (result.rows.length > 0) {
            return parseInt(result.rows[0].warn_count) || 1;
        }
        return 0; // User has no warnings
    } catch (error) {
        console.error("❌ Error getting warn count:", error.message);
        return 0;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Add or update user with warn count ==========
async function ajouterUtilisateurAvecWarnCount(jid, reason = null, warnedBy = null) {
    if (!jid) {
        console.log("⚠️ warn - No JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ warn - No database connection, cannot add warn");
            return false;
        }

        client = await pool.connect();
        
        // Check if user exists
        const checkQuery = "SELECT * FROM warn WHERE jid = $1";
        const checkResult = await client.query(checkQuery, [jid]);
        const exists = checkResult.rows.length > 0;

        if (exists) {
            // Increment warn count
            const currentCount = parseInt(checkResult.rows[0].warn_count) || 1;
            const newCount = currentCount + 1;
            
            const updateQuery = `
                UPDATE warn 
                SET warn_count = $1, reason = $2, warned_by = $3, updated_at = CURRENT_TIMESTAMP 
                WHERE jid = $4
            `;
            await client.query(updateQuery, [newCount, reason, warnedBy, jid]);
            console.log(`✅ warn - Incremented warn count for ${jid} to ${newCount}`);
        } else {
            // Insert new user with warn count 1
            const insertQuery = `
                INSERT INTO warn (jid, warn_count, reason, warned_by) 
                VALUES ($1, $2, $3, $4)
            `;
            await client.query(insertQuery, [jid, 1, reason, warnedBy]);
            console.log(`✅ warn - Added new user ${jid} with warn count 1`);
        }
        return true;
    } catch (error) {
        console.error("❌ Error adding warn:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Reset warn count for user ==========
async function resetWarnCount(jid) {
    if (!jid) {
        console.log("⚠️ warn - No JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        const query = "DELETE FROM warn WHERE jid = $1";
        const result = await client.query(query, [jid]);
        
        if (result.rowCount > 0) {
            console.log(`✅ warn - Reset warn count for ${jid}`);
            return true;
        }
        console.log(`ℹ️ warn - No warnings found for ${jid}`);
        return false;
    } catch (error) {
        console.error("❌ Error resetting warn count:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get all warned users ==========
async function getAllWarnedUsers() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ warn - No database connection, returning empty array");
            return [];
        }

        client = await pool.connect();
        const query = "SELECT * FROM warn ORDER BY warn_count DESC, warned_at DESC";
        const result = await client.query(query);
        return result.rows || [];
    } catch (error) {
        console.error("❌ Error getting warned users:", error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get warn details for a user ==========
async function getWarnDetails(jid) {
    if (!jid) {
        console.log("⚠️ warn - No JID provided");
        return null;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return null;
        }

        client = await pool.connect();
        const query = "SELECT * FROM warn WHERE jid = $1";
        const result = await client.query(query, [jid]);
        
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    } catch (error) {
        console.error("❌ Error getting warn details:", error.message);
        return null;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Decrease warn count ==========
async function decreaseWarnCount(jid) {
    if (!jid) {
        console.log("⚠️ warn - No JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        
        // Check if user exists
        const checkQuery = "SELECT warn_count FROM warn WHERE jid = $1";
        const checkResult = await client.query(checkQuery, [jid]);
        
        if (checkResult.rows.length > 0) {
            const currentCount = parseInt(checkResult.rows[0].warn_count) || 1;
            
            if (currentCount <= 1) {
                // If count is 1 or less, delete the record
                await client.query("DELETE FROM warn WHERE jid = $1", [jid]);
                console.log(`✅ warn - Removed ${jid} from warn list (count was 1)`);
            } else {
                // Decrease count
                const newCount = currentCount - 1;
                await client.query(
                    "UPDATE warn SET warn_count = $1, updated_at = CURRENT_TIMESTAMP WHERE jid = $2",
                    [newCount, jid]
                );
                console.log(`✅ warn - Decreased warn count for ${jid} to ${newCount}`);
            }
            return true;
        }
        console.log(`ℹ️ warn - No warnings found for ${jid}`);
        return false;
    } catch (error) {
        console.error("❌ Error decreasing warn count:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if user has warnings ==========
async function userHasWarnings(jid) {
    if (!jid) {
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        const query = "SELECT EXISTS (SELECT 1 FROM warn WHERE jid = $1)";
        const result = await client.query(query, [jid]);
        return result.rows[0].exists || false;
    } catch (error) {
        console.error("❌ Error checking if user has warnings:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get total warnings count ==========
async function getTotalWarningsCount() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return 0;
        }

        client = await pool.connect();
        const result = await client.query("SELECT COUNT(*) FROM warn");
        return parseInt(result.rows[0].count) || 0;
    } catch (error) {
        console.error("❌ Error getting total warnings count:", error.message);
        return 0;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Clear all warnings ==========
async function clearAllWarnings() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        const result = await client.query("DELETE FROM warn");
        
        if (result.rowCount > 0) {
            console.log(`✅ warn - Cleared ${result.rowCount} warnings`);
            return true;
        }
        return false;
    } catch (error) {
        console.error("❌ Error clearing warnings:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if database is working ==========
async function warnIsDatabaseWorking() {
    try {
        const isConnected = await testConnection();
        return isConnected;
    } catch (error) {
        console.error("❌ warn - Database connection check failed:", error.message);
        return false;
    }
}

// ========== EXPORT MODULE ==========
module.exports = {
    getWarnCountByJID,
    ajouterUtilisateurAvecWarnCount,
    resetWarnCount,
    getAllWarnedUsers,
    getWarnDetails,
    decreaseWarnCount,
    userHasWarnings,
    getTotalWarningsCount,
    clearAllWarnings,
    warnIsDatabaseWorking,
    testConnection
};
