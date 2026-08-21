"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc); 
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const logger_1 = __importDefault(require("@whiskeysockets/baileys/lib/Utils/logger"));
const logger = logger_1.default.child({});
logger.level = 'silent';
const pino = require("pino");
const boom_1 = require("@hapi/boom");
const conf = require("./set");
const axios = require("axios");
let fs = require("fs-extra");
let path = require("path");
const FileType = require('file-type');
const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
const { verifierEtatJid , recupererActionJid } = require("./bdd/antilien");
const { atbverifierEtatJid , atbrecupererActionJid } = require("./bdd/antibot");
let evt = require(__dirname + "/njabulo/fana");
const {isUserBanned , addUserToBanList , removeUserFromBanList} = require("./bdd/banUser");
const  {addGroupToBanList,isGroupBanned,removeGroupFromBanList} = require("./bdd/banGroup");

// ========== FIX: OnlyAdmin with fallback ==========
let isGroupOnlyAdmin, addGroupToOnlyAdminList, removeGroupFromOnlyAdminList;
try {
    const onlyAdmin = require("./bdd/onlyAdmin");
    isGroupOnlyAdmin = onlyAdmin.isGroupOnlyAdmin || (() => false);
    addGroupToOnlyAdminList = onlyAdmin.addGroupToOnlyAdminList || (() => {});
    removeGroupFromOnlyAdminList = onlyAdmin.removeGroupFromOnlyAdminList || (() => {});
    console.log("✅ onlyAdmin module loaded successfully");
} catch (e) {
    console.log("⚠️ onlyAdmin module not available, using fallback");
    isGroupOnlyAdmin = async () => false;
    addGroupToOnlyAdminList = async () => {};
    removeGroupFromOnlyAdminList = async () => {};
}

let { reagir } = require(__dirname + "/njabulo/app");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// ========== LOAD COMMANDS IMMEDIATELY ON STARTUP ==========
console.log("🚀 Loading Commands...");

try {
    const commandFiles = fs.readdirSync(__dirname + "/commandes");
    let loadedCommands = 0;
    commandFiles.forEach((fichier) => {
        if (path.extname(fichier).toLowerCase() == (".js")) {
            try {
                require(__dirname + "/commandes/" + fichier);
                console.log("✅ " + fichier + " Installed Successfully✔️");
                loadedCommands++;
            } catch (e) {
                console.log(`❌ ${fichier} could not be installed: ${e.message}`);
            }
        }
    });
    console.log(`\n📦 Total Commands Loaded: ${loadedCommands}`);
} catch (e) {
    console.log('⚠️ No command folder found');
}

// ========== RECONNECTION CONTROL ==========
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let reconnectTimeout = null;
let isReconnecting = false;
let zkInstance = null;
let isConnected = false;

function resetReconnectAttempts() {
    reconnectAttempts = 0;
    isReconnecting = false;
}

function handleReconnect(reason) {
    if (isReconnecting) {
        console.log('⏳ Already reconnecting, skipping...');
        return;
    }
    
    reconnectAttempts++;
    isReconnecting = true;
    
    if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
        console.log(`❌ Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached.`);
        console.log('💡 Please restart the bot manually: heroku dyno:restart web.1');
        isReconnecting = false;
        return;
    }
    
    const delay = Math.min(5000 * reconnectAttempts, 60000);
    console.log(`🔄 ${reason} - Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay/1000}s...`);
    
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
    }
    
    reconnectTimeout = setTimeout(() => {
        isReconnecting = false;
        startBot();
    }, delay);
}

// ========== WEB SERVER WITH EMBEDDED INDEX.HTML ==========
const http = require('http');

