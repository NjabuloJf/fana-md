// keepalive.js
const http = require('http');
const https = require('https');
const conf = require('./set');

// Get the Heroku app URL
const APP_URL = process.env.HEROKU_APP_URL || `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;

console.log(`🔄 Keep Alive started for: ${APP_URL}`);

// Ping the app every 5 minutes to keep it awake
setInterval(() => {
    const start = Date.now();
    
    https.get(APP_URL, (res) => {
        const time = Date.now() - start;
        console.log(`✅ Ping successful (${time}ms) - Status: ${res.statusCode}`);
    }).on('error', (err) => {
        console.log(`❌ Ping failed: ${err.message}`);
    });
    
    // Also ping the status endpoint
    https.get(`${APP_URL}/status`, (res) => {
        console.log(`✅ Status ping: ${res.statusCode}`);
    }).on('error', () => {});
    
}, 300000); // Every 5 minutes

console.log('✅ Keep Alive running!');
