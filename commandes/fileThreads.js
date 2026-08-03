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
        pleaseInsert: await translateTextWithCache("⚠️ *Please insert a Threads link!*", lang),
        example: await translateTextWithCache("📌 Example:", lang),
        videoReady: await translateTextWithCache("🎬 *Your video is ready!*", lang),
        imageReady: await translateTextWithCache("🖼️ *Your image is ready!*", lang),
        threadsPost: await translateTextWithCache("📥 *THREADS POST*", lang),
        title: await translateTextWithCache("📹 *Title:*", lang),
        author: await translateTextWithCache("👤 *Author:*", lang),
        likes: await translateTextWithCache("❤️ *Likes:*", lang),
        replies: await translateTextWithCache("💬 *Replies:*", lang),
        unknown: await translateTextWithCache("Unknown", lang),
        selectFormat: await translateTextWithCache("📌 *Select format:*", lang),
        audioOption: await translateTextWithCache("1️⃣ Audio (MP3)", lang),
        videoOption: await translateTextWithCache("2️⃣ Video (MP4)", lang),
        videoDocOption: await translateTextWithCache("3️⃣ Video Document", lang),
        imageOption: await translateTextWithCache("4️⃣ Image", lang),
        carouselOption: await translateTextWithCache("5️⃣ All Images (Carousel)", lang),
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

// ========== FETCH THREADS INFO ==========
async function fetchThreadsInfo(url) {
    try {
        const apiUrl = `https://noobs-api.top/dipto/alldl?url=${encodeURIComponent(url)}`;
        console.log(`🔄 Fetching Threads: ${apiUrl}`);
        
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
                title: data.videoTitle || data.title || data.caption || "Threads Post",
                author: data.author || data.username || "Unknown",
                likes: data.likes || data.likeCount || 0,
                replies: data.replies || data.replyCount || 0,
                thumbnail: data.imageUrl || data.thumbnail || data.cover || randomNjabulourl,
                videoUrl: data.result || data.video || data.video_url || null,
                images: data.imageUrl ? [data.imageUrl] : (data.images || []),
                isVideo: data.result ? true : false,
                isImage: data.imageUrl && !data.result ? true : false,
                isCarousel: data.images && data.images.length > 1 ? true : false,
                raw: data
            };
            
            console.log(`✅ Threads data parsed: Video=${result.isVideo}, Images=${result.images.length}`);
            return result;
        }
        throw new Error('No data received from API');
    } catch (error) {
        console.error('❌ Threads API error:', error.message);
        throw error;
    }
}

