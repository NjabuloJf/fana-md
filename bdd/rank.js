// bdd/rank.js
require("dotenv").config();
const { testConnection, query, pool } = require('./database');
const s = require("../set");

async function createUsersRankTable() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ rank - Skipping table creation (no database connection)");
            return;
        }
        client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS users_rank (
                id SERIAL PRIMARY KEY,
                jid VARCHAR(255) UNIQUE,
                xp INTEGER DEFAULT 0,
                messages INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Table 'users_rank' created successfully!");
    } catch (error) {
        console.error("❌ Error creating 'users_rank' table:", error.message);
    } finally {
        if (client) client.release();
    }
}

createUsersRankTable();

async function ajouterOuMettreAJourUserData(jid) {
    if (!jid) return false;
    try {
        const result = await query("SELECT * FROM users_rank WHERE jid = $1", [jid]);
        const jidExiste = result.rows.length > 0;
        if (jidExiste) {
            await query(
                'UPDATE users_rank SET xp = xp + 10, messages = messages + 1, updated_at = CURRENT_TIMESTAMP WHERE jid = $1',
                [jid]
            );
        } else {
            await query(
                'INSERT INTO users_rank (jid, xp, messages, level) VALUES ($1, $2, $3, $4)',
                [jid, 10, 1, 1]
            );
        }
        return true;
    } catch (error) {
        console.error("❌ Error updating user data:", error.message);
        return false;
    }
}

async function getMessagesAndXPByJID(jid) {
    if (!jid) return { messages: 0, xp: 0, level: 1 };
    try {
        const result = await query("SELECT messages, xp, level FROM users_rank WHERE jid = $1", [jid]);
        if (result.rows.length > 0) {
            const { messages, xp, level } = result.rows[0];
            return {
                messages: parseInt(messages) || 0,
                xp: parseInt(xp) || 0,
                level: parseInt(level) || 1
            };
        }
        return { messages: 0, xp: 0, level: 1 };
    } catch (error) {
        console.error("❌ Error getting user data:", error.message);
        return { messages: 0, xp: 0, level: 1 };
    }
}

async function getTop10Users() {
    try {
        const result = await query("SELECT jid, xp, messages, level FROM users_rank ORDER BY xp DESC LIMIT 10");
        return result.rows || [];
    } catch (error) {
        console.error("❌ Error getting top 10 users:", error.message);
        return [];
    }
}

async function getBottom10Users() {
    try {
        const result = await query("SELECT jid, xp, messages, level FROM users_rank ORDER BY xp ASC LIMIT 10");
        return result.rows || [];
    } catch (error) {
        console.error("❌ Error getting bottom 10 users:", error.message);
        return [];
    }
}

async function getUserRank(jid) {
    if (!jid) return null;
    try {
        const result = await query(`
            SELECT 
                jid, 
                xp, 
                messages, 
                level,
                RANK() OVER (ORDER BY xp DESC) as rank
            FROM users_rank 
            WHERE jid = $1
        `, [jid]);
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    } catch (error) {
        console.error("❌ Error getting user rank:", error.message);
        return null;
    }
}

module.exports = {
    ajouterOuMettreAJourUserData,
    getMessagesAndXPByJID,
    getBottom10Users,
    getTop10Users,
    getUserRank,
};