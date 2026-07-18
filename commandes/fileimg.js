const { fana } = require("../njabulo/fana");
const gis = require("g-i-s");
const axios = require("axios");
const conf = require(__dirname + "/../set");
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
async function getTranslatedButton() {
    const lang = conf.LANGUAGE || "en";
    return await translateText("🌐 View Original", lang);
}

// Google Custom Search API credentials
const GCSE_KEY = 'AIzaSyDMbI3nvmQUrfjoCJYLS69Lej1hSXQjnWI';
const GCSE_CX = 'baf9bdb0c631236e5';

// ── Random image list ─────────────────────────────────────────────
const njabulox = [
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ── Base button definition ────────────────────────────────────────
async function getBaseButtons() {
    const viewOriginal = await getTranslatedButton();
    return [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: viewOriginal,
                id: "backup channel",
                url: "",
            }),
        },
    ];
}

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms, isLoading = false) {
    const baseButtons = await getBaseButtons();
    const buttons = JSON.parse(JSON.stringify(baseButtons));

    let messageContent;

    if (isLoading) {
        messageContent = {
            text: text,
        };
    } else {
        messageContent = {
            interactiveMessage: {
                image: { url: randomNjabulourl },
                header: text,
                buttons,
                headerType: 1,
            },
        };
    }

    await zk.sendMessage(chatId, messageContent, { quoted: ms });
}

// ── Image search using Google Custom Search API ────────────────────
async function searchImages(query) {
    try {
        const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                q: query,
                key: GCSE_KEY,
                cx: GCSE_CX,
                searchType: 'image',
                num: 8,
                safe: 'off'
            },
            timeout: 15000
        });

        if (!data.items || data.items.length === 0) {
            return [];
        }

        return data.items.map(item => ({
            url: item.link,
            title: item.title,
            snippet: item.snippet
        }));
    } catch (error) {
        console.error("Google Images API error:", error.response?.data || error.message);
        return [];
    }
}

// ── Image search command (.img) ─────────────────────────────────────────────
fana({
    nomCom: "img",
    aliases: ["image", "images"],
    categorie: "Images",
    reaction: "☘️",
}, async (dest, zk, commandeOptions) => {
    const { ms, arg } = commandeOptions;
    const lang = conf.LANGUAGE || "en";

    const whichImage = await translateText("Which image?", lang);
    const searching = await translateText("⏳ Searching for", lang);
    const imagesText = await translateText("images...", lang);
    const noImages = await translateText("No images found.", lang);
    const searchResults = await translateText("🔍 Search Results for:", lang);
    const foundImages = await translateText("📂 Found", lang);
    const imagesFound = await translateText("images", lang);
    const errorMsg = await translateText("❌ Error:", lang);
    const viewOriginal = await translateText("🌐 View Original", lang);

    if (!arg[0]) {
        return sendFormattedMessage(zk, dest, whichImage, ms);
    }

    const q = arg.join(" ");

    // Send loading message
    const loadingMsg = await sendFormattedMessage(zk, dest, `${searching} ${q} ${imagesText}*`, ms, true);

    try {
        const images = await searchImages(q);

        if (!images || images.length === 0) {
            await sendFormattedMessage(zk, dest, noImages, ms);
            if (loadingMsg) await zk.sendMessage(dest, { delete: loadingMsg.key }).catch(() => {});
            return;
        }

        const results = images.slice(0, 8);
        const picked = await Promise.all(
            results.map(async (img) => {
                try {
                    const bufferRes = await axios.get(img.url, { responseType: "arraybuffer", timeout: 10000 });
                    return { buffer: bufferRes.data, directLink: img.url };
                } catch {
                    console.error("Image download failed:", img.url);
                    return null;
                }
            })
        );

        const validImages = picked.filter(Boolean);
        if (validImages.length === 0) {
            await sendFormattedMessage(zk, dest, noImages, ms);
            if (loadingMsg) await zk.sendMessage(dest, { delete: loadingMsg.key }).catch(() => {});
            return;
        }

        const buttons = await getBaseButtons();

        const cards = await Promise.all(
            validImages.map(async (item, i) => ({
                header: {
                    title: `📸 Image ${i + 1}`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: item.buffer }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: { text: `*🔍 Search: ${q}*` },
                footer: { text: "" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({ display_text: viewOriginal, url: item.directLink }),
                        },
                    ],
                },
            }))
        );

        const message = generateWAMessageFromContent(
            dest,
            {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            body: { text: `${searchResults} ${q}` },
                            footer: { text: `${foundImages} ${validImages.length} ${imagesFound}` },
                            carouselMessage: { cards },
                        },
                    },
                },
            },
            { quoted: ms }
        );

        await zk.relayMessage(dest, message.message, { messageId: message.key.id });
        if (loadingMsg) await zk.sendMessage(dest, { delete: loadingMsg.key }).catch(() => {});

    } catch (error) {
        console.error("Error searching images:", error.response ? error.response.data : error.message);
        await sendFormattedMessage(zk, dest, `${errorMsg} ${error.message}`, ms);
        if (loadingMsg) await zk.sendMessage(dest, { delete: loadingMsg.key }).catch(() => {});
    }
});

