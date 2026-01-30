const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const router = express.Router();
const pino = require('pino');
const cheerio = require('cheerio');
const { Octokit } = require('@octokit/rest');
const moment = require('moment-timezone');
const Jimp = require('jimp');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require("form-data");
const os = require('os'); 
const { sms, downloadMediaMessage } = require("./msg");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    getContentType,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser,
    downloadContentFromMessage,
    proto,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    S_WHATSAPP_NET
} = require('@whiskeysockets/baileys');

const config = {
    AUTO_VIEW_STATUS: 'true',
    AUTO_LIKE_STATUS: 'true',
    AUTO_RECORDING: 'true',
    AUTO_LIKE_EMOJI: ['💋', '😶', '✨️', '💗', '🎈', '🎉', '🥳', '❤️', '🧫', '🐭'],
    PREFIX: '.',
    MAX_RETRIES: 3,
    IMAGE_PATH: 'https://files.catbox.moe/mh36c7.jpg',
    GROUP_INVITE_LINK: 'https://chat.whatsapp.com/HFUKihXr4qp9TjWiGATE8h?mode=ems_copy_t',
    ADMIN_LIST_PATH: './admin.json',
    RCD_IMAGE_PATH: 'https://files.catbox.moe/mh36c7.jpg',
    NEWSLETTER_JID: '120363352087070233@newsletter',
    NEWSLETTER_MESSAGE_ID: '428',
    OTP_EXPIRY: 300000,
    version: '1.0.0',
    OWNER_NUMBER: '255753668403',
    BOT_FOOTER: '╭••➤Njabulo Jb',
    CHANNEL_LINK: 'https://whatsapp.com/channel/0029VasiOoR3bbUw5aV4qB31'
};

const octokit = new Octokit({ auth: 'Ve7nyoWuYsZMIVT403m2Lctqejy90jF3h5' });
const owner = 'NjabuloJf';
const repo = 'fana-md';

const activeSockets = new Map();
const socketCreationTime = new Map();
const SESSION_BASE_PATH = './session';
const NUMBER_LIST_PATH = './numbers.json';
const otpStore = new Map();

if (!fs.existsSync(SESSION_BASE_PATH)) {
    fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });
}

function loadAdmins() {
    try {
        if (fs.existsSync(config.ADMIN_LIST_PATH)) {
            return JSON.parse(fs.readFileSync(config.ADMIN_LIST_PATH, 'utf8'));
        }
        return [];
    } catch (error) {
        console.error('Failed to load admin list:', error);
        return [];
    }
}


function formatMessage(title, content, footer) {
    return `*${title}*\n\n${content}\n\n> *${footer}*`;
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getSriLankaTimestamp() {
    return moment().tz('Africa/Nairobi').format('YYYY-MM-DD HH:mm:ss');
}


async function cleanDuplicateFiles(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'session'
        });

        const sessionFiles = data.filter(file => 
            file.name.startsWith(`empire_${sanitizedNumber}_`) && file.name.endsWith('.json')
        ).sort((a, b) => {
            const timeA = parseInt(a.name.match(/empire_\d+_(\d+)\.json/)?.[1] || 0);
            const timeB = parseInt(b.name.match(/empire_\d+_(\d+)\.json/)?.[1] || 0);
            return timeB - timeA;
        });

        const configFiles = data.filter(file => 
            file.name === `config_${sanitizedNumber}.json`
        );

        if (sessionFiles.length > 1) {
            for (let i = 1; i < sessionFiles.length; i++) {
                await octokit.repos.deleteFile({
                    owner,
                    repo,
                    path: `session/${sessionFiles[i].name}`,
                    message: `Delete duplicate session file for ${sanitizedNumber}`,
                    sha: sessionFiles[i].sha
                });
                console.log(`Deleted duplicate session file: ${sessionFiles[i].name}`);
            }
        }

        if (configFiles.length > 0) {
            console.log(`Config file for ${sanitizedNumber} already exists`);
        }
    } catch (error) {
        console.error(`Failed to clean duplicate files for ${number}:`, error);
    }
}

// Count total commands in pair.js
let totalcmds = async () => {
  try {
    const filePath = "./pair.js";
    const mytext = await fs.readFile(filePath, "utf-8");

    // Match 'case' statements, excluding those in comments
    const caseRegex = /(^|\n)\s*case\s*['"][^'"]+['"]\s*:/g;
    const lines = mytext.split("\n");
    let count = 0;

    for (const line of lines) {
      // Skip lines that are comments
      if (line.trim().startsWith("//") || line.trim().startsWith("/*")) continue;
      // Check if line matches case statement
      if (line.match(/^\s*case\s*['"][^'"]+['"]\s*:/)) {
        count++;
      }
    }

    return count;
  } catch (error) {
    console.error("Error reading pair.js:", error.message);
    return 0; // Return 0 on error to avoid breaking the bot
  }
  }

async function joinGroup(socket) {
    let retries = config.MAX_RETRIES || 3;
    let inviteCode = 'CehDJZixGGA2LBA7EgUGaL'; // Hardcoded default
    if (config.GROUP_INVITE_LINK) {
        const cleanInviteLink = config.GROUP_INVITE_LINK.split('?')[0]; // Remove query params
        const inviteCodeMatch = cleanInviteLink.match(/chat\.whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9_-]+)/);
        if (!inviteCodeMatch) {
            console.error('Invalid group invite link format:', config.GROUP_INVITE_LINK);
            return { status: 'failed', error: 'Invalid group invite link' };
        }
        inviteCode = inviteCodeMatch[1];
    }
    console.log(`Attempting to join group with invite code: ${inviteCode}`);

    while (retries > 0) {
        try {
            const response = await socket.groupAcceptInvite(inviteCode);
            console.log('Group join response:', JSON.stringify(response, null, 2)); // Debug response
            if (response?.gid) {
                console.log(`[ ✅ ] Successfully joined group with ID: ${response.gid}`);
                return { status: 'success', gid: response.gid };
            }
            throw new Error('No group ID in response');
        } catch (error) {
            retries--;
            let errorMessage = error.message || 'Unknown error';
            if (error.message.includes('not-authorized')) {
                errorMessage = 'Bot is not authorized to join (possibly banned)';
            } else if (error.message.includes('conflict')) {
                errorMessage = 'Bot is already a member of the group';
            } else if (error.message.includes('gone') || error.message.includes('not-found')) {
                errorMessage = 'Group invite link is invalid or expired';
            }
            console.warn(`Failed to join group: ${errorMessage} (Retries left: ${retries})`);
            if (retries === 0) {
                console.error('[ ❌ ] Failed to join group', { error: errorMessage });
                try {
                    await socket.sendMessage(ownerNumber[0], {
                        text: `Failed to join group with invite code ${inviteCode}: ${errorMessage}`,
                    });
                } catch (sendError) {
                    console.error(`Failed to send failure message to owner: ${sendError.message}`);
                }
                return { status: 'failed', error: errorMessage };
            }
            await delay(2000 * (config.MAX_RETRIES - retries + 1));
        }
    }
    return { status: 'failed', error: 'Max retries reached' };
}




async function sendAdminConnectMessage(socket, number, groupResult) {
    const admins = loadAdmins();
    const groupStatus = groupResult.status === 'success'
        ? `Joined (ID: ${groupResult.gid})`
        : `Failed to join group: ${groupResult.error}`;
  
  const caption = formatMessage(
    '*ᴄᴏɴɴᴇᴄᴛᴇᴅ sᴜᴄᴄᴇssғᴜʟ ✅*',
    `📞 ɴᴜᴍʙᴇʀ: ${number}\n🩵 sᴛᴀᴛᴜs: Online\n🏠 ɢʀᴏᴜᴘ sᴛᴀᴛᴜs: ${groupStatus}\n⏰ ᴄᴏɴɴᴇᴄᴛᴇᴅ: ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })}`,
    `${config.BOT_FOOTER}`
  );

  const message = {
    document: {url: "https://files.catbox.moe/dfe0h0.jpg",},
    mimetype: 'application/pdf',
    fileName: 'WhatsApp PDF 10GB',
    caption,
    contextInfo: {
      externalAdReply: {
        title: "njabulo small alive🛒",
        mediaType: 1,
        previewType: 0,
        thumbnailUrl: "https://files.catbox.moe/mh36c7.jpg",
        renderLargerThumbnail: true,
      },
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363399999197102@newsletter",
        newsletterName: "╭••➤Njabulo Jb",
        serverMessageId: 143,
      },
      forwardingScore: 999,
    }
  };

  for (const admin of admins) {
    try {
      await socket.sendMessage(`${admin}@s.whatsapp.net`, message);
      console.log(`Connect message sent to admin ${admin}`);
    } catch (error) {
      console.error(`Failed to send connect message to admin ${admin}:`, error.message);
    }
  }
}


// Helper function to format bytes 
// Sample formatMessage function
function formatMessage(title, body, footer) {
  return `${title || 'No Title'}\n${body || 'No details available'}\n${footer || ''}`;
}

// Sample formatBytes function
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function sendOTP(socket, number, otp) {
    const userJid = jidNormalizedUser(socket.user.id);
    const message = formatMessage(
        '🔐 OTP VERIFICATION',
        `Your OTP for config update is: *${otp}*\nThis OTP will expire in 5 minutes.`,
        'Pσɯҽɾԃ Ⴆყ ɳʝαႦυʅσ ʝႦ'
    );

    try {
        await socket.sendMessage(userJid, { text: message });
        console.log(`OTP ${otp} sent to ${number}`);
    } catch (error) {
        console.error(`Failed to send OTP to ${number}:`, error);
        throw error;
    }
}

function setupNewsletterHandlers(socket) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];
        if (!message?.key) return;

        const allNewsletterJIDs = await loadNewsletterJIDsFromRaw();
        const jid = message.key.remoteJid;

        if (!allNewsletterJIDs.includes(jid)) return;

        try {
            const emojis = ['🩵', '🫶', '😀', '👍', '😶'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            const messageId = message.newsletterServerId;

            if (!messageId) {
                console.warn('No newsletterServerId found in message:', message);
                return;
            }

            let retries = 3;
            while (retries-- > 0) {
                try {
                    await socket.newsletterReactMessage(jid, messageId.toString(), randomEmoji);
                    console.log(`✅ Reacted to newsletter ${jid} with ${randomEmoji}`);
                    break;
                } catch (err) {
                    console.warn(`❌ Reaction attempt failed (${3 - retries}/3):`, err.message);
                    await delay(1500);
                }
            }
        } catch (error) {
            console.error('⚠️ Newsletter reaction handler failed:', error.message);
        }
    });
}

async function setupStatusHandlers(socket) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const message = messages[0];
        if (!message?.key || message.key.remoteJid !== 'status@broadcast' || !message.key.participant || message.key.remoteJid === config.NEWSLETTER_JID) return;

        try {
            if (config.AUTO_RECORDING === 'true' && message.key.remoteJid) {
                await socket.sendPresenceUpdate("recording", message.key.remoteJid);
            }

            if (config.AUTO_VIEW_STATUS === 'true') {
                let retries = config.MAX_RETRIES;
                while (retries > 0) {
                    try {
                        await socket.readMessages([message.key]);
                        break;
                    } catch (error) {
                        retries--;
                        console.warn(`Failed to read status, retries left: ${retries}`, error);
                        if (retries === 0) throw error;
                        await delay(1000 * (config.MAX_RETRIES - retries));
                    }
                }
            }

            if (config.AUTO_LIKE_STATUS === 'true') {
                const randomEmoji = config.AUTO_LIKE_EMOJI[Math.floor(Math.random() * config.AUTO_LIKE_EMOJI.length)];
                let retries = config.MAX_RETRIES;
                while (retries > 0) {
                    try {
                        await socket.sendMessage(
                            message.key.remoteJid,
                            { react: { text: randomEmoji, key: message.key } },
                            { statusJidList: [message.key.participant] }
                        );
                        console.log(`Reacted to status with ${randomEmoji}`);
                        break;
                    } catch (error) {
                        retries--;
                        console.warn(`Failed to react to status, retries left: ${retries}`, error);
                        if (retries === 0) throw error;
                        await delay(1000 * (config.MAX_RETRIES - retries));
                    }
                }
            }
        } catch (error) {
            console.error('Status handler error:', error);
        }
    });
}

async function handleMessageRevocation(socket, number) {
    socket.ev.on('messages.delete', async ({ keys }) => {
        if (!keys || keys.length === 0) return;

        const messageKey = keys[0];
        const userJid = jidNormalizedUser(socket.user.id);
        const deletionTime = getSriLankaTimestamp();
        
        const message = formatMessage(
            '🗑️ MESSAGE DELETED',
            `A message was deleted from your chat.\n📋 From: ${messageKey.remoteJid}\n🍁 Deletion Time: ${deletionTime}`,
            'Pσɯҽɾԃ Ⴆყ ɳʝαႦυʅσ ʝႦ'
        );

        try {
            await socket.sendMessage(userJid, {
                image: { url: config.RCD_IMAGE_PATH },
                caption: message
            });
            console.log(`Notified ${number} about message deletion: ${messageKey.id}`);
        } catch (error) {
            console.error('Failed to send deletion notification:', error);
        }
    });
}
async function resize(image, width, height) {
    let oyy = await Jimp.read(image);
    let kiyomasa = await oyy.resize(width, height).getBufferAsync(Jimp.MIME_JPEG);
    return kiyomasa;
}

