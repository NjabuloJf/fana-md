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

// ========== AI APIS ==========
const AI_APIS = [
    async (q) => {
        const url = `https://mistral.stacktoy.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 30000 });
        return data?.data?.response || null;
    },
    async (q) => {
        const url = `https://llama.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 30000 });
        return data?.data?.response || data?.response || null;
    },
    async (q) => {
        const url = `https://mistral.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 30000 });
        return data?.data?.response || data?.response || null;
    }
];

// ========== AI FETCHER WITH FALLBACK ==========
const askAI = async (query) => {
    for (const api of AI_APIS) {
        try {
            console.log(`🔄 Trying AI API...`);
            const response = await api(query);
            if (response && typeof response === 'string' && response.trim().length > 0) {
                console.log(`✅ AI API Success! Response length: ${response.length} chars`);
                return response.trim();
            }
        } catch (error) {
            console.log(`❌ AI API failed: ${error.message}`);
            continue;
        }
    }
    return "⚠️ AI service is currently unavailable. Please try again later.";
};

// ========== ANIMATED TYPING INDICATOR ==========
async function sendTypingAnimation(zk, chatId, ms) {
    const frames = ['◐', '◓', '◑', '◒'];
    let i = 0;
    const typingMsg = await zk.sendMessage(chatId, { text: `🧠 *ɴᴊᴀʙᴜʟᴏ ᴀɪ ᴛʜɪɴᴋɪɴɢ* ${frames[0]}` }, { quoted: ms });
    
    const interval = setInterval(async () => {
        i = (i + 1) % frames.length;
        try {
            await zk.sendMessage(chatId, { text: `🧠 *ɴᴊᴀʙᴜʟᴏ ᴀɪ ᴛʜɪɴᴋɪɴɢ* ${frames[i]}`, edit: typingMsg.key });
        } catch (e) {}
    }, 500);
    
    return { typingMsg, interval };
}

// ========== GOOGLE IMAGE SEARCH API ==========
const GCSE_KEY = 'AIzaSyDMbI3nvmQUrfjoCJYLS69Lej1hSXQjnWI';
const GCSE_CX = 'baf9bdb0c631236e5';

async function searchImages(query) {
    try {
        const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                q: query,
                key: GCSE_KEY,
                cx: GCSE_CX,
                searchType: 'image',
                num: 8,
                safe: 'off'
            },
            timeout: 15000
        });
        
        if (!data.items || data.items.length === 0) {
            return [];
        }
        
        return data.items.map(item => ({
            url: item.link,
            title: item.title,
            snippet: item.snippet
        }));
    } catch (error) {
        console.error("Google Images API error:", error.response?.data || error.message);
        return [];
    }
}

// ========== GET CURRENT DATE ==========
function getCurrentDate() {
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const year = now.getFullYear();
    const time = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    return { date, year, time };
}

// ========== SPLIT TEXT INTO CHUNKS ==========
function splitTextIntoChunks(text, maxLength = 3800) {
    const chunks = [];
    for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.slice(i, i + maxLength));
    }
    return chunks;
}

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

// ========== MAIN COMMAND ==========
fana({
    nomCom: "play",
    aliases: ["mp3", "mp4", "video", "audio", "song"],
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
    const audioOption = await translateText("-᳆ *1* Audio mp3", lang);
    const audioDocOption = await translateText("-᳆ *2*  Audio Document mp3", lang);
    const videoOption = await translateText("-᳆ *3* Video mp4", lang);
    const videoDocOption = await translateText("-᳆ *4* Video Document mp4", lang);
    const imageOption = await translateText("-᳆ *5*  Images (8 photos)", lang);
    const lyricsOption = await translateText("-᳆ *6*  Lyrics text", lang);
    const ytsOption = await translateText("-᳆ *7*  YouTube Search", lang);
    const chatAIOption = await translateText("-᳆ *8* Chat AI music", lang);
    const chooseOption = await translateText("Reply with number 1 to 8 to choose:", lang);
    const invalidChoice = await translateText("❌ Invalid choice! Please reply with 1, 2, 3, 4, 5, 6, 7, or 8.", lang);
    const timeoutMsg = await translateText("⏰ Timeout! Please try again.", lang);
    const noImages = await translateText("❌ No images found for this query.", lang);
    const sendingImages = await translateText("📸 Searching and sending images...", lang);
    const failedLoad = await translateText("❌ Failed to load images. Please try again.", lang);
    const noLyrics = await translateText("❌ No lyrics found for this song.", lang);
    const fetchingLyrics = await translateText("📝 Fetching lyrics...", lang);
    const searchingYt = await translateText("🔍 Searching YouTube...", lang);
    const noYtResults = await translateText("❌ No YouTube results found.", lang);
    const thinking = await translateText("🤔 Thinking...", lang);
    const aiResponse = await translateText("🤖 AI Response:", lang);

    // ========== CHECK IF REPLY IS A NUMBER SELECTION ==========
    const isNumberSelection = (text) => {
        const num = parseInt(text);
        return num >= 1 && num <= 8 && !isNaN(num);
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
        } else if (firstArg === 'image' || firstArg === 'images' || firstArg === 'img' || firstArg === 'photos') {
            specifiedFormat = 'images';
            query = arg.slice(1).join(' ');
        } else if (firstArg === 'lyrics' || firstArg === 'lyric' || firstArg === 'lirik') {
            specifiedFormat = 'lyrics';
            query = arg.slice(1).join(' ');
        } else if (firstArg === 'yts' || firstArg === 'ytsearch' || firstArg === 'search' || firstArg === 'youtube') {
            specifiedFormat = 'yts';
            query = arg.slice(1).join(' ');
        } else if (firstArg === 'ai' || firstArg === 'chat' || firstArg === 'gpt' || firstArg === 'ask') {
            specifiedFormat = 'ai';
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
            if (specifiedFormat === 'images') {
                await sendImages(zk, dest, ms, query, lang);
                return;
            } else if (specifiedFormat === 'lyrics') {
                await sendLyrics(zk, dest, ms, query, lang);
                return;
            } else if (specifiedFormat === 'yts') {
                await sendYoutubeSearch(zk, dest, ms, query, lang);
                return;
            } else if (specifiedFormat === 'ai') {
                await sendAIResponse(zk, dest, ms, query, lang);
                return;
            }
            await downloadMedia(zk, dest, ms, firstVideo, videoId, safeTitle, specifiedFormat, lang);
            return;
        }

        // ========== ASK USER TO SELECT FORMAT WITH IMAGE ==========
        const formatMessage = await translateText(
            `📌 *${selectFormat}*\n\n` +
            `${audioOption}\n` +
            `${audioDocOption}\n` +
            `${videoOption}\n` +
            `${videoDocOption}\n` +
            `${imageOption}\n` +
            `${lyricsOption}\n` +
            `${ytsOption}\n` +
            `${chatAIOption}\n\n` +
            `${chooseOption}`,
            lang
        );

        const buttons = [
            {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                    display_text: await translateText("🌐 bot Channel", lang),
                    id: "backup channel",
                    url: conf.GURL
                }),
            },
        ];

        // Send image with format selection - FIXED
        let sentMessage;
        try {
            sentMessage = await zk.sendMessage(dest, {
                interactiveMessage: {
                    image: { url: firstVideo.thumbnail },
                    header: formatMessage,
                    buttons: buttons,
                    headerType: 1
                }
            }, { quoted: ms });
        } catch (err) {
            console.error('[PLAY] Failed to send format selection:', err);
            // Fallback: send as text message
            sentMessage = await zk.sendMessage(dest, {
                text: formatMessage,
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

        // ========== STORE ACTIVE DOWNLOAD FOR THIS USER ==========
        const senderJid = ms.key.remoteJid;
        const msgId = ms.key.id;

        // Generate unique session ID
        const sessionId = `${senderJid}_${Date.now()}`;

        // Check if sentMessage exists before accessing properties
        const sentMessageId = sentMessage && sentMessage.key ? sentMessage.key.id : null;

        activeDownloads[senderJid] = {
            firstVideo,
            videoId,
            safeTitle,
            dest,
            ms,
            zk,
            lang,
            query,
            sentMessageId: sentMessageId,
            msgId: msgId,
            sessionId: sessionId,
            timestamp: Date.now(),
            active: true
        };

        console.log(`[PLAY] Active download stored for ${senderJid} | Session: ${sessionId} | MessageId: ${sentMessageId}`);

        // ========== SETUP GLOBAL REPLY HANDLER ==========
        // Remove old listener if exists (only once)
        if (!zk._replyListenerRegistered) {
            // Create global listener that handles all replies
            zk._replyListenerRegistered = true;
            
            zk.ev.on('messages.upsert', async (update) => {
                try {
                    const msg = update.messages[0];
                    if (!msg || !msg.message) return;
                    
                    const sender = msg.key.remoteJid;
                    
                    // Check if sender has active download
                    if (!activeDownloads[sender]) {
                        return;
                    }
                    
                    // Check if this is a reply
                    const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage || 
                                     msg.message.contextInfo?.quotedMessage;
                    
                    if (!quotedMsg) {
                        return;
                    }
                    
                    // Get the content
                    const content = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                    
                    // Check if it's a number selection (1-8)
                    if (!isNumberSelection(content)) {
                        return;
                    }
                    
                    const selectedNumber = parseInt(content);
                    const data = activeDownloads[sender];
                    
                    // Check if session is still active
                    if (!data || !data.active) {
                        return;
                    }
                    
                    console.log(`[PLAY] User ${sender} selected: ${selectedNumber} | Session: ${data.sessionId}`);
                    
                    // Mark as inactive to prevent double processing
                    data.active = false;
                    
                    // Remove from active downloads after processing
                    setTimeout(() => {
                        delete activeDownloads[sender];
                    }, 1000);
                    
                    // Add reaction to the reply
                    try {
                        await zk.sendMessage(dest, {
                            react: { text: "📥", key: msg.key }
                        });
                    } catch (e) {
                        console.log('[PLAY] Reaction error:', e);
                    }
                    
                    let formatType = '';
                    switch(selectedNumber) {
                        case 1: formatType = 'audio'; break;
                        case 2: formatType = 'audiodoc'; break;
                        case 3: formatType = 'video'; break;
                        case 4: formatType = 'videodoc'; break;
                        case 5: 
                            await sendImages(
                                data.zk,
                                data.dest,
                                data.ms,
                                data.query,
                                data.lang
                            );
                            return;
                        case 6:
                            await sendLyrics(
                                data.zk,
                                data.dest,
                                data.ms,
                                data.query,
                                data.lang
                            );
                            return;
                        case 7:
                            await sendYoutubeSearch(
                                data.zk,
                                data.dest,
                                data.ms,
                                data.query,
                                data.lang
                            );
                            return;
                        case 8:
                            await sendAIResponse(
                                data.zk,
                                data.dest,
                                data.ms,
                                data.query,
                                data.lang
                            );
                            return;
                        default: 
                            await zk.sendMessage(dest, { text: invalidChoice }, { quoted: ms });
                            return;
                    }
                    
                    // Download with selected format
                    await downloadMedia(
                        data.zk, 
                        data.dest, 
                        data.ms,
                        data.firstVideo,
                        data.videoId,
                        data.safeTitle,
                        formatType,
                        data.lang
                    );
                    
                } catch (err) {
                    console.error('[GLOBAL REPLY HANDLER ERROR]', err);
                }
            });
        }

        // ========== TIMEOUT ==========
        setTimeout(async () => {
            const senderJid = ms.key.remoteJid;
            if (activeDownloads[senderJid] && activeDownloads[senderJid].active) {
                console.log(`[PLAY] Timeout for ${senderJid}`);
                activeDownloads[senderJid].active = false;
                delete activeDownloads[senderJid];
                try {
                    await zk.sendMessage(dest, { 
                        text: timeoutMsg 
                    }, { quoted: ms });
                } catch (e) {}
            }
        }, 60000); // 60 seconds timeout

    } catch (err) {
        console.error('[PLAY] Error:', err);
        await zk.sendMessage(dest, {
            text: `${errorOccurred} ${err.message}`,
        }, { quoted: ms });
    }
});

// ========== SEND IMAGES WITH CAROUSEL ==========
async function sendImages(zk, dest, ms, query, lang) {
    try {
        const sendingImages = await translateText("📸 Searching and sending images...", lang);
        const noImages = await translateText("❌ No images found for this query.", lang);
        const failedLoad = await translateText("❌ Failed to load images. Please try again.", lang);
        const complete = await translateText("✅ Images sent successfully!", lang);
        
        await zk.sendMessage(dest, { text: sendingImages }, { quoted: ms });

        const images = await searchImages(query);
        
        if (!images || images.length === 0) {
            await zk.sendMessage(dest, { text: noImages }, { quoted: ms });
            return;
        }

        // Get the first 8 images
        const imageLimit = Math.min(images.length, 8);
        const validImages = [];

        // Download images and convert to buffers
        for (let i = 0; i < imageLimit; i++) {
            try {
                const img = images[i];
                const response = await axios.get(img.url, { 
                    responseType: 'arraybuffer',
                    timeout: 10000
                });
                
                if (response.data) {
                    validImages.push({
                        buffer: response.data,
                        directLink: img.url,
                        title: img.title || `Image ${i + 1}`,
                        snippet: img.snippet || ''
                    });
                }
            } catch (err) {
                console.log(`[IMAGES] Failed to download image ${i + 1}:`, err.message);
                continue;
            }
        }

        if (validImages.length === 0) {
            await zk.sendMessage(dest, { text: failedLoad }, { quoted: ms });
            return;
        }

        // Create carousel cards
        const cards = await Promise.all(
            validImages.map(async (item, i) => ({
                header: {
                    title: `📸 Image ${i + 1}`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: item.buffer }, { upload: zk.waUploadToServer })).imageMessage,
                },
                body: { 
                    text: `*🔍 Search: ${query}*\n\n🖼️ ${item.title || 'No title'}\n📝 ${item.snippet || ''}` 
                },
                footer: { 
                    text: `✨ Image ${i + 1}/${validImages.length}` 
                },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({ 
                                display_text: await translateText("🌐 View Original", lang), 
                                url: item.directLink 
                            }),
                        },
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: await translateText("📋 Copy Link", lang),
                                copy_code: item.directLink,
                            }),
                        },
                    ],
                },
            }))
        );

        const headerText = await translateText(`🔍 Search Results for: ${query}`, lang);
        const footerText = await translateText(`📂 Found ${validImages.length} images`, lang);

        const message = generateWAMessageFromContent(
            dest,
            {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            header: { text: `📸 Image Search` },
                            body: { text: headerText },
                            footer: { text: footerText },
                            carouselMessage: { cards },
                        },
                    },
                },
            },
            { quoted: ms }
        );

        await zk.relayMessage(dest, message.message, { messageId: message.key.id });

        await zk.sendMessage(dest, { text: complete }, { quoted: ms });

    } catch (err) {
        console.error('[IMAGES] Error:', err);
        await zk.sendMessage(dest, {
            text: await translateText("Failed to fetch images. Please try again.", lang),
        }, { quoted: ms });
    }
}

// ========== SEND LYRICS FUNCTION ==========
async function sendLyrics(zk, dest, ms, query, lang) {
    try {
        const fetchingLyrics = await translateText("📝 Fetching lyrics...", lang);
        await zk.sendMessage(dest, { text: fetchingLyrics }, { quoted: ms });

        const apiUrl = `https://discardapi.dpdns.org/api/music/lyrics?apikey=qasim&song=${encodeURIComponent(query)}`;
        const response = await axios.get(apiUrl, { timeout: 15000 });
        const data = response.data;
        
        if (!data.result || data.result.error || !data.result.message?.lyrics) {
            const noLyrics = await translateText("❌ No lyrics found for this song.", lang);
            await zk.sendMessage(dest, { text: noLyrics }, { quoted: ms });
            return;
        }

        const messageData = data.result.message;
        const { artist, lyrics, image, title, url } = messageData;
        
        let imageBuffer = null;
        try {
            const imgUrl = image || "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png";
            const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 10000 });
            imageBuffer = imgRes.data;
        } catch (err) {}
        
        const imageMessage = imageBuffer ? (await generateWAMessageContent({ image: imageBuffer }, { upload: zk.waUploadToServer })).imageMessage : null;
        
        const currentDate = getCurrentDate();
        
        // Create temp song data
        const tempSong = {
            title: title || query,
            artist: artist || 'Unknown Artist',
            date: currentDate.date,
            year: currentDate.year,
            time: currentDate.time
        };

        // ========== BUTTONS FOR LYRICS ==========
        const buttons = [
            {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                    display_text: await translateText("🌐 Channel", lang),
                    id: "backup channel",
                    url: conf.GURL
                }),
            },
            {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                    display_text: await translateText("📋 Copy Lyrics", lang),
                    copy_code: lyrics,
                }),
            },
        ];
        
        const cards = [
            {
                header: {
                    title: `🎵 SONG INFO`,
                    hasMediaAttachment: true,
                    imageMessage: imageMessage,
                },
                body: {
                    text: `🎤 *Title:* ${tempSong.title}
👨‍🎤 *Artist:* ${tempSong.artist}
📅 *Date:* ${tempSong.date}`,
                },
                footer: { text: "" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: await translateText("📋 Copy Info", lang),
                                copy_code: `Title: ${tempSong.title}\nArtist: ${tempSong.artist}\nDate: ${tempSong.date}\nYear: ${tempSong.year}`,
                            }),
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: await translateText("🔗 Genius", lang),
                                url: url || 'https://genius.com',
                            }),
                        },
                    ],
                },
            },
            {
                header: {
                    title: `📝 LYRICS (Part 1)`,
                    hasMediaAttachment: true,
                    imageMessage: imageMessage,
                },
                body: {
                    text: `📆 *Year:* ${tempSong.year}
🕐 *Time:* ${tempSong.time}
📏 *Length:* ${lyrics.length} chars`,
                },
                footer: { text: "" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: await translateText("📋 Copy Lyrics", lang),
                                copy_code: lyrics,
                            }),
                        },
                    ],
                },
            },
        ];

        // Add more cards if lyrics are very long
        if (lyrics.length > 2000) {
            cards.push({
                header: {
                    title: `📝 LYRICS (Part 2)`,
                    hasMediaAttachment: true,
                    imageMessage: imageMessage,
                },
                body: {
                    text: `📆 *Year:* ${tempSong.year}
🕐 *Time:* ${tempSong.time}
📏 *Length:* ${lyrics.length} chars`,
                },
                footer: { text: "" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: await translateText("📋 Copy Remaining", lang),
                                copy_code: lyrics.substring(2000),
                            }),
                        },
                    ],
                },
            });
        }
        
        if (lyrics.length > 4000) {
            cards.push({
                header: {
                    title: `📝 LYRICS (Part 3)`,
                    hasMediaAttachment: true,
                    imageMessage: imageMessage,
                },
                body: {
                    text: lyrics.substring(4000, 6000) + (lyrics.length > 6000 ? "\n\n... (Continued)" : ""),
                },
                footer: { text: "" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: await translateText("📋 Copy Remaining", lang),
                                copy_code: lyrics.substring(4000),
                            }),
                        },
                    ],
                },
            });
        }

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
                            header: { text: `🎵 NJABULO MD` },
                            body: { text: `*📂 Song: ${tempSong.title}*` },
                            headerType: 1,
                            carouselMessage: { cards },
                        },
                    },
                },
            },
            { quoted: ms }
        );
        
        await zk.relayMessage(dest, message.message, { messageId: message.key.id });
        
        // Also send full lyrics as separate text messages if needed
        const lyricsChunks = splitTextIntoChunks(lyrics, 3800);
        
        if (lyricsChunks.length > 1) {
            await zk.sendMessage(dest, { 
                text: `📝 *FULL LYRICS (${lyricsChunks.length} parts)*\n\n━━━━━━━━━━━━━━━━━━━` 
            }, { quoted: ms });
            
            for (let i = 0; i < lyricsChunks.length; i++) {
                await zk.sendMessage(dest, { 
                    text: `*Part ${i + 1}/${lyricsChunks.length}*\n\n${lyricsChunks[i]}` 
                }, { quoted: ms });
            }
        } else {
            // Send full lyrics with buttons
            await zk.sendMessage(dest, {
                interactiveMessage: {
                    header: `📀 *Title:* ${tempSong.title}\n📝 *Full Lyrics:*\n\n${lyrics}`,
                    buttons: buttons,
                    headerType: 1
                }
            }, { quoted: ms });
        }

    } catch (err) {
        console.error('[LYRICS] Error:', err);
        await zk.sendMessage(dest, {
            text: await translateText("Failed to fetch lyrics. Please try again.", lang),
        }, { quoted: ms });
    }
}

