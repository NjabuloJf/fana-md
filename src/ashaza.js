const acrcloud = require('acrcloud');
const { fana } = require("../njabulo/fana");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const axios = require("axios");
const config = require("../set");

// ── Random image list ─────────────────────────────────────────────
const njabulox = [
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

async function sendErrorMessage(zk, chatId, text, ms) {
  await zk.sendMessage(chatId, { text: text }, { quoted: ms });
}

fana({
  nomCom: "shazam",
  alias: ["whatsong", "recognize", "songid"],
  categorie: "Music",
  reaction: "🎵",
}, async (chatId, zk, commandeOptions) => {
  const { ms, msgRepondu, repondre } = commandeOptions;

  // Send loading reaction
  await zk.sendMessage(chatId, { react: { text: "⌛", key: ms.key } });

  // Check if there's a quoted message
  if (!msgRepondu) {
    await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
    return sendErrorMessage(zk, chatId, "╭───(    NJABULO MD    )───\n├ Quote an audio or video message to identify the song.\n╰──────────────────☉\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝐍𝐉𝐀𝐁𝐔𝐋𝐎 𝐌𝐃", ms);
  }

  // Check if quoted message has audio or video
  if (!msgRepondu.audioMessage && !msgRepondu.videoMessage) {
    await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
    return sendErrorMessage(zk, chatId, "╭───(    NJABULO MD    )───\n├ Please quote an audio or video message.\n╰──────────────────☉\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝐍𝐉𝐀𝐁𝐔𝐋𝐎 𝐌𝐃", ms);
  }

  try {
    // Initialize ACRCloud
    const acr = new acrcloud({
      host: 'identify-ap-southeast-1.acrcloud.com',
      access_key: '26afd4eec96b0f5e5ab16a7e6e05ab37',
      access_secret: 'wXOZIqdMNZmaHJP1YDWVyeQLg579uK2CfY6hWMN8'
    });

    // Download the media
    let buffer;
    if (msgRepondu.audioMessage) {
      buffer = await zk.downloadAndSaveMediaMessage(msgRepondu.audioMessage);
    } else if (msgRepondu.videoMessage) {
      buffer = await zk.downloadAndSaveMediaMessage(msgRepondu.videoMessage);
    }

    // Read file as buffer
    const audioBuffer = require('fs').readFileSync(buffer);
    
    // Identify the song
    const { status, metadata } = await acr.identify(audioBuffer);
    
    // Clean up temp file
    require('fs').unlinkSync(buffer);

    if (status.code !== 0) {
      await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
      return sendErrorMessage(zk, chatId, "╭───(    NJABULO MD    )───\n├ Song not recognized.\n├ Could not identify the audio.\n╰──────────────────☉\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝐍𝐉𝐀𝐁𝐔𝐋𝐎 𝐌𝐃", ms);
    }

    const songData = metadata.music[0];
    const title = songData.title || "Unknown";
    const artists = songData.artists?.map(v => v.name).join(', ') || "Unknown";
    const album = songData.album?.name || "Unknown";
    const genres = songData.genres?.map(v => v.name).join(', ') || "Unknown";
    const releaseDate = songData.release_date || "Unknown";
    const duration = songData.duration_ms ? `${(songData.duration_ms / 1000).toFixed(2)}s` : "Unknown";

    // Get album art if available
    let albumArtBuffer = null;
    if (songData.album?.url) {
      try {
        const imgRes = await axios.get(songData.album.url, { responseType: 'arraybuffer', timeout: 10000 });
        albumArtBuffer = imgRes.data;
      } catch (err) {}
    }
    
    const albumArt = albumArtBuffer ? (await generateWAMessageContent({ image: albumArtBuffer }, { upload: zk.waUploadToServer })).imageMessage : null;
    
    // Create cards
    const cards = [
      {
        header: {
          title: `🎵 SONG IDENTIFIED`,
          hasMediaAttachment: true,
          imageMessage: albumArt,
        },
        body: {
          text: `🎤 *Title:* ${title}
👨‍🎤 *Artist:* ${artists}
💿 *Album:* ${album}
🎸 *Genre:* ${genres}
📅 *Release:* ${releaseDate}
⏱️ *Duration:* ${duration}

✅ *Song recognized successfully!*`,
        },
        footer: { text: "" },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "📋 Copy Song Info",
                copy_code: `Title: ${title}\nArtist: ${artists}\nAlbum: ${album}\nGenre: ${genres}\nRelease: ${releaseDate}`,
              }),
            },
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "🔍 Search on YouTube",
                url: `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' ' + artists)}`,
              }),
            },
          ],
        },
      },
      {
        header: {
          title: `💫 SONG DETAILS`,
          hasMediaAttachment: true,
          imageMessage: albumArt,
        },
        body: {
          text: `🎵 *Track:* ${title}
👤 *Performer:* ${artists}
📀 *Album:* ${album}
🏷️ *Genre:* ${genres}
📆 *Released:* ${releaseDate}
⏱️ *Length:* ${duration}

💫 *NJABULO MD Music Recognizer*
🔊 *Powered by ACRCloud*`,
        },
        footer: { text: "" },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "📋 Copy Details",
                copy_code: `Track: ${title}\nPerformer: ${artists}\nAlbum: ${album}\nGenre: ${genres}\nReleased: ${releaseDate}\nDuration: ${duration}`,
              }),
            },
          ],
        },
      },
    ];

    // Send success reaction
    await zk.sendMessage(chatId, { react: { text: "✅", key: ms.key } });
    
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
              header: { text: `🎵 NJABULO MD SHAZAM` },
              body: { text: `*📂 Song Recognition Result*` },
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
    console.error('Music recognition error:', error);
    await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
    sendErrorMessage(zk, chatId, `╭───(    NJABULO MD    )───\n├───≫ SHAZAM ERROR ≪───\n├ \n├ Music recognition failed.\n├ ${error.message}\n╰──────────────────☉\n> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝐍𝐉𝐀𝐁𝐔𝐋𝐎 𝐌𝐃`, ms);
  }
});
