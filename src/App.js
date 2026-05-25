const { fana } = require("../njabulo/fana");
const axios = require("axios");
const config = require("../set");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

const buttons = [
  {
    name: "cta_url",
    buttonParamsJson: JSON.stringify({
      display_text: "🌐WA channel",
      id: "backup channel",
      url: config.GURL
    }),
  },
  ];
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

async function sendErrorMessage(zk, chatId, text, ms) {
  await zk.sendMessage(chatId, {
    interactiveMessage: {
    header: text,
             buttons,
          headerType: 1
    }
    }, { quoted: ms });
}

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
      return sendErrorMessage(zk, chatId, "📌 *Please provide an app name*\n\n📝 *Example:* `.apk whatsapp`\n`.apk download whatsapp`\n`.apk instagram`", ms);
    }

    await zk.sendPresenceUpdate('composing', chatId);

    const query = arg.join(" ");
    const isDownload = query.toLowerCase().includes("download");
    const searchQuery = isDownload ? query.replace(/download/gi, '').trim() : query;
    
    const loadingMsg = await zk.sendMessage(chatId, { text: `🔍 *Searching for ${searchQuery} APK...*` }, { quoted: ms });

    try {
      const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(searchQuery)}/limit=1`;
      const response = await axios.get(apiUrl, { timeout: 15000 });
      const data = response.data;

      if (!data || !data.datalist || !data.datalist.list || data.datalist.list.length === 0) {
        if (loadingMsg && loadingMsg.key) {
          await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
        }
        return sendErrorMessage(zk, chatId, `❌ *No APK found*\n\nCould not find "${searchQuery}". Please try a different app name.`, ms);
      }

      const app = data.datalist.list[0];
      const appSize = formatFileSize(app.file?.filesize || app.size);
      const downloadUrl = app.file?.path_alt || app.file?.path || app.obb?.main?.path;
      
      console.log("Download URL:", downloadUrl);
      console.log("Is Download requested:", isDownload);
      
      let imageBuffer = null;
      try {
        const iconUrl = app.icon || app.media?.icon || randomNjabulourl;
        const imgRes = await axios.get(iconUrl, { responseType: 'arraybuffer', timeout: 10000 });
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
\`.playstore ${app.name}\`

⚠️ *Note:* Enable "Unknown Sources" 
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
      
      // Handle download if requested - THIS WILL ALWAYS RUN IF "download" IS IN THE COMMAND
      if (isDownload === true) {
        console.log("DOWNLOADING APK...");
        
        const downloadMsg = await zk.sendMessage(chatId, { text: `⏳ *Downloading ${app.name} APK...*\n\n📦 Size: ${appSize}\n⏱️ Please wait...` }, { quoted: ms });
        
        try {
          if (!downloadUrl) {
            throw new Error("No download URL available");
          }
          
          console.log("Downloading from URL:", downloadUrl);
          
          const apkResponse = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'arraybuffer',
            timeout: 120000
          });
          
          const apkBuffer = Buffer.from(apkResponse.data);
          
          console.log("APK downloaded, size:", apkBuffer.length, "bytes");
          
          // Send the APK as a document
          await zk.sendMessage(chatId, {
            interactiveMessage: {
            document: apkBuffer,
            fileName: `${app.name.replace(/[^a-zA-Z0-9]/g, '_')}.apk`,
            mimetype: "application/vnd.android.package-archive",
            header: `📦 *${app.name} APK*

📱 *Name:* ${app.name}
🏋️ *Size:* ${appSize}
📊 *Version:* ${app.version_name || app.version || "Unknown"}

✅ *Download complete!*

