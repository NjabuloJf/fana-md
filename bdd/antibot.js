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
        console.log("✅ antibot - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ antibot - PostgreSQL connection failed:", error.message);
        console.log("⚠️ antibot - Database features will be disabled");
        return false;
    }
}

// ========== CREATE TABLE ==========
async function createAntibotTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ antibot - Skipping table creation (no database connection)");
            return;
        }

        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS antibot (
                jid TEXT PRIMARY KEY,
                etat TEXT DEFAULT 'off',
                action TEXT DEFAULT 'delete',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Table 'antibot' created successfully!");
    } catch (error) {
        console.error("❌ Error creating 'antibot' table:", error.message);
    } finally {
        if (client) client.release();
    }
}

// Call table creation
createAntibotTable();

// ========== FUNCTION: Add or Update JID ==========
async function atbajouterOuMettreAJourJid(jid, etat) {
    if (!jid) {
        console.log("⚠️ antibot - No JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ antibot - No database connection");
            return false;
        }

        client = await pool.connect();
        
        // Check if JID exists
        const result = await client.query('SELECT * FROM antibot WHERE jid = $1', [jid]);
        const jidExiste = result.rows.length > 0;

        if (jidExiste) {
            await client.query('UPDATE antibot SET etat = $1 WHERE jid = $2', [etat, jid]);
        } else {
            await client.query('INSERT INTO antibot (jid, etat, action) VALUES ($1, $2, $3)', [jid, etat, 'delete']);
        }
        
        console.log(`✅ antibot - JID ${jid} updated successfully`);
        return true;
    } catch (error) {
        console.error('❌ Error updating JID in antibot:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Update Action ==========
async function atbmettreAJourAction(jid, action) {
    if (!jid) {
        console.log("⚠️ antibot - No JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ antibot - No database connection");
            return false;
        }

        client = await pool.connect();
        
        // Check if JID exists
        const result = await client.query('SELECT * FROM antibot WHERE jid = $1', [jid]);
        const jidExiste = result.rows.length > 0;

        if (jidExiste) {
            await client.query('UPDATE antibot SET action = $1 WHERE jid = $2', [action, jid]);
        } else {
            await client.query('INSERT INTO antibot (jid, etat, action) VALUES ($1, $2, $3)', [jid, 'off', action]);
        }
        
        console.log(`✅ antibot - Action updated for JID ${jid}`);
        return true;
    } catch (error) {
        console.error('❌ Error updating action in antibot:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check JID Status ==========
async function atbverifierEtatJid(jid) {
    if (!jid) {
        console.log("⚠️ antibot - No JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ antibot - No database connection, returning false");
            return false;
        }

        client = await pool.connect();
        const result = await client.query('SELECT etat FROM antibot WHERE jid = $1', [jid]);
        
        if (result.rows.length > 0) {
            const etat = result.rows[0].etat;
            // Check for various "on" states
            return etat === 'oui' || etat === 'on' || etat === 'yes' || etat === 'true';
        }
        return false;
    } catch (error) {
        console.error('❌ Error checking JID status in antibot:', error.message);
        return false; // Return false on error (fail safe)
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get JID Action ==========
async function atbrecupererActionJid(jid) {
    if (!jid) {
        console.log("⚠️ antibot - No JID provided");
        return 'delete';
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ antibot - No database connection, returning default");
            return 'delete';
        }

        client = await pool.connect();
        const result = await client.query('SELECT action FROM antibot WHERE jid = $1', [jid]);
        
        if (result.rows.length > 0) {
            const action = result.rows[0].action;
            return action || 'delete';
        }
        return 'delete'; // Default action
    } catch (error) {
        console.error('❌ Error getting action from antibot:', error.message);
        return 'delete'; // Default on error
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get All Anti-Bot JIDs ==========
async function atbGetAllJids() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return [];
        }

        client = await pool.connect();
        const result = await client.query('SELECT jid, etat, action FROM antibot');
        return result.rows || [];
    } catch (error) {
        console.error('❌ Error getting all JIDs from antibot:', error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Delete JID ==========
async function atbSupprimerJid(jid) {
    if (!jid) {
        console.log("⚠️ antibot - No JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        const result = await client.query('DELETE FROM antibot WHERE jid = $1', [jid]);
        
        if (result.rowCount > 0) {
            console.log(`✅ antibot - JID ${jid} deleted`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('❌ Error deleting JID from antibot:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if database is working ==========
async function atbIsDatabaseWorking() {
    try {
        const isConnected = await testConnection();
        return isConnected;
    } catch (error) {
        console.error("❌ antibot - Database connection check failed:", error.message);
        return false;
    }
}

// ========== EXPORT MODULE ==========
module.exports = {
    atbmettreAJourAction,
    atbajouterOuMettreAJourJid,
    atbverifierEtatJid,
    atbrecupererActionJid,
    atbGetAllJids,
    atbSupprimerJid,
    atbIsDatabaseWorking,
    testConnection
};
