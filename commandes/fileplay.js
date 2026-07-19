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

// ========== STORE FOR ACTIVE DOWNLOADS ==========
const activeDownloads = {};

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
    const selectFormat = await translateText("📌 Select format:", lang);
    const audioOption = await translateText("1️⃣ Audio", lang);
    const audioDocOption = await translateText("2️⃣ Audio Document", lang);
    const videoOption = await translateText("3️⃣ Video", lang);
    const videoDocOption = await translateText("4️⃣ Video Document", lang);
    const chooseOption = await translateText("Reply with number 1, 2, 3, or 4 to choose format:", lang);
    const invalidChoice = await translateText("❌ Invalid choice! Please reply with 1, 2, 3, or 4.", lang);
    const timeoutMsg = await translateText("⏰ Timeout! Please try again.", lang);

    // ========== CHECK IF REPLY IS A NUMBER SELECTION ==========
    const isNumberSelection = (text) => {
        const num = parseInt(text);
        return num >= 1 && num <= 4 && !isNaN(num);
    };

    // ========== PARSE QUERY ==========
    let query = arg ? arg.join(' ') : '';

    // Check if user specified format in command
    let specifiedFormat = null;
    if (arg && arg[0]) {
        const firstArg = arg[0].toLowerCase();
        if (firstArg === 'audio' || firstArg === 'mp3' || firstArg === 'song') {
            specifiedFormat = 'audio';
            query = arg.slice(1).join(' ');
        } else if (firstArg === 'audiodoc' || firstArg === 'mp3doc') {
            specifiedFormat = 'audiodoc';
            query = arg.slice(1).join(' ');
        } else if (firstArg === 'video' || firstArg === 'mp4') {
            specifiedFormat = 'video';
            query = arg.slice(1).join(' ');
        } else if (firstArg === 'videodoc' || firstArg === 'mp4doc') {
            specifiedFormat = 'videodoc';
            query = arg.slice(1).join(' ');
        }
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

        // ========== IF FORMAT SPECIFIED, DOWNLOAD DIRECTLY ==========
        if (specifiedFormat) {
            await downloadMedia(zk, dest, ms, firstVideo, videoId, safeTitle, specifiedFormat, lang);
            return;
        }

        // ========== ASK USER TO SELECT FORMAT WITH IMAGE ==========
        const formatMessage = await translateText(
            `📌 *${selectFormat}*\n\n` +
            `${audioOption}\n` +
            `${audioDocOption}\n` +
            `${videoOption}\n` +
            `${videoDocOption}\n\n` +
            `${chooseOption}`,
            lang
        );

        // Send image with format selection
        await zk.sendMessage(dest, {
            image: { url: firstVideo.thumbnail },
            caption: formatMessage,
            contextInfo: {
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363399999197102@newsletter',
                    newsletterName: "╭••➤®Njabulo Jb",
                    serverMessageId: 143,
                },
            },
        }, { quoted: ms });

        // ========== STORE ACTIVE DOWNLOAD FOR THIS USER ==========
        const senderJid = ms.key.remoteJid;
        activeDownloads[senderJid] = {
            firstVideo,
            videoId,
            safeTitle,
            dest,
            ms,
            zk,
            lang,
            timestamp: Date.now()
        };

        // ========== SETUP REPLY COLLECTOR ==========
        // Remove old listener if exists
        if (zk._replyListener) {
            zk.ev.off('messages.upsert', zk._replyListener);
        }

        // Create new listener
        zk._replyListener = async (update) => {
            try {
                const msg = update.messages[0];
                if (!msg || !msg.message) return;
                
                const sender = msg.key.remoteJid;
                const content = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                
                // Check if this is a reply to our format selection
                const isReply = msg.message.extendedTextMessage?.contextInfo?.quotedMessage || 
                               msg.message.contextInfo?.quotedMessage;
                
                // Check if sender has active download
                if (!activeDownloads[sender]) return;
                
                // Check if it's a number selection (1-4)
                if (!isNumberSelection(content)) {
                    return;
                }
                
                const selectedNumber = parseInt(content);
                const downloadData = activeDownloads[sender];
                
                // Remove from active downloads
                delete activeDownloads[sender];
                
                // Remove listener
                zk.ev.off('messages.upsert', zk._replyListener);
                zk._replyListener = null;
                
                let formatType = '';
                switch(selectedNumber) {
                    case 1: formatType = 'audio'; break;
                    case 2: formatType = 'audiodoc'; break;
                    case 3: formatType = 'video'; break;
                    case 4: formatType = 'videodoc'; break;
                    default: 
                        await zk.sendMessage(dest, { text: invalidChoice }, { quoted: ms });
                        return;
                }
                
                // Download with selected format
                await downloadMedia(
                    downloadData.zk, 
                    downloadData.dest, 
                    downloadData.ms,
                    downloadData.firstVideo,
                    downloadData.videoId,
                    downloadData.safeTitle,
                    formatType,
                    downloadData.lang
                );
                
            } catch (err) {
                console.error('[REPLY HANDLER ERROR]', err);
            }
        };

        // Register listener
        zk.ev.on('messages.upsert', zk._replyListener);

        // ========== TIMEOUT ==========
        setTimeout(async () => {
            const senderJid = ms.key.remoteJid;
            if (activeDownloads[senderJid]) {
                delete activeDownloads[senderJid];
                await zk.sendMessage(dest, { 
                    text: timeoutMsg 
                }, { quoted: ms });
            }
            if (zk._replyListener) {
                zk.ev.off('messages.upsert', zk._replyListener);
                zk._replyListener = null;
            }
        }, 60000); // 60 seconds timeout

    } catch (err) {
        console.error('[PLAY] Error:', err);
        await zk.sendMessage(dest, {
            text: `${errorOccurred} ${err.message}`,
        }, { quoted: ms });
    }
});

