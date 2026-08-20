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
        console.log("✅ alive - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ alive - PostgreSQL connection failed:", error.message);
        console.log("⚠️ alive - Database features will be disabled");
        return false;
    }
}

// ========== CREATE TABLE ==========
const creerTableAlive = async () => {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ alive - Skipping table creation (no database connection)");
            return;
        }

        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS alive (
                id SERIAL PRIMARY KEY,
                message TEXT,
                lien TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Table 'alive' created successfully!");
    } catch (e) {
        console.error("❌ Error creating 'alive' table:", e.message);
    } finally {
        if (client) client.release();
    }
};

// Call table creation
creerTableAlive();

// ========== FUNCTION: Add or update data ==========
async function addOrUpdateDataInAlive(message, lien) {
    if (!message && !lien) {
        console.log("⚠️ alive - No data to save");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ alive - No database connection, cannot save data");
            return false;
        }

        client = await pool.connect();
        
        // Check if record exists
        const checkQuery = "SELECT EXISTS (SELECT 1 FROM alive WHERE id = 1)";
        const checkResult = await client.query(checkQuery);
        const exists = checkResult.rows[0].exists;

        let query, values;
        if (exists) {
            // Update existing record
            query = `
                UPDATE alive 
                SET message = $1, lien = $2, updated_at = CURRENT_TIMESTAMP 
                WHERE id = 1
            `;
            values = [message, lien];
        } else {
            // Insert new record
            query = `
                INSERT INTO alive (id, message, lien) 
                VALUES (1, $1, $2)
            `;
            values = [message, lien];
        }

        await client.query(query, values);
        console.log("✅ alive - Data saved successfully!");
        return true;
    } catch (error) {
        console.error("❌ Error saving data to 'alive':", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get data from alive ==========
async function getDataFromAlive() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ alive - No database connection");
            return null;
        }

        client = await pool.connect();
        const query = "SELECT message, lien, created_at, updated_at FROM alive WHERE id = 1";
        const result = await client.query(query);

        if (result.rows.length > 0) {
            const { message, lien, created_at, updated_at } = result.rows[0];
            return { 
                message, 
                lien, 
                created_at, 
                updated_at 
            };
        } else {
            console.log("ℹ️ alive - No data found in table");
            return null;
        }
    } catch (error) {
        console.error("❌ Error getting data from 'alive':", error.message);
        return null;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get message only ==========
async function getAliveMessage() {
    const data = await getDataFromAlive();
    return data ? data.message : null;
}

// ========== FUNCTION: Get link only ==========
async function getAliveLink() {
    const data = await getDataFromAlive();
    return data ? data.lien : null;
}

// ========== FUNCTION: Delete alive data ==========
async function deleteAliveData() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        const query = "DELETE FROM alive WHERE id = 1";
        const result = await client.query(query);
        
        if (result.rowCount > 0) {
            console.log("✅ alive - Data deleted successfully");
            return true;
        } else {
            console.log("ℹ️ alive - No data to delete");
            return false;
        }
    } catch (error) {
        console.error("❌ Error deleting data from 'alive':", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if data exists ==========
async function aliveDataExists() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        const query = "SELECT EXISTS (SELECT 1 FROM alive WHERE id = 1)";
        const result = await client.query(query);
        return result.rows[0].exists || false;
    } catch (error) {
        console.error("❌ Error checking if alive data exists:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Update message only ==========
async function updateAliveMessage(message) {
    if (!message) {
        console.log("⚠️ alive - No message provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        
        // Check if record exists
        const checkQuery = "SELECT EXISTS (SELECT 1 FROM alive WHERE id = 1)";
        const checkResult = await client.query(checkQuery);
        const exists = checkResult.rows[0].exists;

        if (exists) {
            await client.query(
                'UPDATE alive SET message = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
                [message]
            );
        } else {
            await client.query(
                'INSERT INTO alive (id, message) VALUES (1, $1)',
                [message]
            );
        }
        
        console.log("✅ alive - Message updated successfully");
        return true;
    } catch (error) {
        console.error("❌ Error updating message in 'alive':", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Update link only ==========
async function updateAliveLink(lien) {
    if (!lien) {
        console.log("⚠️ alive - No link provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        
        // Check if record exists
        const checkQuery = "SELECT EXISTS (SELECT 1 FROM alive WHERE id = 1)";
        const checkResult = await client.query(checkQuery);
        const exists = checkResult.rows[0].exists;

        if (exists) {
            await client.query(
                'UPDATE alive SET lien = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
                [lien]
            );
        } else {
            await client.query(
                'INSERT INTO alive (id, lien) VALUES (1, $1)',
                [lien]
            );
        }
        
        console.log("✅ alive - Link updated successfully");
        return true;
    } catch (error) {
        console.error("❌ Error updating link in 'alive':", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== EXPORT MODULE ==========
module.exports = {
    addOrUpdateDataInAlive,
    getDataFromAlive,
    getAliveMessage,
    getAliveLink,
    deleteAliveData,
    aliveDataExists,
    updateAliveMessage,
    updateAliveLink,
    testConnection
};
