const { Sticker, createSticker, StickerTypes } = require("wa-sticker-formatter");
const { fana } = require("../njabulo/fana");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs-extra");
const config = require("../set");
const ffmpeg = require("fluent-ffmpeg");
const { Catbox } = require("node-catbox");
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
async function getTranslatedButtons() {
    const lang = config.LANGUAGE || "en";
    const waChannel = await translateText("𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹", lang);
    const copy = await translateText("Copy", lang);
    return { waChannel, copy };
}

const catbox = new Catbox();

// ── Button definition ─────────────────────────────────────
async function getButtons() {
    const btn = await getTranslatedButtons();
    return [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: btn.waChannel,
                id: "backup channel",
                url: config.GURL
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
    const btn = await getTranslatedButtons();
    const baseButtons = await getButtons();
    const copyButtons = JSON.parse(JSON.stringify(baseButtons));
    copyButtons[1].buttonParamsJson = JSON.stringify({
        display_text: btn.copy,
        id: "copy",
        copy_code: copyCode,
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
}

// ── Catbox upload helper ─────────────────────────────────────────────
async function uploadToCatbox(Path) {
    if (!fs.existsSync(Path)) {
        throw new Error("File does not exist");
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
    const replyToMedia = await translateText("Please reply to an image, video, or audio file.", lang);
    const videoTooLong = await translateText("The video is too long. Please send a smaller video.", lang);
    const unsupportedMedia = await translateText("Unsupported media type. Reply with an image, video, or audio file.", lang);
    const failedToProcess = await translateText("Failed to process the audio file.", lang);
    const mediaUploaded = await translateText("Media Uploaded Successfully ✅", lang);
    const mediaLink = await translateText("Media Link:", lang);
    const size = await translateText("Size:", lang);
    const poweredBy = await translateText("Pσɯҽɾԃ Ⴆყ ɳʝαႦυʅσ ʝႦ", lang);
    const errorOccurred = await translateText("Oops, an error occurred.", lang);
    const mb = await translateText("MB", lang);

    if (!msgRepondu) {
        sendFormattedMessage(zk, chatId, replyToMedia, ms);
        return;
    }

    let mediaPath, mediaType;

    if (msgRepondu.videoMessage) {
        const videoSize = msgRepondu.videoMessage.fileLength;
        if (videoSize > 50 * 1024 * 1024) {
            sendFormattedMessage(zk, chatId, videoTooLong, ms);
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
            sendFormattedMessage(zk, chatId, failedToProcess, ms);
            return;
        }
    } else {
        sendFormattedMessage(zk, chatId, unsupportedMedia, ms);
        return;
    }

    try {
        const catboxUrl = await uploadToCatbox(mediaPath);
        fs.unlinkSync(mediaPath);

        const fileSize = (fs.statSync(mediaPath).size / (1024 * 1024)).toFixed(2);
        const replyText = `${mediaUploaded}\n${mediaLink}\n\n${catboxUrl}\n\n${size} ${fileSize} ${mb}\n> ${poweredBy}`;
        sendFormattedMessage(zk, chatId, replyText, ms, catboxUrl);
    } catch (error) {
        console.error("Error while creating your URL:", error);
        sendFormattedMessage(zk, chatId, errorOccurred, ms);
    }
});
