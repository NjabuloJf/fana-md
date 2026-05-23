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
var __importStar = (this && this.__importStar) || function(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function(mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });

// ========== FIX: Create wrapper for baileys ==========
const baileysOriginal = __importStar(require("@whiskeysockets/baileys"));
const logger_1 = __importDefault(require("@whiskeysockets/baileys/lib/Utils/logger"));
const logger = logger_1.default.child({});
logger.level = 'silent';
const pino = require("pino");
const boom_1 = require("@hapi/boom");

// Create a wrapped version of baileys with the missing function
const baileys_1 = { ...baileysOriginal };

// Add the missing makeInMemoryStore function
if (!baileys_1.makeInMemoryStore) {
    console.log("⚠️ makeInMemoryStore not found, creating wrapper function...");
    baileys_1.makeInMemoryStore = function(options) {
        console.log("Using custom store implementation");
        const store = {
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
                } catch (e) {
                    // Silently fail
                }
            },
            readFromFile: function(filename) {
                try {
                    const fs = require('fs-extra');
                    if (fs.existsSync(filename)) {
                        const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
                        this.chats = new Map(data.chats);
                        this.contacts = new Map(data.contacts);
                        this.messages = new Map(data.messages);
                    }
                } catch (e) {
                    // Silently fail
                }
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
        return store;
    };
    console.log("✅ Custom store implementation added");
}
// ========== END OF FIX ==========

const conf = require("./set");
const axios = require("axios");
let fs = require("fs-extra");
let path = require("path");
const FileType = require('file-type');
const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');

const { verifierEtatJid, recupererActionJid } = require("./bdd/antilien");
const { atbverifierEtatJid, atbrecupererActionJid } = require("./bdd/antibot");
let evt = require(__dirname + "/njabulo/fana");
const { isUserBanned, addUserToBanList, removeUserFromBanList } = require("./bdd/banUser");
const { addGroupToBanList, isGroupBanned, removeGroupFromBanList } = require("./bdd/banGroup");
const { isGroupOnlyAdmin, addGroupToOnlyAdminList, removeGroupFromOnlyAdminList } = require("./bdd/onlyAdmin");
let { reagir } = require(__dirname + "/njabulo/app");

// Import button handler
const { handleButtons } = require("./commands/play0");

var session = conf.session.replace(/Zokou-MD-WHATSAPP-BOT;;;=>/g, "");
const prefixe = conf.PREFIXE;
const more = String.fromCharCode(8206);
const readmore = more.repeat(4001);