let server = null;
let isServerListening = false;

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NJABULO-JB - WhatsApp Bot</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #fff;
            padding: 20px;
        }

        .container {
            max-width: 500px;
            width: 100%;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 30px;
            padding: 40px 30px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
            text-align: center;
        }

        .logo {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0 auto 20px;
            font-size: 60px;
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        h1 {
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }

        .subtitle {
            color: #a0a0c0;
            font-size: 14px;
            margin-bottom: 30px;
            letter-spacing: 1px;
        }

        .status-card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 20px;
            margin: 20px 0;
            border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .status-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .status-row:last-child {
            border-bottom: none;
        }

        .status-label {
            color: #a0a0c0;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-value {
            font-size: 14px;
            font-weight: 600;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            animation: statusPulse 2s ease-in-out infinite;
        }

        .status-badge.online {
            background: rgba(52, 211, 153, 0.2);
            color: #34d399;
            border: 1px solid rgba(52, 211, 153, 0.3);
        }

        .status-badge.offline {
            background: rgba(251, 113, 133, 0.2);
            color: #fb7185;
            border: 1px solid rgba(251, 113, 133, 0.3);
        }

        @keyframes statusPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }

        .features {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin: 25px 0;
        }

        .feature-item {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 15px 10px;
            border: 1px solid rgba(255, 255, 255, 0.06);
            transition: all 0.3s ease;
        }

        .feature-item:hover {
            background: rgba(255, 255, 255, 0.08);
            transform: translateY(-2px);
        }

        .feature-item .icon {
            font-size: 24px;
            display: block;
            margin-bottom: 6px;
        }

        .feature-item .label {
            font-size: 10px;
            color: #a0a0c0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .commands-section {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 16px;
            padding: 16px;
            margin: 20px 0;
            border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .commands-section h3 {
            font-size: 13px;
            color: #a0a0c0;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }

        .command-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
        }

        .command-item {
            background: rgba(255, 255, 255, 0.05);
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 500;
            color: #c0c0e0;
            font-family: 'Courier New', monospace;
            border: 1px solid rgba(255, 255, 255, 0.04);
            transition: all 0.2s ease;
        }

        .command-item:hover {
            background: rgba(102, 126, 234, 0.15);
            border-color: rgba(102, 126, 234, 0.2);
        }

        .footer {
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            font-size: 12px;
            color: #606080;
        }

        .footer a {
            color: #667eea;
            text-decoration: none;
            transition: color 0.3s ease;
        }

        .footer a:hover {
            color: #764ba2;
            text-decoration: underline;
        }

        .loader {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            border-top-color: #34d399;
            animation: spin 0.8s ease-in-out infinite;
            vertical-align: middle;
            margin-right: 8px;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
            .container { padding: 30px 20px; }
            .features { grid-template-columns: repeat(3, 1fr); gap: 8px; }
            .feature-item .icon { font-size: 20px; }
            .command-grid { grid-template-columns: 1fr 1fr; }
            h1 { font-size: 22px; }
            .logo { width: 90px; height: 90px; font-size: 45px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🤖</div>
        <h1>NJABULO-JB</h1>
        <p class="subtitle">⚡ WhatsApp Bot • Multi-Device</p>

        <div class="status-card">
            <div class="status-row">
                <span class="status-label">📊 Status</span>
                <span class="status-value">
                    <span class="status-badge online" id="statusBadge">
                        <span class="loader" id="statusLoader" style="display:none;"></span>
                        <span id="statusText">Checking...</span>
                    </span>
                </span>
            </div>
            <div class="status-row">
                <span class="status-label">⏱️ Uptime</span>
                <span class="status-value" id="uptime">--</span>
            </div>
            <div class="status-row">
                <span class="status-label">📱 Connected</span>
                <span class="status-value" id="connected">--</span>
            </div>
        </div>

        <div class="features">
            <div class="feature-item"><span class="icon">🌍</span><span class="label">Multi-Language</span></div>
            <div class="feature-item"><span class="icon">🛡️</span><span class="label">Anti-Link</span></div>
            <div class="feature-item"><span class="icon">🤖</span><span class="label">AI Chatbot</span></div>
            <div class="feature-item"><span class="icon">🎵</span><span class="label">Music Download</span></div>
            <div class="feature-item"><span class="icon">📸</span><span class="label">Media Tools</span></div>
            <div class="feature-item"><span class="icon">🔒</span><span class="label">Auto-Mod</span></div>
        </div>

        <div class="commands-section">
            <h3>⚡ Quick Commands</h3>
            <div class="command-grid">
                <span class="command-item">.menu</span>
                <span class="command-item">.ping</span>
                <span class="command-item">.ai</span>
                <span class="command-item">.sticker</span>
                <span class="command-item">.play</span>
                <span class="command-item">.song</span>
                <span class="command-item">.setlang</span>
                <span class="command-item">.owner</span>
            </div>
        </div>

        <div class="footer">
            <p>Developed with ❤️ by <a href="#" target="_blank">Njabulo JB</a></p>
            <p style="margin-top: 4px; font-size: 11px;">© 2026 • All rights reserved</p>
        </div>
    </div>

    <script>
        async function fetchStatus() {
            var statusText = document.getElementById("statusText");
            var statusBadge = document.getElementById("statusBadge");
            var statusLoader = document.getElementById("statusLoader");
            var uptimeEl = document.getElementById("uptime");
            var connectedEl = document.getElementById("connected");

            try {
                statusLoader.style.display = "inline-block";
                statusText.textContent = "Checking...";

                var response = await fetch("/status");
                var data = await response.json();

                statusLoader.style.display = "none";

                if (response.ok && data && data.connected) {
                    statusBadge.className = "status-badge online";
                    statusText.textContent = "🟢 Online";

                    if (data.uptime) {
                        var uptime = data.uptime;
                        var hours = Math.floor(uptime / 3600);
                        var minutes = Math.floor((uptime % 3600) / 60);
                        var seconds = Math.floor(uptime % 60);
                        uptimeEl.textContent = hours + "h " + minutes + "m " + seconds + "s";
                    } else {
                        uptimeEl.textContent = "Just started";
                    }

                    connectedEl.textContent = "✅ Connected";
                } else {
                    statusBadge.className = "status-badge offline";
                    statusText.textContent = "🔴 Offline";
                    uptimeEl.textContent = "--";
                    connectedEl.textContent = "❌ Disconnected";
                }
            } catch (error) {
                statusLoader.style.display = "none";
                statusBadge.className = "status-badge offline";
                statusText.textContent = "🔴 Offline";
                uptimeEl.textContent = "--";
                connectedEl.textContent = "❌ Disconnected";
            }
        }

        fetchStatus();
        setInterval(fetchStatus, 30000);
    </script>
</body>
</html>`;

function createWebServer() {
    if (server) {
        try { server.close(); } catch (e) {}
    }
    
    server = http.createServer((req, res) => {
        if (req.url === '/' || req.url === '/index.html') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(INDEX_HTML);
        } else if (req.url === '/ping') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Pong!');
        } else if (req.url === '/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: isConnected ? 'online' : 'offline',
                time: new Date().toISOString(),
                uptime: process.uptime(),
                bot: 'NJABULO-JB',
                connected: isConnected || false
            }));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });

    return server;
}

const PORT = process.env.PORT || 3000;

function startServer() {
    if (isServerListening) {
        console.log('ℹ️ Server already running');
        return;
    }
    
    try {
        const serverInstance = createWebServer();
        serverInstance.listen(PORT, () => {
            isServerListening = true;
            console.log(`✅ Web server running on port ${PORT}`);
        });
        
        serverInstance.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`⚠️ Port ${PORT} already in use, retrying...`);
                setTimeout(startServer, 2000);
            } else {
                console.error('❌ Server error:', err.message);
            }
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
    }
}

function stopServer() {
    if (server && isServerListening) {
        try {
            server.close();
            isServerListening = false;
            console.log('🛑 Web server stopped');
        } catch (err) {
            console.error('Error stopping server:', err.message);
        }
    }
}

startServer();

process.on('SIGINT', () => { stopServer(); process.exit(0); });
process.on('SIGTERM', () => { stopServer(); process.exit(0); });

// ========== GOOGLE TRANSLATE API ==========
let translateText = async (text, targetLang) => {
    try {
        if (!targetLang || targetLang === 'en' || typeof targetLang !== 'string') {
            return text;
        }
        targetLang = targetLang.toString().toLowerCase().trim();
        if (targetLang.length > 5 || targetLang.length < 2) {
            return text;
        }
        if (!text) return text;
        
        try {
            const { translate } = require('@vitalets/google-translate-api');
            const result = await translate(text, { to: targetLang });
            return result.text;
        } catch (e) {
            console.log('⚠️ Google Translate failed, using fallback...');
            try {
                const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`, {
                    timeout: 5000
                });
                if (response.data && response.data.responseData) {
                    return response.data.responseData.translatedText || text;
                }
                return text;
            } catch (fallbackError) {
                console.error('⚠️ Fallback translation failed:', fallbackError.message);
                return text;
            }
        }
    } catch (error) {
        console.error('⚠️ Translation error:', error.message);
        return text;
    }
};

const translationCache = new Map();

