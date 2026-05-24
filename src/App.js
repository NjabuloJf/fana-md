const { fana } = require("../njabulo/fana");
const axios = require("axios");
const config = require("../set");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const fs = require("fs-extra");

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

// ── Search APK on Aptoide ─────────────────────────────────────────
async function searchApk(query) {
  try {
    const response = await axios.get(`https://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(query)}/limit=5`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const data = response.data;
    
    if (!data || !data.datalist || !data.datalist.list || data.datalist.list.length === 0) {
      return null;
    }
    
    const app = data.datalist.list[0];
    const appSize = formatFileSize(app.file?.filesize || app.size);
    
    // Get download URL
    let downloadUrl = null;
    if (app.obb?.main?.path) {
      downloadUrl = app.obb.main.path;
    } else if (app.file?.path) {
      downloadUrl = app.file.path;
    } else if (app.path) {
      downloadUrl = app.path;
    } else if (app.file?.url) {
      downloadUrl = app.file.url;
    }
    
    return {
      name: app.name || query,
      package: app.package || "Unknown",
      size: appSize,
      updated: app.updated || app.modified || "Unknown",
      developer: app.developer?.name || "Unknown",
      icon: app.icon || app.media?.icon || randomNjabulourl,
      downloadUrl: downloadUrl,
      version: app.version_name || app.version || "Unknown",
      rating: app.stats?.rating?.avg || app.rating || "N/A",
      downloads: app.stats?.downloads || "Unknown",
      description: app.description || app.desc || "No description available"
    };
  } catch (error) {
    console.error("APK search error:", error.message);
    return null;
  }
}

// ── Download APK file ─────────────────────────────────────────────
async function downloadApk(url, fileName) {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 60000
    });
    
    const filePath = `./temp/${fileName}.apk`;
    
    // Create temp directory if not exists
    if (!fs.existsSync('./temp')) {
      fs.mkdirSync('./temp');
    }
    
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filePath));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error("Download error:", error.message);
    return null;
  }
}

// ── APK command with cards and download ─────────────────────────────
fana(
  {
    nomCom: "apk",
    alias: ["app", "apksearch", "downloadapk"],
    categorie: "Tools",
    reaction: "📦",
  },
  async (chatId, zk, commandeOptions) => {
    const { ms, repondre, arg } = commandeOptions;

    if (!arg || !arg[0]) {
      return repondre("📌 *Please provide an app name to search*\n\n📝 *Example:* `.apk whatsapp`\n`.apk instagram`\n`.apk spotify`\n`.apk download whatsapp` (to download)");
    }

    await zk.sendPresenceUpdate('composing', chatId);

    const query = arg.join(" ");
    const isDownload = query.toLowerCase().includes("download");
    const searchQuery = isDownload ? query.replace(/download/gi, '').trim() : query;
    
    const loadingMsg = await repondre(`🔍 *Searching for ${searchQuery} APK...*`);

    try {
      const app = await searchApk(searchQuery);
      
      if (!app) {
        await zk.deleteMessage(chatId, loadingMsg.key);
        return repondre(`❌ *No APK found*\n\nCould not find "${searchQuery}". Please try a different app name.\n\n📌 *Examples:*\n• whatsapp\n• instagram\n• spotify\n• telegram\n• youtube`);
      }

      // Get image buffer for card
      let imageBuffer = null;
      try {
        const imgRes = await axios.get(app.icon, { responseType: 'arraybuffer', timeout: 10000 });
        imageBuffer = imgRes.data;
      } catch (err) {
        console.error("Failed to download image:", err.message);
      }
      
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
🏋️ *Size:* ${app.size}
📅 *Updated:* ${app.updated}
👨‍💻 *Developer:* ${app.developer}
📊 *Version:* ${app.version}
⭐ *Rating:* ${app.rating}
📥 *Downloads:* ${app.downloads}`,
          },
          footer: {
            text: "",
          },
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
🏋️ *Size:* ${app.size}
📊 *Version:* ${app.version}

📌 *To download:* Type
\`.apk download ${app.name}\`

⚠️ *Note:* Download APK only from trusted sources!`,
          },
          footer: {
            text: "",
          },
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
        {
          header: {
            title: `💡 INSTALLATION TIPS`,
            hasMediaAttachment: true,
            imageMessage: imageMessage,
          },
          body: {
            text: `🔧 *How to install APK:*
1️⃣ Download the APK file
2️⃣ Enable "Unknown Sources" in Settings
3️⃣ Open the downloaded file
4️⃣ Click "Install"
5️⃣ Wait for installation

⚠️ *Safety Tips:*
• Only download from trusted sources
• Check app permissions
• Use antivirus if needed

💫 *NJABULO MD APK Finder*`,
          },
          footer: {
            text: "",
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "📋 Copy Tips",
                  copy_code: "How to install APK:\n1. Download the APK file\n2. Enable Unknown Sources in Settings\n3. Open the downloaded file\n4. Click Install\n5. Wait for installation\n\nSafety Tips:\n- Only download from trusted sources\n- Check app permissions\n- Use antivirus if needed",
                }),
              },
            ],
          },
        },
      ];

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
      if (isDownload && app.downloadUrl) {
        const downloadMsg = await repondre(`⏳ *Downloading ${app.name} APK...*`);
        
        const apkPath = await downloadApk(app.downloadUrl, app.package);
        
        if (apkPath && fs.existsSync(apkPath)) {
          await zk.sendMessage(chatId, {
            document: fs.readFileSync(apkPath),
            mimetype: 'application/vnd.android.package-archive',
            fileName: `${app.name}_v${app.version}.apk`,
            caption: `📦 *${app.name} APK*\n\n📊 *Version:* ${app.version}\n🏋️ *Size:* ${app.size}\n\n> NJABULO MD`
          }, { quoted: ms });
          
          await repondre(`✅ *Download complete!*\n\n📱 *${app.name}* has been sent as a document.\n\n⚠️ *Enable "Unknown Sources" to install!*`);
          
          // Delete the file after sending
          fs.unlinkSync(apkPath);
          await zk.deleteMessage(chatId, downloadMsg.key);
        } else {
          await repondre(`❌ *Download failed*\n\nCould not download ${app.name}. Please try again later.`);
        }
      } else if (isDownload && !app.downloadUrl) {
        await repondre(`❌ *Download not available*\n\nDownload link for ${app.name} is not available.`);
      }
      
    } catch (error) {
      console.error("APK search error:", error);
      await zk.deleteMessage(chatId, loadingMsg.key);
      repondre(`❌ *Error searching APK*\n\n${error.message}\n\nPlease try again later.`);
    }
  }
);
