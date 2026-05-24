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

function formatFileSize(bytes) {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

async function searchApk(query) {
  try {
    const response = await axios.get(`https://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(query)}/limit=5`, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const data = response.data;
    
    if (!data || !data.datalist || !data.datalist.list || data.datalist.list.length === 0) {
      return null;
    }
    
    const app = data.datalist.list[0];
    const appSize = formatFileSize(app.file?.filesize || app.size);
    
    return {
      name: app.name || query,
      package: app.package || "Unknown",
      size: appSize,
      updated: app.updated || app.modified || "Unknown",
      developer: app.developer?.name || "Unknown",
      icon: app.icon || app.media?.icon || randomNjabulourl,
      version: app.version_name || app.version || "Unknown",
      rating: app.stats?.rating?.avg || app.rating || "N/A",
      downloads: app.stats?.downloads || "Unknown"
    };
  } catch (error) {
    console.error("APK search error:", error.message);
    return null;
  }
}

fana(
  {
    nomCom: "apk",
    alias: ["app", "apksearch"],
    categorie: "Tools",
    reaction: "📦",
  },
  async (chatId, zk, commandeOptions) => {
    const { ms, repondre, arg } = commandeOptions;

    if (!arg || !arg[0]) {
      return repondre("📌 *Please provide an app name*\n\n📝 *Example:* `.apk whatsapp`\n`.apk instagram`");
    }

    await zk.sendPresenceUpdate('composing', chatId);

    const query = arg.join(" ");
    const loadingMsg = await repondre(`🔍 *Searching for ${query} APK...*`);

    try {
      const app = await searchApk(query);
      
      if (!app) {
        await zk.deleteMessage(chatId, loadingMsg.key);
        return repondre(`❌ *No APK found*\n\nCould not find "${query}". Please try a different app name.`);
      }

      let imageBuffer = null;
      try {
        const imgRes = await axios.get(app.icon, { responseType: 'arraybuffer', timeout: 10000 });
        imageBuffer = imgRes.data;
      } catch (err) {}
      
      const imageMessage = imageBuffer ? (await generateWAMessageContent({ image: imageBuffer }, { upload: zk.waUploadToServer })).imageMessage : null;
      
      const cards = [
        {
          header: {
            title: `📦 APP INFO`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
          },
          body: {
            text: `📱 *Name:* ${app.name}
📦 *Package:* ${app.package}
🏋️ *Size:* ${app.size}
📅 *Updated:* ${app.updated}
👨‍💻 *Developer:* ${app.developer}
📊 *Version:* ${app.version}
⭐ *Rating:* ${app.rating}
📥 *Downloads:* ${app.downloads}`,
          },
          footer: { text: "" },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "📋 Copy Package",
                  copy_code: app.package,
                }),
              },
            ],
          },
        },
        {
          header: {
            title: `📥 DOWNLOAD INFO`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
          },
          body: {
            text: `📱 *App:* ${app.name}
🏋️ *Size:* ${app.size}
📊 *Version:* ${app.version}

⚠️ *Note:* APK download link not available.
Search for the app on Google Play or Aptoide.`,
          },
          footer: { text: "" },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "📋 Copy App Name",
                  copy_code: app.name,
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
                header: { text: `📦 NJABULO MD APK FINDER` },
                body: { text: `*📂 Search Results for: ${app.name}*` },
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
      console.error("APK search error:", error);
      await zk.deleteMessage(chatId, loadingMsg.key);
      repondre(`❌ *Error searching APK*\n\nPlease try again later.`);
    }
  }
);
