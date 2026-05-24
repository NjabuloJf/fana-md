const { fana } = require('../njabulo/fana');
const fs = require('fs');
const getFBInfo = require("@xaviabot/fb-downloader");
const { default: axios } = require('axios');
const config = require("../set");

// ---------- Buttons ----------
const buttons = [
  {
    name: "cta_url",
    buttonParamsJson: JSON.stringify({
      display_text: "🌐 WA Channel",
      id: "backup channel",
      url: config.GURL || "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u"
    }),
  },
];

// ---------- Send formatted message with buttons ----------
async function sendFormattedMessage(zk, chatId, text, ms) {
  await zk.sendMessage(
    chatId,
    {
      interactiveMessage: {
        body: text,
        buttons: buttons,
        headerType: 1
      }
    },
    { quoted: ms }
  );
}

// ---------- Facebook Video Downloader (HD) ----------
fana({
  nomCom: "facebook",
  alias: ["fbdown", "fbvideo"],
  categorie: "Download",
  reaction: "🖥️"
}, async (dest, zk, commandeOptions) => {
  const { repondre, ms, arg } = commandeOptions;

  if (!arg[0]) {
    return await sendFormattedMessage(zk, dest, "⚠️ *Please insert a public Facebook video link!*\n\n📌 Example: .facebook https://www.facebook.com/.../video", ms);
  }

  const queryURL = arg.join(" ");
  await zk.sendPresenceUpdate('composing', dest);

  try {
    const result = await getFBInfo(queryURL);
    
    if (!result || !result.hd) {
      throw new Error("No video found");
    }
    
    // Send thumbnail first
    if (result.thumbnail) {
      await zk.sendMessage(dest, {
      image: { url: result.thumbnail },
       interactiveMessage: {
        header:  `📥 *FACEBOOK VIDEO*\n\n📹 *Title:* ${result.title || "Unknown"}\n📎 *Quality:* HD`,
        buttons: buttons,
        headerType: 1
      }, { quoted: ms });
    }
    
    // Send the HD video
    await zk.sendMessage(dest, {
      video: { url: result.hd },
      caption: "🎬 *Your video is ready!*"
    }, { quoted: ms });
    
    // Send button message after video
    await sendFormattedMessage(zk, dest, "✅ *Download complete!*", ms);
    
  } catch (error) {
    console.error("Error:", error);
    await sendFormattedMessage(zk, dest, "❌ *Error downloading video*\n\nPlease check the link and try again.", ms);
  }
});

// ---------- Facebook Video Downloader (SD) ----------
fana({
  nomCom: "fb",
  alias: ["facebook2", "fbsd"],
  categorie: "Download",
  reaction: "🖥️"
}, async (dest, zk, commandeOptions) => {
  const { repondre, ms, arg } = commandeOptions;

  if (!arg[0]) {
    return await sendFormattedMessage(zk, dest, "⚠️ *Please insert a public Facebook video link!*\n\n📌 Example: .fb https://www.facebook.com/.../video", ms);
  }

  const queryURL = arg.join(" ");
  await zk.sendPresenceUpdate('composing', dest);

  try {
    const result = await getFBInfo(queryURL);
    
    if (!result || !result.sd) {
      throw new Error("No video found");
    }
    
    // Send thumbnail first
    if (result.thumbnail) {
      await zk.sendMessage(dest, {
        image: { url: result.thumbnail },
        caption: `📥 *FACEBOOK VIDEO*\n\n📹 *Title:* ${result.title || "Unknown"}\n📎 *Quality:* SD`
      }, { quoted: ms });
    }
    
    // Send the SD video
    await zk.sendMessage(dest, {
      video: { url: result.sd },
      caption: "🎬 *Your video is ready!*"
    }, { quoted: ms });
    
    // Send button message after video
    await sendFormattedMessage(zk, dest, "✅ *Download complete!*", ms);
    
  } catch (error) {
    console.error("Error:", error);
    await sendFormattedMessage(zk, dest, "❌ *Error downloading video*\n\nPlease check the link and try again.", ms);
  }
});

// ---------- Help command ----------
fana({
  nomCom: "fbhelp",
  alias: ["facebookhelp", "fbguide"],
  categorie: "Download",
  reaction: "📚"
}, async (dest, zk, commandeOptions) => {
  const { ms } = commandeOptions;
  
  const helpMessage = `╭━━━━━━━━━━━━━━━━━━━━╮
┃   📥 *FACEBOOK DOWNLOADER* 📥
┣━━━━━━━━━━━━━━━━━━━━┫
┃
┃ 📌 *.facebook <link>*
┃    Download HD quality video
┃
┃ 📌 *.fb <link>*
┃    Download SD quality video
┃
┃ 📌 *.fbhelp*
┃    Show this menu
┃
┣━━━━━━━━━━━━━━━━━━━━┫
┃ 📝 *How to use:*
┃ 1. Get a public Facebook video link
┃ 2. Send: .facebook [link]
┃ 3. Wait for the video
┃
┣━━━━━━━━━━━━━━━━━━━━┫
┃ ✨ *Powered by NJABULO MD*
╰━━━━━━━━━━━━━━━━━━━━╯`;
  
  await sendFormattedMessage(zk, dest, helpMessage, ms);
});
