"use strict";

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
            bind: function(ev) { console.log("Store bound to events"); },
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

// ========== BASE64 SESSION HANDLER WITH fana~ PREFIX ==========
let session = conf.session || 'zokk';

// Function to clean and decode session
function decodeSession(sessionStr) {
    try {
        let cleanSession = sessionStr;
        
        // Remove any wrapper/prefix like "fana~" or "Zokou-MD-WHATSAPP-BOT;;;=>"
        if (cleanSession.includes('fana~')) {
            cleanSession = cleanSession.split('fana~')[1];
            console.log("✅ Removed 'fana~' prefix from session");
        }
        if (cleanSession.includes('Zokou-MD-WHATSAPP-BOT;;;=>')) {
            cleanSession = cleanSession.replace(/Zokou-MD-WHATSAPP-BOT;;;=>/g, "");
            console.log("✅ Removed Zokou-MD prefix from session");
        }
        
        // Remove any whitespace
        cleanSession = cleanSession.replace(/\s/g, '');
        
        // Try to decode base64
        const decoded = Buffer.from(cleanSession, 'base64').toString('utf8');
        
        // Check if decoded is valid JSON
        if (decoded.includes('creds') || decoded.includes('noiseKey')) {
            console.log("✅ Successfully decoded base64 session");
            return decoded;
        } else {
            // Try to parse as JSON
            JSON.parse(decoded);
            console.log("✅ Session is valid JSON");
            return decoded;
        }
    } catch (e) {
        console.log("Session decode error:", e.message);
        return null;
    }
}

async function authentification() {
    try {
        const credsPath = __dirname + "/auth/creds.json";
        const credsBackupPath = __dirname + "/auth/creds_backup.json";
        
        // If session is provided and not default
        if (session && session !== 'zokk' && session.length > 10) {
            console.log("📱 Processing session...");
            
            // Decode the session
            const decodedSession = decodeSession(session);
            
            if (decodedSession) {
                // Backup existing creds if exists
                if (fs.existsSync(credsPath)) {
                    fs.copySync(credsPath, credsBackupPath);
                    console.log("📁 Existing session backed up");
                }
                
                // Write decoded session
                await fs.writeFileSync(credsPath, decodedSession, "utf8");
                console.log("✅ Session saved successfully!");
                
                // Verify the saved session
                const saved = fs.readFileSync(credsPath, 'utf8');
                if (saved.includes('creds') || saved.includes('noiseKey')) {
                    console.log("✅ Session verification passed!");
                } else {
                    console.log("⚠️ Session may be invalid, will generate new QR if needed");
                }
            } else {
                console.log("❌ Failed to decode session, will generate new QR code");
                // Remove invalid creds file
                if (fs.existsSync(credsPath)) {
                    fs.removeSync(credsPath);
                }
            }
        } else {
            console.log("📱 No session provided, will generate new QR code");
        }
        
        // Check if creds file exists and is valid
        if (fs.existsSync(credsPath)) {
            const credsContent = fs.readFileSync(credsPath, 'utf8');
            if (credsContent && credsContent.length > 100) {
                console.log("✅ Valid session file found!");
            } else {
                console.log("⚠️ Session file exists but may be invalid");
            }
        }
    } catch (e) {
        console.log("Session error: " + e.message);
    }
}

// Run authentication
authentification();

const store = baileys_1.makeInMemoryStore({
    logger: pino().child({ level: "silent", stream: "store" }),
});

