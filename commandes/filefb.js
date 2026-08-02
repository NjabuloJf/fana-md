const { fana } = require('../njabulo/fana');
const fs = require('fs');
const getFBInfo = require("@xaviabot/fb-downloader");
const { default: axios } = require('axios');
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
        downloadComplete: await translateTextWithCache("✅ *Download complete!*", lang),
        errorDownloading: await translateTextWithCache("❌ *Error downloading video*", lang),
        checkLink: await translateTextWithCache("Please check the link and try again.", lang),
        pleaseInsert: await translateTextWithCache("⚠️ *Please insert a public Facebook video link!*", lang),
        example: await translateTextWithCache("📌 Example:", lang),
        videoReady: await translateTextWithCache("🎬 *Your video is ready!*", lang),
        facebookVideo: await translateTextWithCache("📥 *FACEBOOK VIDEO*", lang),
        title: await translateTextWithCache("📹 *Title:*", lang),
        quality: await translateTextWithCache("📎 *Quality:*", lang),
        unknown: await translateTextWithCache("Unknown", lang),
        hdQuality: await translateTextWithCache("HD", lang),
        sdQuality: await translateTextWithCache("SD", lang),
        selectFormat: await translateTextWithCache("📌 *Select format:*", lang),
        audioOption: await translateTextWithCache("1️⃣ Audio (MP3)", lang),
        videoOption: await translateTextWithCache("2️⃣ Video (MP4)", lang),
        videoDocOption: await translateTextWithCache("3️⃣ Video Document", lang),
        hdVideoOption: await translateTextWithCache("4️⃣ HD Video", lang),
        sdVideoOption: await translateTextWithCache("5️⃣ SD Video", lang),
        chooseOption: await translateTextWithCache("Reply with number 1, 2, 3, 4, or 5 to choose:", lang),
        invalidChoice: await translateTextWithCache("❌ Invalid choice! Please reply with 1, 2, 3, 4, or 5.", lang),
        timeoutMsg: await translateTextWithCache("⏰ Timeout! Please try again.", lang),
        processingVideo: await translateTextWithCache("⏳ Processing video...", lang),
        downloadingAudio: await translateTextWithCache("⏳ Downloading audio...", lang),
        audioTitle: await translateTextWithCache("🎵 *Audio extracted from Facebook video*", lang),
        errorAudio: await translateTextWithCache("❌ Failed to extract audio. Please try again.", lang),
        hdAvailable: await translateTextWithCache("✅ HD video available", lang),
        sdAvailable: await translateTextWithCache("✅ SD video available", lang),
        hdNotAvailable: await translateTextWithCache("⚠️ HD video not available, sending SD", lang),
        sendingHd: await translateTextWithCache("📤 Sending HD video...", lang),
        sendingSd: await translateTextWithCache("📤 Sending SD video...", lang),
    };
}

// ========== STORE FOR ACTIVE DOWNLOADS ==========
const activeDownloads = {};

