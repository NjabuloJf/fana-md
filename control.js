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
const {isGroupOnlyAdmin,addGroupToOnlyAdminList,removeGroupFromOnlyAdminList} = require("./bdd/onlyAdmin");
let { reagir } = require(__dirname + "/njabulo/app");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// ========== WEB SERVER FOR KEEP-ALIVE ==========
const http = require('http');

// Create a simple web server for Heroku
const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            time: new Date().toISOString(),
            uptime: process.uptime(),
            bot: 'NJABULO-JB'
        }));
    } else if (req.url === '/ping') {
        res.writeHead(200);
        res.end('Pong!');
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// Get port from environment
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ Web server running on port ${PORT}`);
});

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

// ========== TRANSLATION CACHE ==========
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
    en: "English",
    sn: "Shona",
    nd: "Ndebele",
    af: "Afrikaans",
    zu: "Zulu",
    xh: "Xhosa",
    pt: "Portuguese",
    sw: "Swahili",
    hi: "Hindi",
    ar: "Arabic",
    fr: "French",
    es: "Spanish",
    zh: "Chinese",
    de: "German",
    it: "Italian",
    ja: "Japanese",
    ko: "Korean",
    ru: "Russian"
};

// ========== TRANSLATED WELCOME FUNCTION ==========
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

// ========== GET TRANSLATED BUTTONS ==========
async function getTranslatedButtons(lang) {
    const buttonText = await translateTextWithCache("🌐 WA Channel", lang);
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

// ========== GET NAME FROM JID ==========
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

console.log("✅ Using Baileys from github:xhclintohn/Baileys");

// ========== SESSION HANDLER ==========
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
                try {
                    const sessionJson = atob(base64Session);
                    const sessionData = JSON.parse(sessionJson);
                    fs.writeFileSync(credsPath, JSON.stringify(sessionData, null, 2));
                    console.log("✅ Session loaded via atob successfully!");
                    return;
                } catch (err2) {
                    console.log("❌ Alternative decode failed:", err2.message);
                }
            }
        }
        
        if (sessionId.includes('mega') || sessionId.includes('#') || sessionId.length > 100) {
            console.log("📁 Attempting to download session from Mega.nz...");
            
            try {
                let megaFileId = sessionId;
                
                if (megaFileId.includes('njabulo-jb~')) {
                    megaFileId = megaFileId.replace('njabulo-jb~', '');
                }
                if (megaFileId.includes('mega.nz')) {
                    const megaMatch = megaFileId.match(/#!([a-zA-Z0-9_-]+)/);
                    if (megaMatch) {
                        megaFileId = megaMatch[1];
                    }
                }
                
                console.log("📁 Mega file ID:", megaFileId);
                
                const file = File.fromURL(`https://mega.nz/file/${megaFileId}`);
                
                file.download((err, data) => {
                    if (err) {
                        console.log("❌ Mega.nz download error:", err.message);
                        return;
                    }
                    if (data) {
                        fs.writeFileSync(credsPath, data);
                        console.log("✅ Session downloaded from Mega.nz successfully!");
                    }
                });
                
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                if (fs.existsSync(credsPath) && fs.statSync(credsPath).size > 100) {
                    console.log("✅ Mega.nz session file saved!");
                    return;
                }
            } catch (err) {
                console.log("❌ Mega.nz download error:", err.message);
            }
        }
        
        try {
            const decoded = Buffer.from(sessionId, 'base64').toString('utf-8');
            if (decoded.includes('creds') || decoded.includes('noiseKey')) {
                const sessionData = JSON.parse(decoded);
                fs.writeFileSync(credsPath, JSON.stringify(sessionData, null, 2));
                console.log("✅ Session loaded from plain Base64!");
                return;
            }
        } catch (e) {}
        
        console.log("📱 No valid session format detected, will generate new QR code");
        
    } catch (error) {
        console.log("❌ Session loading error:", error.message);
    }
}

loadSession();

// ========== FIX: Handle undefined session ==========
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