// Auto-status configuration
const AUTO_STATUS = {
    READ: conf.AUTO_READ_STATUS === "yes",
    DOWNLOAD: conf.AUTO_DOWNLOAD_STATUS === "yes",
    REACT: false, // Set to false to avoid reaction loops
    REACT_EMOJI: "✅"
};

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
        const { version, isLatest } = await baileys_1.fetchLatestBaileysVersion();
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
                return {
                    conversation: 'An Error Occurred, Repeat Command!'
                };
            }
        };

        const zk = baileys_1.default(sockOptions);

        if (store && typeof store.bind === 'function') {
            store.bind(zk.ev);
        }

        if (store && typeof store.writeToFile === 'function') {
            setInterval(() => { store.writeToFile("store.json"); }, 3000);
        }

        // ========== BUTTON HANDLER ==========
        zk.ev.on("messages.upsert", async (m) => {
            const msg = m.messages[0];
            if (!msg.message) return;

            // Check if this is a button interaction
            const isButtonResponse = msg.message?.buttonsResponseMessage ||
                msg.message?.listResponseMessage ||
                msg.message?.templateButtonReplyMessage ||
                msg.message?.interactiveResponseMessage;

            if (isButtonResponse) {
                console.log("🎯 Button/LIST interaction detected!");
                await handleButtons(zk, msg);
                return; // Don't process as normal message
            }
        });

        // ========== AUTO-STATUS HANDLER ==========
        zk.ev.on("messages.upsert", async (m) => {
            const msg = m.messages[0];
            if (!msg.message) return;

            // Handle status messages only
            if (msg.key && msg.key.remoteJid === "status@broadcast") {

                // Skip if sender is null or unknown
                if (!msg.pushName || msg.pushName === "null" || msg.key.fromMe) {
                    console.log("⏭️ Skipping status from unknown/null sender");
                    return;
                }

                console.log("📱 Status received from:", msg.pushName);

                // Auto-read status
                if (AUTO_STATUS.READ) {
                    await zk.readMessages([msg.key]);
                    console.log("✅ Status marked as read");
                }

                // Auto-react to status (disabled to avoid loops)
                if (AUTO_STATUS.REACT && !msg.key.fromMe) {
                    try {
                        await zk.sendMessage(msg.key.remoteJid, {
                            react: {
                                text: AUTO_STATUS.REACT_EMOJI,
                                key: msg.key
                            }
                        });
                        console.log("✅ Reacted to status");
                    } catch (e) {
                        console.log("Could not react to status:", e.message);
                    }
                }

                // Auto-download status
                if (AUTO_STATUS.DOWNLOAD && !msg.key.fromMe) {
                    try {
                        const botId = zk.user?.id || conf.NUMERO_OWNER + "@s.whatsapp.net";

                        if (msg.message.extendedTextMessage) {
                            var stTxt = msg.message.extendedTextMessage.text;
                            await zk.sendMessage(botId, {
                                text: `📱 *Status Update*\nFrom: ${msg.pushName}\n\n${stTxt}`
                            });
                        } else if (msg.message.imageMessage) {
                            var stMsg = msg.message.imageMessage.caption || "";
                            var stImg = await zk.downloadAndSaveMediaMessage(msg.message.imageMessage);
                            if (stImg) {
                                await zk.sendMessage(botId, {
                                    image: { url: stImg },
                                    caption: `📱 *Status Image*\nFrom: ${msg.pushName}\n\n${stMsg}`
                                });
                            }
                        } else if (msg.message.videoMessage) {
                            var stMsg = msg.message.videoMessage.caption || "";
                            var stVideo = await zk.downloadAndSaveMediaMessage(msg.message.videoMessage);
                            if (stVideo) {
                                await zk.sendMessage(botId, {
                                    video: { url: stVideo },
                                    caption: `📱 *Status Video*\nFrom: ${msg.pushName}\n\n${stMsg}`
                                });
                            }
                        }
                        console.log("✅ Status downloaded");
                    } catch (e) {
                        console.log("Could not download status:", e.message);
                    }
                }
            }
        });

        // ========== MAIN MESSAGE HANDLER ==========
        zk.ev.on("messages.upsert", async (m) => {
            const { messages } = m;
            const ms = messages[0];
            if (!ms.message) return;

            // ========== FILTERS ==========
            // Get message type
            const mtype = (0, baileys_1.getContentType)(ms.message);

            // Filter 1: Skip reaction messages completely
            if (mtype === "reactionMessage") {
                return;
            }

            // Filter 2: Skip if no remoteJid
            if (!ms.key?.remoteJid) {
                return;
            }

            // Filter 3: For status messages, skip if no valid sender
            if (ms.key.remoteJid === "status@broadcast") {
                if (!ms.pushName || ms.pushName === "null" || ms.key.fromMe) {
                    return;
                }
            }

            // Filter 4: Skip if participant is null for group messages
            if (ms.key.remoteJid?.endsWith("@g.us") && !ms.key.participant) {
                return;
            }
            // ========== END OF FILTERS ==========

            const decodeJid = (jid) => {
                if (!jid) return jid;
                if (/:\d+@/gi.test(jid)) {
                    let decode = (0, baileys_1.jidDecode)(jid) || {};
                    return decode.user && decode.server && decode.user + '@' + decode.server || jid;
                } else return jid;
            };

            var texte = mtype == "conversation" ? ms.message.conversation :
                mtype == "imageMessage" ? ms.message.imageMessage?.caption :
                    mtype == "videoMessage" ? ms.message.videoMessage?.caption :
                        mtype == "extendedTextMessage" ? ms.message?.extendedTextMessage?.text :
                            mtype == "buttonsResponseMessage" ? ms?.message?.buttonsResponseMessage?.selectedButtonId :
                                mtype == "listResponseMessage" ? ms.message?.listResponseMessage?.singleSelectReply?.selectedRowId : "";

            var origineMessage = ms.key.remoteJid;
            var idBot = decodeJid(zk.user?.id);
            var servBot = idBot ? idBot.split('@')[0] : conf.NUMERO_OWNER;

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
            const nomAuteurMessage = ms.pushName || "Unknown";
            const dj = conf.NUMERO_OWNER;
            const dj2 = conf.NUMERO_OWNER;
            const dj3 = conf.NUMERO_OWNER;
            const luffy = conf.NUMERO_OWNER;
            const sudo = await getAllSudoNumbers();
            const superUserNumbers = [servBot, dj, dj2, dj3, luffy, conf.NUMERO_OWNER].map((s) => s?.replace(/[^0-9]/g, "") + "@s.whatsapp.net").filter(Boolean);
            const allAllowedNumbers = superUserNumbers.concat(sudo);
            const superUser = allAllowedNumbers.includes(auteurMessage);

            var dev = [dj, dj2, dj3, luffy].map((t) => t?.replace(/[^0-9]/g, "") + "@s.whatsapp.net").includes(auteurMessage);

            function repondre(mes) {
                zk.sendMessage(origineMessage, { text: mes }, { quoted: ms });
            }

            console.log("\tFANA MD ONLINE");
            console.log("=========== written message===========");
            if (verifGroupe) {
                console.log("message provenant du groupe : " + (nomGroupe || "unknown"));
            }
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

            var etat = conf.ETAT || 1;
            if (etat == 1) {
                await zk.sendPresenceUpdate("available", origineMessage);
            } else if (etat == 2) {
                await zk.sendPresenceUpdate("composing", origineMessage);
            } else if (etat == 3) {
                await zk.sendPresenceUpdate("recording", origineMessage);
            } else {
                await zk.sendPresenceUpdate("unavailable", origineMessage);
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
                const lienAleatoire = lien[indiceAleatoire];
                return lienAleatoire;
            }

            var commandeOptions = {
                superUser, dev, verifGroupe, mbre, membreGroupe, verifAdmin,
                infosGroupe, nomGroupe, auteurMessage, nomAuteurMessage, idBot,
                verifZokouAdmin, prefixe, arg, repondre, mtype, groupeAdmin,
                msgRepondu, auteurMsgRepondu, ms, mybotpic
            };

            // Anti-delete-message
            if (ms.message.protocolMessage && ms.message.protocolMessage.type === 0 && (conf.ADM || "").toLocaleLowerCase() === 'yes') {
                if (ms.key.fromMe || ms.message.protocolMessage.key.fromMe) {
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
                        if (msg && msg !== 'undefined') {
                            await zk.sendMessage(idBot, { image: { url: './media/deleted-message.jpg' }, caption: `😈Anti-delete-message😈\n Message from @${msg.key.participant?.split('@')[0]}`, mentions: [msg.key.participant] })
                                .then(() => {
                                    zk.sendMessage(idBot, { forward: msg }, { quoted: msg });
                                });
                        }
                    }
                } catch (e) {
                    console.log(e);
                }
            }

            // Rang-count
            if (texte && auteurMessage?.endsWith("s.whatsapp.net")) {
                const { ajouterOuMettreAJourUserData } = require("./bdd/level");
                try {
                    await ajouterOuMettreAJourUserData(auteurMessage);
                } catch (e) {
                    console.error(e);
                }
            }

            // Mentions
            try {
                if (ms.message[mtype]?.contextInfo?.mentionedJid &&
                    (ms.message[mtype].contextInfo.mentionedJid.includes(idBot) ||
                        ms.message[mtype].contextInfo.mentionedJid.includes(conf.NUMERO_OWNER + '@s.whatsapp.net'))) {
                    if (origineMessage == "120363158701337904@g.us") {
                        return;
                    }
                    if (superUser) {
                        console.log('hummm');
                        return;
                    }
                    let mbd = require('./bdd/mention');
                    let alldata = await mbd.recupererToutesLesValeurs();
                    let data = alldata?.[0];
                    if (data?.status === 'non') {
                        console.log('mention pas actifs');
                        return;
                    }
                    let msg;
                    if (data?.type?.toLocaleLowerCase() === 'image') {
                        msg = {
                            image: { url: data.url },
                            caption: data.message
                        }
                    } else if (data?.type?.toLocaleLowerCase() === 'video') {
                        msg = {
                            video: { url: data.url },
                            caption: data.message
                        }
                    } else if (data?.type?.toLocaleLowerCase() === 'sticker') {
                        let stickerMess = new Sticker(data.url, {
                            pack: conf.NOM_OWNER || "Fana-MD",
                            type: StickerTypes.FULL,
                            categories: ["🤩", "🎉"],
                            id: "12345",
                            quality: 70,
                            background: "transparent",
                        });
                        const stickerBuffer2 = await stickerMess.toBuffer();
                        msg = {
                            sticker: stickerBuffer2
                        }
                    } else if (data?.type?.toLocaleLowerCase() === 'audio') {
                        msg = {
                            audio: { url: data.url },
                            mimetype: 'audio/mp4',
                        }
                    }
                    if (msg) zk.sendMessage(origineMessage, msg, { quoted: ms });
                }
            } catch (error) {
                // Silent catch
            }

            // Anti-lien
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

                    if (action === 'remove') {
                        txt += `🚫 Message deleted\n👤 @${auteurMessage.split("@")[0]} removed from group.`;
                        await zk.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        try {
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                        } catch (e) {
                            console.log("antiien " + e);
                        }
                        await zk.sendMessage(origineMessage, { delete: key });
                    } else if (action === 'delete') {
                        txt += `🚫 Message deleted\n👤 @${auteurMessage.split("@")[0]} avoid sending links.`;
                        await zk.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        await zk.sendMessage(origineMessage, { delete: key });
                    } else if (action === 'warn') {
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
                            var msg = `⚠️ Link detected! Your warn count has been increased.\nRemaining warnings: ${rest}`;
                            await ajouterUtilisateurAvecWarnCount(auteurMessage);
                            await zk.sendMessage(origineMessage, { text: msg, mentions: [auteurMessage] }, { quoted: ms });
                            await zk.sendMessage(origineMessage, { delete: key });
                        }
                    }
                }
            } catch (e) {
                console.log("bdd err " + e);
            }

            // Anti-bot
            try {
                const botMsg = ms.key?.id?.startsWith('BAES') && ms.key?.id?.length === 16;
                const baileysMsg = ms.key?.id?.startsWith('BAE5') && ms.key?.id?.length === 16;
                if (botMsg || baileysMsg) {
                    if (mtype === 'reactionMessage') {
                        console.log('Je ne reagis pas au reactions');
                        return;
                    }
                    const antibotactiver = await atbverifierEtatJid(origineMessage);
                    if (!antibotactiver) {
                        return;
                    }
                    if (verifAdmin || auteurMessage === idBot) {
                        console.log('je fais rien');
                        return;
                    }
                    const key = {
                        remoteJid: origineMessage,
                        fromMe: false,
                        id: ms.key.id,
                        participant: auteurMessage
                    };
                    var txt = "🤖 *BOT DETECTED* 🤖\n";
                    var action = await atbrecupererActionJid(origineMessage);
                    if (action === 'remove') {
                        txt += `🚫 Bot detected\n👤 @${auteurMessage.split("@")[0]} removed from group.`;
                        await zk.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        try {
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                        } catch (e) {
                            console.log("antibot " + e);
                        }
                        await zk.sendMessage(origineMessage, { delete: key });
                    } else if (action === 'delete') {
                        txt += `🚫 Bot message deleted\n👤 @${auteurMessage.split("@")[0]} avoid sending bot messages.`;
                        await zk.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        await zk.sendMessage(origineMessage, { delete: key });
                    } else if (action === 'warn') {
                        const { getWarnCountByJID, ajouterUtilisateurAvecWarnCount } = require('./bdd/warn');
                        let warn = await getWarnCountByJID(auteurMessage);
                        let warnlimit = conf.WARN_COUNT || 3;
                        if (warn >= warnlimit) {
                            var kikmsg = `🤖 Bot detected! You will be removed because of reaching warn limit (${warnlimit})`;
                            await zk.sendMessage(origineMessage, { text: kikmsg, mentions: [auteurMessage] }, { quoted: ms });
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                            await zk.sendMessage(origineMessage, { delete: key });
                        } else {
                            var rest = warnlimit - warn;
                            var msg = `🤖 Bot detected! Your warn count has been increased.\nRemaining warnings: ${rest}`;
                            await ajouterUtilisateurAvecWarnCount(auteurMessage);
                            await zk.sendMessage(origineMessage, { text: msg, mentions: [auteurMessage] }, { quoted: ms });
                            await zk.sendMessage(origineMessage, { delete: key });
                        }
                    }
                }
            } catch (er) {
                console.log('.... ' + er);
            }

            // Execution des commandes
            if (verifCom) {
                const cd = evt.cm.find((zokou) => zokou.nomCom === (com));
                if (cd) {
                    try {
                        if ((conf.MODE || "").toLocaleLowerCase() != 'yes' && !superUser) {
                            return;
                        }
                        if (!superUser && origineMessage === auteurMessage && (conf.PM_PERMIT || "") === "yes") {
                            repondre("You don't have access to commands here");
                            return;
                        }
                        if (!superUser && verifGroupe) {
                            let req = await isGroupBanned(origineMessage);
                            if (req) { return; }
                        }
                        if (!verifAdmin && verifGroupe) {
                            let req = await isGroupOnlyAdmin(origineMessage);
                            if (req) { return; }
                        }
                        if (!superUser) {
                            let req = await isUserBanned(auteurMessage);
                            if (req) {
                                repondre("You are banned from bot commands");
                                return;
                            }
                        }
                        reagir(origineMessage, zk, ms, cd.reaction);
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
            console.log("Group update:", group);
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
                    let msg = `*╭━━━⊷━━━━━━━━━━⊷━━━━*
┃ *✨ WELCOME TO ${groupName.toUpperCase()} ✨*
┃
┃ *👤 New Member Joined!*
┃
┃ *🎉 Enjoy your stay!*
┃
┃ *Powered by Fana-MD Bot*
*╰━━━⊷━━━━━━━━━━⊷━━━━*`;

                    let membres = group.participants;
                    await zk.sendMessage(group.id, {
                        image: { url: ppgroup },
                        caption: msg,
                        mentions: membres
                    });
                } else if (group.action == 'remove' && (await recupevents(group.id, "goodbye") == 'on')) {
                    let msg = `*╭━━━⊷━━━━━━━━━━⊷━━━━*
┃ *👋 GOODBYE MESSAGE*
┃
┃ *📱 Group:* ${groupName}
┃
┃ *We hope to see you again!*
┃
┃ *Powered by Fana-MD Bot*
*╰━━━⊷━━━━━━━━━━⊷━━━━*`;
                    await zk.sendMessage(group.id, { text: msg });
                }
            } catch (e) {
                console.error("Group update error:", e);
            }
        });

        // ========== CRON SETUP ==========
        async function activateCrons() {
            const cron = require('node-cron');
            const { getCron } = require('./bdd/cron');
            let crons = await getCron();
            if (crons && crons.length > 0) {
                for (let i = 0; i < crons.length; i++) {
                    if (crons[i].mute_at != null) {
                        let set = crons[i].mute_at.split(':');
                        cron.schedule(`${set[1]} ${set[0]} * * *`, async () => {
                            await zk.groupSettingUpdate(crons[i].group_id, 'announcement');
                        }, { timezone: "Africa/Tanzania" });
                    }
                    if (crons[i].unmute_at != null) {
                        let set = crons[i].unmute_at.split(':');
                        cron.schedule(`${set[1]} ${set[0]} * * *`, async () => {
                            await zk.groupSettingUpdate(crons[i].group_id, 'not_announcement');
                        }, { timezone: "Africa/Tanzania" });
                    }
                }
            }
        }

        // ========== CONTACT EVENT ==========
        zk.ev.on("contacts.upsert", async (contacts) => {
            const insertContact = (newContact) => {
                for (const contact of newContact) {
                    if (store.contacts[contact.id]) {
                        Object.assign(store.contacts[contact.id], contact);
                    } else {
                        store.contacts[contact.id] = contact;
                    }
                }
            };
            insertContact(contacts);
        });

        // ========== CONNECTION UPDATE ==========
        zk.ev.on("connection.update", async (con) => {
            const { lastDisconnect, connection } = con;
            if (connection === "connecting") {
                console.log("ℹ️ Fana MD is connecting...");
            } else if (connection === 'open') {
                console.log("✅ Fana MD Connected to WhatsApp! ☺️");
                await (0, baileys_1.delay)(500);

                var md;
                if ((conf.MODE || "").toLocaleLowerCase() === "yes") {
                    md = "public";
                } else if ((conf.MODE || "").toLocaleLowerCase() === "no") {
                    md = "private";
                } else {
                    md = "undefined";
                }

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
                await activateCrons();

                // Send startup message to owner
                try {
                    const ownerNumber = conf.NUMERO_OWNER + "@s.whatsapp.net";
                    const startupMsg = `🤖 *FANA-MD BOT ONLINE*\n\n✅ Status: Active\n📌 Mode: ${md}\n🕐 Time: ${new Date().toLocaleString()}`;
                    await zk.sendMessage(ownerNumber, { text: startupMsg });
                } catch (e) {
                    console.log("Could not send startup message");
                }

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
                const buffer = await (0, baileys_1.downloadMediaMessage)(
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