// ========== CREATE CARDS ==========
async function createThreadsCards(mediaInfo, zk, ms, lang) {
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

    const title = mediaInfo.title || "Threads Post";
    const author = mediaInfo.author || "Unknown";
    const likes = mediaInfo.likes || 0;
    const replies = mediaInfo.replies || 0;
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

    const card1 = {
        header: {
            title: `📥 ${t.threadsPost}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `${t.title} ${title}\n` +
                  `${t.author} ${author}\n` +
                  `${t.likes} ${likes.toLocaleString()}\n` +
                  `${t.replies} ${replies.toLocaleString()}\n` +
                  `${isCarousel ? `📸 ${t.imageCount} ${imageCount}` : ''}\n` +
                  `${isVideo ? '🎬 Video' : isImage ? '🖼️ Image' : '📌 Post'}\n\n` +
                  `${t.selectFormat}\n\n` +
                  `${t.audioOption}\n` +
                  `${t.videoOption}\n` +
                  `${t.videoDocOption}\n` +
                  `${t.imageOption}\n` +
                  `${isCarousel ? t.carouselOption : ''}\n\n` +
                  `${t.chooseOption}`,
        },
        footer: {
            text: `🔹 Threads Downloader`,
        },
        nativeFlowMessage: {
            buttons: buttons,
        },
    };

    const card2 = {
        header: {
            title: `📥 ${t.threadsPost}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `📌 *Quick Download*\n\n` +
                  `🔹 ${t.audioOption} - MP3 Audio\n` +
                  `🔹 ${t.videoOption} - MP4 Video\n` +
                  `🔹 ${t.videoDocOption} - Video Document\n` +
                  `🔹 ${t.imageOption} - Image\n` +
                  `${isCarousel ? `🔹 ${t.carouselOption} - All Images\n` : ''}\n` +
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

// ========== SEND CAROUSEL ==========
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
                        body: { text: `📥 *Threads Downloader*` },
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

// ========== DOWNLOAD FUNCTIONS ==========
async function downloadThreadsVideo(zk, dest, ms, data, lang, isDocument) {
    try {
        const t = await getTranslatedTexts();
        const videoUrl = data.videoUrl;
        
        if (!videoUrl) {
            await repondre(t.errorDownloading);
            return;
        }

        await zk.sendPresenceUpdate('recording', dest);

        const title = data.title || "Threads Video";
        const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.mp4`;
        const thumbnail = data.thumbnail || randomNjabulourl;

        if (isDocument) {
            await zk.sendMessage(dest, {
                document: { url: videoUrl },
                mimetype: 'video/mp4',
                fileName: fileName,
                caption: `${t.threadsPost}\n\n${t.title} ${title}\n${t.author} ${data.author || 'Unknown'}\n\n${t.downloadComplete}`,
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
                caption: `${t.videoReady}\n\n${t.title} ${title}\n${t.author} ${data.author || 'Unknown'}\n\n${t.downloadComplete}`,
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

async function downloadThreadsAudio(zk, dest, ms, data, lang) {
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

        const title = data.title || "Threads Audio";
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

async function downloadThreadsImage(zk, dest, ms, data, lang) {
    try {
        const t = await getTranslatedTexts();
        let imageUrl = data.images && data.images.length > 0 ? data.images[0] : data.thumbnail;
        
        if (!imageUrl) {
            await repondre(t.errorDownloading);
            return;
        }

        await zk.sendPresenceUpdate('composing', dest);

        const title = data.title || "Threads Image";
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

async function downloadThreadsCarousel(zk, dest, ms, data, lang) {
    try {
        const t = await getTranslatedTexts();
        const images = data.images || [];
        
        if (images.length === 0) {
            await repondre(t.errorDownloading);
            return;
        }

        await zk.sendPresenceUpdate('composing', dest);
        await zk.sendMessage(dest, { text: t.sendingImages }, { quoted: ms });

        const title = data.title || "Threads Carousel";
        const totalImages = Math.min(images.length, 10);

        for (let i = 0; i < totalImages; i++) {
            const img = images[i];
            const imageUrl = typeof img === 'string' ? img : img.url || img;
            
            if (!imageUrl) continue;
            
            await zk.sendMessage(dest, {
                image: { url: imageUrl },
                caption: `${t.threadsPost}\n\n📸 *Image ${i+1}/${totalImages}*\n${t.title} ${title}\n${t.author} ${data.author || 'Unknown'}`,
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

// ========== MAIN COMMAND ==========
fana({
    nomCom: "threads",
    alias: ["threadsdl", "thdl"],
    categorie: "Download",
    reaction: "🧵"
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

        const isVideoPost = data.isVideo || false;
        const isCarousel = data.isCarousel || (data.images && data.images.length > 1);

        switch(selectedNumber) {
            case 1:
                await downloadThreadsAudio(zk, dest, ms, data, lang);
                break;
            case 2:
                await downloadThreadsVideo(zk, dest, ms, data, lang, false);
                break;
            case 3:
                await downloadThreadsVideo(zk, dest, ms, data, lang, true);
                break;
            case 4:
                if (isVideoPost) {
                    await downloadThreadsVideo(zk, dest, ms, data, lang, false);
                } else {
                    await downloadThreadsImage(zk, dest, ms, data, lang);
                }
                break;
            case 5:
                if (isCarousel) {
                    await downloadThreadsCarousel(zk, dest, ms, data, lang);
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

    if (!arg[0]) {
        return await repondre(`${t.pleaseInsert}\n\n${t.example} .threads https://www.threads.net/xxxxx`);
    }

    const queryURL = arg.join(" ");
    await zk.sendPresenceUpdate('composing', dest);
    await zk.sendMessage(dest, { text: t.fetchingInfo }, { quoted: ms });

    try {
        const result = await fetchThreadsInfo(queryURL);
        if (!result || (!result.videoUrl && (!result.images || result.images.length === 0))) {
            throw new Error(t.noMediaFound);
        }

        const senderJid = ms.key.remoteJid;
        activeDownloads[senderJid] = {
            title: result.title || "Threads Post",
            url: queryURL,
            thumbnail: result.thumbnail || randomNjabulourl,
            videoUrl: result.videoUrl,
            images: result.images || [],
            isVideo: result.isVideo || false,
            isCarousel: result.isCarousel || (result.images && result.images.length > 1),
            author: result.author,
            likes: result.likes,
            replies: result.replies,
            timestamp: Date.now()
        };

        const { cards } = await createThreadsCards(result, zk, ms, lang);
        await sendCarouselMessage(zk, dest, cards, ms);

        // Setup reply collector
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
                const isCarousel = data.isCarousel || (data.images && data.images.length > 1);

                switch(selectedNumber) {
                    case 1:
                        await downloadThreadsAudio(zk, dest, ms, data, lang);
                        break;
                    case 2:
                        await downloadThreadsVideo(zk, dest, ms, data, lang, false);
                        break;
                    case 3:
                        await downloadThreadsVideo(zk, dest, ms, data, lang, true);
                        break;
                    case 4:
                        if (isVideoPost) {
                            await downloadThreadsVideo(zk, dest, ms, data, lang, false);
                        } else {
                            await downloadThreadsImage(zk, dest, ms, data, lang);
                        }
                        break;
                    case 5:
                        if (isCarousel) {
                            await downloadThreadsCarousel(zk, dest, ms, data, lang);
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