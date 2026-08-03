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
        errorDownloading: await translateTextWithCache("❌ *Error downloading*", lang),
        checkLink: await translateTextWithCache("Please check the link and try again.", lang),
        pleaseInsert: await translateTextWithCache("⚠️ *Please insert a public Instagram link!*", lang),
        example: await translateTextWithCache("📌 Example:", lang),
        videoReady: await translateTextWithCache("🎬 *Your video is ready!*", lang),
        imageReady: await translateTextWithCache("🖼️ *Your image is ready!*", lang),
        instagramPost: await translateTextWithCache("📥 *INSTAGRAM POST*", lang),
        title: await translateTextWithCache("📹 *Title:*", lang),
        author: await translateTextWithCache("👤 *Author:*", lang),
        likes: await translateTextWithCache("❤️ *Likes:*", lang),
        comments: await translateTextWithCache("💬 *Comments:*", lang),
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
        downloadingAudio: await translateTextWithCache("⏳ Downloading audio...", lang),
        errorAudio: await translateTextWithCache("❌ Failed to extract audio. Please try again.", lang),
        noMediaFound: await translateTextWithCache("❌ No media found for this link.", lang),
        fetchingInfo: await translateTextWithCache("📡 Fetching media info...", lang),
        apiFailed: await translateTextWithCache("⚠️ API is currently unavailable. Please try again later.", lang),
        imageCount: await translateTextWithCache("📸 Images found:", lang),
        sendingImages: await translateTextWithCache("📤 Sending images...", lang),
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

