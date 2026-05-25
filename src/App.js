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

// ── Helper function to format file size ─────────────────────────────
function formatFileSize(bytes) {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

// ── APK command with download and cards ─────────────────────────────────────────
fana(
  {
    nomCom: "apk",
    alias: ["app", "apkdownload", "downloadapk"],
    categorie: "Tools",
    reaction: "📦",
  },
  async (chatId, zk, commandeOptions) => {
    const { ms, repondre, arg } = commandeOptions;

    if (!arg || !arg[0]) {
      return repondre("📌 *Please provide an app name*\n\n📝 *Example:* `.apk whatsapp`\n`.apk instagram`\n`.apk spotify`\n\n📥 *To download:* `.apk download whatsapp`");
    }

    await zk.sendPresenceUpdate('composing', chatId);

    const query = arg.join(" ");
    const isDownload = query.toLowerCase().includes("download");
    const searchQuery = isDownload ? query.replace(/download/gi, '').trim() : query;
    
    const loadingMsg = await repondre(`🔍 *Searching for ${searchQuery} APK...*`);

    try {
      const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(searchQuery)}/limit=1`;
      const response = await axios.get(apiUrl, { timeout: 15000 });
      const data = response.data;

      if (!data || !data.datalist || !data.datalist.list || data.datalist.list.length === 0) {
        await zk.deleteMessage(chatId, loadingMsg.key);
        return repondre(`❌ *No APK found*\n\nCould not find "${searchQuery}". Please try a different app name.`);
      }

      const app = data.datalist.list[0];
      const appSize = formatFileSize(app.file?.filesize || app.size);
      const downloadUrl = app.file?.path_alt || app.file?.path || app.obb?.main?.path;
      
      // Get app icon
      let imageBuffer = null;
      try {
        const iconUrl = app.icon || app.media?.icon || randomNjabulourl;
        const imgRes = await axios.get(iconUrl, { responseType: 'arraybuffer', timeout: 10000 });
        imageBuffer = imgRes.data;
      } catch (err) {}
      
      const imageMessage = imageBuffer ? (await generateWAMessageContent({ image: imageBuffer }, { upload: zk.waUploadToServer })).imageMessage : null;
      
      // Create cards
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
🏋️ *Size:* ${appSize}
📅 *Updated:* ${app.updated || "Unknown"}
👨‍💻 *Developer:* ${app.developer?.name || "Unknown"}
📊 *Version:* ${app.version_name || app.version || "Unknown"}
⭐ *Rating:* ${app.stats?.rating?.avg || app.rating || "N/A"}
📥 *Downloads:* ${app.stats?.downloads || "Unknown"}`,
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
            title: `📥 DOWNLOAD`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
          },
          body: {
            text: `📱 *App:* ${app.name}
🏋️ *Size:* ${appSize}
📊 *Version:* ${app.version_name || app.version || "Unknown"}

📌 *To download:* 
\`.apk download ${app.name}\`

⚠️ *Note:* 
Enable "Unknown Sources" 
in settings to install!`,
          },
          footer: { text: "" },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "📋 Copy Command",
                  copy_code: `.apk download ${app.name}`,
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
      
      // Handle download if requested
      if (isDownload && downloadUrl) {
        const downloadMsg = await repondre(`⏳ *Downloading ${app.name} APK...*`);
        
        try {
          const apkResponse = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'arraybuffer',
            timeout: 60000
          });
          
          const apkBuffer = Buffer.from(apkResponse.data);
          
          await zk.sendMessage(chatId, {
            document: apkBuffer,
            fileName: `${app.name.replace(/[^a-zA-Z0-9]/g, '_')}.apk`,
            mimetype: "application/vnd.android.package-archive",
            caption: `📦 *${app.name} APK*

📱 *Name:* ${app.name}
🏋️ *Size:* ${appSize}
📊 *Version:* ${app.version_name || app.version || "Unknown"}

✅ *Download complete!*

⚠️ *Installation Tips:*
• Enable "Unknown Sources" in Settings
• Open the downloaded file
• Click "Install"

> NJABULO MD`
          }, { quoted: ms });
          
          await zk.deleteMessage(chatId, downloadMsg.key);
          await repondre(`✅ *${app.name} APK sent successfully!*`);
          
        } catch (downloadError) {
          console.error("Download error:", downloadError);
          await zk.deleteMessage(chatId, downloadMsg.key);
          await repondre(`❌ *Download failed*\n\nCould not download ${app.name}. Please try again later.`);
        }
      } else if (isDownload && !downloadUrl) {
        await repondre(`❌ *Download not available*\n\nDownload link for ${app.name} is not available.`);
      }
      
    } catch (error) {
      console.error("APK search error:", error);
      await zk.deleteMessage(chatId, loadingMsg.key);
      repondre(`❌ *Error searching APK*\n\nPlease try again later.`);
    }
  }
);
