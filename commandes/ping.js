const { fana } = require("../njabulo/fana");
const config = require("../set");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const axios = require("axios");

// ========== GOOGLE TRANSLATE API ==========
let translateText = async (text, targetLang) => {
    try {
        if (!targetLang || targetLang === 'en') return text;
        try {
            const { translate } = require('@vitalets/google-translate-api');
            const result = await translate(text, { to: targetLang });
            return result.text;
        } catch (e) {
            const response = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`, {
                timeout: 5000
            });
            if (response.data && response.data.responseData) {
                return response.data.responseData.translatedText || text;
            }
            return text;
        }
    } catch (error) {
        console.error('Translation error:', error.message);
        return text;
    }
};

fana({
  nomCom: "ping",
  alias: ["speed", "pong"],
  categorie: "General",
  reaction: "📌",
  use: ".ping",
}, async (dest, zk, commandeOptions) => {
  console.log('Command triggered!');
  const { repondre, ms } = commandeOptions;
  
  // Get language from config
  const lang = config.LANGUAGE || "en";
  
  try {
    const njabulox = [
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
    ];

    const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
    if (!randomNjabulourl) {
      console.error("Error: No image URL found.");
      repondre("An error occurred: No image URL found.");
      return;
    }

    const reactionEmojis = ['❄️'];
    const textEmojis = ['🚀'];
    const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
    let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
    while (textEmoji === reactionEmoji) {
      textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
    }

    const runtime = function (seconds) {
      seconds = Number(seconds);
      var d = Math.floor(seconds / (3600 * 24));
      var h = Math.floor((seconds % (3600 * 24)) / 3600);
      var m = Math.floor((seconds % 3600) / 60);
      var s = Math.floor(seconds % 60);
      var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " d, ") : "";
      var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " h, ") : "";
      var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " m, ") : "";
      var sDisplay = s > 0 ? s + (s == 1 ? " second" : " s") : "";
      return dDisplay + hDisplay + mDisplay + sDisplay;
    };

    const start = new Date().getTime();
    await zk.sendPresenceUpdate('composing', dest);
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    // Translate text content
    const uptimeText = await translateText("Uptime", lang);
    const pingText = await translateText("Ping", lang);
    const systemInfoText = await translateText("System Info", lang);
    const systemsLoadingText = await translateText("sʏsᴛᴇᴍs ʟᴏᴀᴅɪɴɢ", lang);
    const waChannelText = await translateText("channel", lang);
    const availableText = await translateText("Available", lang);

    const cards = [
      {
        header: {
          title: `📊 ${uptimeText}`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `⏳ *${await translateText("uptime", lang)}* : *${runtime(process.uptime())} ${reactionEmoji}* `,
        },
        footer: {
          text: "",
        },
        nativeFlowMessage: {
          buttons: [
            {
              buttonId: ".alive",
              buttonText: { displayText: availableText },
              type: 1
            },
            { 
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: waChannelText,
                url: config.GURL
              }),
            },            
          ],
        },
      },
      {
        header: {
          title: `📊 ${pingText}`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `⏳ *${await translateText("ping", lang)}* : *${responseTime.toFixed(2)}s ${reactionEmoji}* `,
        },
        footer: {
          text: "",
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: waChannelText,
                url: config.GURL
              }),           
            },
          ],
        },
      },
    ];

    const message = generateWAMessageFromContent(
      dest,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: {
              header: { text: `🔍 ${systemInfoText}` },
              body: { text: `*📂 ${systemsLoadingText}*` },
              headerType: 1,
              carouselMessage: { cards },
            },
          },
        },
      }, { quoted: {
        key: {
          fromMe: false,
          participant: `0@s.whatsapp.net`,
          remoteJid: "status@broadcast"
        },
        message: {
          contactMessage: {
            displayName: "ɳʝαႦυʅσ ʝႦ",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=26777821911:+26777821911\nitem1.X-ABLabel:Bot\nEND:VCARD`
          }
        }
      } 
    });
    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
  } catch (e) {
    console.error("Error in menu command:", e);
    repondre(`An error occurred: ${e.message}`);
  }
});

