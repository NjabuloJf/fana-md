require("dotenv").config();
const { Pool } = require("pg");
let s = require("../set");

// ========== FIXED DATABASE CONNECTION ==========
let dbUrl = s.DATABASE_URL || process.env.DATABASE_URL || "postgres://db_7xp9_user:6hwmTN7rGPNsjlBEHyX49CXwrG7cDeYi@dpg-cj7ldu5jeehc73b2p7g0-a.oregon-postgres.render.com/db_7xp9";
dbUrl = dbUrl.trim();

const proConfig = {
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
};

const pool = new Pool(proConfig);

// ========== TEST CONNECTION ==========
async function testConnection() {
    let client;
    try {
        client = await pool.connect();
        console.log("✅ antilien - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ antilien - PostgreSQL connection failed:", error.message);
        console.log("⚠️ antilien - Database features will be disabled");
        return false;
    }
}

// ========== CREATE TABLE ==========
async function createAntilienTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ antilien - Skipping table creation (no database connection)");
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

createAntilienTable();

// ========== FUNCTIONS ==========
async function ajouterOuMettreAJourJid(jid, etat) {
    if (!jid) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const result = await client.query('SELECT * FROM antilien WHERE jid = $1', [jid]);
        const jidExiste = result.rows.length > 0;
        if (jidExiste) {
            await client.query('UPDATE antilien SET etat = $1 WHERE jid = $2', [etat, jid]);
        } else {
            await client.query('INSERT INTO antilien (jid, etat, action) VALUES ($1, $2, $3)', [jid, etat, 'delete']);
        }
        return true;
    } catch (error) {
        console.error('❌ Error updating JID in antilien:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

async function mettreAJourAction(jid, action) {
    if (!jid) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const result = await client.query('SELECT * FROM antilien WHERE jid = $1', [jid]);
        const jidExiste = result.rows.length > 0;
        if (jidExiste) {
            await client.query('UPDATE antilien SET action = $1 WHERE jid = $2', [action, jid]);
        } else {
            await client.query('INSERT INTO antilien (jid, etat, action) VALUES ($1, $2, $3)', [jid, 'off', action]);
        }
        return true;
    } catch (error) {
        console.error('❌ Error updating action in antilien:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

async function verifierEtatJid(jid) {
    if (!jid) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const result = await client.query('SELECT etat FROM antilien WHERE jid = $1', [jid]);
        if (result.rows.length > 0) {
            const etat = result.rows[0].etat;
            return etat === 'on' || etat === 'oui' || etat === 'yes' || etat === 'true';
        }
        return false;
    } catch (error) {
        console.error('❌ Error checking JID status:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

async function recupererActionJid(jid) {
    if (!jid) return 'delete';
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return 'delete';
        client = await pool.connect();
        const result = await client.query('SELECT action FROM antilien WHERE jid = $1', [jid]);
        if (result.rows.length > 0) {
            return result.rows[0].action || 'delete';
        }
        return 'delete';
    } catch (error) {
        console.error('❌ Error getting action:', error.message);
        return 'delete';
    } finally {
        if (client) client.release();
    }
}

module.exports = {
    mettreAJourAction,
    ajouterOuMettreAJourJid,
    verifierEtatJid,
    recupererActionJid,
};