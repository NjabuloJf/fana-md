"use strict";

// ========== IMPORT GITHUB BAILEYS ==========
const baileysOriginal = require("@whiskeysockets/baileys");
const logger_1 = require("@whiskeysockets/baileys/lib/Utils/logger");
const logger = logger_1.default.child({});
logger.level = 'silent';
const pino = require("pino");
const boom_1 = require("@hapi/boom");

console.log("✅ Using Baileys from github:xhclintohn/Baileys");

// ========== CREATE WRAPPER INSTEAD OF MODIFYING ORIGINAL ==========
// Create a wrapper object that extends the original
const baileys_1 = { ...baileysOriginal };

// Add polyfill to the wrapper (not the original)
if (!baileys_1.makeInMemoryStore) {
    console.log("⚠️ makeInMemoryStore not found, adding polyfill to wrapper...");
    baileys_1.makeInMemoryStore = function(options) {
        console.log("Using polyfilled store");
        return {
            chats: new Map(),
            contacts: new Map(),
            messages: new Map(),
            bind: function(ev) {
                console.log("Store bound to events");
            },
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

// Also add any other missing functions to wrapper
if (!baileys_1.downloadMediaMessage && baileysOriginal.downloadMediaMessage) {
    baileys_1.downloadMediaMessage = baileysOriginal.downloadMediaMessage;
}
if (!baileys_1.downloadContentFromMessage && baileysOriginal.downloadContentFromMessage) {
    baileys_1.downloadContentFromMessage = baileysOriginal.downloadContentFromMessage;
}
if (!baileys_1.makeCacheableSignalKeyStore && baileysOriginal.makeCacheableSignalKeyStore) {
    baileys_1.makeCacheableSignalKeyStore = baileysOriginal.makeCacheableSignalKeyStore;
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

// Button handler
let handleButtons = async (zk, msg) => {
    console.log("Button handler triggered");
    try {
        if (msg.message?.buttonsResponseMessage) {
            const buttonId = msg.message.buttonsResponseMessage.selectedButtonId;
            const from = msg.key.remoteJid;
            console.log(`Button clicked: ${buttonId}`);
            
            if (buttonId === "view_rules") {
                await zk.sendMessage(from, { 
                    text: `📜 *GROUP RULES* 📜\n\n1. No spam\n2. No NSFW\n3. Respect members\n4. No links without permission` 
                });
            }
        }
    } catch (error) {
        console.error("Button handler error:", error);
    }
};

var session = conf.session.replace(/Zokou-MD-WHATSAPP-BOT;;;=>/g, "");
const prefixe = conf.PREFIXE;

async function authentification() {
    try {
        if (!fs.existsSync(__dirname + "/auth/creds.json")) {
            console.log("connexion en cour ...");
            await fs.writeFileSync(__dirname + "/auth/creds.json", atob(session), "utf8");
        } else if (fs.existsSync(__dirname + "/auth/creds.json") && session != "zokk") {
            await fs.writeFileSync(__dirname + "/auth/creds.json", atob(session), "utf8");
        }
    } catch (e) {
        console.log("Session Invalid " + e);
        return;
    }
}
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
            browser: ['Fana-MD', "Chrome", "1.0.0"],
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

        if (store && typeof store.bind === 'function') {
            store.bind(zk.ev);
        }

        // ========== BUTTON HANDLER ==========
        zk.ev.on("messages.upsert", async (m) => {
            const msg = m.messages[0];
            if (!msg.message) return;

            const isButtonResponse = msg.message?.buttonsResponseMessage ||
                msg.message?.listResponseMessage ||
                msg.message?.templateButtonReplyMessage ||
                msg.message?.interactiveResponseMessage;

            if (isButtonResponse) {
                console.log("🎯 Button interaction detected!");
                await handleButtons(zk, msg);
                return;
            }
        });

        // ========== MAIN MESSAGE HANDLER ==========
        zk.ev.on("messages.upsert", async (m) => {
            const { messages } = m;
            const ms = messages[0];
            if (!ms.message) return;

            // Skip reaction messages
            const mtype = baileys_1.getContentType(ms.message);
            if (mtype === "reactionMessage") return;

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

            console.log("\tFANA MD ONLINE");
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

            // Execution des commandes
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
                    let msg = `*✨ WELCOME TO ${groupName.toUpperCase()} ✨*\n\n👤 New Member Joined!\n\n🎉 Enjoy your stay!\n\nPowered by Fana-MD Bot`;
                    let membres = group.participants;
                    await zk.sendMessage(group.id, { image: { url: ppgroup }, caption: msg, mentions: membres });
                } else if (group.action == 'remove' && (await recupevents(group.id, "goodbye") == 'on')) {
                    let msg = `👋 GOODBYE!\n\n📱 Group: ${groupName}\n\nWe hope to see you again!\n\nPowered by Fana-MD Bot`;
                    await zk.sendMessage(group.id, { text: msg });
                }
            } catch (e) {
                console.error("Group update error:", e);
            }
        });

        // ========== CONNECTION UPDATE ==========
        zk.ev.on("connection.update", async (con) => {
            const { lastDisconnect, connection } = con;
            if (connection === "connecting") {
                console.log("ℹ️ Fana MD is connecting...");
            } else if (connection === 'open') {
                console.log("✅ Fana MD Connected to WhatsApp! ☺️");
                console.log("Fana MD is Online 🕸\n\n");

                var md = (conf.MODE || "").toLocaleLowerCase() === "yes" ? "public" : "private";
                console.log("Bot Mode: " + md);
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

                console.log("✅ Fana MD is Online!");
                
                // Send startup message to owner
                try {
                    const ownerNumber = conf.NUMERO_OWNER + "@s.whatsapp.net";
                    await zk.sendMessage(ownerNumber, { text: `🤖 FANA-MD BOT ONLINE\n\nStatus: Active\nMode: ${md}` });
                } catch (e) {}
            } else if (connection == "close") {
                let reason = new boom_1.Boom(lastDisconnect?.error)?.output.statusCode;
                if (reason === baileys_1.DisconnectReason.restartRequired || reason === baileys_1.DisconnectReason.connectionLost) {
                    console.log("Restarting bot...");
                    main();
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
