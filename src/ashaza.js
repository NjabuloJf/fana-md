const { fana } = require("../njabulo/fana");
const axios = require("axios");
const config = require("../set");
const fs = require("fs-extra");
const FormData = require("form-data");

// ── Random image list ─────────────────────────────────────────────
const njabulox = [
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ACRCloud credentials
const ACR_HOST = 'identify-ap-southeast-1.acrcloud.com';
const ACR_ACCESS_KEY = '26afd4eec96b0f5e5ab16a7e6e05ab37';
const ACR_ACCESS_SECRET = 'wXOZIqdMNZmaHJP1YDWVyeQLg579uK2CfY6hWMN8';

async function sendErrorMessage(zk, chatId, text, ms) {
  await zk.sendMessage(chatId, { text: text }, { quoted: ms });
}

// Function to recognize song using ACRCloud
async function recognizeSong(audioBuffer) {
  try {
    const formData = new FormData();
    formData.append('sample', audioBuffer, {
      filename: 'audio.mp3',
      contentType: 'audio/mpeg'
    });
    
    const response = await axios.post(`https://${ACR_HOST}/v1/identify`, formData, {
      headers: {
        ...formData.getHeaders(),
        'access_key': ACR_ACCESS_KEY,
        'access_secret': ACR_ACCESS_SECRET
      },
      timeout: 30000
    });
    
    return response.data;
  } catch (error) {
    console.error("ACRCloud error:", error.response?.data || error.message);
    return null;
  }
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
    return sendErrorMessage(zk, chatId, "🎵 *SHAZAM SONG RECOGNIZER*\n\n📌 *How to use:*\n1. Reply to an audio or video message\n2. Type: `.shazam`\n\n📝 *Example:* Reply to a voice note or song, then send `.shazam`\n\n> NJABULO MD", ms);
  }

  // Check if quoted message has audio or video
  if (!msgRepondu.audioMessage && !msgRepondu.videoMessage && !msgRepondu.voiceMessage) {
    await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
    return sendErrorMessage(zk, chatId, "❌ *Invalid media*\n\nPlease quote an audio, voice note, or video message.\n\n> NJABULO MD", ms);
  }

  try {
    // Send analyzing message
    const analyzingMsg = await zk.sendMessage(chatId, { text: `🎵 *Analyzing audio...*\n\n⏳ This may take a few seconds.` }, { quoted: ms });

    // Download the media
    let buffer;
    let mediaType = '';
    
    if (msgRepondu.audioMessage) {
      buffer = await zk.downloadAndSaveMediaMessage(msgRepondu.audioMessage);
      mediaType = 'audio';
    } else if (msgRepondu.voiceMessage) {
      buffer = await zk.downloadAndSaveMediaMessage(msgRepondu.voiceMessage);
      mediaType = 'voice';
    } else if (msgRepondu.videoMessage) {
      buffer = await zk.downloadAndSaveMediaMessage(msgRepondu.videoMessage);
      mediaType = 'video';
    }
    
    if (!buffer) {
      await zk.sendMessage(chatId, { delete: analyzingMsg.key }).catch(() => {});
      await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
      return sendErrorMessage(zk, chatId, "❌ *Failed to download media*\n\nPlease try again with a different audio file.", ms);
    }
    
    // Read file as buffer
    const audioBuffer = fs.readFileSync(buffer);
    
    // Recognize the song
    const result = await recognizeSong(audioBuffer);
    
    // Clean up temp file
    fs.unlinkSync(buffer);
    
    await zk.sendMessage(chatId, { delete: analyzingMsg.key }).catch(() => {});

    if (!result || result.status?.code !== 0 || !result.metadata?.music?.length) {
      await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
      return sendErrorMessage(zk, chatId, "🎵 *Song not recognized*\n\nCould not identify the audio.\n\n📌 *Tips:*\n• Use clearer audio\n• Make sure the song is not too quiet\n• Try a different part of the song\n\n> NJABULO MD", ms);
    }

    const songData = result.metadata.music[0];
    const title = songData.title || "Unknown";
    const artists = songData.artists?.map(v => v.name).join(', ') || "Unknown";
    const album = songData.album?.name || "Unknown";
    const genres = songData.genres?.map(v => v.name).join(', ') || "Unknown";
    const releaseDate = songData.release_date || "Unknown";
    const duration = songData.duration_ms ? `${(songData.duration_ms / 1000).toFixed(2)} seconds` : "Unknown";
    const label = songData.label || "Unknown";
    const score = result.metadata?.music[0]?.score ? `${(result.metadata.music[0].score * 100).toFixed(1)}%` : "Unknown";

    // Get album art URL
    let albumArtUrl = null;
    if (songData.album?.url) {
      albumArtUrl = songData.album.url;
    }

    // Send success reaction
    await zk.sendMessage(chatId, { react: { text: "✅", key: ms.key } });

    // Create response message
    let responseText = `╭───(    SHAZAM RESULT    )───
├───≫ SONG IDENTIFIED ≪───
├ 
├ 🎤 *Title:* ${title}
├ 👨‍🎤 *Artist:* ${artists}
├ 💿 *Album:* ${album}
├ 🎸 *Genre:* ${genres}
├ 📅 *Release:* ${releaseDate}
├ ⏱️ *Duration:* ${duration}
├ 🏷️ *Label:* ${label}
├ 📊 *Confidence:* ${score}
├ 
╰──────────────────☉
> ©𝐏𝐨𝐰𝐞𝐫𝐞𝐝 𝐁𝐲 𝐍𝐉𝐀𝐁𝐔𝐋𝐎 𝐌𝐃`;

    // Send album art if available
    if (albumArtUrl) {
      try {
        await zk.sendMessage(chatId, {
          image: { url: albumArtUrl },
          caption: responseText
        }, { quoted: ms });
      } catch (err) {
        await zk.sendMessage(chatId, { text: responseText }, { quoted: ms });
      }
    } else {
      await zk.sendMessage(chatId, { text: responseText }, { quoted: ms });
    }
    
  } catch (error) {
    console.error('Shazam error:', error);
    await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
    sendErrorMessage(zk, chatId, `❌ *Error*\n\n${error.message}\n\nPlease try again later.\n\n> NJABULO MD`, ms);
  }
});