function capital(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const createSerial = (size) => {
    return crypto.randomBytes(size).toString('hex').slice(0, size);
}
async function oneViewmeg(socket, isOwner, msg, sender) {
    if (!isOwner) {
        await socket.sendMessage(sender, {
            text: '❌ *ᴏɴʟʏ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴠɪᴇᴡ ᴏɴᴄᴇ ᴍᴇssᴀɢᴇs!*'
        });
        return;
    }
    try {
        const quoted = msg;
        let cap, anu;
        if (quoted.imageMessage?.viewOnce) {
            cap = quoted.imageMessage.caption || "";
            anu = await socket.downloadAndSaveMediaMessage(quoted.imageMessage);
            await socket.sendMessage(sender, { image: { url: anu }, caption: cap });
        } else if (quoted.videoMessage?.viewOnce) {
            cap = quoted.videoMessage.caption || "";
            anu = await socket.downloadAndSaveMediaMessage(quoted.videoMessage);
            await socket.sendMessage(sender, { video: { url: anu }, caption: cap });
        } else if (quoted.audioMessage?.viewOnce) {
            cap = quoted.audioMessage.caption || "";
            anu = await socket.downloadAndSaveMediaMessage(quoted.audioMessage);
            await socket.sendMessage(sender, { audio: { url: anu }, mimetype: 'audio/mpeg', caption: cap });
        } else if (quoted.viewOnceMessageV2?.message?.imageMessage) {
            cap = quoted.viewOnceMessageV2.message.imageMessage.caption || "";
            anu = await socket.downloadAndSaveMediaMessage(quoted.viewOnceMessageV2.message.imageMessage);
            await socket.sendMessage(sender, { image: { url: anu }, caption: cap });
        } else if (quoted.viewOnceMessageV2?.message?.videoMessage) {
            cap = quoted.viewOnceMessageV2.message.videoMessage.caption || "";
            anu = await socket.downloadAndSaveMediaMessage(quoted.viewOnceMessageV2.message.videoMessage);
            await socket.sendMessage(sender, { video: { url: anu }, caption: cap });
        } else if (quoted.viewOnceMessageV2Extension?.message?.audioMessage) {
            cap = quoted.viewOnceMessageV2Extension.message.audioMessage.caption || "";
            anu = await socket.downloadAndSaveMediaMessage(quoted.viewOnceMessageV2Extension.message.audioMessage);
            await socket.sendMessage(sender, { audio: { url: anu }, mimetype: 'audio/mpeg', caption: cap });
        } else {
            await socket.sendMessage(sender, {
                text: '❌ *Not a valid view-once message, love!* 😢'
            });
        }
        if (anu && fs.existsSync(anu)) fs.unlinkSync(anu); // Clean up temporary file
    } catch (error) {
        console.error('oneViewmeg error:', error);
        await socket.sendMessage(sender, {
            text: `❌ *Failed to process view-once message, babe!* 😢\nError: ${error.message || 'Unknown error'}`
        });
    }
}

function setupCommandHandlers(socket, number) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid === config.NEWSLETTER_JID) return;

        const type = getContentType(msg.message);
        if (!msg.message) return;
        msg.message = (getContentType(msg.message) === 'ephemeralMessage') ? msg.message.ephemeralMessage.message : msg.message;
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const m = sms(socket, msg);
        const quoted =
            type == "extendedTextMessage" &&
            msg.message.extendedTextMessage.contextInfo != null
              ? msg.message.extendedTextMessage.contextInfo.quotedMessage || []
              : [];
        const body = (type === 'conversation') ? msg.message.conversation 
            : msg.message?.extendedTextMessage?.contextInfo?.hasOwnProperty('quotedMessage') 
                ? msg.message.extendedTextMessage.text 
            : (type == 'interactiveResponseMessage') 
                ? msg.message.interactiveResponseMessage?.nativeFlowResponseMessage 
                    && JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson)?.id 
            : (type == 'templateButtonReplyMessage') 
                ? msg.message.templateButtonReplyMessage?.selectedId 
            : (type === 'extendedTextMessage') 
                ? msg.message.extendedTextMessage.text 
            : (type == 'imageMessage') && msg.message.imageMessage.caption 
                ? msg.message.imageMessage.caption 
            : (type == 'videoMessage') && msg.message.videoMessage.caption 
                ? msg.message.videoMessage.caption 
            : (type == 'buttonsResponseMessage') 
                ? msg.message.buttonsResponseMessage?.selectedButtonId 
            : (type == 'listResponseMessage') 
                ? msg.message.listResponseMessage?.singleSelectReply?.selectedRowId 
            : (type == 'messageContextInfo') 
                ? (msg.message.buttonsResponseMessage?.selectedButtonId 
                    || msg.message.listResponseMessage?.singleSelectReply?.selectedRowId 
                    || msg.text) 
            : (type === 'viewOnceMessage') 
                ? msg.message[type]?.message[getContentType(msg.message[type].message)] 
            : (type === "viewOnceMessageV2") 
                ? (msg.message[type]?.message?.imageMessage?.caption || msg.message[type]?.message?.videoMessage?.caption || "") 
            : '';
        let sender = msg.key.remoteJid;
        const nowsender = msg.key.fromMe ? (socket.user.id.split(':')[0] + '@s.whatsapp.net' || socket.user.id) : (msg.key.participant || msg.key.remoteJid);
        const senderNumber = nowsender.split('@')[0];
        const developers = `${config.OWNER_NUMBER}`;
        const botNumber = socket.user.id.split(':')[0];
        const isbot = botNumber.includes(senderNumber);
        const isOwner = isbot ? isbot : developers.includes(senderNumber);
        var prefix = config.PREFIX;
        var isCmd = body.startsWith(prefix);
        const from = msg.key.remoteJid;
        const isGroup = from.endsWith("@g.us");
        const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '.';
        var args = body.trim().split(/ +/).slice(1);

        // Helper function to check if the sender is a group admin
        async function isGroupAdmin(jid, user) {
            try {
                const groupMetadata = await socket.groupMetadata(jid);
                const participant = groupMetadata.participants.find(p => p.id === user);
                return participant?.admin === 'admin' || participant?.admin === 'superadmin' || false;
            } catch (error) {
                console.error('Error checking group admin status:', error);
                return false;
            }
        }

        const isSenderGroupAdmin = isGroup ? await isGroupAdmin(from, nowsender) : false;

        socket.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
            let quoted = message.msg ? message.msg : message;
            let mime = (message.msg || message).mimetype || '';
            let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
            const stream = await downloadContentFromMessage(quoted, messageType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            let type = await FileType.fromBuffer(buffer);
            trueFileName = attachExtension ? (filename + '.' + type.ext) : filename;
            await fs.writeFileSync(trueFileName, buffer);
            return trueFileName;
        };

        if (!command) return;
        const count = await totalcmds();

        // Define fakevCard for quoting messages





        const fakevCard = {
            key: {
                fromMe: false,
                participant: "0@s.whatsapp.net",
                remoteJid: "status@broadcast"
            },
            message: {
                contactMessage: {
                    displayName: "ɳʝαႦυʅσ ʝႦ",
                    displayMessage: "Hello, this is a message!",
                    displayCopy: "Copy this text!",
                    displayCart: "🛒 Cart is full!",
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Meta\nORG:META AI;\nTEL;type=CELL;type=VOICE;waid=254101022551:+254101022551\nEND:VCARD`
                }
            }
        };

        



        try {
            switch (command) {
                // Case: alive
             
case 'alive': {
  try {
    await socket.sendMessage(sender, { react: { text: '🔮', key: msg.key } });
            const startTime = socketCreationTime.get(number) || Date.now();
                        const uptime = Math.floor((Date.now() - startTime) / 1000);
                        const hours = Math.floor(uptime / 3600);
                        const minutes = Math.floor((uptime % 3600) / 60);
                        const seconds = Math.floor(uptime % 60);
      
    const captionText = ` *╭ׂ─ׂ┄『• ɴᴊᴀʙᴜʟᴏ-ᴊʙ•』┴*
│╭ׂ─ׂ┄─ׅ─ׂ┄╮ 
┴│
❒│▸ ▢ ᴀᴄᴛɪᴠᴇ ʙᴏᴛs: ${activeSockets.size} 
❒│▸ ▢ ʏᴏᴜʀ ɴᴜᴍʙᴇʀ: ${number} 
❒│▸ ▢ ᴠᴇʀsɪᴏɴ: ${config.version} 
❒│▸ ▢ ᴍᴇᴍᴏʀʏ ᴜsᴀɢᴇ: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}ᴍʙ 
┬│
│╰─ׂ┄─ׅ─ׂ┄╯
╰─┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ─ׂ┄┴`;
    const aliveMessage = {
      document: {url: "https://files.catbox.moe/dfe0h0.jpg",},
      mimetype: 'application/pdf',
      fileName: 'WhatsApp PDF 10GB',
      caption: `${captionText}`,
      buttons: [
        {
          buttonId: `${config.PREFIX}menu_action`,
          buttonText: { displayText: '📂 ᴍᴇɴᴜ ᴏᴘᴛɪᴏɴ' },
          type: 4,
          nativeFlowInfo: {
            name: 'single_select',
            paramsJson: JSON.stringify({
              title: 'ＮＪＡＢＵＬＯ ＳＭＡＬＬ',
              sections: [
                {
                  title: `ＮＪＡＢＵＬＯ ＪＢ`,
                  highlight_label: 'Quick Actions',
                  rows: [
                    {
                      title: '📋 ғᴜʟʟ ᴍᴇɴᴜ',
                      description: 'ᴠɪᴇᴡ ᴀʟʟ ᴀᴠᴀɪʟᴀʙʟᴇ ᴄᴍᴅs',
                      id: `${config.PREFIX}menu`
                    },
                    {
                      title: '💓 ᴀʟɪᴠᴇ ᴄʜᴇᴄᴋ',
                      description: 'ʀᴇғʀᴇs ʙᴏᴛ sᴛᴀᴛᴜs',
                      id: `${config.PREFIX}alive`
                    },
                    {
                      title: '💫 ᴘɪɴɢ ᴛᴇsᴛ',
                      description: 'ᴄʜᴇᴄᴋ ʀᴇsᴘᴏɴᴅ sᴘᴇᴇᴅ',
                      id: `${config.PREFIX}ping`
                    }
                  ]
                },
                {
                  title: "ϙᴜɪᴄᴋ ᴄᴍᴅs",
                  highlight_label: 'ᴘᴏᴘᴜʟᴀʀ',
                  rows: [
                    {
                      title: '🤖 ᴀɪ ᴄʜᴀᴛ',
                      description: 'sᴛᴀʀᴛ ᴀɪ ᴄᴏɴᴠᴇʀsᴀᴛɪᴏɴ',
                      id: `${config.PREFIX}ai Hello!`
                    },
                    {
                      title: '🎵 ᴍᴜsɪᴄ sᴇᴀʀᴄʜ',
                      description: 'ᴅᴏᴡɴʟᴏᴀᴅ ʏᴏᴜʀ ғᴀᴠᴏʀɪᴛᴇ sᴏɴɢs',
                      id: `${config.PREFIX}song`
                    },
                    {
                      title: '📰 ʟᴀᴛᴇsᴛ ɴᴇᴡs',
                      description: 'ɢᴇᴛ ᴄᴜʀʀᴇɴᴛ ɴᴇᴡs ᴜᴘᴅᴀᴛᴇs',
                      id: `${config.PREFIX}news`
                    }
                  ]
                }
              ]
            })
          }
        }
      ],
      headerType: 1,
      viewOnce: true,
      contextInfo: {
        externalAdReply: {
          title: "njabulo small alive🛒",
          mediaType: 1,
          previewType: 0,
          thumbnailUrl: "https://files.catbox.moe/mh36c7.jpg",
          renderLargerThumbnail: true,
        },
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363399999197102@newsletter",
          newsletterName: "╭••➤Njabulo Jb",
          serverMessageId: 143,
        },
        forwardingScore: 999,
      }
    };
    await socket.sendMessage(sender, aliveMessage, { quoted: fakevCard });
  } catch (error) {
    console.error('Alive command error:', error);
  }
  break;
          }




                // Case: menu
       // Case: menu
case 'menu': {
  try {
    await socket.sendMessage(sender, { react: { text: '🤖', key: msg.key } });
    const startTime = socketCreationTime.get(number) || Date.now();
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const usedMemory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const totalMemory = Math.round(os.totalmem() / 1024 / 1024);
    
    let menuText = `
*╭ׂ─ׂ┄『• ɴᴊᴀʙᴜʟᴏ-ᴊʙ•』┴*
│╭ׂ─ׂ┄─ׅ─ׂ┄╮ 
┴│
❒│▸ ▢ *ᴜsᴇ:* @${m.sender.split('@')[0]}
❒│▸ ▢ *ᴘʀᴇғɪx: [ . ]*
❒│▸ ▢ *ʀᴜɴ:* ${hours}h ${minutes}m ${seconds}s
❒│▸ ▢ *sᴛᴏʀᴀɢᴇ:* ${hours}h ${minutes}m ${seconds}s
❒│▸ ▢ *ᴏᴡɴᴇʀ:* (ɴᴊᴀʙᴜʟᴏ)
❒│▸ ▢ *ᴠᴇʀsɪᴏɴ:* ^3.0.
┬│   
│╰─ׂ┄─ׅ─ׂ┄╯
├┅┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄|
│╭ׂ─ׂ┄─ׅ─ׂ┄╮
┴│       
❒│▸ ①◦➛ *.ᴘʟᴀʏ* 
❒│▸ ②◦➛ *.ᴠɪᴅᴇᴏ* 
❒│▸ ③◦➛ *.ʏᴛs*
❒│▸ ④◦➛ *.ᴀᴘᴋ* 
❒│▸ ⑤◦➛ *.ᴍᴇɴᴜ*
❒│▸ ⑥◦➛ *.ʀᴇᴘᴏ*
❒│▸ ⑦◦➛ *.ᴏᴡɴᴇʀ*
❒│▸ ⑧◦➛ *.ᴘɪɴg*
❒│▸ ⑨◦➛ *.ᴜᴘᴛɪᴍᴇ* 
❒│▸ ⑩◦➛ *.ʙᴏᴛʟɪɴᴋ* 
❒│▸ ⑪◦➛ *.sᴇᴛᴛɪɴɢs* 
┬│
│╰─ׂ┄─ׅ─ׂ┄╯
╰─┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ─ׂ┄┴`;


const messageContext = {
  forwardingScore: 1,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363352087070233@newsletter',
    newsletterName: '╭••➤Njabulo Jb',
    serverMessageId: -1
  },
  forwardingScore: 999,
  externalAdReply: {
    title: "ɢᴏᴏᴅ ᴇᴠᴇɴɪɴɢ ᴏʟʟ🌃☕",
    mediaType: 1,
    previewType: 0,
    thumbnailUrl: 'https://files.catbox.moe/mh36c7.jpg',
    renderLargerThumbnail: true,
  }
};

const menuMessage = {
  document: {url: "https://files.catbox.moe/dfe0h0.jpg",},
  mimetype: 'application/pdf',
  fileName: 'WhatsApp PDF 10GB',
  caption: `${menuText}`,
  buttons: [
    {
      buttonId: `${config.PREFIX}quick_commands`,
      buttonText: {
        displayText: 'ＮＪＡＢＵＬＯ ＪＢ'
      },
      type: 4,
      nativeFlowInfo: {
        name: 'single_select',
        paramsJson: JSON.stringify({
          title: 'ＮＪＡＢＵＬＯ ＳＭＡＬＬ',
          sections: [
            {
              title: "🌐 ɢᴇɴᴇʀᴀʟ ᴄᴏᴍᴍᴀɴᴅs",
              highlight_label: '© Njabulo Jb',
              rows: [
                { title: "🤖 ᴀɪ", description: "ᴄʜᴀᴛ ᴡɪᴛʜ ᴀɪ ᴀssɪsᴛᴀɴᴛ", id: `.ai` },
                { title: "📊 ᴡɪɴғᴏ", description: "ɢᴇᴛ ᴡʜᴀᴛsᴀᴘᴘ ᴜsᴇʀ ɪɴғᴏ", id: `.winfo` },
                { title: "🔍 ᴡʜᴏɪs", description: "ʀᴇᴛʀɪᴇᴠᴇ ᴅᴏᴍᴀɪɴ ᴅᴇᴛᴀɪʟs", id: `.whois` },
                { title: "💣 ʙᴏᴍʙ", description: "sᴇɴᴅ ᴍᴜʟᴛɪᴘʟᴇ ᴍᴇssᴀɢᴇs", id: `.bomb` },
                { title: "📲 ғᴄ", description: "ғᴏʟʟᴏᴡ ᴀ ɴᴇᴡsʟᴇᴛᴛᴇʀ ᴄʜᴀɴɴᴇʟ", id: `.fc` }
              ]
            },
            {
              title: "🔧 ᴛᴏᴏʟs & ᴜᴛɪʟɪᴛɪᴇs",
              rows: [
                { title: "🤖 ᴀɪ", description: "ᴄʜᴀᴛ ᴡɪᴛʜ ᴀɪ ᴀssɪsᴛᴀɴᴛ", id: `.ai` },
                { title: "📊 ᴡɪɴғᴏ", description: "ɢᴇᴛ ᴡʜᴀᴛsᴀᴘᴘ ᴜsᴇʀ ɪɴғᴏ", id: `.winfo` },
                { title: "🔍 ᴡʜᴏɪs", description: "ʀᴇᴛʀɪᴇᴠᴇ ᴅᴏᴍᴀɪɴ ᴅᴇᴛᴀɪʟs", id: `.whois` },
                { title: "💣 ʙᴏᴍʙ", description: "sᴇɴᴅ ᴍᴜʟᴛɪᴘʟᴇ ᴍᴇssᴀɢᴇs", id: `.bomb` },
                { title: "📲 ғᴄ", description: "ғᴏʟʟᴏᴡ ᴀ ɴᴇᴡsʟᴇᴛᴛᴇʀ ᴄʜᴀɴɴᴇʟ", id: `.fc` }
              ]
            }
          ]
        })
      }
    }
  ],
  headerType: 1,
  contextInfo: messageContext
};

socket.sendMessage(from, menuMessage, { quoted: fakevCard });


    await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
  } catch (error) {
    console.error('Menu command error:', error);
    const usedMemory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const totalMemory = Math.round(os.totalmem() / 1024 / 1024);
    let fallbackMenuText = `
*╭ׂ─ׂ┄『• ɴᴊᴀʙᴜʟᴏ-ᴊʙ•』┴*
│╭ׂ─ׂ┄─ׅ─ׂ┄╮ 
❒│ *ʙᴏᴛ ɴᴀᴍᴇ*: ʜᴀɴꜱ ᴍɪɴɪ 
❒│ *ᴜsᴇʀ*: @${m.sender.split('@')[0]}
❒│ *ᴘʀᴇғɪx*: ${config.PREFIX}
❒│ *ᴜᴘᴛɪᴍᴇ*: ${hours}h ${minutes}m ${seconds}s
❒│ *ᴍᴇᴍᴏʀʏ*: ${usedMemory}MB/${totalMemory}ᴍʙ*
┬│
│╰─ׂ┄─ׅ─ׂ┄╯
╰─┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ─ׂ┄┴
`;

    await socket.sendMessage(from, {
      image: { url: "https://files.catbox.moe/dfe0h0.jpg" },
      caption: fallbackMenuText,
      contextInfo: messageContext // Added the newsletter context here too
    }, { quoted: fakevCard });
    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
  }
  break;
}
  case 'allmenu': {
  try {
    await socket.sendMessage(sender, { react: { text: '📜', key: msg.key } });
    const startTime = socketCreationTime.get(number) || Date.now();
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const usedMemory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const totalMemory = Math.round(os.totalmem() / 1024 / 1024);
    

    let allMenuText = `
*┏────〘 ʜᴀɴꜱ ᴍɪɴɪ 〙───⊷*
*┃*  ✨️ *ʙᴏᴛ*: ʜᴀɴꜱ ᴍɪɴɪ 
*┃*  🎉 *ᴜsᴇʀ*: @${sender.split("@")[0]}
*┃*  📍 *ᴘʀᴇғɪx*: ${config.PREFIX}
*┃*  ⏰ *ᴜᴘᴛɪᴍᴇ*: ${hours}h ${minutes}m ${seconds}s
*┃*  💾 *ᴍᴇᴍᴏʀʏ*: ${usedMemory}MB/${totalMemory}ᴍʙ
*┃*  💫 *ᴄᴏᴍᴍᴀɴᴅs*: ${count}
*┃*  👑 *ᴅᴇᴠ*: ᴍᴀᴅᴇ ʙʏ ʜᴀɴꜱ ᴛᴇᴄʜ
*┗──────────────⊷*

╭─『 🌐 *ɢᴇɴᴇʀᴀʟ ᴄᴏᴍᴍᴀɴᴅs* 』─╮
*┃*  🟢 *${config.PREFIX}ᴀʟɪᴠᴇ* - ᴄʜᴇᴄᴋ ʙᴏᴛ sᴛᴀᴛᴜs
*┃*  📊 *${config.PREFIX}ʙᴏᴛ_sᴛᴀᴛs* - ʙᴏᴛ sᴛᴀᴛɪsᴛɪᴄs
*┃*  ℹ️ *${config.PREFIX}ʙᴏᴛ_ɪɴғᴏ* - ʙᴏᴛ ɪɴғᴏʀᴍᴀᴛɪᴏɴ
*┃*  📋 *${config.PREFIX}ᴍᴇɴᴜ* - sʜᴏᴡ ɪɴᴛᴇʀᴀᴄᴛɪᴠᴇ ᴍᴇɴᴜ
*┃*  📜 *${config.PREFIX}ᴀʟʟᴍᴇɴᴜ* - ʟɪsᴛ ᴀʟʟ ᴄᴏᴍᴍᴀɴᴅs
*┃*  🏓 *${config.PREFIX}ᴘɪɴɢ* - ᴄʜᴇᴄᴋ ʀᴇsᴘᴏɴsᴇ sᴘᴇᴇᴅ
*┃*  🔗 *${config.PREFIX}ᴘᴀɪʀ* - ɢᴇɴᴇʀᴀᴛᴇ ᴘᴀɪʀɪɴɢ code
*┃*  ✨ *${config.PREFIX}ғᴀɴᴄʏ* - ғᴀɴᴄʏ ᴛᴇxᴛ ɢᴇɴᴇʀᴀᴛᴏʀ
*┃*  🎨 *${config.PREFIX}ʟᴏɢᴏ* - ᴄʀᴇᴀᴛᴇ ᴄᴜsᴛᴏᴍ ʟᴏɢᴏs
*┃*  📱 *${config.PREFIX}ǫʀ* - ɢᴇɴᴇʀᴀᴛᴇ ǫʀ ᴄᴏᴅᴇs [ɴᴏᴛ ɪᴍᴘʟᴇᴍᴇɴᴛᴇᴅ]
*┗──────────────⊷*

*┏────〘 ʜᴀɴꜱ ᴅᴏᴡɴʟᴏᴀᴅ 〙───⊷*
*┃*  🎵 *${config.PREFIX}sᴏɴɢ* - ᴅᴏᴡɴʟᴏᴀᴅ ʏᴏᴜᴛᴜʙᴇ ᴍᴜsɪᴄ
*┃*  📱 *${config.PREFIX}ᴛɪᴋᴛᴏᴋ* - ᴅᴏᴡɴʟᴏᴀᴅ TikTok videos
*┃*  📘 *${config.PREFIX}ғʙ* - ᴅᴏᴡɴʟᴏᴀᴅ ғᴀᴄᴇʙᴏᴏᴋ ᴄᴏɴᴛᴇɴᴛ
*┃*  📸 *${config.PREFIX}ɪɢ* - ᴅᴏᴡɴʟᴏᴀᴅ ɪɴsᴛᴀɢʀᴀᴍ ᴄᴏɴᴛᴇɴᴛ
*┃*  🖼️ *${config.PREFIX}ᴀɪɪᴍɢ* - ɢᴇɴᴇʀᴀᴛᴇ ᴀɪ ɪᴍᴀɢᴇs
*┃*  👀 *${config.PREFIX}ᴠɪᴇᴡᴏɴᴄᴇ* - ᴠɪᴇᴡ ᴏɴᴄᴇ ᴍᴇᴅɪᴀ (ᴀʟsᴏ .ʀᴠᴏ, .ᴠᴠ)
*┃*  🗣️ *${config.PREFIX}ᴛᴛs* - ᴛʀᴀɴsᴄʀɪʙᴇ [ɴᴏᴛ ɪᴍᴘʟᴇᴍᴇɴᴛᴇᴅ]
*┃*  🎬 *${config.PREFIX}ᴛs* - ᴛᴇʀᴀʙᴏx ᴅᴏᴡɴʟᴏᴀᴅᴇʀ [ɴᴏᴛ ɪᴍᴘʟᴇᴍᴇɴᴛᴇᴅ]
*┃*  🖼️ *${config.PREFIX}sᴛɪᴄᴋᴇʀ* - ᴄᴏɴᴠᴇʀᴛ ᴛᴏ sᴛɪᴄᴋᴇʀ [ɴᴏᴛ ɪᴍᴘʟᴇᴍᴇɴᴛᴇᴅ]
*┗──────────────⊷*

*┏────〘 ʜᴀɴꜱ ɢʀᴏᴜᴘ 〙───⊷*
*┃*  ➕ *${config.PREFIX}ᴀᴅᴅ* - ᴀᴅᴅ ᴍᴇᴍʙᴇʀ ᴛᴏ ɢʀᴏᴜᴘ
*┃*  🦶 *${config.PREFIX}ᴋɪᴄᴋ* - ʀᴇᴍᴏᴠᴇ ᴍᴇᴍʙᴇʀ ғʀᴏᴍ ɢʀᴏᴜᴘ
*┃*  🔓 *${config.PREFIX}ᴏᴘᴇɴ* - ᴜɴʟᴏᴄᴋ ɢʀᴏᴜᴘ
*┃*  🙂‍↕️ *${config.PREFIX}ᴋɪᴄᴋᴀʟʟ* - ʀᴇᴍᴏᴠᴇ ᴀʟʟ ᴍᴇᴍʙᴇʀ 
*┃*  🔒 *${config.PREFIX}ᴄʟᴏsᴇ* - ʟᴏᴄᴋ ɢʀᴏᴜᴘ
*┃*  ✨️ *${config.PREFIX}ɪɴᴠɪᴛᴇ* - ɢᴇᴛ ɢʀᴏᴜᴘ ʟɪɴᴋ
*┃*  👑 *${config.PREFIX}ᴘʀᴏᴍᴏᴛᴇ* - ᴘʀᴏᴍᴏᴛᴇ ᴛᴏ ᴀᴅᴍɪɴ
*┃*  😢 *${config.PREFIX}ᴅᴇᴍᴏᴛᴇ* - ᴅᴇᴍᴏᴛᴇ ғʀᴏᴍ ᴀᴅᴍɪɴ
*┃*  👥 *${config.PREFIX}ᴛᴀɢᴀʟʟ* - ᴛᴀɢ ᴀʟʟ ᴍᴇᴍʙᴇʀs
*┃*  👤 *${config.PREFIX}ᴊᴏɪɴ* - ᴊᴏɪɴ ɢʀᴏᴜᴘ ᴠɪᴀ ʟɪɴᴋ
*┗──────────────⊷*

*┏────〘 ʜᴀɴꜱ ᴏᴛʜᴇʀ 〙───⊷*
*┃*  📰 *${config.PREFIX}ɴᴇᴡs* - ʟᴀᴛᴇsᴛ ɴᴇᴡs ᴜᴘᴅᴀᴛᴇs
*┃*  🚀 *${config.PREFIX}ɴᴀsᴀ* - ɴᴀsᴀ sᴘᴀᴄᴇ ᴜᴘᴅᴀᴛᴇs
*┃*  💬 *${config.PREFIX}ɢᴏssɪᴘ* - ᴇɴᴛᴇʀᴛᴀɪɴᴍᴇɴᴛ ɢᴏssɪᴘ
*┃*  🏏 *${config.PREFIX}ᴄʀɪᴄᴋᴇᴛ* - ᴄʀɪᴄᴋᴇᴛ sᴄᴏʀᴇs & ɴᴇᴡs
*┃*  🎭 *${config.PREFIX}ᴀɴᴏɴʏᴍᴏᴜs* - ғᴜɴ ɪɴᴛᴇʀᴀᴄᴛɪᴏɴ [ɴᴏᴛ ɪᴍᴘʟᴇᴍᴇɴᴛᴇᴅ]
*┗──────────────⊷*

*┏────〘 ʜᴀɴꜱ ғᴜɴ 〙───⊷*
*┃*  😂 *${config.PREFIX}ᴊᴏᴋᴇ* - ʟɪɢʜᴛʜᴇᴀʀᴛᴇᴅ ᴊᴏᴋᴇ
*┃*  🌚 *${config.PREFIX}ᴅᴀʀᴋᴊᴏᴋᴇ* - ᴅᴀʀᴋ ʜᴜᴍᴏʀ ᴊᴏᴋᴇ
*┃*  🏏 *${config.PREFIX}ᴡᴀɪғᴜ* - ʀᴀɴᴅᴏᴍ ᴀɴɪᴍᴇ ᴡᴀɪғᴜ
*┃*  😂 *${config.PREFIX}ᴍᴇᴍᴇ* - ʀᴀɴᴅᴏᴍ ᴍᴇᴍᴇ
*┃*  🐈 *${config.PREFIX}ᴄᴀᴛ* - ᴄᴜᴛᴇ ᴄᴀᴛ ᴘɪᴄᴛᴜʀᴇ
*┃*  🐕 *${config.PREFIX}ᴅᴏɢ* - ᴄᴜᴛᴇ ᴅᴏɢ ᴘɪᴄᴛᴜʀᴇ
*┃*  💡 *${config.PREFIX}ғᴀᴄᴛ* - ʀᴀɴᴅᴏᴍ ғᴀᴄᴛ
*┃*  💘 *${config.PREFIX}ᴘɪᴄᴋᴜᴘʟɪɴᴇ* - ᴄʜᴇᴇsʏ ᴘɪᴄᴋᴜᴘ ʟɪɴᴇ
*┃*  🔥 *${config.PREFIX}ʀᴏᴀsᴛ* - sᴀᴠᴀɢᴇ ʀᴏᴀsᴛ
*┃*  ❤️ *${config.PREFIX}ʟᴏᴠᴇǫᴜᴏᴛᴇ* - ʀᴏᴍᴀɴᴛɪᴄ love quote
*┃*  💭 *${config.PREFIX}ǫᴜᴏᴛᴇ* - ʙᴏʟᴅ ᴏʀ ᴡɪᴛᴛʏ ǫᴜᴏᴛᴇ
*┗──────────────⊷*

*┏────〘 ʜᴀɴꜱ-xᴍᴅ ᴍᴀɪɴ 〙───⊷*
*┃*  🤖 *${config.PREFIX}ᴀɪ* - ᴄʜᴀᴛ ᴡɪᴛʜ ᴀɪ
*┃*  📊 *${config.PREFIX}ᴡɪɴғᴏ* - ᴡʜᴀᴛsᴀᴘᴘ ᴜsᴇʀ ɪɴғᴏ
*┃*  🔍 *${config.PREFIX}ᴡʜᴏɪs* - ᴅᴏᴍᴀɪɴ ᴡʜᴏɪs ʟᴏᴏᴋᴜᴘ
*┃*  💣 *${config.PREFIX}ʙᴏᴍʙ* - sᴇɴᴅ ᴍᴜʟᴛɪᴘʟᴇ ᴍᴇssᴀɢᴇs
*┃*  🖼️ *${config.PREFIX}ɢᴇᴛᴘᴘ* - ғᴇᴛᴄʜ ᴘʀᴏғɪʟᴇ ᴘɪᴄᴛᴜʀᴇ
*┃*  💾 *${config.PREFIX}sᴀᴠᴇsᴛᴀᴛᴜs* - sᴀᴠᴇ sᴛᴀᴛᴜs
*┃*  ✍️ *${config.PREFIX}sᴇᴛsᴛᴀᴛᴜs* - sᴇᴛ sᴛᴀᴛᴜs [ɴᴏᴛ ɪᴍᴘʟᴇᴍᴇɴᴛᴇᴅ]
*┃*  🗑️ *${config.PREFIX}ᴅᴇʟᴇᴛᴇᴍᴇ* - ᴅᴇʟᴇᴛᴇ ᴜsᴇʀ ᴅᴀᴛᴀ [ɴᴏᴛ ɪᴍᴘʟᴇᴍᴇɴᴛᴇᴅ]
*┃*  🌦️ *${config.PREFIX}ᴡᴇᴀᴛʜᴇʀ* - ᴡᴇᴀᴛʜᴇʀ ғᴏʀᴇᴄᴀsᴛ
*┃*  🔗 *${config.PREFIX}sʜᴏʀᴛᴜʀʟ* - sʜᴏʀᴛᴇɴ ᴜʀʟ
*┃*  📤 *${config.PREFIX}ᴛᴏᴜʀʟ2* - ᴜᴘʟᴏᴀᴅ ᴍᴇᴅɪᴀ ᴛᴏ ʟɪɴᴋ
*┃*  📦 *${config.PREFIX}ᴀᴘᴋ* - ᴅᴏᴡɴʟᴏᴀᴅ ᴀᴘᴋ ғɪʟᴇs
*┃*  📲 *${config.PREFIX}ғᴄ* - ғᴏʟʟᴏᴡ ɴᴇᴡsʟᴇᴛᴛᴇʀ ᴄʜᴀɴɴᴇʟ
*┗──────────────⊷*

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ʜᴀɴꜱ-ᴛᴇᴄʜ*
`;

    await socket.sendMessage(from, {
      image: { url: "https://files.catbox.moe/dfe0h0.jpg" },
      caption: allMenuText
    }, { quoted: fakevCard });
    await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
  } catch (error) {
    console.error('Allmenu command error:', error);
    await socket.sendMessage(from, {
      text: `❌* ᴛʜᴇ ᴍᴇɴᴜ ɢᴏᴛ sʜʏ! 😢*\nError: ${error.message || 'Unknown error'}\nTry again, love?`
    }, { quoted: fakevCard });
    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
  }
  break;
}

                // Case: fc (follow channel)
                case 'fc': {
                    if (args.length === 0) {
                        return await socket.sendMessage(sender, {
                            text: '❗ Please provide a channel JID.\n\nExample:\n.fcn 120363299029326322@newsletter'
                        });
                    }

                    const jid = args[0];
                    if (!jid.endsWith("@newsletter")) {
                        return await socket.sendMessage(sender, {
                            text: '❗ Invalid JID. Please provide a JID ending with `@newsletter`'
                        });
                    }

                    try {
                    await socket.sendMessage(sender, { react: { text: '😌', key: msg.key } });
                        const metadata = await socket.newsletterMetadata("jid", jid);
                        if (metadata?.viewer_metadata === null) {
                            await socket.newsletterFollow(jid);
                            await socket.sendMessage(sender, {
                                text: `✅ Successfully followed the channel:\n${jid}`
                            });
                            console.log(`FOLLOWED CHANNEL: ${jid}`);
                        } else {
                            await socket.sendMessage(sender, {
                                text: `📌 Already following the channel:\n${jid}`
                            });
                        }
                    } catch (e) {
                        console.error('❌ Error in follow channel:', e.message);
                        await socket.sendMessage(sender, {
                            text: `❌ Error: ${e.message}`
                        });
                    }
                    break;
                }
                    

                // Case: ping
case 'ping': {
  await socket.sendMessage(sender, { react: { text: '📍', key: msg.key } });
  try {
    const startTime = new Date().getTime();
    let ping = await socket.sendMessage(sender, { text: '*_⚡️ ᴘɪɴɢɪɴɢ ᴛᴏ sᴇʀᴠᴇʀ..._* ❗' }, { quoted: msg });
    const progressSteps = [
      { bar: '《 █▒▒▒▒▒▒▒▒▒▒▒》', percent: '10%', delay: 100 },
      { bar: '《 ███▒▒▒▒▒▒▒▒▒》', percent: '25%', delay: 150 },
      { bar: '《 █████▒▒▒▒▒▒▒》', percent: '40%', delay: 100 },
      { bar: '《 ███████▒▒▒▒▒》', percent: '55%', delay: 120 },
      { bar: '《 █████████▒▒▒》', percent: '70%', delay: 100 },
      { bar: '《 ███████████▒》', percent: '85%', delay: 100 },
      { bar: '《 ████████████》', percent: '100%', delay: 200 }
    ];
    for (let step of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
      try {
        await socket.sendMessage(sender, { text: `${step.bar} ${step.percent}`, edit: ping.key });
      } catch (editError) {
        console.warn('Failed to edit message:', editError);
        ping = await socket.sendMessage(sender, { text: `${step.bar} ${step.percent}` }, { quoted: msg });
      }
    }
    const endTime = new Date().getTime();
    const latency = endTime - startTime;
    let quality = '';
    let emoji = '';
    if (latency < 100) {
      quality = 'ᴇxᴄᴇʟʟᴇɴᴛ';
      emoji = '🟢';
    } else if (latency < 300) {
      quality = 'ɢᴏᴏᴅ';
      emoji = '🟡';
    } else if (latency < 600) {
      quality = 'ғᴀɪʀ';
      emoji = '🟠';
    } else {
      quality = 'ᴘᴏᴏʀ';
      emoji = '🔴';
    }
    const finalMessage = `*╭ׂ─ׂ┄『• ɴᴊᴀʙᴜʟᴏ-ᴊʙ•』┴*
│╭ׂ─ׂ┄─ׅ─ׂ┄╮\n` +
                        `┬│ *sᴘᴇᴇᴅ:* ${latency}ms\n` +
                        `❒│▸ ▢ ${emoji} *ϙᴜᴀʟɪᴛʏ:* ${quality}\n` +
                        `❒│▸ ▢ *ᴛɪᴍᴇsᴛᴀᴍᴘ:* ${new Date().toLocaleString('en-US', { timeZone: 'UTC', hour12: true })}\n` +
                        `┬│ ᴄᴏɴɴᴇᴄᴛɪᴏɴ sᴛᴀᴛᴜs \n` +
                        `┬│
│╰─ׂ┄─ׅ─ׂ┄╯
╰─┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ─ׂ┄┴`;
    await socket.sendMessage(sender, {
    document: {url: "https://files.catbox.moe/dfe0h0.jpg",},
    mimetype: 'application/pdf',
    fileName: 'WhatsApp PDF 10GB',
      caption: finalMessage,
      contextInfo: {
        externalAdReply: {
          title: "njabulo small pong🛒",
          mediaType: 1,
          previewType: 0,
          thumbnailUrl: "https://files.catbox.moe/mh36c7.jpg",
          renderLargerThumbnail: false,
        },
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363399999197102@newsletter",
          newsletterName: "╭••➤Njabulo Jb",
          serverMessageId: 143,
        },
        forwardingScore: 999,
      }
    }, { quoted: fakevCard });
  } catch (error) {
    console.error('Ping command error:', error);
    const startTime = new Date().getTime();
    const simplePing = await socket.sendMessage(sender, { text: '📍 ᴄᴀʟᴄᴜʟᴀᴛɪɴɢ ᴘɪɴɢ...' }, { quoted: msg });
    const endTime = new Date().getTime();
    await socket.sendMessage(sender, { text: `📌 *ᴘᴏɴɢ!*\n⚡ ʟᴀᴛᴇɴᴄʏ: ${endTime - startTime}ᴍs` }, { quoted: fakevCard });
  }
  break;
}


            // Case: viewonce
case 'viewonce':
case 'rvo':
case 'vv': {
  await socket.sendMessage(sender, { react: { text: '✨', key: msg.key } });

  try {
    if (!msg.quoted) {
      return await socket.sendMessage(sender, {
        text: `🚩 *ᴘʟᴇᴀsᴇ ʀᴇᴘʟʏ ᴛᴏ ᴀ ᴠɪᴇᴡ-ᴏɴᴄᴇ ᴍᴇssᴀɢᴇ*\n\n` +
              `📝 *ʜᴏᴡ ᴛᴏ ᴜsᴇ:*\n` +
              `• ʀᴇᴘʟʏ ᴛᴏ ᴀ ᴠɪᴇᴡ-ᴏɴᴄᴇ ɪᴍᴀɢᴇ, ᴠɪᴅᴇᴏ, ᴏʀ ᴀᴜᴅɪᴏ\n` +
              `• ᴜsᴇ: ${config.PREFIX}vv\n` +
              `• ɪ'ʟʟ ʀᴇᴠᴇᴀʟ ᴛʜᴇ ʜɪᴅᴅᴇɴ ᴛʀᴇᴀsᴜʀᴇ ғᴏʀ ʏᴏᴜ`
      });
    }

    // Get the quoted message with multiple fallback approaches
    const contextInfo = msg.msg?.contextInfo;
    const quotedMessage = msg.quoted?.message || 
                         contextInfo?.quotedMessage || 
                         (contextInfo?.stanzaId ? await getQuotedMessage(contextInfo.stanzaId) : null);

    if (!quotedMessage) {
      return await socket.sendMessage(sender, {
        text: `❌ *ɪ ᴄᴀɴ'ᴛ ғɪɴᴅ ᴛʜᴀᴛ ʜɪᴅᴅᴇɴ ɢᴇᴍ, ʟᴏᴠᴇ 😢*\n\n` +
              `ᴘʟᴇᴀsᴇ ᴛʀʏ:\n` +
              `• ʀᴇᴘʟʏ ᴅɪʀᴇᴄᴛʟʏ ᴛᴏ ᴛʜᴇ ᴠɪᴇᴡ-ᴏɴᴄᴇ ᴍᴇssᴀɢᴇ\n` +
              `• ᴍᴀᴋᴇ sᴜʀᴇ ɪᴛ ʜᴀsɴ'ᴛ ᴠᴀɴɪsʜᴇᴅ!`
      });
    }

    // Check for view once message
    let fileType = null;
    let mediaMessage = null;
    
    if (quotedMessage.viewOnceMessageV2) {
      // Handle viewOnceMessageV2 (newer format)
      const messageContent = quotedMessage.viewOnceMessageV2.message;
      if (messageContent.imageMessage) {
        fileType = 'image';
        mediaMessage = messageContent.imageMessage;
      } else if (messageContent.videoMessage) {
        fileType = 'video';
        mediaMessage = messageContent.videoMessage;
      } else if (messageContent.audioMessage) {
        fileType = 'audio';
        mediaMessage = messageContent.audioMessage;
      }
    } else if (quotedMessage.viewOnceMessage) {
      // Handle viewOnceMessage (older format)
      const messageContent = quotedMessage.viewOnceMessage.message;
      if (messageContent.imageMessage) {
        fileType = 'image';
        mediaMessage = messageContent.imageMessage;
      } else if (messageContent.videoMessage) {
        fileType = 'video';
        mediaMessage = messageContent.videoMessage;
      }
    } else if (quotedMessage.imageMessage?.viewOnce || 
               quotedMessage.videoMessage?.viewOnce || 
               quotedMessage.audioMessage?.viewOnce) {
      // Handle direct viewOnce properties
      if (quotedMessage.imageMessage?.viewOnce) {
        fileType = 'image';
        mediaMessage = quotedMessage.imageMessage;
      } else if (quotedMessage.videoMessage?.viewOnce) {
        fileType = 'video';
        mediaMessage = quotedMessage.videoMessage;
      } else if (quotedMessage.audioMessage?.viewOnce) {
        fileType = 'audio';
        mediaMessage = quotedMessage.audioMessage;
      }
    }

    if (!fileType || !mediaMessage) {
      return await socket.sendMessage(sender, {
        text: `⚠️ *ᴛʜɪs ɪsɴ'ᴛ ᴀ ᴠɪᴇᴡ-ᴏɴᴄᴇ ᴍᴇssᴀɢᴇ*\n\n` +
              `ʀᴇᴘʟʏ ᴛᴏ ᴀ ᴍᴇssᴀɢᴇ ᴡɪᴛʜ ʜɪᴅᴅᴇɴ ᴍᴇᴅɪᴀ (ɪᴍᴀɢᴇ, ᴠɪᴅᴇᴏ, ᴏʀ ᴀᴜᴅɪᴏ)`
      });
    }

    await socket.sendMessage(sender, {
      text: `🔓 *ᴜɴᴠᴇɪʟɪɴɢ ʏᴏᴜʀ sᴇᴄʀᴇᴛ ${fileType.toUpperCase()}...*`
    });

    // Download and send the media
    const mediaBuffer = await downloadMediaMessage(
      { 
        key: msg.quoted.key, 
        message: { 
          [fileType + 'Message']: mediaMessage 
        } 
      },
      'buffer',
      {}
    );

    if (!mediaBuffer) {
      throw new Error('Failed to download media');
    }

    // Determine the mimetype and filename
    const mimetype = mediaMessage.mimetype || 
                    (fileType === 'image' ? 'image/jpeg' : 
                     fileType === 'video' ? 'video/mp4' : 'audio/mpeg');
    
    const extension = mimetype.split('/')[1];
    const filename = `revealed-${fileType}-${Date.now()}.${extension}`;

    // Prepare message options based on media type
    let messageOptions = {
      caption: `✨ *ʀᴇᴠᴇᴀʟᴇᴅ ${fileType.toUpperCase()}* - ʏᴏᴜ'ʀᴇ ᴡᴇʟᴄᴏᴍᴇ`
    };

    // Send the media based on its type
    if (fileType === 'image') {
      await socket.sendMessage(sender, {
        image: mediaBuffer,
        ...messageOptions
      });
    } else if (fileType === 'video') {
      await socket.sendMessage(sender, {
        video: mediaBuffer,
        ...messageOptions
      });
    } else if (fileType === 'audio') {
      await socket.sendMessage(sender, {
        audio: mediaBuffer,
        ...messageOptions,
        mimetype: mimetype
      });
    }

    await socket.sendMessage(sender, {
      react: { text: '✅', key: msg.key }
    });
  } catch (error) {
    console.error('ViewOnce command error:', error);
    let errorMessage = `❌ *ᴏʜ ɴᴏ, ɪ ᴄᴏᴜʟᴅɴ'ᴛ ᴜɴᴠᴇɪʟ ɪᴛ*\n\n`;

    if (error.message?.includes('decrypt') || error.message?.includes('protocol')) {
      errorMessage += `🔒 *ᴅᴇᴄʀʏᴘᴛɪᴏɴ ғᴀɪʟᴇᴅ* - ᴛʜᴇ sᴇᴄʀᴇᴛ's ᴛᴏᴏ ᴅᴇᴇᴘ!`;
    } else if (error.message?.includes('download') || error.message?.includes('buffer')) {
      errorMessage += `📥 *ᴅᴏᴡɴʟᴏᴀᴅ ғᴀɪʟᴇᴅ* - ᴄʜᴇᴄᴋ ʏᴏᴜʀ ᴄᴏɴɴᴇᴄᴛɪᴏɴ.`;
    } else if (error.message?.includes('expired') || error.message?.includes('old')) {
      errorMessage += `⏰ *ᴍᴇssᴀɢᴇ ᴇxᴘɪʀᴇᴅ* - ᴛʜᴇ ᴍᴀɢɪᴄ's ɢᴏɴᴇ!`;
    } else {
      errorMessage += `🐛 *ᴇʀʀᴏʀ:* ${error.message || 'sᴏᴍᴇᴛʜɪɴɢ ᴡᴇɴᴛ ᴡʀᴏɴɢ'}`;
    }

    errorMessage += `\n\n💡 *ᴛʀʏ:*\n• ᴜsɪɴɢ ᴀ ғʀᴇsʜ ᴠɪᴇᴡ-ᴏɴᴄᴇ ᴍᴇssᴀɢᴇ\n• ᴄʜᴇᴄᴋɪɴɢ ʏᴏᴜʀ ɪɴᴛᴇʀɴᴇᴛ ᴄᴏɴɴᴇᴄᴛɪᴏɴ`;

    await socket.sendMessage(sender, { text: errorMessage });
    await socket.sendMessage(sender, {
      react: { text: '❌', key: msg.key }
    });
  }
  break;
}
// Case: song
case 'play':
case 'song': {
    await socket.sendMessage(sender, { react: { text: '🎶', key: msg.key } });
    // Import dependencies
    const yts = require('yt-search');
    const axios = require('axios');
    const ddownr = require('denethdev-ytmp3');
    const fs = require('fs').promises;
    const path = require('path');
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    const { existsSync, mkdirSync } = require('fs');

  const q = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '';
  if (!q || q.trim() === '') {
    return await socket.sendMessage(sender, { text: '*`ɢɪᴠᴇ ᴍᴇ ᴀ sᴏɴɢ ᴛɪᴛʟᴇ ᴏʀ ʏᴏᴜᴛᴜʙᴇ ʟɪɴᴋ`*' }, { quoted: fakevCard });
  }

    

  try {
    const search = await yts(q.trim());
    const video = search.videos[0];
    console.log('Video found:', video);

    const safeTitle = video.title.replace(/[\\/:*?"<>|]/g, '');
    const fileName = `${safeTitle}.mp3`;
    const apiURL = `https://noobs-api.top/dipto/ytDl3?link=${encodeURIComponent(video.videoId)}&format=mp3`;
    console.log('API URL:', apiURL);

      const buttons = [
      {
        buttonId: `${prefix}playaudio ${q.trim()}`,
        buttonText: { displayText: '🎧 Play Audio' },
        type: 1
      },
      {
        buttonId: `${prefix}playvideo ${q.trim()}`,
        buttonText: { displayText: '🎥 Play Video' },
        type: 1
      }
    ];

    await socket.sendMessage(sender, {
    document: {url: "https://files.catbox.moe/dfe0h0.jpg",},
    mimetype: 'application/pdf',
    fileName: 'WhatsApp PDF 10GB',
      
      caption: ` 
*╭ׂ─ׂ┄『• ɴᴊᴀʙᴜʟᴏ-ᴊʙ•』┴*
│╭ׂ─ׂ┄─ׅ─ׂ┄╮       
┴│
❒│▸ ▢ ᴛɪᴛʟᴇ: ${video.title}
❒│▸ ▢ *ᴠɪᴇᴡ: ${video.views.toLocaleString()}* 
❒│▸ ▢ *ᴜᴘʟᴏᴀᴅᴇᴅ:* ${video.ago}
❒│▸ ▢ *ʜᴅ: ʜᴀʀᴅ*
❒│▸ ▢ *ᴛᴇᴍᴘ ᴛɪᴍᴇ: ${video.timestamp}*
❒│▸ ▢ *⇆ㅤ ||◁ㅤ❚❚ㅤ▷||ㅤ ↻* 
❒│▸ ▢ *0:00 ──〇───── : ${video.timestamp}*
┬│ 
┬│
│╰─ׂ┄─ׅ─ׂ┄╯
╰─┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ─ׂ┄┴`,
        buttons: buttons,
        headerType: 4,
        contextInfo: {
        externalAdReply: {
          title: " ⇆ㅤ ||◁ㅤ❚❚ㅤ▷||ㅤ ↻ ",
          mediaType: 1,
          previewType: 0,
          thumbnailUrl: video.thumbnail,
          renderLargerThumbnail: true,
        }
      }
    }, { quoted: fakevCard });

    const response = await axios.get(apiURL,);
    const data = response.data;

    if (!data.downloadLink) {
      return await socket.sendMessage(sender, { text: 'Failed to retrieve the MP3 download link.' }, { quoted: fakevCard });
    }

    await socket.sendMessage(sender, {
      audio: { url: data.downloadLink },
      mimetype: 'audio/mpeg',
      fileName,
      contextInfo: {
        externalAdReply: {
          title: " ⇆ㅤ ||◁ㅤ❚❚ㅤ▷||ㅤ ↻ ",
          mediaType: 1,
          previewType: 0,
          thumbnailUrl: video.thumbnail,
          renderLargerThumbnail: true,
        },
      },
    }, { quoted: fakevCard });

  } catch (err) {
    console.error('Song command error:', err);
    await socket.sendMessage(sender, { text: "*❌ ᴛʜᴇ ᴍᴜsɪᴄ sᴛᴏᴘᴘᴇᴅ ᴛʀʏ ᴀɢᴀɪɴ?*" }, { quoted: fakevCard });
  }
  break;
}
//===============================   
// Case: song
case 'video':
case 'playvid': {
    await socket.sendMessage(sender, { react: { text: '📹', key: msg.key } });
   // Import dependencies
    const yts = require('yt-search');
    const axios = require('axios');
    const ddownr = require('denethdev-ytmp3');
    const fs = require('fs').promises;
    const path = require('path');
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    const { existsSync, mkdirSync } = require('fs');
  

  const q = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '';
  if (!q || q.trim() === '') {
    return await socket.sendMessage(sender, { text: '*`ɢɪᴠᴇ ᴍᴇ ᴀ ᴠɪᴅᴇᴏ ᴛɪᴛʟᴇ ᴏʀ ʏᴏᴜᴛᴜʙᴇ ʟɪɴᴋ`*' }, { quoted: fakevCard });
  }

  try {
    const search = await yts(q.trim());
    const video = search.videos[0];
    console.log('Video found:', video);

    const safeTitle = video.title.replace(/[\\/:*?"<>|]/g, '');
    const fileName = `${safeTitle}.mp4`;
    const apiURL = `https://noobs-api.top/dipto/ytDl3?link=${encodeURIComponent(video.videoId)}&format=mp4`;
    console.log('API URL:', apiURL);

      const buttons = [
      {
        buttonId: `${prefix}playaudio ${q.trim()}`,
        buttonText: { displayText: '🎧 Play Audio' },
        type: 1
      },
      {
        buttonId: `${prefix}playvideo ${q.trim()}`,
        buttonText: { displayText: '🎥 Play Video' },
        type: 1
      }
    ];

    await socket.sendMessage(sender, {
     document: {url: "https://files.catbox.moe/dfe0h0.jpg",},
     mimetype: 'application/pdf',
     fileName: 'WhatsApp PDF 10GB',      
      caption: `
*╭ׂ─ׂ┄『• ɴᴊᴀʙᴜʟᴏ-ᴊʙ•』┴*
│╭ׂ─ׂ┄─ׅ─ׂ┄╮       
┴│
❒│▸ ▢ ᴛɪᴛʟᴇ: ${video.title}
❒│▸ ▢ *ᴠɪᴇᴡ: ${video.views.toLocaleString()}* 
❒│▸ ▢ *ᴜᴘʟᴏᴀᴅᴇᴅ:* ${video.ago}
❒│▸ ▢ *ʜᴅ: ʜᴀʀᴅ*
❒│▸ ▢ *ᴛᴇᴍᴘ ᴛɪᴍᴇ: ${video.timestamp}*
❒│▸ ▢ *⇆ㅤ ||◁ㅤ❚❚ㅤ▷||ㅤ ↻* 
❒│▸ ▢ *0:00 ──〇───── : ${video.timestamp}*
┬│ 
┬│
│╰─ׂ┄─ׅ─ׂ┄╯
╰─┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ─ׂ┄┴`,
        buttons: buttons,
        headerType: 4,
        contextInfo: {
        externalAdReply: {
          title: " ⇆ㅤ ||◁ㅤ❚❚ㅤ▷||ㅤ ↻ ",
          mediaType: 1,
          previewType: 0,
          thumbnailUrl: video.thumbnail,
          renderLargerThumbnail: true,
        }
      }
    }, { quoted: fakevCard });

    const response = await axios.get(apiURL);
    const data = response.data;

    if (!data.downloadLink) {
      return await socket.sendMessage(sender, { text: 'Failed to retrieve the MP4 download link.' }, { quoted: fakevCard });
    }

    await socket.sendMessage(sender, {
      video: { url: data.downloadLink },
      mimetype: 'video/mp4',
      fileName,      
    }, { quoted: fakevCard });

  } catch (err) {
    console.error('Video command error:', err);
    await socket.sendMessage(sender, { text: "*❌ ᴛʜᴇ ᴠɪᴅᴇᴏ sᴛᴏᴘᴘᴇᴅ ᴛʀʏ ᴀɢᴀɪɴ?*" }, { quoted: fakevCard });
  }
  break;
}


                
case 'tiktok': {
const axios = require('axios');

// Optimized axios instance
const axiosInstance = axios.create({
  timeout: 15000,
  maxRedirects: 5,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
});

// TikTok API configuration
const TIKTOK_API_KEY = process.env.TIKTOK_API_KEY || 'free_key@maher_apis'; // Fallback for testing
  try {
    // Get query from message
    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              msg.message?.videoMessage?.caption || '';

    // Validate and sanitize URL
    const tiktokUrl = q.trim();
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com|vm\.tiktok\.com)\/[@a-zA-Z0-9_\-\.\/]+/;
    if (!tiktokUrl || !urlRegex.test(tiktokUrl)) {
      await socket.sendMessage(sender, {
        text: '📥 *ᴜsᴀɢᴇ:* .tiktok <TikTok URL>\nExample: .tiktok https://www.tiktok.com/@user/video/123456789'
      }, { quoted: fakevCard });
      return;
    }

    // Send downloading reaction
    try {
      await socket.sendMessage(sender, { react: { text: '⏳', key: msg.key } });
    } catch (reactError) {
      console.error('Reaction error:', reactError);
    }

    // Try primary API
    let data;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      const res = await axiosInstance.get(`https://api.nexoracle.com/downloader/tiktok-nowm?apikey=${TIKTOK_API_KEY}&url=${encodeURIComponent(tiktokUrl)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.data?.status === 200) {
        data = res.data.result;
      }
    } catch (primaryError) {
      console.error('Primary API error:', primaryError.message);
    }

    // Fallback API
    if (!data) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        const fallback = await axiosInstance.get(`https://api.tikwm.com/?url=${encodeURIComponent(tiktokUrl)}&hd=1`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (fallback.data?.data) {
          const r = fallback.data.data;
          data = {
            title: r.title || 'No title',
            author: {
              username: r.author?.unique_id || 'Unknown',
              nickname: r.author?.nickname || 'Unknown'
            },
            metrics: {
              digg_count: r.digg_count || 0,
              comment_count: r.comment_count || 0,
              share_count: r.share_count || 0,
              download_count: r.download_count || 0
            },
            url: r.play || '',
            thumbnail: r.cover || ''
          };
        }
      } catch (fallbackError) {
        console.error('Fallback API error:', fallbackError.message);
      }
    }

    if (!data || !data.url) {
      await socket.sendMessage(sender, { text: '❌ TikTok video not found.' }, { quoted: fakevCard });
      return;
    }

    const { title, author, url, metrics, thumbnail } = data;

    // Prepare caption
    const caption = `
*╭ׂ─ׂ┄『• ɴᴊᴀʙᴜʟᴏ-ᴊʙ•』┴*
│╭ׂ─ׂ┄─ׅ─ׂ┄╮ 
┬│
❒│ ᴛɪᴛᴛʟᴇ: ${title.replace(/[<>:"\/\\|?*]/g, '')}
❒│ ᴀᴜᴛʜᴏʀ: @${author.username.replace(/[<>:"\/\\|?*]/g, '')} (${author.nickname.replace(/[<>:"\/\\|?*]/g, '')})
❒│ ʟɪᴋᴇs: ${metrics.digg_count.toLocaleString()}
❒│ ᴄᴏᴍᴍᴇɴᴛs: ${metrics.comment_count.toLocaleString()}
❒│ sʜᴀʀᴇs: ${metrics.share_count.toLocaleString()}
❒│ ᴅᴏᴡɴʟᴏᴀᴅs: ${metrics.download_count.toLocaleString()}
┬│
│╰─ׂ┄─ׅ─ׂ┄╯
╰─┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ─ׂ┄┴`;

    // Send thumbnail with info
    await socket.sendMessage(sender, {
      image: { url: thumbnail || 'https://i.ibb.co/ynmqJG8j/vision-v.jpg' }, // Fallback image
      caption
    }, { quoted: fakevCard });

    // Download video
    const loading = await socket.sendMessage(sender, { text: '⏳ Downloading video...' }, { quoted: fakevCard });
    let videoBuffer;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      const response = await axiosInstance.get(url, {
        responseType: 'arraybuffer',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      videoBuffer = Buffer.from(response.data, 'binary');

      // Basic size check (e.g., max 50MB)
      if (videoBuffer.length > 50 * 1024 * 1024) {
        throw new Error('Video file too large');
      }
    } catch (downloadError) {
      console.error('Video download error:', downloadError.message);
      await socket.sendMessage(sender, { text: '❌ Failed to download video.' }, { quoted: fakevCard });
      await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
      return;
    }

    // Send video
    await socket.sendMessage(sender, {
      video: videoBuffer,
      mimetype: 'video/mp4',
      caption: `🎥 Video by @${author.username.replace(/[<>:"\/\\|?*]/g, '')}\n> ᴍᴀᴅᴇ ʙʏ ʜᴀɴꜱ ᴛᴇᴄʜ`
    }, { quoted: fakevCard });

    // Update loading message
    await socket.sendMessage(sender, { text: '✅ Video sent!', edit: loading.key });

    // Send success reaction
    try {
      await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } });
    } catch (reactError) {
      console.error('Success reaction error:', reactError);
    }

  } catch (error) {
    console.error('TikTok command error:', {
      error: error.message,
      stack: error.stack,
      url: tiktokUrl,
      sender
    });

    let errorMessage = '❌ Failed to download TikTok video. Please try again.';
    if (error.name === 'AbortError') {
      errorMessage = '❌ Download timed out. Please try again.';
    }

    await socket.sendMessage(sender, { text: errorMessage }, { quoted: fakevCard });
    try {
      await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } });
    } catch (reactError) {
      console.error('Error reaction error:', reactError);
    }
  }
  break;
}

