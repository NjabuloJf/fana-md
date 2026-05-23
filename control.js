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

const { verifierEtatJid , recupererActionJid } = require("./bdd/antilien");
const { atbverifierEtatJid , atbrecupererActionJid } = require("./bdd/antibot");
let evt = require(__dirname + "/njabulo/fana");
const {isUserBanned , addUserToBanList , removeUserFromBanList} = require("./bdd/banUser");
const  {addGroupToBanList,isGroupBanned,removeGroupFromBanList} = require("./bdd/banGroup");
const {isGroupOnlyAdmin,addGroupToOnlyAdminList,removeGroupFromOnlyAdminList} = require("./bdd/onlyAdmin");
let { reagir } = require(__dirname + "/njabulo/app");

// Import button handler
const { handleButtons } = require("./commands/play0");

var session = conf.session.replace(/Zokou-MD-WHATSAPP-BOT;;;=>/g,"");
const prefixe = conf.PREFIXE;
const more = String.fromCharCode(8206)
const readmore = more.repeat(4001)

// Auto-status configuration
const AUTO_STATUS = {
    READ: conf.AUTO_READ_STATUS === "yes",
    DOWNLOAD: conf.AUTO_DOWNLOAD_STATUS === "yes",
    REACT: true,
    REACT_EMOJI: "✅"
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
        
        // ========== AUTO-STATUS HANDLER ==========
        zk.ev.on("messages.upsert", async (m) => {
            const msg = m.messages[0];
            if (!msg.message) return;
            
            // Handle status messages
            if (msg.key && msg.key.remoteJid === "status@broadcast") {
                console.log("📱 Status received from:", msg.pushName);
                
                // Auto-read status
                if (AUTO_STATUS.READ) {
                    await zk.readMessages([msg.key]);
                    console.log("✅ Status marked as read");
                }
                
                // Auto-react to status
                if (AUTO_STATUS.REACT) {
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
                if (AUTO_STATUS.DOWNLOAD) {
                    try {
                        if (msg.message.extendedTextMessage) {
                            var stTxt = msg.message.extendedTextMessage.text;
                            const botId = zk.user?.id || conf.NUMERO_OWNER + "@s.whatsapp.net";
                            await zk.sendMessage(botId, { text: `📱 *Status Update*\nFrom: ${msg.pushName}\n\n${stTxt}` }, { quoted: msg });
                        }
                        else if (msg.message.imageMessage) {
                            var stMsg = msg.message.imageMessage.caption || "";
                            var stImg = await zk.downloadAndSaveMediaMessage(msg.message.imageMessage);
                            const botId = zk.user?.id || conf.NUMERO_OWNER + "@s.whatsapp.net";
                            await zk.sendMessage(botId, { 
                                image: { url: stImg }, 
                                caption: `📱 *Status Image*\nFrom: ${msg.pushName}\n\n${stMsg}` 
                            });
                        }
                        else if (msg.message.videoMessage) {
                            var stMsg = msg.message.videoMessage.caption || "";
                            var stVideo = await zk.downloadAndSaveMediaMessage(msg.message.videoMessage);
                            const botId = zk.user?.id || conf.NUMERO_OWNER + "@s.whatsapp.net";
                            await zk.sendMessage(botId, {
                                video: { url: stVideo }, 
                                caption: `📱 *Status Video*\nFrom: ${msg.pushName}\n\n${stMsg}`
                            });
                        }
                        console.log("✅ Status downloaded");
                    } catch (e) {
                        console.log("Could not download status:", e.message);
                    }
                }
            }
        });
        
        // ========== BUTTON HANDLER ==========
        // Handle button interactions
        zk.ev.on("messages.upsert", async (m) => {
            const msg = m.messages[0];
            if (!msg.message) return;
            
            // Check for button response
            if (msg.message?.buttonsResponseMessage || 
                msg.message?.listResponseMessage ||
                msg.message?.templateButtonReplyMessage ||
                msg.message?.interactiveResponseMessage) {
                await handleButtons(zk, msg);
            }
        });
        
        // ========== MAIN MESSAGE HANDLER ==========
        zk.ev.on("messages.upsert", async (m) => {
            const { messages } = m;
            const ms = messages[0];
            if (!ms.message) return;
            
            const decodeJid = (jid) => {
                if (!jid) return jid;
                if (/:\d+@/gi.test(jid)) {
                    let decode = (0, baileys_1.jidDecode)(jid) || {};
                    return decode.user && decode.server && decode.user + '@' + decode.server || jid;
                }
                else return jid;
            };
            
            var mtype = (0, baileys_1.getContentType)(ms.message);
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
            const nomAuteurMessage = ms.pushName;
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
                console.log("message provenant du groupe : " + nomGroupe);
            }
            console.log("message envoyé par : " + "[" + nomAuteurMessage + " : " + (auteurMessage?.split("@s.whatsapp.net")[0] || "unknown") + " ]");
            console.log("type de message : " + mtype);
            console.log("------ contenu du message ------");
            console.log(texte);
            
            function groupeAdmin(membreGroupe) {
                let admin = [];
                for (let m of membreGroupe) {
                    if (m.admin == null) continue;
                    admin.push(m.id);
                }
                return admin;
            }
            
            var etat = conf.ETAT || 1;
            if(etat==1) {
                await zk.sendPresenceUpdate("available", origineMessage);
            } else if(etat==2) {
                await zk.sendPresenceUpdate("composing", origineMessage);
            } else if(etat==3) {
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
            if(ms.message.protocolMessage && ms.message.protocolMessage.type === 0 && (conf.ADM || "").toLocaleLowerCase() === 'yes') {
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
                    if(superUser) {
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
            
            // ========== ANTI-LINK WITH BUTTONS ==========
            try {
                const yes = await verifierEtatJid(origineMessage);
                if (texte && (texte.includes('https://') || texte.includes('http://')) && verifGroupe && yes) {
                    console.log("lien detecté");
                    var verifZokAdmin = verifGroupe ? admins.includes(idBot) : false;
                    if(superUser || verifAdmin || !verifZokAdmin) {
                        console.log('je fais rien');
                        return;
                    }
                    const key = {
                        remoteJid: origineMessage,
                        fromMe: false,
                        id: ms.key.id,
                        participant: auteurMessage
                    };
                    
                    // Create buttons for anti-link
                    const buttons = [
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "🌐 WA Channel",
                                id: "backup channel",
                                url: conf.GURL || "https://whatsapp.com/channel/0029Vaa8nZkK"
                            }),
                        },
                    ];
                    
                    var txt = "⚠️ *LINK DETECTED* ⚠️\n";
                    const gifLink = "https://raw.githubusercontent.com/djalega8000/Zokou-MD/main/media/remover.gif";
                    var sticker = new Sticker(gifLink, {
                        pack: 'Fana-Md',
                        author: conf.OWNER_NAME || "Fana-MD",
                        type: StickerTypes.FULL,
                        categories: ['🤩', '🎉'],
                        id: '12345',
                        quality: 50,
                        background: '#000000'
                    });
                    await sticker.toFile("st1.webp");
                    var action = await recupererActionJid(origineMessage);
                    
                    if (action === 'remove') {
                        txt += `🚫 Message deleted\n👤 @${auteurMessage.split("@")[0]} removed from group.`;
                        await zk.sendMessage(origineMessage, { sticker: fs.readFileSync("st1.webp") });
                        await (0, baileys_1.delay)(800);
                        await zk.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        
                        // Send interactive message with button
                        try {
                            await zk.sendMessage(origineMessage, { 
                                interactiveMessage: {
                                    header: { title: "⚠️ ANTI-LINK SYSTEM", hasMedia: false },
                                    body: { text: "This group has anti-link protection enabled. Please avoid sending links." },
                                    footer: { text: "Fana-MD Bot" },
                                    buttons: buttons,
                                    headerType: 1
                                }
                            });
                        } catch (e) {
                            console.log("Interactive message error:", e.message);
                        }
                        
                        try {
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                        } catch (e) {
                            console.log("antiien " + e);
                        }
                        await zk.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } else if (action === 'delete') {
                        txt += `🚫 Message deleted\n👤 @${auteurMessage.split("@")[0]} avoid sending links.`;
                        await zk.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        await zk.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } else if(action === 'warn') {
                        const {getWarnCountByJID, ajouterUtilisateurAvecWarnCount} = require('./bdd/warn');
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
                    if(!antibotactiver) {
                        return;
                    }
                    if(verifAdmin || auteurMessage === idBot) {
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
                    const gifLink = "https://raw.githubusercontent.com/djalega8000/Zokou-MD/main/media/remover.gif";
                    var sticker = new Sticker(gifLink, {
                        pack: 'Fana-Md',
                        author: conf.OWNER_NAME || "Fana-MD",
                        type: StickerTypes.FULL,
                        categories: ['🤩', '🎉'],
                        id: '12345',
                        quality: 50,
                        background: '#000000'
                    });
                    await sticker.toFile("st1.webp");
                    var action = await atbrecupererActionJid(origineMessage);
                    if (action === 'remove') {
                        txt += `🚫 Bot detected\n👤 @${auteurMessage.split("@")[0]} removed from group.`;
                        await zk.sendMessage(origineMessage, { sticker: fs.readFileSync("st1.webp") });
                        await (0, baileys_1.delay)(800);
                        await zk.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        try {
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                        } catch (e) {
                            console.log("antibot " + e);
                        }
                        await zk.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } else if (action === 'delete') {
                        txt += `🚫 Bot message deleted\n👤 @${auteurMessage.split("@")[0]} avoid sending bot messages.`;
                        await zk.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        await zk.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } else if(action === 'warn') {
                        const {getWarnCountByJID, ajouterUtilisateurAvecWarnCount} = require('./bdd/warn');
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
                        if(!verifAdmin && verifGroupe) {
                            let req = await isGroupOnlyAdmin(origineMessage);
                            if (req) { return; }
                        }
                        if(!superUser) {
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
        
        // ========== GROUP PARTICIPANTS UPDATE (WELCOME MESSAGES) ==========
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
                const groupDesc = metadata.desc || "No description";
                
                if (group.action == 'add' && (await recupevents(group.id, "welcome") == 'on')) {
                    let msg = `*╭━━━⊷━━━━━━━━━━⊷━━━━*
┃ *✨ WELCOME TO ${groupName.toUpperCase()} ✨*
┃
┃ *👤 New Member Joined!*
┃
┃ *📝 Description:*
┃ ${groupDesc.substring(0, 50)}...
┃
┃ *📢 Rules:*
┃ • No spam
┃ • No NSFW
┃ • Respect members
┃ • No links without permission
┃
┃ *🎉 Enjoy your stay!*
┃
┃ *Powered by Fana-MD Bot*
*╰━━━⊷━━━━━━━━━━⊷━━━━*`;
                    
                    let membres = group.participants;
                    for (let membre of membres) {
                        msg += `\n┃👋 @${membre.split("@")[0]}`;
                    }
                    msg += `\n*╰━━━⊷━━━━━━━━━━⊷━━━━*`;
                    
                    await zk.sendMessage(group.id, { 
                        image: { url: ppgroup }, 
                        caption: msg, 
                        mentions: membres 
                    });
                    
                    // Send interactive welcome message with buttons
                    const welcomeButtons = [
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📢 Join Channel",
                                id: "channel",
                                url: conf.GURL || "https://whatsapp.com/channel/0029Vaa8nZkK"
                            }),
                        },
                        {
                            name: "quick_reply",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📜 Rules",
                                id: "view_rules"
                            }),
                        }
                    ];
                    
                    try {
                        await zk.sendMessage(group.id, {
                            interactiveMessage: {
                                header: { title: "🎉 WELCOME!", hasMedia: false },
                                body: { text: `Welcome to ${groupName}! Please read the rules and enjoy your stay.` },
                                footer: { text: "Fana-MD Bot" },
                                buttons: welcomeButtons,
                                headerType: 1
                            }
                        });
                    } catch (e) {
                        console.log("Interactive welcome error:", e.message);
                    }
                    
                } else if (group.action == 'remove' && (await recupevents(group.id, "goodbye") == 'on')) {
                    let msg = `*╭━━━⊷━━━━━━━━━━⊷━━━━*
┃ *👋 GOODBYE MESSAGE*
┃
┃ *📱 Group:* ${groupName}
┃
┃ *Member(s) who left:*`;
                    let membres = group.participants;
                    for (let membre of membres) {
                        msg += `\n┃ @${membre.split("@")[0]} 👋`;
                    }
                    msg += `\n┃
┃ *We hope to see you again!*
┃
┃ *Powered by Fana-MD Bot*
*╰━━━⊷━━━━━━━━━━⊷━━━━*`;
                    
                    await zk.sendMessage(group.id, { text: msg, mentions: membres });
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
            console.log("Crons:", crons);
            if (crons && crons.length > 0) {
                for (let i = 0; i < crons.length; i++) {
                    if (crons[i].mute_at != null) {
                        let set = crons[i].mute_at.split(':');
                        console.log(`Setting auto-mute for ${crons[i].group_id} at ${set[0]}:${set[1]}`);
                        cron.schedule(`${set[1]} ${set[0]} * * *`, async () => {
                            await zk.groupSettingUpdate(crons[i].group_id, 'announcement');
                            zk.sendMessage(crons[i].group_id, { 
                                image: { url: './media/chrono.webp' }, 
                                caption: "🔒 *GROUP CLOSED* 🔒\nIt's time to close the group. Sayonara!" 
                            });
                        }, {
                            timezone: "Africa/Tanzania"
                        });
                    }
                    if (crons[i].unmute_at != null) {
                        let set = crons[i].unmute_at.split(':');
                        console.log(`Setting auto-unmute at ${set[0]}:${set[1]}`);
                        cron.schedule(`${set[1]} ${set[0]} * * *`, async () => {
                            await zk.groupSettingUpdate(crons[i].group_id, 'not_announcement');
                            zk.sendMessage(crons[i].group_id, { 
                                image: { url: './media/chrono.webp' }, 
                                caption: "🔓 *GROUP OPENED* 🔓\nGood morning! It's time to open the group." 
                            });
                        }, {
                            timezone: "Africa/Tanzania"
                        });
                    }
                }
            } else {
                console.log('Crons not activated');
            }
            return;
        }
        
        // ========== CONTACT EVENT ==========
        zk.ev.on("contacts.upsert", async (contacts) => {
            const insertContact = (newContact) => {
                for (const contact of newContact) {
                    if (store.contacts[contact.id]) {
                        Object.assign(store.contacts[contact.id], contact);
                    }
                    else {
                        store.contacts[contact.id] = contact;
                    }
                }
                return;
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
                console.log("--");
                await (0, baileys_1.delay)(200);
                console.log("------");
                await (0, baileys_1.delay)(300);
                console.log("------------------/-----");
                console.log("Fana MD is Online 🕸\n\n");
                
                // Wait for user.id to be available
                let waitCount = 0;
                while (!zk.user?.id && waitCount < 10) {
                    await (0, baileys_1.delay)(1000);
                    waitCount++;
                    console.log(`Waiting for bot ID... (${waitCount}/10)`);
                }
                
                if (zk.user?.id) {
                    console.log(`Bot ID: ${zk.user.id}`);
                } else {
                    console.log("Warning: Could not get bot ID");
                }
                
                var md;
                if ((conf.MODE || "").toLocaleLowerCase() === "yes") {
                    md = "public";
                } else if ((conf.MODE || "").toLocaleLowerCase() === "no") {
                    md = "private";
                } else {
                    md = "undefined";
                }
                
                // Send startup message
                if ((conf.DP || "").toLowerCase() === 'yes') {
                    let cmsg = `╭──────────⊷
┊┏━┈┈┈┈┈┈┈⏤͟͟͞͞★
┊┊ *ᯤFANA MD: CONNECTED* 
┊┊ *NAME: FANA MD*
┊┊ *PREFIX: [ ${prefixe} ]*
┊┊ *MODE:* ${md}
┊┗━┈┈┈┈┈┈┈┈━
╰───────────⊷`;
                    
                    try {
                        if (zk.user?.id) {
                            await zk.sendMessage(zk.user.id, { text: cmsg });
                            console.log("Startup message sent to bot number");
                        } else {
                            const ownerNumber = conf.NUMERO_OWNER + "@s.whatsapp.net";
                            await zk.sendMessage(ownerNumber, { text: cmsg });
                            console.log("Startup message sent to owner");
                        }
                    } catch (err) {
                        console.log("Could not send startup message:", err.message);
                    }
                }
                
                // Loading commands
                console.log("Loading Commands ...\n");
                if (fs.existsSync(__dirname + "/src")) {
                    fs.readdirSync(__dirname + "/src").forEach((fichier) => {
                        if (path.extname(fichier).toLowerCase() == (".js")) {
                            try {
                                require(__dirname + "/src/" + fichier);
                                console.log(fichier + " Installed Successfully✔️");
                            } catch (e) {
                                console.log(`${fichier} could not be installed due to : ${e}`);
                            }
                            (0, baileys_1.delay)(300);
                        }
                    });
                } else {
                    console.log("No commands folder found");
                }
                (0, baileys_1.delay)(700);
                console.log("Commands Installation Completed ✅");
                
                await activateCrons();
                
                // Send running message with button
                if ((conf.DP || "").toLowerCase() === 'yes') {
                    let runningButtons = [
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "🌐 Support Channel",
                                id: "support",
                                url: conf.GURL || "https://whatsapp.com/channel/0029Vaa8nZkK"
                            }),
                        }
                    ];
                    
                    let cmsg = `❒─❒ *BOT IS RUNNING* ❒─❒
╭❒─❒─❒─❒─❒              
❒ *DEV* : NJABULO   
❒ *BOT* : FANA-MD
╰❒─❒─❒─❒─❒`;
                    
                    try {
                        if (zk.user?.id) {
                            await zk.sendMessage(zk.user.id, { 
                                interactiveMessage: {
                                    header: { title: "🤖 BOT STATUS", hasMedia: false },
                                    body: { text: cmsg },
                                    footer: { text: "Fana-MD Bot" },
                                    buttons: runningButtons,
                                    headerType: 1
                                }
                            });
                        } else {
                            const ownerNumber = conf.NUMERO_OWNER + "@s.whatsapp.net";
                            await zk.sendMessage(ownerNumber, { text: cmsg });
                        }
                    } catch (err) {
                        console.log("Could not send running message:", err.message);
                    }
                }
            } else if (connection == "close") {
                let raisonDeconnexion = new boom_1.Boom(lastDisconnect?.error)?.output.statusCode;
                if (raisonDeconnexion === baileys_1.DisconnectReason.badSession) {
                    console.log('Session id error, rescan again...');
                } else if (raisonDeconnexion === baileys_1.DisconnectReason.connectionClosed) {
                    console.log('!!! connexion fermée, reconnexion en cours ...');
                    main();
                } else if (raisonDeconnexion === baileys_1.DisconnectReason.connectionLost) {
                    console.log('connection error 😞 ,,, trying to reconnect... ');
                    main();
                } else if (raisonDeconnexion === baileys_1.DisconnectReason?.connectionReplaced) {
                    console.log('connexion replacée, une session est déjà ouverte veuillez la fermer svp !!!');
                } else if (raisonDeconnexion === baileys_1.DisconnectReason.loggedOut) {
                    console.log('vous êtes déconnecté,,, veuillez rescanner le code qr svp');
                } else if (raisonDeconnexion === baileys_1.DisconnectReason.restartRequired) {
                    console.log('redémarrage en cours ▶️');
                    main();
                } else {
                    console.log('redemarrage sur le coup de l\'erreur ', raisonDeconnexion);
                    const { exec } = require("child_process");
                    exec("pm2 restart all");
                }
                console.log("hum " + connection);
                main();
            }
        });
        
        zk.ev.on("creds.update", saveCreds);
        
        // Download and save media message
        zk.downloadAndSaveMediaMessage = async (message, filename = '') => {
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
        
        // Await for message function
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
                };
                zk.ev.on('messages.upsert', listener);
                if (timeout) {
                    interval = setTimeout(() => {
                        zk.ev.off('messages.upsert', listener);
                        reject(new Error('Timeout'));
                    }, timeout);
                }
            });
        };
        
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