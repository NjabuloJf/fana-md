const { fana } = require("../njabulo/fana");
const gis = require("g-i-s");
const axios = require("axios");
const conf = require(__dirname + "/../set");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

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
const baseButtons = [
    {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
            display_text: "🌐 WA Channel",
            id: "backup channel",
            url: "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u",
        }),
    },
];

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {       
    await zk.sendMessage(
        chatId,
        {
            interactiveMessage: {
                header: text,
                buttons,
                headerType: 1
            }
        },
        { quoted: ms }
    );
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
            snippet: item.snippet,
            width: item.image?.width,
            height: item.image?.height
        }));
    } catch (error) {
        console.error("Google Images API error:", error.response?.data || error.message);
        return [];
    }
}

// ── Image search command ─────────────────────────────────────────────
fana({
    nomCom: "img",
    alias: ["image", "images", "searchimg"],
    categorie: "Images",
    reaction: "☘️",
}, async (dest, zk, commandeOptions) => {
    const { repondre, ms, arg } = commandeOptions;
    
    if (!arg[0]) {
        return sendFormattedMessage(zk, dest, "📌 *Usage:* .img <search term>\n\n📝 *Example:* .img cute cats", ms);
    }

    const query = arg.join(" ");
    await zk.sendPresenceUpdate('composing', dest);
    
    const loadingMsg = await zk.sendMessage(dest, { text: `🔍 *Searching for "${query}" images...*` }, { quoted: ms });

    try {
        const images = await searchImages(query);
        
        if (!images || images.length === 0) {
            await zk.deleteMessage(dest, loadingMsg.key);
            return sendFormattedMessage(zk, dest, `❌ No images found for "*${query}*".\n\nPlease try a different search term.`, ms);
        }

        // Take first 8 images
        const selectedImages = images.slice(0, 8);
        
        const cards = await Promise.all(
            selectedImages.map(async (img, index) => {
                let imageBuffer = null;
                try {
                    const imgRes = await axios.get(img.url, { responseType: 'arraybuffer', timeout: 10000 });
                    imageBuffer = imgRes.data;
                } catch (err) {
                    console.error("Failed to download image:", img.url);
                }
                
                return {
                    header: {
                        title: `📸 Image ${index + 1}`,
                        hasMediaAttachment: true,
                        imageMessage: imageBuffer ? (await generateWAMessageContent({ image: imageBuffer }, { upload: zk.waUploadToServer })).imageMessage : null,
                    },
                    body: {
                        text: `*🔍 Search:* ${query}\n📏 ${img.width || '?'}x${img.height || '?'}`
                    },
                    footer: {
                        text: "NJABULO MD"
                    },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "🌐 View Original",
                                    url: img.url
                                }),
                            }
                        ],
                    },
                };
            })
        );

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
                            header: { text: "🖼️ IMAGE SEARCH" },
                            body: { text: `🔍 *Results for:* ${query}\n📸 *Found:* ${selectedImages.length} images` },
                            footer: { text: "💫 NJABULO MD" },
                            carouselMessage: { cards },
                        },
                    },
                },
            },
            { quoted: ms }
        );

        await zk.deleteMessage(dest, loadingMsg.key);
        await zk.relayMessage(dest, message.message, { messageId: message.key.id });
        
    } catch (error) {
        console.error("Error searching images:", error.message);
        await zk.deleteMessage(dest, loadingMsg.key);
        await sendFormattedMessage(zk, dest, `❌ *Error searching images*\n\n${error.message}\n\nPlease try again later.`, ms);
    }
});

// ── Image search command (alternative) ─────────────────────────────
fana({
    nomCom: "image",
    alias: ["pic", "photo"],
    categorie: "Images",
    reaction: "🖼️",
}, async (dest, zk, commandeOptions) => {
    const { repondre, ms, arg } = commandeOptions;
    
    if (!arg[0]) {
        return sendFormattedMessage(zk, dest, "📌 *Usage:* .image <search term>\n\n📝 *Example:* .image beautiful nature", ms);
    }

    const query = arg.join(" ");
    await zk.sendPresenceUpdate('composing', dest);
    
    const loadingMsg = await zk.sendMessage(dest, { text: `🔍 *Searching for "${query}" images...*` }, { quoted: ms });

    try {
        const images = await searchImages(query);
        
        if (!images || images.length === 0) {
            await zk.deleteMessage(dest, loadingMsg.key);
            return sendFormattedMessage(zk, dest, `❌ No images found for "*${query}*".\n\nPlease try a different search term.`, ms);
        }

        // Take first 5 images
        const selectedImages = images.slice(0, 5);
        
        const cards = await Promise.all(
            selectedImages.map(async (img, index) => {
                let imageBuffer = null;
                try {
                    const imgRes = await axios.get(img.url, { responseType: 'arraybuffer', timeout: 10000 });
                    imageBuffer = imgRes.data;
                } catch (err) {
                    console.error("Failed to download image:", img.url);
                }
                
                return {
                    header: {
                        title: `🖼️ Image ${index + 1}`,
                        hasMediaAttachment: true,
                        imageMessage: imageBuffer ? (await generateWAMessageContent({ image: imageBuffer }, { upload: zk.waUploadToServer })).imageMessage : null,
                    },
                    body: {
                        text: `*🔍 Search:* ${query}\n📏 ${img.width || '?'}x${img.height || '?'}\n📝 ${img.snippet?.substring(0, 50) || ''}`
                    },
                    footer: {
                        text: "NJABULO MD"
                    },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "🌐 View Original",
                                    url: img.url
                                }),                          
                            }
                        ],
                    },
                };
            })
        );

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
                            header: { text: "🖼️ IMAGE SEARCH RESULTS" },
                            body: { text: `🔍 *Query:* ${query}\n📸 *Found:* ${selectedImages.length} images` },
                            footer: { text: "💫 NJABULO MD" },
                            carouselMessage: { cards },
                        },
                    },
                },
            },
            { quoted: ms }
        );

        await zk.deleteMessage(dest, loadingMsg.key);
        await zk.relayMessage(dest, message.message, { messageId: message.key.id });
        
    } catch (error) {
        console.error("Error searching images:", error.message);
        await zk.deleteMessage(dest, loadingMsg.key);
        await sendFormattedMessage(zk, dest, `❌ *Error searching images*\n\n${error.message}\n\nPlease try again later.`, ms);
    }
});
