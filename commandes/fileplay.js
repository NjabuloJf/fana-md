const { fana } = require("../njabulo/fana");
const axios = require('axios');
const ytSearch = require('yt-search');
const conf = require(__dirname + '/../set');
const moment = require("moment-timezone");
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
async function getTranslatedButtons() {
    const lang = conf.LANGUAGE || "en";
    const viewOnYoutube = await translateText("view on YouTube channel", lang);
    const downloadAudio = await translateText("🎵 Download Audio", lang);
    const downloadVideo = await translateText("📹 Download Video", lang);
    return { viewOnYoutube, downloadAudio, downloadVideo };
}

fana({
    nomCom: "play",
    aliases: ["song", "playdoc", "audio", "mp3", "mp4", "video", "videodoc"],
    categorie: "download",
    reaction: "🎸"
}, async (dest, zk, commandOptions) => {
    const { arg, ms, userJid } = commandOptions;
    const lang = conf.LANGUAGE || "en";

    // ========== TRANSLATED TEXTS ==========
    const provideSong = await translateText("Please provide a song name or keyword.", lang);
    const noResults = await translateText("No results found for your query.", lang);
    const searchResults = await translateText("🔍 Search Results for:", lang);
    const foundResults = await translateText("📂 Found", lang);
    const resultsLabel = await translateText("results", lang);
    const failedDownload = await translateText("Failed to retrieve the download link. Please try again later.", lang);
    const errorOccurred = await translateText("An error occurred:", lang);
    const downloading = await translateText("⏳ Downloading", lang);
    const complete = await translateText("✅ Download complete!", lang);

    // Check if user wants video or audio
    const isVideo = arg && arg[0] && (arg[0].toLowerCase() === 'video' || arg[0].toLowerCase() === 'mp4' || arg[0].toLowerCase() === 'videodoc');
    const isAudio = arg && arg[0] && (arg[0].toLowerCase() === 'audio' || arg[0].toLowerCase() === 'mp3' || arg[0].toLowerCase() === 'song');

    let query = arg ? arg.join(' ') : '';

    // Remove command prefix if present
    if (isVideo || isAudio) {
        query = arg.slice(1).join(' ');
    }

    if (!query || query.trim() === '') {
        return zk.sendMessage(dest, {
            text: provideSong,
            contextInfo: {
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363399999197102@newsletter',
                    newsletterName: "╭••➤®Njabulo Jb",
                    serverMessageId: 143,
                },
            },
        }, { quoted: ms });
    }

    try {
        const search = await ytSearch(query);
        if (!search || !search.videos || !search.videos[0]) {
            return zk.sendMessage(dest, {
                text: noResults,
                contextInfo: {
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363399999197102@newsletter',
                        newsletterName: "╭••➤®Njabulo Jb",
                        serverMessageId: 143,
                    },
                },
            }, { quoted: ms });
        }

        // Get translated buttons
        const btn = await getTranslatedButtons();

        // Create cards for first 5 results
        const cards = await Promise.all(
            search.videos.slice(0, 5).map(async (video, i) => ({
                header: {
                    title: `*🎧 ${video.title}*`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: video.thumbnail } }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: {
                    text: `⏱️ ${video.duration || 'Unknown'}\n👤 ${video.author?.name || 'Unknown'}`,
                },
                footer: {
                    text: "",
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: btn.viewOnYoutube,
                                url: `https://youtu.be/${video.videoId}`,
                            }),
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
                            body: { text: `${searchResults} ${query}` },
                            footer: { text: `${foundResults} ${search.videos.length} ${resultsLabel}` },
                            carouselMessage: { cards },
                        },
                    },
                },
            },
            {
                quoted: {
                    key: {
                        fromMe: false,
                        participant: `0@s.whatsapp.net`,
                        remoteJid: "status@broadcast"
                    },
                    message: {
                        contactMessage: {
                            displayName: "ɳʝαႦυʅσ ʝႦ",
                            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=26777821911:+26777821911\nitem1.X-ABLabel:Bot\nEND:VCARD`
                        }
                    }
                }
            }
        );

        await zk.relayMessage(dest, message.message, { messageId: message.key.id });

        // Get the first video for download
        const firstVideo = search.videos[0];
        const videoId = firstVideo.videoId;
        const safeTitle = firstVideo.title.replace(/[\\/:*?"<>|]/g, '');

        // Determine download format
        const format = isVideo ? 'mp4' : 'mp3';
        const apiURL = `https://noobs-api.top/dipto/ytDl3?link=${encodeURIComponent(videoId)}&format=${format}`;

        const downloadingText = await translateText(`⏳ Downloading ${firstVideo.title}...`, lang);
        await zk.sendMessage(dest, { text: downloadingText }, { quoted: ms });

        try {
            const response = await axios.get(apiURL);
            if (response.status !== 200) {
                throw new Error('Failed to retrieve download link');
            }

            const data = response.data;
            if (!data.downloadLink) {
                throw new Error('No download link available');
            }

            const fileName = `${safeTitle}.${format}`;

            if (format === 'mp3') {
                // Send as audio
                await zk.sendMessage(dest, {
                    audio: { url: data.downloadLink },
                    mimetype: 'audio/mpeg',
                    fileName: fileName,
                    contextInfo: {
                        externalAdReply: {
                            title: `🎵 ${firstVideo.title}`,
                            mediaType: 1,
                            previewType: 0,
                            thumbnailUrl: firstVideo.thumbnail,
                            renderLargerThumbnail: true,
                        },
                    },
                }, {
                    quoted: {
                        key: {
                            fromMe: false,
                            participant: `0@s.whatsapp.net`,
                            remoteJid: "status@broadcast"
                        },
                        message: {
                            contactMessage: {
                                displayName: "njᥲbᥙᥣo",
                                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=26777821911:+26777821911\nitem1.X-ABLabel:Bot\nEND:VCARD`
                            }
                        }
                    }
                });
            } else {
                // Send as video
                await zk.sendMessage(dest, {
                    video: { url: data.downloadLink },
                    mimetype: 'video/mp4',
                    fileName: fileName,
                    caption: `📹 *${firstVideo.title}*\n\n⏱️ ${firstVideo.duration || 'Unknown'}\n👤 ${firstVideo.author?.name || 'Unknown'}`,
                    contextInfo: {
                        externalAdReply: {
                            title: `📹 ${firstVideo.title}`,
                            mediaType: 1,
                            previewType: 0,
                            thumbnailUrl: firstVideo.thumbnail,
                            renderLargerThumbnail: true,
                        },
                    },
                }, {
                    quoted: {
                        key: {
                            fromMe: false,
                            participant: `0@s.whatsapp.net`,
                            remoteJid: "status@broadcast"
                        },
                        message: {
                            contactMessage: {
                                displayName: "njᥲbᥙᥣo",
                                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=26777821911:+26777821911\nitem1.X-ABLabel:Bot\nEND:VCARD`
                            }
                        }
                    }
                });
            }

            const completeText = await translateText(`✅ Download complete!`, lang);
            await zk.sendMessage(dest, { text: completeText }, { quoted: ms });

        } catch (err) {
            console.error('[PLAY] API Error:', err);
            await zk.sendMessage(dest, {
                text: failedDownload,
            }, { quoted: ms });
        }

    } catch (err) {
        console.error('[PLAY] Error:', err);
        await zk.sendMessage(dest, {
            text: `${errorOccurred} ${err.message}`,
        }, { quoted: ms });
    }
});
