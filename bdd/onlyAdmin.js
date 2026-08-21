// bdd/onlyAdmin.js
require("dotenv").config();
const { testConnection, query, pool } = require('./database');
const s = require("../set");

async function createOnlyAdminTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ onlyAdmin - Skipping table creation (no database connection)");
            return;
        }
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS onlyAdmin (
                groupeJid TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                added_by TEXT
            );
        `);
        console.log("✅ Table 'onlyAdmin' created successfully!");
    } catch (e) {
        console.error("❌ Error creating 'onlyAdmin' table:", e.message);
    } finally {
        if (client) client.release();
    }
}

createOnlyAdminTable();

async function addGroupToOnlyAdminList(groupeJid, addedBy = null) {
    if (!groupeJid) return false;
    try {
        const checkResult = await query("SELECT EXISTS (SELECT 1 FROM onlyAdmin WHERE groupeJid = $1)", [groupeJid]);
        if (checkResult.rows[0].exists) return true;
        await query("INSERT INTO onlyAdmin (groupeJid, added_by) VALUES ($1, $2)", [groupeJid, addedBy]);
        return true;
    } catch (error) {
        console.error("❌ Error adding group to onlyAdmin list:", error.message);
        return false;
    }
}

async function isGroupOnlyAdmin(groupeJid) {
    if (!groupeJid) return false;
    try {
        const result = await query("SELECT EXISTS (SELECT 1 FROM onlyAdmin WHERE groupeJid = $1)", [groupeJid]);
        return result.rows[0].exists || false;
    } catch (error) {
        console.error("❌ Error checking if group is onlyAdmin:", error.message);
        return false;
    }
}

async function removeGroupFromOnlyAdminList(groupeJid) {
    if (!groupeJid) return false;
    try {
        const result = await query("DELETE FROM onlyAdmin WHERE groupeJid = $1", [groupeJid]);
        return result.rowCount > 0;
    } catch (error) {
        console.error("❌ Error removing group from onlyAdmin list:", error.message);
        return false;
    }
}

module.exports = {
    addGroupToOnlyAdminList,
    isGroupOnlyAdmin,
    removeGroupFromOnlyAdminList,
};