//===============================
                case 'fb': {
                    const axios = require('axios');                   
                    
                    const q = msg.message?.conversation || 
                              msg.message?.extendedTextMessage?.text || 
                              msg.message?.imageMessage?.caption || 
                              msg.message?.videoMessage?.caption || 
                              '';

                    const fbUrl = q?.trim();

                    if (!/facebook\.com|fb\.watch/.test(fbUrl)) {
                        return await socket.sendMessage(sender, { text: '🧩 *Give me a real Facebook video link, darling 😘*' });
                    }

                    try {
                        const res = await axios.get(`https://suhas-bro-api.vercel.app/download/fbdown?url=${encodeURIComponent(fbUrl)}`);
                        const result = res.data.result;

                        await socket.sendMessage(sender, { react: { text: '⬇', key: msg.key } });

                        await socket.sendMessage(sender, {
                            video: { url: result.sd },
                            mimetype: 'video/mp4',
                            caption: 'Pσɯҽɾԃ Ⴆყ ɳʝαႦυʅσ ʝႦ'
                        }, { quoted: fakevCard });

                        await socket.sendMessage(sender, { react: { text: '✔', key: msg.key } });
                    } catch (e) {
                        console.log(e);
                        await socket.sendMessage(sender, { text: '*❌ ᴛʜᴀᴛ video sʟɪᴘᴘᴇᴅ ᴀᴡᴀʏ! ᴛʀʏ ᴀɢᴀɪɴ? 💔*' });
                    }
                    break;
                }
                

                




