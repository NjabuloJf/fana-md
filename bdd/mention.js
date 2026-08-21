// bdd/mention.js
require("dotenv").config();
const { testConnection, query, pool } = require('./database');
const s = require("../set");

async function createMentionTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ mention - Skipping table creation (no database connection)");
            return;
        }
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS mention (
                id SERIAL PRIMARY KEY,
                status TEXT DEFAULT 'off',
                url TEXT,
                type TEXT,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Table 'mention' created successfully!");
    } catch (e) {
        console.error("❌ Error creating 'mention' table:", e.message);
    } finally {
        if (client) client.release();
    }
}

createMentionTable();

async function addOrUpdateDataInMention(url, type, message) {
    try {
        const checkResult = await query("SELECT EXISTS (SELECT 1 FROM mention WHERE id = 1)");
        const exists = checkResult.rows[0].exists;
        if (exists) {
            await query(
                'UPDATE mention SET url = $1, type = $2, message = $3, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
                [url, type, message]
            );
        } else {
            await query('INSERT INTO mention (id, url, type, message) VALUES (1, $1, $2, $3)', [url, type, message]);
        }
        console.log("✅ mention - Data saved successfully!");
        return true;
    } catch (error) {
        console.error("❌ Error saving data to 'mention':", error.message);
        return false;
    }
}

async function modifierStatusId1(nouveauStatus) {
    if (!nouveauStatus) {
        console.log("⚠️ mention - No status provided");
        return false;
    }
    try {
        const checkResult = await query("SELECT EXISTS (SELECT 1 FROM mention WHERE id = 1)");
        const exists = checkResult.rows[0].exists;
        if (exists) {
            await query('UPDATE mention SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [nouveauStatus]);
        } else {
            await query('INSERT INTO mention (id, status) VALUES (1, $1)', [nouveauStatus]);
        }
        console.log(`✅ mention - Status updated to '${nouveauStatus}' for ID 1`);
        return true;
    } catch (error) {
        console.error("❌ Error updating status in 'mention':", error.message);
        return false;
    }
}

async function getStatusId1() {
    try {
        const result = await query("SELECT status FROM mention WHERE id = 1");
        if (result.rows.length > 0) {
            return result.rows[0].status || 'off';
        }
        return 'off';
    } catch (error) {
        console.error("❌ Error getting status from 'mention':", error.message);
        return 'off';
    }
}

async function recupererToutesLesValeurs() {
    try {
        const result = await query("SELECT * FROM mention ORDER BY id");
        console.log(`✅ mention - Retrieved ${result.rows.length} records`);
        return result.rows || [];
    } catch (error) {
        console.error("❌ Error getting values from 'mention':", error.message);
        return [];
    }
}

async function getMentionById(id) {
    if (!id) return null;
    try {
        const result = await query("SELECT * FROM mention WHERE id = $1", [id]);
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    } catch (error) {
        console.error("❌ Error getting mention by ID:", error.message);
        return null;
    }
}

async function updateMention(id, url, type, message) {
    if (!id) return false;
    try {
        const result = await query(
            'UPDATE mention SET url = $1, type = $2, message = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
            [url, type, message, id]
        );
        if (result.rowCount > 0) {
            console.log(`✅ mention - Updated record ID ${id}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error("❌ Error updating mention:", error.message);
        return false;
    }
}

async function deleteMention(id) {
    if (!id) return false;
    try {
        const result = await query("DELETE FROM mention WHERE id = $1", [id]);
        if (result.rowCount > 0) {
            console.log(`✅ mention - Deleted record ID ${id}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error("❌ Error deleting mention:", error.message);
        return false;
    }
}

async function mentionExists(id) {
    if (!id) return false;
    try {
        const result = await query("SELECT EXISTS (SELECT 1 FROM mention WHERE id = $1)", [id]);
        return result.rows[0].exists || false;
    } catch (error) {
        console.error("❌ Error checking if mention exists:", error.message);
        return false;
    }
}

async function isMentionEnabled() {
    const status = await getStatusId1();
    return status === 'on' || status === 'oui' || status === 'yes' || status === 'true';
}

async function toggleMention(status) {
    return await modifierStatusId1(status);
}

module.exports = {
    addOrUpdateDataInMention,
    recupererToutesLesValeurs,
    modifierStatusId1,
    getStatusId1,
    getMentionById,
    updateMention,
    deleteMention,
    mentionExists,
    isMentionEnabled,
    toggleMention,
    testConnection
};