// ========== SEND YOUTUBE SEARCH FUNCTION ==========
async function sendYoutubeSearch(zk, dest, ms, query, lang) {
    try {
        const searchingYt = await translateText("🔍 Searching YouTube...", lang);
        await zk.sendMessage(dest, { text: searchingYt }, { quoted: ms });

        const results = await ytSearch(query);
        
        if (!results || !results.videos || results.videos.length === 0) {
            const noYtResults = await translateText("❌ No YouTube results found.", lang);
            
            // ========== BUTTONS FOR NO RESULTS ==========
            const noResultsButtons = [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: await translateText("🌐 Channel", lang),
                        id: "backup channel",
                        url: conf.GURL
                    }),
                },
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: await translateText("📋 Copy Query", lang),
                        copy_code: query,
                    }),
                },
            ];

            // Send image with no results message
            const randomImage = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png";
            
            await zk.sendMessage(dest, {
                interactiveMessage: {
                    image: { url: randomImage },
                    header: `🔍 *Search Results for:*\n"${query}"`,
                    body: { text: noYtResults },
                    buttons: noResultsButtons,
                    headerType: 1,
                }
            }, { quoted: ms });
            return;
        }

        const viewOnYoutube = await translateText("🌐 View on YouTube", lang);
        const youtubeSearchResult = await translateText("YouTube Search Result", lang);
        const titleText = await translateText("Title", lang);
        const urlText = await translateText("URL", lang);
        const viewsText = await translateText("Views", lang);
        const uploadedText = await translateText("Uploaded", lang);
        const durationText = await translateText("Duration", lang);
        const njabuloFooter = await translateText("Njabulo JB YouTube Download", lang);

        // Create cards for first 5 results
        const cards = await Promise.all(
            results.videos.slice(0, 5).map(async (video, i) => {
                let resultText = `*${youtubeSearchResult} ${i+1}*\n\n`;
                resultText += `*🎧${titleText}:* ${video.title}\n`;
                resultText += `🖇️*${urlText}:* ${video.url}\n`;
                resultText += `*👁️${viewsText}:* ${video.views.toLocaleString()}\n`;
                resultText += `*📅${uploadedText}:* ${video.ago}\n`;
                resultText += `*⏲️${durationText}:* ${video.timestamp}`;
                
                return {
                    header: {
                        title: `📸 ${video.title}`,
                        hasMediaAttachment: true,
                        imageMessage: (await generateWAMessageContent({ image: { url: video.thumbnail } }, { upload: zk.waUploadToServer })).imageMessage,
                    },
                    body: {
                        text: resultText,
                    },
                    footer: {
                        text: `*${njabuloFooter}*`,
                    },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    display_text: viewOnYoutube,
                                    url: `https://youtu.be/${video.videoId}`,
                                }),
                            },
                            {
                                name: "cta_copy",
                                buttonParamsJson: JSON.stringify({
                                    display_text: await translateText("📋 Copy URL", lang),
                                    copy_code: video.url,
                                }),
                            },
                        ],
                    },
                };
            })
        );

        const headerText = await translateText(`🔍 Search Results for: "${query}"`, lang);
        const footerText = await translateText(`📂 Found ${results.videos.length} results`, lang);

        const message = generateWAMessageFromContent(
            dest,
            {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            header: { text: headerText },
                            footer: { text: footerText },
                            carouselMessage: { cards },
                        },
                    },
                },
            },
            { quoted: ms }
        );

        await zk.relayMessage(dest, message.message, { messageId: message.key.id });

    } catch (err) {
        console.error('[YTSEARCH] Error:', err);
        
        // ========== ERROR BUTTONS ==========
        const errorButtons = [
            {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                    display_text: await translateText("🌐 Channel", lang),
                    id: "backup channel",
                    url: conf.GURL
                }),
            },
            {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                    display_text: await translateText("📋 Copy Query", lang),
                    copy_code: query,
                }),
            },
        ];
        
        const randomImage = "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png";
        
        await zk.sendMessage(dest, {
            interactiveMessage: {
                image: { url: randomImage },
                header: `❌ *Error Searching YouTube*`,
                body: { text: await translateText("Failed to search YouTube. Please try again.", lang) },
                buttons: errorButtons,
                headerType: 1,
                contextInfo: {
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363399999197102@newsletter',
                        newsletterName: "╭••➤®Njabulo Jb",
                        serverMessageId: 143,
                    },
                },
            }
        }, { quoted: ms });
    }
}