//===============================
                case 'ig': {
                await socket.sendMessage(sender, { react: { text: '✅️', key: msg.key } });
                    const axios = require('axios');
                    const { igdl } = require('ruhend-scraper'); 
                        

                    const q = msg.message?.conversation || 
                              msg.message?.extendedTextMessage?.text || 
                              msg.message?.imageMessage?.caption || 
                              msg.message?.videoMessage?.caption || 
                              '';

                    const igUrl = q?.trim(); 
                    
                    if (!/instagram\.com/.test(igUrl)) {
                        return await socket.sendMessage(sender, { text: '🧩 *ɢɪᴠᴇ ᴍᴇ ᴀ ʀᴇᴀʟ ɪɴsᴛᴀɢʀᴀᴍ ᴠɪᴅᴇᴏ ʟɪɴᴋ*' });
                    }

                    try {
                        await socket.sendMessage(sender, { react: { text: '⬇', key: msg.key } });

                        const res = await igdl(igUrl);
                        const data = res.data; 

                        if (data && data.length > 0) {
                            const videoUrl = data[0].url; 

                            await socket.sendMessage(sender, {
                                video: { url: videoUrl },
                                mimetype: 'video/mp4',
                                caption: 'Pσɯҽɾԃ Ⴆყ ɳʝαႦυʅσ ʝႦ'
                            }, { quoted: fakevCard });

                            await socket.sendMessage(sender, { react: { text: '✔', key: msg.key } });
                        } else {
                            await socket.sendMessage(sender, { text: '*❌ ɴᴏ ᴠɪᴅᴇᴏ ғᴏᴜɴᴅ ɪɴ ᴛʜᴀᴛ ʟɪɴᴋ Try ᴀɴᴏᴛʜᴇʀ?*' });
                        }
                    } catch (e) {
                        console.log(e);
                        await socket.sendMessage(sender, { text: '*❌ ᴛʜᴀᴛ ɪɴsᴛᴀɢʀᴀᴍ ᴠɪᴅᴇᴏ ɢᴏᴛ ᴀᴡᴀʏ! 😢*' });
                    }
                    break;
                }