// ========== FETCH INSTAGRAM INFO USING FREE API ==========
async function fetchInstagramInfo(url) {
    // Try multiple free APIs
    const apis = [
        {
            name: 'InstaDL API',
            url: `https://insta-dl.fly.dev/instagram/v1/post?url=${encodeURIComponent(url)}`,
            parse: (data) => {
                if (!data || !data.success) return null;
                const r = data.result || data;
                const images = r.images || r.image_urls || (r.thumbnail ? [r.thumbnail] : []);
                return {
                    title: r.title || r.caption || "Instagram Post",
                    author: r.author || r.username || "Unknown",
                    likes: r.likes || 0,
                    comments: r.comments || 0,
                    thumbnail: r.thumbnail || r.cover || images[0] || randomNjabulourl,
                    videoUrl: r.video || r.video_url || r.url || null,
                    images: images,
                    isVideo: r.is_video || (r.video && r.video.length > 0) || false,
                    isCarousel: r.is_carousel || (images && images.length > 1) || false,
                    audioUrl: r.audio || r.audio_url || null,
                };
            }
        },
        {
            name: 'InstaSave API',
            url: `https://instasave.xyz/api/v1/post?url=${encodeURIComponent(url)}`,
            parse: (data) => {
                if (!data || !data.success) return null;
                const r = data.result || data;
                const images = r.images || r.image_urls || (r.thumbnail ? [r.thumbnail] : []);
                return {
                    title: r.title || r.caption || "Instagram Post",
                    author: r.author || r.username || "Unknown",
                    likes: r.likes || 0,
                    comments: r.comments || 0,
                    thumbnail: r.thumbnail || r.cover || images[0] || randomNjabulourl,
                    videoUrl: r.video || r.video_url || r.url || null,
                    images: images,
                    isVideo: r.is_video || (r.video && r.video.length > 0) || false,
                    isCarousel: r.is_carousel || (images && images.length > 1) || false,
                    audioUrl: r.audio || r.audio_url || null,
                };
            }
        },
        {
            name: 'Instagram API',
            url: `https://www.instagram.com/p/${extractCode(url)}/?__a=1&__d=1`,
            parse: (data) => {
                if (!data || !data.graphql) return null;
                const r = data.graphql.shortcode_media;
                if (!r) return null;
                const isVideo = r.is_video || false;
                const images = [];
                if (r.edge_sidecar_to_children) {
                    const edges = r.edge_sidecar_to_children.edges || [];
                    for (const edge of edges) {
                        const node = edge.node;
                        if (node.is_video) {
                            images.push(node.video_url);
                        } else {
                            images.push(node.display_url);
                        }
                    }
                } else if (isVideo) {
                    images.push(r.video_url);
                } else {
                    images.push(r.display_url);
                }
                return {
                    title: r.edge_media_to_caption?.edges?.[0]?.node?.text || "Instagram Post",
                    author: r.owner?.username || "Unknown",
                    likes: r.edge_media_preview_like?.count || 0,
                    comments: r.edge_media_to_comment?.count || 0,
                    thumbnail: r.thumbnail_src || r.display_url || images[0] || randomNjabulourl,
                    videoUrl: r.video_url || null,
                    images: images.filter(Boolean),
                    isVideo: isVideo,
                    isCarousel: r.edge_sidecar_to_children ? true : false,
                    audioUrl: null,
                };
            }
        }
    ];

    function extractCode(url) {
        const match = url.match(/\/p\/([^/?]+)/);
        if (match) return match[1];
        const match2 = url.match(/\/reel\/([^/?]+)/);
        if (match2) return match2[1];
        const match3 = url.match(/\/tv\/([^/?]+)/);
        if (match3) return match3[1];
        return null;
    }

    let lastError = null;

    for (const api of apis) {
        try {
            console.log(`🔄 Trying Instagram API: ${api.name}`);
            let apiUrl = api.url;
            
            if (api.name === 'Instagram API') {
                const code = extractCode(url);
                if (!code) continue;
                apiUrl = `https://www.instagram.com/p/${code}/?__a=1&__d=1`;
            }
            
            const response = await axios.get(apiUrl, { 
                timeout: 25000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                }
            });
            
            console.log(`📡 ${api.name} response status:`, response.status);
            
            if (response.status === 200) {
                const parsed = api.parse(response.data);
                if (parsed && (parsed.videoUrl || (parsed.images && parsed.images.length > 0))) {
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

    console.error('❌ All Instagram APIs failed');
    throw new Error(lastError?.message || 'All APIs failed');
}

// ========== CREATE CARDS WITH BUTTONS ==========
async function createInstagramCards(mediaInfo, zk, ms, lang) {
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

    const title = mediaInfo.title || "Instagram Post";
    const author = mediaInfo.author || "Unknown";
    const likes = mediaInfo.likes || 0;
    const comments = mediaInfo.comments || 0;
    const thumbnail = mediaInfo.thumbnail || randomNjabulourl;
    const isVideo = mediaInfo.isVideo || false;
    const isCarousel = mediaInfo.isCarousel || (mediaInfo.images && mediaInfo.images.length > 1);
    const imageCount = mediaInfo.images ? mediaInfo.images.length : 0;

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
            title: `📥 ${t.instagramPost}`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `${t.title} ${title}\n` +
                  `${t.author} ${author}\n` +
                  `${t.likes} ${likes.toLocaleString()}\n` +
                  `${t.comments} ${comments.toLocaleString()}\n` +
                  `${isCarousel ? `📸 ${t.imageCount} ${imageCount}` : ''}\n` +
                  `${isVideo ? '🎬 Video' : '🖼️ Image'}\n\n` +
                  `${t.selectFormat}\n\n` +
                  `${t.audioOption}\n` +
                  `${t.videoOption}\n` +
                  `${t.videoDocOption}\n` +
                  `${t.imageOption}\n` +
                  `${isCarousel ? t.carouselOption : ''}\n\n` +
                  `${t.chooseOption}`,
        },
        footer: {
            text: `🔹 Instagram Downloader`,
        },
        nativeFlowMessage: {
            buttons: buttons,
        },
    };

    const card2 = {
        header: {
            title: `📥 ${t.instagramPost}`,
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
                        body: { text: `📥 *Instagram Downloader*` },
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

// ========== INSTAGRAM DOWNLOADER ==========
fana({
    nomCom: "instagram",
    alias: ["ig", "igdl", "insta"],
    categorie: "Download",
    reaction: "📸"
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
                await downloadInstagramAudio(zk, dest, ms, data, lang);
                break;
            case 2:
                await downloadInstagramVideo(zk, dest, ms, data, lang, false);
                break;
            case 3:
                await downloadInstagramVideo(zk, dest, ms, data, lang, true);
                break;
            case 4:
                await downloadInstagramImage(zk, dest, ms, data, lang);
                break;
            case 5:
                await downloadInstagramCarousel(zk, dest, ms, data, lang);
                break;
            default:
                await repondre(t.invalidChoice);
                return;
        }
        return;
    }

    // ========== Normal URL processing ==========
    if (!arg[0]) {
        return await repondre(`${t.pleaseInsert}\n\n${t.example} .instagram https://www.instagram.com/p/xxxxx`);
    }

    const queryURL = arg.join(" ");
    await zk.sendPresenceUpdate('composing', dest);
    await zk.sendMessage(dest, { text: t.fetchingInfo }, { quoted: ms });

    try {
        const result = await fetchInstagramInfo(queryURL);

        if (!result || (!result.videoUrl && (!result.images || result.images.length === 0))) {
            throw new Error(t.noMediaFound);
        }

        // Store media info for later
        const senderJid = ms.key.remoteJid;
        activeDownloads[senderJid] = {
            mediaInfo: result,
            title: result.title || "Instagram Post",
            url: queryURL,
            thumbnail: result.thumbnail || randomNjabulourl,
            videoUrl: result.videoUrl,
            images: result.images || [],
            isVideo: result.isVideo || false,
            isCarousel: result.isCarousel || (result.images && result.images.length > 1),
            audioUrl: result.audioUrl,
            author: result.author,
            likes: result.likes,
            comments: result.comments,
            timestamp: Date.now()
        };

        // Create cards with media info and download options
        const { cards } = await createInstagramCards(result, zk, ms, lang);

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
                        await downloadInstagramAudio(zk, dest, ms, data, lang);
                        break;
                    case 2:
                        await downloadInstagramVideo(zk, dest, ms, data, lang, false);
                        break;
                    case 3:
                        await downloadInstagramVideo(zk, dest, ms, data, lang, true);
                        break;
                    case 4:
                        await downloadInstagramImage(zk, dest, ms, data, lang);
                        break;
                    case 5:
                        await downloadInstagramCarousel(zk, dest, ms, data, lang);
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

// ========== DOWNLOAD INSTAGRAM VIDEO ==========
async function downloadInstagramVideo(zk, dest, ms, data, lang, isDocument) {
    try {
        const t = await getTranslatedTexts();
        const videoUrl = data.videoUrl;
        
        if (!videoUrl) {
            await repondre(t.errorDownloading);
            return;
        }

        await zk.sendPresenceUpdate('recording', dest);
        await zk.sendMessage(dest, { text: t.processing }, { quoted: ms });

        const title = data.title || "Instagram Video";
        const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.mp4`;
        const thumbnail = data.thumbnail || randomNjabulourl;

        if (isDocument) {
            await zk.sendMessage(dest, {
                document: { url: videoUrl },
                mimetype: 'video/mp4',
                fileName: fileName,
                caption: `${t.instagramPost}\n\n${t.title} ${title}\n${t.author} ${data.author || 'Unknown'}\n\n${t.downloadComplete}`,
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

// ========== DOWNLOAD INSTAGRAM IMAGE ==========
async function downloadInstagramImage(zk, dest, ms, data, lang) {
    try {
        const t = await getTranslatedTexts();
        let imageUrl = null;
        
        if (data.images && data.images.length > 0) {
            const firstImage = data.images[0];
            imageUrl = typeof firstImage === 'string' ? firstImage : firstImage.url || firstImage;
        }
        
        if (!imageUrl) {
            imageUrl = data.thumbnail;
        }
        
        if (!imageUrl) {
            await repondre(t.errorDownloading);
            return;
        }

        await zk.sendPresenceUpdate('composing', dest);

        const title = data.title || "Instagram Image";
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

// ========== DOWNLOAD INSTAGRAM CAROUSEL ==========
async function downloadInstagramCarousel(zk, dest, ms, data, lang) {
    try {
        const t = await getTranslatedTexts();
        const images = data.images || [];
        
        if (images.length === 0) {
            await repondre(t.errorDownloading);
            return;
        }

        await zk.sendPresenceUpdate('composing', dest);
        await zk.sendMessage(dest, { text: t.sendingImages }, { quoted: ms });

        const title = data.title || "Instagram Carousel";
        const totalImages = Math.min(images.length, 10);

        for (let i = 0; i < totalImages; i++) {
            const img = images[i];
            const imageUrl = typeof img === 'string' ? img : img.url || img;
            
            if (!imageUrl) continue;
            
            await zk.sendMessage(dest, {
                image: { url: imageUrl },
                caption: `${t.instagramPost}\n\n📸 *Image ${i+1}/${totalImages}*\n${t.title} ${title}\n${t.author} ${data.author || 'Unknown'}`,
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

// ========== DOWNLOAD INSTAGRAM AUDIO ==========
async function downloadInstagramAudio(zk, dest, ms, data, lang) {
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

        const title = data.title || "Instagram Audio";
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
            text: t.errorAudio 
        }, { quoted: ms });
    }
            }
