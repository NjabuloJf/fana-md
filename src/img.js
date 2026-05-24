const { fana } = require("../njabulo/fana");
const gis = require("g-i-s");
const axios = require("axios");
const config = require(__dirname + "/../set");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// Google Custom Search API credentials
const GCSE_KEY = 'AIzaSyDMbI3nvmQUrfjoCJYLS69Lej1hSXQjnWI';
const GCSE_CX = 'baf9bdb0c631236e5';

// ── Random image list ─────────────────────────────────────────────
const njabulox = [
  "", 
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
    "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",

];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ── Base button definition (same as in other modules) ─────
const buttons = [
  {
    name: "cta_url",
    buttonParamsJson: JSON.stringify({
      display_text: "Visit Website",
      id: "backup channel",
      url: config.GURL,
      }),
  },
];

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
 
  await zk.sendMessage(
    chatId,
    {
      interactiveMessage: {
        image: { url: randomNjabulourl },
        header: text,
        buttons,
        headerType: 1,        
      },
    { quoted: ms }
  );
}

// ── Image search using Google Custom Search API ────────────────────
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

// ── Image search command ─────────────────────────────────────────────
fana(
  {
    nomCom: "img",
    aliases: ["image", "images"],
    categorie: "Images",
    reaction: "☘️",
  },
  async (dest, zk, commandeOptions) => {
    const { repondre, ms, arg } = commandeOptions;
    if (!arg[0]) {
      return sendFormattedMessage(zk, dest, "Which image?", ms);
    }

    const q = arg.join(" ");
    const loadingMessage = await repondre(`*⏳ Searching for ${q} images...*`);

    try {
      const images = await searchImages(q);

      if (!images || images.length === 0) {
        await zk.sendMessage(dest, { text: "No images found." }, { quoted: ms });
        if (loadingMessage) await zk.deleteMessage(dest, loadingMessage.key);
        return;
      }

      const results = images.slice(0, 8);
      const picked = await Promise.all(
        results.map(async (img) => {
          try {
            const bufferRes = await axios.get(img.url, { responseType: "arraybuffer", timeout: 10000 });
            return { buffer: bufferRes.data, directLink: img.url };
          } catch {
            console.error("Image download failed:", img.url);
            return null;
          }
        })
      );

      const validImages = picked.filter(Boolean);
      if (validImages.length === 0) {
        await zk.sendMessage(dest, { text: "No images found." }, { quoted: ms });
        if (loadingMessage) await zk.deleteMessage(dest, loadingMessage.key);
        return;
      }

      const cards = await Promise.all(
        validImages.map(async (item, i) => ({
          header: {
            title: `📸 Image ${i + 1}`,
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent({ image: item.buffer }, { upload: zk.waUploadToServer })).imageMessage,
          },
          body: { text: `*🔍 Search: ${q}*` },
          footer: { text: "" },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({ display_text: "𝗩𝗶𝗲𝘄 𝗢𝗿𝗶𝗴𝗶𝗻𝗮𝗹", url: item.directLink }),
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
                body: { text: `🔍 Search Results for: ${q}` },
                footer: { text: `📂 Found ${validImages.length} images` },
                carouselMessage: { cards },
              },
            },
          },
        },
        { quoted: ms }
      );

      await zk.relayMessage(dest, message.message, { messageId: message.key.id });
      if (loadingMessage) await zk.deleteMessage(dest, loadingMessage.key);
    } catch (error) {
      console.error("Error searching images:", error.response ? error.response.data : error.message);
      await zk.sendMessage(dest, { text: `Error: ${error.message}` }, { quoted: ms });
      if (loadingMessage) await zk.deleteMessage(dest, loadingMessage.key);
    }
  }
);

// ── Image search command 2 ─────────────────────────────────────────────
fana(
  {
    nomCom: "image",
    aliases: ["image", "images"],
    categorie: "Images",
    reaction: "☘️",
  },
  async (dest, zk, commandeOptions) => {
    const { repondre, ms, arg } = commandeOptions;
    if (!arg[0]) {
      return sendFormattedMessage(zk, dest, "Which image?", ms);
    }

    const q = arg.join(" ");
    const loadingMessage = await repondre(`*⏳ Searching for ${q} images...*`);

    try {
      const images = await searchImages(q);

      if (!images || images.length === 0) {
        await zk.sendMessage(dest, { text: "No images found." }, { quoted: ms });
        if (loadingMessage) await zk.deleteMessage(dest, loadingMessage.key);
        return;
      }

      const results = images.slice(0, 8);
      const picked = await Promise.all(
        results.map(async (img) => {
          try {
            const bufferRes = await axios.get(img.url, { responseType: "arraybuffer", timeout: 10000 });
            return { buffer: bufferRes.data, directLink: img.url };
          } catch {
            console.error("Image download failed:", img.url);
            return null;
          }
        })
      );

      const validImages = picked.filter(Boolean);
      if (validImages.length === 0) {
        await zk.sendMessage(dest, { text: "No images found." }, { quoted: ms });
        if (loadingMessage) await zk.deleteMessage(dest, loadingMessage.key);
        return;
      }

      const cards = await Promise.all(
        validImages.map(async (item, i) => ({
          header: {
            title: `📸 Image ${i + 1}`,
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent({ image: item.buffer }, { upload: zk.waUploadToServer })).imageMessage,
          },
          body: { text: `🔍 Search: ${q}` },
          footer: { text: "Nᴊᴀʙᴜʟᴏ Jʙ ᴘʜᴏᴛᴏ ɢʀᴀᴍ 🙄" },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({ display_text: "🌐 View Original", url: item.directLink }),
              },
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({ display_text: "📋 Copy Link", copy_code: item.directLink }),
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
                body: { text: `🔍 Search Results for: ${q}` },
                footer: { text: `📂 Found ${validImages.length} images` },
                carouselMessage: { cards },
              },
            },
          },
        },
        { quoted: ms }
      );

      await zk.relayMessage(dest, message.message, { messageId: message.key.id });
      if (loadingMessage) await zk.deleteMessage(dest, loadingMessage.key);
    } catch (error) {
      console.error("Error searching images:", error.response ? error.response.data : error.message);
      await zk.sendMessage(dest, { text: `Error: ${error.message}` }, { quoted: ms });
      if (loadingMessage) await zk.deleteMessage(dest, loadingMessage.key);
    }
  }
);
