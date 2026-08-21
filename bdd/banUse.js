// bdd/banUser.js
require("dotenv").config();
const { testConnection, query, pool } = require('./database');
const s = require("../set");

async function createBanUserTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ banUser - Skipping table creation (no database connection)");
            return;
        }
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS banUser (
                jid TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                banned_by TEXT
            );
        `);
        console.log("✅ Table 'banUser' created successfully!");
    } catch (e) {
        console.error("❌ Error creating 'banUser' table:", e.message);
    } finally {
        if (client) client.release();
    }
}

createBanUserTable();

async function addUserToBanList(jid, bannedBy = null) {
    if (!jid) return false;
    try {
        const checkResult = await query("SELECT EXISTS (SELECT 1 FROM banUser WHERE jid = $1)", [jid]);
        if (checkResult.rows[0].exists) return true;
        await query("INSERT INTO banUser (jid, banned_by) VALUES ($1, $2)", [jid, bannedBy]);
        return true;
    } catch (error) {
        console.error("❌ Error adding user to ban list:", error.message);
        return false;
    }
}

async function isUserBanned(jid) {
    if (!jid) return false;
    try {
        const result = await query("SELECT EXISTS (SELECT 1 FROM banUser WHERE jid = $1)", [jid]);
        return result.rows[0].exists || false;
    } catch (error) {
        console.error("❌ Error checking if user is banned:", error.message);
        return false;
    }
}

async function removeUserFromBanList(jid) {
    if (!jid) return false;
    try {
        const result = await query("DELETE FROM banUser WHERE jid = $1", [jid]);
        return result.rowCount > 0;
    } catch (error) {
        console.error("❌ Error removing user from ban list:", error.message);
        return false;
    }
}

module.exports = {
    addUserToBanList,
    isUserBanned,
    removeUserFromBanList,
};