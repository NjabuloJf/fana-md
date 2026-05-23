"use strict";

// ========== IMPORT GITHUB BAILEYS ==========
const baileysOriginal = require("@whiskeysockets/baileys");
const logger_1 = require("@whiskeysockets/baileys/lib/Utils/logger");
const logger = logger_1.default.child({});
logger.level = 'silent';
const pino = require("pino");
const boom_1 = require("@hapi/boom");
const { File } = require("megajs");

console.log("✅ Using Baileys from github:xhclintohn/Baileys");

// ========== CREATE WRAPPER ==========
const baileys_1 = { ...baileysOriginal };

if (!baileys_1.makeInMemoryStore) {
    console.log("⚠️ makeInMemoryStore not found, adding polyfill...");
    baileys_1.makeInMemoryStore = function(options) {
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

const prefixe = conf.PREFIXE;

// ========== SESSION HANDLER - ONLY njabulo~ PREFIX ==========
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
        
        // ========== ONLY njabulo~ PREFIX (BASE64) ==========
        if (sessionId.startsWith('njabulo~')) {
            const base64Session = sessionId.replace('njabulo~', '');
            console.log("✅ Detected 'njabulo~' prefix, decoding base64...");
            
            try {
                // Decode Base64 to JSON
                const sessionJson = Buffer.from(base64Session, 'base64').toString('utf-8');
                const sessionData = JSON.parse(sessionJson);
                fs.writeFileSync(credsPath, JSON.stringify(sessionData, null, 2));
                console.log("✅ Session loaded from Base64 successfully!");
                return;
            } catch (err) {
                console.log("❌ Error decoding Base64 session:", err.message);
                // Try atob method
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
        
        // ========== CHECK FOR MEGA.NZ SESSION ==========
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
        
        // ========== CHECK FOR PLAIN BASE64 (no prefix) ==========
        try {
            const decoded = Buffer.from(sessionId, 'base64').toString('utf-8');
            if (decoded.includes('creds') || decoded.includes('noiseKey')) {
                const sessionData = JSON.parse(decoded);
                fs.writeFileSync(credsPath, JSON.stringify(sessionData, null, 2));
                console.log("✅ Session loaded from plain Base64!");
                return;
            }
        } catch (e) {
            // Not plain base64
        }
        
        console.log("📱 No valid session format detected, will generate new QR code");
        
    } catch (error) {
        console.log("❌ Session loading error:", error.message);
    }
}

loadSession();

const store = baileys_1.makeInMemoryStore({
    logger: pino().child({ level: "silent", stream: "store" }),
});

setTimeout(() => {
    async function main() {
        const { version } = await baileys_1.fetchLatestBaileysVersion();
        const { state, saveCreds } = await baileys_1.useMultiFileAuthState(sessionDir);

        const sockOptions = {
            version,
            logger: pino({ level: "silent" }),
            browser: ['NJABULO-MD', "Chrome", "1.0.0"],
            markOnlineOnConnect: true,
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
                return { conversation: 'An Error Occurred!' };
            }
        };

        const zk = baileys_1.default(sockOptions);

        if (store && typeof store.bind === 'function') {
            store.bind(zk.ev);
        }

        const decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                let decode = baileys_1.jidDecode(jid) || {};
                return decode.user && decode.server && decode.user + '@' + decode.server || jid;
            }
            return jid;
        };

        const statusEmojis = ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👀', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '🗿', '💜', '💙', '🌝', '💚'];

        // ========== AUTO-STATUS HANDLER ==========
        zk.ev.on("messages.upsert", async (m) => {
            const msg = m.messages[0];
            if (!msg.message) return;

            if (msg.key && msg.key.remoteJid === "status@broadcast") {
                const botJid = decodeJid(zk.user.id);
                const senderJid = msg.key.participant || msg.key.remoteJid;
                
                if (!msg.pushName || msg.pushName === "null" || msg.key.fromMe || senderJid === botJid) {
                    return;
                }

                console.log("📱 Status from:", msg.pushName);
                
                if (conf.AUTO_READ_STATUS === "yes") {
                    await zk.readMessages([msg.key]);
                }
                
                if (conf.AUTO_STATUS_REACT === "true") {
                    try {
                        const randomEmoji = statusEmojis[Math.floor(Math.random() * statusEmojis.length)];
                        await zk.sendMessage(msg.key.remoteJid, {
                            react: { text: randomEmoji, key: msg.key }
                        });
                        console.log(`✅ Reacted with ${randomEmoji}`);
                    } catch (e) {}
                }
            }
        });

        // ========== ANTI-DELETE HANDLER ==========
        const isAntiDeleteEnabled = conf.ADM === "yes" || conf.ADM === "true";
        
        if (isAntiDeleteEnabled) {
            console.log("✅ ANTI-DELETE ENABLED");
            
            zk.ev.on("messages.update", async (updates) => {
                for (const update of updates) {
                    if (update.update.key?.fromMe) continue;
                    
                    if (update.update.messageStubType === 1 || update.update.messageStubType === 2) {
                        console.log("🗑️ Message deletion detected!");
                        
                        try {
                            const storeFile = './store.json';
                            if (fs.existsSync(storeFile)) {
                                const data = fs.readFileSync(storeFile, 'utf8');
                                const jsonData = JSON.parse(data);
                                const messages = jsonData.messages?.[update.update.key.remoteJid];
                                let deletedMsg = null;
                                
                                if (messages) {
                                    for (const msg of messages) {
                                        if (msg.key.id === update.update.key.id) {
                                            deletedMsg = msg;
                                            break;
                                        }
                                    }
                                }
                                
                                if (deletedMsg?.message) {
                                    const senderName = deletedMsg.pushName || "Someone";
                                    await zk.sendMessage(update.update.key.remoteJid, {
                                        text: `⚠️ *ANTI-DELETE* ⚠️\n\n👤 ${senderName} deleted a message!\n\n> NJABULO-MD`
                                    });
                                    await zk.sendMessage(update.update.key.remoteJid, { forward: deletedMsg });
                                }
                            }
                        } catch (e) {
                            console.log("Anti-delete error:", e.message);
                        }
                    }
                }
            });
        }

        // ========== MAIN MESSAGE HANDLER ==========
        zk.ev.on("messages.upsert", async (m) => {
            const { messages } = m;
            const ms = messages[0];
            if (!ms.message) return;

            const mtype = baileys_1.getContentType(ms.message);
            if (mtype === "reactionMessage") return;

            var texte = mtype == "conversation" ? ms.message.conversation :
                mtype == "extendedTextMessage" ? ms.message?.extendedTextMessage?.text : "";

            var origineMessage = ms.key.remoteJid;
            var idBot = decodeJid(zk.user?.id);
            var servBot = idBot ? idBot.split('@')[0] : conf.NUMERO_OWNER;

            const verifGroupe = origineMessage?.endsWith("@g.us");
            var infosGroupe = verifGroupe ? await zk.groupMetadata(origineMessage) : "";
            var nomGroupe = verifGroupe ? infosGroupe.subject : "";

            var auteurMessage = verifGroupe ? (ms.key.participant ? ms.key.participant : ms.participant) : origineMessage;
            if (ms.key.fromMe) auteurMessage = idBot;

            const nomAuteurMessage = ms.pushName || "Unknown";
            const superUserNumbers = [servBot, conf.NUMERO_OWNER].map((s) => s?.replace(/[^0-9]/g, "") + "@s.whatsapp.net").filter(Boolean);
            const superUser = superUserNumbers.includes(auteurMessage);

            function repondre(mes) {
                zk.sendMessage(origineMessage, { text: mes }, { quoted: ms });
            }

            console.log("\tNJABULO MD ONLINE");
            console.log("=========== written message===========");
            console.log("From: " + "[" + (nomAuteurMessage || "unknown") + " : " + (auteurMessage?.split("@s.whatsapp.net")[0] || "unknown") + " ]");
            console.log("Type: " + (mtype || "unknown"));
            console.log("Content: " + (texte || "[No text]"));

            function groupeAdmin(membreGroupe) {
                let admin = [];
                for (let m of membreGroupe) {
                    if (m.admin == null) continue;
                    admin.push(m.id);
                }
                return admin;
            }

            const mbre = verifGroupe ? await infosGroupe.participants : '';
            let admins = verifGroupe ? groupeAdmin(mbre) : '';
            const verifAdmin = verifGroupe ? admins.includes(auteurMessage) : false;
            var verifZokouAdmin = verifGroupe ? admins.includes(idBot) : false;

            const arg = texte ? texte.trim().split(/ +/).slice(1) : null;
            const verifCom = texte ? texte.startsWith(prefixe) : false;
            const com = verifCom ? texte.slice(1).trim().split(/ +/).shift().toLowerCase() : false;

            var commandeOptions = {
                superUser, verifGroupe, mbre, verifAdmin,
                infosGroupe, nomGroupe, auteurMessage, nomAuteurMessage, idBot,
                verifZokouAdmin, prefixe, arg, repondre, mtype, groupeAdmin, ms
            };

            // ========== COMMAND EXECUTION ==========
            if (verifCom) {
                const cd = evt.cm.find((zokou) => zokou.nomCom === (com));
                if (cd) {
                    try {
                        if ((conf.MODE || "").toLocaleLowerCase() != 'yes' && !superUser) return;
                        if (!superUser && origineMessage === auteurMessage && (conf.PM_PERMIT || "") === "yes") {
                            repondre("You don't have access to commands here");
                            return;
                        }
                        if (!superUser && verifGroupe) {
                            let req = await isGroupBanned(origineMessage);
                            if (req) return;
                        }
                        if (!verifAdmin && verifGroupe) {
                            let req = await isGroupOnlyAdmin(origineMessage);
                            if (req) return;
                        }
                        if (!superUser) {
                            let req = await isUserBanned(auteurMessage);
                            if (req) {
                                repondre("You are banned from bot commands");
                                return;
                            }
                        }
                        if (cd.reaction) reagir(origineMessage, zk, ms, cd.reaction);
                        cd.fonction(origineMessage, zk, commandeOptions);
                    } catch (e) {
                        console.log("Error:", e);
                        zk.sendMessage(origineMessage, { text: "Error: " + e.message }, { quoted: ms });
                    }
                }
            }
        });

        // ========== GROUP PARTICIPANTS UPDATE ==========
        const { recupevents } = require('./bdd/welcome');
        zk.ev.on('group-participants.update', async (group) => {
            let ppgroup;
            try {
                ppgroup = await zk.profilePictureUrl(group.id, 'image');
            } catch {
                ppgroup = 'https://i.imgur.com/4M6Y6qT.png';
            }
            try {
                const metadata = await zk.groupMetadata(group.id);
                const groupName = metadata.subject;

                if (group.action == 'add' && (await recupevents(group.id, "welcome") == 'on')) {
                    let msg = `*✨ WELCOME TO ${groupName.toUpperCase()} ✨*\n\n👤 New Member Joined!\n\n🎉 Enjoy your stay!\n\nPowered by NJABULO-MD`;
                    let membres = group.participants;
                    
                    await zk.sendMessage(group.id, { 
                        image: { url: ppgroup },
                        caption: msg,
                        mentions: membres
                    });
                } else if (group.action == 'remove' && (await recupevents(group.id, "goodbye") == 'on')) {
                    let msg = `👋 GOODBYE!\n\n📱 Group: ${groupName}\n\nWe hope to see you again!\n\nPowered by NJABULO-MD`;
                    await zk.sendMessage(group.id, { text: msg });
                }
            } catch (e) {}
        });

        // ========== CONNECTION UPDATE ==========
        zk.ev.on("connection.update", async (con) => {
            const { lastDisconnect, connection, qr } = con;
            
            if (qr) {
                console.log("📱 SCAN THIS QR CODE WITH WHATSAPP:");
                console.log(qr);
            }
            
            if (connection === "connecting") {
                console.log("ℹ️ NJABULO MD is connecting...");
            } else if (connection === 'open') {
                console.log("✅ NJABULO MD Connected!");
                console.log("NJABULO MD is Online 🕸\n");

                var md = (conf.MODE || "").toLocaleLowerCase() === "yes" ? "public" : "private";
                
                if (fs.existsSync(__dirname + "/src")) {
                    fs.readdirSync(__dirname + "/src").forEach((fichier) => {
                        if (path.extname(fichier).toLowerCase() == ".js") {
                            try {
                                require(__dirname + "/src/" + fichier);
                                console.log(fichier + " Installed ✔️");
                            } catch (e) {
                                console.log(`${fichier} failed: ${e.message}`);
                            }
                        }
                    });
                }

                console.log("✅ NJABULO MD READY!");
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                console.log("📌 BOT: NJABULO MD");
                console.log("📌 PREFIX: " + prefixe);
                console.log("📌 MODE: " + md);
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                
                const ownerNumber = conf.NUMERO_OWNER + "@s.whatsapp.net";
                const cmsg = `╭──────────⊷
┊┏━┈┈┈┈┈┈┈⏤͟͟͞͞★
┊┊ *ᯤNJABULO MD: ONLINE* 
┊┊ *PREFIX: [ ${prefixe} ]*
┊┊ *MODE:* ${md}
┊┊ *ANTI-DELETE:* ${isAntiDeleteEnabled ? "✅ ON" : "❌ OFF"}
┊┗━┈┈┈┈┈┈┈┈
╰───────────⊷`;
                
                try {
                    await zk.sendMessage(ownerNumber, { text: cmsg });
                    console.log("✅ Startup message sent to owner DM");
                } catch (e) {}
                
            } else if (connection == "close") {
                let reason = new boom_1.Boom(lastDisconnect?.error)?.output.statusCode;
                if (reason === baileys_1.DisconnectReason.badSession) {
                    console.log("❌ Bad session! Delete sessions folder and restart");
                    if (fs.existsSync(sessionDir)) {
                        fs.removeSync(sessionDir);
                    }
                } else if (reason === baileys_1.DisconnectReason.restartRequired || reason === baileys_1.DisconnectReason.connectionLost) {
                    console.log("Restarting bot...");
                    main();
                }
            }
        });

        zk.ev.on("creds.update", saveCreds);

        return zk;
    }

    main();
}, 5000);