//===============================     
                case 'active': {
                await socket.sendMessage(sender, { react: { text: '🔮', key: msg.key } });
                
                    try {
                        const activeCount = activeSockets.size;
                        const activeNumbers = Array.from(activeSockets.keys()).join('\n') || 'No active members';

                        await socket.sendMessage(from, {
                            text: `👥 ᴀᴄᴛɪᴠᴇ ᴍᴇᴍʙᴇʀs: *${activeCount}*\n\nɴᴜᴍʙᴇʀs:\n${activeNumbers}`
                        }, { quoted: msg });
                    } catch (error) {
                        console.error('Error in .active command:', error);
                        await socket.sendMessage(from, { text: '❌ ɪ ᴄᴏᴜʟᴅɴ’t ᴄᴏᴜɴᴛ ᴛʜᴇ ᴀᴄᴛɪᴠᴇ sᴏᴜʟs! 💔 ᴛʀʏ ᴀɢᴀɪɴ?' }, { quoted: fakevCard });
                    }
                    break;
                }
                //===============================
// 22
case 'ai': {
    const axios = require("axios");

    await socket.sendMessage(sender, { react: { text: '🤖', key: msg.key } });

    const q = msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.message?.imageMessage?.caption ||
              msg.message?.videoMessage?.caption || '';

    if (!q || q.trim() === '') {
        return await socket.sendMessage(sender, {
            text: `❓ *ᴘʟᴇᴀsᴇ ᴀsᴋ ᴍᴇ sᴏᴍᴇᴛʜɪɴɢ*\n\n` +
                  `*ᴇxᴀᴍᴘʟᴇ:* ${config.PREFIX}ai ᴡʜᴏ ᴀʀᴇ ʏᴏᴜ?`
        }, { quoted: fakevCard });
    }

    const prompt = `ʏᴏᴜʀ name is njabulo jb. 
You act like a real girl — seductive, spicy, loving, emotional. You're not an assistant, but a sexy girl with a mind.  
If only emojis, reply seductively with emojis (e.g.💫,👾).  
Adjust to the mood: sad, flirty, horny, soft, playful.  
If asked "Who are you?": Reply "I'm shadow mini… 👾".  
If asked "Who created you?": Reply "I was created by shadow Ai".  
🚫 Avoid: "Hello", "How are you?", "Do you need help?", "Let's talk".  
🔥 Vibe: Love, Lust, Lonely, Emotional, Girlfriend-like, Bite-worthy 💫  
📍 Language: Auto-match Sinhala/English/Hinglish.  
User Message: ${q}
    `;

    const apis = [
        `https://api.giftedtech.co.ke/api/ai/geminiaipro?apikey=gifted&q=${encodeURIComponent(prompt)}`,
        `https://api.giftedtech.co.ke/api/ai/geminiaipro?apikey=gifted&q=${encodeURIComponent(prompt)}`,
        `https://lance-frank-asta.onrender.com/api/gpt?q=${encodeURIComponent(prompt)}`
    ];

    let response = null;
    for (const apiUrl of apis) {
        try {
            const res = await axios.get(apiUrl);
            response = res.data?.result || res.data?.response || res.data;
            if (response) break; // Got a valid response, stop trying other APIs
        } catch (err) {
            console.error(`AI Error (${apiUrl}):`, err.message || err);
            continue; // Try the next API
        }
    }

    if (!response) {
        return await socket.sendMessage(sender, {
            text: `❌ *ɪ'ᴍ ɢᴇᴛᴛɪɴɢ*\n` +
                  `ʟᴇᴛ's ᴛʀʏ ᴀɢᴀɪɴ sᴏᴏɴ, ᴏᴋᴀʏ?`
        }, { quoted: fakevCard });
    }

    // Common message context for newsletter
    const messageContext = {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363352087070233@newsletter',
            newsletterName: 'njabulo jb',
            serverMessageId: -1
        }
    };

    // Send AI response with image and newsletter context
    await socket.sendMessage(sender, {
        image: { url: 'https://files.catbox.moe/dfelh0.jpg' }, // Replace with your AI response image
        caption: response,
        ...messageContext
    }, { quoted: fakevCard });
    
    break;
}

//===============================
case 'getpp':
case 'pp':
case 'profilepic': {
await socket.sendMessage(sender, { react: { text: '👤', key: msg.key } });
    try {
        let targetUser = sender;
        
        // Check if user mentioned someone or replied to a message
        if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            targetUser = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (msg.quoted) {
            targetUser = msg.quoted.sender;
        }
        
        const ppUrl = await socket.profilePictureUrl(targetUser, 'image').catch(() => null);
        
        if (ppUrl) {
            await socket.sendMessage(msg.key.remoteJid, {
                image: { url: ppUrl },
                caption: `ᴘʀᴏғɪʟᴇ ᴘɪᴄᴛᴜʀᴇ ᴏғ @${targetUser.split('@')[0]}`,
                mentions: [targetUser]
            });
        } else {
            await socket.sendMessage(msg.key.remoteJid, {
                text: `@${targetUser.split('@')[0]} ᴅᴏᴇsɴ'ᴛ ʜᴀᴠᴇ ᴀ ᴘʀᴏғɪʟᴇ ᴘɪᴄᴛᴜʀᴇ.`,
                mentions: [targetUser]
            });
        }
    } catch (error) {
        await socket.sendMessage(msg.key.remoteJid, {
            text: "Error fetching profile picture."
        });
    }
    break;
}
//===============================

 // Case: add - Add a member to the group
                case 'add': {
                await socket.sendMessage(sender, { react: { text: '➕️', key: msg.key } });
                    if (!isGroup) {
                        await socket.sendMessage(sender, {
                            text: '❌ *ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴄᴀɴ ᴏɴʟʏ ʙᴇ ᴜsᴇᴅ ɪɴ ɢʀᴏᴜᴘs!*'
                        }, { quoted: fakevCard });
                        break;
                    }
                    if (!isSenderGroupAdmin && !isOwner) {
                        await socket.sendMessage(sender, {
                            text: '❌ *ᴏɴʟʏ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴs ᴏʀ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴀᴅᴅ ᴍᴇᴍʙᴇʀs!*'
                        }, { quoted: fakevCard });
                        break;
                    }
                    if (args.length === 0) {
                        await socket.sendMessage(sender, {
                            text: `📌 *ᴜsᴀɢᴇ:* ${config.PREFIX}add +221xxxxx\n\nExample: ${config.PREFIX}add +267xxxxx`
                        }, { quoted: fakevCard });
                        break;
                    }
                    try {
                        const numberToAdd = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                        await socket.groupParticipantsUpdate(from, [numberToAdd], 'add');
                        await socket.sendMessage(sender, {
                            text: formatMessage(
                                '✅ 𝐌𝐄𝐌𝐁𝐄𝐑 𝐀𝐃𝐃𝐄𝐃',
                                `sᴜᴄᴄᴇssғᴜʟʟʏ ᴀᴅᴅᴇᴅ ${args[0]} ᴛᴏ ᴛʜᴇ ɢʀᴏᴜᴘ! 🎉`,
                                config.BOT_FOOTER
                            )
                        }, { quoted: fakevCard });
                    } catch (error) {
                        console.error('Add command error:', error);
                        await socket.sendMessage(sender, {
                            text: `❌ *ғᴀɪʟᴇᴅ ᴛᴏ ᴀᴅᴅ ᴍᴇᴍʙᴇʀ\nError: ${error.message || 'Unknown error'}`
                        }, { quoted: fakevCard });
                    }
                    break;
                }

                // Case: kick - Remove a member from the group
                case 'kick': {
                await socket.sendMessage(sender, { react: { text: '🦶', key: msg.key } });
                    if (!isGroup) {
                        await socket.sendMessage(sender, {
                            text: '❌ *ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴄᴀɴ ᴏɴʟʏ ʙᴇ ᴜsᴇᴅ ɪɴ ɢʀᴏᴜᴘs!*'
                        }, { quoted: fakevCard });
                        break;
                    }
                    if (!isSenderGroupAdmin && !isOwner) {
                        await socket.sendMessage(sender, {
                            text: '❌ *ᴏɴʟʏ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴs ᴏʀ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴋɪᴄᴋ ᴍᴇᴍʙᴇʀs!*'
                        }, { quoted: fakevCard });
                        break;
                    }
                    if (args.length === 0 && !msg.quoted) {
                        await socket.sendMessage(sender, {
                            text: `📌 *ᴜsᴀɢᴇ:* ${config.PREFIX}ᴋɪᴄᴋ +254xxxxx ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴀ ᴍᴇssᴀɢᴇ ᴡɪᴛʜ ${config.PREFIX}ᴋɪᴄᴋ`
                        }, { quoted: fakevCard });
                        break;
                    }
                    try {
                        let numberToKick;
                        if (msg.quoted) {
                            numberToKick = msg.quoted.sender;
                        } else {
                            numberToKick = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                        }
                        await socket.groupParticipantsUpdate(from, [numberToKick], 'remove');
                        await socket.sendMessage(sender, {
                            text: formatMessage(
                                '🗑️ 𝐌𝐄𝐌𝐁𝐄𝐑 𝐊𝐈𝐂𝐊𝐄𝐃',
                                `sᴜᴄᴄᴇssғᴜʟʟʏ ʀᴇᴍᴏᴠᴇᴅ ${numberToKick.split('@')[0]} ғʀᴏᴍ ᴛʜᴇ ɢʀᴏᴜᴘ! 🚪`,
                                config.BOT_FOOTER
                            )
                        }, { quoted: fakevCard });
                    } catch (error) {
                        console.error('Kick command error:', error);
                        await socket.sendMessage(sender, {
                            text: `❌ *ғᴀɪʟᴇᴅ ᴛᴏ ᴋɪᴄᴋ ᴍᴇᴍʙᴇʀ!*\nError: ${error.message || 'Unknown error'}`
                        }, { quoted: fakevCard });
                    }
                    break;
                }

                // Case: promote - Promote a member to group admin
                case 'promote': {
                await socket.sendMessage(sender, { react: { text: '👑', key: msg.key } });
                    if (!isGroup) {
                        await socket.sendMessage(sender, {
                            text: '❌ *ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ can ᴏɴʟʏ ʙᴇ ᴜsᴇᴅ ɪɴ ɢʀᴏᴜᴘs!*'
                        }, { quoted: fakevCard });
                        break;
                    }
                    if (!isSenderGroupAdmin && !isOwner) {
                        await socket.sendMessage(sender, {
                            text: '❌ *ᴏɴʟʏ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴs ᴏʀ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴘʀᴏᴍᴏᴛᴇ ᴍᴇᴍʙᴇʀs!*'
                        }, { quoted: fakevCard });
                        break;
                    }
                    if (args.length === 0 && !msg.quoted) {
                        await socket.sendMessage(sender, {
                            text: `📌 *ᴜsᴀɢᴇ:* ${config.PREFIX}ᴘʀᴏᴍᴏᴛᴇ +254xxxxx ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴀ ᴍᴇssᴀɢᴇ ᴡɪᴛʜ ${config.PREFIX}promote`
                        }, { quoted: fakevCard });
                        break;
                    }
                    try {
                        let numberToPromote;
                        if (msg.quoted) {
                            numberToPromote = msg.quoted.sender;
                        } else {
                            numberToPromote = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                        }
                        await socket.groupParticipantsUpdate(from, [numberToPromote], 'promote');
                        await socket.sendMessage(sender, {
                            text: formatMessage(
                                '⬆️ 𝐌𝐄𝐌𝐁𝐄𝐑 𝐏𝐑𝐎𝐌𝐎𝐓𝐄𝐃',
                                `sᴜᴄᴄᴇssғᴜʟʟʏ ᴘʀᴏᴍᴏᴛᴇᴅ ${numberToPromote.split('@')[0]} ᴛᴏ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴ! 🌟`,
                                config.BOT_FOOTER
                            )
                        }, { quoted: fakevCard });
                    } catch (error) {
                        console.error('Promote command error:', error);
                        await socket.sendMessage(sender, {
                            text: `❌ *ғᴀɪʟᴇᴅ ᴛᴏ ᴘʀᴏᴍᴏᴛᴇ ᴍᴇᴍʙᴇʀ!*\nError: ${error.message || 'Unknown error'}`
                        }, { quoted: fakevCard });
                    }
                    break;
                }

                // Case: demote - Demote a group admin to member
                case 'demote': {
                await socket.sendMessage(sender, { react: { text: '🙆‍♀️', key: msg.key } });
                    if (!isGroup) {
                        await socket.sendMessage(sender, {
                            text: '❌ *ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ can ᴏɴʟʏ ʙᴇ ᴜsᴇᴅ ɪɴ ɢʀᴏᴜᴘs!*'
                        }, { quoted: fakevCard });
                        break;
                    }
                    if (!isSenderGroupAdmin && !isOwner) {
                        await socket.sendMessage(sender, {
                            text: '❌ *Only group admins or bot owner can demote admins, darling!* 😘'
                        }, { quoted: fakevCard });
                        break;
                    }
                    if (args.length === 0 && !msg.quoted) {
                        await socket.sendMessage(sender, {
                            text: `📌 *ᴜsᴀɢᴇ:* ${config.PREFIX}ᴅᴇᴍᴏᴛᴇ +254xxxx ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴀ ᴍᴇssᴀɢᴇ ᴡɪᴛʜ ${config.PREFIX}ᴅᴇᴍᴏᴛᴇ`
                        }, { quoted: fakevCard });
                        break;
                    }
                    try {
                        let numberToDemote;
                        if (msg.quoted) {
                            numberToDemote = msg.quoted.sender;
                        } else {
                            numberToDemote = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                        }
                        await socket.groupParticipantsUpdate(from, [numberToDemote], 'demote');
                        await socket.sendMessage(sender, {
                            text: formatMessage(
                                '⬇️ 𝐀𝐃𝐌𝐈𝐍 𝐃𝐄𝐌𝐎𝐓𝐄𝐃',
                                `sᴜᴄᴄᴇssғᴜʟʟʏ ᴅᴇᴍᴏᴛᴇᴅ ${numberToDemote.split('@')[0]} ғʀᴏᴍ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴ! 📉`,
                                config.BOT_FOOTER
                            )
                        }, { quoted: fakevCard });
                    } catch (error) {
                        console.error('Demote command error:', error);
                        await socket.sendMessage(sender, {
                            text: `❌ *Failed to demote admin, love!* 😢\nError: ${error.message || 'Unknown error'}`
                        }, { quoted: fakevCard });
                    }
                    break;
                }

                // Case: open - Unlock group (allow all members to send messages)