// ========== SEND AI RESPONSE FUNCTION ==========
async function sendAIResponse(zk, dest, ms, query, lang) {
    try {
        // Check if query is empty
        if (!query || query.trim() === '') {
            const helpText = await translateText(
                `📌 *ɴᴊᴀʙᴜʟᴏ ᴀɪ ᴛʜɪɴᴋɪɴɢ*

🤖 *How to use:*
• Ask me anything!
• Get intelligent responses
• Chat and learn

📝 *Example:* 
.play ai What is artificial intelligence?

💫 *ɴᴊᴀʙᴜʟᴏ ᴀɪ ᴀssɪsᴛᴀɴᴛ ᴜɪ*`, lang
            );
            
            const helpButtons = [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: await translateText("🌐 Channel", lang),
                        id: "backup channel",
                        url: conf.GURL
                    }),
                },
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: await translateText("📋 Copy Help", lang),
                        copy_code: helpText,
                    }),
                },
            ];
            
            await zk.sendMessage(dest, {
                interactiveMessage: {
                    header: `🤖 *AI Assistant*`,
                    body: { text: helpText },
                    buttons: helpButtons,
                    headerType: 1,
                    contextInfo: {
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363399999197102@newsletter',
                            newsletterName: "╭••➤®Njabulo Jb",
                            serverMessageId: 143,
                        },
                    },
                }
            }, { quoted: ms });
            return;
        }

        // Send animated typing indicator
        const { typingMsg, interval } = await sendTypingAnimation(zk, dest, ms);

        try {
            const response = await askAI(query);
            
            // Clear typing animation
            clearInterval(interval);
            if (typingMsg && typingMsg.key) {
                await zk.sendMessage(dest, { delete: typingMsg.key }).catch(() => {});
            }
            
            if (!response || response.includes("unavailable")) {
                const errorButtons = [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: await translateText("🌐 WA Channel", lang),
                            id: "backup channel",
                            url: conf.GURL
                        }),
                    },
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: await translateText("📋 Copy Query", lang),
                            copy_code: query,
                        }),
                    },
                ];
                
                await zk.sendMessage(dest, {
                    interactiveMessage: {
                        header: `❌ *AI Service Unavailable*`,
                        body: { text: await translateText("Please try again later.", lang) },
                        buttons: errorButtons,
                        headerType: 1,
                    }
                }, { quoted: ms });
                return;
            }

            // Split long response for better display
            const maxPreviewLength = 500;
            const responsePreview = response.length > maxPreviewLength ? response.substring(0, maxPreviewLength) + '...' : response;
            
            // Create intro text
            const introText = `*AI Answer Preview:*\n${responsePreview}\n> ɴᴊᴀʙᴜʟᴏ ᴀɪ ᴀssɪsᴛᴀɴᴛ ᴜɪ`;

            // Create response ID
            const responseId = Math.random().toString(36).substring(2);
            
            // Create encoded data with AI response
            const encodedData = Buffer.from(JSON.stringify({
                "response_id": responseId,
                "sections": [
                    {
                        "view_model": {
                            "primitive": {
                                "text": introText,
                                "__typename": "GenAIMarkdownTextUXPrimitive"
                            },
                            "__typename": "GenAISingleLayoutViewModel"
                        }
                    },
                    {
                        "view_model": {
                            "primitive": {
                                "language": "text",
                                "code_blocks": [
                                    { 
                                        "content": `📝 ɴᴊᴀʙᴜʟᴏ ᴀɪ ǫᴜᴇsᴛɪᴏɴ:\n${query}\n\n💬 ᴀɴsᴡᴇʀ\n${response}`, 
                                        "type": "DEFAULT" 
                                    }
                                ],
                                "__typename": "GenAICodeUXPrimitive"
                            },
                            "__typename": "GenAISingleLayoutViewModel"
                        }
                    }
                ]
            })).toString('base64');

            // Create the message content
            const content = {
                messageContextInfo: {
                    threadId: [],
                    deviceListMetadata: {
                        senderKeyIndexes: [],
                        recipientKeyIndexes: []
                    },
                    deviceListMetadataVersion: 2,
                    botMetadata: {
                        pluginMetadata: {},
                        richResponseSourcesMetadata: {
                            sources: []
                        }
                    }
                },
                botForwardedMessage: {
                    message: {
                        richResponseMessage: {
                            submessages: [
                                {
                                    messageType: 2,
                                    messageText: introText
                                },
                                {
                                    messageType: 3,
                                    codeMetadata: {
                                        codeLanguage: "text",
                                        codeBlocks: [
                                            {
                                                highlightType: 0,
                                                codeContent: `📝 ɴᴊᴀʙᴜʟᴏ ᴀɪ ᴀssɪsᴛᴀɴᴛ ᴜɪ ǫᴜᴇsᴛɪᴏɴ:\n${query}\n\n💬 ᴀɴsᴡᴇʀ:\n${response}`
                                            }
                                        ]
                                    }
                                }
                            ],
                            messageType: 1,
                            unifiedResponse: {
                                data: encodedData
                            },
                            contextInfo: {
                                mentionedJid: [],
                                groupMentions: [],
                                statusAttributions: [],
                                forwardingScore: 743,
                                isForwarded: true,
                                forwardedAiBotMessageInfo: {
                                    botJid: "867051314767696@bot"
                                },
                                forwardOrigin: 4
                            }
                        }
                    }
                }
            };

            // Send the AI response
            try {
                await zk.relayMessage(dest, content, {});
                console.log(`✅ AI response sent with encodedData - Response ID: ${responseId}`);
                
                // Add buttons for the AI response
                const aiButtons = [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: await translateText("🌐 WA Channel", lang),
                            id: "backup channel",
                            url: conf.GURL
                        }),
                    },
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: await translateText("📋 Copy Response", lang),
                            copy_code: response,
                        }),
                    },
                ];
                
                // Send buttons separately
                await zk.sendMessage(dest, {
                    interactiveMessage: {
                        header: `💬 *Actions*`,
                        body: { text: await translateText("Choose an action:", lang) },
                        buttons: aiButtons,
                        headerType: 1,
                    }
                }, { quoted: ms });
                
            } catch (relayError) {
                console.error("Relay error, falling back to simple text:", relayError.message);
                // Fallback to simple text if relay fails
                const fallbackButtons = [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: await translateText("🌐 WA Channel", lang),
                            id: "backup channel",
                            url: conf.GURL
                        }),
                    },
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: await translateText("📋 Copy Response", lang),
                            copy_code: response,
                        }),
                    },
                ];
                
                await zk.sendMessage(dest, {
                    interactiveMessage: {
                        header: `🤖 *AI Response*\n\n${introText}`,
                        body: { text: `📝 *Full Answer:*\n\n${response}` },
                        buttons: fallbackButtons,
                        headerType: 1,
                    }
                }, { quoted: ms });
            }

        } catch (err) {
            console.error('[AI] Error:', err);
            clearInterval(interval);
            if (typingMsg && typingMsg.key) {
                await zk.sendMessage(dest, { delete: typingMsg.key }).catch(() => {});
            }
            
            const errorButtons = [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: await translateText("🌐 WA Channel", lang),
                        id: "backup channel",
                        url: conf.GURL
                    }),
                },
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: await translateText("📋 Copy Query", lang),
                        copy_code: query,
                    }),
                },
            ];
            
            await zk.sendMessage(dest, {
                interactiveMessage: {
                    header: `❌ *Error*`,
                    body: { text: await translateText("Failed to get AI response. Please try again.", lang) },
                    buttons: errorButtons,
                    headerType: 1,
                }
            }, { quoted: ms });
        }

    } catch (err) {
        console.error('[AI] Error:', err);
        await zk.sendMessage(dest, {
            text: await translateText("Failed to get AI response. Please try again.", lang),
        }, { quoted: ms });
    }
}

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