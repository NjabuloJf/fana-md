// bdd/banGroup.js
require("dotenv").config();
const { testConnection, query, pool } = require('./database');
const s = require("../set");

async function createBanGroupTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ banGroup - Skipping table creation (no database connection)");
            return;
        }
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS banGroup (
                groupeJid TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                banned_by TEXT
            );
        `);
        console.log("✅ Table 'banGroup' created successfully!");
    } catch (e) {
        console.error("❌ Error creating 'banGroup' table:", e.message);
    } finally {
        if (client) client.release();
    }
}

createBanGroupTable();

async function addGroupToBanList(groupeJid, bannedBy = null) {
    if (!groupeJid) return false;
    try {
        const checkResult = await query("SELECT EXISTS (SELECT 1 FROM banGroup WHERE groupeJid = $1)", [groupeJid]);
        if (checkResult.rows[0].exists) return true;
        await query("INSERT INTO banGroup (groupeJid, banned_by) VALUES ($1, $2)", [groupeJid, bannedBy]);
        return true;
    } catch (error) {
        console.error("❌ Error adding group to ban list:", error.message);
        return false;
    }
}

async function isGroupBanned(groupeJid) {
    if (!groupeJid) return false;
    try {
        const result = await query("SELECT EXISTS (SELECT 1 FROM banGroup WHERE groupeJid = $1)", [groupeJid]);
        return result.rows[0].exists || false;
    } catch (error) {
        console.error("❌ Error checking if group is banned:", error.message);
        return false;
    }
}

async function removeGroupFromBanList(groupeJid) {
    if (!groupeJid) return false;
    try {
        const result = await query("DELETE FROM banGroup WHERE groupeJid = $1", [groupeJid]);
        return result.rowCount > 0;
    } catch (error) {
        console.error("❌ Error removing group from ban list:", error.message);
        return false;
    }
}

module.exports = {
    addGroupToBanList,
    isGroupBanned,
    removeGroupFromBanList,
};