const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');

// Ensure scan directory exists
if (!fs.existsSync('./scan')) {
    fs.mkdirSync('./scan', { recursive: true });
}

async function start() {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState('./scan');
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ['Njabulo-MD', 'Chrome', '1.0.0'],
        markOnlineOnConnect: false,
        keepAliveIntervalMs: 30000,
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('📱 QR Code generated! Scan it with WhatsApp.');
        }
        
        if (connection === 'open') {
            console.log('✅ Bot connected successfully!');
            console.log('📁 Session saved to ./scan/creds.json');
            console.log('To encode session, run: cat ./scan/creds.json | base64 -w 0');
            process.exit(0);
        }
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('❌ Logged out, please re-run');
                process.exit(1);
            } else {
                console.log('🔄 Reconnecting...');
                // Don't exit, let it retry
            }
        }
    });
}

// Handle errors
process.on('uncaughtException', (err) => {
    console.error('Error:', err.message);
});

start();
