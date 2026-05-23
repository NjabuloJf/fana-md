"use strict";

// ========== IMPORT GITHUB BAILEYS ==========
const baileysOriginal = require("@whiskeysockets/baileys");
const logger_1 = require("@whiskeysockets/baileys/lib/Utils/logger");
const logger = logger_1.default.child({});
logger.level = 'silent';
const pino = require("pino");
const boom_1 = require("@hapi/boom");
const { File } = require("megajs");
const moment = require("moment-timezone");

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

// Buttons for anti-link
const buttons = [
    {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
            display_text: "🌐 WA Channel",
            id: "backup channel",
            url: conf.GURL || "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u"
        }),
    },
];

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
            if (typeof jid !== 'string') return jid;
            if (/:\d+@/gi.test(jid)) {
                let decode = baileys_1.jidDecode(jid) || {};
                return decode.user && decode.server && decode.user + '@' + decode.server || jid;
            }
            return jid;
        };

        // ========== HELPER FUNCTIONS ==========
        async function getProfilePic(jid) {
            try {
                const pp = await zk.profilePictureUrl(jid, 'image');
                return pp;
            } catch {
                return 'https://i.imgur.com/4M6Y6qT.png';
            }
        }

        function formatDate(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        }

        // FIXED: Get name function with proper JID handling
        async function getName(jid) {
            try {
                if (!jid) return "Unknown";
                if (typeof jid !== 'string') {
                    jid = String(jid);
                }
                const cleanJid = jid.split('@')[0];
                return cleanJid;
            } catch (e) {
                return "Unknown";
            }
        }

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

        // ========== GROUP PARTICIPANTS UPDATE - WELCOME & GOODBYE ==========
        const { recupevents } = require('./bdd/welcome');
        
        zk.ev.on('group-participants.update', async (update) => {
            console.log("📢 Group update detected:", JSON.stringify(update, null, 2));
            
            try {
                const groupId = update.id;
                const action = update.action;
                const participants = update.participants;
                
                if (!groupId || !action) {
                    console.log("Missing groupId or action");
                    return;
                }
                
                // Get group metadata
                const groupMetadata = await zk.groupMetadata(groupId);
                const groupName = groupMetadata.subject || "Unknown Group";
                const groupDesc = groupMetadata.desc || "No description";
                const participantCount = groupMetadata.participants.length;
                
                const currentTime = new Date();
                const joinTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const joinDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                
                // WELCOME - When someone joins
                if (action === 'add') {
                    const welcomeEnabled = await recupevents(groupId, "welcome");
                    console.log(`Welcome status: ${welcomeEnabled}`);
                    
                    if (welcomeEnabled === 'on' && participants && participants.length > 0) {
                        for (const participant of participants) {
                            try {
                                const memberJid = typeof participant === 'string' ? participant : String(participant);
                                const memberName = await getName(memberJid);
                                const memberPP = await getProfilePic(memberJid);
                                
                                console.log(`👤 New member joined: ${memberName} (${memberJid})`);
                                console.log(`📅 Join time: ${joinTime}, Date: ${joinDate}`);
                                
                                const welcomeMsg = `╭━━━━━━━━━━━━━━━━━━━━━━╮
┃     🎉 *WELCOME TO THE GROUP!* 🎉
┃
┃ 👋 *Hello ${memberName}* !
┃
┃ 📱 *Group:* ${groupName}
┃ 👥 *Members:* ${participantCount}
┃
┃ 🕐 *Joined at:* ${joinTime}
┃ 📅 *Date:* ${joinDate}
┃
┃ 📝 *Description:* ${groupDesc.substring(0, 100)}${groupDesc.length > 100 ? '...' : ''}
┃
┃ 📜 *Quick Rules:*
┃ • No spam
┃ • No NSFW
┃ • Respect members
┃ • No links without permission
┃
┃ 🎯 *Type ${prefixe}help for commands*
┃
┃ 💫 *Enjoy your stay!*
╰━━━━━━━━━━━━━━━━━━━━━━╯`;
                                
                                await zk.sendMessage(groupId, {
                                    image: { url: memberPP },
                                    caption: welcomeMsg,
                                    mentions: [memberJid]
                                });
                                
                                console.log(`✅ Welcome message sent to ${memberName}`);
                                
                                // Send DM to new member
                                try {
                                    const dmMsg = `🎉 *Welcome to ${groupName}!* 🎉\n\nHi ${memberName}! We're excited to have you.\n\n📌 *Group Rules:*\n• Be respectful\n• No spam\n• No NSFW\n\nUse ${prefixe}help to see available commands.\n\nEnjoy your stay! 🚀`;
                                    await zk.sendMessage(memberJid, { text: dmMsg });
                                    console.log(`✅ DM welcome sent to ${memberName}`);
                                } catch (dmErr) {
                                    console.log("Could not send DM:", dmErr.message);
                                }
                                
                            } catch (memberError) {
                                console.error(`Error processing member:`, memberError);
                            }
                        }
                    }
                }
                
                // GOODBYE - When someone leaves
                if (action === 'remove') {
                    const goodbyeEnabled = await recupevents(groupId, "goodbye");
                    console.log(`Goodbye status: ${goodbyeEnabled}`);
                    
                    if (goodbyeEnabled === 'on' && participants && participants.length > 0) {
                        for (const participant of participants) {
                            try {
                                const memberJid = typeof participant === 'string' ? participant : String(participant);
                                const memberName = await getName(memberJid);
                                
                                console.log(`👋 Member left: ${memberName} (${memberJid})`);
                                console.log(`📅 Leave time: ${joinTime}, Date: ${joinDate}`);
                                
                                const goodbyeMsg = `╭━━━━━━━━━━━━━━━━━━━━━━╮
┃        👋 *GOODBYE* 👋
┃
┃ 😢 *${memberName}* has left the group
┃
┃ 📱 *Group:* ${groupName}
┃ 👥 *Remaining members:* ${participantCount - 1}
┃
┃ 🕐 *Left at:* ${joinTime}
┃ 📅 *Date:* ${joinDate}
┃
┃ 🌟 *We hope to see you again soon!*
┃
┃ 💫 *You will be missed!*
╰━━━━━━━━━━━━━━━━━━━━━━╯`;
                                
                                await zk.sendMessage(groupId, {
                                    text: goodbyeMsg,
                                    mentions: [memberJid]
                                });
                                
                                console.log(`✅ Goodbye message sent for ${memberName}`);
                            } catch (memberError) {
                                console.error(`Error processing leaving member:`, memberError);
                            }
                        }
                    }
                }
                
            } catch (error) {
                console.error("Group update error:", error);
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
                mtype == "imageMessage" ? ms.message.imageMessage?.caption :
                mtype == "videoMessage" ? ms.message.videoMessage?.caption :
                mtype == "extendedTextMessage" ? ms.message?.extendedTextMessage?.text : "";

            var origineMessage = ms.key.remoteJid;
            var idBot = decodeJid(zk.user?.id);
            var servBot = idBot ? idBot.split('@')[0] : conf.NUMERO_OWNER;

            const verifGroupe = origineMessage?.endsWith("@g.us");
            var infosGroupe = verifGroupe ? await zk.groupMetadata(origineMessage) : "";
            var nomGroupe = verifGroupe ? infosGroupe.subject : "";
            var msgRepondu = ms.message.extendedTextMessage?.contextInfo?.quotedMessage;
            var auteurMsgRepondu = decodeJid(ms.message?.extendedTextMessage?.contextInfo?.participant);
            var auteurMessage = verifGroupe ? (ms.key.participant ? ms.key.participant : ms.participant) : origineMessage;
            
            if (ms.key.fromMe) auteurMessage = idBot;

            var membreGroupe = verifGroupe ? ms.key.participant : '';
            
            // ========== SUDO SYSTEM ==========
            const { getAllSudoNumbers } = require("./bdd/sudo");
            const nomAuteurMessage = ms.pushName || "Unknown";
            
            const ownerNumber = conf.NUMERO_OWNER || "26777821911";
            const ownerJid = ownerNumber + "@s.whatsapp.net";
            
            let sudoNumbersList = [];
            try {
                const sudoData = await getAllSudoNumbers();
                sudoNumbersList = sudoData.map(sudo => sudo.number + "@s.whatsapp.net");
            } catch (e) {}
            
            const superUserNumbers = [servBot, ownerJid, ownerNumber + "@s.whatsapp.net"];
            superUserNumbers.push(...sudoNumbersList);
            const superUserRawNumbers = [servBot?.split('@')[0], ownerNumber, conf.NUMERO_OWNER];
            const isSuperUser = superUserNumbers.includes(auteurMessage) || superUserRawNumbers.includes(auteurMessage?.split('@')[0]);
            const isDev = isSuperUser;

            function repondre(mes) {
                zk.sendMessage(origineMessage, { text: mes }, { quoted: ms });
            }

            console.log("\tNJABULO MD ONLINE");
            console.log("=========== written message===========");
            if (verifGroupe) console.log("Group: " + (nomGroupe || "unknown"));
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

            const lien = conf.URL ? conf.URL.split(',') : [];

            function mybotpic() {
                if (!lien.length) return "";
                const indiceAleatoire = Math.floor(Math.random() * lien.length);
                return lien[indiceAleatoire];
            }

            var commandeOptions = {
                superUser: isSuperUser,
                dev: isDev,
                verifGroupe, mbre, membreGroupe, verifAdmin,
                infosGroupe, nomGroupe, auteurMessage, nomAuteurMessage, idBot,
                verifZokouAdmin, prefixe, arg, repondre, mtype, groupeAdmin,
                msgRepondu, auteurMsgRepondu, ms, mybotpic,
                sudoList: sudoNumbersList
            };

            // ========== ANTI-LINK WITH STICKER AND BUTTONS ==========
            try {
                const yes = await verifierEtatJid(origineMessage);
                if (texte && (texte.includes('https://') || texte.includes('http://')) && verifGroupe && yes) {
                    console.log("🔗 LINK DETECTED");
                    var verifZokAdmin = verifGroupe ? admins.includes(idBot) : false;

                    if (isSuperUser || verifAdmin || !verifZokAdmin) {
                        console.log('⏭️ Skipping action');
                        return;
                    }

                    const key = {
                        remoteJid: origineMessage,
                        fromMe: false,
                        id: ms.key.id,
                        participant: auteurMessage
                    };
                    
                    var txt = "⚠️ *LINK DETECTED* ⚠️\n";
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

                    if (action === 'remove') {
                        txt += `⚠️ Message deleted\n👤 @${auteurMessage.split("@")[0]} removed from group.`;
                        
                        await zk.sendMessage(origineMessage, { sticker: fs.readFileSync("st1.webp") });
                        await (0, baileys_1.delay)(800);
                        
                        await zk.sendMessage(origineMessage, {
                            interactiveMessage: {
                                header: { text: txt },
                                mentions: [auteurMessage],
                                buttons: buttons,
                                headerType: 1
                            }
                        }, { quoted: ms });
                        
                        try {
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                        } catch (e) {
                            console.log("Anti-link remove error:", e);
                        }
                        await zk.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } 
                    else if (action === 'delete') {
                        txt += `⚠️ Message deleted\n👤 @${auteurMessage.split("@")[0]} avoid sending links.`;
                        
                        await zk.sendMessage(origineMessage, {
                            interactiveMessage: {
                                header: { text: txt },
                                mentions: [auteurMessage],
                                buttons: buttons,
                                headerType: 1
                            }
                        }, { quoted: ms });
                        
                        await zk.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } 
                    else if (action === 'warn') {
                        const { getWarnCountByJID, ajouterUtilisateurAvecWarnCount } = require('./bdd/warn');
                        
                        let warn = await getWarnCountByJID(auteurMessage);
                        let warnlimit = conf.WARN_COUNT || 3;
                        
                        if (warn >= warnlimit) {
                            var kikmsg = `⚠️ Link detected! You will be removed because of reaching warn limit (${warnlimit})`;
                            await zk.sendMessage(origineMessage, { text: kikmsg, mentions: [auteurMessage] }, { quoted: ms });
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                            await zk.sendMessage(origineMessage, { delete: key });
                        } else {
                            var rest = warnlimit - warn;
                            var msg = `⚠️ Link detected! Warning ${warn + 1}/${warnlimit}\nRemaining: ${rest}`;
                            
                            await ajouterUtilisateurAvecWarnCount(auteurMessage);
                            
                            await zk.sendMessage(origineMessage, {
                                interactiveMessage: {
                                    header: { text: msg },
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

            // ========== COMMAND EXECUTION ==========
            if (verifCom) {
                const cd = evt.cm.find((zokou) => zokou.nomCom === (com));
                if (cd) {
                    try {
                        if ((conf.MODE || "").toLocaleLowerCase() != 'yes' && !isSuperUser) return;
                        if (!isSuperUser && origineMessage === auteurMessage && (conf.PM_PERMIT || "") === "yes") {
                            repondre("You don't have access to commands here");
                            return;
                        }
                        if (!isSuperUser && verifGroupe) {
                            let req = await isGroupBanned(origineMessage);
                            if (req) return;
                        }
                        if (!verifAdmin && verifGroupe) {
                            let req = await isGroupOnlyAdmin(origineMessage);
                            if (req) return;
                        }
                        if (!isSuperUser) {
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