let translateTextWithCache = async (text, targetLang) => {
    if (!targetLang || targetLang === 'en' || typeof targetLang !== 'string') return text;
    targetLang = targetLang.toString().toLowerCase().trim();
    if (targetLang.length > 5 || targetLang.length < 2) return text;
    if (!text) return text;
    
    const cacheKey = `${text}_${targetLang}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }
    
    try {
        const result = await translateText(text, targetLang);
        translationCache.set(cacheKey, result);
        setTimeout(() => translationCache.delete(cacheKey), 3600000);
        return result;
    } catch (error) {
        console.error('⚠️ Translation error:', error.message);
        return text;
    }
};

const languageNames = {
    en: "English", sn: "Shona", nd: "Ndebele", af: "Afrikaans",
    zu: "Zulu", xh: "Xhosa", pt: "Portuguese", sw: "Swahili",
    hi: "Hindi", ar: "Arabic", fr: "French", es: "Spanish",
    zh: "Chinese", de: "German", it: "Italian", ja: "Japanese",
    ko: "Korean", ru: "Russian"
};

async function getTranslatedWelcome(lang) {
    const welcomeTitle = await translateTextWithCache("🎉 WELCOME TO THE GROUP!", lang);
    const welcomeHey = await translateTextWithCache("Hey", lang);
    const welcomeRules = await translateTextWithCache("📜 Read the group description to avoid getting removed", lang);
    const welcomeEnjoy = await translateTextWithCache("💫 Enjoy your stay!", lang);
    return { welcomeTitle, welcomeHey, welcomeRules, welcomeEnjoy };
}

async function getTranslatedGoodbye(lang) {
    const goodbyeTitle = await translateTextWithCache("👋 GOODBYE", lang);
    const goodbyeLeft = await translateTextWithCache("has left the group", lang);
    const goodbyeRemaining = await translateTextWithCache("Remaining members", lang);
    return { goodbyeTitle, goodbyeLeft, goodbyeRemaining };
}

async function getTranslatedButtons(lang) {
    const buttonText = await translateTextWithCache("bot Channels", lang);
    return [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: buttonText,
                id: "backup channel",
                url: conf.GURL
            }),
        }
    ];
}

async function getName(jid) {
    try {
        if (!jid) return "Unknown";
        if (typeof jid === 'object') {
            if (jid.phoneNumber) return jid.phoneNumber.split('@')[0];
            if (jid.id) return jid.id.split('@')[0];
            return "Unknown";
        }
        if (typeof jid === 'string') {
            return jid.split('@')[0];
        }
        return "Unknown";
    } catch (e) {
        return "Unknown";
    }
}

console.log("✅ Using Baileys");

const sessionDir = __dirname + '/sessions';
const credsPath = sessionDir + '/creds.json';

if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
    console.log("📁 Created sessions directory");
}

async function loadSession() {
    try {
        const sessionId = conf.SESSION_ID || conf.session || 'zokk';
        
        if (!sessionId || sessionId === 'zokk') {
            console.log("📱 No session provided, will generate new QR code");
            return;
        }
        
        console.log("📱 Processing session...");
        
        if (sessionId.startsWith('njabulo~')) {
            const base64Session = sessionId.replace('njabulo~', '');
            console.log("✅ Detected 'njabulo~' prefix, decoding base64...");
            
            try {
                const sessionJson = Buffer.from(base64Session, 'base64').toString('utf-8');
                const sessionData = JSON.parse(sessionJson);
                fs.writeFileSync(credsPath, JSON.stringify(sessionData, null, 2));
                console.log("✅ Session loaded from Base64 successfully!");
                return;
            } catch (err) {
                console.log("❌ Error decoding Base64 session:", err.message);
                console.log("⚠️ Invalid session, will generate new QR code...");
                if (fs.existsSync(credsPath)) {
                    fs.unlinkSync(credsPath);
                }
                return;
            }
        }
        
        console.log("📱 No valid session format detected, will generate new QR code");
        
    } catch (error) {
        console.log("❌ Session loading error:", error.message);
    }
}

loadSession();

var session = (conf.session || '').replace(/Zokou-MD-WHATSAPP-BOT;;;=>/g,"");
const prefixe = conf.PREFIXE || ".";
const more = String.fromCharCode(8206)
const readmore = more.repeat(4001)

async function authentification() {
    try {
        if (!fs.existsSync(__dirname + "/auth/creds.json")) {
            console.log("connexion en cour ...");
            await fs.writeFileSync(__dirname + "/auth/creds.json", atob(session), "utf8");
        }
        else if (fs.existsSync(__dirname + "/auth/creds.json") && session != "zokk") {
            await fs.writeFileSync(__dirname + "/auth/creds.json", atob(session), "utf8");
        }
    }
    catch (e) {
        console.log("Session Invalid " + e);
        return;
    }
}
authentification();

const store = {
    chats: new Map(),
    contacts: new Map(),
    messages: new Map(),
    bind: function(ev) { console.log("Store bound"); },
    writeToFile: function(filename) {
        try {
            const data = {
                chats: Array.from(this.chats.entries()),
                contacts: Array.from(this.contacts.entries()),
                messages: Array.from(this.messages.entries())
            };
            fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        } catch (e) {}
    },
    loadMessage: async function(jid, id) {
        if (this.messages.has(jid)) {
            const messages = this.messages.get(jid);
            if (messages && Array.isArray(messages)) {
                return messages.find(msg => msg.key && msg.key.id === id);
            }
        }
        return undefined;
    }
};

const { handleButtons } = require("./commands/play0");

const userCooldowns = new Map();
const RATE_LIMIT_MS = 1000;

function isRateLimited(jid) {
    const now = Date.now();
    const cooldown = userCooldowns.get(jid) || 0;
    if (now - cooldown < RATE_LIMIT_MS) {
        return true;
    }
    userCooldowns.set(jid, now);
    return false;
}

async function clearSession() {
    try {
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            console.log('✅ Session directory cleared');
        }
        if (fs.existsSync(__dirname + '/auth')) {
            fs.rmSync(__dirname + '/auth', { recursive: true, force: true });
            console.log('✅ Auth directory cleared');
        }
        return true;
    } catch (e) {
        console.log('❌ Error clearing session:', e.message);
        return false;
    }
}

// ========== MAIN BOT FUNCTION ==========
async function startBot() {
    try {
        // Add uncaught exception handlers
        process.on('uncaughtException', (err) => {
            console.error('❌ Uncaught Exception:', err.message);
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection:', reason);
        });
        
        console.log("🚀 Starting bot connection...");
        
        const { version } = await (0, baileys_1.fetchLatestBaileysVersion)();
        const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(sessionDir);
        
        const sockOptions = {
            version,
            logger: pino({ level: "silent" }),
            browser: ['NJABULO-MD', "Chrome", "1.0.0"],
            fireInitQueries: false,
            markOnlineOnConnect: false,
            keepAliveIntervalMs: 60_000,
            syncFullHistory: false,
            patchHistory: false,
            generateHighQualityLinkPreview: false,
            auth: {
                creds: state.creds,
                keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, logger),
            },
            getMessage: async (key) => {
                if (store) {
                    const msg = await store.loadMessage(key.remoteJid, key.id);
                    return msg?.message || undefined;
                }
                return { conversation: 'An Error Occurred, Repeat Command!' };
            }
        };
        const zk = (0, baileys_1.default)(sockOptions);
        zkInstance = zk;
        store.bind(zk.ev);

const njabulox = [
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png"
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ========== FIX: Welcome and Goodbye ==========
const { recupevents, attribuerUnevaleur } = require('./bdd/welcome');

async function getProfilePic(jid) {
    try {
        const pp = await zk.profilePictureUrl(jid, 'image');
        return pp;
    } catch {
        return randomNjabulourl;
    }
}

// ========== WELCOME & GOODBYE EVENT HANDLER ==========
zk.ev.on('group-participants.update', async (group) => {
    console.log('Group update detected:', group);
    const lang = conf.LANGUAGE || "en";
    const buttons = await getTranslatedButtons(lang);

    try {
        const metadata = await zk.groupMetadata(group.id);
        const groupName = metadata.subject;
        const participantCount = metadata.participants.length;
        const currentTime = new Date();
        const joinTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const joinDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // ========== WELCOME ==========
        if (group.action === 'add') {
            const welcomeStatus = await recupevents(group.id, "welcome");
            console.log(`Welcome status for ${group.id}: ${welcomeStatus}`);
            
            if (welcomeStatus === 'on' || welcomeStatus === 'oui') {
                const translated = await getTranslatedWelcome(lang);
                let membres = group.participants;
                
                for (let membre of membres) {
                    try {
                        const memberJid = membre.phoneNumber || membre.id;
                        if (!memberJid) continue;
                        
                        const memberName = await getName(memberJid);
                        const memberPP = await getProfilePic(memberJid);
                        
                        const msg = `     ${translated.welcomeTitle}

 ${translated.welcomeHey} *${memberName}*!

 📱 *Number:* ${memberJid.split("@")[0]}
 📱 *Group:* ${groupName}
 👥 *Members:* ${participantCount}

 🕐 *Joined at:* ${joinTime}
 📅 *Date:* ${joinDate}

 ${translated.welcomeRules}

 ${translated.welcomeEnjoy}
`;

                        await zk.sendMessage(group.id, {                        
                            interactiveMessage: {
                                image: { url: memberPP || randomNjabulourl }, 
                                header: msg,
                                mentions: [memberJid],
                                buttons: buttons,
                                headerType: 1
                            }
                        });
                        
                        console.log(`✅ Welcome message sent to ${memberName}`);
                    } catch (memberError) {
                        console.error(`Welcome error for participant:`, memberError.message);
                    }
                }
            }
        }
        
        // ========== GOODBYE ==========
        if (group.action === 'remove') {
            const goodbyeStatus = await recupevents(group.id, "goodbye");
            console.log(`Goodbye status for ${group.id}: ${goodbyeStatus}`);
            
            if (goodbyeStatus === 'on' || goodbyeStatus === 'oui') {
                const translated = await getTranslatedGoodbye(lang);
                let membres = group.participants;
                
                for (let membre of membres) {
                    try {
                        const memberJid = membre.phoneNumber || membre.id;
                        if (!memberJid) continue;
                        
                        const memberName = await getName(memberJid);
                        const memberPP = await getProfilePic(memberJid);
                        
                        const msg = `        ${translated.goodbyeTitle}

 😢 *${memberName}* ${translated.goodbyeLeft}

 📱 *Number:* ${memberJid.split("@")[0]}
 📱 *Group:* ${groupName}
 👥 ${translated.goodbyeRemaining}: ${participantCount - 1}

 🕐 *Left at:* ${joinTime}
 📅 *Date:* ${joinDate}

 ${translated.goodbyeLeft}
`;

                        await zk.sendMessage(group.id, { 
                            interactiveMessage: {
                                image: { url: memberPP || randomNjabulourl }, 
                                header: msg,
                                mentions: [memberJid],
                                buttons: buttons,
                                headerType: 1
                            }
                        });
                        
                        console.log(`✅ Goodbye message sent for ${memberName}`);
                    } catch (memberError) {
                        console.error(`Goodbye error for participant:`, memberError.message);
                    }
                }
            }
        }

    } catch (e) {
        console.error("Group update error:", e.message);
    }
});

        zk.ev.on("messages.upsert", async (m) => {
            const msg = m.messages[0];
            if (!msg.message) return;
            
            const isButton = msg.message?.buttonsResponseMessage || 
                            msg.message?.listResponseMessage ||
                            msg.message?.templateButtonReplyMessage ||
                            msg.message?.interactiveResponseMessage;
            
            if (isButton) {
                console.log("🎯 Button interaction detected!");
                await handleButtons(zk, msg);
                return;
            }
        });

        // ========== UTILITY FUNCTION FOR DELAY ==========
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        // ========== TRACK LAST REACTION TIME ==========
        let lastReactionTime = 0;

        // ========== AUTO-REACT TO STATUS UPDATES ==========
        if (conf.AUTO_REACT_STATUS === "yes") {
            console.log("AUTO_REACT_STATUS is enabled. Listening for status updates...");

            zk.ev.on("messages.upsert", async (m) => {
                const { messages } = m;

                for (const message of messages) {
                    if (message.key && message.key.remoteJid === "status@broadcast") {
                        console.log("Detected status update from:", message.key.remoteJid);

                        const now = Date.now();
                        if (now - lastReactionTime < 5000) {
                            console.log("Throttling reactions to prevent overflow.");
                            continue;
                        }

                        const botJid = zk.user && zk.user.id ? zk.user.id.split(":")[0] + "@s.whatsapp.net" : null;
                        if (!botJid) {
                            console.log("Bot's user ID not available. Skipping reaction.");
                            continue;
                        }

                        await zk.sendMessage(message.key.remoteJid, {
                            react: {
                                key: message.key,
                                text: "💙",
                            },
                        }, {
                            statusJidList: [message.key.participant, botJid],
                        });

                        lastReactionTime = Date.now();
                        console.log(`Successfully reacted to status update by ${message.key.remoteJid}`);
                        await delay(2000);
                    }
                }
            });
        }

        const googleTTS = require('google-tts-api');
        const ai = require('unlimited-ai');

        // ========== AI CHATBOT ==========
        zk.ev.on("messages.upsert", async (m) => {
          const { messages } = m;
          const ms = messages[0];

          if (!ms.message) return;

          const messageType = Object.keys(ms.message)[0];
          const remoteJid = ms.key.remoteJid;
          const messageContent = ms.message.conversation || ms.message.extendedTextMessage?.text;

          if (ms.key.fromMe || remoteJid === conf.NUMERO_OWNER + "@s.whatsapp.net") return;
          if (conf.CHATBOT1 !== "yes") return;

          if (messageType === "conversation" || messageType === "extendedTextMessage") {
            const alpha = messageContent.trim();
            if (!alpha) return;

            let conversationData = [];

            try {
              const rawData = fs.readFileSync('store.json', 'utf8');
              if (rawData) {
                conversationData = JSON.parse(rawData);
                if (!Array.isArray(conversationData)) {
                  conversationData = [];
                }
              }
            } catch (err) {
              console.log('No previous conversation found, starting new one.');
            }

            const model = 'gpt-4-turbo-2024-04-09';
            const userMessage = { role: 'user', content: alpha };
            const systemMessage = { role: 'system', content: 'You are called Njabulo-Jb bot. Developed by Njabulo-Jb. You respond to user commands. Only mention developer name if someone asks.' };

            conversationData.push(userMessage);
            conversationData.push(systemMessage);

            try {
              const aiResponse = await ai.generate(model, conversationData);
              conversationData.push({ role: 'assistant', content: aiResponse });
              fs.writeFileSync('store.json', JSON.stringify(conversationData, null, 2));

              const language = /[^\x00-\x7F]/.test(aiResponse) ? 'sw' : 'en';
              const voice = language === 'sw' ? 'sw-TZ-Wavenet-B' : 'en-US-Wavenet-F';

              const chunkText = (text, limit = 200) => {
                const words = text.split(' ');
                let chunks = [], currentChunk = '';

                words.forEach(word => {
                  if ((currentChunk + word).length > limit) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                  }
                  currentChunk += ' ' + word;
                });

                if (currentChunk) chunks.push(currentChunk.trim());
                return chunks;
              };

              const textChunks = chunkText(aiResponse);
              let audioFiles = [];

              for (let i = 0; i < textChunks.length; i++) {
                const url = googleTTS.getAudioUrl(textChunks[i], {
                  lang: language,
                  slow: false,
                  host: 'https://translate.google.com',
                  voice: voice
                });

                const outputFile = `audio_${i}.mp3`;
                await downloadAudio(url, outputFile);
                audioFiles.push(outputFile);
              }

              if (audioFiles.length === 0) {
                console.error("No audio files generated.");
                return;
              }

              const finalAudio = "enhanced_audio.mp3";
              await enhanceAudio(audioFiles, finalAudio);

              if (!fs.existsSync(finalAudio)) {
                console.error("Enhanced audio file not found.");
                return;
              }

              await zk.sendMessage(remoteJid, {
                audio: { url: finalAudio },
                mimetype: 'audio/mp4',
                ptt: true
              });

              audioFiles.forEach(file => fs.unlinkSync(file));
              fs.unlinkSync(finalAudio);

            } catch (error) {
              console.error("Error with AI generation:", error);
            }
          }
        });

        // ========== DOWNLOAD AUDIO FUNCTION ==========
        const downloadAudio = (url, outputFile) => {
          return new Promise((resolve, reject) => {
            const { exec } = require('child_process');
            exec(`curl -s "${url}" -o ${outputFile}`, (error) => {
              if (error) reject(error);
              else resolve();
            });
          });
        };

        // ========== ENHANCE AUDIO FUNCTION ==========
        const enhanceAudio = (inputFiles, outputFile) => {
          return new Promise((resolve, reject) => {
            const { exec } = require('child_process');
            const inputList = inputFiles.map(file => `-i ${file}`).join(' ');
            const filter = `"volume=1.4, bass=g=6, treble=g=5, equalizer=f=1000:t=q:w=1:g=3, afftdn"`;

            exec(`ffmpeg ${inputList} -filter_complex ${filter} -b:a 192k -y ${outputFile}`, (error) => {
              if (error) reject(error);
              else resolve();
            });
          });
        };

        // ========== CHATBOT TEXT RESPONSE ==========
        zk.ev.on("messages.upsert", async (m) => {
          const { messages } = m;
          const ms = messages[0];

          if (!ms.message) return;

          const messageType = Object.keys(ms.message)[0];
          const remoteJid = ms.key.remoteJid;
          const messageContent = ms.message.conversation || ms.message.extendedTextMessage?.text;

          if (ms.key.fromMe || remoteJid === conf.NUMERO_OWNER + "@s.whatsapp.net") return;

          if (conf.CHATBOT !== "yes") return;

          if (messageType === "conversation" || messageType === "extendedTextMessage") {
            const alpha = messageContent.trim();

            if (!alpha) return;

            let conversationData = [];

            try {
              const rawData = fs.readFileSync('store.json', 'utf8');
              if (rawData) {
                conversationData = JSON.parse(rawData);
                if (!Array.isArray(conversationData)) {
                  conversationData = [];
                }
              }
            } catch (err) {
              console.log('No previous conversation found, starting new one.');
            }

            const model = 'gpt-4-turbo-2024-04-09';
            const userMessage = { role: 'user', content: alpha };  
            const systemMessage = { role: 'system', content: 'You are called Njabulo-Jb bot. Developed by Njabulo-Jb. You respond to user commands. Only mention developer name if someone asks.' };

            conversationData.push(userMessage);
            conversationData.push(systemMessage);

            try {
              const aiResponse = await ai.generate(model, conversationData);
              conversationData.push({ role: 'assistant', content: aiResponse });
              fs.writeFileSync('store.json', JSON.stringify(conversationData, null, 2));
              await zk.sendMessage(remoteJid, { text: aiResponse });
            } catch (error) {
              console.error("Error with AI generation:", error);
            }
          }
        });

// ========== ARRAY OF REACTION EMOJIS ==========
const emojiMap = {
    "hello": ["👋", "🙂", "😊", "🙋‍♂️", "🙋‍♀️"],
    "hi": ["👋", "🙂", "😁", "🙋‍♂️", "🙋‍♀️"],
    "thanks": ["🙏", "😊", "💖", "❤️", "💐"],
    "love": ["❤️", "💖", "💘", "😍", "😘", "💍", "💑"],
    "miss you": ["😢", "💔", "😔", "😭", "💖"],
    "sorry": ["😔", "🙏", "😓", "💔", "🥺"],
    "happy": ["😁", "😊", "🎉", "🎊", "💃", "🕺"],
    "sad": ["😢", "😭", "😞", "💔", "😓"],
    "angry": ["😡", "🤬", "😤", "💢", "😾"],
    "excited": ["🤩", "🎉", "😆", "🤗", "🥳"],
    "surprised": ["😲", "😳", "😯", "😮", "😲"],
    "help": ["🆘", "❓", "🙏", "💡", "👨‍💻", "👩‍💻"],
    "good": ["👍", "👌", "😊", "💯", "🌟"],
    "awesome": ["🔥", "🚀", "🤩", "👏", "💥"],
    "cool": ["😎", "👌", "🎮", "🎸", "💥"],
    "bot": ["🤖", "💻", "⚙️", "🧠", "🔧"],
    "party": ["🎉", "🥳", "🍾", "🍻", "🎤", "💃", "🕺"],
    "fun": ["🤣", "😂", "🥳", "🎉", "🎮", "🎲"],
    "good morning": ["🌅", "🌞", "☀️", "🌻", "🌼"],
    "good night": ["🌙", "🌜", "⭐", "🌛", "💫"],
    "congratulations": ["🎉", "🎊", "🏆", "🎁", "👏"],
    "well done": ["👏", "💪", "🎉", "🎖️", "👍"],
    "good job": ["👏", "💯", "👍", "🌟", "🎉"],
    "pizza": ["🍕", "🥖", "🍟", "🍔", "🍝"],
    "burger": ["🍔", "🍟", "🥓", "🥪", "🌭"],
    "coffee": ["☕", "🥤", "🍵", "🫖", "🥄"],
    "tea": ["🍵", "☕", "🫖", "🥄", "🍪"],
    "cake": ["🍰", "🎂", "🧁", "🍩", "🍫"],
    "water": ["💧", "💦", "🌊", "🚰", "🥤"],
    "wine": ["🍷", "🍾", "🥂", "🍹", "🍸"],
    "beer": ["🍺", "🍻", "🥂", "🍹", "🍾"],
    "cheers": ["🥂", "🍻", "🍾", "🎉", "🎊"],
    "sun": ["🌞", "☀️", "🌅", "🌄", "🌻"],
    "moon": ["🌜", "🌙", "🌚", "🌝", "🌛"],
    "star": ["🌟", "⭐", "✨", "💫", "🌠"],
    "cloud": ["☁️", "🌥️", "🌤️", "⛅", "🌧️"],
    "rain": ["🌧️", "☔", "💧", "💦", "🌂"],
    "fire": ["🔥", "⚡", "🌋", "🔥", "💥"],
    "flower": ["🌸", "🌺", "🌷", "💐", "🌹"],
    "tree": ["🌳", "🌲", "🌴", "🎄", "🌱"],
    "dog": ["🐶", "🐕", "🐾", "🐩", "🦮"],
    "cat": ["🐱", "😺", "😸", "🐾", "🦁"],
    "bird": ["🐦", "🐧", "🦅", "🦢", "🦜"],
    "fish": ["🐟", "🐠", "🐡", "🐬", "🐳"],
    "unicorn": ["🦄", "✨", "🌈", "🌸", "💫"],
    "soccer": ["⚽", "🥅", "🏟️", "🎉", "👏"],
    "basketball": ["🏀", "⛹️‍♂️", "🏆", "🎉", "🥇"],
    "tennis": ["🎾", "🏸", "🥇", "🏅", "💪"],
    "running": ["🏃‍♂️", "🏃‍♀️", "👟", "🏅", "🔥"],
    "dancing": ["💃", "🕺", "🎶", "🥳", "🎉"],
    "music": ["🎶", "🎵", "🎼", "🎸", "🎧"],
    "money": ["💸", "💰", "💵", "💳", "🤑"],
    "rocket": ["🚀", "🌌", "🛸", "🛰️", "✨"],
    "computer": ["💻", "🖥️", "📱", "⌨️", "🖱️"],
    "phone": ["📱", "📲", "☎️", "📞", "📳"],
    "camera": ["📷", "📸", "🎥", "📹", "🎞️"],
    "book": ["📚", "📖", "✏️", "📘", "📕"],
    "gift": ["🎁", "💝", "🎉", "🎊", "🎈"],
    "car": ["🚗", "🚘", "🚙", "🚕", "🛣️"],
    "train": ["🚆", "🚄", "🚅", "🚞", "🚂"],
    "plane": ["✈️", "🛫", "🛬", "🛩️", "🚁"],
    "boat": ["⛵", "🛥️", "🚤", "🚢", "🌊"],
    "city": ["🏙️", "🌆", "🌇", "🏢", "🌃"],
    "beach": ["🏖️", "🌴", "🌊", "☀️", "🏄‍♂️"],
    "mountain": ["🏔️", "⛰️", "🗻", "🌄", "🌞"],
    "birthday": ["🎂", "🎉", "🎈", "🎊", "🍰"],
    "christmas": ["🎄", "🎅", "🤶", "🎁", "⛄"],
    "new year": ["🎉", "🎊", "🎇", "🍾", "✨"],
    "easter": ["🐰", "🐣", "🌷", "🥚", "🌸"],
    "halloween": ["🎃", "👻", "🕸️", "🕷️", "👹"],
    "valentine": ["💘", "❤️", "💌", "💕", "🌹"],
    "wedding": ["💍", "👰", "🤵", "🎩", "💒"]
};

const fallbackEmojis = [
    "😎", "🔥", "💥", "💯", "✨", "🌟", "🌈", "⚡", "💎", "🌀",
    "👑", "🎉", "🎊", "🦄", "👽", "🛸", "🚀", "🦋", "💫", "🍀",
    "🎶", "🎧", "🎸", "🎤", "🏆", "🏅", "🌍", "🌎", "🌏", "🎮"
];

const getEmojiForSentence = (sentence) => {
    const words = sentence.split(/\s+/);
    for (const word of words) {
        const emoji = getRandomEmojiFromMap(word.toLowerCase());
        if (emoji) {
            return emoji;
        }
    }
    return getRandomFallbackEmoji();
};

const getRandomEmojiFromMap = (keyword) => {
    const emojis = emojiMap[keyword.toLowerCase()];
    if (emojis && emojis.length > 0) {
        return emojis[Math.floor(Math.random() * emojis.length)];
    }
    return null;
};

const getRandomFallbackEmoji = () => {
    return fallbackEmojis[Math.floor(Math.random() * fallbackEmojis.length)];
};

// ========== AUTO-REACT TO REGULAR MESSAGES ==========
if (conf.AUTO_REACT === "yes") {
    console.log("AUTO_REACT is enabled. Listening for regular messages...");

    zk.ev.on("messages.upsert", async (m) => {
        const { messages } = m;

        for (const message of messages) {
            if (message.key && message.key.remoteJid) {
                const now = Date.now();
                if (now - lastReactionTime < 5000) {
                    console.log("Throttling reactions to prevent overflow.");
                    continue;
                }

                const conversationText = message?.message?.conversation || "";
                const randomEmoji = getEmojiForSentence(conversationText) || getRandomFallbackEmoji();

                if (randomEmoji) {
                    await zk.sendMessage(message.key.remoteJid, {
                        react: {
                            text: randomEmoji,
                            key: message.key
                        }
                    }).then(() => {
                        lastReactionTime = Date.now();
                        console.log(`Successfully reacted with '${randomEmoji}' to message by ${message.key.remoteJid}`);
                    }).catch(err => {
                        console.error("Failed to send reaction:", err);
                    });
                }

                await delay(2000);
            }
        }
    });
}

        // ========== CONNECTION UPDATE ==========
        zk.ev.on("connection.update", async (con) => {
            const { lastDisconnect, connection, qr } = con;
            
            if (qr) {
                console.log("\n📱 ========== SCAN THIS QR CODE WITH WHATSAPP ==========");
                console.log(qr);
                console.log("📱 ====================================================\n");
            }
            
            if (connection === "connecting") {
                console.log("ℹ️ Njabulo-Jb is connecting...");
            }
            else if (connection === 'open') {
                isConnected = true;
                resetReconnectAttempts();
                console.log("✅ Njabulo-Jb Connected to WhatsApp! ☺️");
                console.log("--");
                await (0, baileys_1.delay)(200);
                console.log("------");
                await (0, baileys_1.delay)(300);
                console.log("------------------/-----");
                console.log("Njabulo-Jb is Online 🕸\n\n");
                console.log("✅ Bot is ready to receive commands!\n");

                const currentLang = conf.LANGUAGE || "en";
                const langName = languageNames[currentLang] || "English";
                const startupButtons = await getTranslatedButtons(currentLang);
                const ownerNumber = conf.NUMERO_OWNER + "@s.whatsapp.net";
                const ownerNumberfana = conf.NUMERO_OWNERFANA + "@s.whatsapp.net";
                var md;
                if ((conf.MODE || "").toLocaleLowerCase() === "yes") {
                    md = "public";
                } else if ((conf.MODE || "").toLocaleLowerCase() === "no") {
                    md = "private";
                } else {
                    md = "undefined";
                }
      
                if((conf.DP || "").toLowerCase() === 'yes') {
                    try {
                        const startupText = `*╭───────────────*
*-᳆ .📊 NJABULO-JB BOT ONLINE*
*-᳆*
*-᳆ .✅ Bot:* WhatsApp Bot Connected
*-᳆ .📌 Prefix:* ${prefixe}
*-᳆ .📅 Date:* ${new Date().toLocaleDateString()}
*-᳆ .🕐 Time:* ${new Date().toLocaleTimeString()}
*-᳆ .📊 Mode:* ${md}
*-᳆ .🌍 Language:* ${langName}
*-᳆ .👤 Owner:* Njabulo JB
*-᳆*
*-᳆ .💡 Commands:* Use .menu
*-᳆ .⏳ lang to set bot language*
*-᳆ .💌 use .setlang you owner country language*
 *╰───────────────*


`;
                        // Send to ownerNumberfana
                        if (ownerNumberfana && ownerNumberfana !== "undefined@s.whatsapp.net") {
                            await zk.sendMessage(ownerNumberfana, { 
                                interactiveMessage: {
                                    image: { url: randomNjabulourl },
                                    header: startupText,
                                    buttons: startupButtons,
                                    headerType: 1
                                }
                            });
                            console.log("✅ Startup message sent to ownerNumberfana");
                        }
                        
                        // Send to ownerNumber
                        await zk.sendMessage(ownerNumber, { 
                            interactiveMessage: {
                                image: { url: randomNjabulourl },
                                header: startupText,
                                buttons: startupButtons,
                                headerType: 1
                            }
                        });
                        console.log("✅ Startup message sent to ownerNumber");
                        
                        // Send to bot's own DM (zk.user.id)
                        if (zk.user && zk.user.id) {
                            await zk.sendMessage(zk.user.id, { 
                                interactiveMessage: {
                                    image: { url: randomNjabulourl }, 
                                    header: startupText,
                                    buttons: startupButtons,
                                    headerType: 1
                                }
                            });
                            console.log("✅ Startup message sent to bot DM (zk.user.id)");
                        }
                    } catch (e) {
                        console.log("❌ Failed to send startup message:", e.message);
                    }
                }
            }
            else if (connection == "close") {
                let raisonDeconnexion = new boom_1.Boom(lastDisconnect?.error)?.output.statusCode;
                isConnected = false;
                
                if (raisonDeconnexion === baileys_1.DisconnectReason.badSession) {
                    console.log('❌ Session id error! Please clear sessions and rescan QR.');
                    try {
                        await clearSession();
                        console.log('✅ Session files cleared. Restart the bot to get new QR.');
                    } catch (e) {
                        console.log('Could not delete session files:', e.message);
                    }
                    return;
                } else if (raisonDeconnexion === baileys_1.DisconnectReason.connectionClosed || 
                           raisonDeconnexion === baileys_1.DisconnectReason.connectionLost) {
                    handleReconnect('Connection lost');
                    return;
                } else if (raisonDeconnexion === baileys_1.DisconnectReason.restartRequired) {
                    handleReconnect('Restart required');
                    return;
                } else if (raisonDeconnexion === baileys_1.DisconnectReason.loggedOut) {
                    console.log('🚫 Logged out! Please clear sessions and rescan QR.');
                    try {
                        await clearSession();
                        console.log('✅ Session files cleared. Restart the bot to get new QR.');
                    } catch (e) {
                        console.log('Could not delete session files:', e.message);
                    }
                    return;
                } else {
                    handleReconnect('Unknown error');
                    return;
                }
            }
        });

        zk.ev.on("creds.update", saveCreds);

        // ========== COMMAND HANDLER ==========
        zk.ev.on("messages.upsert", async (m) => {
            const { messages } = m;
            const ms = messages[0];
            if (!ms.message) return;
            
            const sender = ms.key.remoteJid;
            if (isRateLimited(sender)) {
                return;
            }
            
            const decodeJid = (jid) => {
                if (!jid) return jid;
                if (/:\d+@/gi.test(jid)) {
                    let decode = (0, baileys_1.jidDecode)(jid) || {};
                    return decode.user && decode.server && decode.user + '@' + decode.server || jid;
                }
                return jid;
            };
            
            var mtype = (0, baileys_1.getContentType)(ms.message);
            var texte = mtype == "conversation" ? ms.message.conversation : 
                        mtype == "imageMessage" ? ms.message.imageMessage?.caption : 
                        mtype == "videoMessage" ? ms.message.videoMessage?.caption : 
                        mtype == "extendedTextMessage" ? ms.message?.extendedTextMessage?.text : 
                        mtype == "buttonsResponseMessage" ? ms?.message?.buttonsResponseMessage?.selectedButtonId : 
                        mtype == "listResponseMessage" ? ms.message?.listResponseMessage?.singleSelectReply?.selectedRowId : "";
            
            // Skip if no text
            if (!texte) return;
            
            var origineMessage = ms.key.remoteJid;
            var idBot = decodeJid(zk.user.id);
            var servBot = idBot.split('@')[0];
            
            const verifGroupe = origineMessage?.endsWith("@g.us");
            var infosGroupe = verifGroupe ? await zk.groupMetadata(origineMessage) : "";
            var nomGroupe = verifGroupe ? infosGroupe.subject : "";
            var msgRepondu = ms.message.extendedTextMessage?.contextInfo?.quotedMessage;
            var auteurMsgRepondu = decodeJid(ms.message?.extendedTextMessage?.contextInfo?.participant);
            var mr = ms.Message?.extendedTextMessage?.contextInfo?.mentionedJid;
            var utilisateur = mr ? mr : msgRepondu ? auteurMsgRepondu : "";
            var auteurMessage = verifGroupe ? (ms.key.participant ? ms.key.participant : ms.participant) : origineMessage;
            if (ms.key.fromMe) {
                auteurMessage = idBot;
            }
            
            var membreGroupe = verifGroupe ? ms.key.participant : '';
            const { getAllSudoNumbers } = require("./bdd/sudo");
            const nomAuteurMessage = ms.pushName;
            const dj = '26777821911';
            const dj2 = '26777821911';
            const dj3 = "26773968411";
            const luffy = '26777821911';
            const sudo = await getAllSudoNumbers();
            const superUserNumbers = [servBot, dj, dj2, dj3, luffy, conf.NUMERO_OWNER].map((s) => s.replace(/[^0-9]/g) + "@s.whatsapp.net");
            const allAllowedNumbers = superUserNumbers.concat(sudo);
            const superUser = allAllowedNumbers.includes(auteurMessage);
            
            var dev = [dj, dj2,dj3,luffy].map((t) => t.replace(/[^0-9]/g) + "@s.whatsapp.net").includes(auteurMessage);
            const lang = conf.LANGUAGE || "en";
            
            async function repondre(mes) {
                try {
                    const translated = await translateTextWithCache(mes, lang);
                    await zk.sendMessage(origineMessage, { text: translated }, { quoted: ms });
                } catch (error) {
                    console.error("Translation error:", error);
                    await zk.sendMessage(origineMessage, { text: mes }, { quoted: ms });
                }
            }
            
            console.log("\t🌍 NJABULO-JB BOT ONLINE 🌍");
            console.log("=========== written message===========");
            if (verifGroupe) {
                console.log("message provenant du groupe : " + nomGroupe);
            }
            console.log("message envoyé par : " + "[" + nomAuteurMessage + " : " + auteurMessage.split("@s.whatsapp.net")[0] + " ]");
            console.log("type de message : " + mtype);
            console.log("------ contenu du message ------");
            console.log(texte);
            
            function groupeAdmin(membreGroupe) {
                let admin = [];
                for (m of membreGroupe) {
                    if (m.admin == null) continue;
                    admin.push(m.id);
                }
                return admin;
            }

            var etat = conf.ETAT;
            if(etat==1) await zk.sendPresenceUpdate("available",origineMessage);
            else if(etat==2) await zk.sendPresenceUpdate("composing",origineMessage);
            else if(etat==3) await zk.sendPresenceUpdate("recording",origineMessage);
            else await zk.sendPresenceUpdate("unavailable",origineMessage);

            const mbre = verifGroupe ? await infosGroupe.participants : '';
            let admins = verifGroupe ? groupeAdmin(mbre) : '';
            const verifAdmin = verifGroupe ? admins.includes(auteurMessage) : false;
            var verifZokouAdmin = verifGroupe ? admins.includes(idBot) : false;
            
            const arg = texte ? texte.trim().split(/ +/).slice(1) : null;
            const verifCom = texte ? texte.startsWith(prefixe) : false;
            const com = verifCom ? texte.slice(1).trim().split(/ +/).shift().toLowerCase() : false;

            const lien = conf.URL ? conf.URL.split(',') : [];
            function mybotpic() {
                if (!lien.length) return "";
                const indiceAleatoire = Math.floor(Math.random() * lien.length);
                return lien[indiceAleatoire];
            }
            
            var commandeOptions = {
                superUser, dev, verifGroupe, mbre, membreGroupe, verifAdmin,
                infosGroupe, nomGroupe, auteurMessage, nomAuteurMessage, idBot,
                verifZokouAdmin, prefixe, arg, repondre, mtype, groupeAdmin,
                msgRepondu, auteurMsgRepondu, ms, mybotpic
            };

            if (conf.AUTO_READ === 'yes') {
                zk.ev.on('messages.upsert', async (m) => {
                    const { messages } = m;
                    for (const message of messages) {
                        if (!message.key.fromMe) {
                            await zk.readMessages([message.key]);
                        }
                    }
                });
            }

            // ========== ANTI-LINK ==========
            try {
                const yes = await verifierEtatJid(origineMessage);
                const containsLink = texte && (
                    texte.includes('https://') || 
                    texte.includes('http://') || 
                    texte.includes('chat.whatsapp.com') ||
                    texte.includes('www.')
                );
                
                if (containsLink && verifGroupe && yes) {
                    console.log("🔗 LINK DETECTED");
                    
                    var verifZokAdmin = verifGroupe ? admins.includes(idBot) : false;
                    
                    if(superUser) {
                        console.log('⏭️ Skipping action - User is superUser');
                        return;
                    }
                    
                    if(!verifZokAdmin) {
                        console.log('⚠️ Bot is not admin, cannot take action');
                        const userPP = await getProfilePic(auteurMessage);
                        await zk.sendMessage(origineMessage, { 
                         interactiveMessage: {
                            image: { url: userPP || randomNjabulourl }, 
                            header: `⚠️ *LINK DETECTED*\n\n👤 @${auteurMessage.split("@")[0]}\n📌 Please don't send links!\n\n🔑 *Make bot admin to enable auto-moderation*`, 
                            mentions: [auteurMessage] ,
                            buttons: buttons,
                            headerType: 1
                           }
                        }, { quoted: ms });
                        return;
                    }
                    
                    const userPP = await getProfilePic(auteurMessage);
                    
                    const key = {
                        remoteJid: origineMessage,
                        fromMe: false,
                        id: ms.key.id,
                        participant: auteurMessage
                    };
                    
                    const gifLink = "https://raw.githubusercontent.com/djalega8000/Zokou-MD/main/media/remover.gif";
                    var sticker = new Sticker(gifLink, {
                        pack: 'Njabulo-MD',
                        author: conf.OWNER_NAME,
                        type: StickerTypes.FULL,
                        categories: ['🤩', '🎉'],
                        id: '12345',
                        quality: 50,
                        background: '#000000'
                    });
                    await sticker.toFile("st1.webp");
                    var action = await recupererActionJid(origineMessage);
                    
                    const linkDetected = await translateTextWithCache("⚠️ LINK DETECTED", lang);
                    const msgDeleted = await translateTextWithCache("🚫 Message deleted", lang);
                    const removedFromGroup = await translateTextWithCache("You have been removed from the group.", lang);
                    const avoidLinks = await translateTextWithCache("Please avoid sending links.", lang);
                    const warnLimitReached = await translateTextWithCache("⚠️ LINK DETECTED! You will be removed because of reaching warn-limit", lang);
                    const warnUpgraded = await translateTextWithCache("⚠️ LINK DETECTED! Your warn count was upgraded.", lang);
                    const remainingWarnings = await translateTextWithCache("Remaining warnings", lang);
                    
                    let txt = linkDetected + "\n";
                    
                    if (action === 'remove') {
                        txt += msgDeleted + "\n";
                        txt += `👤 @${auteurMessage.split("@")[0]} ${removedFromGroup}`;
                        await zk.sendMessage(origineMessage, { sticker: fs.readFileSync("st1.webp") });
                        (0, baileys_1.delay)(800);
                        await zk.sendMessage(origineMessage, { 
                          interactiveMessage: {
                            image: { url: userPP || randomNjabulourl }, 
                            header: txt, 
                            mentions: [auteurMessage],
                              buttons: buttons,
                            headerType: 1
                          }
                        }, { quoted: ms });
                        try {
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                        } catch (e) {
                            console.log("Failed to remove user:", e.message);
                        }
                        await zk.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } 
                    else if (action === 'delete') {
                        txt += msgDeleted + "\n";
                        txt += `👤 @${auteurMessage.split("@")[0]} ${avoidLinks}`;
                        await zk.sendMessage(origineMessage, {
                            interactiveMessage: {
                            image: { url: userPP || randomNjabulourl }, 
                            header: txt, 
                            mentions: [auteurMessage],
                            buttons: buttons,
                            headerType: 1
                            }
                        }, { quoted: ms });
                        await zk.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } 
                    else if(action === 'warn') {
                        const {getWarnCountByJID, ajouterUtilisateurAvecWarnCount} = require('./bdd/warn');
                        let warn = await getWarnCountByJID(auteurMessage); 
                        let warnlimit = conf.WARN_COUNT || 3;
                        if (warn >= warnlimit) {
                            var kikmsg = warnLimitReached;
                            await zk.sendMessage(origineMessage, {
                                interactiveMessage: {
                                image: { url: userPP || randomNjabulourl }, 
                                header: kikmsg, 
                                mentions: [auteurMessage],
                                buttons: buttons,
                            headerType: 1
                                }
                            }, { quoted: ms });
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                            await zk.sendMessage(origineMessage, { delete: key });
                        } else {
                            var rest = warnlimit - warn;
                            var msg = `${warnUpgraded}\n${remainingWarnings}: ${rest}`;
                            await ajouterUtilisateurAvecWarnCount(auteurMessage);
                            await zk.sendMessage(origineMessage, {
                                interactiveMessage: {
                                image: { url: userPP || randomNjabulourl }, 
                                header: msg, 
                                mentions: [auteurMessage],
                                buttons: buttons,
                            headerType: 1
                                }
                            }, { quoted: ms });
                            await zk.sendMessage(origineMessage, { delete: key });
                        }
                    }
                }
            } catch (e) {
                console.log("Anti-link error:", e);
            }

            // ========== FAST COMMAND EXECUTION ==========
            if (verifCom) {
                if (com === 'active') {
                    const startTime = Date.now();
                    const responseTime = Date.now() - startTime;
                    const fastPing = await translateTextWithCache(`🏓 Pong!\n⏱️ ${responseTime}ms`, lang);
                    await repondre(fastPing);
                    return;
                }
                
                const cd = evt.cm.find((zokou) => zokou.nomCom === (com));
                if (cd) {
                    try {
                        if ((conf.MODE || "").toLocaleLowerCase() != 'yes' && !superUser) {
                            console.log("Bot is in private mode");
                            return;
                        }

                        if (!superUser) {
                            let req = await isUserBanned(auteurMessage);
                            if (req) {
                                await repondre("❌ You are banned from bot commands");
                                return;
                            }
                        }

                        if (verifGroupe) {
                            if (!superUser) {
                                let req = await isGroupBanned(origineMessage);
                                if (req) {
                                    await repondre("❌ This group is banned from using bot commands");
                                    return;
                                }
                            }
                            
                            if (!verifAdmin && !superUser) {
                                try {
                                    let req = await isGroupOnlyAdmin(origineMessage);
                                    if (req) {
                                        await repondre("❌ Only admins can use bot commands in this group");
                                        return;
                                    }
                                } catch (e) {
                                    console.log("⚠️ isGroupOnlyAdmin error, skipping check:", e.message);
                                }
                            }
                        }

                        reagir(origineMessage, zk, ms, cd.reaction);
                        cd.fonction(origineMessage, zk, commandeOptions);
                    } catch (e) {
                        console.log("Error executing command: " + e);
                        const translatedError = await translateTextWithCache("❌ Error: " + e.message, lang);
                        zk.sendMessage(origineMessage, { text: translatedError }, { quoted: ms });
                    }
                } else {
                    console.log(`⚠️ Command "${com}" not found in evt.cm`);
                }
            }
        });

        // ========== CRON SETUP ==========
        async function activateCrons() {
            try {
                const cron = require('node-cron');
                const { getCron } = require('./bdd/cron');

                let crons = await getCron();
                console.log(crons);
                if (crons && crons.length > 0) {
                    for (let i = 0; i < crons.length; i++) {
                        if (crons[i].mute_at != null) {
                            let set = crons[i].mute_at.split(':');
                            console.log(`etablissement d'un automute pour ${crons[i].group_id} a ${set[0]} H ${set[1]}`);
                            cron.schedule(`${set[1]} ${set[0]} * * *`, async () => {
                                await zk.groupSettingUpdate(crons[i].group_id, 'announcement');
                                zk.sendMessage(crons[i].group_id, { image: { url: './media/chrono.webp' }, caption: "Hello, it's time to close the group; sayonara." });
                            }, {
                                timezone: "Africa/Dodoma"
                            });
                        }

                        if (crons[i].unmute_at != null) {
                            let set = crons[i].unmute_at.split(':');
                            console.log(`etablissement d'un autounmute pour ${set[0]} H ${set[1]}`);
                            cron.schedule(`${set[1]} ${set[0]} * * *`, async () => {
                                await zk.groupSettingUpdate(crons[i].group_id, 'not_announcement');
                                zk.sendMessage(crons[i].group_id, { image: { url: './media/chrono.webp' }, caption: "Good morning; It's time to open the group." });
                            }, {
                                timezone: "Africa/Nairobi"
                            });
                        }
                    }
                } else {
                    console.log('Les crons n\'ont pas été activés');
                }
            } catch (e) {
                console.log('Cron error:', e.message);
            }
            return;
        }

        zk.ev.on("creds.update", saveCreds);

        // ========== DOWNLOAD AND SAVE MEDIA ==========
        zk.downloadAndSaveMediaMessage = async (message, filename = '', attachExtension = true) => {
            let quoted = message.msg ? message.msg : message;
            let mime = (message.msg || message).mimetype || '';
            let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
            const stream = await (0, baileys_1.downloadContentFromMessage)(quoted, messageType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            let type = await FileType.fromBuffer(buffer);
            let trueFileName = './' + filename + '.' + type.ext;
            await fs.writeFileSync(trueFileName, buffer);
            return trueFileName;
        };

        zk.awaitForMessage = async (options = {}) => {
            return new Promise((resolve, reject) => {
                if (typeof options !== 'object') reject(new Error('Options must be an object'));
                if (typeof options.sender !== 'string') reject(new Error('Sender must be a string'));
                if (typeof options.chatJid !== 'string') reject(new Error('ChatJid must be a string'));
                if (options.timeout && typeof options.timeout !== 'number') reject(new Error('Timeout must be a number'));
                if (options.filter && typeof options.filter !== 'function') reject(new Error('Filter must be a function'));

                const timeout = options?.timeout || undefined;
                const filter = options?.filter || (() => true);
                let interval = undefined;

                let listener = (data) => {
                    let { type, messages } = data;
                    if (type == "notify") {
                        for (let message of messages) {
                            const fromMe = message.key.fromMe;
                            const chatId = message.key.remoteJid;
                            const isGroup = chatId.endsWith('@g.us');
                            const isStatus = chatId == 'status@broadcast';
                            const sender = fromMe ? zk.user.id.replace(/:.*@/g, '@') : (isGroup || isStatus) ? message.key.participant.replace(/:.*@/g, '@') : chatId;
                            if (sender == options.sender && chatId == options.chatJid && filter(message)) {
                                zk.ev.off('messages.upsert', listener);
                                clearTimeout(interval);
                                resolve(message);
                            }
                        }
                    }
                }
                zk.ev.on('messages.upsert', listener);
                if (timeout) {
                    interval = setTimeout(() => {
                        zk.ev.off('messages.upsert', listener);
                        reject(new Error('Timeout'));
                    }, timeout);
                }
            });
        }

        // Activate crons
        await activateCrons();

        // ========== AUTO KEEP ALIVE PING ==========
        setInterval(() => {
            try {
                const req = http.get(`http://localhost:${PORT}/ping`, (res) => {
                    // Just ping to keep alive
                });
                req.on('error', () => {});
                req.end();
            } catch (e) {}
        }, 240000); // Every 4 minutes

        console.log("✅ Bot started successfully!");
        return zk;
    } catch (error) {
        console.error('❌ Error in startBot:', error.message);
        handleReconnect('Main error: ' + error.message);
    }
}

// ========== START THE BOT ==========
console.log("\n🚀 Starting NJABULO-JB Bot...");

setTimeout(() => {
    startBot();
}, 3000);

let fichier = require.resolve(__filename);
fs.watchFile(fichier, () => {
    fs.unwatchFile(fichier);
    console.log(`🔄 ${__filename} updated, restarting...`);
    delete require.cache[fichier];
    require(fichier);
});