// ========== STORE POLYFILL ==========
const store = {
    chats: new Map(),
    contacts: new Map(),
    messages: new Map(),
    bind: function(ev) { 
        console.log("Store bound");
    },
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

// ========== BUTTON HANDLER ==========
const { handleButtons } = require("./commands/play0");

// ========== RATE LIMITING & SPEED OPTIMIZATION ==========
const userCooldowns = new Map();
const RATE_LIMIT_MS = 1000; // 1 second cooldown

function isRateLimited(jid) {
    const now = Date.now();
    const cooldown = userCooldowns.get(jid) || 0;
    if (now - cooldown < RATE_LIMIT_MS) {
        return true;
    }
    userCooldowns.set(jid, now);
    return false;
}

// Queue for processing messages
const processingQueue = [];
let isProcessingQueue = false;
const userLastProcessed = new Map();

async function processMessageQueue() {
    if (isProcessingQueue || processingQueue.length === 0) return;
    isProcessingQueue = true;

    while (processingQueue.length > 0) {
        const { from, message } = processingQueue.shift();
        const now = Date.now();
        const lastProcessed = userLastProcessed.get(from) || 0;

        if (now - lastProcessed < 1000) {
            const delay = 1000 - (now - lastProcessed);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        userLastProcessed.set(from, Date.now());

        try {
            await processSingleMessage(from, message);
        } catch (error) {
            console.error('Error processing message:', error);
        }
    }

    isProcessingQueue = false;
}

async function processSingleMessage(from, message) {
    console.log(`Processing message from ${from}`);
}

setTimeout(() => {
    async function main() {
        const { version, isLatest } = await (0, baileys_1.fetchLatestBaileysVersion)();
        const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(sessionDir);
        
        const sockOptions = {
            version,
            logger: pino({ level: "silent" }),
            browser: ['NJABULO-MD', "Chrome", "1.0.0"],
            printQRInTerminal: true,
            fireInitQueries: false,
            markOnlineOnConnect: false,
            keepAliveIntervalMs: 30_000,
            auth: {
                creds: state.creds,
                keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, logger),
            },
            getMessage: async (key) => {
                if (store) {
                    const msg = await store.loadMessage(key.remoteJid, key.id);
                    return msg?.message || undefined;
                }
                return {
                    conversation: 'An Error Occurred, Repeat Command!'
                };
            }
        };
        const zk = (0, baileys_1.default)(sockOptions);
        store.bind(zk.ev);

// ========== IMAGE URLS (Reliable GitHub URLs) ==========
const njabulox = [
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png"
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ========== WELCOME & GOODBYE WITH IMAGE ==========
const { recupevents } = require('./bdd/welcome');

async function getProfilePic(jid) {
    try {
        const pp = await zk.profilePictureUrl(jid, 'image');
        return pp;
    } catch {
        return randomNjabulourl;
    }
}

zk.ev.on('group-participants.update', async (group) => {
    console.log('Group update detected:', group);

    const lang = conf.LANGUAGE || "en";
    
    // Get translated buttons
    const buttons = await getTranslatedButtons(lang);

    try {
        const metadata = await zk.groupMetadata(group.id);
        const groupName = metadata.subject;
        const participantCount = metadata.participants.length;
        const currentTime = new Date();
        const joinTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const joinDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // ========== WELCOME ==========
        if (group.action === 'add' && (await recupevents(group.id, "welcome") === 'on')) {
            const translated = await getTranslatedWelcome(lang);
            let membres = group.participants;
            
            for (let membre of membres) {
                try {
                    const memberJid = membre.phoneNumber || membre.id;
                    if (!memberJid) continue;
                    
                    const memberName = await getName(memberJid);
                    const memberPP = await getProfilePic(memberJid);
                    
                    const msg = `╭━━━━━━━━━━━━━━━━━━━━━━╮
┃     ${translated.welcomeTitle}
┃
┃ ${translated.welcomeHey} *${memberName}*!
┃
┃ 📱 *Number:* ${memberJid.split("@")[0]}
┃ 📱 *Group:* ${groupName}
┃ 👥 *Members:* ${participantCount}
┃
┃ 🕐 *Joined at:* ${joinTime}
┃ 📅 *Date:* ${joinDate}
┃
┃ ${translated.welcomeRules}
┃
┃ ${translated.welcomeEnjoy}
╰━━━━━━━━━━━━━━━━━━━━━━╯`;

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
        
        // ========== GOODBYE ==========
        if (group.action === 'remove' && (await recupevents(group.id, "goodbye") === 'on')) {
            const translated = await getTranslatedGoodbye(lang);
            let membres = group.participants;
            
            for (let membre of membres) {
                try {
                    const memberJid = membre.phoneNumber || membre.id;
                    if (!memberJid) continue;
                    
                    const memberName = await getName(memberJid);
                    const memberPP = await getProfilePic(memberJid);
                    
                    const msg = `╭━━━━━━━━━━━━━━━━━━━━━━╮
┃        ${translated.goodbyeTitle}
┃
┃ 😢 *${memberName}* ${translated.goodbyeLeft}
┃
┃ 📱 *Number:* ${memberJid.split("@")[0]}
┃ 📱 *Group:* ${groupName}
┃ 👥 ${translated.goodbyeRemaining}: ${participantCount - 1}
┃
┃ 🕐 *Left at:* ${joinTime}
┃ 📅 *Date:* ${joinDate}
┃
┃ ${translated.goodbyeLeft}
╰━━━━━━━━━━━━━━━━━━━━━━╯`;

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

    } catch (e) {
        console.error("Group update error:", e.message);
    }
});

        // ========== BUTTONS RESPONSE HANDLER ==========
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

        // ========== ANTI-DELETE ==========
        zk.ev.on("messages.upsert", async (m) => {
            if (conf.ANTIDELETE1 === "yes") {
                const { messages } = m;
                const ms = messages[0];
                if (!ms.message) return;

                const messageKey = ms.key;
                const remoteJid = messageKey.remoteJid;

                if (!store.chats) store.chats = {};
                if (!store.chats[remoteJid]) {
                    store.chats[remoteJid] = [];
                }

                store.chats[remoteJid].push(ms);

                if (ms.message.protocolMessage && ms.message.protocolMessage.type === 0) {
                    const deletedKey = ms.message.protocolMessage.key;
                    const chatMessages = store.chats[remoteJid];
                    const deletedMessage = chatMessages.find(
                        (msg) => msg.key.id === deletedKey.id
                    );

                    if (deletedMessage) {
                        try {
                            const participant = deletedMessage.key.participant || deletedMessage.key.remoteJid;
                            const notification = `*🛑 This message was deleted by @${participant.split("@")[0]}*`;
                            const botOwnerJid = `${conf.NUMERO_OWNER}@s.whatsapp.net`;

                            if (deletedMessage.message.conversation) {
                                await zk.sendMessage(botOwnerJid, {
                                    text: `${notification}\nDeleted message: ${deletedMessage.message.conversation}`,
                                    mentions: [participant],
                                });
                            }
                            else if (deletedMessage.message.imageMessage) {
                                const caption = deletedMessage.message.imageMessage.caption || '';
                                const imagePath = await zk.downloadAndSaveMediaMessage(deletedMessage.message.imageMessage);
                                await zk.sendMessage(botOwnerJid, {
                                    image: { url: imagePath },
                                    caption: `${notification}\n${caption}`,
                                    mentions: [participant],
                                });
                            }
                            else if (deletedMessage.message.videoMessage) {
                                const caption = deletedMessage.message.videoMessage.caption || '';
                                const videoPath = await zk.downloadAndSaveMediaMessage(deletedMessage.message.videoMessage);
                                await zk.sendMessage(botOwnerJid, {
                                    video: { url: videoPath },
                                    caption: `${notification}\n${caption}`,
                                    mentions: [participant],
                                });
                            }
                            else if (deletedMessage.message.audioMessage) {
                                const audioPath = await zk.downloadAndSaveMediaMessage(deletedMessage.message.audioMessage);
                                await zk.sendMessage(botOwnerJid, {
                                    audio: { url: audioPath },
                                    ptt: true,
                                    caption: notification,
                                    mentions: [participant],
                                });
                            }
                            else if (deletedMessage.message.stickerMessage) {
                                const stickerPath = await zk.downloadAndSaveMediaMessage(deletedMessage.message.stickerMessage);
                                await zk.sendMessage(botOwnerJid, {
                                    sticker: { url: stickerPath },
                                    caption: notification,
                                    mentions: [participant],
                                });
                            }
                        } catch (error) {
                            console.error('Error handling deleted message:', error);
                        }
                    }
                }
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

                        const adams = zk.user && zk.user.id ? zk.user.id.split(":")[0] + "@s.whatsapp.net" : null;
                        if (!adams) {
                            console.log("Bot's user ID not available. Skipping reaction.");
                            continue;
                        }

                        await zk.sendMessage(message.key.remoteJid, {
                            react: {
                                key: message.key,
                                text: "💙",
                            },
                        }, {
                            statusJidList: [message.key.participant, adams],
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

// ========== GET CURRENT DATE AND TIME ==========
function getCurrentDateTime() {
    const options = {
        timeZone: 'Africa/Nairobi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    };
    const dateTime = new Intl.DateTimeFormat('en-KE', options).format(new Date());
    return dateTime;
}

// ========== TRACK CONNECTION STATUS ==========
let isConnected = false;

// ========== AUTO BIO UPDATE WITH CONNECTION CHECK ==========
zk.ev.on("connection.update", async (con) => {
    const { connection } = con;
    if (connection === 'open') {
        isConnected = true;
        console.log("✅ Bot is connected!");
    } else if (connection === 'close') {
        isConnected = false;
        console.log("❌ Bot disconnected!");
    }
});

setInterval(async () => {
    if (conf.AUTO_BIO === "yes" && isConnected) {
        try {
            const currentDateTime = getCurrentDateTime();
            const bioText = `NJABULO-JB is online! 🚀\n${currentDateTime}`;
            await zk.updateProfileStatus(bioText);
            console.log(`Updated Bio: ${bioText}`);
        } catch (error) {
            console.log('Bio update error:', error.message);
        }
    }
}, 60000);

// ========== ANTI-CALL ==========
zk.ev.on("call", async (callData) => {
  if (conf.ANTICALL === 'yes') {
    const callId = callData[0].id;
    const callerId = callData[0].from;

    await zk.rejectCall(callId, callerId);

    setTimeout(async () => {
      await zk.sendMessage(callerId, {
        text: `🚫 *Call Rejected!*  
Hi there, I'm *NJABULO-JB* 🤖.  
⚠️ My owner is unavailable at the moment.  
Please try again later or leave a message. Cheers! 😊`
      });
    }, 1000);
  }
});

        // ========== COMMAND HANDLER ==========
        zk.ev.on("messages.upsert", async (m) => {
            const { messages } = m;
            const ms = messages[0];
            if (!ms.message) return;
            
            // ========== RATE LIMITING ==========
            const sender = ms.key.remoteJid;
            if (isRateLimited(sender)) {
                return; // Skip if rate limited
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
            const dj = '254710772666';
            const dj2 = '254710772666';
            const dj3 = "254710772666";
            const luffy = '254710772666';
            const sudo = await getAllSudoNumbers();
            const superUserNumbers = [servBot, dj, dj2, dj3, luffy, conf.NUMERO_OWNER].map((s) => s.replace(/[^0-9]/g) + "@s.whatsapp.net");
            const allAllowedNumbers = superUserNumbers.concat(sudo);
            const superUser = allAllowedNumbers.includes(auteurMessage);
            
            var dev = [dj, dj2,dj3,luffy].map((t) => t.replace(/[^0-9]/g) + "@s.whatsapp.net").includes(auteurMessage);
            const lang = conf.LANGUAGE || "en";
            
            // ========== FAST REPONDRE ==========
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

            // Auto read messages
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

            // ========== AUTO-STATUS ==========
            if (ms.key && ms.key.remoteJid === "status@broadcast" && conf.AUTO_READ_STATUS === "yes") {
                await zk.readMessages([ms.key]);
            }
            if (ms.key && ms.key.remoteJid === 'status@broadcast' && conf.AUTO_DOWNLOAD_STATUS === "yes") {
                if (ms.message.extendedTextMessage) {
                    var stTxt = ms.message.extendedTextMessage.text;
                    await zk.sendMessage(idBot, { text: stTxt }, { quoted: ms });
                }
                else if (ms.message.imageMessage) {
                    var stMsg = ms.message.imageMessage.caption;
                    var stImg = await zk.downloadAndSaveMediaMessage(ms.message.imageMessage);
                    await zk.sendMessage(idBot, { image: { url: stImg }, caption: stMsg }, { quoted: ms });
                }
                else if (ms.message.videoMessage) {
                    var stMsg = ms.message.videoMessage.caption;
                    var stVideo = await zk.downloadAndSaveMediaMessage(ms.message.videoMessage);
                    await zk.sendMessage(idBot, { video: { url: stVideo }, caption: stMsg }, { quoted: ms });
                }
            }

            // ========== FAST ANTI-LINK ==========
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
                            image: { url: userPP || randomNjabulourl }, 
                            caption: `⚠️ *LINK DETECTED*\n\n👤 @${auteurMessage.split("@")[0]}\n📌 Please don't send links!\n\n🔑 *Make bot admin to enable auto-moderation*`, 
                            mentions: [auteurMessage] 
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
                            image: { url: userPP || randomNjabulourl }, 
                            caption: txt, 
                            mentions: [auteurMessage] 
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
                            image: { url: userPP || randomNjabulourl }, 
                            caption: txt, 
                            mentions: [auteurMessage] 
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
                                image: { url: userPP || randomNjabulourl }, 
                                caption: kikmsg, 
                                mentions: [auteurMessage] 
                            }, { quoted: ms });
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                            await zk.sendMessage(origineMessage, { delete: key });
                        } else {
                            var rest = warnlimit - warn;
                            var msg = `${warnUpgraded}\n${remainingWarnings}: ${rest}`;
                            await ajouterUtilisateurAvecWarnCount(auteurMessage);
                            await zk.sendMessage(origineMessage, { 
                                image: { url: userPP || randomNjabulourl }, 
                                caption: msg, 
                                mentions: [auteurMessage] 
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
                // ========== FAST PING ==========
                if (com === 'ping') {
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
                                let req = await isGroupOnlyAdmin(origineMessage);
                                if (req) {
                                    await repondre("❌ Only admins can use bot commands in this group");
                                    return;
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

        // ========== CONNECTION UPDATE ==========
        zk.ev.on("connection.update", async (con) => {
            const { lastDisconnect, connection } = con;
            if (connection === "connecting") {
                console.log("ℹ️ Njabulo-Jb is connecting...");
            }
            else if (connection === 'open') {
                console.log("✅ Njabulo-Jb Connected to WhatsApp! ☺️");
                console.log("--");
                await (0, baileys_1.delay)(200);
                console.log("------");
                await (0, baileys_1.delay)(300);
                console.log("------------------/-----");
                console.log("Njabulo-Jb is Online 🕸\n\n");
                console.log("Loading Commands ...\n");
                
                try {
                    fs.readdirSync(__dirname + "/commandes").forEach((fichier) => {
                        if (path.extname(fichier).toLowerCase() == (".js")) {
                            try {
                                require(__dirname + "/commandes/" + fichier);
                                console.log(fichier + " Installed Successfully✔️");
                            } catch (e) {
                                console.log(`${fichier} could not be installed due to: ${e}`);
                            }
                            (0, baileys_1.delay)(300);
                        }
                    });
                } catch (e) {
                    console.log('No command folder found');
                }
                
                await (0, baileys_1.delay)(700);
                var md;
                if ((conf.MODE || "").toLocaleLowerCase() === "yes") {
                    md = "public";
                } else if ((conf.MODE || "").toLocaleLowerCase() === "no") {
                    md = "private";
                } else {
                    md = "undefined";
                }
                console.log("Commands Installation Completed ✅");

                await activateCrons();
                
                const currentLang = conf.LANGUAGE || "en";
                const langName = languageNames[currentLang] || "English";
                
                // Get translated buttons for startup
                const startupButtons = await getTranslatedButtons(currentLang);
                
                if((conf.DP || "").toLowerCase() === 'yes') {
                    try {
                        const startupText = `╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   📊 *NJABULO-JB BOT ONLINE*
┃
┃ ✅ *Bot:* WhatsApp Bot Connected
┃ 📌 *Prefix:* ${prefixe}
┃ 📅 *Date:* ${new Date().toLocaleDateString()}
┃ 🕐 *Time:* ${new Date().toLocaleTimeString()}
┃ 📊 *Mode:* ${md}
┃ 🌍 *Language:* ${langName}
┃ 👤 *Owner:* Njabulo JB
┃
┃ 💡 *Commands:* Use .menu
┃ 📢 *Channel:* ${conf.GURL || "Available"}
╰━━━━━━━━━━━━━━━━━━━━━━╯`;

                        // Send with buttons
                        await zk.sendMessage(zk.user.id, { 
                            interactiveMessage: {
                                header: startupText,
                                buttons: startupButtons,
                                headerType: 1
                            }
                        });
                        console.log("✅ Startup message sent to bot DM");
                    } catch (e) {
                        console.log("❌ Failed to send startup message:", e.message);
                    }
                }
            }
            else if (connection == "close") {
                let raisonDeconnexion = new boom_1.Boom(lastDisconnect?.error)?.output.statusCode;
                if (raisonDeconnexion === baileys_1.DisconnectReason.badSession) {
                    console.log('Session id error, rescan again...');
                } else if (raisonDeconnexion === baileys_1.DisconnectReason.connectionClosed || 
                           raisonDeconnexion === baileys_1.DisconnectReason.connectionLost) {
                    console.log('Connection lost, reconnecting...');
                    main();
                } else if (raisonDeconnexion === baileys_1.DisconnectReason.restartRequired) {
                    console.log('Restarting...');
                    main();
                } else if (raisonDeconnexion === baileys_1.DisconnectReason.loggedOut) {
                    console.log('Logged out, please rescan QR');
                } else {
                    console.log('Restarting due to error...');
                    const {exec}=require("child_process");
                    exec("pm2 restart all");
                }
                main();
            }
        });

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

        return zk;
    }
    let fichier = require.resolve(__filename);
    fs.watchFile(fichier, () => {
        fs.unwatchFile(fichier);
        console.log(`mise à jour ${__filename}`);
        delete require.cache[fichier];
        require(fichier);
    });
    main();
}, 5000);