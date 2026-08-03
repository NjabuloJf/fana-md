// keepalive.js
const axios = require('axios');
const conf = require('./set');

async function keepAlive() {
    try {
        const appName = conf.HEROKU_APP_NAME || process.env.HEROKU_APP_NAME;
        if (appName) {
            const url = `https://${appName}.herokuapp.com/`;
            await axios.get(url, { timeout: 5000 });
            console.log(`✅ Keep-alive ping sent at ${new Date().toLocaleTimeString()}`);
        }
    } catch (e) {
        console.log('⚠️ Keep-alive ping failed');
    }
}

// Ping every 2 minutes
setInterval(keepAlive, 120000);
keepAlive();
console.log('🔄 Keep-alive service started');
