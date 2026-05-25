const fs = require('fs-extra');
const { Sequelize } = require('sequelize');

if (fs.existsSync('set.env')) {
    require('dotenv').config({ path: __dirname + '/set.env' });
}

const path = require("path");
const databasePath = path.join(__dirname, './database.db');
const DATABASE_URL = process.env.DATABASE_URL === undefined ? databasePath : process.env.DATABASE_URL;

module.exports = { 
    // ========== SESSION CONFIGURATION ==========
    SESSION_ID: process.env.SESSION_ID || "njabulo~",
    
    // ========== PREFIX ==========
    PREFIXE: process.env.PREFIX || ".",
    
    // ========== OWNER INFORMATION ==========
    OWNER_NAME: process.env.OWNER_NAME || "NJABULO JB",
    NUMERO_OWNER: process.env.NUMERO_OWNER || "26777821911",
    
    // ========== STATUS SETTINGS ==========
    AUTO_READ_STATUS: process.env.AUTO_READ_STATUS || "yes",
    AUTO_STATUS_REACT: process.env.AUTO_STATUS_REACT || "true",
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || "false",
    AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || "Nice status! 👍",
    AUTO_BIO: process.env.AUTO_BIO || 'yes',
    AUTOREACT_STATUS: process.env.AUTOREACT_STATUS || 'yes',
    AUTO_DOWNLOAD_STATUS: process.env.AUTO_DOWNLOAD_STATUS || 'no',
    
    // ========== BOT INFORMATION ==========
    BOT_NAME: process.env.BOT_NAME || 'NJABULO JB',
    BOT: process.env.BOT_NAME || 'NJABULO JB',
    
    // ========== MEDIA LINKS ==========
    URL: process.env.BOT_MENU_LINKS || 'https://files.catbox.moe/mh36c7.jpg',
    GURL: process.env.GURL || 'https://whatsapp.com/channel/0029VbC9yTmElah0BO3KD509',
    
    // ========== MODE SETTINGS ==========
    // MODE: 'yes' = Public (everyone can use in groups), 'no' = Private (only owner in groups)
    // NOTE: DMs ALWAYS work for everyone regardless of MODE setting
    MODE: process.env.PUBLIC_MODE || "yes",
    
    // ========== HEROKU SETTINGS ==========
    HEROKU_APP_NAME: process.env.HEROKU_APP_NAME,
    HEROKU_APY_KEY: process.env.HEROKU_APY_KEY,
    
    // ========== SECURITY SETTINGS ==========
    WARN_COUNT: process.env.WARN_COUNT || '3',
    ADM: process.env.ANTI_DELETE_MESSAGE || "yes",
    
    // ========== PRESENCE SETTINGS ==========
    ETAT: process.env.PRESENCE || '',
    
    // ========== CHATBOT SETTINGS ==========
    CHATBOT: process.env.PM_CHATBOT || 'no',
    
    // ========== DISPLAY SETTINGS ==========
    DP: process.env.STARTING_BOT_MESSAGE || "yes",
    
    // ========== DATABASE ==========
    DATABASE_URL: DATABASE_URL,
    DATABASE: DATABASE_URL === databasePath
        ? "postgresql://postgres:bKlIqoOUWFIHOAhKxRWQtGfKfhGKgmRX@viaduct.proxy.rlwy.net:47738/railway"
        : DATABASE_URL,
};

let fichier = require.resolve(__filename);
fs.watchFile(fichier, () => {
    fs.unwatchFile(fichier);
    console.log(`mise à jour ${__filename}`);
    delete require.cache[fichier];
    require(fichier);
});
