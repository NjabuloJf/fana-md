const axios = require('axios');
const config = require('../set');
const { fana } = require("../njabulo/fana");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

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
    // Try to break at a newline for better readability
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
  await zk.sendMessage(chatId, { text: text }, { quoted: ms });
}

fana({
    nomCom: "lyrics",
    alias: ["lyric", "songlyrics", "lirik"],
    categorie: "Music",
    reaction: "🎵",
}, async (chatId, zk, commandeOptions) => {
    const { ms, repondre, arg } = commandeOptions;
    
    const songTitle = arg.join(' ').trim();
    
    if (!songTitle) {
        return sendErrorMessage(zk, chatId, `📌 *Please enter the song name*

📝 *Example:* .lyrics Shape of You`, ms);
    }

    await zk.sendPresenceUpdate('composing', chatId);
    
    const loadingMsg = await zk.sendMessage(chatId, { text: `🎵 *Searching for lyrics of:* "${songTitle}"...*` }, { quoted: ms });

    try {
        const apiUrl = `https://discardapi.dpdns.org/api/music/lyrics?apikey=qasim&song=${encodeURIComponent(songTitle)}`;
        const response = await axios.get(apiUrl, { timeout: 15000 });
        const data = response.data;
        
        if (!data.result || data.result.error || !data.result.message?.lyrics) {
            if (loadingMsg && loadingMsg.key) {
                await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
            }
            return sendErrorMessage(zk, chatId, `❌ *No lyrics found for* "${songTitle}"`, ms);
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
        
        // Create temp song data
        const tempSong = {
            title: title,
            artist: artist,
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
                    text: `🎤 *Title:* ${title}
👨‍🎤 *Artist:* ${artist}
📅 *Date:* ${tempSong.date}
📆 *Year:* ${tempSong.year}
🕐 *Time:* ${tempSong.time}
📏 *Length:* ${lyrics.length} chars`,
                },
                footer: { text: "" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📋 Copy Info",
                                copy_code: `Title: ${title}\nArtist: ${artist}\nDate: ${tempSong.date}\nYear: ${tempSong.year}`,
                            }),
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "🔗 Genius",
                                url: url,
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
                    text: lyrics.length > 2000 ? lyrics.substring(0, 2000) + "\n\n... (More in next card)" : lyrics,
                },
                footer: { text: "" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📋 Copy Lyrics",
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
                    text: lyrics.substring(2000, 4000) + (lyrics.length > 4000 ? "\n\n... (Continued)" : ""),
                },
                footer: { text: "" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📋 Copy Remaining",
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
                                display_text: "📋 Copy Remaining",
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
                            body: { text: `*📂 Temp Song: ${tempSong.title}*` },
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
            await zk.sendMessage(chatId, { text: `📝 *FULL LYRICS (${lyricsChunks.length} parts)*\n\n━━━━━━━━━━━━━━━━━━━` }, { quoted: ms });
            
            for (let i = 0; i < lyricsChunks.length; i++) {
                await zk.sendMessage(chatId, { 
                    text: `*Part ${i + 1}/${lyricsChunks.length}*\n\n${lyricsChunks[i]}` 
                }, { quoted: ms });
            }
        } else {
            await zk.sendMessage(chatId, {
                text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃     🎵 *TEMP SONG* 🎵
┣━━━━━━━━━━━━━━━━━━━━┫
┃
┃ 📀 *Title:* ${tempSong.title}
┃ 🎤 *Artist:* ${tempSong.artist}
┃ 📅 *Date:* ${tempSong.date}
┃ 📆 *Year:* ${tempSong.year}
┃
┃ 📝 *Full Lyrics:*
┃
┃ ${lyrics}
┃
┣━━━━━━━━━━━━━━━━━━━━┫
┃ 💫 *NJABULO MD*
╰━━━━━━━━━━━━━━━━━━━━╯`
            }, { quoted: ms });
        }

    } catch (error) {
        console.error('Lyrics Error:', error);
        if (loadingMsg && loadingMsg.key) {
            await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
        }
        sendErrorMessage(zk, chatId, `❌ *Error fetching lyrics*\n\nPlease try again.`, ms);
    }
});