// ========== RANDOM IMAGE ==========
const njabulox = [
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png"
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ========== IS NUMBER SELECTION ==========
const isNumberSelection = (text) => {
    const num = parseInt(text);
    return num >= 1 && num <= 5 && !isNaN(num);
};

// ========== CREATE CARDS WITH BUTTONS ==========
async function createVideoCards(videoInfo, zk, ms, lang) {
    const t = await getTranslatedTexts();
    const buttons = [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: t.waChannel,
                url: config.GURL || "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u"
            }),
        },
    ];

    // Card 1: Video Info
    const card1 = {
        header: {
            title: `📥 ${t.facebookVideo}`,
            hasMediaAttachment: true,
            imageMessage: videoInfo.thumbnail ? 
                (await generateWAMessageContent({ image: { url: videoInfo.thumbnail } }, { upload: zk.waUploadToServer })).imageMessage :
                (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
            text: `${t.title} ${videoInfo.title || t.unknown}\n` +
                  `${t.quality} ${t.hdQuality}\n\n` +
                  `${t.selectFormat}\n\n` +
                  `${t.audioOption}\n` +
                  `${t.videoOption}\n` +
                  `${t.videoDocOption}\n` +
                  `${t.hdVideoOption}\n` +
                  `${t.sdVideoOption}\n\n` +
                  `${t.chooseOption}`,
        },
        footer: {
            text: `🔹 Facebook Downloader`,
        },
        nativeFlowMessage: {
            buttons: buttons,
        },
    };

    // Card 2: Download Options
    const card2 = {
        header: {
            title: `📥 ${t.facebookVideo}`,
            hasMediaAttachment: true,
            imageMessage: videoInfo.thumbnail ? 
                (await generateWAMessageContent({ image: { url: videoInfo.thumbnail } }, { upload: zk.waUploadToServer })).imageMessage :
                (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
            text: `📌 *Quick Download*\n\n` +
                  `🔹 ${t.audioOption} - MP3 Audio\n` +
                  `🔹 ${t.videoOption} - MP4 Video\n` +
                  `🔹 ${t.videoDocOption} - Video Document\n` +
                  `🔹 ${t.hdVideoOption} - Best Quality\n` +
                  `🔹 ${t.sdVideoOption} - Standard Quality\n\n` +
                  `${t.chooseOption}`,
        },
        footer: {
            text: `🔹 Reply with 1, 2, 3, 4, or 5`,
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 Copy Link",
                        copy_code: videoInfo.url || "Link not available",
                    }),
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: t.waChannel,
                        url: config.GURL || "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u"
                    }),
                },
            ],
        },
    };

    return { cards: [card1, card2] };
}

