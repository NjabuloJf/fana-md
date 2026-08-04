const { fana } = require("../njabulo/fana");
const axios = require("axios");
const config = require("../set");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// ========== GOOGLE TRANSLATE API ==========
let translateText = async (text, targetLang) => {
    try {
        if (!targetLang || targetLang === 'en') return text;
        if (!text) return text;
        try {
            const { translate } = require('@vitalets/google-translate-api');
            const result = await translate(text, { to: targetLang });
            return result.text;
        } catch (e) {
            console.log('⚠️ Google Translate failed, using fallback...');
            try {
                const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`, {
                    timeout: 5000
                });
                if (response.data && response.data.responseData) {
                    return response.data.responseData.translatedText || text;
                }
                return text;
            } catch (fallbackError) {
                console.error('⚠️ Fallback translation failed:', fallbackError.message);
                return text;
            }
        }
    } catch (error) {
        console.error('⚠️ Translation error:', error.message);
        return text;
    }
};

// ========== TRANSLATION CACHE ==========
const translationCache = new Map();

let translateTextWithCache = async (text, targetLang) => {
    if (!targetLang || targetLang === 'en') return text;
    if (!text) return text;
    
    const cacheKey = `${text}_${targetLang}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }
    
    try {
        const result = await translateText(text, targetLang);
        translationCache.set(cacheKey, result);
        setTimeout(() => translationCache.delete(cacheKey), 3600000);
        return result;
    } catch (error) {
        console.error('⚠️ Translation error:', error.message);
        return text;
    }
};

// ========== TRANSLATED TEXT FUNCTION ==========
async function getTranslatedTexts() {
    const lang = config.LANGUAGE || "en";
    return {
        waChannel: await translateTextWithCache("🌐 WA Channel", lang),
        pairCodeTitle: await translateTextWithCache("🔐 YOUR PAIRING CODE", lang),
        copyCode: await translateTextWithCache("📋 Copy Code", lang),
        visitRepo: await translateTextWithCache("📂 Visit Repository", lang),
        visitWebsite: await translateTextWithCache("🌍 Visit Website", lang),
        enterNumber: await translateTextWithCache("📌 Enter your number like:", lang),
        generating: await translateTextWithCache("⏳ Wait, generating your pairing code...", lang),
        copyAndPaste: await translateTextWithCache("✅ Here is your pair code, copy and paste it to the notification above or link devices.", lang),
        errorMsg: await translateTextWithCache("❌ Error getting response from API.", lang),
        pairCardTitle: await translateTextWithCache("📡 PAIRING SYSTEM", lang),
        pairCardDesc: await translateTextWithCache("Generate your WhatsApp pairing code to link devices.", lang),
        repositoryCardTitle: await translateTextWithCache("📂 REPOSITORY", lang),
        repositoryCardDesc: await translateTextWithCache("Visit the official repository for updates and support.", lang),
        websiteCardTitle: await translateTextWithCache("🌍 WEBSITE", lang),
        websiteCardDesc: await translateTextWithCache("Visit the official website for more information.", lang),
        chooseOption: await translateTextWithCache("Reply with number 1, 2, or 3 to choose:", lang),
        invalidChoice: await translateTextWithCache("❌ Invalid choice! Please reply with 1, 2, or 3.", lang),
    };
}

// ── Random image list from GitHub ─────────────────────────────────────────────
const njabulox = [
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ========== IS NUMBER SELECTION ==========
const isNumberSelection = (text) => {
    const num = parseInt(text);
    return num >= 1 && num <= 3 && !isNaN(num);
};

// ========== CREATE 3 CARDS ==========
async function createPairCards(zk, ms, lang) {
    const t = await getTranslatedTexts();
    
    // Image message for cards
    let imageMessage = null;
    try {
        imageMessage = (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage;
    } catch (e) {
        console.log('⚠️ Could not load image');
        imageMessage = (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage;
    }

    // Card 1: Pair Code
    const card1 = {
        header: {
            title: `📡 ${t.pairCardTitle}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `${t.pairCardDesc}\n\n📌 ${t.enterNumber}\n.pair 26777821911\n\n${t.chooseOption}`,
        },
        footer: {
            text: `🔹 Option 1: Generate Pair Code`,
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: t.waChannel,
                        url: config.GURL
                    }),
                },
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 Example",
                        copy_code: ".pair 26777821911",
                    }),
                },
            ],
        },
    };

    // Card 2: Repository
    const card2 = {
        header: {
            title: `📂 ${t.repositoryCardTitle}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `${t.repositoryCardDesc}\n\n📌 *GitHub:*\nhttps://github.com/NjabuloJf/fana-md\n\n${t.chooseOption}`,
        },
        footer: {
            text: `🔹 Option 2: Visit Repository`,
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: t.visitRepo,
                        url: "https://github.com/NjabuloJf/fana-md"
                    }),
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: t.waChannel,
                        url: config.GURL
                    }),
                },
            ],
        },
    };

    // Card 3: Website
    const card3 = {
        header: {
            title: `🌍 ${t.websiteCardTitle}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `${t.websiteCardDesc}\n\n📌 *Website:*\nhttps://njabulojf.github.io\n\n${t.chooseOption}`,
        },
        footer: {
            text: `🔹 Option 3: Visit Website`,
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: t.visitWebsite,
                        url: "https://njabulojf.github.io"
                    }),
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: t.waChannel,
                        url: config.GURL
                    }),
                },
            ],
        },
    };

    return { cards: [card1, card2, card3] };
}