// ========== DOWNLOAD MEDIA FUNCTION ==========
async function downloadMedia(zk, dest, ms, firstVideo, videoId, safeTitle, formatType, lang) {
    try {
        // ========== TRANSLATED TEXTS ==========
        const failedDownload = await translateText("Failed to retrieve the download link. Please try again later.", lang);
        const complete = await translateText("✅ Download complete!", lang);
        
        // Determine download format
        let downloadFormat = 'mp3';
        let isDocument = false;
        
        if (formatType === 'audio' || formatType === 'mp3' || formatType === 'song') {
            downloadFormat = 'mp3';
            isDocument = false;
        } else if (formatType === 'audiodoc' || formatType === 'mp3doc') {
            downloadFormat = 'mp3';
            isDocument = true;
        } else if (formatType === 'video' || formatType === 'mp4') {
            downloadFormat = 'mp4';
            isDocument = false;
        } else if (formatType === 'videodoc' || formatType === 'mp4doc') {
            downloadFormat = 'mp4';
            isDocument = true;
        }

        const downloadingText = await translateText(`⏳ Downloading ${firstVideo.title}...`, lang);
        await zk.sendMessage(dest, { text: downloadingText }, { quoted: ms });

        // ========== GET DOWNLOAD LINK ==========
        const apiURL = `https://noobs-api.top/dipto/ytDl3?link=${encodeURIComponent(videoId)}&format=${downloadFormat}`;
        const response = await axios.get(apiURL);
        
        if (response.status !== 200) {
            throw new Error('Failed to retrieve download link');
        }

        const data = response.data;
        if (!data.downloadLink) {
            throw new Error('No download link available');
        }

        const fileName = `${safeTitle}.${downloadFormat}`;

        // ========== SEND BASED ON FORMAT ==========
        if (downloadFormat === 'mp3') {
            if (isDocument) {
                // Send as audio document
                await zk.sendMessage(dest, {
                    document: { url: data.downloadLink },
                    mimetype: 'audio/mpeg',
                    fileName: fileName,
                    caption: `🎵 *${firstVideo.title}*\n\n⏱️ ${firstVideo.duration || 'Unknown'}\n👤 ${firstVideo.author?.name || 'Unknown'}`,
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
                // Send as audio (voice note)
                await zk.sendMessage(dest, {
                    audio: { url: data.downloadLink },
                    mimetype: 'audio/mpeg',
                    fileName: fileName,
                    ptt: false,
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
            }
        } else if (downloadFormat === 'mp4') {
            if (isDocument) {
                // Send as video document
                await zk.sendMessage(dest, {
                    document: { url: data.downloadLink },
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
        }

        const completeText = await translateText(`✅ Download complete!`, lang);
        await zk.sendMessage(dest, { text: completeText }, { quoted: ms });

    } catch (err) {
        console.error('[DOWNLOAD] Error:', err);
        await zk.sendMessage(dest, {
            text: await translateText("Failed to download media. Please try again.", lang),
        }, { quoted: ms });
    }
        }
