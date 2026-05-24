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

fana(
  {
    nomCom: "lyrics",
    alias: ["lyric", "songlyrics"],
    categorie: "Music",
    reaction: "🎵",
  },
  async (chatId, zk, commandeOptions) => {
    const { ms, repondre, arg } = commandeOptions;

    if (!arg || !arg[0]) {
      return repondre("🎵 *Please provide a song name*\n\n📝 *Example:* `.lyrics Shape of You`\n`.lyrics Bohemian Rhapsody`");
    }

    await zk.sendPresenceUpdate('composing', chatId);

    const songTitle = arg.join(" ");
    const loadingMsg = await repondre(`🎵 *Searching lyrics for "${songTitle}"...*`);

    try {
      const lyricsData = await getLyrics(songTitle);
      
      if (!lyricsData) {
        await zk.deleteMessage(chatId, loadingMsg.key);
        return repondre(`❌ *No lyrics found*\n\nCould not find lyrics for "${songTitle}". Please try a different song name.`);
      }

      let imageBuffer = null;
      try {
        const imgUrl = lyricsData.image || randomNjabulourl;
        const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 10000 });
        imageBuffer = imgRes.data;
      } catch (err) {}
      
      const imageMessage = imageBuffer ? (await generateWAMessageContent({ image: imageBuffer }, { upload: zk.waUploadToServer })).imageMessage : null;
      
      // Limit lyrics to 2500 characters
      const shortLyrics = lyricsData.lyrics.length > 2500 ? lyricsData.lyrics.substring(0, 2500) + "\n\n... (truncated)" : lyricsData.lyrics;
      
      const cards = [
        {
          header: {
            title: `🎵 SONG INFO`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
          },
          body: {
            text: `🎤 *Title:* ${lyricsData.title}
👨‍🎤 *Artist:* ${lyricsData.artist}
📏 *Length:* ${lyricsData.lyrics.length} characters

🎧 *NJABULO MD Lyrics*`,
          },
          footer: { text: "" },
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
        },
        {
          header: {
            title: `📝 LYRICS`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
          },
          body: {
            text: shortLyrics,
          },
          footer: { text: "" },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "📋 Copy Lyrics",
                  copy_code: shortLyrics,
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
              messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
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
      repondre(`❌ *Error searching lyrics*\n\nPlease try again later.`);
    }
  }
);
