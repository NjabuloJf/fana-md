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
        console.log("✅ cron - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ cron - PostgreSQL connection failed:", error.message);
        return false;
    }
}

async function createTablecron() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return;
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

createTablecron();

async function getCron() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return [];
        client = await pool.connect();
        const result = await client.query('SELECT * FROM cron');
        return result.rows || [];
    } catch (error) {
        console.error('❌ Error fetching cron data:', error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

async function addCron(group_id, rows, value) {
    if (!group_id) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const response = await client.query('SELECT * FROM cron WHERE group_id = $1', [group_id]);
        const exist = response.rows.length > 0;
        if (exist) {
            await client.query(`UPDATE cron SET ${rows} = $1 WHERE group_id = $2`, [value, group_id]);
        } else {
            await client.query(`INSERT INTO cron (group_id, ${rows}) VALUES ($1, $2)`, [group_id, value]);
        }
        return true;
    } catch (error) {
        console.error('❌ Error adding cron data:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

async function getCronById(group_id) {
    if (!group_id) return null;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return null;
        client = await pool.connect();
        const result = await client.query('SELECT * FROM cron WHERE group_id = $1', [group_id]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('❌ Error fetching cron by ID:', error.message);
        return null;
    } finally {
        if (client) client.release();
    }
}

async function delCron(group_id) {
    if (!group_id) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const result = await client.query('DELETE FROM cron WHERE group_id = $1', [group_id]);
        return result.rowCount > 0;
    } catch (error) {
        console.error('❌ Error deleting cron entry:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

module.exports = {
    getCron,
    addCron,
    delCron,
    getCronById,
};