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
        const { data } = await axios.get(url, { timeout: 15000 });
        return data?.data?.response || null;
    },
    async (q) => {
        const url = `https://llama.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 15000 });
        return data?.data?.response || data?.response || null;
    },
    async (q) => {
        const url = `https://mistral.gtech-apiz.workers.dev/?apikey=Suhail&text=${encodeURIComponent(q)}`;
        const { data } = await axios.get(url, { timeout: 15000 });
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
                console.log(`✅ AI API Success!`);
                return response.trim();
            }
        } catch (error) {
            console.log(`❌ AI API failed: ${error.message}`);
            continue;
        }
    }
    return "⚠️ AI service is currently unavailable. Please try again later.";
};

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
    const imageOption = await translateText("5️⃣ Images (8 photos)", lang);
    const lyricsOption = await translateText("6️⃣ Lyrics", lang);
    const ytsOption = await translateText("7️⃣ YouTube Search", lang);
    const chatAIOption = await translateText("8️⃣ Chat AI", lang);
    const chooseOption = await translateText("Reply with number 1, 2, 3, 4, 5, 6, 7, or 8 to choose:", lang);
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

        // Send image with format selection
        const sentMessage = await zk.sendMessage(dest, {
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
        const msgId = ms.key.id;
        
        // Generate unique session ID
        const sessionId = `${senderJid}_${Date.now()}`;
        
        activeDownloads[senderJid] = {
            firstVideo,
            videoId,
            safeTitle,
            dest,
            ms,
            zk,
            lang,
            query,
            sentMessageId: sentMessage.key.id,
            msgId: msgId,
            sessionId: sessionId,
            timestamp: Date.now(),
            active: true
        };

        console.log(`[PLAY] Active download stored for ${senderJid} | Session: ${sessionId}`);

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
            await zk.sendMessage(dest, {
                interactiveMessage: {
                    header: `📀 *Title:* ${tempSong.title}\n📝 *Full Lyrics:*\n${lyrics}`,
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
            await zk.sendMessage(dest, { text: noYtResults }, { quoted: ms });
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
                        ],
                    },
                };
            })
        );

        const headerText = await translateText(`🔍 Search Results for "${query}"`, lang);
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
        await zk.sendMessage(dest, {
            text: await translateText("Failed to search YouTube. Please try again.", lang),
        }, { quoted: ms });
    }
}

// ========== SEND AI RESPONSE FUNCTION ==========
async function sendAIResponse(zk, dest, ms, query, lang) {
    try {
        const thinking = await translateText("🤔 Thinking...", lang);
        const aiResponse = await translateText("🤖 AI Response:", lang);
        
        // Send thinking message
        const thinkingMsg = await zk.sendMessage(dest, { text: thinking }, { quoted: ms });

        // Get AI response
        const response = await askAI(query);
        
        // Delete thinking message
        if (thinkingMsg && thinkingMsg.key) {
            await zk.sendMessage(dest, { delete: thinkingMsg.key }).catch(() => {});
        }

        // Check if response is error
        if (response.includes("unavailable")) {
            await zk.sendMessage(dest, { 
                text: response,
                contextInfo: {
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363399999197102@newsletter',
                        newsletterName: "╭••➤®Njabulo Jb",
                        serverMessageId: 143,
                    },
                },
            }, { quoted: ms });
            return;
        }

        // Split response if too long
        const responseChunks = splitTextIntoChunks(response, 3800);
        
        if (responseChunks.length > 1) {
            await zk.sendMessage(dest, { 
                text: `${aiResponse}\n\n━━━━━━━━━━━━━━━━━━━`
            }, { quoted: ms });
            
            for (let i = 0; i < responseChunks.length; i++) {
                await zk.sendMessage(dest, { 
                    text: `*Part ${i + 1}/${responseChunks.length}*\n\n${responseChunks[i]}` 
                }, { quoted: ms });
            }
        } else {
            await zk.sendMessage(dest, {
                interactiveMessage: {
                    header: `${aiResponse}\n\n${response}`,
                    headerType: 1
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