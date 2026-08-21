// bdd/antilien.js
require("dotenv").config();
const { testConnection, query, pool } = require('./database');
const s = require("../set");

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

async function ajouterOuMettreAJourJid(jid, etat) {
    if (!jid) return false;
    try {
        const result = await query('SELECT * FROM antilien WHERE jid = $1', [jid]);
        const jidExiste = result.rows.length > 0;
        if (jidExiste) {
            await query('UPDATE antilien SET etat = $1 WHERE jid = $2', [etat, jid]);
        } else {
            await query('INSERT INTO antilien (jid, etat, action) VALUES ($1, $2, $3)', [jid, etat, 'delete']);
        }
        return true;
    } catch (error) {
        console.error('❌ Error updating JID in antilien:', error.message);
        return false;
    }
}

async function mettreAJourAction(jid, action) {
    if (!jid) return false;
    try {
        const result = await query('SELECT * FROM antilien WHERE jid = $1', [jid]);
        const jidExiste = result.rows.length > 0;
        if (jidExiste) {
            await query('UPDATE antilien SET action = $1 WHERE jid = $2', [action, jid]);
        } else {
            await query('INSERT INTO antilien (jid, etat, action) VALUES ($1, $2, $3)', [jid, 'off', action]);
        }
        return true;
    } catch (error) {
        console.error('❌ Error updating action in antilien:', error.message);
        return false;
    }
}

async function verifierEtatJid(jid) {
    if (!jid) return false;
    try {
        const result = await query('SELECT etat FROM antilien WHERE jid = $1', [jid]);
        if (result.rows.length > 0) {
            const etat = result.rows[0].etat;
            return etat === 'on' || etat === 'oui' || etat === 'yes' || etat === 'true';
        }
        return false;
    } catch (error) {
        console.error('❌ Error checking JID status:', error.message);
        return false;
    }
}

async function recupererActionJid(jid) {
    if (!jid) return 'delete';
    try {
        const result = await query('SELECT action FROM antilien WHERE jid = $1', [jid]);
        if (result.rows.length > 0) {
            return result.rows[0].action || 'delete';
        }
        return 'delete';
    } catch (error) {
        console.error('❌ Error getting action:', error.message);
        return 'delete';
    }
}

module.exports = {
    mettreAJourAction,
    ajouterOuMettreAJourJid,
    verifierEtatJid,
    recupererActionJid,
};