fana({
  nomCom: "alive",
  alias: ["status", "check"],
  categorie: "General",
  reaction: "🎊",
  use: ".alive",
}, async (dest, zk, commandeOptions) => {
  console.log('Command triggered!');
  const { repondre, ms } = commandeOptions;
  
  const lang = config.LANGUAGE || "en";
  
  try {
    const njabulox = [
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
    ];

    const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
    if (!randomNjabulourl) {
      console.error("Error: No image URL found.");
      repondre("An error occurred: No image URL found.");
      return;
    }

    const reactionEmojis = ['❄️'];
    const textEmojis = ['🚀'];
    const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
    let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
    while (textEmoji === reactionEmoji) {
      textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
    }

    const runtime = function (seconds) {
      seconds = Number(seconds);
      var d = Math.floor(seconds / (3600 * 24));
      var h = Math.floor((seconds % (3600 * 24)) / 3600);
      var m = Math.floor((seconds % 3600) / 60);
      var s = Math.floor(seconds % 60);
      var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " d, ") : "";
      var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " h, ") : "";
      var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " m, ") : "";
      var sDisplay = s > 0 ? s + (s == 1 ? " second" : " s") : "";
      return dDisplay + hDisplay + mDisplay + sDisplay;
    };

    const start = new Date().getTime();
    await zk.sendPresenceUpdate('composing', dest);
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    const uptimeText = await translateText("Uptime", lang);
    const pingText = await translateText("Ping", lang);
    const systemInfoText = await translateText("System Info", lang);
    const systemsLoadingText = await translateText("sʏsᴛᴇᴍs ʟᴏᴀᴅɪɴɢ", lang);
    const waChannelText = await translateText("𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹", lang);

    const cards = [
      {
        header: {
          title: `📊 ${uptimeText}`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `⏳ *${await translateText("uptime", lang)}* : *${runtime(process.uptime())} ${reactionEmoji}* `,
        },
        footer: {
          text: "",
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: waChannelText,
                url: config.GURL
              }),
            },            
          ],
        },
      },
      {
        header: {
          title: `📊 ${pingText}`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `⏳ *${await translateText("ping", lang)}* : *${responseTime.toFixed(2)}s ${reactionEmoji}* `,
        },
        footer: {
          text: "",
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: waChannelText,
                url: config.GURL
              }),           
            },
          ],
        },
      },
    ];

    const message = generateWAMessageFromContent(
      dest,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: {
              header: { text: `🔍 ${systemInfoText}` },
              body: { text: `*📂 ${systemsLoadingText}*` },
              carouselMessage: { cards },
            },
          },
        },
      }, { quoted: {
        key: {
          fromMe: false,
          participant: `0@s.whatsapp.net`,
          remoteJid: "status@broadcast"
        },
        message: {
          contactMessage: {
            displayName: "ɳʝαႦυʅσ ʝႦ",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=26777821911:+26777821911\nitem1.X-ABLabel:Bot\nEND:VCARD`
          }
        }
      } 
    });
    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
  } catch (e) {
    console.error("Error in menu command:", e);
    repondre(`An error occurred: ${e.message}`);
  }
});

fana({
  nomCom: "uptime",
  alias: ["runtime", "up"],
  categorie: "General",
  reaction: "⏰",
  use: ".uptime",
}, async (dest, zk, commandeOptions) => {
  console.log('Command triggered!');
  const { repondre, ms } = commandeOptions;
  
  const lang = config.LANGUAGE || "en";
  
  try {
    const njabulox = [
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",      
    ];

    const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
    if (!randomNjabulourl) {
      console.error("Error: No image URL found.");
      repondre("An error occurred: No image URL found.");
      return;
    }

    const reactionEmojis = ['❄️'];
    const textEmojis = ['🚀'];
    const reactionEmoji = reactionEmojis[Math.floor(Math.random() * reactionEmojis.length)];
    let textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
    while (textEmoji === reactionEmoji) {
      textEmoji = textEmojis[Math.floor(Math.random() * textEmojis.length)];
    }

    const runtime = function (seconds) {
      seconds = Number(seconds);
      var d = Math.floor(seconds / (3600 * 24));
      var h = Math.floor((seconds % (3600 * 24)) / 3600);
      var m = Math.floor((seconds % 3600) / 60);
      var s = Math.floor(seconds % 60);
      var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " d, ") : "";
      var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " h, ") : "";
      var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " m, ") : "";
      var sDisplay = s > 0 ? s + (s == 1 ? " second" : " s") : "";
      return dDisplay + hDisplay + mDisplay + sDisplay;
    };

    const start = new Date().getTime();
    await zk.sendPresenceUpdate('composing', dest);
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    const uptimeText = await translateText("Uptime", lang);
    const pingText = await translateText("Ping", lang);
    const systemInfoText = await translateText("System Info", lang);
    const systemsLoadingText = await translateText("sʏsᴛᴇᴍs ʟᴏᴀᴅɪɴɢ", lang);
    const waChannelText = await translateText("channel", lang);

    const cards = [
      {
        header: {
          title: `📊 ${uptimeText}`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `⏳ *${await translateText("uptime", lang)}* : *${runtime(process.uptime())} ${reactionEmoji}* `,
        },
        footer: {
          text: "",
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: waChannelText,
                url: config.GURL
              }),
            },            
          ],
        },
      },
      {
        header: {
          title: `📊 ${pingText}`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `⏳ *${await translateText("ping", lang)}* : *${responseTime.toFixed(2)}s ${reactionEmoji}* `,
        },
        footer: {
          text: "",
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: waChannelText,
                url: config.GURL
              }),           
            },
          ],
        },
      },
    ];

    const message = generateWAMessageFromContent(
      dest,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: {
              header: { text: `🔍 ${systemInfoText}` },
              body: { text: `*📂 ${systemsLoadingText}*` },
              carouselMessage: { cards },
            },
          },
        },
      }, { quoted: {
        key: {
          fromMe: false,
          participant: `0@s.whatsapp.net`,
          remoteJid: "status@broadcast"
        },
        message: {
          contactMessage: {
            displayName: "ɳʝαႦυʅσ ʝႦ",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=26777821911:+26777821911\nitem1.X-ABLabel:Bot\nEND:VCARD`
          }
        }
      } 
    });
    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
  } catch (e) {
    console.error("Error in menu command:", e);
    repondre(`An error occurred: ${e.message}`);
  }
});
