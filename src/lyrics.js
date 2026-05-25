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
        
        const maxChars = 2500;
        let lyricsOutput = lyrics;
        
        if (lyrics.length > maxChars) {
            lyricsOutput = lyrics.slice(0, maxChars - 50) + "\n\n... [Truncated]";
        }

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
`,
                },
                footer: { text: "" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📋 Copy Info",
                                copy_code: `Title: ${title}\nArtist: ${artist}\nDate: ${tempSong.date}\nYear: ${tempSong.year}\nTime: ${tempSong.time}`,
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
                    title: `📝 LYRICS`,
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
                                display_text: "📋 Copy Lyrics",
                                copy_code: lyricsOutput,
                            }),
                        },
                    ],
                },
            },
        ];

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
        
        // Also send lyrics as simple text
        await zk.sendMessage(chatId, {
            text: `╭━━━━━━━━━━━━━━━━━━━━╮
┃     🎵 *TEMP SONG* 🎵
┣━━━━━━━━━━━━━━━━━━━━┫
┃
┃ 📀 *Title:* ${tempSong.title}
┃ 🎤 *Artist:* ${tempSong.artist}
┃ 📅 *Date:* ${tempSong.date}
┃ 📆 *Year:* ${tempSong.year}
┃ 🕐 *Time:* ${tempSong.time}
┃
┃ 📝 *Lyrics:*
┃ ${lyricsOutput.substring(0, 500)}${lyricsOutput.length > 500 ? '...' : ''}
┃
┣━━━━━━━━━━━━━━━━━━━━┫
┃ 💫 *NJABULO MD*
╰━━━━━━━━━━━━━━━━━━━━╯`
        }, { quoted: ms });

    } catch (error) {
        console.error('Lyrics Error:', error);
        if (loadingMsg && loadingMsg.key) {
            await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
        }
        sendErrorMessage(zk, chatId, `❌ *Error fetching lyrics*\n\nPlease try again.`, ms);
    }
});
