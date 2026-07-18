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
const { translateText } = require("./translate");
const { languageNames } = require("./language");

var session = conf.session.replace(/Zokou-MD-WHATSAPP-BOT;;;=>/g,"");
const prefixe = conf.PREFIXE;
const more = String.fromCharCode(8206)
const readmore = more.repeat(4001)

console.log("✅ Using Baileys from github:xhclintohn/Baileys");

// ========== BUTTON HANDLER ==========
const { handleButtons } = require("./commands/play0");

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
        return await translateText(text, lang);
    } catch {
        return text;
    }
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
            shouldSyncHistoryMessage: true,
            downloadHistory: true,
            syncFullHistory: true,
            generateHighQualityLinkPreview: true,
            markOnlineOnConnect: false,
            keepAliveIntervalMs: 30_000,
            auth: {
                creds: state.creds,
                keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, logger),
            },
            getMessage: async (key) => {
                if (store) {
                    const msg = await store.loadMessage(key.remoteJid, key.id, undefined);
                    return msg.message || undefined;
                }
                return {
                    conversation: 'An Error Occurred, Repeat Command!'
                };
            }
        };
        const zk = (0, baileys_1.default)(sockOptions);
        store.bind(zk.ev);

        // List of image URLs
        const njabulox = [
            "https://files.catbox.moe/iii5jv.jpg",
            "https://files.catbox.moe/xjeyjh.jpg",
            "https://files.catbox.moe/mh36c7.jpg",
            "https://files.catbox.moe/u6v5ir.jpg",
            "https://files.catbox.moe/bnb3vx.jpg"
        ];
        const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

        const buttons = [
            {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                    display_text: "🌐 WA Channel",
                    id: "backup channel",
                    url: "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u"
                }),
            },
        ];

        // ========== BUTTON HANDLER EVENT ==========
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
            
            const mtype = (0, baileys_1.getContentType)(ms.message);
            
            if (mtype === "reactionMessage") return;
            if (mtype === "protocolMessage") {
                console.log("⏭️ Skipping protocol message");
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
            var auteurMessage = verifGroupe ? (ms.key.participant ? ms.key.participant : ms.participant) : origineMessage;
            if (ms.key.fromMe) auteurMessage = idBot;

            var membreGroupe = verifGroupe ? ms.key.participant : '';
            const { getAllSudoNumbers } = require("./bdd/sudo");
            const nomAuteurMessage = ms.pushName || "Unknown";
            const sudo = await getAllSudoNumbers();
            const superUserNumbers = [servBot, conf.NUMERO_OWNER].map((s) => s.replace(/[^0-9]/g) + "@s.whatsapp.net");
            const allAllowedNumbers = superUserNumbers.concat(sudo);
            const superUser = allAllowedNumbers.includes(auteurMessage);
            var dev = [conf.NUMERO_OWNER].map((t) => t.replace(/[^0-9]/g) + "@s.whatsapp.net").includes(auteurMessage);
            
            const lang = getLang();
            
            // ========== TRANSLATED REPONDRE FUNCTION ==========
            async function repondre(mes) {
                try {
                    const translated = await translateText(mes, lang);
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

            // ========== ANTI-LINK WITH PERSONAL IMAGE AND LANGUAGE ==========
            try {
                const yes = await verifierEtatJid(origineMessage);
                if (texte && (texte.includes('https://') || texte.includes('http://') || texte.includes('chat.whatsapp.com')) && verifGroupe && yes) {
                    console.log("🔗 LINK DETECTED");
                    var verifZokAdmin = verifGroupe ? admins.includes(idBot) : false;
                    if(superUser || verifAdmin || !verifZokAdmin) {
                        console.log('⏭️ Skipping action');
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
                        txt += `👤 @${auteurMessage.split("@")[0]} ` + await translateMessage('link_removed', lang);
                        await zk.sendMessage(origineMessage, { sticker: fs.readFileSync("st1.webp") });
                        await (0, baileys_1.delay)(800);
                        await zk.sendMessage(origineMessage, { 
                            image: { url: userPP || randomNjabulourl }, 
                            caption: txt, 
                            mentions: [auteurMessage] 
                        }, { quoted: ms });
                        try {
                            await zk.groupParticipantsUpdate(origineMessage, [auteurMessage], "remove");
                        } catch (e) {}
                        await zk.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } 
                    else if (action === 'delete') {
                        txt += await translateMessage('link_deleted', lang) + "\n";
                        txt += `👤 @${auteurMessage.split("@")[0]} ` + await translateMessage('link_warning', lang);
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

            // ========== ANTI-BOT WITH PERSONAL IMAGE AND LANGUAGE ==========
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
                        txt += `\n👤 @${auteurMessage.split("@")[0]}`;
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
                        txt += `\n👤 @${auteurMessage.split("@")[0]}`;
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
                        if (verifGroupe) {
                            if ((conf.MODE || "").toLowerCase() != 'yes' && !superUser) {
                                console.log("Bot is in private mode for groups");
                                return;
                            }
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
                                repondre("❌ You are banned from bot commands");
                                return;
                            }
                        }
                        
                        reagir(origineMessage, zk, ms, cd.reaction);
                        cd.fonction(origineMessage, zk, commandeOptions);
                    }
                    catch (e) {
                        console.log("Error:", e);
                        const translatedError = await translateText("❌ Error: " + e.message, lang);
                        zk.sendMessage(origineMessage, { text: translatedError }, { quoted: ms });
                    }
                }
            }
        });

        // ========== GROUP PARTICIPANTS UPDATE (WELCOME & GOODBYE WITH LANGUAGE) ==========
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
                if (typeof jid !== 'string') {
                    jid = String(jid);
                }
                return jid.split('@')[0];
            } catch (e) {
                return "Unknown";
            }
        }
        
        zk.ev.on('group-participants.update', async (group) => {
            console.log("📢 Group update detected");
            
            const lang = getLang();
            
            let ppgroup;
            try {
                ppgroup = await zk.profilePictureUrl(group.id, 'image');
            } catch {
                ppgroup = randomNjabulourl;
            }
            
            try {
                const metadata = await zk.groupMetadata(group.id);
                const groupName = metadata.subject;
                const participantCount = metadata.participants.length;
                const currentTime = new Date();
                const joinTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const joinDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                
                // WELCOME
                if (group.action == 'add' && (await recupevents(group.id, "welcome") == 'on')) {
                    for (const participant of group.participants) {
                        try {
                            const memberJid = participant;
                            const memberName = await getName(memberJid);
                            const memberPP = await getProfilePic(memberJid);
                            
                            const welcomeTitle = await translateMessage('welcome', lang);
                            const welcomeHello = await translateMessage('welcome_hello', lang);
                            const welcomeRules = await translateMessage('welcome_rules', lang);
                            const welcomeEnjoy = await translateMessage('welcome_enjoy', lang);
                            const membersT = await translateMessage('members', lang);
                            const joinedAt = await translateMessage('joined_at', lang);
                            const dateT = await translateMessage('date', lang);
                            
                            const welcomeMsg = `╭━━━━━━━━━━━━━━━━━━━━━━╮
┃     ${welcomeTitle}
┃
┃ ${welcomeHello} ${memberName}!
┃
┃ 📱 *${await translateMessage('group', lang)}:* ${groupName}
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
                            console.error(`Welcome error:`, memberError);
                        }
                    }
                }
                
                // GOODBYE
                if (group.action == 'remove' && (await recupevents(group.id, "goodbye") == 'on')) {
                    for (const participant of group.participants) {
                        try {
                            const memberJid = participant;
                            const memberName = await getName(memberJid);
                            
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
                            console.error(`Goodbye error:`, memberError);
                        }
                    }
                }
            } catch (e) {
                console.error("Group update error:", e);
            }
        });

        // ========== CONNECTION UPDATE ==========
        zk.ev.on("connection.update", async (con) => {
            const { lastDisconnect, connection } = con;
            if (connection === "connecting") {
                console.log("ℹ️ NJABULO MD is connecting...");
            }
            else if (connection === 'open') {
                console.log("✅ NJABULO MD Connected to WhatsApp! ☺️");
                console.log("--");
                await (0, baileys_1.delay)(200);
                console.log("------");
                await (0, baileys_1.delay)(300);
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
                
                (0, baileys_1.delay)(700);
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
                    console.log("✅ Startup message sent to owner DM");
                } catch (e) {}
                
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