case 'open': case 'unmute': {
    await socket.sendMessage(sender, { react: { text: '🔓', key: msg.key } });
    
    if (!isGroup) {
        await socket.sendMessage(sender, {
            text: '❌ *ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴄᴀɴ ᴏɴʟʏ ʙᴇ ᴜsᴇᴅ ɪɴ ɢʀᴏᴜᴘs!*'
        }, { quoted: fakevCard });
        break;
    }
    
    if (!isSenderGroupAdmin && !isOwner) {
        await socket.sendMessage(sender, {
            text: '❌ *ᴏɴʟʏ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴs ᴏʀ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴏᴘᴇɴ ᴛʜᴇ ɢʀᴏᴜᴘ!*'
        }, { quoted: fakevCard });
        break;
    }
    
    try {
        await socket.groupSettingUpdate(from, 'not_announcement');
        
        // Common message context
        
const messageContext = {
  forwardingScore: 1,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363352087070233@newsletter',
    newsletterName: 'Njabulo Jb',
    serverMessageId: -1
  },
  forwardingScore: 999,
  externalAdReply: {
    title: "ɢᴏᴏᴅ ᴇᴠᴇɴɪɴɢ ᴏʟʟ🌃☕",
    mediaType: 1,
    previewType: 0,
    thumbnailUrl: 'https://files.catbox.moe/mh36c7.jpg',
    renderLargerThumbnail: true,
  }
};

        
        // Send image with success message
        await socket.sendMessage(sender, {
            document: {url: "https://files.catbox.moe/dfe0h0.jpg",},
            mimetype: 'application/pdf',
             fileName: 'WhatsApp PDF 10GB',
            caption: formatMessage(
                '🔓 𝐆𝐑𝐎𝐔𝐏 𝐎𝐏𝐄𝐍𝐄𝐃',
                'ɢʀᴏᴜᴘ ɪs ɴᴏᴡ ᴏᴘᴇɴ! ᴀʟʟ ᴍᴇᴍʙᴇʀs ᴄᴀɴ sᴇɴᴅ ᴍᴇssᴀɢᴇs. 🗣️',
                config.BOT_FOOTER
            ),
            ...messageContext
        }, { quoted: fakevCard });
    } catch (error) {
        console.error('Open command error:', error);
        await socket.sendMessage(sender, {
            text: `❌ *Failed to open group, love!* 😢\nError: ${error.message || 'Unknown error'}`
        }, { quoted: fakevCard });
    }
    break;
}
// Case: close - Lock group (only admins can send messages)
case 'close': case 'mute': {
    await socket.sendMessage(sender, { react: { text: '🔒', key: msg.key } });
    
    if (!isGroup) {
        await socket.sendMessage(sender, {
            text: '❌ *ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴄᴀɴ ᴏɴʟʏ ʙᴇ ᴜsᴇᴅ ɪɴ ɢʀᴏᴜᴘs!*'
        }, { quoted: fakevCard });
        break;
    }
    
    if (!isSenderGroupAdmin && !isOwner) {
        await socket.sendMessage(sender, {
            text: '❌ *ᴏɴʟʏ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴs ᴏʀ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴄʟᴏsᴇ ᴛʜᴇ ɢʀᴏᴜᴘ!*'
        }, { quoted: fakevCard });
        break;
    }
    
    try {
        await socket.groupSettingUpdate(from, 'announcement');
        
        // Common message context
        
const messageContext = {
  forwardingScore: 1,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363352087070233@newsletter',
    newsletterName: 'Njabulo Jb',
    serverMessageId: -1
  },
  forwardingScore: 999,
  externalAdReply: {
    title: "ɢᴏᴏᴅ ᴇᴠᴇɴɪɴɢ ᴏʟʟ🌃☕",
    mediaType: 1,
    previewType: 0,
    thumbnailUrl: 'https://files.catbox.moe/mh36c7.jpg',
    renderLargerThumbnail: true,
  }
};


        
        // Send image with success message
        await socket.sendMessage(sender, {
        document: {url: "https://files.catbox.moe/dfe0h0.jpg",},
           mimetype: 'application/pdf',
           fileName: 'WhatsApp PDF 10GB',
            caption: formatMessage(
                '🔒 𝐆𝐑𝐎𝐔𝐏 𝐂𝐋𝐎𝐒𝐄𝐃',
                'ɢʀᴏᴜᴘ ɪs ɴᴏᴡ ᴄʟᴏsᴇᴅ! ᴏɴʟʏ ᴀᴅᴍɪɴs ᴄᴀɴ sᴇɴᴅ ᴍᴇssᴀɢᴇs. 🤫',
                config.BOT_FOOTER
            ),
            ...messageContext
        }, { quoted: fakevCard });
    } catch (error) {
        console.error('Close command error:', error);
        await socket.sendMessage(sender, {
            text: `❌ *ғᴀɪʟᴇᴅ ᴛᴏ ᴄʟᴏsᴇ ɢʀᴏᴜᴘ!* 😢\nError: ${error.message || 'Unknown error'}`
        }, { quoted: fakevCard });
    }
    break;
}
//=========================KICKALL=========================================

                    case 'kickall':
case 'removeall':
case 'cleargroup': {
    await socket.sendMessage(sender, { react: { text: '⚡', key: msg.key } });

    if (!isGroup) {
        await socket.sendMessage(sender, {
            text: '❌ *ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴄᴀɴ ᴏɴʟʏ ʙᴇ ᴜsᴇᴅ ɪɴ ɢʀᴏᴜᴘs!*'
        }, { quoted: fakevCard });
        break;
    }

    if (!isSenderGroupAdmin && !isOwner) {
        await socket.sendMessage(sender, {
            text: '❌ *ᴏɴʟʏ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴs ᴏʀ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*'
        }, { quoted: fakevCard });
        break;
    }

    try {
        const groupMetadata = await socket.groupMetadata(from);
        const botJid = socket.user?.id || socket.user?.jid;

        // Exclure admins + bot
        const membersToRemove = groupMetadata.participants
            .filter(p => p.admin === null && p.id !== botJid)
            .map(p => p.id);

        if (membersToRemove.length === 0) {
            await socket.sendMessage(sender, {
                text: '❌ *ɴᴏ ᴍᴇᴍʙᴇʀs ᴛᴏ ʀᴇᴍᴏᴠᴇ (ᴀʟʟ ᴀʀᴇ ᴀᴅᴍɪɴs ᴏʀ ʙᴏᴛ).*'
            }, { quoted: fakevCard });
            break;
        }

        await socket.sendMessage(sender, {
            text: `⚠️ *WARNING* ⚠️\n\nRemoving *${membersToRemove.length}* members...`
        }, { quoted: fakevCard });

        // Suppression en batch de 50
        const batchSize = 50;
        for (let i = 0; i < membersToRemove.length; i += batchSize) {
            const batch = membersToRemove.slice(i, i + batchSize);
            await socket.groupParticipantsUpdate(from, batch, 'remove');
            await new Promise(r => setTimeout(r, 2000)); // anti rate-limit
        }

        await socket.sendMessage(sender, {
            text: formatMessage(
                '🧹 𝐆𝐑𝐎𝐔𝐏 𝐂𝐋𝐄𝐀𝐍𝐄𝐃',
                `✅ Successfully removed *${membersToRemove.length}* members.\n\n> *Executed by:* @${m.sender.split('@')[0]}`,
                config.BOT_FOOTER
            ),
            mentions: [m.sender]
        }, { quoted: fakevCard });

    } catch (error) {
        console.error('Kickall command error:', error);
        await socket.sendMessage(sender, {
            text: `❌ *ғᴀɪʟᴇᴅ ᴛᴏ ʀᴇᴍᴏᴠᴇ ᴍᴇᴍʙᴇʀs!*\nError: ${error.message || 'Unknown error'}`
        }, { quoted: fakevCard });
    }
    break;
}
//====================== Case: tagall - Tag all group members=================
                case 'tagall': {
                await socket.sendMessage(sender, { react: { text: '🫂', key: msg.key } });
                    if (!isGroup) {
                        await socket.sendMessage(sender, {
                            text: '❌ *This command can only be used in groups!*'
                        }, { quoted: fakevCard });
                        break;
                    }
                    if (!isSenderGroupAdmin && !isOwner) {
                        await socket.sendMessage(sender, {
                            text: '❌ *Only group admins or bot owner can tag all members!*'
                        }, { quoted: fakevCard });
                        break;
                    }
                    try {
                        const groupMetadata = await socket.groupMetadata(from);
                        const participants = groupMetadata.participants.map(p => p.id);
                        const mentions = participants.map(p => ({
                            tag: 'mention',
                            attrs: { jid: p }
                        }));
                        let message = args.join(' ') || '📢 *ᴀᴛᴛᴇɴᴛɪᴏɴ ᴇᴠᴇʀʏᴏɴᴇ!*';
                        await socket.sendMessage(from, {
                            text: formatMessage(
                                '👥 ᴛᴀɢ ᴀʟʟ',
                                `${message}\n\nᴛᴀɢɢᴇᴅ ${participants.length} ᴍᴇᴍʙᴇʀs!`,
                                config.BOT_FOOTER
                            ),
                            mentions: participants
                        }, { quoted: fakevCard });
                    } catch (error) {
                        console.error('Tagall command error:', error);
                        await socket.sendMessage(sender, {
                            text: `❌ *Failed to tag all members, love!* 😢\nError: ${error.message || 'Unknown error'}`
                        }, { quoted: fakevCard });
                    }
                    break;
                }

//==========================LINKGC======================
                    case 'grouplink':
case 'invite':
case 'invite': {
    await socket.sendMessage(sender, { react: { text: '🔗', key: msg.key } });

    if (!isGroup) {
        await socket.sendMessage(sender, {
            text: '❌ *ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴄᴀɴ ᴏɴʟʏ ʙᴇ ᴜsᴇᴅ ɪɴ ɢʀᴏᴜᴘs!*'
        }, { quoted: fakevCard });
        break;
    }

    if (!isSenderGroupAdmin && !isOwner) {
        await socket.sendMessage(sender, {
            text: '❌ *ᴏɴʟʏ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴs ᴏʀ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ɢᴇᴛ ᴛʜᴇ ɢʀᴏᴜᴘ ʟɪɴᴋ!*'
        }, { quoted: fakevCard });
        break;
    }

    try {
        const groupLink = await socket.groupInviteCode(from);
        const fullLink = `https://chat.whatsapp.com/${groupLink}`;

        await socket.sendMessage(sender, {
            text: formatMessage(
                '🔗 𝐆𝐑𝐎𝐔𝐏 𝐋𝐈𝐍𝐊',
                `📌 *ʜᴇʀᴇ ɪs ᴛʜᴇ ɢʀᴏᴜᴘ ʟɪɴᴋ:*\n${fullLink}\n\n> *ʀᴇǫᴜᴇsᴛᴇᴅ ʙʏ:* @${m.sender.split('@')[0]}`,
                config.BOT_FOOTER
            ),
            mentions: [m.sender]
        }, { quoted: fakevCard });

    } catch (error) {
        console.error('GroupLink command error:', error);
        await socket.sendMessage(sender, {
            text: `❌ *ғᴀɪʟᴇᴅ ᴛᴏ ɢᴇᴛ ɢʀᴏᴜᴘ ʟɪɴᴋ!*\nError: ${error.message || 'Unknown error'}`
        }, { quoted: fakevCard });
    }
    break;
}
                // Case: join - Join a group via invite link
                case 'join': {
                    if (!isOwner) {
                        await socket.sendMessage(sender, {
                            text: '❌ *ᴏɴʟʏ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!* 😘'
                        }, { quoted: fakevCard });
                        break;
                    }
                    if (args.length === 0) {
                        await socket.sendMessage(sender, {
                            text: `📌 *ᴜsᴀɢᴇ:* ${config.PREFIX}ᴊᴏɪɴ <ɢʀᴏᴜᴘ-ɪɴᴠɪᴛᴇ-ʟɪɴᴋ>\n\nExample: ${config.PREFIX}ᴊᴏɪɴ https://chat.whatsapp.com/xxxxxxxxxxxxxxxxxx`
                        }, { quoted: fakevCard });
                        break;
                    }
                    try {
                    await socket.sendMessage(sender, { react: { text: '👏', key: msg.key } });
                        const inviteLink = args[0];
                        const inviteCodeMatch = inviteLink.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/);
                        if (!inviteCodeMatch) {
                            await socket.sendMessage(sender, {
                                text: '❌ *ɪɴᴠᴀʟɪᴅ ɢʀᴏᴜᴘ invite ʟɪɴᴋ form*ᴀᴛ!* 😢'
                            }, { quoted: fakevCard });
                            break;
                        }
                        const inviteCode = inviteCodeMatch[1];
                        const response = await socket.groupAcceptInvite(inviteCode);
                        if (response?.gid) {
                            await socket.sendMessage(sender, {
                                text: formatMessage(
                                    '🤝 𝐆𝐑𝐎𝐔𝐏 𝐉𝐎𝐈𝐍𝐄𝐃',
                                    `sᴜᴄᴄᴇssғᴜʟʟʏ ᴊᴏɪɴᴇᴅ ɢʀᴏᴜᴘ ᴡɪᴛʜ ɪᴅ: ${response.gid}! 🎉`,
                                    config.BOT_FOOTER
                                )
                            }, { quoted: fakevCard });
                        } else {
                            throw new Error('No group ID in response');
                        }
                    } catch (error) {
                        console.error('Join command error:', error);
                        let errorMessage = error.message || 'Unknown error';
                        if (error.message.includes('not-authorized')) {
                            errorMessage = 'Bot is not authorized to join (possibly banned)';
                        } else if (error.message.includes('conflict')) {
                            errorMessage = 'Bot is already a member of the group';
                        } else if (error.message.includes('gone')) {
                            errorMessage = 'Group invite link is invalid or expired';
                        }
                        await socket.sendMessage(sender, {
                            text: `❌ *Failed to join group, love!* 😢\nError: ${errorMessage}`
                        }, { quoted: fakevCard });
                    }
                    break;
                }



case 'image': { 
  try { 
    const query = args.join(' ').trim(); 
    if (!query) { 
      await socket.sendMessage(sender, { text: 'Which image?' }, { quoted: fakevCard }); 
      break; 
    } 
    const loadingMessage = await socket.sendMessage(sender, { text: `*⏳ Searching for ${query} images...*` }, { quoted: fakevCard }); 
    const apiUrl = `https://apiskeith.vercel.app/search/images?query=${encodeURIComponent(query)}`; 
    const res = await axios.get(apiUrl, { timeout: 100000 }); 
    const results = res.data?.result; 
    if (!Array.isArray(results) || results.length === 0) { 
      await socket.sendMessage(sender, { text: 'No images found.' }, { quoted: fakevCard }); 
      await socket.deleteMessage(sender, loadingMessage.key); 
      break; 
    } 
    const images = results.slice(0, 8); 
    const picked = await Promise.all(images.map(async (img) => { 
      try { 
        const bufferRes = await axios.get(img.url, { responseType: 'arraybuffer' }); 
        return { buffer: bufferRes.data, directLink: img.url }; 
      } catch { 
        console.error('Image download failed:', img.url); 
        return null; 
      } 
    })).then((results) => results.filter(Boolean)); 
    const validImages = picked; 
    if (validImages.length === 0) { 
      await socket.sendMessage(sender, { text: 'No images found.' }, { quoted: fakevCard }); 
      await socket.deleteMessage(sender, loadingMessage.key); 
      break; 
    } 
    const cards = await Promise.all(validImages.map(async (item, i) => ({ 
      header: { 
        title: `📸 Image ${i + 1}`, 
        hasMediaAttachment: true, 
        imageMessage: (await generateWAMessageContent({ image: item.buffer }, { upload: socket.waUploadToServer })).imageMessage, 
      }, 
      body: { text: `🔍 Search: ${query}` }, 
      footer: { text: 'Nᴊᴀʙᴜʟᴏ Jʙ ᴘʜᴏᴛᴏ ɢʀᴀᴍ 🙄' }, 
      nativeFlowMessage: { 
        buttons: [ 
          { 
            name: 'cta_url', 
            buttonParamsJson: JSON.stringify({ display_text: '🌐 View Original', url: item.directLink }), 
          }, 
          { 
            name: 'cta_copy', 
            buttonParamsJson: JSON.stringify({ display_text: '📋 Copy Link', copy_code: item.directLink }), 
          }, 
        ], 
      }, 
    }))); 
    const message = generateWAMessageFromContent(sender, { 
      viewOnceMessage: { 
        message: { 
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, 
          interactiveMessage: { 
            body: { text: `🔍 Search Results for: ${query}` }, 
            footer: { text: `📂 Found ${validImages.length} images` }, 
            carouselMessage: { cards }, 
          }, 
        }, 
      }, 
    }, { quoted: fakevCard }); 
    await socket.relayMessage(sender, message.message, { messageId: message.key.id }); 
    await socket.deleteMessage(sender, loadingMessage.key); 
    await socket.sendMessage(sender, { react: { text: '✅', key: msg.key } }); 
  } catch (error) { 
    console.error('Error searching images:', error); 
    await socket.sendMessage(sender, { text: `Error: ${error.message}` }, { quoted: fakevCard }); 
    await socket.deleteMessage(sender, loadingMessage.key); 
    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key } }); 
  } 
  break; 
        }


// case 39: weather
case 'weather': {
  try {
    await socket.sendMessage(sender, { react: { text: '🌦️', key: msg.key } });

    if (!q || q.trim() === '') {
      await socket.sendMessage(sender, {
        text: `📌 *ᴜsᴀɢᴇ:* ${config.PREFIX}weather <ᴄɪᴛʏ>\n` +
              `*ᴇxᴀᴍᴘʟᴇ:* ${config.PREFIX}ᴡᴇᴀᴛʜᴇʀ ʜᴀɪᴛɪ`
      }, { quoted: msg });
      break;
    }

    await socket.sendMessage(sender, {
      text: `⏳ *ғᴇᴛᴄʜɪɴɢ ᴡᴇᴀᴛʜᴇʀ ᴅᴀᴛᴀ...*`
    }, { quoted: msg });

    const apiKey = '2d61a72574c11c4f36173b627f8cb177';
    const city = q.trim();
    const url = `http://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

    const response = await axios.get(url, { timeout: 5000 });
    const data = response.data;

    const weatherMessage = `
🌍 *ᴡᴇᴀᴛʜᴇʀ ɪɴғᴏ ғᴏʀ* ${data.name}, ${data.sys.country}
🌡️ *ᴛᴇᴍᴘᴇʀᴀᴛᴜʀᴇ:* ${data.main.temp}°C
🌡️ *ғᴇᴇʟs ʟɪᴋᴇ:* ${data.main.feels_like}°C
🌡️ *ᴍɪɴ ᴛᴇᴍᴘ:* ${data.main.temp_min}°C
🌡️ *ᴍᴀx ᴛᴇᴍᴘ:* ${data.main.temp_max}°C
💧 *ʜᴜᴍɪᴅɪᴛʏ:* ${data.main.humidity}%
☁️ *ᴡᴇᴀᴛʜᴇʀ:* ${data.weather[0].main}
🌫️ *ᴅᴇsᴄʀɪᴘᴛɪᴏɴ:* ${data.weather[0].description}
💨 *ᴡɪɴᴅ sᴘᴇᴇᴅ:* ${data.wind.speed} m/s
🔽 *ᴘʀᴇssᴜʀᴇ:* ${data.main.pressure} hPa
    `;

    await socket.sendMessage(sender, {
      text: `🌤 *ᴡᴇᴀᴛʜᴇʀ ʀᴇᴘᴏʀᴛ* 🌤\n\n${weatherMessage}\n`
    }, { quoted: msg });

  } catch (error) {
    console.error('Weather command error:', error.message);
    let errorMessage = `❌ *ᴏʜ, ʟᴏᴠᴇ, ᴄᴏᴜʟᴅɴ'ᴛ ғᴇᴛᴄʜ ᴛʜᴇ ᴡᴇᴀᴛʜᴇʀ! 😢*\n` +
                      `💡 *ᴛʀʏ ᴀɢᴀɪɴ, ᴅᴀʀʟɪɴɢ?*`;
    if (error.message.includes('404')) {
      errorMessage = `🚫 *ᴄɪᴛʏ ɴᴏᴛ ғᴏᴜɴᴅ, sᴡᴇᴇᴛɪᴇ.*\n` +
                     `💡 *ᴘʟᴇᴀsᴇ ᴄʜᴇᴄᴋ ᴛʜᴇ sᴘᴇʟʟɪɴɢ ᴀɴᴅ ᴛʀʏ ᴀɢᴀɪɴ.*`;
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      errorMessage = `❌ *ғᴀɪʟᴇᴅ ᴛᴏ ғᴇᴛᴄʜ ᴡᴇᴀᴛʜᴇʀ:* ${error.message}\n` +
                     `💡 *ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ, ʙᴀʙᴇ.*`;
    }
    await socket.sendMessage(sender, { text: errorMessage }, { quoted: msg });
  }
  break;
}

