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

const pool = new Pool(proConfig);

// ========== TEST CONNECTION ==========
async function testConnection() {
    let client;
    try {
        client = await pool.connect();
        console.log("✅ sudo - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ sudo - PostgreSQL connection failed:", error.message);
        console.log("⚠️ sudo - Database features will be disabled");
        return false;
    }
}

// ========== CREATE TABLE ==========
async function createSudoTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ sudo - Skipping table creation (no database connection)");
            return;
        }

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

// Call table creation
createSudoTable();

// ========== FUNCTION: Check if JID is sudo ==========
async function issudo(jid) {
    if (!jid) {
        console.log("⚠️ sudo - No JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ sudo - No database connection, returning false");
            return false;
        }

        client = await pool.connect();
        const query = "SELECT EXISTS (SELECT 1 FROM sudo WHERE jid = $1)";
        const values = [jid];
        const result = await client.query(query, values);
        return result.rows[0].exists || false;
    } catch (error) {
        console.error("❌ Error checking sudo status:", error.message);
        return false; // Return false on error (fail safe)
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Add sudo number ==========
async function addSudoNumber(jid, addedBy = null) {
    if (!jid) {
        console.log("⚠️ sudo - No JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ sudo - No database connection, cannot add sudo");
            return false;
        }

        client = await pool.connect();
        
        // Check if JID already exists
        const checkQuery = "SELECT EXISTS (SELECT 1 FROM sudo WHERE jid = $1)";
        const checkResult = await client.query(checkQuery, [jid]);
        
        if (checkResult.rows[0].exists) {
            console.log(`ℹ️ sudo - JID ${jid} is already in sudo list`);
            return true;
        }

        // Insert JID into sudo table
        const query = "INSERT INTO sudo (jid, added_by) VALUES ($1, $2)";
        const values = [jid, addedBy];
        await client.query(query, values);
        
        console.log(`✅ sudo - JID ${jid} added to sudo list`);
        return true;
    } catch (error) {
        console.error("❌ Error adding sudo number:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Remove sudo number ==========
async function removeSudoNumber(jid) {
    if (!jid) {
        console.log("⚠️ sudo - No JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ sudo - No database connection, cannot remove sudo");
            return false;
        }

        client = await pool.connect();
        const query = "DELETE FROM sudo WHERE jid = $1";
        const values = [jid];
        const result = await client.query(query, values);
        
        if (result.rowCount > 0) {
            console.log(`✅ sudo - JID ${jid} removed from sudo list`);
            return true;
        } else {
            console.log(`ℹ️ sudo - JID ${jid} was not in sudo list`);
            return false;
        }
    } catch (error) {
        console.error("❌ Error removing sudo number:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get all sudo numbers ==========
async function getAllSudoNumbers() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ sudo - No database connection, returning empty array");
            return [];
        }

        client = await pool.connect();
        const query = "SELECT jid FROM sudo ORDER BY created_at DESC";
        const result = await client.query(query);
        
        // Create array of JIDs
        const sudoNumbers = result.rows.map((row) => row.jid);
        return sudoNumbers;
    } catch (error) {
        console.error("❌ Error getting sudo numbers:", error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if sudo table is not empty ==========
async function isSudoTableNotEmpty() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ sudo - No database connection");
            return false;
        }

        client = await pool.connect();
        const result = await client.query('SELECT COUNT(*) FROM sudo');
        const rowCount = parseInt(result.rows[0].count);
        return rowCount > 0;
    } catch (error) {
        console.error('❌ Error checking sudo table:', error.message);
        return false; // Consider table as empty on error
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get sudo count ==========
async function getSudoCount() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return 0;
        }

        client = await pool.connect();
        const result = await client.query('SELECT COUNT(*) FROM sudo');
        return parseInt(result.rows[0].count) || 0;
    } catch (error) {
        console.error('❌ Error getting sudo count:', error.message);
        return 0;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get sudo details ==========
async function getSudoDetails(jid) {
    if (!jid) {
        console.log("⚠️ sudo - No JID provided");
        return null;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return null;
        }

        client = await pool.connect();
        const query = "SELECT id, jid, created_at, added_by FROM sudo WHERE jid = $1";
        const result = await client.query(query, [jid]);
        
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    } catch (error) {
        console.error('❌ Error getting sudo details:', error.message);
        return null;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Clear all sudo numbers ==========
async function clearAllSudo() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        const result = await client.query('DELETE FROM sudo');
        
        if (result.rowCount > 0) {
            console.log(`✅ sudo - Cleared ${result.rowCount} sudo entries`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Error clearing sudo table:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if database is working ==========
async function sudoIsDatabaseWorking() {
    try {
        const isConnected = await testConnection();
        return isConnected;
    } catch (error) {
        console.error("❌ sudo - Database connection check failed:", error.message);
        return false;
    }
}

// ========== EXPORT MODULE ==========
module.exports = {
    issudo,
    addSudoNumber,
    removeSudoNumber,
    getAllSudoNumbers,
    isSudoTableNotEmpty,
    getSudoCount,
    getSudoDetails,
    clearAllSudo,
    sudoIsDatabaseWorking,
    testConnection
};
