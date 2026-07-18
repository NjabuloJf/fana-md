const { fana } = require("../njabulo/fana");
const axios = require("axios");
const config = require("../set");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

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
async function getTranslatedButtons() {
    const lang = config.LANGUAGE || "en";
    const copyVerse = await translateText("📋 Copy Verse", lang);
    const copyInfo = await translateText("📋 Copy Info", lang);
    const copyBlessing = await translateText("📋 Copy Blessing", lang);
    return { copyVerse, copyInfo, copyBlessing };
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

// ── Helper function to fetch random Bible verse ────────────────────
async function getRandomBibleVerse() {
    try {
        const response = await axios.get('https://labs.bible.org/api/?passage=random&type=json', { timeout: 10000 });
        const data = response.data[0];
        return {
            text: data.text,
            reference: `${data.bookname} ${data.chapter}:${data.verse}`,
            version: 'WEB'
        };
    } catch (error) {
        console.error("Bible API error:", error.message);
        return null;
    }
}

// ── Helper function to fetch specific Bible verse ────────────────────
async function getSpecificBibleVerse(reference) {
    try {
        const response = await axios.get(`https://labs.bible.org/api/?passage=${encodeURIComponent(reference)}&type=json`, { timeout: 10000 });
        const data = response.data;

        if (!data || data.length === 0) {
            return null;
        }

        const verse = data[0];
        return {
            text: verse.text,
            reference: `${verse.bookname} ${verse.chapter}:${verse.verse}`,
            version: 'WEB'
        };
    } catch (error) {
        console.error("Specific verse error:", error.message);
        return null;
    }
}

// ── Bible command with cards ─────────────────────────────────────────────
fana({
    nomCom: "bible",
    alias: ["verse", "biblia", "dailyverse"],
    categorie: "Religion",
    reaction: "📖",
}, async (chatId, zk, commandeOptions) => {
    const { ms, repondre, arg } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    // Translated texts
    const bibleTitle = await translateText("📖 NJABULO MD BIBLE", lang);
    const bibleVerse = await translateText("📂 Bible Verse", lang);
    const verseNotFound = await translateText("❌ *Verse not found*", lang);
    const couldNotFind = await translateText("Could not find", lang);
    const checkReference = await translateText("Please check the reference and try again.", lang);
    const example = await translateText("📌 *Example:*", lang);
    const formats = await translateText("📌 *Formats:*", lang);
    const errorFetching = await translateText("❌ *Error fetching Bible verse*", lang);
    const tryAgainLater = await translateText("Please try again later.", lang);
    const bibleVerseTitle = await translateText("📖 BIBLE VERSE", lang);
    const verseInfo = await translateText("💫 VERSE INFO", lang);
    const blessings = await translateText("🙏 BLESSINGS", lang);
    const reference = await translateText("📖 *Reference:*", lang);
    const version = await translateText("📚 *Version:*", lang);
    const length = await translateText("📏 *Length:*", lang);
    const characters = await translateText("characters", lang);
    const date = await translateText("📅 *Date:*", lang);
    const poweredBy = await translateText("💫 *Powered by:* NJABULO MD", lang);
    const mayThisVerse = await translateText("🕊️ *May this verse bless your day!*", lang);
    const shareWithOthers = await translateText("✨ *Share this verse with others*", lang);
    const letGodWord = await translateText("💫 *Let God's word guide you*", lang);
    const dailyBibleVerse = await translateText("📖 *Daily Bible Verse*", lang);
    const bibleName = await translateText("💒 *NJABULO MD Bible*", lang);

    await zk.sendPresenceUpdate('composing', chatId);

    let verse;

    if (arg && arg[0]) {
        const referenceQuery = arg.join(" ");
        verse = await getSpecificBibleVerse(referenceQuery);
        if (!verse) {
            return repondre(`${verseNotFound}\n\n${couldNotFind} "${referenceQuery}". ${checkReference}\n\n${example} \`.bible John 3:16\`\n\n${formats}\n• John 3:16\n• Genesis 1:1\n• Psalm 23\n• Proverbs 3:5-6`);
        }
    } else {
        verse = await getRandomBibleVerse();
        if (!verse) {
            return repondre(`${errorFetching}\n\n${tryAgainLater}`);
        }
    }

    // Get image buffer for card
    let imageBuffer = null;
    try {
        const imgRes = await axios.get(randomNjabulourl, { responseType: 'arraybuffer', timeout: 10000 });
        imageBuffer = imgRes.data;
    } catch (err) {
        console.error("Failed to download image:", err.message);
    }

    const imageMessage = imageBuffer ? (await generateWAMessageContent({ image: imageBuffer }, { upload: zk.waUploadToServer })).imageMessage : null;

    // Get current date
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const buttons = await getTranslatedButtons();

    // Create cards
    const cards = [
        {
            header: {
                title: bibleVerseTitle,
                hasMediaAttachment: true,
                imageMessage: imageMessage,
            },
            body: {
                text: `📜 *${verse.reference}* (${verse.version})\n\n"${verse.text}"`,
            },
            footer: {
                text: "",
            },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: buttons.copyVerse,
                            copy_code: `${verse.reference}\n\n"${verse.text}"`,
                        }),
                    },
                ],
            },
        },
        {
            header: {
                title: verseInfo,
                hasMediaAttachment: true,
                imageMessage: imageMessage,
            },
            body: {
                text: `${reference} ${verse.reference}
${version} ${verse.version}
${length} ${verse.text.length} ${characters}
${date} ${currentDate}
${poweredBy}`,
            },
            footer: {
                text: "",
            },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: buttons.copyInfo,
                            copy_code: `Reference: ${verse.reference}\nVersion: ${verse.version}\nLength: ${verse.text.length} characters\nDate: ${currentDate}`,
                        }),
                    },
                ],
            },
        },
        {
            header: {
                title: blessings,
                hasMediaAttachment: true,
                imageMessage: imageMessage,
            },
            body: {
                text: `${mayThisVerse}

${shareWithOthers}
${letGodWord}

${dailyBibleVerse}
${bibleName}`,
            },
            footer: {
                text: "",
            },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: buttons.copyBlessing,
                            copy_code: `May this verse bless your day!\n\n${verse.reference}\n"${verse.text}"\n\nShare this verse with others!`,
                        }),
                    },
                ],
            },
        },
    ];

    const message = generateWAMessageFromContent(
        chatId,
        {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2,
                    },
                    interactiveMessage: {
                        header: { text: bibleTitle },
                        body: { text: bibleVerse },
                        headerType: 1,
                        carouselMessage: { cards },
                    },
                },
            },
        },
        {
            quoted: {
                key: {
                    fromMe: false,
                    participant: `0@s.whatsapp.net`,
                    remoteJid: "status@broadcast"
                },
                message: {
                    contactMessage: {
                        displayName: "NJABULO MD",
                        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=${config.NUMERO_OWNER}:+${config.NUMERO_OWNER}\nitem1.X-ABLabel:Bot\nEND:VCARD`
                    }
                }
            }
        }
    );

    await zk.relayMessage(chatId, message.message, { messageId: message.key.id });
});
