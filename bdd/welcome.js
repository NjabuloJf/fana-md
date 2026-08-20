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
        console.log("✅ events - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ events - PostgreSQL connection failed:", error.message);
        console.log("⚠️ events - Database features will be disabled");
        return false;
    }
}

// ========== CREATE TABLE ==========
const creerTableevents = async () => {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ events - Skipping table creation (no database connection)");
            return;
        }

        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS events (
                Id SERIAL PRIMARY KEY,
                jid TEXT UNIQUE,
                welcome TEXT DEFAULT 'off',
                goodbye TEXT DEFAULT 'off',
                antipromote TEXT DEFAULT 'off',
                antidemote TEXT DEFAULT 'off',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Table 'events' created successfully!");
    } catch (e) {
        console.error("❌ Error creating 'events' table:", e.message);
    } finally {
        if (client) client.release();
    }
};

// Call table creation
creerTableevents();

// ========== FUNCTION: Assign or update a value ==========
async function attribuerUnevaleur(jid, row, valeur) {
    if (!jid || !row) {
        console.log("⚠️ events - Missing JID or row name");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ events - No database connection");
            return false;
        }

        client = await pool.connect();
        
        // Check if JID exists
        const result = await client.query('SELECT * FROM events WHERE jid = $1', [jid]);
        const jidExiste = result.rows.length > 0;

        if (jidExiste) {
            // Update existing record
            await client.query(
                `UPDATE events SET ${row} = $1, updated_at = CURRENT_TIMESTAMP WHERE jid = $2`,
                [valeur, jid]
            );
            console.log(`✅ events - Updated ${row} to ${valeur} for ${jid}`);
        } else {
            // Insert new record
            await client.query(
                `INSERT INTO events (jid, ${row}) VALUES ($1, $2)`,
                [jid, valeur]
            );
            console.log(`✅ events - Added new JID ${jid} with ${row} = ${valeur}`);
        }
        return true;
    } catch (error) {
        console.error("❌ Error updating events:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get event value ==========
async function recupevents(jid, row) {
    if (!jid || !row) {
        console.log("⚠️ events - Missing JID or row name");
        return 'off';
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ events - No database connection, returning default");
            return 'off';
        }

        client = await pool.connect();
        const result = await client.query(
            `SELECT ${row} FROM events WHERE jid = $1`,
            [jid]
        );
        
        if (result.rows.length > 0) {
            const value = result.rows[0][row];
            return value || 'off';
        }
        return 'off'; // Default if JID not found
    } catch (e) {
        console.error("❌ Error getting event value:", e.message);
        return 'off'; // Default on error
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if welcome is enabled ==========
async function isWelcomeEnabled(jid) {
    const value = await recupevents(jid, 'welcome');
    return value === 'on' || value === 'oui' || value === 'yes' || value === 'true';
}

// ========== FUNCTION: Check if goodbye is enabled ==========
async function isGoodbyeEnabled(jid) {
    const value = await recupevents(jid, 'goodbye');
    return value === 'on' || value === 'oui' || value === 'yes' || value === 'true';
}

// ========== FUNCTION: Check if antipromote is enabled ==========
async function isAntipromoteEnabled(jid) {
    const value = await recupevents(jid, 'antipromote');
    return value === 'on' || value === 'oui' || value === 'yes' || value === 'true';
}

// ========== FUNCTION: Check if antidemote is enabled ==========
async function isAntidemoteEnabled(jid) {
    const value = await recupevents(jid, 'antidemote');
    return value === 'on' || value === 'oui' || value === 'yes' || value === 'true';
}

// ========== FUNCTION: Get all events for a group ==========
async function getGroupEvents(jid) {
    if (!jid) {
        console.log("⚠️ events - No JID provided");
        return null;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return null;
        }

        client = await pool.connect();
        const result = await client.query(
            'SELECT welcome, goodbye, antipromote, antidemote FROM events WHERE jid = $1',
            [jid]
        );
        
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    } catch (error) {
        console.error("❌ Error getting group events:", error.message);
        return null;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Delete group events ==========
async function deleteGroupEvents(jid) {
    if (!jid) {
        console.log("⚠️ events - No JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        const result = await client.query(
            'DELETE FROM events WHERE jid = $1',
            [jid]
        );
        
        if (result.rowCount > 0) {
            console.log(`✅ events - Deleted events for ${jid}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error("❌ Error deleting group events:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Toggle welcome ==========
async function toggleWelcome(jid, value) {
    return await attribuerUnevaleur(jid, 'welcome', value);
}

// ========== FUNCTION: Toggle goodbye ==========
async function toggleGoodbye(jid, value) {
    return await attribuerUnevaleur(jid, 'goodbye', value);
}

// ========== FUNCTION: Toggle antipromote ==========
async function toggleAntipromote(jid, value) {
    return await attribuerUnevaleur(jid, 'antipromote', value);
}

// ========== FUNCTION: Toggle antidemote ==========
async function toggleAntidemote(jid, value) {
    return await attribuerUnevaleur(jid, 'antidemote', value);
}

// ========== FUNCTION: Get all groups with events ==========
async function getAllGroupsWithEvents() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return [];
        }

        client = await pool.connect();
        const result = await client.query(
            'SELECT jid, welcome, goodbye, antipromote, antidemote FROM events ORDER BY created_at DESC'
        );
        return result.rows || [];
    } catch (error) {
        console.error("❌ Error getting all groups with events:", error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if database is working ==========
async function eventsIsDatabaseWorking() {
    try {
        const isConnected = await testConnection();
        return isConnected;
    } catch (error) {
        console.error("❌ events - Database connection check failed:", error.message);
        return false;
    }
}

// ========== EXPORT MODULE ==========
module.exports = {
    attribuerUnevaleur,
    recupevents,
    isWelcomeEnabled,
    isGoodbyeEnabled,
    isAntipromoteEnabled,
    isAntidemoteEnabled,
    getGroupEvents,
    deleteGroupEvents,
    toggleWelcome,
    toggleGoodbye,
    toggleAntipromote,
    toggleAntidemote,
    getAllGroupsWithEvents,
    eventsIsDatabaseWorking,
    testConnection
};
