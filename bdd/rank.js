// Import dotenv and load environment variables
require("dotenv").config();

const { Pool } = require("pg");
const s = require("../set");

// ========== FIXED DATABASE CONNECTION ==========
let dbUrl = s.DATABASE_URL || process.env.DATABASE_URL || "postgres://db_7xp9_user:6hwmTN7rGPNsjlBEHyX49CXwrG7cDeYi@dpg-cj7ldu5jeehc73b2p7g0-a.oregon-postgres.render.com/db_7xp9";

// Clean the URL
dbUrl = dbUrl.trim();

const proConfig = {
    connectionString: dbUrl,
    ssl: {
        rejectUnauthorized: false,
    },
    // Add connection timeout to prevent hanging
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
};

// Create PostgreSQL connection pool
const pool = new Pool(proConfig);

// ========== TEST CONNECTION ==========
async function testConnection() {
    let client;
    try {
        client = await pool.connect();
        console.log("✅ rank - PostgreSQL connected successfully!");
        client.release();
        return true;
    } catch (error) {
        console.log("⚠️ rank - PostgreSQL connection failed:", error.message);
        console.log("⚠️ rank - Database features will be disabled");
        return false;
    }
}

// ========== CREATE TABLE ==========
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

// Call table creation
createUsersRankTable();

// ========== FUNCTION: Add or update user data ==========
async function ajouterOuMettreAJourUserData(jid) {
    if (!jid) {
        console.log("⚠️ rank - No JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ rank - No database connection, cannot update user data");
            return false;
        }

        client = await pool.connect();
        
        // Check if JID exists
        const result = await client.query('SELECT * FROM users_rank WHERE jid = $1', [jid]);
        const jidExiste = result.rows.length > 0;

        if (jidExiste) {
            // Update XP (+10) and messages (+1)
            await client.query(
                'UPDATE users_rank SET xp = xp + 10, messages = messages + 1, updated_at = CURRENT_TIMESTAMP WHERE jid = $1',
                [jid]
            );
        } else {
            // Insert new user with XP = 10 and messages = 1
            await client.query(
                'INSERT INTO users_rank (jid, xp, messages, level) VALUES ($1, $2, $3, $4)',
                [jid, 10, 1, 1]
            );
        }
        return true;
    } catch (error) {
        console.error("❌ Error updating user data:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get messages and XP by JID ==========
async function getMessagesAndXPByJID(jid) {
    if (!jid) {
        console.log("⚠️ rank - No JID provided");
        return { messages: 0, xp: 0, level: 1 };
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ rank - No database connection, returning defaults");
            return { messages: 0, xp: 0, level: 1 };
        }

        client = await pool.connect();
        const query = 'SELECT messages, xp, level FROM users_rank WHERE jid = $1';
        const result = await client.query(query, [jid]);

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
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get top 10 users ==========
async function getTop10Users() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ rank - No database connection, returning empty array");
            return [];
        }

        client = await pool.connect();
        const query = 'SELECT jid, xp, messages, level FROM users_rank ORDER BY xp DESC LIMIT 10';
        const result = await client.query(query);
        return result.rows || [];
    } catch (error) {
        console.error("❌ Error getting top 10 users:", error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get bottom 10 users ==========
async function getBottom10Users() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            console.log("⚠️ rank - No database connection, returning empty array");
            return [];
        }

        client = await pool.connect();
        const query = 'SELECT jid, xp, messages, level FROM users_rank ORDER BY xp ASC LIMIT 10';
        const result = await client.query(query);
        return result.rows || [];
    } catch (error) {
        console.error("❌ Error getting bottom 10 users:", error.message);
        return [];
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get user rank ==========
async function getUserRank(jid) {
    if (!jid) {
        console.log("⚠️ rank - No JID provided");
        return null;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return null;
        }

        client = await pool.connect();
        const query = `
            SELECT 
                jid, 
                xp, 
                messages, 
                level,
                RANK() OVER (ORDER BY xp DESC) as rank
            FROM users_rank 
            WHERE jid = $1
        `;
        const result = await client.query(query, [jid]);
        
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    } catch (error) {
        console.error("❌ Error getting user rank:", error.message);
        return null;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get user level ==========
async function getUserLevel(jid) {
    const data = await getMessagesAndXPByJID(jid);
    return data.level || 1;
}

// ========== FUNCTION: Update user level ==========
async function updateUserLevel(jid) {
    if (!jid) {
        console.log("⚠️ rank - No JID provided");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        const data = await getMessagesAndXPByJID(jid);
        const xp = data.xp || 0;
        
        // Calculate level: level = floor(xp / 100) + 1
        const newLevel = Math.floor(xp / 100) + 1;
        
        client = await pool.connect();
        await client.query(
            'UPDATE users_rank SET level = $1, updated_at = CURRENT_TIMESTAMP WHERE jid = $2',
            [newLevel, jid]
        );
        return true;
    } catch (error) {
        console.error("❌ Error updating user level:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Add XP to user ==========
async function addXP(jid, xpAmount) {
    if (!jid || !xpAmount) {
        console.log("⚠️ rank - Missing JID or XP amount");
        return false;
    }

    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return false;
        }

        client = await pool.connect();
        await client.query(
            'UPDATE users_rank SET xp = xp + $1, updated_at = CURRENT_TIMESTAMP WHERE jid = $2',
            [xpAmount, jid]
        );
        return true;
    } catch (error) {
        console.error("❌ Error adding XP:", error.message);
        return false;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get total users count ==========
async function getTotalUsersCount() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return 0;
        }

        client = await pool.connect();
        const result = await client.query('SELECT COUNT(*) FROM users_rank');
        return parseInt(result.rows[0].count) || 0;
    } catch (error) {
        console.error("❌ Error getting total users count:", error.message);
        return 0;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Get total XP across all users ==========
async function getTotalXP() {
    let client;
    try {
        const isConnected = await testConnection();
        if (!isConnected) {
            return 0;
        }

        client = await pool.connect();
        const result = await client.query('SELECT SUM(xp) as total FROM users_rank');
        return parseInt(result.rows[0].total) || 0;
    } catch (error) {
        console.error("❌ Error getting total XP:", error.message);
        return 0;
    } finally {
        if (client) client.release();
    }
}

// ========== FUNCTION: Check if database is working ==========
async function rankIsDatabaseWorking() {
    try {
        const isConnected = await testConnection();
        return isConnected;
    } catch (error) {
        console.error("❌ rank - Database connection check failed:", error.message);
        return false;
    }
}

// ========== EXPORT MODULE ==========
module.exports = {
    ajouterOuMettreAJourUserData,
    getMessagesAndXPByJID,
    getBottom10Users,
    getTop10Users,
    getUserRank,
    getUserLevel,
    updateUserLevel,
    addXP,
    getTotalUsersCount,
    getTotalXP,
    rankIsDatabaseWorking,
    testConnection
};
