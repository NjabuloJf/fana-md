const { Sticker, createSticker, StickerTypes } = require("wa-sticker-formatter");
const { fana } = require("../njabulo/fana");
const { downloadMediaMessage, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require("fs-extra");
const config = require("../set");
const axios = require("axios");
const FormData = require("form-data");
const { exec } = require("child_process");
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
    const copyOriginal = await translateText("📋 Copy Original", lang);
    const copyTranslation = await translateText("📋 Copy Translation", lang);
    const copyInfo = await translateText("📋 Copy Info", lang);
    return { copyOriginal, copyTranslation, copyInfo };
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

// ── Translate command with 3 cards ─────────────────────────────────────────────
fana({
    nomCom: "translate",
    alias: ["trt", "traduire", "tl"],
    categorie: "Use",
    reaction: "💗",
}, async (chatId, zk, commandeOptions) => {
    const { msgRepondu, repondre, arg, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    // ========== TRANSLATED TEXTS ==========
    const pleaseMention = await translateText("📌 *Please mention a text message to translate*", lang);
    const exampleReply = await translateText("Example: Reply to a message with `.translate en`", lang);
    const specifyLanguage = await translateText("📌 *Please specify a target language*", lang);
    const exampleLanguages = await translateText("Example: `.translate en` (for English)\n`.translate fr` (for French)\n`.translate es` (for Spanish)\n`.translate pt` (for Portuguese)", lang);
    const cannotTranslate = await translateText("❌ *Cannot translate non-text messages*", lang);
    const originalText = await translateText("📝 ORIGINAL TEXT", lang);
    const translatedText = await translateText("🌐 TRANSLATED", lang);
    const translationInfo = await translateText("💗 TRANSLATION INFO", lang);
    const sourceLanguage = await translateText("🔍 *Source Language:* Auto-detected", lang);
    const targetLanguage = await translateText("🌐 *Target Language:*", lang);
    const originalLength = await translateText("📏 *Original Length:*", lang);
    const translatedLength = await translateText("📏 *Translated Length:*", lang);
    const characters = await translateText("characters", lang);
    const poweredBy = await translateText("💫 *Powered by:* NJABULO MD", lang);
    const translationFailed = await translateText("❌ *Translation failed*", lang);
    const checkLanguage = await translateText("Please check your language code or try again later.", lang);

    if (!msgRepondu) {
        return repondre(`${pleaseMention}\n\n${exampleReply}`);
    }

    if (!arg || !arg[0]) {
        return repondre(`${specifyLanguage}\n\n${exampleLanguages}`);
    }

    try {
        const sourceText = msgRepondu.conversation || msgRepondu.extendedTextMessage?.text;

        if (!sourceText) {
            return repondre(cannotTranslate);
        }

        const targetLang = arg[0];
        const translated = await translateText(sourceText, targetLang);

        // Get translated buttons
        const btn = await getTranslatedButtons();

        // Create 3 cards
        const cards = [
            {
                header: {
                    title: originalText,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `${sourceText.substring(0, 300)}${sourceText.length > 300 ? '...' : ''}`,
                },
                footer: {
                    text: "",
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: btn.copyOriginal,
                                copy_code: sourceText,
                            }),
                        },
                    ],
                },
            },
            {
                header: {
                    title: `${translatedText} (${targetLang.toUpperCase()})`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `${translated.substring(0, 300)}${translated.length > 300 ? '...' : ''}`,
                },
                footer: {
                    text: "",
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: btn.copyTranslation,
                                copy_code: translated,
                            }),
                        },
                    ],
                },
            },
            {
                header: {
                    title: translationInfo,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `${sourceLanguage}
${targetLanguage} ${targetLang.toUpperCase()}
${originalLength} ${sourceText.length} ${characters}
${translatedLength} ${translated.length} ${characters}
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
                                display_text: btn.copyInfo,
                                copy_code: `Source Language: Auto-detected\nTarget Language: ${targetLang.toUpperCase()}\nOriginal Length: ${sourceText.length} characters\nTranslated Length: ${translated.length} characters`,
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
                            header: { text: ` ` },
                            body: { text: `*📂 Translation Results*` },
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
                            displayName: "Njabulo Jb",
                            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=${config.NUMERO_OWNER}:+${config.NUMERO_OWNER}\nitem1.X-ABLabel:Bot\nEND:VCARD`
                        }
                    }
                }
            }
        );

        await zk.relayMessage(chatId, message.message, { messageId: message.key.id });

    } catch (error) {
        console.error("Translation error:", error);
        repondre(`${translationFailed}\n\n${checkLanguage}`);
    }
});
