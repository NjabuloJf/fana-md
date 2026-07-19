const { fana } = require("../njabulo/fana");
const { getAllSudoNumbers, isSudoTableNotEmpty } = require("../bdd/sudo");
const conf = require("../set");
const moment = require("moment-timezone");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const axios = require("axios");

// ========== GOOGLE TRANSLATE API ==========
let translateText = async (text, targetLang) => {
    try {
        if (!targetLang || targetLang === 'en') return text;
        try {
            const { translate } = require('@vitalets/google-translate-api');
            const result = await translate(text, { to: targetLang });
            return result.text;
        } catch (e) {
            const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`, {
                timeout: 5000
            });
            if (response.data && response.data.responseData) {
                return response.data.responseData.translatedText || text;
            }
            return text;
        }
    } catch (error) {
        console.error('Translation error:', error.message);
        return text;
    }
};

// ========== TRANSLATED BUTTON FUNCTION ==========
async function getTranslatedButton() {
    const lang = conf.LANGUAGE || "en";
    return await translateText("🌐 WA Channel", lang);
}

// ── Random image list ─────────────────────────────────────────────
const njabulox = [
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ── Format runtime function ──────────────────────────────────────────
function formatRuntime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days > 0 ? days + "d " : ""}${hours > 0 ? hours + "h " : ""}${minutes > 0 ? minutes + "m " : ""}${secs}s`;
}

// ── Owner command with cards and contact card ─────────────────────────────
fana({
    nomCom: "owner",
    alias: ["creator", "dev", "support"],
    categorie: "General",
    reaction: "👑",
}, async (dest, zk, commandeOptions) => {
    const { ms } = commandeOptions;
    const lang = conf.LANGUAGE || "en";

    // ========== TRANSLATED TEXTS ==========
    const ownerInfo = await translateText("👑 OWNER INFO", lang);
    const nameLabel = await translateText("📛 *Name:*", lang);
    const botLabel = await translateText("🤖 *Bot:*", lang);
    const numberLabel = await translateText("📱 *Number:*", lang);
    const uptimeLabel = await translateText("⏱️ *Uptime:*", lang);
    const dateLabel = await translateText("🗓️ *Date:*", lang);
    const timeLabel = await translateText("🕐 *Time:*", lang);
    const sudoUsers = await translateText("👑 SUDO USERS", lang);
    const ownerLabel = await translateText("🌟 *Owner:*", lang);
    const sudoListLabel = await translateText("📋 *Sudo Users:*", lang);
    const totalLabel = await translateText("📊 *Total:*", lang);
    const usersLabel = await translateText("users", lang);
    const noneLabel = await translateText("None", lang);
    const waChannel = await translateText("🌐 Channel", lang);
    const njabuloMD = await translateText("👑 njabulo jb", lang);
    const ownerSudoInfo = await translateText("*📂 Owner & sudo Information*", lang);
    const contactLabel = await translateText("Contact", lang);

    // Send typing indicator
    await zk.sendPresenceUpdate('composing', dest);

    // Send contact card first
    const vcard = "BEGIN:VCARD\n" +
        "VERSION:3.0\n" +
        "FN:" + (conf.OWNER_NAME || "Njabulo JB") + "\n" +
        "ORG:NJABULO MD;\n" +
        "TEL;type=CELL;type=VOICE;waid=" + conf.NUMERO_OWNER + ":+" + conf.NUMERO_OWNER + "\n" +
        "END:VCARD";

    await zk.sendMessage(
        dest,
        {
            contacts: {
                displayName: conf.OWNER_NAME || "Njabulo JB",
                contacts: [{ vcard }],
            },
        },
        { quoted: ms }
    );

    // Get current time
    const now = moment().tz("Africa/Garissa");
    const uptime = formatRuntime(process.uptime());

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
            title: ownerInfo,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `${nameLabel} ${conf.OWNER_NAME || "Njabulo JB"}
${botLabel} ${conf.BOT_NAME || "NJABULO MD"}
${numberLabel} wa.me/${conf.NUMERO_OWNER}
${uptimeLabel} ${uptime}
${dateLabel} ${now.format("YYYY-MM-DD")}
${timeLabel} ${now.format("HH:mm:ss")}`,
        },
        footer: {
            text: "",
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: waChannel,
                        url: conf.GURL || "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u"
                    }),
                },
            ],
        },
    };
    cards.push(ownerCard);

    // Card 2: Sudo Users List
    if (thsudo) {
        const sudos = await getAllSudoNumbers();

        let sudoText = `${ownerLabel} @${conf.NUMERO_OWNER}\n\n${sudoListLabel}\n`;

        for (const sudo of sudos) {
            if (sudo) {
                const sudoNumber = sudo.number || sudo;
                const sudoNum = sudoNumber.replace(/[^0-9]/g, "");
                sudoText += `💼 @${sudoNum}\n`;
            }
        }

        sudoText += `\n${totalLabel} ${sudos.length + 1} ${usersLabel}`;

        const sudoCard = {
            header: {
                title: sudoUsers,
                hasMediaAttachment: true,
                imageMessage: imageMessage,
            },
            body: {
                text: sudoText,
            },
            footer: {
                text: "",
            },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: waChannel,
                            url: conf.GURL || "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u"
                        }),
                    },
                ],
            },
        };
        cards.push(sudoCard);
    } else {
        const noSudoCard = {
            header: {
                title: sudoUsers,
                hasMediaAttachment: true,
                imageMessage: imageMessage,
            },
            body: {
                text: `${ownerLabel} @${conf.NUMERO_OWNER}

${sudoListLabel} ${noneLabel}

${totalLabel} 1 ${usersLabel}`,
            },
            footer: {
                text: "",
            },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: waChannel,
                            url: conf.GURL || "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u"
                        }),
                    },
                ],
            },
        };
        cards.push(noSudoCard);
    }

    // Send the carousel message with cards
    const message = generateWAMessageFromContent(
        dest,
        {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2,
                    },
                    interactiveMessage: {
                        header: { text: njabuloMD },
                        body: { text: ownerSudoInfo },
                        headerType: 1,
                        carouselMessage: { cards },
                    },
                },
            },
        },
        { quoted: ms }
    );

    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
});
