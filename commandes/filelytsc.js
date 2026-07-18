const axios = require('axios');
const config = require('../set');
const { fana } = require("../njabulo/fana");
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
    const lang = config.LANGUAGE || "en";
    const waChannel = await translateText("🌐WA channel", lang);
    const copyInfo = await translateText("📋 Copy Info", lang);
    const copyLyrics = await translateText("📋 Copy Lyrics", lang);
    const copyRemaining = await translateText("📋 Copy Remaining", lang);
    const genius = await translateText("🔗 Genius", lang);
    return { waChannel, copyInfo, copyLyrics, copyRemaining, genius };
}

// ── Random image list ─────────────────────────────────────────────
const njabulox = [
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ── Helper function to split long text into chunks ─────────────────
function splitTextIntoChunks(text, maxLength = 3800) {
    const chunks = [];
    let remaining = text;

    while (remaining.length > 0) {
        let chunk = remaining.substring(0, maxLength);
        const lastNewline = chunk.lastIndexOf('\n');
        if (lastNewline > maxLength - 500 && lastNewline > 0) {
            chunk = chunk.substring(0, lastNewline);
        }
        chunks.push(chunk);
        remaining = remaining.substring(chunk.length);
    }
    return chunks;
}

// ── Helper function to get current date ─────────────────────────
function getCurrentDate() {
    const date = new Date();
    return {
        date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        year: date.getFullYear(),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
}

async function sendErrorMessage(zk, chatId, text, ms) {
    const lang = config.LANGUAGE || "en";
    const waChannel = await translateText("🌐WA channel", lang);
    const buttons = [
        {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
                display_text: waChannel,
                id: "backup channel",
                url: config.GURL
            }),
        },
    ];

    await zk.sendMessage(chatId, {
        interactiveMessage: {
            header: text,
            buttons,
            headerType: 1
        }
    }, { quoted: ms });
}

