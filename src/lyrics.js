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

fana({
    nomCom: "lyrics",
    alias: ["lyric", "songlyrics", "lirik"],
    categorie: "Music",
    reaction: "🎵",
}, async (chatId, zk, commandeOptions) => {
    const { ms, repondre, arg } = commandeOptions;
    
    const songTitle = arg.join(' ').trim();
    
    if (!songTitle) {
        return repondre(`📌 *Please enter the song name to get the lyrics*

📝 *Example:* .lyrics Shape of You
🔍 *Usage:* .lyrics <song name>`);
    }

    await zk.sendPresenceUpdate('composing', chatId);
    
    const loadingMsg = await repondre(`🎵 *Searching for lyrics of:* "${songTitle}"\n\n⏳ Please wait...`);

    try {
        const apiUrl = `https://discardapi.dpdns.org/api/music/lyrics?apikey=qasim&song=${encodeURIComponent(songTitle)}`;
        const response = await axios.get(apiUrl, { timeout: 15000 });
        const data = response.data;
        
        if (!data.result || data.result.error || !data.result.message?.lyrics) {
            await zk.deleteMessage(chatId, loadingMsg.key);
            return repondre(`❌ *Sorry, I couldn't find any lyrics for* "${songTitle}".\n\nPlease check the song name and try again.`);
        }

        const messageData = data.result.message;
        const { artist, lyrics, image, title, url } = messageData;
        
        // Truncate lyrics if too long
        const maxChars = 2500;
        let lyricsOutput = lyrics;
        let truncated = false;
        
        if (lyrics.length > maxChars) {
            lyricsOutput = lyrics.slice(0, maxChars - 50) + "\n\n... [Lyrics truncated due to length]";
            truncated = true;
        }

        // Get image buffer for card
        let imageBuffer = null;
        try {
            const imgUrl = image || randomNjabulourl;
            const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 10000 });
            imageBuffer = imgRes.data;
        } catch (err) {
            console.error("Failed to download image:", err.message);
        }
        
        const imageMessage = imageBuffer ? (await generateWAMessageContent({ image: imageBuffer }, { upload: zk.waUploadToServer })).imageMessage : null;
        
        // Create cards
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
📏 *Length:* ${lyrics.length} characters
🔗 *Source:* Genius

💫 *NJABULO MD Lyrics*`,
                },
                footer: { text: "" },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📋 Copy Song Info",
                                copy_code: `Title: ${title}\nArtist: ${artist}\nLength: ${lyrics.length} characters`,
                            }),
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({
                                display_text: "🔗 View on Genius",
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
                    text: lyricsOutput,
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

        await zk.deleteMessage(chatId, loadingMsg.key);

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
                            header: { text: `🎵 NJABULO MD LYRICS` },
                            body: { text: `*📂 Lyrics for: ${title}*` },
                            headerType: 1,
                            carouselMessage: { cards },
                        },
                    },
                },
            },
            { quoted: ms }
        );
        
        await zk.relayMessage(chatId, message.message, { messageId: message.key.id });

    } catch (error) {
        console.error('Lyrics Command Error:', error);
        await zk.deleteMessage(chatId, loadingMsg.key);
        
        let errorMessage = `❌ *An error occurred while fetching the lyrics*\n\n`;
        
        if (error.message.includes('Network') || error.code === 'ECONNREFUSED') {
            errorMessage += `🌐 *Network error:* Please check your connection and try again.`;
        } else if (error.message.includes('timeout')) {
            errorMessage += `⏰ *Request timeout:* Please try again later.`;
        } else {
            errorMessage += `⚠️ *Reason:* ${error.message}`;
        }
        
        repondre(errorMessage);
    }
});
