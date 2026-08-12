// keepalive.js
const express = require('express');
const path = require('path');
const axios = require('axios');
const conf = require('./set');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Serve the index.html file from the 'public' folder
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Open the web server
app.listen(PORT, () => {
    console.log(`✅ Keepalive Web Server running on port ${PORT}`);
});

// Continue pinging the app to prevent sleeping
async function keepAlive() {
    try {
        const appName = conf.HEROKU_APP_NAME || process.env.HEROKU_APP_NAME;
        if (appName) {
            const url = `https://${appName}.herokuapp.com/`;
            await axios.get(url, { timeout: 5000 });
            console.log(`✅ Keep-alive ping sent at ${new Date().toLocaleTimeString()}`);
        } else {
            console.log('⚠️ HEROKU_APP_NAME not set, skipping ping.');
        }
    } catch (e) {
        console.log('⚠️ Keep-alive ping failed (App might be starting up).');
    }
}

// Ping every 2 minutes
setInterval(keepAlive, 120000);
keepAlive();
console.log('🔄 Keep-alive service started');
