require("dotenv").config();
const { Pool } = require("pg");
let s = require("../set");

// ========== FIXED DATABASE CONNECTION ==========
let dbUrl = s.DATABASE_URL || process.env.DATABASE_URL || "postgres://db_7xp9_user:6hwmTN7rGPNsjlBEHyX49CXwrG7cDeYi@dpg-cj7ldu5jeehc73b2p7g0-a.oregon-postgres.render.com/db_7xp9";

// Remove any trailing slashes or weird characters
dbUrl = dbUrl.trim();

// ========== CONNECTION CONFIGURATION ==========
const proConfig = {
    connectionString: dbUrl,
    ssl: {
        rejectUnauthorized: false,
    },
    // Add connection timeout
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
};

const pool = new Pool(proConfig);

// ========== TEST CONNECTION ==========
async function testConnection() {
    try {
        const client = await pool.connect();
        console.log("✅ PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ PostgreSQL connection failed:", error.message);
        console.log("⚠️ Falling back to SQLite mode...");
        return false;
    }
}

// ========== CREATE TABLE WITH ERROR HANDLING ==========
async function createAntilienTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ Using fallback mode - antilien disabled");
            return;
        }

        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS antilien (
                jid TEXT PRIMARY KEY,
                etat TEXT DEFAULT 'off',
                action TEXT DEFAULT 'delete'
            );
        `);
        console.log("✅ Table 'antilien' created successfully!");
    } catch (error) {
        console.error("❌ Error creating 'antilien' table:", error.message);
    } finally {
        if (client) client.release();
    }
}

// Call this on startup
createAntilienTable();

// ========== FUNCTION: Add or Update JID ==========
async function ajouterOuMettreAJourJid(jid, etat) {
    if (!jid) return;
    
    let client;
    try {
        client = await pool.connect();
        
        // Check if JID exists
        const result = await client.query('SELECT * FROM antilien WHERE jid = $1', [jid]);
        const jidExiste = result.rows.length > 0;

        if (jidExiste) {
            await client.query('UPDATE antilien SET etat = $1 WHERE jid = $2', [etat, jid]);
        } else {
            await client.query('INSERT INTO antilien (jid, etat, action) VALUES ($1, $2, $3)', [jid, etat, 'delete']);
        }
        
        console.log(`✅ JID ${jid} updated in 'antilien'`);
    } catch (error) {
        console.error('❌ Error updating JID in antilien:', error.message);
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Update Action ==========
async function mettreAJourAction(jid, action) {
    if (!jid) return;
    
    let client;
    try {
        client = await pool.connect();
        
        const result = await client.query('SELECT * FROM antilien WHERE jid = $1', [jid]);
        const jidExiste = result.rows.length > 0;

        if (jidExiste) {
            await client.query('UPDATE antilien SET action = $1 WHERE jid = $2', [action, jid]);
        } else {
            await client.query('INSERT INTO antilien (jid, etat, action) VALUES ($1, $2, $3)', [jid, 'off', action]);
        }
        
        console.log(`✅ Action updated for JID ${jid}`);
    } catch (error) {
        console.error('❌ Error updating action:', error.message);
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check JID Status ==========
async function verifierEtatJid(jid) {
    if (!jid) return false;
    
    let client;
    try {
        client = await pool.connect();
        
        const result = await client.query('SELECT etat FROM antilien WHERE jid = $1', [jid]);
        
        if (result.rows.length > 0) {
            const etat = result.rows[0].etat;
            // Check for various "on" states
            return etat === 'on' || etat === 'oui' || etat === 'yes' || etat === 'true';
        }
        return false;
    } catch (error) {
        console.error('❌ Error checking JID status:', error.message);
        return false; // Return false on error (fail safe)
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get JID Action ==========
async function recupererActionJid(jid) {
    if (!jid) return 'delete';
    
    let client;
    try {
        client = await pool.connect();
        
        const result = await client.query('SELECT action FROM antilien WHERE jid = $1', [jid]);
        
        if (result.rows.length > 0) {
            const action = result.rows[0].action;
            return action || 'delete';
        }
        return 'delete'; // Default action
    } catch (error) {
        console.error('❌ Error getting action:', error.message);
        return 'delete'; // Default on error
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get All Anti-Link JIDs ==========
async function getAllAntilienJids() {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query('SELECT jid, etat, action FROM antilien');
        return result.rows;
    } catch (error) {
        console.error('❌ Error getting all JIDs:', error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Delete JID ==========
async function supprimerJid(jid) {
    if (!jid) return;
    
    let client;
    try {
        client = await pool.connect();
        await client.query('DELETE FROM antilien WHERE jid = $1', [jid]);
        console.log(`✅ JID ${jid} deleted from antilien`);
    } catch (error) {
        console.error('❌ Error deleting JID:', error.message);
    } finally {
        if (client) client.release();
    }
}

// ========== EXPORT MODULE ==========
module.exports = {
    mettreAJourAction,
    ajouterOuMettreAJourJid,
    verifierEtatJid,
    recupererActionJid,
    getAllAntilienJids,
    supprimerJid,
    testConnection
};
