// bdd/warn.js
require("dotenv").config();
const { testConnection, query, pool } = require('./database');
const s = require("../set");

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
                jid TEXT NOT NULL UNIQUE,
                warn_count INTEGER DEFAULT 1,
                reason TEXT,
                warned_by TEXT,
                warned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Table 'warn' created successfully!");
    } catch (error) {
        console.error("❌ Error creating 'warn' table:", error.message);
    } finally {
        if (client) client.release();
    }
}

createWarnTable();

async function getWarnCountByJID(jid) {
    if (!jid) return 0;
    try {
        const result = await query("SELECT warn_count FROM warn WHERE jid = $1", [jid]);
        if (result.rows.length > 0) {
            return parseInt(result.rows[0].warn_count) || 1;
        }
        return 0;
    } catch (error) {
        console.error("❌ Error getting warn count:", error.message);
        return 0;
    }
}

async function ajouterUtilisateurAvecWarnCount(jid, reason = null, warnedBy = null) {
    if (!jid) return false;
    try {
        const checkResult = await query("SELECT * FROM warn WHERE jid = $1", [jid]);
        const exists = checkResult.rows.length > 0;
        if (exists) {
            const currentCount = parseInt(checkResult.rows[0].warn_count) || 1;
            const newCount = currentCount + 1;
            await query(
                'UPDATE warn SET warn_count = $1, reason = $2, warned_by = $3 WHERE jid = $4',
                [newCount, reason, warnedBy, jid]
            );
        } else {
            await query(
                'INSERT INTO warn (jid, warn_count, reason, warned_by) VALUES ($1, $2, $3, $4)',
                [jid, 1, reason, warnedBy]
            );
        }
        return true;
    } catch (error) {
        console.error("❌ Error adding warn:", error.message);
        return false;
    }
}

async function resetWarnCount(jid) {
    if (!jid) return false;
    try {
        const result = await query("DELETE FROM warn WHERE jid = $1", [jid]);
        return result.rowCount > 0;
    } catch (error) {
        console.error("❌ Error resetting warn count:", error.message);
        return false;
    }
}

module.exports = {
    getWarnCountByJID,
    ajouterUtilisateurAvecWarnCount,
    resetWarnCount,
};