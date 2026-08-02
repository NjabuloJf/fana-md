const { Sticker, createSticker, StickerTypes } = require("wa-sticker-formatter");
const { fana } = require("../njabulo/fana");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs-extra");
const config = require("../set");
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");

// ========== TRY TO LOAD CATBOX WITH FALLBACK ==========
let Catbox;
let catbox;
try {
    const catboxModule = require("node-catbox");
    Catbox = catboxModule.Catbox || catboxModule;
    catbox = new Catbox();
    console.log("✅ Catbox loaded successfully");
} catch (e) {
    console.log("⚠️ Catbox not installed, using fallback upload method");
    catbox = null;
}

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

// ========== TRANSLATED BUTTON FUNCTION ==========
async function getTranslatedButtons() {
    const lang = config.LANGUAGE || "en";
    const waChannel = await translateTextWithCache("bot channels", lang);
    const copy = await translateTextWithCache("Copy", lang);
    return { waChannel, copy };
}

// ── Button definition ─────────────────────────────────────
async function getButtons() {
    const btn = await getTranslatedButtons();
    return [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: btn.waChannel,
                id: "backup channel",
                url: config.GURL || "https://whatsapp.com/channel/0029VbC9yTmElah0BO3KD509"
            }),
        },
        {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
                display_text: btn.copy,
                id: "copy",
                copy_code: "",
            }),
        },
    ];
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

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms, copyCode = text) {
    try {
        const btn = await getTranslatedButtons();
        const baseButtons = await getButtons();
        const copyButtons = JSON.parse(JSON.stringify(baseButtons));
        copyButtons[1].buttonParamsJson = JSON.stringify({
            display_text: btn.copy,
            id: "copy",
            copy_code: copyCode || text,
        });

        await zk.sendMessage(
            chatId,
            {
                interactiveMessage: {
                    image: { url: randomNjabulourl },
                    header: text,
                    buttons: copyButtons,
                    headerType: 1,
                    contextInfo: {
                        mentionedJid: [ms?.sender?.jid || ""],
                        externalAdReply: {
                            title: "💓ᥕᥱᥣᥴomᥱ fᥲmιᥣყ",
                            mediaType: 1,
                            previewType: 0,
                            thumbnailUrl: randomNjabulourl,
                            renderLargerThumbnail: false,
                        },
                    },
                },
            },
            {
                quoted: {
                    key: {
                        fromMe: false,
                        participant: "0@s.whatsapp.net",
                        remoteJid: "status@broadcast",
                    },
                    message: {
                        contactMessage: {
                            displayName: "njᥲbᥙᥣo",
                            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=26777821911:+26777821911\nitem1.X-ABLabel:Bot\nEND:VCARD`,
                        },
                    },
                },
            }
        );
    } catch (error) {
        console.error("Error in sendFormattedMessage:", error);
        // Fallback: send as text
        try {
            await zk.sendMessage(chatId, { text: text }, { quoted: ms });
        } catch (e) {
            console.error("Fallback message also failed:", e);
        }
    }
}

// ── Catbox upload helper with fallback ─────────────────────────────
async function uploadToCatbox(Path) {
    if (!fs.existsSync(Path)) {
        throw new Error("File does not exist");
    }

    // If catbox is not available, use alternative upload method
    if (!catbox) {
        console.log("⚠️ Catbox not available, using fallback upload");
        // Try to upload using Catbox API directly
        try {
            const FormData = require('form-data');
            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', fs.createReadStream(Path));
            
            const response = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: form.getHeaders(),
                timeout: 30000
            });
            
            if (response.data && response.data.startsWith('http')) {
                return response.data;
            }
            throw new Error('Upload failed');
        } catch (uploadError) {
            console.error("Fallback upload error:", uploadError);
            throw new Error("Failed to upload file. Please try again later.");
        }
    }

    try {
        const response = await catbox.uploadFile({ path: Path });
        if (response) {
            return response;
        } else {
            throw new Error("Error retrieving the file link");
        }
    } catch (err) {
        throw new Error(String(err));
    }
}

// ── Convert audio to MP3 ─────────────────────────────────────────────
async function convertToMp3(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .toFormat("mp3")
            .on("error", (err) => reject(err))
            .on("end", () => resolve(outputPath))
            .save(outputPath);
    });
}

// ── Command: .url ─────────────────────────────────────────────
fana({
    nomCom: "url",
    categorie: "General",
    reaction: "👨🏿‍💻",
}, async (chatId, zk, commandeOptions) => {
    const { msgRepondu, repondre, ms } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    // ========== TRANSLATED TEXTS ==========
    const replyToMedia = await translateTextWithCache("Please reply to an image, video, or audio file.", lang);
    const videoTooLong = await translateTextWithCache("The video is too long. Please send a smaller video.", lang);
    const unsupportedMedia = await translateTextWithCache("Unsupported media type. Reply with an image, video, or audio file.", lang);
    const failedToProcess = await translateTextWithCache("Failed to process the audio file.", lang);
    const mediaUploaded = await translateTextWithCache("Media Uploaded Successfully ✅", lang);
    const mediaLink = await translateTextWithCache("Media Link:", lang);
    const size = await translateTextWithCache("Size:", lang);
    const poweredBy = await translateTextWithCache("Pσɯҽɾԃ Ⴆყ ɳʝαႦυʅσ ʝႦ", lang);
    const errorOccurred = await translateTextWithCache("Oops, an error occurred.", lang);
    const mb = await translateTextWithCache("MB", lang);

    if (!msgRepondu) {
        await sendFormattedMessage(zk, chatId, replyToMedia, ms);
        return;
    }

    let mediaPath, mediaType;

    try {
        if (msgRepondu.videoMessage) {
            const videoSize = msgRepondu.videoMessage.fileLength || 0;
            if (videoSize > 50 * 1024 * 1024) {
                await sendFormattedMessage(zk, chatId, videoTooLong, ms);
                return;
            }
            mediaPath = await zk.downloadAndSaveMediaMessage(msgRepondu.videoMessage);
            mediaType = "video";
        } else if (msgRepondu.imageMessage) {
            mediaPath = await zk.downloadAndSaveMediaMessage(msgRepondu.imageMessage);
            mediaType = "image";
        } else if (msgRepondu.audioMessage) {
            mediaPath = await zk.downloadAndSaveMediaMessage(msgRepondu.audioMessage);
            mediaType = "audio";

            const outputPath = `${mediaPath}.mp3`;
            try {
                await convertToMp3(mediaPath, outputPath);
                fs.unlinkSync(mediaPath);
                mediaPath = outputPath;
            } catch (error) {
                console.error("Error converting audio to MP3:", error);
                await sendFormattedMessage(zk, chatId, failedToProcess, ms);
                return;
            }
        } else {
            await sendFormattedMessage(zk, chatId, unsupportedMedia, ms);
            return;
        }

        if (!mediaPath || !fs.existsSync(mediaPath)) {
            throw new Error("Media file not found after download");
        }

        const catboxUrl = await uploadToCatbox(mediaPath);
        
        // Get file size before deleting
        const stats = fs.statSync(mediaPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        // Clean up the media file
        try {
            fs.unlinkSync(mediaPath);
        } catch (e) {
            console.log("Could not delete media file:", e);
        }

        const replyText = `${mediaUploaded}\n${mediaLink}\n\n${catboxUrl}\n\n${size} ${fileSizeInMB} ${mb}\n> ${poweredBy}`;
        await sendFormattedMessage(zk, chatId, replyText, ms, catboxUrl);
        
    } catch (error) {
        console.error("Error while creating your URL:", error);
        await sendFormattedMessage(zk, chatId, errorOccurred, ms);
        
        // Clean up if mediaPath exists
        if (mediaPath && fs.existsSync(mediaPath)) {
            try {
                fs.unlinkSync(mediaPath);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    }
});
