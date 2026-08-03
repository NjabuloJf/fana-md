const { fana } = require('../njabulo/fana');
const fs = require('fs');
const { default: axios } = require('axios');
const config = require("../set");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// ========== GOOGLE TRANSLATE API ==========
let translateText = async (text, targetLang) => {
    try {
        if (!targetLang || targetLang === 'en' || typeof targetLang !== 'string') {
            return text;
        }
        targetLang = targetLang.toString().toLowerCase().trim();
        if (targetLang.length > 5 || targetLang.length < 2) {
            return text;
        }
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
    if (!targetLang || targetLang === 'en' || typeof targetLang !== 'string') return text;
    targetLang = targetLang.toString().toLowerCase().trim();
    if (targetLang.length > 5 || targetLang.length < 2) return text;
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
        errorDownloading: await translateTextWithCache("❌ *Error downloading*", lang),
        checkLink: await translateTextWithCache("Please check the link and try again.", lang),
        pleaseInsert: await translateTextWithCache("⚠️ *Please insert a valid link!*", lang),
        example: await translateTextWithCache("📌 Example:", lang),
        videoReady: await translateTextWithCache("🎬 *Your video is ready!*", lang),
        imageReady: await translateTextWithCache("🖼️ *Your image is ready!*", lang),
        audioReady: await translateTextWithCache("🎵 *Your audio is ready!*", lang),
        title: await translateTextWithCache("📹 *Title:*", lang),
        author: await translateTextWithCache("👤 *Author:*", lang),
        channel: await translateTextWithCache("📺 *Channel:*", lang),
        duration: await translateTextWithCache("⏱️ *Duration:*", lang),
        views: await translateTextWithCache("👁️ *Views:*", lang),
        likes: await translateTextWithCache("❤️ *Likes:*", lang),
        retweets: await translateTextWithCache("🔄 *Retweets:*", lang),
        replies: await translateTextWithCache("💬 *Replies:*", lang),
        uses: await translateTextWithCache("📊 *Uses:*", lang),
        unknown: await translateTextWithCache("Unknown", lang),
        selectFormat: await translateTextWithCache("📌 *Select format:*", lang),
        audioOption: await translateTextWithCache("1️⃣ Audio (MP3)", lang),
        videoOption: await translateTextWithCache("2️⃣ Video (MP4)", lang),
        videoDocOption: await translateTextWithCache("3️⃣ Video Document", lang),
        hdVideoOption: await translateTextWithCache("4️⃣ HD Video", lang),
        sdVideoOption: await translateTextWithCache("5️⃣ SD Video", lang),
        imageOption: await translateTextWithCache("4️⃣ Image", lang),
        chooseOption: await translateTextWithCache("Reply with number 1, 2, 3, 4, or 5 to choose:", lang),
        invalidChoice: await translateTextWithCache("❌ Invalid choice! Please reply with 1, 2, 3, 4, or 5.", lang),
        timeoutMsg: await translateTextWithCache("⏰ Timeout! Please try again.", lang),
        processing: await translateTextWithCache("⏳ Processing...", lang),
        fetchingInfo: await translateTextWithCache("📡 Fetching media info...", lang),
        apiFailed: await translateTextWithCache("⚠️ API is currently unavailable. Please try again later.", lang),
        noMediaFound: await translateTextWithCache("❌ No media found for this link.", lang),
        sendingImages: await translateTextWithCache("📤 Sending images...", lang),
        imageCount: await translateTextWithCache("📸 Images found:", lang),
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

// ========== FETCH MEDIA INFO USING NOOBS API ==========
async function fetchMediaInfo(url) {
    try {
        const apiUrl = `https://noobs-api.top/dipto/alldl?url=${encodeURIComponent(url)}`;
        console.log(`🔄 Fetching: ${apiUrl}`);
        
        const response = await axios.get(apiUrl, { 
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.status === 200 && response.data) {
            const data = response.data;
            console.log('📡 Data received:', JSON.stringify(data).substring(0, 300));
            
            const result = {
                title: data.videoTitle || data.title || data.caption || "Media",
                author: data.author || data.username || data.channel || "Unknown",
                duration: data.duration || "0:00",
                views: data.views || data.viewCount || 0,
                likes: data.likes || data.likeCount || 0,
                retweets: data.retweets || data.retweetCount || 0,
                replies: data.replies || data.replyCount || 0,
                uses: data.uses || 0,
                thumbnail: data.imageUrl || data.thumbnail || data.cover || randomNjabulourl,
                videoUrl: data.result || data.video || data.video_url || null,
                audioUrl: data.audio || data.audio_url || null,
                images: data.imageUrl ? [data.imageUrl] : (data.images || []),
                isVideo: data.result ? true : false,
                isImage: data.imageUrl && !data.result ? true : false,
                isCarousel: data.images && data.images.length > 1 ? true : false,
                raw: data
            };
            
            return result;
        }
        throw new Error('No data received from API');
    } catch (error) {
        console.error('❌ API error:', error.message);
        throw error;
    }
}

// ========== SEND CAROUSEL MESSAGE ==========
async function sendCarouselMessage(zk, dest, cards, ms, title) {
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
                        body: { text: `📥 *${title}*` },
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

// ========== GENERIC DOWNLOAD FUNCTIONS ==========
async function downloadMediaVideo(zk, dest, ms, data, lang, isDocument, quality, platform) {
    try {
        const t = await getTranslatedTexts();
        let videoUrl = data.videoUrl;
        let qualityText = '';

        if (quality === 'hd') {
            qualityText = 'HD';
        } else if (quality === 'sd') {
            qualityText = 'SD';
        } else {
            qualityText = 'MP4';
        }
        
        if (!videoUrl) {
            await repondre(t.errorDownloading);
            return;
        }

        await zk.sendPresenceUpdate('recording', dest);

        const title = data.title || `${platform} Video`;
        const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}_${qualityText}.mp4`;
        const thumbnail = data.thumbnail || randomNjabulourl;

        if (isDocument) {
            await zk.sendMessage(dest, {
                document: { url: videoUrl },
                mimetype: 'video/mp4',
                fileName: fileName,
                caption: `${platform}\n\n${t.title} ${title}\n${t.author} ${data.author || 'Unknown'}\n${t.quality} ${qualityText}\n\n${t.downloadComplete}`,
                contextInfo: {
                    externalAdReply: {
                        title: `📹 ${title}`,
                        mediaType: 1,
                        previewType: 0,
                        thumbnailUrl: thumbnail,
                        renderLargerThumbnail: true,
                    },
                },
            }, { quoted: ms });
        } else {
            await zk.sendMessage(dest, {
                video: { url: videoUrl },
                caption: `${t.videoReady}\n\n${t.title} ${title}\n${t.author} ${data.author || 'Unknown'}\n${t.quality} ${qualityText}\n\n${t.downloadComplete}`,
                contextInfo: {
                    externalAdReply: {
                        title: `📹 ${title}`,
                        mediaType: 1,
                        previewType: 0,
                        thumbnailUrl: thumbnail,
                        renderLargerThumbnail: true,
                    },
                },
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

async function downloadMediaAudio(zk, dest, ms, data, lang) {
    try {
        const t = await getTranslatedTexts();
        const audioUrl = data.audioUrl || data.videoUrl;
        
        if (!audioUrl) {
            await repondre(t.errorDownloading);
            return;
        }

        await zk.sendPresenceUpdate('recording', dest);
        await zk.sendMessage(dest, { text: t.processing }, { quoted: ms });

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

        const title = data.title || "Audio";
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

async function downloadMediaImage(zk, dest, ms, data, lang) {
    try {
        const t = await getTranslatedTexts();
        let imageUrl = data.images && data.images.length > 0 ? data.images[0] : data.thumbnail;
        
        if (!imageUrl) {
            await repondre(t.errorDownloading);
            return;
        }

        await zk.sendPresenceUpdate('composing', dest);

        const title = data.title || "Image";
        const caption = `${t.imageReady}\n\n${t.title} ${title}\n${t.author} ${data.author || 'Unknown'}\n\n${t.downloadComplete}`;

        await zk.sendMessage(dest, {
            image: { url: imageUrl },
            caption: caption,
            contextInfo: {
                externalAdReply: {
                    title: `🖼️ ${title}`,
                    mediaType: 1,
                    previewType: 0,
                    thumbnailUrl: imageUrl,
                    renderLargerThumbnail: true,
                },
            },
        }, { quoted: ms });

        await zk.sendMessage(dest, { text: t.downloadComplete }, { quoted: ms });

    } catch (error) {
        console.error("Image download error:", error);
        await zk.sendMessage(dest, { 
            text: await translateTextWithCache("❌ Failed to download image. Please try again.", lang)
        }, { quoted: ms });
    }
}

// ========== CREATE CARDS FUNCTION ==========
async function createMediaCards(mediaInfo, zk, ms, lang, platform, icon) {
    const t = await getTranslatedTexts();
    const buttons = [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: t.waChannel,
                url: config.GURL
            }),
        },
    ];

    const title = mediaInfo.title || `${platform} Post`;
    const author = mediaInfo.author || "Unknown";
    const duration = mediaInfo.duration || "0:00";
    const views = mediaInfo.views || 0;
    const likes = mediaInfo.likes || 0;
    const retweets = mediaInfo.retweets || 0;
    const replies = mediaInfo.replies || 0;
    const uses = mediaInfo.uses || 0;
    const thumbnail = mediaInfo.thumbnail || randomNjabulourl;
    const isVideo = mediaInfo.isVideo || false;
    const isImage = mediaInfo.isImage || (!isVideo && mediaInfo.images && mediaInfo.images.length > 0);
    const isCarousel = mediaInfo.isCarousel || (mediaInfo.images && mediaInfo.images.length > 1);
    const imageCount = mediaInfo.images ? mediaInfo.images.length : 0;

    let imageMessage = null;
    try {
        if (thumbnail) {
            imageMessage = (await generateWAMessageContent({ image: { url: thumbnail } }, { upload: zk.waUploadToServer })).imageMessage;
        }
    } catch (e) {
        imageMessage = (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage;
    }

    // Build info text based on platform
    let infoText = `${t.title} ${title}\n${t.author} ${author}\n`;
    if (duration !== "0:00") infoText += `${t.duration} ${duration}\n`;
    if (views > 0) infoText += `${t.views} ${views.toLocaleString()}\n`;
    if (likes > 0) infoText += `${t.likes} ${likes.toLocaleString()}\n`;
    if (retweets > 0) infoText += `${t.retweets} ${retweets.toLocaleString()}\n`;
    if (replies > 0) infoText += `${t.replies} ${replies.toLocaleString()}\n`;
    if (uses > 0) infoText += `${t.uses} ${uses.toLocaleString()}\n`;
    if (isCarousel) infoText += `${t.imageCount} ${imageCount}\n`;
    infoText += `${isVideo ? '🎬 Video' : isImage ? '🖼️ Image' : '📌 Post'}\n\n`;
    infoText += `${t.selectFormat}\n\n`;
    infoText += `${t.audioOption}\n`;
    infoText += `${t.videoOption}\n`;
    infoText += `${t.videoDocOption}\n`;
    if (isVideo) {
        infoText += `${t.hdVideoOption}\n`;
        infoText += `${t.sdVideoOption}\n`;
    } else {
        infoText += `${t.imageOption}\n`;
        if (isCarousel) infoText += `5️⃣ ${t.carouselOption}\n`;
    }
    infoText += `\n${t.chooseOption}`;

    const card1 = {
        header: {
            title: `📥 ${icon} ${platform}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: infoText,
        },
        footer: {
            text: `🔹 ${platform} Downloader`,
        },
        nativeFlowMessage: {
            buttons: buttons,
        },
    };

    // Build quick download options
    let quickOptions = `📌 *Quick Download*\n\n`;
    quickOptions += `🔹 ${t.audioOption} - MP3 Audio\n`;
    quickOptions += `🔹 ${t.videoOption} - MP4 Video\n`;
    quickOptions += `🔹 ${t.videoDocOption} - Video Document\n`;
    if (isVideo) {
        quickOptions += `🔹 ${t.hdVideoOption} - Best Quality\n`;
        quickOptions += `🔹 ${t.sdVideoOption} - Standard Quality\n`;
    } else {
        quickOptions += `🔹 ${t.imageOption} - Image\n`;
        if (isCarousel) quickOptions += `🔹 5️⃣ ${t.carouselOption} - All Images\n`;
    }
    quickOptions += `\n${t.chooseOption}`;

    const card2 = {
        header: {
            title: `📥 ${icon} ${platform}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: quickOptions,
        },
        footer: {
            text: `🔹 Reply with number`,
        },
        nativeFlowMessage: {
            buttons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 Copy Link",
                        copy_code: mediaInfo.url || "Link not available",
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

    return { cards: [card1, card2] };
}

// ========== GENERATE COMMAND FUNCTION ==========
function createDownloaderCommand(nomCom, aliases, platform, icon, exampleUrl, hasVideo = true, hasImage = true, hasAudio = true) {
    fana({
        nomCom: nomCom,
        alias: aliases,
        categorie: "Download",
        reaction: icon
    }, async (dest, zk, commandeOptions) => {
        const { repondre, ms, arg } = commandeOptions;
        const lang = config.LANGUAGE || "en";
        const t = await getTranslatedTexts();

        // Check number selection reply
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

            // Handle number selection
            const isVideoPost = data.isVideo || false;
            const isImagePost = data.isImage || (!isVideoPost && data.images && data.images.length > 0);
            const isCarousel = data.isCarousel || (data.images && data.images.length > 1);

            switch(selectedNumber) {
                case 1:
                    if (hasAudio) {
                        await downloadMediaAudio(zk, dest, ms, data, lang);
                    } else {
                        await repondre(t.invalidChoice);
                    }
                    break;
                case 2:
                    if (hasVideo) {
                        await downloadMediaVideo(zk, dest, ms, data, lang, false, 'mp4', platform);
                    } else {
                        await repondre(t.invalidChoice);
                    }
                    break;
                case 3:
                    if (hasVideo) {
                        await downloadMediaVideo(zk, dest, ms, data, lang, true, 'mp4', platform);
                    } else {
                        await repondre(t.invalidChoice);
                    }
                    break;
                case 4:
                    if (isVideoPost && hasVideo) {
                        await downloadMediaVideo(zk, dest, ms, data, lang, false, 'hd', platform);
                    } else if (hasImage) {
                        await downloadMediaImage(zk, dest, ms, data, lang);
                    } else {
                        await repondre(t.invalidChoice);
                    }
                    break;
                case 5:
                    if (isVideoPost && hasVideo) {
                        await downloadMediaVideo(zk, dest, ms, data, lang, false, 'sd', platform);
                    } else if (isCarousel && hasImage) {
                        await downloadMediaCarousel(zk, dest, ms, data, lang);
                    } else {
                        await repondre(t.invalidChoice);
                    }
                    break;
                default:
                    await repondre(t.invalidChoice);
                    return;
            }
            return;
        }

        // ========== Normal URL processing ==========
        if (!arg[0]) {
            return await repondre(`${t.pleaseInsert}\n\n${t.example} .${nomCom} ${exampleUrl}`);
        }

        const queryURL = arg.join(" ");
        await zk.sendPresenceUpdate('composing', dest);
        await zk.sendMessage(dest, { text: t.fetchingInfo }, { quoted: ms });

        try {
            const result = await fetchMediaInfo(queryURL);
            if (!result || (!result.videoUrl && (!result.images || result.images.length === 0))) {
                throw new Error(t.noMediaFound);
            }

            // Store media info
            const senderJid = ms.key.remoteJid;
            activeDownloads[senderJid] = {
                mediaInfo: result,
                title: result.title || `${platform} Post`,
                url: queryURL,
                thumbnail: result.thumbnail || randomNjabulourl,
                videoUrl: result.videoUrl,
                images: result.images || [],
                isVideo: result.isVideo || false,
                isImage: result.isImage || (!result.isVideo && result.images && result.images.length > 0),
                isCarousel: result.isCarousel || (result.images && result.images.length > 1),
                audioUrl: result.audioUrl,
                author: result.author,
                duration: result.duration,
                views: result.views,
                likes: result.likes,
                retweets: result.retweets,
                replies: result.replies,
                uses: result.uses,
                timestamp: Date.now()
            };

            // Create and send cards
            const { cards } = await createMediaCards(result, zk, ms, lang, platform, icon);
            await sendCarouselMessage(zk, dest, cards, ms, platform);

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

                    const isVideoPost = data.isVideo || false;
                    const isImagePost = data.isImage || (!isVideoPost && data.images && data.images.length > 0);
                    const isCarousel = data.isCarousel || (data.images && data.images.length > 1);

                    switch(selectedNumber) {
                        case 1:
                            if (hasAudio) {
                                await downloadMediaAudio(zk, dest, ms, data, lang);
                            } else {
                                await repondre(t.invalidChoice);
                            }
                            break;
                        case 2:
                            if (hasVideo) {
                                await downloadMediaVideo(zk, dest, ms, data, lang, false, 'mp4', platform);
                            } else {
                                await repondre(t.invalidChoice);
                            }
                            break;
                        case 3:
                            if (hasVideo) {
                                await downloadMediaVideo(zk, dest, ms, data, lang, true, 'mp4', platform);
                            } else {
                                await repondre(t.invalidChoice);
                            }
                            break;
                        case 4:
                            if (isVideoPost && hasVideo) {
                                await downloadMediaVideo(zk, dest, ms, data, lang, false, 'hd', platform);
                            } else if (hasImage) {
                                await downloadMediaImage(zk, dest, ms, data, lang);
                            } else {
                                await repondre(t.invalidChoice);
                            }
                            break;
                        case 5:
                            if (isVideoPost && hasVideo) {
                                await downloadMediaVideo(zk, dest, ms, data, lang, false, 'sd', platform);
                            } else if (isCarousel && hasImage) {
                                await downloadMediaCarousel(zk, dest, ms, data, lang);
                            } else {
                                await repondre(t.invalidChoice);
                            }
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
}

// ========== CAROUSEL DOWNLOAD FUNCTION ==========
async function downloadMediaCarousel(zk, dest, ms, data, lang) {
    try {
        const t = await getTranslatedTexts();
        const images = data.images || [];
        
        if (images.length === 0) {
            await repondre(t.errorDownloading);
            return;
        }

        await zk.sendPresenceUpdate('composing', dest);
        await zk.sendMessage(dest, { text: t.sendingImages }, { quoted: ms });

        const title = data.title || "Carousel";
        const totalImages = Math.min(images.length, 10);

        for (let i = 0; i < totalImages; i++) {
            const img = images[i];
            const imageUrl = typeof img === 'string' ? img : img.url || img;
            
            if (!imageUrl) continue;
            
            await zk.sendMessage(dest, {
                image: { url: imageUrl },
                caption: `📸 *Image ${i+1}/${totalImages}*\n${t.title} ${title}\n${t.author} ${data.author || 'Unknown'}`,
                contextInfo: {
                    externalAdReply: {
                        title: `📸 Image ${i+1}/${totalImages}`,
                        mediaType: 1,
                        previewType: 0,
                        thumbnailUrl: imageUrl,
                        renderLargerThumbnail: true,
                    },
                },
            }, { quoted: ms });
            
            if (i < totalImages - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        await zk.sendMessage(dest, { 
            text: `${t.downloadComplete}\n📸 ${totalImages} images sent` 
        }, { quoted: ms });

    } catch (error) {
        console.error("Carousel download error:", error);
        await zk.sendMessage(dest, { 
            text: await translateTextWithCache("❌ Failed to download carousel. Please try again.", lang)
        }, { quoted: ms });
    }
}

// ========== REGISTER ALL 6 COMMANDS ==========

// 1. YouTube Downloader
createDownloaderCommand(
    "youtube",
    ["yt", "ytdl", "ytmp3", "ytmp4"],
    "YouTube",
    "▶️",
    "https://www.youtube.com/watch?v=xxxxx",
    true, true, true
);

// 2. Twitter/X Downloader
createDownloaderCommand(
    "twitter",
    ["x", "twit", "twitterdl", "xdl"],
    "Twitter/X",
    "🐦",
    "https://twitter.com/user/status/xxxxx",
    true, true, true
);

// 3. Likee Downloader
createDownloaderCommand(
    "likee",
    ["likeedl", "likeevideo"],
    "Likee",
    "🎵",
    "https://likee.video/xxxxx",
    true, false, true
);

// 4. Threads Downloader
createDownloaderCommand(
    "threads",
    ["threadsdl", "thdl"],
    "Threads",
    "🧵",
    "https://www.threads.net/xxxxx",
    true, true, true
);

// 5. CapCut Downloader
createDownloaderCommand(
    "capcut",
    ["capcutdl", "ccdl"],
    "CapCut",
    "✂️",
    "https://www.capcut.com/xxxxx",
    true, false, true
);

// 6. Snapchat Downloader
createDownloaderCommand(
    "snapchat",
    ["snapdl", "scdl"],
    "Snapchat",
    "👻",
    "https://www.snapchat.com/xxxxx",
    true, false, true
);