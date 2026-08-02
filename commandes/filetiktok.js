const { fana } = require('../njabulo/fana');
const fs = require('fs');
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
        pleaseInsert: await translateTextWithCache("⚠️ *Please insert a public TikTok video link!*", lang),
        example: await translateTextWithCache("📌 Example:", lang),
        videoReady: await translateTextWithCache("🎬 *Your video is ready!*", lang),
        tiktokVideo: await translateTextWithCache("📥 *TIKTOK VIDEO*", lang),
        title: await translateTextWithCache("📹 *Title:*", lang),
        author: await translateTextWithCache("👤 *Author:*", lang),
        duration: await translateTextWithCache("⏱️ *Duration:*", lang),
        views: await translateTextWithCache("👁️ *Views:*", lang),
        likes: await translateTextWithCache("❤️ *Likes:*", lang),
        comments: await translateTextWithCache("💬 *Comments:*", lang),
        shares: await translateTextWithCache("📤 *Shares:*", lang),
        unknown: await translateTextWithCache("Unknown", lang),
        selectFormat: await translateTextWithCache("📌 *Select format:*", lang),
        audioOption: await translateTextWithCache("-᳆ *1* Audio (MP3)", lang),
        videoOption: await translateTextWithCache("-᳆ *2* Video (MP4)", lang),
        videoDocOption: await translateTextWithCache("-᳆ *3* Video Document", lang),
        hdVideoOption: await translateTextWithCache("-᳆ *4* HD Video", lang),
        sdVideoOption: await translateTextWithCache("-᳆ *5* SD Video", lang),
        chooseOption: await translateTextWithCache("Reply with number 1, 2, 3, 4, or 5 to choose:", lang),
        invalidChoice: await translateTextWithCache("❌ Invalid choice! Please reply with 1, 2, 3, 4, or 5.", lang),
        timeoutMsg: await translateTextWithCache("⏰ Timeout! Please try again.", lang),
        processingVideo: await translateTextWithCache("⏳ Processing video...", lang),
        downloadingAudio: await translateTextWithCache("⏳ Downloading audio...", lang),
        audioTitle: await translateTextWithCache("🎵 *Audio from TikTok video*", lang),
        errorAudio: await translateTextWithCache("❌ Failed to extract audio. Please try again.", lang),
        noVideoFound: await translateTextWithCache("❌ No video found for this link.", lang),
        fetchingInfo: await translateTextWithCache("📡 Fetching video info...", lang),
        apiFailed: await translateTextWithCache("⚠️ API is currently unavailable. Please try again later.", lang),
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

