// keepalive.js
const axios = require('axios');
const conf = require('./set');

// Ping the bot every 3 minutes to keep it awake
setInterval(async () => {
    try {
        // Try to ping your bot's URL
        const appName = conf.HEROKU_APP_NAME || process.env.HEROKU_APP_NAME;
        if (appName) {
            const url = `https://${appName}.herokuapp.com/`;
            await axios.get(url, { timeout: 5000 });
            console.log('✅ Keep-alive ping sent');
        }
    } catch (e) {
        console.log('⚠️ Keep-alive ping failed:', e.message);
    }
}, 180000); // 3 minutes
