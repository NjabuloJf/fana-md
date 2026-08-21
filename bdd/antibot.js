require("dotenv").config();
const { Pool } = require("pg");
let s = require("../set");

let dbUrl = s.DATABASE_URL || process.env.DATABASE_URL || "postgres://db_7xp9_user:6hwmTN7rGPNsjlBEHyX49CXwrG7cDeYi@dpg-cj7ldu5jeehc73b2p7g0-a.oregon-postgres.render.com/db_7xp9";
dbUrl = dbUrl.trim();

const proConfig = {
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
};

const pool = new Pool(proConfig);

async function testConnection() {
    let client;
    try {
        client = await pool.connect();
        console.log("✅ antibot - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ antibot - PostgreSQL connection failed:", error.message);
        return false;
    }
}

async function createAntibotTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return;
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS antibot (
                jid TEXT PRIMARY KEY,
                etat TEXT DEFAULT 'off',
                action TEXT DEFAULT 'delete'
            );
        `);
        console.log("✅ Table 'antibot' created successfully!");
    } catch (error) {
        console.error("❌ Error creating 'antibot' table:", error.message);
    } finally {
        if (client) client.release();
    }
}

createAntibotTable();

async function atbajouterOuMettreAJourJid(jid, etat) {
    if (!jid) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const result = await client.query('SELECT * FROM antibot WHERE jid = $1', [jid]);
        const jidExiste = result.rows.length > 0;
        if (jidExiste) {
            await client.query('UPDATE antibot SET etat = $1 WHERE jid = $2', [etat, jid]);
        } else {
            await client.query('INSERT INTO antibot (jid, etat, action) VALUES ($1, $2, $3)', [jid, etat, 'delete']);
        }
        return true;
    } catch (error) {
        console.error('❌ Error updating JID in antibot:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

async function atbmettreAJourAction(jid, action) {
    if (!jid) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const result = await client.query('SELECT * FROM antibot WHERE jid = $1', [jid]);
        const jidExiste = result.rows.length > 0;
        if (jidExiste) {
            await client.query('UPDATE antibot SET action = $1 WHERE jid = $2', [action, jid]);
        } else {
            await client.query('INSERT INTO antibot (jid, etat, action) VALUES ($1, $2, $3)', [jid, 'off', action]);
        }
        return true;
    } catch (error) {
        console.error('❌ Error updating action in antibot:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

async function atbverifierEtatJid(jid) {
    if (!jid) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const result = await client.query('SELECT etat FROM antibot WHERE jid = $1', [jid]);
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

async function atbrecupererActionJid(jid) {
    if (!jid) return 'delete';
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return 'delete';
        client = await pool.connect();
        const result = await client.query('SELECT action FROM antibot WHERE jid = $1', [jid]);
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
    atbmettreAJourAction,
    atbajouterOuMettreAJourJid,
    atbverifierEtatJid,
    atbrecupererActionJid,
};