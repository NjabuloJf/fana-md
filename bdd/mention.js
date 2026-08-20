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
        console.log("✅ mention - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ mention - PostgreSQL connection failed:", error.message);
        console.log("⚠️ mention - Database features will be disabled");
        return false;
    }
}

// ========== CREATE TABLE ==========
async function creerTableMention() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ mention - Skipping table creation (no database connection)");
            return;
        }

        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS mention (
                id SERIAL PRIMARY KEY,
                status TEXT DEFAULT 'off',
                url TEXT,
                type TEXT,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Table 'mention' created successfully!");
    } catch (e) {
        console.error("❌ Error creating 'mention' table:", e.message);
    } finally {
        if (client) client.release();
    }
}

// Call table creation
creerTableMention();

// ========== FUNCTION: Add or update data in mention ==========
async function addOrUpdateDataInMention(url, type, message) {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ mention - No database connection, cannot save data");
            return false;
        }

        client = await pool.connect();
        
        // Check if record exists
        const checkQuery = "SELECT EXISTS (SELECT 1 FROM mention WHERE id = 1)";
        const checkResult = await client.query(checkQuery);
        const exists = checkResult.rows[0].exists;

        let query, values;
        if (exists) {
            // Update existing record
            query = `
                UPDATE mention 
                SET url = $1, type = $2, message = $3, updated_at = CURRENT_TIMESTAMP 
                WHERE id = 1
            `;
            values = [url, type, message];
        } else {
            // Insert new record
            query = `
                INSERT INTO mention (id, url, type, message) 
                VALUES (1, $1, $2, $3)
            `;
            values = [url, type, message];
        }

        await client.query(query, values);
        console.log("✅ mention - Data saved successfully!");
        return true;
    } catch (error) {
        console.error("❌ Error saving data to 'mention':", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Modify status for ID 1 ==========
async function modifierStatusId1(nouveauStatus) {
    if (!nouveauStatus) {
        console.log("⚠️ mention - No status provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ mention - No database connection, cannot update status");
            return false;
        }

        client = await pool.connect();
        
        // Check if record exists
        const checkQuery = "SELECT EXISTS (SELECT 1 FROM mention WHERE id = 1)";
        const checkResult = await client.query(checkQuery);
        const exists = checkResult.rows[0].exists;

        if (exists) {
            const query = `
                UPDATE mention 
                SET status = $1, updated_at = CURRENT_TIMESTAMP 
                WHERE id = 1
            `;
            await client.query(query, [nouveauStatus]);
            console.log(`✅ mention - Status updated to '${nouveauStatus}' for ID 1`);
        } else {
            // Insert with status if record doesn't exist
            const query = `
                INSERT INTO mention (id, status) 
                VALUES (1, $1)
            `;
            await client.query(query, [nouveauStatus]);
            console.log(`✅ mention - Created record with status '${nouveauStatus}' for ID 1`);
        }
        return true;
    } catch (error) {
        console.error("❌ Error updating status in 'mention':", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get status for ID 1 ==========
async function getStatusId1() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return 'off';
        }

        client = await pool.connect();
        const query = "SELECT status FROM mention WHERE id = 1";
        const result = await client.query(query);
        
        if (result.rows.length > 0) {
            return result.rows[0].status || 'off';
        }
        return 'off';
    } catch (error) {
        console.error("❌ Error getting status from 'mention':", error.message);
        return 'off';
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get all values ==========
async function recupererToutesLesValeurs() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ mention - No database connection, returning empty array");
            return [];
        }

        client = await pool.connect();
        const query = "SELECT * FROM mention ORDER BY id";
        const result = await client.query(query);
        
        console.log(`✅ mention - Retrieved ${result.rows.length} records`);
        return result.rows || [];
    } catch (error) {
        console.error("❌ Error getting values from 'mention':", error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get mention by ID ==========
async function getMentionById(id) {
    if (!id) {
        console.log("⚠️ mention - No ID provided");
        return null;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return null;
        }

        client = await pool.connect();
        const query = "SELECT * FROM mention WHERE id = $1";
        const result = await client.query(query, [id]);
        
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    } catch (error) {
        console.error("❌ Error getting mention by ID:", error.message);
        return null;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Update mention data ==========
async function updateMention(id, url, type, message) {
    if (!id) {
        console.log("⚠️ mention - No ID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        const query = `
            UPDATE mention 
            SET url = $1, type = $2, message = $3, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $4
        `;
        const values = [url, type, message, id];
        const result = await client.query(query, values);
        
        if (result.rowCount > 0) {
            console.log(`✅ mention - Updated record ID ${id}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error("❌ Error updating mention:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Delete mention by ID ==========
async function deleteMention(id) {
    if (!id) {
        console.log("⚠️ mention - No ID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        const query = "DELETE FROM mention WHERE id = $1";
        const result = await client.query(query, [id]);
        
        if (result.rowCount > 0) {
            console.log(`✅ mention - Deleted record ID ${id}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error("❌ Error deleting mention:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if mention exists ==========
async function mentionExists(id) {
    if (!id) {
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        const query = "SELECT EXISTS (SELECT 1 FROM mention WHERE id = $1)";
        const result = await client.query(query, [id]);
        return result.rows[0].exists || false;
    } catch (error) {
        console.error("❌ Error checking if mention exists:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if status is enabled ==========
async function isMentionEnabled() {
    const status = await getStatusId1();
    return status === 'on' || status === 'oui' || status === 'yes' || status === 'true';
}

// ========== FUNCTION: Toggle mention status ==========
async function toggleMention(status) {
    return await modifierStatusId1(status);
}

// ========== FUNCTION: Check if database is working ==========
async function mentionIsDatabaseWorking() {
    try {
        const isConnected = await testConnection();
        return isConnected;
    } catch (error) {
        console.error("❌ mention - Database connection check failed:", error.message);
        return false;
    }
}

// ========== EXPORT MODULE ==========
module.exports = {
    addOrUpdateDataInMention,
    recupererToutesLesValeurs,
    modifierStatusId1,
    getStatusId1,
    getMentionById,
    updateMention,
    deleteMention,
    mentionExists,
    isMentionEnabled,
    toggleMention,
    mentionIsDatabaseWorking,
    testConnection
};
