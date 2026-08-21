// keepalive.js
const http = require('http');
const https = require('https');

// Get the Heroku app URL
const APP_URL = process.env.HEROKU_APP_URL || `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;
const INTERVAL = parseInt(process.env.KEEP_ALIVE_INTERVAL) || 240000; // 4 minutes

console.log(`🔄 Keep Alive started for: ${APP_URL}`);
console.log(`⏱️ Ping interval: ${INTERVAL/1000} seconds`);

// Function to ping the app
function pingApp() {
    const start = Date.now();
    
    // Ping main page
    https.get(APP_URL, (res) => {
        const time = Date.now() - start;
        console.log(`✅ Main ping successful (${time}ms) - Status: ${res.statusCode}`);
    }).on('error', (err) => {
        console.log(`❌ Main ping failed: ${err.message}`);
    });
    
    // Ping status endpoint after 1 second
    setTimeout(() => {
        https.get(`${APP_URL}/status`, (res) => {
            console.log(`✅ Status ping: ${res.statusCode}`);
        }).on('error', () => {});
    }, 1000);
}

// Initial ping after 10 seconds
setTimeout(pingApp, 10000);

// Schedule pings
setInterval(pingApp, INTERVAL);

console.log('✅ Keep Alive running!');

// Handle process exit
process.on('SIGINT', () => {
    console.log('🛑 Keep Alive stopped');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Keep Alive stopped');
    process.exit(0);
});