// ========== FETCH TIKTOK INFO WITH MULTIPLE APIS ==========
async function fetchTikTokInfo(url) {
    // Try multiple APIs
    const apis = [
        {
            name: 'Nexray',
            url: `https://api.nexray.web.id/downloader/tiktok?url=${encodeURIComponent(url)}`,
            parse: (data) => {
                if (!data || !data.result) return null;
                const r = data.result;
                return {
                    title: r.title || r.desc || "TikTok Video",
                    author: r.author?.unique_id || r.author?.username || "Unknown",
                    duration: r.duration || "0:00",
                    views: r.views || r.play_count || 0,
                    likes: r.likes || r.digg_count || 0,
                    comments: r.comments || r.comment_count || 0,
                    shares: r.shares || r.share_count || 0,
                    thumbnail: r.cover || r.thumbnail || randomNjabulourl,
                    videoUrl: r.video_url || r.video,
                    videoUrlHd: r.video_url_hd || r.video_hd || r.video_url,
                    videoUrlSd: r.video_url_sd || r.video_sd || r.video_url,
                    audioUrl: r.audio_url || r.music_url || r.audio,
                };
            }
        },
        {
            name: 'TikTok API',
            url: `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`,
            parse: (data) => {
                if (!data || !data.data) return null;
                const r = data.data;
                return {
                    title: r.title || "TikTok Video",
                    author: r.author?.unique_id || r.author?.username || "Unknown",
                    duration: r.duration || "0:00",
                    views: r.play_count || 0,
                    likes: r.digg_count || 0,
                    comments: r.comment_count || 0,
                    shares: r.share_count || 0,
                    thumbnail: r.cover || r.thumbnail || randomNjabulourl,
                    videoUrl: r.play || r.video,
                    videoUrlHd: r.hd_play || r.video_hd || r.play,
                    videoUrlSd: r.play || r.video,
                    audioUrl: r.music || r.audio,
                };
            }
        },
        {
            name: 'SSSTikTok',
            url: `https://ssstik.io/api/convert?url=${encodeURIComponent(url)}`,
            parse: (data) => {
                if (!data || !data.result) return null;
                const r = data.result;
                return {
                    title: r.title || "TikTok Video",
                    author: r.author || "Unknown",
                    duration: r.duration || "0:00",
                    views: r.views || 0,
                    likes: r.likes || 0,
                    comments: 0,
                    shares: 0,
                    thumbnail: r.thumbnail || randomNjabulourl,
                    videoUrl: r.video || r.url,
                    videoUrlHd: r.video_hd || r.video,
                    videoUrlSd: r.video || r.video_sd,
                    audioUrl: r.music || r.audio,
                };
            }
        }
    ];

    let lastError = null;

    for (const api of apis) {
        try {
            console.log(`🔄 Trying TikTok API: ${api.name}`);
            const response = await axios.get(api.url, { 
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            console.log(`📡 ${api.name} response status:`, response.status);
            
            if (response.status === 200) {
                const parsed = api.parse(response.data);
                if (parsed && parsed.videoUrl) {
                    console.log(`✅ ${api.name} API successful!`);
                    return parsed;
                }
            }
        } catch (error) {
            console.log(`❌ ${api.name} API failed:`, error.message);
            lastError = error;
            continue;
        }
    }

    console.error('❌ All TikTok APIs failed');
    throw new Error(lastError?.message || 'All APIs failed');
}

// ========== CREATE CARDS WITH BUTTONS ==========
async function createTikTokCards(videoInfo, zk, ms, lang) {
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

    const title = videoInfo.title || "TikTok Video";
    const author = videoInfo.author || "Unknown";
    const duration = videoInfo.duration || "0:00";
    const views = videoInfo.views || 0;
    const likes = videoInfo.likes || 0;
    const comments = videoInfo.comments || 0;
    const shares = videoInfo.shares || 0;
    const thumbnail = videoInfo.thumbnail || randomNjabulourl;

    // Card 1: Video Info
    let imageMessage = null;
    try {
        if (thumbnail) {
            imageMessage = (await generateWAMessageContent({ image: { url: thumbnail } }, { upload: zk.waUploadToServer })).imageMessage;
        }
    } catch (e) {
        console.log('⚠️ Could not load thumbnail');
        imageMessage = (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage;
    }

    const card1 = {
        header: {
            title: `📥 ${t.tiktokVideo}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `${t.title} ${title}\n` +
                  `${t.author} ${author}\n` +
                  `${t.duration} ${duration}\n` +
                  `${t.views} ${views.toLocaleString()}\n` +
                  `${t.likes} ${likes.toLocaleString()}\n` +
                  `${t.comments} ${comments.toLocaleString()}\n` +
                  `${t.shares} ${shares.toLocaleString()}\n\n` +
                  `${t.selectFormat}\n\n` +
                  `${t.audioOption}\n` +
                  `${t.videoOption}\n` +
                  `${t.videoDocOption}\n` +
                  `${t.hdVideoOption}\n` +
                  `${t.sdVideoOption}\n\n` +
                  `${t.chooseOption}`,
        },
        footer: {
            text: `🔹 TikTok Downloader`,
        },
        nativeFlowMessage: {
            buttons: buttons,
        },
    };

    // Card 2: Download Options
    const card2 = {
        header: {
            title: `📥 ${t.tiktokVideo}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
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
                        copy_code: videoInfo.videoUrl || "Link not available",
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
                        body: { text: `📥 *TikTok Video Downloader*` },
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

// ========== TIKTOK DOWNLOADER ==========
fana({
    nomCom: "tiktok",
    alias: ["tt", "ttdl", "tiktokdl"],
    categorie: "Download",
    reaction: "🎵"
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

        if (zk._replyListener) {
            zk.ev.off('messages.upsert', zk._replyListener);
            zk._replyListener = null;
        }

        switch(selectedNumber) {
            case 1:
                await downloadTikTokAudio(zk, dest, ms, data, lang);
                break;
            case 2:
                await downloadTikTokVideo(zk, dest, ms, data, lang, false, 'mp4');
                break;
            case 3:
                await downloadTikTokVideo(zk, dest, ms, data, lang, true, 'mp4');
                break;
            case 4:
                await downloadTikTokVideo(zk, dest, ms, data, lang, false, 'hd');
                break;
            case 5:
                await downloadTikTokVideo(zk, dest, ms, data, lang, false, 'sd');
                break;
            default:
                await repondre(t.invalidChoice);
                return;
        }
        return;
    }

    // ========== Normal URL processing ==========
    if (!arg[0]) {
        return await repondre(`${t.pleaseInsert}\n\n${t.example} .tiktok https://www.tiktok.com/@user/video/xxxxx`);
    }

    const queryURL = arg.join(" ");
    await zk.sendPresenceUpdate('composing', dest);
    await zk.sendMessage(dest, { text: t.fetchingInfo }, { quoted: ms });

    try {
        const result = await fetchTikTokInfo(queryURL);

        if (!result || !result.videoUrl) {
            throw new Error(t.noVideoFound);
        }

        // Store video info for later
        const senderJid = ms.key.remoteJid;
        activeDownloads[senderJid] = {
            videoInfo: result,
            title: result.title || "TikTok Video",
            url: queryURL,
            thumbnail: result.thumbnail || randomNjabulourl,
            videoUrl: result.videoUrl,
            videoUrlHd: result.videoUrlHd || result.videoUrl,
            videoUrlSd: result.videoUrlSd || result.videoUrl,
            audioUrl: result.audioUrl,
            author: result.author,
            duration: result.duration,
            views: result.views,
            likes: result.likes,
            comments: result.comments,
            shares: result.shares,
            timestamp: Date.now()
        };

        // Create cards with video info and download options
        const { cards } = await createTikTokCards(result, zk, ms, lang);

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
                        await downloadTikTokAudio(zk, dest, ms, data, lang);
                        break;
                    case 2:
                        await downloadTikTokVideo(zk, dest, ms, data, lang, false, 'mp4');
                        break;
                    case 3:
                        await downloadTikTokVideo(zk, dest, ms, data, lang, true, 'mp4');
                        break;
                    case 4:
                        await downloadTikTokVideo(zk, dest, ms, data, lang, false, 'hd');
                        break;
                    case 5:
                        await downloadTikTokVideo(zk, dest, ms, data, lang, false, 'sd');
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
        await repondre(`${t.apiFailed}\n\n${t.errorDownloading}\n\n${t.checkLink}`);
    }
});

// ========== DOWNLOAD TIKTOK VIDEO ==========
async function downloadTikTokVideo(zk, dest, ms, data, lang, isDocument, quality) {
    try {
        const t = await getTranslatedTexts();
        let videoUrl;
        let qualityText = '';

        if (quality === 'hd') {
            videoUrl = data.videoUrlHd || data.videoUrl;
            qualityText = 'HD';
            await zk.sendMessage(dest, { text: await translateTextWithCache("📤 Sending HD video...", lang) }, { quoted: ms });
        } else if (quality === 'sd') {
            videoUrl = data.videoUrlSd || data.videoUrl;
            qualityText = 'SD';
            await zk.sendMessage(dest, { text: await translateTextWithCache("📤 Sending SD video...", lang) }, { quoted: ms });
        } else {
            videoUrl = data.videoUrl;
            qualityText = 'MP4';
        }
        
        if (!videoUrl) {
            await repondre(t.errorDownloading);
            return;
        }

        await zk.sendPresenceUpdate('recording', dest);

        const title = data.title || "TikTok Video";
        const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}_${qualityText}.mp4`;

        const thumbnail = data.thumbnail || randomNjabulourl;

        if (isDocument) {
            await zk.sendMessage(dest, {
                document: { url: videoUrl },
                mimetype: 'video/mp4',
                fileName: fileName,
                caption: `${t.tiktokVideo}\n\n${t.title} ${title}\n${t.quality} ${qualityText}\n\n${t.downloadComplete}`,
                
            }, { quoted: ms });
        } else {
            await zk.sendMessage(dest, {
                video: { url: videoUrl },
                caption: `${t.videoReady}\n\n${t.title} ${title}\n${t.quality} ${qualityText}\n\n${t.downloadComplete}`,
                
            }, { quoted: ms });
        }

        await zk.sendMessage(dest, { text: t.downloadComplete }, { quoted: ms });

    } catch (error) {
        console.error("Video download error:", error);
        await zk.sendMessage(dest, { 
            text: await translateTextWithCache("❌ Failed to download video. Please try again.", lang)
        }, { quoted: ms });
    }
}

// ========== DOWNLOAD TIKTOK AUDIO ==========
async function downloadTikTokAudio(zk, dest, ms, data, lang) {
    try {
        const t = await getTranslatedTexts();
        const audioUrl = data.audioUrl || data.videoUrl;
        
        if (!audioUrl) {
            await repondre(t.errorDownloading);
            return;
        }

        await zk.sendPresenceUpdate('recording', dest);
        await zk.sendMessage(dest, { text: t.downloadingAudio }, { quoted: ms });

        const response = await axios.get(audioUrl, { 
            responseType: 'arraybuffer',
            timeout: 60000
        });

        if (!response.data) {
            throw new Error('Failed to download audio');
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

        const title = data.title || "TikTok Audio";
        const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.mp3`;

        await zk.sendMessage(dest, {
            audio: { url: audioFile },
            mimetype: 'audio/mpeg',
            fileName: fileName,
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: `🎵 ${title}`,
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
            text: await translateTextWithCache("❌ Failed to extract audio. Please try again.", lang)
        }, { quoted: ms });
    }
        }