setTimeout(() => {
    async function main() {
        const { version } = await baileys_1.fetchLatestBaileysVersion();
        const { state, saveCreds } = await baileys_1.useMultiFileAuthState(__dirname + "/auth");

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
                return { conversation: 'An Error Occurred, Repeat Command!' };
            }
        };

        const zk = baileys_1.default(sockOptions);

        if (store && typeof store.bind === 'function') {
            store.bind(zk.ev);
        }

        // Decode JID function
        const decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                let decode = baileys_1.jidDecode(jid) || {};
                return decode.user && decode.server && decode.user + '@' + decode.server || jid;
            }
            return jid;
        };

        // Status emojis array
        const statusEmojis = ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👀', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '🗿', '💜', '💙', '🌝', '💚'];

        // ========== AUTO-STATUS HANDLER ==========
        zk.ev.on("messages.upsert", async (m) => {
            const msg = m.messages[0];
            if (!msg.message) return;

            // Handle status messages
            if (msg.key && msg.key.remoteJid === "status@broadcast") {
                
                // Get bot JID
                const botJid = decodeJid(zk.user.id);
                const senderJid = msg.key.participant || msg.key.remoteJid;
                
                // Skip if sender is null, unknown, or bot itself
                if (!msg.pushName || msg.pushName === "null" || msg.key.fromMe || senderJid === botJid) {
                    console.log("⏭️ Skipping status from unknown/null sender or own status");
                    return;
                }

                console.log("📱 Status received from:", msg.pushName);
                console.log("📱 Status sender JID:", senderJid);
                
                // Auto-read status
                if (conf.AUTO_READ_STATUS === "yes") {
                    await zk.readMessages([msg.key]);
                    console.log("✅ Status marked as read");
                }
                
                // Auto-react to status with random emoji
                if (conf.AUTO_STATUS_REACT === "true") {
                    try {
                        const randomEmoji = statusEmojis[Math.floor(Math.random() * statusEmojis.length)];
                        await zk.sendMessage(msg.key.remoteJid, {
                            react: {
                                text: randomEmoji,
                                key: msg.key,
                            }
                        });
                        console.log(`✅ Reacted to status from ${msg.pushName} with ${randomEmoji}`);
                    } catch (e) {
                        console.log("Could not react to status:", e.message);
                    }
                }
            }
        });

        // ========== ANTI-DELETE MESSAGE HANDLER ==========
        const isAntiDeleteEnabled = conf.ADM === "yes" || conf.ADM === "true" || conf.ADM === true;
        
        if (isAntiDeleteEnabled) {
            console.log("✅ ANTI-DELETE SYSTEM IS ENABLED");
            
            zk.ev.on("messages.update", async (updates) => {
                for (const update of updates) {
                    if (update.update.key?.fromMe) continue;
                    
                    if (update.update.messageStubType === 1 || update.update.messageStubType === 2 || 
                        update.update.messageStubType === 21 || update.update.messageStubType === 22) {
                        
                        console.log("🗑️ Message deletion detected!");
                        
                        const deletedKey = update.update.key;
                        const chatId = deletedKey.remoteJid;
                        
                        try {
                            const storeFile = './store.json';
                            if (fs.existsSync(storeFile)) {
                                const data = fs.readFileSync(storeFile, 'utf8');
                                const jsonData = JSON.parse(data);
                                
                                const messages = jsonData.messages?.[chatId];
                                let deletedMsg = null;
                                
                                if (messages) {
                                    for (const msg of messages) {
                                        if (msg.key.id === deletedKey.id) {
                                            deletedMsg = msg;
                                            break;
                                        }
                                    }
                                }
                                
                                if (deletedMsg && deletedMsg.message) {
                                    const sender = deletedMsg.key.participant || deletedMsg.key.remoteJid;
                                    const senderName = deletedMsg.pushName || "Someone";
                                    
                                    let messageContent = "Media message (image/video/sticker)";
                                    if (deletedMsg.message.conversation) {
                                        messageContent = deletedMsg.message.conversation;
                                    } else if (deletedMsg.message.extendedTextMessage?.text) {
                                        messageContent = deletedMsg.message.extendedTextMessage.text;
                                    } else if (deletedMsg.message.imageMessage?.caption) {
                                        messageContent = deletedMsg.message.imageMessage.caption;
                                    } else if (deletedMsg.message.videoMessage?.caption) {
                                        messageContent = deletedMsg.message.videoMessage.caption;
                                    }
                                    
                                    await zk.sendMessage(chatId, {
                                        text: `⚠️ *ANTI-DELETE SYSTEM* ⚠️\n\n` +
                                              `👤 *${senderName}* deleted a message!\n\n` +
                                              `📝 *Deleted Message:*\n${messageContent}\n\n` +
                                              `🕐 *Time:* ${new Date().toLocaleString()}\n\n` +
                                              `> Powered by NJABULO-MD`,
                                        mentions: [sender]
                                    });
                                    
                                    try {
                                        await zk.sendMessage(chatId, { forward: deletedMsg });
                                        console.log(`✅ Forwarded deleted message from ${senderName}`);
                                    } catch (forwardErr) {
                                        console.log("Could not forward message:", forwardErr.message);
                                    }
                                }
                            }
                        } catch (e) {
                            console.log("Anti-delete error:", e.message);
                        }
                    }
                }
            });
        } else {
            console.log("❌ ANTI-DELETE SYSTEM IS DISABLED");
        }

        // ========== MAIN MESSAGE HANDLER ==========
        zk.ev.on("messages.upsert", async (m) => {
            const { messages } = m;
            const ms = messages[0];
            if (!ms.message) return;

            const mtype = baileys_1.getContentType(ms.message);
            if (mtype === "reactionMessage") return;

            var texte = mtype == "conversation" ? ms.message.conversation :
                mtype == "imageMessage" ? ms.message.imageMessage?.caption :
                    mtype == "videoMessage" ? ms.message.videoMessage?.caption :
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
            if (verifGroupe) console.log("message provenant du groupe : " + (nomGroupe || "unknown"));
            console.log("message envoyé par : " + "[" + (nomAuteurMessage || "unknown") + " : " + (auteurMessage?.split("@s.whatsapp.net")[0] || "unknown") + " ]");
            console.log("type de message : " + (mtype || "unknown"));
            console.log("------ contenu du message ------");
            console.log(texte || "[No text content]");

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

            const lien = conf.URL ? conf.URL.split(',') : [];

            function mybotpic() {
                if (!lien.length) return "";
                const indiceAleatoire = Math.floor(Math.random() * lien.length);
                return lien[indiceAleatoire];
            }

            var commandeOptions = {
                superUser, verifGroupe, mbre, verifAdmin,
                infosGroupe, nomGroupe, auteurMessage, nomAuteurMessage, idBot,
                verifZokouAdmin, prefixe, arg, repondre, mtype, groupeAdmin,
                ms, mybotpic
            };

            // ========== ANTI-LINK ==========
            try {
                const yes = await verifierEtatJid(origineMessage);
                if (texte && (texte.includes('https://') || texte.includes('http://')) && verifGroupe && yes) {
                    console.log("lien detecté");
                    var verifZokAdmin = verifGroupe ? admins.includes(idBot) : false;
                    if (superUser || verifAdmin || !verifZokAdmin) {
                        console.log('je fais rien');
                        return;
                    }
                    
                    const key = {
                        remoteJid: origineMessage,
                        fromMe: false,
                        id: ms.key.id,
                        participant: auteurMessage
                    };
                    
                    var txt = "⚠️ *LINK DETECTED* ⚠️\n";
                    var action = await recupererActionJid(origineMessage);
                    
                    await zk.sendMessage(origineMessage, { 
                        text: txt + `\n@${auteurMessage.split("@")[0]} please avoid sending links in this group!`,
                        mentions: [auteurMessage]
                    }, { quoted: ms });
                    
                    if (action === 'remove') {
                        await zk.sendMessage(origineMessage, { delete: key });
                        await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                    } else if (action === 'delete') {
                        await zk.sendMessage(origineMessage, { delete: key });
                    } else if (action === 'warn') {
                        const { getWarnCountByJID, ajouterUtilisateurAvecWarnCount } = require('./bdd/warn');
                        let warn = await getWarnCountByJID(auteurMessage);
                        let warnlimit = conf.WARN_COUNT || 3;
                        if (warn >= warnlimit) {
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                        } else {
                            await ajouterUtilisateurAvecWarnCount(auteurMessage);
                        }
                        await zk.sendMessage(origineMessage, { delete: key });
                    }
                }
            } catch (e) {
                console.log("bdd err " + e);
            }

            // ========== EXECUTION DES COMMANDES ==========
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
                        console.log("😡😡 " + e);
                        zk.sendMessage(origineMessage, { text: "😡😡 " + e }, { quoted: ms });
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
            } catch (e) {
                console.error("Group update error:", e);
            }
        });

        // ========== CONNECTION UPDATE ==========
        zk.ev.on("connection.update", async (con) => {
            const { lastDisconnect, connection, qr } = con;
            
            if (qr) {
                console.log("📱 Scan this QR code with WhatsApp:");
                console.log(qr);
            }
            
            if (connection === "connecting") {
                console.log("ℹ️ NJABULO MD is connecting...");
            } else if (connection === 'open') {
                console.log("✅ NJABULO MD Connected to WhatsApp! ☺️");
                console.log("NJABULO MD is Online 🕸\n\n");

                var md = (conf.MODE || "").toLocaleLowerCase() === "yes" ? "public" : "private";
                console.log("Bot Mode: " + md);
                console.log("Bot Name: NJABULO MD");
                console.log("Loading Commands...");

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

                console.log("✅ NJABULO MD is Online!");
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                console.log("📌 BOT IS READY TO USE");
                console.log("📌 Prefix: " + prefixe);
                console.log("📌 Mode: " + md);
                console.log("📌 Owner: " + conf.NUMERO_OWNER);
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                
                // Get bot number
                const botNumber = zk.user?.id?.split(':')[0] || "Unknown";
                console.log(`🤖 Bot Number: ${botNumber}`);
                
                // Get owner number for DM
                const ownerNumber = conf.NUMERO_OWNER + "@s.whatsapp.net";
                
                // Create startup message
                const cmsg = `╭──────────⊷
┊┏━┈┈┈┈┈┈┈⏤͟͟͞͞★
┊┊ *ᯤNJABULO MD: CONNECTED* 
┊┊ *NAME: NJABULO MD*
┊┊ *PREFIX: [ ${prefixe} ]*
┊┊ *MODE:* ${md}
┊┊ *ANTI-DELETE:* ${isAntiDeleteEnabled ? "✅ ENABLED" : "❌ DISABLED"}
┊┊ *BOT NUMBER:* ${botNumber}
┊┗━┈┈┈┈┈┈┈┈
╰───────────⊷`;
                
                // SEND TO OWNER DM
                try {
                    await zk.sendMessage(ownerNumber, { text: cmsg });
                    console.log("✅ Startup message sent to OWNER DM: " + ownerNumber);
                } catch (e) {
                    console.log("Could not send to owner DM:", e.message);
                }
            } else if (connection == "close") {
                let reason = new boom_1.Boom(lastDisconnect?.error)?.output.statusCode;
                if (reason === baileys_1.DisconnectReason.badSession) {
                    console.log("Bad session, deleting auth folder...");
                    if (fs.existsSync(__dirname + "/auth")) {
                        fs.removeSync(__dirname + "/auth");
                    }
                    console.log("Please restart the bot to get new QR code");
                } else if (reason === baileys_1.DisconnectReason.restartRequired || reason === baileys_1.DisconnectReason.connectionLost) {
                    console.log("Restarting bot...");
                    main();
                } else if (reason === baileys_1.DisconnectReason.loggedOut) {
                    console.log("Logged out, deleting session...");
                    if (fs.existsSync(__dirname + "/auth")) {
                        fs.removeSync(__dirname + "/auth");
                    }
                }
            }
        });

        zk.ev.on("creds.update", saveCreds);

        // Download and save media message
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

        return zk;
    }

    main();
}, 5000);