// ========== SEND CAROUSEL MESSAGE ==========
async function sendCarouselMessage(zk, dest, cards, ms) {
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
                        body: { text: `📥 *Facebook Video Downloader*` },
                        footer: { text: `🔹 Choose your format` },
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

// ========== FACEBOOK VIDEO DOWNLOADER ==========
fana({
    nomCom: "facebook",
    alias: ["fbdown", "fbvideo", "fb"],
    categorie: "Download",
    reaction: "🖥️"
}, async (dest, zk, commandeOptions) => {
    const { repondre, ms, arg } = commandeOptions;
    const lang = config.LANGUAGE || "en";
    const t = await getTranslatedTexts();

    // Check if this is a reply with format selection
    const replyText = arg ? arg.join(' ') : '';
    if (replyText && isNumberSelection(replyText)) {
        const selectedNumber = parseInt(replyText);
        const senderJid = ms.key.remoteJid;
        
        if (!activeDownloads[senderJid]) {
            await repondre(t.invalidChoice);
            return;
        }

        const data = activeDownloads[senderJid];
        delete activeDownloads[senderJid];

        // Remove listener
        if (zk._replyListener) {
            zk.ev.off('messages.upsert', zk._replyListener);
            zk._replyListener = null;
        }

        switch(selectedNumber) {
            case 1:
                await downloadFacebookAudio(zk, dest, ms, data, lang);
                break;
            case 2:
                await downloadFacebookVideo(zk, dest, ms, data, lang, false, 'mp4');
                break;
            case 3:
                await downloadFacebookVideo(zk, dest, ms, data, lang, true, 'mp4');
                break;
            case 4:
                await downloadFacebookVideo(zk, dest, ms, data, lang, false, 'hd');
                break;
            case 5:
                await downloadFacebookVideo(zk, dest, ms, data, lang, false, 'sd');
                break;
            default:
                await repondre(t.invalidChoice);
                return;
        }
        return;
    }

    // ========== Normal URL processing ==========
    if (!arg[0]) {
        return await repondre(`${t.pleaseInsert}\n\n${t.example} .facebook https://www.facebook.com/.../video`);
    }

    const queryURL = arg.join(" ");
    await zk.sendPresenceUpdate('composing', dest);

    try {
        const result = await getFBInfo(queryURL);

        if (!result || !result.hd) {
            throw new Error("No video found");
        }

        const t = await getTranslatedTexts();

        // Store video info for later
        const senderJid = ms.key.remoteJid;
        activeDownloads[senderJid] = {
            videoInfo: result,
            title: result.title || "Facebook Video",
            url: queryURL,
            thumbnail: result.thumbnail,
            hd: result.hd,
            sd: result.sd || result.hd,
            timestamp: Date.now()
        };

        // Create cards with video info and download options
        const { cards } = await createVideoCards(result, zk, ms, lang);

        // Send carousel message
        await sendCarouselMessage(zk, dest, cards, ms);

        // ========== SETUP REPLY COLLECTOR ==========
        if (zk._replyListener) {
            zk.ev.off('messages.upsert', zk._replyListener);
        }

        zk._replyListener = async (update) => {
            try {
                const msg = update.messages[0];
                if (!msg || !msg.message) return;
                
                const sender = msg.key.remoteJid;
                const content = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                
                if (!activeDownloads[sender]) return;
                if (!isNumberSelection(content)) return;
                
                const selectedNumber = parseInt(content);
                const data = activeDownloads[sender];
                
                delete activeDownloads[sender];
                zk.ev.off('messages.upsert', zk._replyListener);
                zk._replyListener = null;

                try {
                    await zk.sendMessage(dest, {
                        react: { text: "📥", key: msg.key }
                    });
                } catch (e) {}

                switch(selectedNumber) {
                    case 1:
                        await downloadFacebookAudio(zk, dest, ms, data, lang);
                        break;
                    case 2:
                        await downloadFacebookVideo(zk, dest, ms, data, lang, false, 'mp4');
                        break;
                    case 3:
                        await downloadFacebookVideo(zk, dest, ms, data, lang, true, 'mp4');
                        break;
                    case 4:
                        await downloadFacebookVideo(zk, dest, ms, data, lang, false, 'hd');
                        break;
                    case 5:
                        await downloadFacebookVideo(zk, dest, ms, data, lang, false, 'sd');
                        break;
                    default:
                        await repondre(t.invalidChoice);
                        return;
                }
                
            } catch (err) {
                console.error('[REPLY HANDLER ERROR]', err);
            }
        };

        zk.ev.on('messages.upsert', zk._replyListener);

        // ========== TIMEOUT ==========
        setTimeout(async () => {
            const senderJid = ms.key.remoteJid;
            if (activeDownloads[senderJid]) {
                delete activeDownloads[senderJid];
                try {
                    await zk.sendMessage(dest, { 
                        text: t.timeoutMsg 
                    }, { quoted: ms });
                } catch (e) {}
            }
            if (zk._replyListener) {
                zk.ev.off('messages.upsert', zk._replyListener);
                zk._replyListener = null;
            }
        }, 60000);

    } catch (error) {
        console.error("Error:", error);
        await repondre(`${t.errorDownloading}\n\n${t.checkLink}`);
    }
});

// ========== DOWNLOAD FACEBOOK VIDEO ==========
async function downloadFacebookVideo(zk, dest, ms, data, lang, isDocument, quality) {
    try {
        const t = await getTranslatedTexts();
        let videoUrl;
        let qualityText = '';

        if (quality === 'hd') {
            videoUrl = data.hd;
            qualityText = t.hdQuality;
            await zk.sendMessage(dest, { text: t.sendingHd }, { quoted: ms });
        } else if (quality === 'sd') {
            videoUrl = data.sd || data.hd;
            qualityText = t.sdQuality;
            await zk.sendMessage(dest, { text: t.sendingSd }, { quoted: ms });
        } else {
            videoUrl = data.hd || data.sd;
            qualityText = t.hdQuality;
        }
        
        if (!videoUrl) {
            if (quality === 'hd' && data.sd) {
                // Fallback to SD if HD not available
                videoUrl = data.sd;
                qualityText = t.sdQuality;
                await zk.sendMessage(dest, { text: t.hdNotAvailable }, { quoted: ms });
            } else {
                await repondre(t.errorDownloading);
                return;
            }
        }

        await zk.sendPresenceUpdate('recording', dest);

        const fileName = `${data.title || 'facebook_video'}_${qualityText}.mp4`;

        if (isDocument) {
            await zk.sendMessage(dest, {
                document: { url: videoUrl },
                mimetype: 'video/mp4',
                fileName: fileName,
                caption: `${t.facebookVideo}\n\n${t.title} ${data.title || t.unknown}\n${t.quality} ${qualityText}\n\n${t.downloadComplete}`,
                contextInfo: {
                    externalAdReply: {
                        title: `📹 ${data.title || 'Facebook Video'}`,
                        mediaType: 1,
                        previewType: 0,
                        thumbnailUrl: data.thumbnail || randomNjabulourl,
                        renderLargerThumbnail: true,
                    },
                },
            }, { quoted: ms });
        } else {
            await zk.sendMessage(dest, {
                video: { url: videoUrl },
                caption: `${t.videoReady}\n\n${t.title} ${data.title || t.unknown}\n${t.quality} ${qualityText}\n\n${t.downloadComplete}`,
                contextInfo: {
                    externalAdReply: {
                        title: `📹 ${data.title || 'Facebook Video'}`,
                        mediaType: 1,
                        previewType: 0,
                        thumbnailUrl: data.thumbnail || randomNjabulourl,
                        renderLargerThumbnail: true,
                    },
                },
            }, { quoted: ms });
        }

        await zk.sendMessage(dest, { text: t.downloadComplete }, { quoted: ms });

    } catch (error) {
        console.error("Video download error:", error);
        await zk.sendMessage(dest, { 
            text: t.errorDownloading 
        }, { quoted: ms });
    }
}

// ========== DOWNLOAD FACEBOOK AUDIO ==========
async function downloadFacebookAudio(zk, dest, ms, data, lang) {
    try {
        const t = await getTranslatedTexts();
        const videoUrl = data.hd || data.sd;
        
        if (!videoUrl) {
            await repondre(t.errorDownloading);
            return;
        }

        await zk.sendPresenceUpdate('recording', dest);
        await zk.sendMessage(dest, { text: t.downloadingAudio }, { quoted: ms });

        const response = await axios.get(videoUrl, { 
            responseType: 'arraybuffer',
            timeout: 60000
        });

        if (!response.data) {
            throw new Error('Failed to download video');
        }

        const tempFile = `./temp_${Date.now()}.mp4`;
        const audioFile = `./audio_${Date.now()}.mp3`;
        
        fs.writeFileSync(tempFile, response.data);

        const ffmpeg = require('fluent-ffmpeg');
        await new Promise((resolve, reject) => {
            ffmpeg(tempFile)
                .toFormat('mp3')
                .on('end', resolve)
                .on('error', reject)
                .save(audioFile);
        });

        const fileName = `${data.title || 'facebook_audio'}.mp3`;

        await zk.sendMessage(dest, {
            audio: { url: audioFile },
            mimetype: 'audio/mpeg',
            fileName: fileName,
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: `🎵 ${data.title || 'Facebook Audio'}`,
                    mediaType: 1,
                    previewType: 0,
                    thumbnailUrl: data.thumbnail || randomNjabulourl,
                    renderLargerThumbnail: true,
                },
            },
        }, { quoted: ms });

        try {
            fs.unlinkSync(tempFile);
            fs.unlinkSync(audioFile);
        } catch (e) {}

        await zk.sendMessage(dest, { text: t.downloadComplete }, { quoted: ms });

    } catch (error) {
        console.error("Audio download error:", error);
        await zk.sendMessage(dest, { 
            text: t.errorAudio 
        }, { quoted: ms });
    }
                    }