// ========== SEND CAROUSEL ==========
async function sendCarouselMessage(zk, dest, cards, ms) {
    const t = await getTranslatedTexts();
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
                        body: { text: `📡 *Pairing System*` },
                        footer: { text: `🔹 Choose an option` },
                        carouselMessage: { cards },
                    },
                },
            },
        },
        { quoted: ms }
    );

    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
    return message;
}

// ========== STORE FOR ACTIVE REQUESTS ==========
const activeRequests = {};

// ========== MAIN PAIR COMMAND ==========
fana({
    nomCom: "pair",
    aliases: ["session", "code", "paircode", "qrcode"],
    reaction: "📡",
    categorie: "system",
}, async (chatId, zk, commandeOptions) => {
    const { repondre, arg, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";
    const t = await getTranslatedTexts();

    // ========== CHECK IF USER SENT A NUMBER WITH .pair ==========
    const inputText = arg ? arg.join(' ') : '';
    
    // If user sent a number with .pair (e.g., .pair 26777821911)
    if (inputText && inputText.length > 0) {
        const number = inputText.trim();
        const encodedNumber = encodeURIComponent(number);
        const apiUrl = `${config.PAIR_API || 'https://site-code-bv0o.onrender.com/code'}?number=${encodedNumber}`;
        
        try {
            await zk.sendMessage(chatId, {
                text: await translateTextWithCache("⏳ Wait, generating your pairing code...", lang)
            }, { quoted: ms });
            
            console.log(`🔄 Fetching pair code from: ${apiUrl}`);
            
            const response = await axios.get(apiUrl, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const data = response.data;
            
            console.log('📡 API Response:', JSON.stringify(data).substring(0, 200));
            
            if (data && data.code) {
                const pairingCode = data.code;
                const yourPairCode = await translateTextWithCache("🔐 YOUR PAIRING CODE", lang);
                
                const buttons = [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: await translateTextWithCache("📋 Copy Code", lang),
                            copy_code: pairingCode,
                        }),
                    },
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: await translateTextWithCache("🌐 WA Channel", lang),
                            url: config.GURL
                        }),
                    },
                ];
                
                await zk.sendMessage(chatId, {
                    interactiveMessage: {
                        image: { url: randomNjabulourl },
                        header: `${yourPairCode}\n\n${pairingCode}`,
                        buttons: buttons,
                        headerType: 1,
                    },
                }, { quoted: ms });
                
                const copyAndPaste = await translateTextWithCache("✅ Here is your pair code, copy and paste it to the notification above or link devices.", lang);
                await zk.sendMessage(chatId, {
                    text: copyAndPaste
                }, { quoted: ms });
            } else {
                throw new Error("Invalid response from API.");
            }
        } catch (error) {
            console.error("Error getting API response:", error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
            }
            await zk.sendMessage(chatId, {
                text: await translateTextWithCache("❌ Error getting response from API. Please try again later.", lang)
            }, { quoted: ms });
        }
        return;
    }

    // ========== IF NO NUMBER, SHOW 3 CARDS ==========
    // Show the 3 cards
    const { cards } = await createPairCards(zk, ms, lang);
    await sendCarouselMessage(zk, chatId, cards, ms);

    // Store for reply handling
    const senderJid = ms.key.remoteJid;
    activeRequests[senderJid] = {
        timestamp: Date.now()
    };

    // Setup reply collector for number selection (1, 2, or 3)
    if (zk._replyListener) {
        zk.ev.off('messages.upsert', zk._replyListener);
    }

    zk._replyListener = async (update) => {
        try {
            const msg = update.messages[0];
            if (!msg || !msg.message) return;
            
            const sender = msg.key.remoteJid;
            const content = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            
            if (!activeRequests[sender]) return;
            if (!isNumberSelection(content)) return;
            
            const selectedNumber = parseInt(content);
            const data = activeRequests[sender];
            
            delete activeRequests[sender];
            zk.ev.off('messages.upsert', zk._replyListener);
            zk._replyListener = null;

            try {
                await zk.sendMessage(chatId, {
                    react: { text: "📥", key: msg.key }
                });
            } catch (e) {}

            switch(selectedNumber) {
                case 1:
                    // Option 1: Generate Pair Code - Ask for number
                    const enterNumber = await translateTextWithCache("📌 *Enter your number like:*", lang);
                    await zk.sendMessage(chatId, {
                        text: `${enterNumber}\n\n.pair 26777821911`
                    }, { quoted: ms });
                    break;
                case 2:
                    // Option 2: Visit Repository
                    await zk.sendMessage(chatId, {
                        text: `📂 *Repository*\n\nhttps://github.com/NjabuloJf/fana-md\n\n${t.waChannel}: ${config.GURL}`,
                        contextInfo: {
                            externalAdReply: {
                                title: "📂 NJABULO-JB Repository",
                                mediaType: 1,
                                previewType: 0,
                                thumbnailUrl: randomNjabulourl,
                                renderLargerThumbnail: true,
                            },
                        },
                    }, { quoted: ms });
                    break;
                case 3:
                    // Option 3: Visit Website
                    await zk.sendMessage(chatId, {
                        text: `🌍 *Website*\n\nhttps://njabulojf.github.io\n\n${t.waChannel}: ${config.GURL}`,
                        contextInfo: {
                            externalAdReply: {
                                title: "🌍 NJABULO-JB Website",
                                mediaType: 1,
                                previewType: 0,
                                thumbnailUrl: randomNjabulourl,
                                renderLargerThumbnail: true,
                            },
                        },
                    }, { quoted: ms });
                    break;
                default:
                    await zk.sendMessage(chatId, {
                        text: t.invalidChoice
                    }, { quoted: ms });
                    return;
            }
        } catch (err) {
            console.error('[REPLY HANDLER ERROR]', err);
        }
    };

    zk.ev.on('messages.upsert', zk._replyListener);

    // Timeout after 60 seconds
    setTimeout(async () => {
        const senderJid = ms.key.remoteJid;
        if (activeRequests[senderJid]) {
            delete activeRequests[senderJid];
        }
        if (zk._replyListener) {
            zk.ev.off('messages.upsert', zk._replyListener);
            zk._replyListener = null;
        }
    }, 60000);
});
