const { fana } = require("../njabulo/fana");
const axios = require("axios");
const config = require("../set");
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

// ── Helper function to fetch lyrics ─────────────────────────────────
async function getLyrics(songTitle) {
  try {
    const response = await axios.get(`https://discardapi.dpdns.org/api/music/lyrics?apikey=qasim&song=${encodeURIComponent(songTitle)}`, {
      timeout: 15000
    });
    
    const data = response.data;
    
    if (!data.result || data.result.error) {
      return null;
    }
    
    const message = data.result.message;
    return {
      title: message.title,
      artist: message.artist,
      lyrics: message.lyrics,
      image: message.image,
      url: message.url
    };
  } catch (error) {
    console.error("Lyrics API error:", error.message);
    return null;
  }
}

// ── Lyrics command with cards ─────────────────────────────────────────
fana(
  {
    nomCom: "lyrics",
    alias: ["lyric", "songlyrics", "lirik"],
    categorie: "Music",
    reaction: "🎵",
  },
  async (chatId, zk, commandeOptions) => {
    const { ms, repondre, arg } = commandeOptions;

    if (!arg || !arg[0]) {
      return repondre("🎵 *Please provide a song name*\n\n📝 *Example:* `.lyrics Shape of You`\n`.lyrics Bohemian Rhapsody`\n`.lyrics Rap God`\n`.lyrics Someone Like You`");
    }

    await zk.sendPresenceUpdate('composing', chatId);

    const songTitle = arg.join(" ");
    const loadingMsg = await repondre(`🎵 *Searching lyrics for "${songTitle}"...*`);

    try {
      const lyricsData = await getLyrics(songTitle);
      
      if (!lyricsData) {
        await zk.deleteMessage(chatId, loadingMsg.key);
        return repondre(`❌ *No lyrics found*\n\nCould not find lyrics for "${songTitle}". Please try a different song name.\n\n📌 *Examples:*\n• Shape of You\n• Bohemian Rhapsody\n• Rap God\n• Someone Like You`);
      }

      // Get image buffer for card (use song image if available)
      let imageBuffer = null;
      try {
        const imgUrl = lyricsData.image || randomNjabulourl;
        const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 10000 });
        imageBuffer = imgRes.data;
      } catch (err) {
        console.error("Failed to download image:", err.message);
      }
      
      const imageMessage = imageBuffer ? (await generateWAMessageContent({ image: imageBuffer }, { upload: zk.waUploadToServer })).imageMessage : null;
      
      // Split lyrics into chunks (max 3000 chars per card)
      const lyricsChunks = [];
      let remainingLyrics = lyricsData.lyrics;
      while (remainingLyrics.length > 2800) {
        let chunk = remainingLyrics.substring(0, 2800);
        let lastNewline = chunk.lastIndexOf('\n');
        if (lastNewline > 0) {
          chunk = chunk.substring(0, lastNewline);
        }
        lyricsChunks.push(chunk);
        remainingLyrics = remainingLyrics.substring(chunk.length);
      }
      lyricsChunks.push(remainingLyrics);
      
      // Create cards
      const cards = [];
      
      // Card 1: Song Info
      cards.push({
        header: {
          title: `🎵 SONG INFO`,
          hasMediaAttachment: true,
          imageMessage: imageMessage,
        },
        body: {
          text: `🎤 *Title:* ${lyricsData.title}
👨‍🎤 *Artist:* ${lyricsData.artist}
📏 *Length:* ${lyricsData.lyrics.length} characters
📖 *Verses:* ${lyricsData.lyrics.split('\n\n').length} stanzas

🎧 *NJABULO MD Lyrics Finder*`,
        },
        footer: {
          text: "",
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "📋 Copy Song Info",
                copy_code: `Title: ${lyricsData.title}\nArtist: ${lyricsData.artist}\nLength: ${lyricsData.lyrics.length} characters`,
              }),
            },
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "🔗 View on Genius",
                url: lyricsData.url,
              }),
            },
          ],
        },
      });
      
      // Card 2: Lyrics (First part)
      cards.push({
        header: {
          title: `📝 LYRICS (Part 1/${lyricsChunks.length})`,
          hasMediaAttachment: true,
          imageMessage: imageMessage,
        },
        body: {
          text: lyricsChunks[0].substring(0, 2500),
        },
        footer: {
          text: "",
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "📋 Copy Lyrics",
                copy_code: lyricsChunks[0].substring(0, 2500),
              }),
            },
          ],
        },
      });
      
      // Card 3: Additional Info
      cards.push({
        header: {
          title: `💫 LYRICS INFO`,
          hasMediaAttachment: true,
          imageMessage: imageMessage,
        },
        body: {
          text: `🎵 *Song:* ${lyricsData.title}
👨‍🎤 *Artist:* ${lyricsData.artist}
📖 *Total Characters:* ${lyricsData.lyrics.length}
📄 *Number of Lines:* ${lyricsData.lyrics.split('\n').length}

💫 *Powered by NJABULO MD*
📖 *Source:* Genius Lyrics`,
        },
        footer: {
          text: "",
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "📋 Copy Song Info",
                copy_code: `Song: ${lyricsData.title}\nArtist: ${lyricsData.artist}\nTotal Characters: ${lyricsData.lyrics.length}\nLines: ${lyricsData.lyrics.split('\n').length}`,
              }),
            },
          ],
        },
      });

      // Delete loading message
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
                body: { text: `*📂 Lyrics for: ${lyricsData.title}*` },
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
      console.error("Lyrics search error:", error);
      await zk.deleteMessage(chatId, loadingMsg.key);
      repondre(`❌ *Error searching lyrics*\n\n${error.message}\n\nPlease try again later.`);
    }
  }
); 
