// bdd/welcome.js
require("dotenv").config();
const { testConnection, query, pool } = require('./database');
const s = require("../set");

async function createEventsTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ events - Skipping table creation (no database connection)");
            return;
        }
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS events (
                Id SERIAL PRIMARY KEY,
                jid TEXT UNIQUE,
                welcome TEXT DEFAULT 'off',
                goodbye TEXT DEFAULT 'off',
                antipromote TEXT DEFAULT 'off',
                antidemote TEXT DEFAULT 'off'
            );
        `);
        console.log("✅ Table 'events' created successfully!");
    } catch (e) {
        console.error("❌ Error creating 'events' table:", e.message);
    } finally {
        if (client) client.release();
    }
}

createEventsTable();

async function attribuerUnevaleur(jid, row, valeur) {
    if (!jid || !row) return false;
    try {
        const result = await query("SELECT * FROM events WHERE jid = $1", [jid]);
        const jidExiste = result.rows.length > 0;
        if (jidExiste) {
            await query(`UPDATE events SET ${row} = $1 WHERE jid = $2`, [valeur, jid]);
        } else {
            await query(`INSERT INTO events (jid, ${row}) VALUES ($1, $2)`, [jid, valeur]);
        }
        return true;
    } catch (error) {
        console.error("❌ Error updating events:", error.message);
        return false;
    }
}

async function recupevents(jid, row) {
    if (!jid || !row) return 'off';
    try {
        const result = await query(`SELECT ${row} FROM events WHERE jid = $1`, [jid]);
        if (result.rows.length > 0) {
            return result.rows[0][row] || 'off';
        }
        return 'off';
    } catch (e) {
        console.error("❌ Error getting event value:", e.message);
        return 'off';
    }
}

module.exports = {
    attribuerUnevaleur,
    recupevents,
};