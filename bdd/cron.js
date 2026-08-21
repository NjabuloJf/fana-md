// bdd/cron.js
require("dotenv").config();
const { testConnection, query, pool } = require('./database');
const s = require("../set");

async function createCronTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ cron - Skipping table creation (no database connection)");
            return;
        }
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS cron (
                group_id TEXT PRIMARY KEY,
                mute_at TEXT DEFAULT NULL,
                unmute_at TEXT DEFAULT NULL
            );
        `);
        console.log("✅ Table 'cron' created successfully!");
    } catch (error) {
        console.error("❌ Error creating 'cron' table:", error.message);
    } finally {
        if (client) client.release();
    }
}

createCronTable();

async function getCron() {
    try {
        const result = await query("SELECT * FROM cron");
        return result.rows || [];
    } catch (error) {
        console.error('❌ Error fetching cron data:', error.message);
        return [];
    }
}

async function addCron(group_id, rows, value) {
    if (!group_id) return false;
    try {
        const response = await query("SELECT * FROM cron WHERE group_id = $1", [group_id]);
        const exist = response.rows.length > 0;
        if (exist) {
            await query(`UPDATE cron SET ${rows} = $1 WHERE group_id = $2`, [value, group_id]);
        } else {
            await query(`INSERT INTO cron (group_id, ${rows}) VALUES ($1, $2)`, [group_id, value]);
        }
        return true;
    } catch (error) {
        console.error('❌ Error adding cron data:', error.message);
        return false;
    }
}

async function getCronById(group_id) {
    if (!group_id) return null;
    try {
        const result = await query("SELECT * FROM cron WHERE group_id = $1", [group_id]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('❌ Error fetching cron by ID:', error.message);
        return null;
    }
}

async function delCron(group_id) {
    if (!group_id) return false;
    try {
        const result = await query("DELETE FROM cron WHERE group_id = $1", [group_id]);
        return result.rowCount > 0;
    } catch (error) {
        console.error('❌ Error deleting cron entry:', error.message);
        return false;
    }
}

module.exports = {
    getCron,
    addCron,
    delCron,
    getCronById,
};