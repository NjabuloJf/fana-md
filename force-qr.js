const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function start() {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState('./scan');
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ['Njabulo-MD', 'Chrome', '1.0.0']
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('✅ Bot connected! Session saved to ./scan/creds.json');
            process.exit(0);
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (!shouldReconnect) {
                console.log('❌ Logged out, please re-run');
                process.exit(1);
            }
        }
    });
}

start();