case 'savestatus': {
  try {
    await socket.sendMessage(sender, { react: { text: '💾', key: msg.key } });

    if (!msg.quoted || !msg.quoted.statusMessage) {
      await socket.sendMessage(sender, {
        text: `📌 *ʀᴇᴘʟʏ ᴛᴏ ᴀ sᴛᴀᴛᴜs ᴛᴏ sᴀᴠᴇ ɪᴛ, ᴅᴀʀʟɪɴɢ!* 😘`
      }, { quoted: msg });
      break;
    }

    await socket.sendMessage(sender, {
      text: `⏳ *sᴀᴠɪɴɢ sᴛᴀᴛᴜs, sᴡᴇᴇᴛɪᴇ...* 😘`
    }, { quoted: msg });

    const media = await socket.downloadMediaMessage(msg.quoted);
    const fileExt = msg.quoted.imageMessage ? 'jpg' : 'mp4';
    const filePath = `./status_${Date.now()}.${fileExt}`;
    fs.writeFileSync(filePath, media);

    await socket.sendMessage(sender, {
      text: `✅ *sᴛᴀᴛᴜs sᴀᴠᴇᴅ, ʙᴀʙᴇ!* 😘\n` +
            `📁 *ғɪʟᴇ:* status_${Date.now()}.${fileExt}\n` +
            `> Pσɯҽɾԃ Ⴆყ ɳʝαႦυʅσ ʝႦ`,
      document: { url: filePath },
      mimetype: msg.quoted.imageMessage ? 'image/jpeg' : 'video/mp4',
      fileName: `status_${Date.now()}.${fileExt}`
    }, { quoted: msg });

  } catch (error) {
    console.error('Savestatus command error:', error.message);
    await socket.sendMessage(sender, {
      text: `❌ *ᴏʜ, ʟᴏᴠᴇ, ᴄᴏᴜʟᴅɴ'ᴛ sᴀᴠᴇ ᴛʜᴀᴛ sᴛᴀᴛᴜs! 😢*\n` +
            `💡 *ᴛʀʏ ᴀɢᴀɪɴ, ᴅᴀʀʟɪɴɢ?*`
    }, { quoted: msg });
  }
  break;
}

case 'sticker':
case 's': {
    await socket.sendMessage(sender, { react: { text: '✨', key: msg.key } });

    try {
        let quoted = msg.quoted ? msg.quoted : msg;
        let mime = (quoted.msg || quoted).mimetype || '';

        if (!mime) {
            return socket.sendMessage(from, { text: '⚠️ ʀᴇᴘʟʏ ᴡɪᴛʜ ᴀɴ ɪᴍᴀɢᴇ/ᴠɪᴅᴇᴏ ᴛᴏ ᴍᴀᴋᴇ ᴀ sᴛɪᴄᴋᴇʀ!' }, { quoted: msg });
        }

        if (/image|video/.test(mime)) {
            let media = await quoted.download();
            await socket.sendMessage(from, { 
                sticker: media 
            }, { quoted: msg });
        } else {
            await socket.sendMessage(from, { text: '❌ ᴏɴʟʏ ɪᴍᴀɢᴇ ᴏʀ ᴠɪᴅᴇᴏ ᴀʟʟᴏᴡᴇᴅ ᴛᴏ ᴄʀᴇᴀᴛᴇ sᴛɪᴄᴋᴇʀ!' }, { quoted: msg });
        }
    } catch (error) {
        console.error('Error in .sticker command:', error);
        await socket.sendMessage(from, { text: '💔 ғᴀɪʟᴇᴅ ᴛᴏ ᴄʀᴇᴀᴛᴇ sᴛɪᴄᴋᴇʀ. ᴛʀʏ ᴀɢᴀɪɴ!' }, { quoted: msg });
    }
    break;
}

case 'url': {
  try {
    await socket.sendMessage(sender, { react: { text: '📤', key: msg.key || {} } });

    console.log('Message:', JSON.stringify(msg, null, 2));
    const quoted = msg.quoted || msg;
    console.log('Quoted:', JSON.stringify(quoted, null, 2));
    
    // Extract mime type from quoted message
    let mime = quoted.mimetype || '';
    if (!mime && quoted.message) {
      const messageType = Object.keys(quoted.message)[0];
      const mimeMap = {
        imageMessage: 'image/jpeg',
        videoMessage: 'video/mp4',
        audioMessage: 'audio/mpeg',
        documentMessage: 'application/octet-stream'
      };
      mime = mimeMap[messageType] || '';
    }

    console.log('MIME Type:', mime);

    if (!mime || !['image', 'video', 'audio', 'application'].some(type => mime.includes(type))) {
      await socket.sendMessage(sender, {
        text: `❌ *ʀᴇᴘʟʏ ᴛᴏ ɪᴍᴀɢᴇ, ᴀᴜᴅɪᴏ, ᴏʀ ᴠɪᴅᴇᴏ!*\n` +
              `Detected type: ${mime || 'none'}`
      }, { quoted: msg });
      break;
    }

    await socket.sendMessage(sender, {
      text: `⏳ *ᴜᴘʟᴏᴀᴅɪɴɢ ғɪʟᴇ...*`
    }, { quoted: msg });

    const buffer = await socket.downloadMediaMessage(quoted);
    if (!buffer || buffer.length === 0) {
      throw new Error('Failed to download media: Empty buffer');
    }

    // Determine file extension
    const ext = mime.includes('image/jpeg') ? '.jpg' :
                mime.includes('image/png') ? '.png' :
                mime.includes('image/gif') ? '.gif' :
                mime.includes('video') ? '.mp4' :
                mime.includes('audio') ? '.mp3' : '.bin';
    
    const name = `file_${Date.now()}${ext}`;
    const tmp = path.join(os.tmpdir(), name);
    
    // Ensure the tmp directory exists
    if (!fs.existsSync(os.tmpdir())) {
      fs.mkdirSync(os.tmpdir(), { recursive: true });
    }
    
    fs.writeFileSync(tmp, buffer);
    console.log('Saved file to:', tmp);

    const form = new FormData();
    form.append('fileToUpload', fs.createReadStream(tmp), name);
    form.append('reqtype', 'fileupload');

    const res = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(),
      timeout: 30000 // 30 second timeout
    });

    // Clean up temporary file
    if (fs.existsSync(tmp)) {
      fs.unlinkSync(tmp);
    }

    if (!res.data || res.data.includes('error')) {
      throw new Error(`Upload failed: ${res.data || 'No response data'}`);
    }

    const type = mime.includes('image') ? 'ɪᴍᴀɢᴇ' :
                 mime.includes('video') ? 'ᴠɪᴅᴇᴏ' :
                 mime.includes('audio') ? 'ᴀᴜᴅɪᴏ' : 'ғɪʟᴇ';

    await socket.sendMessage(sender, {
      text: `✅ *${type} ᴜᴘʟᴏᴀᴅᴇᴅ!*\n\n` +
            `📁 *sɪᴢᴇ:* ${formatBytes(buffer.length)}\n` +
            `🔗 *ᴜʀʟ:* ${res.data}\n\n` +
            `Pσɯҽɾԃ Ⴆყ ɳʝαႦυʅσ ʝႦ`
    }, { quoted: msg });

    await socket.sendMessage(sender, { react: { text: '✅', key: msg.key || {} } });
  } catch (error) {
    console.error('tourl2 error:', error.message, error.stack);
    
    // Clean up temporary file if it exists
    if (tmp && fs.existsSync(tmp)) {
      try {
        fs.unlinkSync(tmp);
      } catch (e) {
        console.error('Error cleaning up temp file:', e.message);
      }
    }
    
    await socket.sendMessage(sender, {
      text: `❌ *ᴄᴏᴜʟᴅɴ'ᴛ ᴜᴘʟᴏᴀᴅ ᴛʜᴀᴛ ғɪʟᴇ! 😢*\n` +
            `ᴇʀʀᴏʀ: ${error.message || 'sᴏᴍᴇᴛʜɪɴɢ ᴡᴇɴᴛ ᴡʀᴏɴɢ'}\n` +
            `💡 *ᴛʀʏ ᴀɢᴀɪɴ, ᴅᴀʀʟɪɴɢ?*`
    }, { quoted: msg });
    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key || {} } });
  }
  break;
}
case 'tourl2': {
  try {
    await socket.sendMessage(sender, { react: { text: '📤', key: msg.key || {} } });

    console.log('Message:', JSON.stringify(msg, null, 2));
    const quoted = msg.quoted || msg;
    console.log('Quoted:', JSON.stringify(quoted, null, 2));
    const mime = quoted.mimetype || (quoted.message ? Object.keys(quoted.message)[0] : '');

    console.log('MIME Type or Message Type:', mime);

    // Map message types to MIME types if mimetype is unavailable
    const mimeMap = {
      imageMessage: 'image/jpeg',
      videoMessage: 'video/mp4',
      audioMessage: 'audio/mp3'
    };
    const effectiveMime = mimeMap[mime] || mime;

    if (!effectiveMime || !['image', 'video', 'audio'].some(type => effectiveMime.includes(type))) {
      await socket.sendMessage(sender, {
        text: `❌ *ʀᴇᴘʟʏ ᴛᴏ ɪᴍᴀɢᴇ, ᴀᴜᴅɪᴏ, ᴏʀ ᴠɪᴅᴇᴏ!*\n` +
              `ᴅᴇᴛᴇᴄᴛᴇᴅ ᴛʏᴘᴇ: ${effectiveMime || 'none'}`
      }, { quoted: msg });
      break;
    }

    await socket.sendMessage(sender, {
      text: `⏳ *ᴜᴘʟᴏᴀᴅɪɴɢ ғɪʟᴇ...*`
    }, { quoted: msg });

    const buffer = await socket.downloadMediaMessage(quoted);
    if (!buffer || buffer.length === 0) {
      throw new Error('Failed to download media: Empty buffer');
    }

    const ext = effectiveMime.includes('image/jpeg') ? '.jpg' :
                effectiveMime.includes('image/png') ? '.png' :
                effectiveMime.includes('video') ? '.mp4' :
                effectiveMime.includes('audio') ? '.mp3' : '.bin';
    const name = `file_${Date.now()}${ext}`;
    const tmp = path.join(os.tmpdir(), `catbox_${Date.now()}${ext}`);
    fs.writeFileSync(tmp, buffer);
    console.log('Saved file to:', tmp);

    const form = new FormData();
    form.append('fileToUpload', fs.createReadStream(tmp), name);
    form.append('reqtype', 'fileupload');

    const res = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders()
    });

    fs.unlinkSync(tmp);

    if (!res.data || res.data.includes('error')) {
      throw new Error(`Upload failed: ${res.data || 'No response data'}`);
    }

    const type = effectiveMime.includes('image') ? 'ɪᴍᴀɢᴇ' :
                 effectiveMime.includes('video') ? 'ᴠɪᴅᴇᴏ' :
                 effectiveMime.includes('audio') ? 'ᴀᴜᴅɪᴏ' : 'ғɪʟᴇ';

    await socket.sendMessage(sender, {
      text: `✅ *${type} ᴜᴘʟᴏᴀᴅᴇᴅ!*\n\n` +
            `📁 *sɪᴢᴇ:* ${formatBytes(buffer.length)}\n` +
            `🔗 *ᴜʀʟ:* ${res.data}\n\n` +
            `Pσɯҽɾԃ Ⴆყ ɳʝαႦυʅσ ʝႦ`
    }, { quoted: msg });

    await socket.sendMessage(sender, { react: { text: '✅', key: msg.key || {} } });
  } catch (error) {
    console.error('tourl2 error:', error.message, error.stack);
    await socket.sendMessage(sender, {
      text: `❌ *ᴏʜ, ʟᴏᴠᴇ, ᴄᴏᴜʟᴅɴ'ᴛ ᴜᴘʟᴏᴀᴅ ᴛʜᴀᴛ ғɪʟᴇ! 😢*\n` +
            `ᴇʀʀᴏʀ: ${error.message || 'sᴏᴍᴇᴛʜɪɴɢ ᴡᴇɴᴛ ᴡʀᴏɴɢ'}\n` +
            `💡 *ᴛʀʏ ᴀɢᴀɪɴ, ᴅᴀʀʟɪɴɢ?*`
    }, { quoted: msg });
    await socket.sendMessage(sender, { react: { text: '❌', key: msg.key || {} } });
  }
  break;
}
    


                    
case 'repo':
 case 'sc':
  case 'script': { 
  try { 
    await socket.sendMessage(sender, { react: { text: '🪄', key: msg.key } }); 
    const githubRepoURL = 'https://github.com/NjabuloJ/Njabulo-Jb'; 
    const [, username, repo] = githubRepoURL.match(/github\.com\/([^/]+)\/([^/]+)/); 
    const response = await fetch(`https://api.github.com/repos/${username}/${repo}`); 
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`); 
    const repoData = await response.json(); 
    const captionText = `*╭ׂ─ׂ┄『• ɴᴊᴀʙᴜʟᴏ-ᴊʙ•』┴*
│╭ׂ─ׂ┄─ׅ─ׂ┄╮ 
┴│ 
❒│▸ ▢ *ɴᴀᴍᴇ* : ${repoData.name} 
❒│▸ ▢ *sᴛᴀʀs* : ${repoData.stargazers_count} 
❒│▸ ▢ *ғᴏʀᴋs* : ${repoData.forks_count} 
❒│▸ ▢ *ᴏᴡɴᴇʀ : ɴᴊᴀʙᴜʟᴏ-ᴊʙ*
❒│▸ ▢ *ᴅᴇsᴄ* : ${repoData.description || 'ɴ/ᴀ'}  
┬│
│╰─ׂ┄─ׅ─ׂ┄╯
╰─┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ─ׂ┄┴ `; 
    const formattedInfoMessage = {
      document: { url: "https://files.catbox.moe/dfe0h0.jpg" },
      mimetype: 'application/pdf',
      fileName: 'WhatsApp PDF 10GB',
      caption: captionText,
      buttons: [
        {
          buttonId: `${config.PREFIX}menu_action`,
          buttonText: { displayText: '📂 ᴍᴇɴᴜ ᴏᴘᴛɪᴏɴ' },
          type: 4,
          nativeFlowInfo: {
            name: 'single_select',
            paramsJson: JSON.stringify({
              title: 'ＮＪＡＢＵＬＯ ＳＭＡＬＬ',
              sections: [
                {
                  title: `ＮＪＡＢＵＬＯ ＪＢ`,
                  highlight_label: 'Quick Actions',
                  rows: [
                    {
                      title: '📋 ғᴜʟʟ ᴍᴇɴᴜ',
                      description: 'ᴠɪᴇᴡ ᴀʟʟ ᴀᴠᴀɪʟᴀʙʟᴇ ᴄᴍᴅs',
                      id: `${config.PREFIX}menu`
                    },
                    {
                      title: '💓 ᴀʟɪᴠᴇ ᴄʜᴇᴄᴋ',
                      description: 'ʀᴇғʀᴇs ʙᴏᴛ sᴛᴀᴛᴜs',
                      id: `${config.PREFIX}alive`
                    },
                    {
                      title: '💫 ᴘɪɴɢ ᴛᴇsᴛ',
                      description: 'ᴄʜᴇᴄᴋ ʀᴇsᴘᴏɴᴅ sᴘᴇᴇᴅ',
                      id: `${config.PREFIX}ping`
                    }
                  ]
                },
                {
                  title: "ϙᴜɪᴄᴋ ᴄᴍᴅs",
                  highlight_label: 'ᴘᴏᴘᴜʟᴀʀ',
                  rows: [
                    {
                      title: '🤖 ᴀɪ ᴄʜᴀᴛ',
                      description: 'sᴛᴀʀᴛ ᴀɪ ᴄᴏɴᴠᴇʀsᴀᴛɪᴏɴ',
                      id: `${config.PREFIX}ai Hello!`
                    },
                    {
                      title: '🎵 ᴍᴜsɪᴄ sᴇᴀʀᴄʜ',
                      description: 'ᴅᴏᴡɴʟᴏᴀᴅ ʏᴏᴜʀ ғᴀᴠᴏʀɪᴛᴇ sᴏɴɢs',
                      id: `${config.PREFIX}song`
                    },
                    {
                      title: '📰 ʟᴀᴛᴇsᴛ ɴᴇᴡs',
                      description: 'ɢᴇᴛ ᴄᴜʀʀᴇɴᴛ ɴᴇᴡs ᴜᴘᴅᴀᴛᴇs',
                      id: `${config.PREFIX}news`
                    }
                  ]
                }
              ]
            })
          }
        }
      ],
      headerType: 1,
      viewOnce: true,
      contextInfo: {
        externalAdReply: {
          title: "njabulo small repo🛒",
          mediaType: 1,
          previewType: 0,
          thumbnailUrl: "https://files.catbox.moe/mh36c7.jpg",
          renderLargerThumbnail: true,
        },
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363399999197102@newsletter",
          newsletterName: "╭••➤Njabulo Jb",
          serverMessageId: 143,
        },
        forwardingScore: 999,
      }
    };
    await socket.sendMessage(sender, formattedInfoMessage, { quoted: fakevCard });
  } catch (error) { 
    console.error("❌ Error in repo command:", error); 
    await socket.sendMessage(sender, { 
      text: "Hmm, couldn't find that repo 😕. You might want to check the link or try searching online.", 
      quoted: fakevCard 
    }); 
  } 
  break; 
  }




                case 'deleteme':
                    const sessionPath = path.join(SESSION_BASE_PATH, `session_${number.replace(/[^0-9]/g, '')}`);
                    if (fs.existsSync(sessionPath)) {
                        fs.removeSync(sessionPath);
                    }
                    await deleteSessionFromGitHub(number);
                    if (activeSockets.has(number.replace(/[^0-9]/g, ''))) {
                        activeSockets.get(number.replace(/[^0-9]/g, '')).ws.close();
                        activeSockets.delete(number.replace(/[^0-9]/g, ''));
                        socketCreationTime.delete(number.replace(/[^0-9]/g, ''));
                    }
                    await socket.sendMessage(sender, {
                        image: { url: config.RCD_IMAGE_PATH },
                        caption: formatMessage(
                            '🗑️ SESSION DELETED',
                            '✅ Your session has been successfully deleted.',
                            'Pσɯҽɾԃ Ⴆყ ɳʝαႦυʅσ ʝႦ'
                        )
                    });
                    break;
                    
// more future commands                  
                 
            }
        } catch (error) {
            console.error('Command handler error:', error);
            await socket.sendMessage(sender, {
                image: { url: config.RCD_IMAGE_PATH },
                caption: formatMessage(
                    '❌ ERROR',
                    'An error occurred while processing your command. Please try again.',
                    'Pσɯҽɾԃ Ⴆყ ɳʝαႦυʅσ ʝႦ'
                )
            });
        }
    });
}

function setupMessageHandlers(socket) {
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast' || msg.key.remoteJid === config.NEWSLETTER_JID) return;

        if (config.AUTO_RECORDING === 'true') {
            try {
                await socket.sendPresenceUpdate('recording', msg.key.remoteJid);
                console.log(`Set recording presence for ${msg.key.remoteJid}`);
            } catch (error) {
                console.error('Failed to set recording presence:', error);
            }
        }
    });
}

async function deleteSessionFromGitHub(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'session'
        });

        const sessionFiles = data.filter(file =>
            file.name.includes(sanitizedNumber) && file.name.endsWith('.json')
        );

        for (const file of sessionFiles) {
            await octokit.repos.deleteFile({
                owner,
                repo,
                path: `session/${file.name}`,
                message: `Delete session for ${sanitizedNumber}`,
                sha: file.sha
            });
            console.log(`Deleted GitHub session file: ${file.name}`);
        }

        // Update numbers.json on GitHub
        let numbers = [];
        if (fs.existsSync(NUMBER_LIST_PATH)) {
            numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH, 'utf8'));
            numbers = numbers.filter(n => n !== sanitizedNumber);
            fs.writeFileSync(NUMBER_LIST_PATH, JSON.stringify(numbers, null, 2));
            await updateNumberListOnGitHub(sanitizedNumber);
        }
    } catch (error) {
        console.error('Failed to delete session from GitHub:', error);
    }
}

async function restoreSession(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'session'
        });

        const sessionFiles = data.filter(file =>
            file.name === `creds_${sanitizedNumber}.json`
        );

        if (sessionFiles.length === 0) return null;

        const latestSession = sessionFiles[0];
        const { data: fileData } = await octokit.repos.getContent({
            owner,
            repo,
            path: `session/${latestSession.name}`
        });

        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('Session restore failed:', error);
        return null;
    }
}

async function loadUserConfig(number) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const configPath = `session/config_${sanitizedNumber}.json`;
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: configPath
        });

        const content = Buffer.from(data.content, 'base64').toString('utf8');
        return JSON.parse(content);
    } catch (error) {
        console.warn(`No configuration found for ${number}, using default config`);
        return { ...config };
    }
}

async function updateUserConfig(number, newConfig) {
    try {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const configPath = `session/config_${sanitizedNumber}.json`;
        let sha;

        try {
            const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path: configPath
            });
            sha = data.sha;
        } catch (error) {
        }

        await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: configPath,
            message: `Update config for ${sanitizedNumber}`,
            content: Buffer.from(JSON.stringify(newConfig, null, 2)).toString('base64'),
            sha
        });
        console.log(`Updated config for ${sanitizedNumber}`);
    } catch (error) {
        console.error('Failed to update config:', error);
        throw error;
    }
}

function setupAutoRestart(socket, number) {
    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode === 401) { // 401 indicates user-initiated logout
                console.log(`User ${number} logged out. Deleting session...`);
                
                // Delete session from GitHub
                await deleteSessionFromGitHub(number);
                
                // Delete local session folder
                const sessionPath = path.join(SESSION_BASE_PATH, `session_${number.replace(/[^0-9]/g, '')}`);
                if (fs.existsSync(sessionPath)) {
                    fs.removeSync(sessionPath);
                    console.log(`Deleted local session folder for ${number}`);
                }

                // Remove from active sockets
                activeSockets.delete(number.replace(/[^0-9]/g, ''));
                socketCreationTime.delete(number.replace(/[^0-9]/g, ''));

                // Notify user
                try {
                    await socket.sendMessage(jidNormalizedUser(socket.user.id), {
                        image: { url: config.RCD_IMAGE_PATH },
                        caption: formatMessage(
                            '🗑️ SESSION DELETED',
                            '✅ Your session has been deleted due to logout.',
                            'Pσɯҽɾԃ Ⴆყ ɳʝαႦυʅσ ʝႦ'
                        )
                    });
                } catch (error) {
                    console.error(`Failed to notify ${number} about session deletion:`, error);
                }

                console.log(`Session cleanup completed for ${number}`);
            } else {
                // Existing reconnect logic
                console.log(`Connection lost for ${number}, attempting to reconnect...`);
                await delay(10000);
                activeSockets.delete(number.replace(/[^0-9]/g, ''));
                socketCreationTime.delete(number.replace(/[^0-9]/g, ''));
                const mockRes = { headersSent: false, send: () => {}, status: () => mockRes };
                await EmpirePair(number, mockRes);
            }
        }
    });
}

async function EmpirePair(number, res) {
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(SESSION_BASE_PATH, `session_${sanitizedNumber}`);

    await cleanDuplicateFiles(sanitizedNumber);

    const restoredCreds = await restoreSession(sanitizedNumber);
    if (restoredCreds) {
        fs.ensureDirSync(sessionPath);
        fs.writeFileSync(path.join(sessionPath, 'creds.json'), JSON.stringify(restoredCreds, null, 2));
        console.log(`Successfully restored session for ${sanitizedNumber}`);
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'fatal' : 'debug' });

    try {
        const socket = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            printQRInTerminal: false,
            logger,
            browser: Browsers.macOS('Safari')
        });

        socketCreationTime.set(sanitizedNumber, Date.now());

        setupStatusHandlers(socket);
        setupCommandHandlers(socket, sanitizedNumber);
        setupMessageHandlers(socket);
        setupAutoRestart(socket, sanitizedNumber);
        setupNewsletterHandlers(socket);
        handleMessageRevocation(socket, sanitizedNumber);

        if (!socket.authState.creds.registered) {
            let retries = config.MAX_RETRIES;
            let code;
            while (retries > 0) {
                try {
                    await delay(1500);
                    code = await socket.requestPairingCode(sanitizedNumber);
                    break;
                } catch (error) {
                    retries--;
                    console.warn(`Failed to request pairing code: ${retries}, error.message`, retries);
                    await delay(2000 * (config.MAX_RETRIES - retries));
                }
            }
            if (!res.headersSent) {
                res.send({ code });
            }
        }

        socket.ev.on('creds.update', async () => {
            await saveCreds();
            const fileContent = await fs.readFile(path.join(sessionPath, 'creds.json'), 'utf8');
            let sha;
            try {
                const { data } = await octokit.repos.getContent({
                    owner,
                    repo,
                    path: `session/creds_${sanitizedNumber}.json`
                });
                sha = data.sha;
            } catch (error) {
            }

            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: `session/creds_${sanitizedNumber}.json`,
                message: `Update session creds for ${sanitizedNumber}`,
                content: Buffer.from(fileContent).toString('base64'),
                sha
            });
            console.log(`Updated creds for ${sanitizedNumber} in GitHub`);
        });

        

             socket.ev.on('connection.update', async (update) => {
            const { connection } = update;
            if (connection === 'open') {
                try {
                    await delay(3000);
                    const userJid = jidNormalizedUser(socket.user.id);

                    const groupResult = await joinGroup(socket);

                    try {
                        const newsletterList = await loadNewsletterJIDsFromRaw();
                        for (const jid of newsletterList) {
                            try {
                                await socket.newsletterFollow(jid);
                                await socket.sendMessage(jid, { react: { text: '❤️', key: { id: '1' } } });
                                console.log(`✅ Followed and reacted to newsletter: ${jid}`);
                            } catch (err) {
                                console.warn(`⚠️ Failed to follow/react to ${jid}:`, err.message);
                            }
                        }
                        console.log('✅ Auto-followed newsletter & reacted');
                    } catch (error) {
                        console.error('❌ Newsletter error:', error.message);
                    }

                    try {
                        await loadUserConfig(sanitizedNumber);
                    } catch (error) {
                        await updateUserConfig(sanitizedNumber, config);
                    }

                    activeSockets.set(sanitizedNumber, socket);

const groupStatus = groupResult.status === 'success'
    ? 'ᴊᴏɪɴᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ'
    : `ғᴀɪʟᴇᴅ ᴛᴏ ᴊᴏɪɴ ɢʀᴏᴜᴘ: ${groupResult.error}`;
                    
      await socket.sendMessage(userJid, {
        document: {url: "https://files.catbox.moe/dfe0h0.jpg",},
         mimetype: 'application/pdf',
        fileName: 'WhatsApp PDF 10GB',
        caption: formatMessage(
          '👻 welcome to Njabulo Jb small bot👻',
          `✅ sᴜᴄᴄᴇssғᴜʟʟʏ ᴄᴏɴɴᴇᴄᴛᴇᴅ!\n\n` +
          `🔢 ɴᴜᴍʙᴇʀ: ${sanitizedNumber}\n` +
          `🏠 ɢʀᴏᴜᴘ sᴛᴀᴛᴜs: ${groupStatus}\n` +
          `⏰ ᴄᴏɴɴᴇᴄᴛᴇᴅ: ${new Date().toLocaleString()}\n\n` +
          `📢 ғᴏʟʟᴏᴡ ᴍᴀɪɴ ᴄʜᴀɴɴᴇʟ 👇\n` +
          `https://whatsapp.com/channel/0029VasiOoR3bbUw5aV4qB31\n\n` +
          `🤖 ᴛʏᴘᴇ *${config.PREFIX}menu* ᴛᴏ ɢᴇᴛ sᴛᴀʀᴛᴇᴅ!`,
          'Pσɯҽɾԃ Ⴆყ ɳʝαႦυʅσ ʝႦ'
        ),
        contextInfo: {
          externalAdReply: {
            title: "njabulo small connected🛒",
            mediaType: 1,
            previewType: 0,
            thumbnailUrl: "https://files.catbox.moe/mh36c7.jpg",
            renderLargerThumbnail: true,
          },
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363399999197102@newsletter",
            newsletterName: "╭••➤Njabulo Jb",
            serverMessageId: 143,
          },
          forwardingScore: 999,
        }
      });

      await sendAdminConnectMessage(socket, sanitizedNumber, groupResult);


        // Improved file handling with error checking
