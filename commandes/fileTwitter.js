// ========== TWITTER/X DOWNLOADER ==========
const { fana } = require('../njabulo/fana');
const fs = require('fs');
const { default: axios } = require('axios');
const config = require("../set");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// (Include all the same translation functions, activeDownloads, njabulox, isNumberSelection from above)

async function fetchTwitterInfo(url) {
    try {
        const apiUrl = `https://noobs-api.top/dipto/alldl?url=${encodeURIComponent(url)}`;
        console.log(`🔄 Fetching Twitter/X: ${apiUrl}`);
        
        const response = await axios.get(apiUrl, { timeout: 30000 });
        
        if (response.status === 200 && response.data) {
            const data = response.data;
            const result = {
                title: data.videoTitle || data.title || "Twitter/X Post",
                author: data.author || data.username || "Unknown",
                views: data.views || data.viewCount || 0,
                likes: data.likes || data.likeCount || 0,
                retweets: data.retweets || data.retweetCount || 0,
                thumbnail: data.imageUrl || data.thumbnail || data.cover || randomNjabulourl,
                videoUrl: data.result || data.video || data.video_url || null,
                images: data.imageUrl ? [data.imageUrl] : (data.images || []),
                isVideo: data.result ? true : false,
                raw: data
            };
            
            console.log(`✅ Twitter data parsed: Video=${result.isVideo}`);
            return result;
        }
        throw new Error('No data received from API');
    } catch (error) {
        console.error('❌ Twitter API error:', error.message);
        throw error;
    }
}

async function createTwitterCards(mediaInfo, zk, ms, lang) {
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

    const title = mediaInfo.title || "Twitter/X Post";
    const author = mediaInfo.author || "Unknown";
    const likes = mediaInfo.likes || 0;
    const retweets = mediaInfo.retweets || 0;
    const thumbnail = mediaInfo.thumbnail || randomNjabulourl;
    const isVideo = mediaInfo.isVideo || false;

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
            title: `📥 *TWITTER/X POST*`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `${t.title} ${title}\n` +
                  `${t.author} ${author}\n` +
                  `${t.likes} ${likes.toLocaleString()}\n` +
                  `🔄 *Retweets:* ${retweets.toLocaleString()}\n` +
                  `${isVideo ? '🎬 Video' : '🖼️ Image'}\n\n` +
                  `${t.selectFormat}\n\n` +
                  `${t.audioOption}\n` +
                  `${t.videoOption}\n` +
                  `${t.videoDocOption}\n` +
                  `${t.imageOption}\n\n` +
                  `${t.chooseOption}`,
        },
        footer: {
            text: `🔹 Twitter/X Downloader`,
        },
        nativeFlowMessage: {
            buttons: buttons,
        },
    };

    const card2 = {
        header: {
            title: `📥 *TWITTER/X POST*`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
        },
        body: {
            text: `📌 *Quick Download*\n\n` +
                  `🔹 ${t.audioOption} - MP3 Audio\n` +
                  `🔹 ${t.videoOption} - MP4 Video\n` +
                  `🔹 ${t.videoDocOption} - Video Document\n` +
                  `🔹 ${t.imageOption} - Image\n\n` +
                  `${t.chooseOption}`,
        },
        footer: {
            text: `🔹 Reply with 1, 2, 3, or 4`,
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

fana({
    nomCom: "twitter",
    alias: ["x", "twit", "twitterdl", "xdl"],
    categorie: "Download",
    reaction: "🐦"
}, async (dest, zk, commandeOptions) => {
    // (Same logic as YouTube but with Twitter-specific functions)
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

        switch(selectedNumber) {
            case 1:
                await downloadTwitterAudio(zk, dest, ms, data, lang);
                break;
            case 2:
                await downloadTwitterVideo(zk, dest, ms, data, lang, false);
                break;
            case 3:
                await downloadTwitterVideo(zk, dest, ms, data, lang, true);
                break;
            case 4:
                await downloadTwitterImage(zk, dest, ms, data, lang);
                break;
            default:
                await repondre(t.invalidChoice);
                return;
        }
        return;
    }

    if (!arg[0]) {
        return await repondre(`${t.pleaseInsert}\n\n${t.example} .twitter https://twitter.com/user/status/xxxxx`);
    }

    const queryURL = arg.join(" ");
    await zk.sendPresenceUpdate('composing', dest);
    await zk.sendMessage(dest, { text: t.fetchingInfo }, { quoted: ms });

    try {
        const result = await fetchTwitterInfo(queryURL);
        if (!result || (!result.videoUrl && (!result.images || result.images.length === 0))) {
            throw new Error(t.noMediaFound);
        }

        const senderJid = ms.key.remoteJid;
        activeDownloads[senderJid] = {
            mediaInfo: result,
            title: result.title || "Twitter/X Post",
            url: queryURL,
            thumbnail: result.thumbnail || randomNjabulourl,
            videoUrl: result.videoUrl,
            images: result.images || [],
            isVideo: result.isVideo || false,
            author: result.author,
            likes: result.likes,
            retweets: result.retweets,
            timestamp: Date.now()
        };

        const { cards } = await createTwitterCards(result, zk, ms, lang);
        await sendCarouselMessage(zk, dest, cards, ms);

        // Setup reply collector (same as YouTube)
        // ... (rest of the reply collector and timeout logic)

    } catch (error) {
        console.error("Error:", error);
        await repondre(`${t.apiFailed}\n\n${t.errorDownloading}\n\n${t.checkLink}`);
    }
});

// Download functions for Twitter
async function downloadTwitterVideo(zk, dest, ms, data, lang, isDocument) {
    // Similar to YouTube download function
    const t = await getTranslatedTexts();
    const videoUrl = data.videoUrl;
    
    if (!videoUrl) {
        await repondre(t.errorDownloading);
        return;
    }

    await zk.sendPresenceUpdate('recording', dest);
    const title = data.title || "Twitter/X Video";
    const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.mp4`;
    const thumbnail = data.thumbnail || randomNjabulourl;

    if (isDocument) {
        await zk.sendMessage(dest, {
            document: { url: videoUrl },
            mimetype: 'video/mp4',
            fileName: fileName,
            caption: `${t.twitterPost}\n\n${t.title} ${title}\n${t.author} ${data.author || 'Unknown'}\n\n${t.downloadComplete}`,
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
}

async function downloadTwitterAudio(zk, dest, ms, data, lang) {
    // Similar to YouTube audio download
    const t = await getTranslatedTexts();
    const audioUrl = data.audioUrl || data.videoUrl;
    
    if (!audioUrl) {
        await repondre(t.errorDownloading);
        return;
    }

    await zk.sendPresenceUpdate('recording', dest);
    await zk.sendMessage(dest, { text: t.processing }, { quoted: ms });

    // ... rest of audio extraction logic (same as YouTube)
}

async function downloadTwitterImage(zk, dest, ms, data, lang) {
    const t = await getTranslatedTexts();
    let imageUrl = data.images && data.images.length > 0 ? data.images[0] : data.thumbnail;
    
    if (!imageUrl) {
        await repondre(t.errorDownloading);
        return;
    }

    const title = data.title || "Twitter/X Image";
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
          }
