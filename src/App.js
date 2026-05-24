const { fana } = require("../njabulo/fana");
const axios = require("axios");
const config = require("../set");
const fs = require("fs-extra");
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

// ── Helper function to send formatted message ─────────────────────
async function sendFormattedMessage(zk, chatId, text, ms) {
  const buttons = [
    {
      name: "cta_copy",
      buttonParamsJson: JSON.stringify({
        display_text: "📋 Copy",
        id: "copy",
        copy_code: text,
      }),
    },
  ];

  await zk.sendMessage(
    chatId,
    {
      interactiveMessage: {
        header: { title: "📦 NJABULO MD APK", hasMediaAttachment: true, imageMessage: { url: randomNjabulourl } },
        body: { text: text },
        footer: { text: "💫 Powered by NJABULO MD" },
         buttons,
        headerType: 1
      }
    },
    { quoted: ms }
  );
}

// ── APK command with download ─────────────────────────────────────────
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
      return sendFormattedMessage(zk, chatId, "📌 *Please provide an app name*\n\n📝 *Example:* `.apk whatsapp`\n`.apk instagram`\n`.apk spotify`", ms);
    }

    await zk.sendPresenceUpdate('composing', chatId);

    const query = arg.join(" ");
    
    // Send loading reaction
    await zk.sendMessage(chatId, { react: { text: "🔍", key: ms.key } });

    try {
      const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(query)}/limit=1`;
      const response = await axios.get(apiUrl, { timeout: 15000 });
      const data = response.data;

      if (!data || !data.datalist || !data.datalist.list || data.datalist.list.length === 0) {
        await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
        return sendFormattedMessage(zk, chatId, `⚠️ *No results found for:* "${query}"\n\nPlease try a different app name.`, ms);
      }

      const app = data.datalist.list[0];
      const appSize = (app.file?.filesize / 1048576).toFixed(2);
      const downloadUrl = app.file?.path_alt || app.file?.path || app.obb?.main?.path;

      if (!downloadUrl) {
        await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
        return sendFormattedMessage(zk, chatId, `⚠️ *Download link not available for:* "${app.name}"\n\nPlease try another app.`, ms);
      }

      // Send uploading reaction
      await zk.sendMessage(chatId, { react: { text: "⬆️", key: ms.key } });

      // Download APK
      const apkResponse = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'arraybuffer',
        timeout: 60000
      });

      const apkBuffer = Buffer.from(apkResponse.data);

      // Send APK as document
      await zk.sendMessage(chatId, {
        document: apkBuffer,
        fileName: `${app.name.replace(/[^a-zA-Z0-9]/g, '_')}.apk`,
        mimetype: "application/vnd.android.package-archive",
        caption: `📦 *APK Downloader*

📱 *Name:* ${app.name}
🏋️ *Size:* ${appSize} MB
📦 *Package:* ${app.package}
📅 *Updated:* ${app.updated || "Unknown"}
👨‍💻 *Developer:* ${app.developer?.name || "Unknown"}
📊 *Version:* ${app.version_name || app.version || "Unknown"}

✅ *APK sent successfully!*

> NJABULO MD`
      }, { quoted: ms });

      // Send success reaction
      await zk.sendMessage(chatId, { react: { text: "✅", key: ms.key } });

    } catch (error) {
      console.error("APK Error:", error.message);
      await zk.sendMessage(chatId, { react: { text: "❌", key: ms.key } });
      sendFormattedMessage(zk, chatId, "❌ *An error occurred*\n\nPlease try again later.", ms);
    }
  }
);
