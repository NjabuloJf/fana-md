const { fana } = require("../njabulo/fana");
const { getAllSudoNumbers, isSudoTableNotEmpty } = require("../bdd/sudo");
const conf = require("../set");
const moment = require("moment-timezone");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const axios = require("axios");

// ── Random image list ─────────────────────────────────────────────
const njabulox = [
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ── Owner command with cards (like img command) ─────────────────────────────
fana(
    {
        nomCom: "owner",
        alias: ["creator", "dev", "support"],
        categorie: "General",
        reaction: "👑",
    },
    async (dest, zk, commandeOptions) => {
        const { ms } = commandeOptions;

        // Send typing indicator
        await zk.sendPresenceUpdate('composing', dest);

        // Get current time
        const now = moment().tz("Africa/Garissa");
        
        // Get image buffer for card
        let imageBuffer = null;
        try {
            const imgRes = await axios.get(randomNjabulourl, { responseType: 'arraybuffer', timeout: 10000 });
            imageBuffer = imgRes.data;
        } catch (err) {
            console.error("Failed to download image:", err.message);
        }
        
        const imageMessage = imageBuffer ? (await generateWAMessageContent({ image: imageBuffer }, { upload: zk.waUploadToServer })).imageMessage : null;
        
        // Check if there are sudo users
        const thsudo = await isSudoTableNotEmpty();
        
        let cards = [];
        
        // Card 1: Owner Info
        const ownerCard = {
            header: {
                title: `👑 OWNER INFO`,
                hasMediaAttachment: true,
                imageMessage: imageMessage,
            },
            body: {
                text: `📛 *Name:* ${conf.OWNER_NAME || "Njabulo JB"}
🤖 *Bot:* ${conf.BOT_NAME || "NJABULO MD"}
📱 *Number:* wa.me/${conf.NUMERO_OWNER}

🗓️ *Created:* 2024
🕐 *Time:* ${now.format("YYYY-MM-DD HH:mm:ss")}

💫 *Powered by NJABULO MD*`
            },
            footer: {
                text: ""
            }
        };
        cards.push(ownerCard);
        
        if (thsudo) {
            const sudos = await getAllSudoNumbers();
            
            let sudoText = `🌟 *Owner:* @${conf.NUMERO_OWNER}\n\n📋 *Sudo Users:*\n`;
            const mentionedJid = [conf.NUMERO_OWNER + "@s.whatsapp.net"];
            
            for (const sudo of sudos) {
                if (sudo) {
                    const sudoNumber = sudo.number || sudo;
                    const sudoNum = sudoNumber.replace(/[^0-9]/g, "");
                    sudoText += `💼 @${sudoNum}\n`;
                    mentionedJid.push(sudoNum + "@s.whatsapp.net");
                }
            }
            
            sudoText += `\n📊 *Total:* ${sudos.length + 1} users`;
            
            // Card 2: Sudo Users List
            const sudoCard = {
                header: {
                    title: `👑 SUDO USERS`,
                    hasMediaAttachment: true,
                    imageMessage: imageMessage,
                },
                body: {
                    text: sudoText
                },
                footer: {
                    text: ""
                }
            };
            cards.push(sudoCard);
        } else {
            // Card 2: No Sudo Users
            const noSudoCard = {
                header: {
                    title: `👑 SUDO USERS`,
                    hasMediaAttachment: true,
                    imageMessage: imageMessage,
                },
                body: {
                    text: `🌟 *Owner:* @${conf.NUMERO_OWNER}

📋 *Sudo Users:* None

📊 *Total:* 1 user`
                },
                footer: {
                    text: ""
                }
            };
            cards.push(noSudoCard);
        }
        
        // Send the carousel message with cards (like img command)
        const message = generateWAMessageFromContent(
            dest,
            {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2
                        },
                        interactiveMessage: {
                            body: { text: `🔍 Owner Information` },
                            footer: { text: `📂 Found ${cards.length} cards` },
                            carouselMessage: { cards },
                        },
                    },
                },
            },
            { quoted: ms }
        );
        
        await zk.relayMessage(dest, message.message, { messageId: message.key.id });
    }
);
