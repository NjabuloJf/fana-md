// bdd/sudo.js
require("dotenv").config();
const { testConnection, query, pool } = require('./database');
const s = require("../set");

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

createSudoTable();

async function issudo(jid) {
    if (!jid) return false;
    try {
        const result = await query("SELECT EXISTS (SELECT 1 FROM sudo WHERE jid = $1)", [jid]);
        return result.rows[0].exists || false;
    } catch (error) {
        console.error("❌ Error checking sudo status:", error.message);
        return false;
    }
}

async function addSudoNumber(jid, addedBy = null) {
    if (!jid) return false;
    try {
        const checkResult = await query("SELECT EXISTS (SELECT 1 FROM sudo WHERE jid = $1)", [jid]);
        if (checkResult.rows[0].exists) return true;
        await query("INSERT INTO sudo (jid, added_by) VALUES ($1, $2)", [jid, addedBy]);
        return true;
    } catch (error) {
        console.error("❌ Error adding sudo number:", error.message);
        return false;
    }
}

async function removeSudoNumber(jid) {
    if (!jid) return false;
    try {
        const result = await query("DELETE FROM sudo WHERE jid = $1", [jid]);
        return result.rowCount > 0;
    } catch (error) {
        console.error("❌ Error removing sudo number:", error.message);
        return false;
    }
}

async function getAllSudoNumbers() {
    try {
        const result = await query("SELECT jid FROM sudo");
        return result.rows.map((row) => row.jid);
    } catch (error) {
        console.error("❌ Error getting sudo numbers:", error.message);
        return [];
    }
}

async function isSudoTableNotEmpty() {
    try {
        const result = await query("SELECT COUNT(*) FROM sudo");
        return parseInt(result.rows[0].count) > 0;
    } catch (error) {
        console.error('❌ Error checking sudo table:', error.message);
        return false;
    }
}

module.exports = {
    issudo,
    addSudoNumber,
    removeSudoNumber,
    getAllSudoNumbers,
    isSudoTableNotEmpty,
};