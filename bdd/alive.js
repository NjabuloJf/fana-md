// bdd/alive.js
require("dotenv").config();
const { testConnection, query, pool } = require('./database');
const s = require("../set");

async function createAliveTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ alive - Skipping table creation (no database connection)");
            return;
        }
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS alive (
                id SERIAL PRIMARY KEY,
                message TEXT,
                lien TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Table 'alive' created successfully!");
    } catch (e) {
        console.error("❌ Error creating 'alive' table:", e.message);
    } finally {
        if (client) client.release();
    }
}

createAliveTable();

async function addOrUpdateDataInAlive(message, lien) {
    if (!message && !lien) {
        console.log("⚠️ alive - No data to save");
        return false;
    }
    try {
        const checkResult = await query("SELECT EXISTS (SELECT 1 FROM alive WHERE id = 1)");
        const exists = checkResult.rows[0].exists;
        if (exists) {
            await query(
                'UPDATE alive SET message = $1, lien = $2, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
                [message, lien]
            );
        } else {
            await query('INSERT INTO alive (id, message, lien) VALUES (1, $1, $2)', [message, lien]);
        }
        console.log("✅ alive - Data saved successfully!");
        return true;
    } catch (error) {
        console.error("❌ Error saving data to 'alive':", error.message);
        return false;
    }
}

async function getDataFromAlive() {
    try {
        const result = await query("SELECT message, lien, created_at, updated_at FROM alive WHERE id = 1");
        if (result.rows.length > 0) {
            const { message, lien, created_at, updated_at } = result.rows[0];
            return { message, lien, created_at, updated_at };
        }
        return null;
    } catch (error) {
        console.error("❌ Error getting data from 'alive':", error.message);
        return null;
    }
}

async function getAliveMessage() {
    const data = await getDataFromAlive();
    return data ? data.message : null;
}

async function getAliveLink() {
    const data = await getDataFromAlive();
    return data ? data.lien : null;
}

async function deleteAliveData() {
    try {
        const result = await query("DELETE FROM alive WHERE id = 1");
        if (result.rowCount > 0) {
            console.log("✅ alive - Data deleted successfully");
            return true;
        }
        console.log("ℹ️ alive - No data to delete");
        return false;
    } catch (error) {
        console.error("❌ Error deleting data from 'alive':", error.message);
        return false;
    }
}

async function aliveDataExists() {
    try {
        const result = await query("SELECT EXISTS (SELECT 1 FROM alive WHERE id = 1)");
        return result.rows[0].exists || false;
    } catch (error) {
        console.error("❌ Error checking if alive data exists:", error.message);
        return false;
    }
}

async function updateAliveMessage(message) {
    if (!message) {
        console.log("⚠️ alive - No message provided");
        return false;
    }
    try {
        const checkResult = await query("SELECT EXISTS (SELECT 1 FROM alive WHERE id = 1)");
        const exists = checkResult.rows[0].exists;
        if (exists) {
            await query('UPDATE alive SET message = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [message]);
        } else {
            await query('INSERT INTO alive (id, message) VALUES (1, $1)', [message]);
        }
        console.log("✅ alive - Message updated successfully");
        return true;
    } catch (error) {
        console.error("❌ Error updating message in 'alive':", error.message);
        return false;
    }
}

async function updateAliveLink(lien) {
    if (!lien) {
        console.log("⚠️ alive - No link provided");
        return false;
    }
    try {
        const checkResult = await query("SELECT EXISTS (SELECT 1 FROM alive WHERE id = 1)");
        const exists = checkResult.rows[0].exists;
        if (exists) {
            await query('UPDATE alive SET lien = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [lien]);
        } else {
            await query('INSERT INTO alive (id, lien) VALUES (1, $1)', [lien]);
        }
        console.log("✅ alive - Link updated successfully");
        return true;
    } catch (error) {
        console.error("❌ Error updating link in 'alive':", error.message);
        return false;
    }
}

module.exports = {
    addOrUpdateDataInAlive,
    getDataFromAlive,
    getAliveMessage,
    getAliveLink,
    deleteAliveData,
    aliveDataExists,
    updateAliveMessage,
    updateAliveLink,
    testConnection
};