// ── Image search command 2 (.image) ─────────────────────────────────────────────
fana({
    nomCom: "image",
    aliases: ["img", "images"],
    categorie: "Images",
    reaction: "☘️",
}, async (dest, zk, commandeOptions) => {
    const { ms, arg } = commandeOptions;
    const lang = conf.LANGUAGE || "en";

    const whichImage = await translateText("Which image?", lang);
    const searching = await translateText("⏳ Searching for", lang);
    const imagesText = await translateText("images...", lang);
    const noImages = await translateText("No images found.", lang);
    const searchResults = await translateText("🔍 Search Results for:", lang);
    const foundImages = await translateText("📂 Found", lang);
    const imagesFound = await translateText("images", lang);
    const errorMsg = await translateText("❌ Error:", lang);
    const viewOriginal = await translateText("🌐 View Original", lang);

    if (!arg[0]) {
        return sendFormattedMessage(zk, dest, whichImage, ms);
    }

    const q = arg.join(" ");

    // Send loading message
    const loadingMsg = await sendFormattedMessage(zk, dest, `${searching} ${q} ${imagesText}*`, ms, true);

    try {
        const images = await searchImages(q);

        if (!images || images.length === 0) {
            await sendFormattedMessage(zk, dest, noImages, ms);
            if (loadingMsg) await zk.sendMessage(dest, { delete: loadingMsg.key }).catch(() => {});
            return;
        }

        const results = images.slice(0, 8);
        const picked = await Promise.all(
            results.map(async (img) => {
                try {
                    const bufferRes = await axios.get(img.url, { responseType: "arraybuffer", timeout: 10000 });
                    return { buffer: bufferRes.data, directLink: img.url };
                } catch {
                    console.error("Image download failed:", img.url);
                    return null;
                }
            })
        );

        const validImages = picked.filter(Boolean);
        if (validImages.length === 0) {
            await sendFormattedMessage(zk, dest, noImages, ms);
            if (loadingMsg) await zk.sendMessage(dest, { delete: loadingMsg.key }).catch(() => {});
            return;
        }

        const buttons = await getBaseButtons();

        const cards = await Promise.all(
            validImages.map(async (item, i) => ({
                header: {
                    title: `📸 Image ${i + 1}`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: item.buffer }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: { text: `🔍 Search: ${q}` },
                footer: { text: "Nᴊᴀʙᴜʟᴏ Jʙ ᴘʜᴏᴛᴏ ɢʀᴀᴍ 🙄" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({ display_text: viewOriginal, url: item.directLink }),
                        },
                    ],
                },
            }))
        );

        const message = generateWAMessageFromContent(
            dest,
            {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            body: { text: `${searchResults} ${q}` },
                            footer: { text: `${foundImages} ${validImages.length} ${imagesFound}` },
                            carouselMessage: { cards },
                        },
                    },
                },
            },
            { quoted: ms }
        );

        await zk.relayMessage(dest, message.message, { messageId: message.key.id });
        if (loadingMsg) await zk.sendMessage(dest, { delete: loadingMsg.key }).catch(() => {});

    } catch (error) {
        console.error("Error searching images:", error.response ? error.response.data : error.message);
        await sendFormattedMessage(zk, dest, `${errorMsg} ${error.message}`, ms);
        if (loadingMsg) await zk.sendMessage(dest, { delete: loadingMsg.key }).catch(() => {});
    }
}); 
