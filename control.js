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

// ========== IMPORT GITHUB BAILEYS ==========
const baileysOriginal = require("@whiskeysockets/baileys");
const logger_1 = require("@whiskeysockets/baileys/lib/Utils/logger");
const logger = logger_1.default.child({});
logger.level = 'silent';
const pino = require("pino");
const boom_1 = require("@hapi/boom");

console.log("✅ Using Baileys from github:xhclintohn/Baileys");

// ========== CREATE WRAPPER ==========
const baileys_1 = { ...baileysOriginal };

// Add polyfill to wrapper
if (!baileys_1.makeInMemoryStore) {
    console.log("⚠️ makeInMemoryStore not found, adding polyfill to wrapper...");
    baileys_1.makeInMemoryStore = function(options) {
        console.log("Using polyfilled store");
        return {
            chats: new Map(),
            contacts: new Map(),
            messages: new Map(),
            bind: function(ev) { console.log("Store bound"); },
            writeToFile: function(filename) {
                try {
                    const fs = require('fs-extra');
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
    };
    console.log("✅ Polyfill added to wrapper");
}
// ========== END OF WRAPPER ==========

const conf = require("./set");
const axios = require("axios");
let fs = require("fs-extra");
let path = require("path");
const FileType = require('file-type');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

const { verifierEtatJid, recupererActionJid } = require("./bdd/antilien");
const { atbverifierEtatJid, atbrecupererActionJid } = require("./bdd/antibot");
let evt = require(__dirname + "/njabulo/fana");
const { isUserBanned } = require("./bdd/banUser");
const { isGroupBanned } = require("./bdd/banGroup");
const { isGroupOnlyAdmin } = require("./bdd/onlyAdmin");
let { reagir } = require(__dirname + "/njabulo/app");

// ========== GOOGLE TRANSLATE API WITH FALLBACK ==========
let translateText = async (text, targetLang) => {
    try {
        if (!targetLang || targetLang === 'en') return text;
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

// ========== CACHE FOR TRANSLATIONS ==========
const translationCache = new Map();

let translateTextWithCache = async (text, targetLang) => {
    if (!targetLang || targetLang === 'en') return text;
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

// ========== FIX: Handle undefined session ==========
var session = (conf.session || '').replace(/Zokou-MD-WHATSAPP-BOT;;;=>/g,"");
const prefixe = conf.PREFIXE || ".";
const more = String.fromCharCode(8206)
const readmore = more.repeat(4001)

// ========== BUTTON HANDLER ==========
let handleButtons = async (zk, msg) => {
    console.log("Button handler triggered");
    try {
        if (msg.message?.buttonsResponseMessage) {
            const buttonId = msg.message.buttonsResponseMessage.selectedButtonId;
            const from = msg.key.remoteJid;
            console.log(`Button clicked: ${buttonId}`);
        }
    } catch (error) {
        console.error("Button handler error:", error);
    }
};

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

const store = baileys_1.makeInMemoryStore({
    logger: pino().child({ level: "silent", stream: "store" }),
});

// ========== LANGUAGE HELPER ==========
const getLang = () => conf.LANGUAGE || "en";

// ========== TRANSLATE MESSAGE FUNCTION ==========
const messageTemplates = {
    welcome: "🎉 *WELCOME TO THE GROUP!*",
    welcome_hello: "👋 *Hello*",
    welcome_rules: "📜 *Rules:* No spam, No NSFW, Respect members",
    welcome_enjoy: "💫 *Enjoy your stay!*",
    goodbye: "👋 *GOODBYE*",
    goodbye_left: "😢 *has left the group*",
    goodbye_remaining: "👥 *Remaining:*",
    goodbye_missed: "💫 *You will be missed!*",
    link_detected: "⚠️ *LINK DETECTED* ⚠️",
    link_warning: "Please don't send links in this group!",
    link_deleted: "🚫 *Message deleted*",
    link_removed: "🚫 *removed from group*",
    link_warn: "⚠️ *LINK DETECTED!*",
    link_warn_count: "You have received a warning!",
    link_warn_remaining: "Remaining warnings before removal:",
    bot_detected: "🤖 *BOT DETECTED* 🤖",
    bot_removed: "🚫 removed from group.",
    bot_deleted: "🚫 Bot message deleted",
    members: "👥 *Members:*",
    group: "📱 *Group:*",
    date: "📅 *Date:*",
    joined_at: "🎉 *Joined at:*",
    left_at: "🕐 *Left at:*"
};

async function translateMessage(key, lang) {
    const text = messageTemplates[key] || key;
    if (lang === 'en') return text;
    try {
        return await translateTextWithCache(text, lang);
    } catch {
        return text;
    }
}

setTimeout(() => {
    async function main() {
        const { version, isLatest } = await baileys_1.fetchLatestBaileysVersion();
        const { state, saveCreds } = await baileys_1.useMultiFileAuthState(sessionDir);
        
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
                keys: baileys_1.makeCacheableSignalKeyStore(state.keys, logger),
            },
            getMessage: async (key) => {
                if (store) {
                    const msg = await store.loadMessage(key.remoteJid, key.id);
                    return msg?.message || undefined;
                }
                return { conversation: 'An Error Occurred, Repeat Command!' };
            }
        };
        
        const zk = baileys_1.default(sockOptions);
        store.bind(zk.ev);

        const njabulox = [
            "https://files.catbox.moe/iii5jv.jpg",
            "https://files.catbox.moe/xjeyjh.jpg",
            "https://files.catbox.moe/mh36c7.jpg",
            "https://files.catbox.moe/u6v5ir.jpg",
            "https://files.catbox.moe/bnb3vx.jpg"
        ];
        const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

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

        zk.ev.on("messages.upsert", async (m) => {
            const { messages } = m;
            const ms = messages[0];
            if (!ms.message) return;
            
            const mtype = baileys_1.getContentType(ms.message);
            
            if (mtype === "reactionMessage") return;
            if (mtype === "protocolMessage") {
                console.log("⏭️ Skipping protocol message");
                return;
            }
            
            const decodeJid = (jid) => {
                if (!jid) return jid;
                if (/:\d+@/gi.test(jid)) {
                    let decode = baileys_1.jidDecode(jid) || {};
                    return decode.user && decode.server && decode.user + '@' + decode.server || jid;
                }
                return jid;
            };
            
            var texte = mtype == "conversation" ? ms.message.conversation : 
                        mtype == "imageMessage" ? ms.message.imageMessage?.caption : 
                        mtype == "videoMessage" ? ms.message.videoMessage?.caption : 
                        mtype == "extendedTextMessage" ? ms.message?.extendedTextMessage?.text : 
                        mtype == "buttonsResponseMessage" ? ms?.message?.buttonsResponseMessage?.selectedButtonId : 
                        mtype == "listResponseMessage" ? ms.message?.listResponseMessage?.singleSelectReply?.selectedRowId : "";
            
            if (!texte) {
                console.log("⏭️ Skipping empty message");
                return;
            }
            
            var origineMessage = ms.key.remoteJid;
            var idBot = decodeJid(zk.user.id);
            var servBot = idBot.split('@')[0];
            
            const verifGroupe = origineMessage?.endsWith("@g.us");
            var infosGroupe = verifGroupe ? await zk.groupMetadata(origineMessage) : "";
            var nomGroupe = verifGroupe ? infosGroupe.subject : "";
            var msgRepondu = ms.message.extendedTextMessage?.contextInfo?.quotedMessage;
            var auteurMsgRepondu = decodeJid(ms.message?.extendedTextMessage?.contextInfo?.participant);
            
            // ========== FIX: CORRECTLY GET THE SENDER FOR DMS ==========
            var auteurMessage;
            if (verifGroupe) {
                // In groups, get the participant
                auteurMessage = ms.key.participant ? ms.key.participant : ms.participant;
            } else {
                // In DMs, the sender is the person who sent the message
                // If it's from the bot itself (fromMe), use the bot's ID
                if (ms.key.fromMe) {
                    auteurMessage = idBot;
                } else {
                    // For DMs, the sender is the remoteJid (the person messaging the bot)
                    auteurMessage = origineMessage;
                }
            }
            
            // Fallback: if auteurMessage is still undefined or invalid
            if (!auteurMessage || auteurMessage === 'undefined') {
                auteurMessage = ms.key.participant || ms.participant || origineMessage;
            }

            var membreGroupe = verifGroupe ? ms.key.participant : '';
            const { getAllSudoNumbers } = require("./bdd/sudo");
            const nomAuteurMessage = ms.pushName || "Unknown";
            const sudo = await getAllSudoNumbers();
            const superUserNumbers = [servBot, conf.NUMERO_OWNER].map((s) => s.replace(/[^0-9]/g) + "@s.whatsapp.net");
            const allAllowedNumbers = superUserNumbers.concat(sudo);
            const superUser = allAllowedNumbers.includes(auteurMessage);
            var dev = [conf.NUMERO_OWNER].map((t) => t.replace(/[^0-9]/g) + "@s.whatsapp.net").includes(auteurMessage);
            
            const lang = getLang();
            
            // ========== REPONDRE FUNCTION ==========
            async function repondre(mes) {
                try {
                    const translated = await translateTextWithCache(mes, lang);
                    await zk.sendMessage(origineMessage, { text: translated }, { quoted: ms });
                } catch (error) {
                    console.error("Translation error in repondre:", error);
                    await zk.sendMessage(origineMessage, { text: mes }, { quoted: ms });
                }
            }
            
            // ========== HELPER TO GET PROFILE PIC ==========
            async function getUserProfilePic(jid) {
                try {
                    const pp = await zk.profilePictureUrl(jid, 'image');
                    return pp;
                } catch {
                    return randomNjabulourl;
                }
            }
            
            console.log("\tNJABULO MD ONLINE");
            console.log("=========== written message===========");
            if (verifGroupe) console.log("message provenant du groupe : " + nomGroupe);
            console.log("message envoyé par : " + "[" + nomAuteurMessage + " : " + (auteurMessage ? auteurMessage.split("@s.whatsapp.net")[0] : "Unknown") + " ]");
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

            // ========== ANTI-DELETE ==========
            if(ms.message.protocolMessage && ms.message.protocolMessage.type === 0 && (conf.ADM || "").toLowerCase() === 'yes') {
                if(ms.key.fromMe || ms.message.protocolMessage.key.fromMe) { 
                    console.log('Message supprimer me concernant'); 
                    return; 
                }
                console.log(`Message supprimer`);
                let key = ms.message.protocolMessage.key;
                try {
                    let st = './store.json';
                    if (fs.existsSync(st)) {
                        const data = fs.readFileSync(st, 'utf8');
                        const jsonData = JSON.parse(data);
                        let message = jsonData.messages?.[key.remoteJid];
                        let msg;
                        if (message) {
                            for (let i = 0; i < message.length; i++) {
                                if (message[i].key.id === key.id) {
                                    msg = message[i];
                                    break;
                                }
                            }
                        }
                        if(msg && msg !== 'undefined') {
                            await zk.sendMessage(idBot, { 
                                image: { url: './media/deleted-message.jpg' },
                                caption: `😈Anti-delete-message😈\n Message from @${msg.key.participant?.split('@')[0]}`,
                                mentions: [msg.key.participant]
                            });
                            await zk.sendMessage(idBot, { forward: msg });
                        }
                    }
                } catch (e) {
                    console.log(e);
                }
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

            // ========== ANTI-LINK ==========
            try {
                const yes = await verifierEtatJid(origineMessage);
                if (texte && (texte.includes('https://') || texte.includes('http://') || texte.includes('chat.whatsapp.com')) && verifGroupe && yes) {
                    console.log("🔗 LINK DETECTED");
                    
                    var verifZokAdmin = verifGroupe ? admins.includes(idBot) : false;
                    console.log(`Bot is admin: ${verifZokAdmin}`);
                    console.log(`User is admin: ${verifAdmin}`);
                    console.log(`User is superUser: ${superUser}`);
                    
                    if(superUser) {
                        console.log('⏭️ Skipping action - User is superUser (bot owner)');
                        return;
                    }
                    
                    if(!verifZokAdmin) {
                        console.log('⚠️ Bot is not admin, cannot take action');
                        const userPP = await getUserProfilePic(auteurMessage);
                        await zk.sendMessage(origineMessage, { 
                            image: { url: userPP || randomNjabulourl }, 
                            caption: `⚠️ *LINK DETECTED*\n\n👤 @${auteurMessage ? auteurMessage.split("@")[0] : "Unknown"}\n📌 Please don't send links!\n\n🔑 *Make bot admin to enable auto-moderation*`, 
                            mentions: [auteurMessage] 
                        }, { quoted: ms });
                        return;
                    }
                    
                    const userPP = await getUserProfilePic(auteurMessage);
                    
                    const key = {
                        remoteJid: origineMessage,
                        fromMe: false,
                        id: ms.key.id,
                        participant: auteurMessage
                    };
                    
                    const gifLink = "https://raw.githubusercontent.com/NjabuloJ/fana-xmd/main/media/remover.gif";
                    var sticker = new Sticker(gifLink, {
                        pack: 'NJABULO-MD',
                        author: conf.OWNER_NAME,
                        type: StickerTypes.FULL,
                        categories: ['🤩', '🎉'],
                        id: '12345',
                        quality: 50,
                        background: '#000000'
                    });
                    await sticker.toFile("st1.webp");
                    var action = await recupererActionJid(origineMessage);
                    
                    let txt = await translateMessage('link_detected', lang) + "\n";
                    
                    if (action === 'remove') {
                        txt += await translateMessage('link_deleted', lang) + "\n";
                        txt += `👤 @${auteurMessage ? auteurMessage.split("@")[0] : "Unknown"} ` + await translateMessage('link_removed', lang);
                        await zk.sendMessage(origineMessage, { sticker: fs.readFileSync("st1.webp") });
                        await baileys_1.delay(800);
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
                        txt += await translateMessage('link_deleted', lang) + "\n";
                        txt += `👤 @${auteurMessage ? auteurMessage.split("@")[0] : "Unknown"} ` + await translateMessage('link_warning', lang);
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
                            var kikmsg = await translateMessage('link_warn', lang) + "\n" + await translateMessage('link_warn_remaining', lang);
                            await zk.sendMessage(origineMessage, { 
                                image: { url: userPP || randomNjabulourl }, 
                                caption: kikmsg, 
                                mentions: [auteurMessage] 
                            }, { quoted: ms });
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                            await zk.sendMessage(origineMessage, { delete: key });
                        } else {
                            var rest = warnlimit - warn;
                            var msg = await translateMessage('link_warn', lang) + "\n" + await translateMessage('link_warn_count', lang) + `\n${await translateMessage('link_warn_remaining', lang)} ${rest}`;
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

            // ========== ANTI-BOT ==========
            try {
                const botMsg = ms.key?.id?.startsWith('BAES') && ms.key?.id?.length === 16;
                const baileysMsg = ms.key?.id?.startsWith('BAE5') && ms.key?.id?.length === 16;
                if (botMsg || baileysMsg) {
                    if (mtype === 'reactionMessage') return;
                    const antibotactiver = await atbverifierEtatJid(origineMessage);
                    if(!antibotactiver) return;
                    if(verifAdmin || auteurMessage === idBot) return;
                    
                    const userPP = await getUserProfilePic(auteurMessage);
                    
                    const key = {
                        remoteJid: origineMessage,
                        fromMe: false,
                        id: ms.key.id,
                        participant: auteurMessage
                    };
                    var txt = await translateMessage('bot_detected', lang) + "\n";
                    var action = await atbrecupererActionJid(origineMessage);
                    
                    if (action === 'remove') {
                        txt += await translateMessage('bot_removed', lang);
                        txt += `\n👤 @${auteurMessage ? auteurMessage.split("@")[0] : "Unknown"}`;
                        await zk.sendMessage(origineMessage, { 
                            image: { url: userPP || randomNjabulourl }, 
                            caption: txt, 
                            mentions: [auteurMessage] 
                        }, { quoted: ms });
                        await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                        await zk.sendMessage(origineMessage, { delete: key });
                    } 
                    else if (action === 'delete') {
                        txt += await translateMessage('bot_deleted', lang);
                        txt += `\n👤 @${auteurMessage ? auteurMessage.split("@")[0] : "Unknown"}`;
                        await zk.sendMessage(origineMessage, { 
                            image: { url: userPP || randomNjabulourl }, 
                            caption: txt, 
                            mentions: [auteurMessage] 
                        }, { quoted: ms });
                        await zk.sendMessage(origineMessage, { delete: key });
                    } 
                    else if(action === 'warn') {
                        const {getWarnCountByJID, ajouterUtilisateurAvecWarnCount} = require('./bdd/warn');
                        let warn = await getWarnCountByJID(auteurMessage);
                        let warnlimit = conf.WARN_COUNT || 3;
                        if (warn >= warnlimit) {
                            var kikmsg = await translateMessage('bot_detected', lang) + "\n" + await translateMessage('link_warn_remaining', lang);
                            await zk.sendMessage(origineMessage, { 
                                image: { url: userPP || randomNjabulourl }, 
                                caption: kikmsg, 
                                mentions: [auteurMessage] 
                            }, { quoted: ms });
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                            await zk.sendMessage(origineMessage, { delete: key });
                        } else {
                            var rest = warnlimit - warn;
                            var msg = await translateMessage('bot_detected', lang) + "\n" + await translateMessage('link_warn_count', lang) + `\n${await translateMessage('link_warn_remaining', lang)} ${rest}`;
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
            } catch (er) {
                console.log('Anti-bot error:', er);
            }

            // ========== COMMAND EXECUTION ==========
            if (verifCom) {
                const cd = evt.cm.find((zokou) => zokou.nomCom === (com));
                if (cd) {
                    try {
                        console.log(`🔍 Command: ${com} | User: ${auteurMessage ? auteurMessage.split("@")[0] : "Unknown"} | Group: ${verifGroupe}`);

                        // Check if user is banned (applies to ALL)
                        if (!superUser) {
                            let req = await isUserBanned(auteurMessage);
                            if (req) {
                                await repondre("❌ You are banned from bot commands");
                                return;
                            }
                        }

                        // For GROUPS only - additional restrictions
                        if (verifGroupe) {
                            if ((conf.MODE || "").toLowerCase() !== 'yes' && !superUser) {
                                console.log("ℹ️ Bot is in private mode for groups");
                                await repondre("❌ Bot is in private mode. Only admins can use commands in groups.");
                                return;
                            }
                            
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

                        // For DMs (INBOX) - EVERYONE CAN USE!
                        // Only banned users are blocked

                        console.log(`✅ Executing command: ${com} for user: ${auteurMessage ? auteurMessage.split("@")[0] : "Unknown"}`);
                        reagir(origineMessage, zk, ms, cd.reaction);
                        await cd.fonction(origineMessage, zk, commandeOptions);
                        
                    } catch (e) {
                        console.log("Error executing command:", e);
                        const translatedError = await translateTextWithCache("❌ Error: " + e.message, lang);
                        await zk.sendMessage(origineMessage, { text: translatedError }, { quoted: ms });
                    }
                }
            }
        });

        // ========== GROUP PARTICIPANTS UPDATE ==========
        const { recupevents } = require('./bdd/welcome');
        
        async function getProfilePic(jid) {
            try {
                const pp = await zk.profilePictureUrl(jid, 'image');
                return pp;
            } catch {
                return randomNjabulourl;
            }
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
        
        zk.ev.on('group-participants.update', async (group) => {
            console.log("📢 Group update detected:", group);
            
            try {
                const lang = getLang();
                
                let ppgroup;
                try {
                    ppgroup = await zk.profilePictureUrl(group.id, 'image');
                } catch {
                    ppgroup = randomNjabulourl;
                }
                
                const metadata = await zk.groupMetadata(group.id);
                const groupName = metadata.subject;
                const participantCount = metadata.participants.length;
                const currentTime = new Date();
                const joinTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const joinDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                
                if (group.action === 'add') {
                    const welcomeStatus = await recupevents(group.id, "welcome");
                    console.log(`📢 Welcome status for ${group.id}: ${welcomeStatus}`);
                    
                    if (welcomeStatus === 'on') {
                        for (const participant of group.participants) {
                            try {
                                const memberJid = participant.phoneNumber || participant.id;
                                if (!memberJid) continue;
                                
                                const memberName = await getName(participant);
                                const memberPP = await getProfilePic(memberJid);
                                
                                const welcomeTitle = await translateMessage('welcome', lang);
                                const welcomeHello = await translateMessage('welcome_hello', lang);
                                const welcomeRules = await translateMessage('welcome_rules', lang);
                                const welcomeEnjoy = await translateMessage('welcome_enjoy', lang);
                                const membersT = await translateMessage('members', lang);
                                const joinedAt = await translateMessage('joined_at', lang);
                                const dateT = await translateMessage('date', lang);
                                const groupT = await translateMessage('group', lang);
                                
                                const welcomeMsg = `╭━━━━━━━━━━━━━━━━━━━━━━╮
┃     ${welcomeTitle}
┃
┃ ${welcomeHello} ${memberName}!
┃
┃ 📱 ${groupT}: ${groupName}
┃ 👥 ${membersT}: ${participantCount}
┃
┃ 🕐 ${joinedAt}: ${joinTime}
┃ 📅 ${dateT}: ${joinDate}
┃
┃ ${welcomeRules}
┃
┃ ${welcomeEnjoy}
╰━━━━━━━━━━━━━━━━━━━━━━╯`;
                                
                                await zk.sendMessage(group.id, {
                                    image: { url: memberPP || ppgroup || randomNjabulourl },
                                    caption: welcomeMsg,
                                    mentions: [memberJid]
                                });
                                
                                console.log(`✅ Welcome message sent to ${memberName}`);
                            } catch (memberError) {
                                console.error(`Welcome error for participant:`, memberError.message);
                            }
                        }
                    }
                }
                
                if (group.action === 'remove') {
                    const goodbyeStatus = await recupevents(group.id, "goodbye");
                    console.log(`📢 Goodbye status for ${group.id}: ${goodbyeStatus}`);
                    
                    if (goodbyeStatus === 'on') {
                        for (const participant of group.participants) {
                            try {
                                const memberJid = participant.phoneNumber || participant.id;
                                if (!memberJid) continue;
                                
                                const memberName = await getName(participant);
                                
                                const goodbyeTitle = await translateMessage('goodbye', lang);
                                const goodbyeLeft = await translateMessage('goodbye_left', lang);
                                const goodbyeRemaining = await translateMessage('goodbye_remaining', lang);
                                const goodbyeMissed = await translateMessage('goodbye_missed', lang);
                                const groupT = await translateMessage('group', lang);
                                const leftAt = await translateMessage('left_at', lang);
                                const dateT = await translateMessage('date', lang);
                                
                                const goodbyeMsg = `╭━━━━━━━━━━━━━━━━━━━━━━╮
┃        ${goodbyeTitle}
┃
┃ 😢 ${memberName} ${goodbyeLeft}
┃
┃ 📱 ${groupT}: ${groupName}
┃ 👥 ${goodbyeRemaining} ${participantCount - 1}
┃
┃ 🕐 ${leftAt}: ${joinTime}
┃ 📅 ${dateT}: ${joinDate}
┃
┃ ${goodbyeMissed}
╰━━━━━━━━━━━━━━━━━━━━━━╯`;
                                
                                await zk.sendMessage(group.id, {
                                    image: { url: ppgroup || randomNjabulourl },
                                    caption: goodbyeMsg,
                                    mentions: [memberJid]
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

        zk.ev.on("connection.update", async (con) => {
            const { lastDisconnect, connection } = con;
            if (connection === "connecting") {
                console.log("ℹ️ NJABULO MD is connecting...");
            }
            else if (connection === 'open') {
                console.log("✅ NJABULO MD Connected to WhatsApp! ☺️");
                console.log("--");
                await baileys_1.delay(200);
                console.log("------");
                await baileys_1.delay(300);
                console.log("------------------/-----");
                console.log("NJABULO MD is Online 🕸\n\n");
                console.log("Loading Commands ...\n");
                
                if (fs.existsSync(__dirname + "/commandes")) {
                    fs.readdirSync(__dirname + "/commandes").forEach((fichier) => {
                        if (path.extname(fichier).toLowerCase() == ".js") {
                            try {
                                require(__dirname + "/commandes/" + fichier);
                                console.log(fichier + " Installed ✔️");
                            } catch (e) {
                                console.log(`${fichier} failed: ${e.message}`);
                            }
                        }
                    });
                }
                
                await baileys_1.delay(700);
                var md = (conf.MODE || "").toLowerCase() === "yes" ? "public" : "private";
                
                const currentLang = conf.LANGUAGE || "en";
                const langName = languageNames[currentLang] || "English";
                
                console.log("✅ NJABULO MD READY!");
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                console.log("📌 BOT: NJABULO MD");
                console.log("📌 PREFIX: " + prefixe);
                console.log("📌 MODE: " + md);
                console.log("📌 LANGUAGE: " + langName + " (" + currentLang + ")");
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                
                const ownerNumber = conf.NUMERO_OWNER + "@s.whatsapp.net";
                const cmsg = `╭──────────⊷
┊┏━┈┈┈┈┈┈┈⏤͟͟͞͞★
┊┊ *ᯤNJABULO MD: ONLINE* 
┊┊ *PREFIX: [ ${prefixe} ]*
┊┊ *MODE:* ${md}
┊┊ *LANGUAGE:* ${langName}
┊┊ *ANTI-DELETE:* ${conf.ADM === "yes" ? "✅ ON" : "❌ OFF"}
┊┗━┈┈┈┈┈┈┈┈
╰───────────⊷`;
                
                try {
                    await zk.sendMessage(ownerNumber, { text: cmsg });
                    console.log("✅ Startup message sent to owner DM: " + ownerNumber);
                } catch (e) {
                    console.log("❌ Failed to send startup message to owner DM:", e.message);
                }
                
                try {
                    const botJid = zk.user.id;
                    if (botJid) {
                        await zk.sendMessage(botJid, { 
                            text: "✅ Bot is now online!" 
                        });
                        console.log("✅ Startup message sent to bot DM: " + botJid);
                    }
                } catch (e) {
                    console.log("❌ Failed to send message to bot DM:", e.message);
                }
                
            }
            else if (connection == "close") {
                let raisonDeconnexion = new boom_1.Boom(lastDisconnect?.error)?.output.statusCode;
                if (raisonDeconnexion === baileys_1.DisconnectReason.badSession) {
                    console.log('Session id error, rescan again...');
                }
                else if (raisonDeconnexion === baileys_1.DisconnectReason.connectionClosed || 
                         raisonDeconnexion === baileys_1.DisconnectReason.connectionLost) {
                    console.log('Connection lost, reconnecting...');
                    main();
                }
                else if (raisonDeconnexion === baileys_1.DisconnectReason.restartRequired) {
                    console.log('Restarting...');
                    main();
                }
                else if (raisonDeconnexion === baileys_1.DisconnectReason.loggedOut) {
                    console.log('Logged out, please rescan QR');
                }
            }
        });

        zk.ev.on("creds.update", saveCreds);
        
        zk.downloadAndSaveMediaMessage = async (message, filename = '') => {
            try {
                const buffer = await baileys_1.downloadMediaMessage(
                    message,
                    'buffer',
                    {},
                    { logger: pino({ level: "silent" }) }
                );
                if (!buffer) return null;
                const type = await FileType.fromBuffer(buffer);
                const extension = type ? type.ext : 'bin';
                const trueFileName = filename ? `./${filename}.${extension}` : `./media_${Date.now()}.${extension}`;
                await fs.writeFileSync(trueFileName, buffer);
                return trueFileName;
            } catch (error) {
                console.error("Media download error:", error.message);
                return null;
            }
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