fana({
    nomCom: "lyrics",
    alias: ["lyric", "songlyrics", "lirik"],
    categorie: "Music",
    reaction: "🎵",
}, async (chatId, zk, commandeOptions) => {
    const { ms, repondre, arg } = commandeOptions;
    const lang = config.LANGUAGE || "en";

    // Translated texts
    const enterSong = await translateText("📌 *Please enter the song name*", lang);
    const example = await translateText("📝 *Example:*", lang);
    const searching = await translateText("🎵 *Searching for lyrics of:*", lang);
    const noLyrics = await translateText("❌ *No lyrics found for*", lang);
    const errorFetching = await translateText("❌ *Error fetching lyrics*", lang);
    const tryAgain = await translateText("Please try again.", lang);
    const songInfo = await translateText("🎵 SONG INFO", lang);
    const titleText = await translateText("🎤 *Title:*", lang);
    const artistText = await translateText("👨‍🎤 *Artist:*", lang);
    const dateText = await translateText("📅 *Date:*", lang);
    const yearText = await translateText("📆 *Year:*", lang);
    const timeText = await translateText("🕐 *Time:*", lang);
    const lengthText = await translateText("📏 *Length:*", lang);
    const charsText = await translateText("chars", lang);
    const lyricsPart = await translateText("📝 LYRICS (Part", lang);
    const fullLyrics = await translateText("📝 *FULL LYRICS*", lang);
    const partsText = await translateText("parts", lang);
    const tempSong = await translateText("📂 Temp Song:", lang);
    const copyInfo = await translateText("📋 Copy Info", lang);
    const copyLyrics = await translateText("📋 Copy Lyrics", lang);
    const copyRemaining = await translateText("📋 Copy Remaining", lang);
    const genius = await translateText("🔗 Genius", lang);

    const songTitle = arg.join(' ').trim();

    if (!songTitle) {
        return sendErrorMessage(zk, chatId, `${enterSong}\n\n${example} .lyrics Shape of You`, ms);
    }

    await zk.sendPresenceUpdate('composing', chatId);

    const loadingMsg = await zk.sendMessage(chatId, { text: `${searching} "${songTitle}"...*` }, { quoted: ms });

    try {
        const apiUrl = `https://discardapi.dpdns.org/api/music/lyrics?apikey=qasim&song=${encodeURIComponent(songTitle)}`;
        const response = await axios.get(apiUrl, { timeout: 15000 });
        const data = response.data;

        if (!data.result || data.result.error || !data.result.message?.lyrics) {
            if (loadingMsg && loadingMsg.key) {
                await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
            }
            return sendErrorMessage(zk, chatId, `${noLyrics} "${songTitle}"`, ms);
        }

        const messageData = data.result.message;
        const { artist, lyrics, image, title, url } = messageData;

        let imageBuffer = null;
        try {
            const imgUrl = image || randomNjabulourl;
            const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 10000 });
            imageBuffer = imgRes.data;
        } catch (err) {}

        const imageMessage = imageBuffer ? (await generateWAMessageContent({ image: imageBuffer }, { upload: zk.waUploadToServer })).imageMessage : null;

        const currentDate = getCurrentDate();

        const tempSongData = {
            title: title,
            artist: artist,
            date: currentDate.date,
            year: currentDate.year,
            time: currentDate.time
        };

        // Get translated buttons
        const btn = await getTranslatedButtons();

        const buttons = [
            {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                    display_text: btn.waChannel,
                    id: "backup channel",
                    url: config.GURL
                }),
            },
        ];

        const cards = [
            {
                header: {
                    title: songInfo,
                    hasMediaAttachment: true,
                    imageMessage: imageMessage,
                },
                body: {
                    text: `${titleText} ${title}\n${artistText} ${artist}\n${dateText} ${tempSongData.date}`,
                },
                footer: { text: "" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: btn.copyInfo,
                                copy_code: `Title: ${title}\nArtist: ${artist}\nDate: ${tempSongData.date}\nYear: ${tempSongData.year}`,
                            }),
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: btn.genius,
                                url: url,
                            }),
                        },
                    ],
                },
            },
            {
                header: {
                    title: `${lyricsPart} 1)`,
                    hasMediaAttachment: true,
                    imageMessage: imageMessage,
                },
                body: {
                    text: `${yearText} ${tempSongData.year}\n${timeText} ${tempSongData.time}\n${lengthText} ${lyrics.length} ${charsText}`,
                },
                footer: { text: "" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: btn.copyLyrics,
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
                    title: `${lyricsPart} 2)`,
                    hasMediaAttachment: true,
                    imageMessage: imageMessage,
                },
                body: {
                    text: `${yearText} ${tempSongData.year}\n${timeText} ${tempSongData.time}\n${lengthText} ${lyrics.length} ${charsText}`,
                },
                footer: { text: "" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: btn.copyRemaining,
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
                    title: `${lyricsPart} 3)`,
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
                                display_text: btn.copyRemaining,
                                copy_code: lyrics.substring(4000),
                            }),
                        },
                    ],
                },
            });
        }

        if (loadingMsg && loadingMsg.key) {
            await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
        }

        const message = generateWAMessageFromContent(
            chatId,
            {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2,
                        },
                        interactiveMessage: {
                            header: { text: `🎵 NJABULO MD` },
                            body: { text: `${tempSong} ${tempSongData.title}*` },
                            headerType: 1,
                            carouselMessage: { cards },
                        },
                    },
                },
            },
            { quoted: ms }
        );

        await zk.relayMessage(chatId, message.message, { messageId: message.key.id });

        // Also send full lyrics as separate text messages if needed
        const lyricsChunks = splitTextIntoChunks(lyrics, 3800);

        if (lyricsChunks.length > 1) {
            await zk.sendMessage(chatId, { text: `${fullLyrics} (${lyricsChunks.length} ${partsText})*\n\n━━━━━━━━━━━━━━━━━━━` }, { quoted: ms });

            for (let i = 0; i < lyricsChunks.length; i++) {
                await zk.sendMessage(chatId, {
                    text: `*Part ${i + 1}/${lyricsChunks.length}*\n\n${lyricsChunks[i]}`
                }, { quoted: ms });
            }
        } else {
            const waChannel = await translateText("🌐 channel", lang);
            const buttonsFull = [
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: waChannel,
                        id: "backup channel",
                        url: config.GURL
                    }),
                },
            ];

            await zk.sendMessage(chatId, {
                interactiveMessage: {
                    header: `📀 *Title:* ${tempSongData.title}\n📝 *Full Lyrics:*\n ${lyrics}`,
                    buttons: buttonsFull,
                    headerType: 1
                }
            }, { quoted: ms });
        }

    } catch (error) {
        console.error('Lyrics Error:', error);
        if (loadingMsg && loadingMsg.key) {
            await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
        }
        sendErrorMessage(zk, chatId, `${errorFetching}\n\n${tryAgain}`, ms);
    }
}); 