⚠️ *Installation Tips:*
• Enable "Unknown Sources" in Settings
• Open the downloaded file
• Click "Install"`,
       buttons,
          headerType: 1
            }

          }, { quoted: ms });
          
          // Delete download message
          if (downloadMsg && downloadMsg.key) {
            await zk.sendMessage(chatId, { delete: downloadMsg.key }).catch(() => {});
          }
          
          // Send success confirmation
          await zk.sendMessage(chatId, { text: `✅ *${app.name} APK sent successfully!*\n\nCheck the document above to download and install.` }, { quoted: ms });
          
        } catch (downloadError) {
          console.error("Download error:", downloadError.message);
          if (downloadMsg && downloadMsg.key) {
            await zk.sendMessage(chatId, { delete: downloadMsg.key }).catch(() => {});
          }
          await zk.sendMessage(chatId, { text: `❌ *Download failed*\n\nCould not download ${app.name}.\n\nReason: ${downloadError.message}\n\nPlease try again later.` }, { quoted: ms });
        }
      } else {
        console.log("No download requested. Use: .apk download [appname]");
      }
      
    } catch (error) {
      console.error("APK search error:", error);
      if (loadingMsg && loadingMsg.key) {
        await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
      }
      sendErrorMessage(zk, chatId, `❌ *Error searching APK*\n\nPlease try again later.`, ms);
    }
  }
);







function formatFileSize(bytes) {
  if (!bytes) return "Unknown";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

async function sendErrorMessage(zk, chatId, text, ms) {
  await zk.sendMessage(chatId, { text: text }, { quoted: ms });
}

fana(
  {
    nomCom: "playstore",
    alias: ["app", "apkdownload", "downloadapk"],
    categorie: "Tools",
    reaction: "📦",
  },
  async (chatId, zk, commandeOptions) => {
    const { ms, repondre, arg } = commandeOptions;

    if (!arg || !arg[0]) {
      return sendErrorMessage(zk, chatId, "📌 *Please provide an app name*\n\n📝 *Example:* `.apk whatsapp`\n`.apk instagram`\n`.apk spotify`", ms);
    }

    await zk.sendPresenceUpdate('composing', chatId);

    const searchQuery = arg.join(" ").trim();
    // Remove "download" keyword if present (for compatibility)
    const cleanQuery = searchQuery.replace(/download/gi, '').trim();
    
    const loadingMsg = await zk.sendMessage(chatId, { text: `🔍 *Searching for ${cleanQuery} APK...*` }, { quoted: ms });

    try {
      const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(cleanQuery)}/limit=1`;
      const response = await axios.get(apiUrl, { timeout: 15000 });
      const data = response.data;

      if (!data || !data.datalist || !data.datalist.list || data.datalist.list.length === 0) {
        if (loadingMsg && loadingMsg.key) {
          await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
        }
        return sendErrorMessage(zk, chatId, `❌ *No APK found*\n\nCould not find "${cleanQuery}". Please try a different app name.`, ms);
      }

      const app = data.datalist.list[0];
      const appSize = formatFileSize(app.file?.filesize || app.size);
      const downloadUrl = app.file?.path_alt || app.file?.path || app.obb?.main?.path;
      
      console.log("Download URL:", downloadUrl);
      
      let imageBuffer = null;
      try {
        const iconUrl = app.icon || app.media?.icon || randomNjabulourl;
        const imgRes = await axios.get(iconUrl, { responseType: 'arraybuffer', timeout: 10000 });
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

✅ *APK will be sent automatically!*

⚠️ *Note:* Enable "Unknown Sources" 
in settings to install!`,
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
      
      // ALWAYS DOWNLOAD APK (no "download" keyword needed)
      console.log("DOWNLOADING APK...");
      
      const downloadMsg = await zk.sendMessage(chatId, { text: `⏳ *Downloading ${app.name} APK...*\n\n📦 Size: ${appSize}\n⏱️ Please wait...` }, { quoted: ms });
      
      try {
        if (!downloadUrl) {
          throw new Error("No download URL available");
        }
        
        console.log("Downloading from URL:", downloadUrl);
        
        const apkResponse = await axios({
          method: 'GET',
          url: downloadUrl,
          responseType: 'arraybuffer',
          timeout: 120000
        });
        
        const apkBuffer = Buffer.from(apkResponse.data);
        
        console.log("APK downloaded, size:", apkBuffer.length, "bytes");
        
        await zk.sendMessage(chatId, {
            interactiveMessage: {
          document: apkBuffer,
          fileName: `${app.name.replace(/[^a-zA-Z0-9]/g, '_')}.apk`,
          mimetype: "application/vnd.android.package-archive",
          header: `📦 *${app.name} APK*

📱 *Name:* ${app.name}
🏋️ *Size:* ${appSize}
📊 *Version:* ${app.version_name || app.version || "Unknown"}

✅ *Download complete!*

⚠️ *Installation Tips:*
• Enable "Unknown Sources" in Settings
• Open the downloaded file
• Click "Install"`,
      buttons,
        headerType: 1
        }
        }, { quoted: ms });
        
        if (downloadMsg && downloadMsg.key) {
          await zk.sendMessage(chatId, { delete: downloadMsg.key }).catch(() => {});
        }
        
        await zk.sendMessage(chatId, { text: `✅ *${app.name} APK sent successfully!*\n\nCheck the document above to install.` }, { quoted: ms });
        
      } catch (downloadError) {
        console.error("Download error:", downloadError.message);
        if (downloadMsg && downloadMsg.key) {
          await zk.sendMessage(chatId, { delete: downloadMsg.key }).catch(() => {});
        }
        await zk.sendMessage(chatId, { text: `❌ *Download failed*\n\nCould not download ${app.name}.\n\nReason: ${downloadError.message}\n\nPlease try again later.` }, { quoted: ms });
      }
      
    } catch (error) {
      console.error("APK search error:", error);
      if (loadingMsg && loadingMsg.key) {
        await zk.sendMessage(chatId, { delete: loadingMsg.key }).catch(() => {});
      }
      sendErrorMessage(zk, chatId, `❌ *Error searching APK*\n\nPlease try again later.`, ms);
    }
  }
);
