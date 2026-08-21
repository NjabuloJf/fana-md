require("dotenv").config();
const { Pool } = require("pg");
const s = require("../set");

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
        console.log("✅ events - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ events - PostgreSQL connection failed:", error.message);
        return false;
    }
}

const creerTableevents = async () => {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return;
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
};

creerTableevents();

async function attribuerUnevaleur(jid, row, valeur) {
    if (!jid || !row) return false;
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return false;
        client = await pool.connect();
        const result = await client.query('SELECT * FROM events WHERE jid = $1', [jid]);
        const jidExiste = result.rows.length > 0;
        if (jidExiste) {
            await client.query(`UPDATE events SET ${row} = $1 WHERE jid = $2`, [valeur, jid]);
        } else {
            await client.query(`INSERT INTO events (jid, ${row}) VALUES ($1, $2)`, [jid, valeur]);
        }
        return true;
    } catch (error) {
        console.error("❌ Error updating events:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

async function recupevents(jid, row) {
    if (!jid || !row) return 'off';
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) return 'off';
        client = await pool.connect();
        const result = await client.query(`SELECT ${row} FROM events WHERE jid = $1`, [jid]);
        if (result.rows.length > 0) {
            return result.rows[0][row] || 'off';
        }
        return 'off';
    } catch (e) {
        console.error("❌ Error getting event value:", e.message);
        return 'off';
    } finally {
        if (client) client.release();
    }
}

module.exports = {
    attribuerUnevaleur,
    recupevents,
};