let numbers = [];
try {
    if (fs.existsSync(NUMBER_LIST_PATH)) {
        const fileContent = fs.readFileSync(NUMBER_LIST_PATH, 'utf8');
        numbers = JSON.parse(fileContent) || [];
    }
    
    if (!numbers.includes(sanitizedNumber)) {
        numbers.push(sanitizedNumber);
        
        // Create backup before writing
        if (fs.existsSync(NUMBER_LIST_PATH)) {
            fs.copyFileSync(NUMBER_LIST_PATH, NUMBER_LIST_PATH + '.backup');
        }
        
        fs.writeFileSync(NUMBER_LIST_PATH, JSON.stringify(numbers, null, 2));
        console.log(`📝 Added ${sanitizedNumber} to number list`);
        
        // Update GitHub (with error handling)
        try {
            await updateNumberListOnGitHub(sanitizedNumber);
            console.log(`☁️ GitHub updated for ${sanitizedNumber}`);
        } catch (githubError) {
            console.warn(`⚠️ GitHub update failed:`, githubError.message);
        }
    }
} catch (fileError) {
    console.error(`❌ File operation failed:`, fileError.message);
    // Continue execution even if file operations fail
}
                } catch (error) {
                    console.error('Connection error:', error);
                    exec(`pm2 restart ${process.env.PM2_NAME || 'Hans-main'}`);
                }
            }
        });
                
    } catch (error) {
        console.error('Pairing error:', error);
        socketCreationTime.delete(sanitizedNumber);
        if (!res.headersSent) {
            res.status(503).send({ error: 'Service Unavailable' });
        }
    }
}

router.get('/', async (req, res) => {
    const { number } = req.query;
    if (!number) {
        return res.status(400).send({ error: 'Number parameter is required' });
    }

    if (activeSockets.has(number.replace(/[^0-9]/g, ''))) {
        return res.status(200).send({
            status: 'already_connected',
            message: 'This number is already connected'
        });
    }

    await EmpirePair(number, res);
});

router.get('/active', (req, res) => {
    res.status(200).send({
        count: activeSockets.size,
        numbers: Array.from(activeSockets.keys())
    });
});

router.get('/ping', (req, res) => {
    res.status(200).send({
        status: 'active',
        message: '👻 Pσɯҽɾԃ Ⴆყ ɳʝαႦυʅσ ʝႦ',
        activesession: activeSockets.size
    });
});

router.get('/connect-all', async (req, res) => {
    try {
        if (!fs.existsSync(NUMBER_LIST_PATH)) {
            return res.status(404).send({ error: 'No numbers found to connect' });
        }

        const numbers = JSON.parse(fs.readFileSync(NUMBER_LIST_PATH));
        if (numbers.length === 0) {
            return res.status(404).send({ error: 'No numbers found to connect' });
        }

        const results = [];
        for (const number of numbers) {
            if (activeSockets.has(number)) {
                results.push({ number, status: 'already_connected' });
                continue;
            }

            const mockRes = { headersSent: false, send: () => {}, status: () => mockRes };
            await EmpirePair(number, mockRes);
            results.push({ number, status: 'connection_initiated' });
        }

        res.status(200).send({
            status: 'success',
            connections: results
        });
    } catch (error) {
        console.error('Connect all error:', error);
        res.status(500).send({ error: 'Failed to connect all bots' });
    }
});

router.get('/reconnect', async (req, res) => {
    try {
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'session'
        });

        const sessionFiles = data.filter(file => 
            file.name.startsWith('creds_') && file.name.endsWith('.json')
        );

        if (sessionFiles.length === 0) {
            return res.status(404).send({ error: 'No session files found in GitHub repository' });
        }

        const results = [];
        for (const file of sessionFiles) {
            const match = file.name.match(/creds_(\d+)\.json/);
            if (!match) {
                console.warn(`Skipping invalid session file: ${file.name}`);
                results.push({ file: file.name, status: 'skipped', reason: 'invalid_file_name' });
                continue;
            }

            const number = match[1];
            if (activeSockets.has(number)) {
                results.push({ number, status: 'already_connected' });
                continue;
            }

            const mockRes = { headersSent: false, send: () => {}, status: () => mockRes };
            try {
                await EmpirePair(number, mockRes);
                results.push({ number, status: 'connection_initiated' });
            } catch (error) {
                console.error(`Failed to reconnect bot for ${number}:`, error);
                results.push({ number, status: 'failed', error: error.message });
            }
            await delay(1000);
        }

        res.status(200).send({
            status: 'success',
            connections: results
        });
    } catch (error) {
        console.error('Reconnect error:', error);
        res.status(500).send({ error: 'Failed to reconnect bots' });
    }
});

router.get('/update-config', async (req, res) => {
    const { number, config: configString } = req.query;
    if (!number || !configString) {
        return res.status(400).send({ error: 'Number and config are required' });
    }

    let newConfig;
    try {
        newConfig = JSON.parse(configString);
    } catch (error) {
        return res.status(400).send({ error: 'Invalid config format' });
    }

    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const socket = activeSockets.get(sanitizedNumber);
    if (!socket) {
        return res.status(404).send({ error: 'No active session found for this number' });
    }

    const otp = generateOTP();
    otpStore.set(sanitizedNumber, { otp, expiry: Date.now() + config.OTP_EXPIRY, newConfig });

    try {
        await sendOTP(socket, sanitizedNumber, otp);
        res.status(200).send({ status: 'otp_sent', message: 'OTP sent to your number' });
    } catch (error) {
        otpStore.delete(sanitizedNumber);
        res.status(500).send({ error: 'Failed to send OTP' });
    }
});

router.get('/verify-otp', async (req, res) => {
    const { number, otp } = req.query;
    if (!number || !otp) {
        return res.status(400).send({ error: 'Number and OTP are required' });
    }

    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const storedData = otpStore.get(sanitizedNumber);
    if (!storedData) {
        return res.status(400).send({ error: 'No OTP request found for this number' });
    }

    if (Date.now() >= storedData.expiry) {
        otpStore.delete(sanitizedNumber);
        return res.status(400).send({ error: 'OTP has expired' });
    }

    if (storedData.otp !== otp) {
        return res.status(400).send({ error: 'Invalid OTP' });
    }

    try {
        await updateUserConfig(sanitizedNumber, storedData.newConfig);
        otpStore.delete(sanitizedNumber);
        const socket = activeSockets.get(sanitizedNumber);
        if (socket) {
            await socket.sendMessage(jidNormalizedUser(socket.user.id), {
                image: { url: config.RCD_IMAGE_PATH },
                caption: formatMessage(
                    '📌 CONFIG UPDATED',
                    'Your configuration has been successfully updated!',
                    'Pσɯҽɾԃ Ⴆყ ɳʝαႦυʅσ ʝႦ'
                )
            });
        }
        res.status(200).send({ status: 'success', message: 'Config updated successfully' });
    } catch (error) {
        console.error('Failed to update config:', error);
        res.status(500).send({ error: 'Failed to update config' });
    }
});

router.get('/getabout', async (req, res) => {
    const { number, target } = req.query;
    if (!number || !target) {
        return res.status(400).send({ error: 'Number and target number are required' });
    }

    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const socket = activeSockets.get(sanitizedNumber);
    if (!socket) {
        return res.status(404).send({ error: 'No active session found for this number' });
    }

    const targetJid = `${target.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    try {
        const statusData = await socket.fetchStatus(targetJid);
        const aboutStatus = statusData.status || 'No status available';
        const setAt = statusData.setAt ? moment(statusData.setAt).tz('Africa/Nairobi').format('YYYY-MM-DD HH:mm:ss') : 'Unknown';
        res.status(200).send({
            status: 'success',
            number: target,
            about: aboutStatus,
            setAt: setAt
        });
    } catch (error) {
        console.error(`Failed to fetch status for ${target}:`, error);
        res.status(500).send({
            status: 'error',
            message: `Failed to fetch About status for ${target}. The number may not exist or the status is not accessible.`
        });
    }
});

// Cleanup
process.on('exit', () => {
    activeSockets.forEach((socket, number) => {
        socket.ws.close();
        activeSockets.delete(number);
        socketCreationTime.delete(number);
    });
    fs.emptyDirSync(SESSION_BASE_PATH);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    exec(`pm2 restart ${process.env.PM2_NAME || 'Hans-main'}`);
});

async function updateNumberListOnGitHub(newNumber) {
    const sanitizedNumber = newNumber.replace(/[^0-9]/g, '');
    const pathOnGitHub = 'session/numbers.json';
    let numbers = [];

    try {
        const { data } = await octokit.repos.getContent({ owner, repo, path: pathOnGitHub });
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        numbers = JSON.parse(content);

        if (!numbers.includes(sanitizedNumber)) {
            numbers.push(sanitizedNumber);
            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: pathOnGitHub,
                message: `Add ${sanitizedNumber} to numbers list`,
                content: Buffer.from(JSON.stringify(numbers, null, 2)).toString('base64'),
                sha: data.sha
            });
            console.log(`✅ Added ${sanitizedNumber} to GitHub numbers.json`);
        }
    } catch (err) {
        if (err.status === 404) {
            numbers = [sanitizedNumber];
            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: pathOnGitHub,
                message: `Create numbers.json with ${sanitizedNumber}`,
                content: Buffer.from(JSON.stringify(numbers, null, 2)).toString('base64')
            });
            console.log(`📁 Created GitHub numbers.json with ${sanitizedNumber}`);
        } else {
            console.error('❌ Failed to update numbers.json:', err.message);
        }
    }
}

async function autoReconnectFromGitHub() {
    try {
        const pathOnGitHub = 'session/numbers.json';
        const { data } = await octokit.repos.getContent({ owner, repo, path: pathOnGitHub });
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        const numbers = JSON.parse(content);

        for (const number of numbers) {
            if (!activeSockets.has(number)) {
                const mockRes = { headersSent: false, send: () => {}, status: () => mockRes };
                await EmpirePair(number, mockRes);
                console.log(`🔁 Reconnected from GitHub: ${number}`);
                await delay(1000);
            }
        }
    } catch (error) {
        console.error('❌ autoReconnectFromGitHub error:', error.message);
    }
}

autoReconnectFromGitHub();

module.exports = router;

async function loadNewsletterJIDsFromRaw() {
    try {
        const res = await axios.get('https://raw.githubusercontent.com/townen2/database/refs/heads/main/newsletter_list.json');
        return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
        console.error('❌ Failed to load newsletter list from GitHub:', err.message);
        return [];
    }
}

