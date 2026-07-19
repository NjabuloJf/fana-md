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

// ========== GET TRANSLATED TEXT ==========
async function getTranslatedText(text) {
    const lang = config.LANGUAGE || "en";
    return await translateText(text, lang);
}

fana({
  nomCom: "reaction-menu",
  alias: ["speed", "pong"],
  categorie: "General",
  reaction: "📌",
  use: ".ping",
}, async (dest, zk, commandeOptions) => {
  console.log('Command triggered!');
  const { repondre, ms } = commandeOptions;
  try {
    const njabulox = [
            "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png"

    ];

    const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
    if (!randomNjabulourl) {
      console.error("Error: No image URL found.");
      repondre(await getTranslatedText("An error occurred: No image URL found."));
      return;
    }

    const start = new Date().getTime();
    await zk.sendPresenceUpdate('composing', dest);
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    const cards = [
      {     
        header: {
          title: `╭───────────⊷
┊▢ *${await getTranslatedText("NAME: Njabulo JB")}*
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `① .ʙᴜʟʟʏ
② .ᴄᴜᴅᴅʟᴇ
③ .ᴄʀʏ
④ .ʜᴜɢ
⑤ .ᴀᴡᴏᴏ
⑥ .ᴋɪss
⑦ .ʟɪᴄᴋ
⑧ .ᴘᴀᴛ
⑨ .sᴍᴜɢ
⑩ .ʙᴏɴᴋ
⑪ .ʏᴇᴇᴛ
⑫ .ʙʟᴜsʜ
⑬ .sᴍɪʟᴇ
⑭ .ᴡᴀᴠᴇ
⑮ .ʜɪɢʜғɪᴠᴇ
⑯ .ʜᴀɴᴅʜᴏʟᴅ
⑰ .ɴᴏᴍ
⑱ .ʙɪᴛᴇ
⑲ .ɢʟᴏᴍᴘ
⑳ .sʟᴀᴘ
㉑ .ᴋɪʟʟ
㉒ .ᴋɪᴄᴋ
㉓ .ʜᴀᴘᴘʏ
㉔ .ᴡɪɴᴋ
㉕ .ᴘᴏᴋᴇ
㉖ .ᴅᴀɴᴄᴇ
㉗ .ᴄʀɪɴɢᴇ `,
        },
        footer: {
          text: ` ┌┤
╰──────────────⊷⳹ `,
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: await getTranslatedText("𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹"),
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
              header: { text: await getTranslatedText(`🔍 System Info`) },
              body: { text: await getTranslatedText(`*ｃｏｍｐｌｅｔｅｄ✘*`) },
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
        } });
    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
  } catch (e) {
    console.error("Error in menu command:", e);
    repondre(await getTranslatedText(`An error occurred: ${e.message}`));
  }
});

fana({
  nomCom: "logo-menu",
  alias: ["speed", "pong"],
  categorie: "General",
  reaction: "📌",
  use: ".ping",
}, async (dest, zk, commandeOptions) => {
  console.log('Command triggered!');
  const { repondre, ms } = commandeOptions;
  try {
    const njabulox = [
            "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png"

    ];

    const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
    if (!randomNjabulourl) {
      console.error("Error: No image URL found.");
      repondre(await getTranslatedText("An error occurred: No image URL found."));
      return;
    }

    const start = new Date().getTime();
    await zk.sendPresenceUpdate('composing', dest);
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    const cards = [
      {     
        header: {
          title: `╭───────────⊷
┊▢ *${await getTranslatedText("NAME: Njabulo JB")}*
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `① .ʜᴀᴄᴋᴇʀ
② .ᴅʀᴀɢᴏɴʙᴀʟʟ
③ .ɴᴀʀᴜᴛᴏ
④ .ᴅɪᴅᴏɴɢ
⑤ .ᴅɪᴅᴏɴɢ
⑥ .sᴜᴍᴍᴇʀ
⑦ .ᴡᴀʟʟ
⑧ .ɢʀᴇᴇɴɴᴇᴏɴ
⑨ .ɴᴇᴏɴʟɪɢʜᴛ
⑩ .ʙᴏᴏᴍʟɢ
⑪ .ᴅᴇᴠɪʟ
⑫ .ɢʟɪᴛᴄʜ
⑬ .ᴛʀᴀɴsғᴏʀᴍᴇʀ
⑭ .sɴᴏᴡ
⑮ .ᴡᴀᴛᴇʀ
⑯ .ɴᴇᴏɴ
⑰ .ᴛʜᴏʀ
⑱ .ʟɪɢʜᴛɢʟᴏᴡ
⑲ .ᴀʀᴇɴᴀ
⑳ .ɢᴏʟᴅ
㉑ .ᴘᴜʀᴘʟᴇ
㉒ .ɢɪғ
㉓ .ɪɴᴄᴀɴᴅᴇsᴄᴇɴᴛ `,
        },
        footer: {
          text: `┌┤
╰──────────────⊷⳹ `,
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: await getTranslatedText("𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹"),
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
              header: { text: await getTranslatedText(`🔍 System Info`) },
              body: { text: await getTranslatedText(`*ｃｏｍｐｌｅｔｅｄ✘*`) },
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
        } });
    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
  } catch (e) {
    console.error("Error in menu command:", e);
    repondre(await getTranslatedText(`An error occurred: ${e.message}`));
  }
});

fana({
  nomCom: "download-menu",
  alias: ["speed", "pong"],
  categorie: "General",
  reaction: "📌",
  use: ".ping",
}, async (dest, zk, commandeOptions) => {
  console.log('Command triggered!');
  const { repondre, ms } = commandeOptions;
  try {
    const njabulox = [
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png"

    ];

    const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
    if (!randomNjabulourl) {
      console.error("Error: No image URL found.");
      repondre(await getTranslatedText("An error occurred: No image URL found."));
      return;
    }

    const start = new Date().getTime();
    await zk.sendPresenceUpdate('composing', dest);
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    const cards = [
      {     
        header: {
          title: `╭───────────⊷
┊▢ *${await getTranslatedText("NAME: Njabulo JB")}*
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `① .ᴘʟᴀʏ
② .sᴏɴɢ
③ .ᴠɪᴅᴇᴏ
④ .ᴠɪᴅᴇᴏᴅᴏᴄ
⑤ .ғʙ
⑥ .ғᴀᴄᴇʙᴏᴏᴋ
⑦ .ʟɪᴛᴇ
⑧ .ᴛɪᴋᴛᴏᴋ
⑨ .ᴀᴘᴋ
⑩ .ᴍᴇᴅɪᴀғɪʀᴇ
⑪ .ᴅᴏᴡɴʟᴏᴀᴅ
⑫ .ᴍᴘ3 
⑬ .ᴍᴘ4 
⑭ .ᴍᴘ4ᴅᴏᴄ
⑮ .ᴍᴘ3ᴅᴏᴄ
⑯ .ʟʏʀɪᴄs 
⑰ .ʏᴛs
⑱ .ɪᴍɢ
⑲ .ɪᴍᴀɢᴇ
⑳ .ᴍᴏᴠɪᴇ 
㉑ .ᴋᴅʀᴀᴍᴀ
㉒ .ᴅʀᴀᴍᴀ
㉓ .sᴇᴀʀᴄʜ 
㉔ .ʏᴏᴜᴛᴜʙᴇ
㉕ .ᴠɪᴅᴇᴏxxx
㉖ .xxx
㉗ .ᴘᴏʀɴᴏ `,
        },
        footer: {
          text: `┌┤
╰──────────────⊷⳹ `,
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: await getTranslatedText("𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹"),
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
              header: { text: await getTranslatedText(`🔍 System Info`) },
              body: { text: await getTranslatedText(`*ｃｏｍｐｌｅｔｅｄ✘*`) },
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
        } });
    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
  } catch (e) {
    console.error("Error in menu command:", e);
    repondre(await getTranslatedText(`An error occurred: ${e.message}`));
  }
});

fana({
  nomCom: "general-menu",
  alias: ["speed", "pong"],
  categorie: "General",
  reaction: "📌",
  use: ".ping",
}, async (dest, zk, commandeOptions) => {
  console.log('Command triggered!');
  const { repondre, ms } = commandeOptions;
  try {
    const njabulox = [
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png"

    ];

    const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
    if (!randomNjabulourl) {
      console.error("Error: No image URL found.");
      repondre(await getTranslatedText("An error occurred: No image URL found."));
      return;
    }

    const start = new Date().getTime();
    await zk.sendPresenceUpdate('composing', dest);
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    const cards = [
      {     
        header: {
          title: `╭───────────⊷
┊▢ *${await getTranslatedText("NAME: Njabulo JB")}*
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `ɢᴇɴᴇʀᴀʟ
① .ɢᴇᴛᴘᴘ
② .ʀᴇᴘᴏ
③ .ᴍᴇɴᴜ
④ .ᴍᴇɴᴀ
⑤ .ᴏʙᴛ
⑥ .ᴏᴡɴᴇʀ
⑥ .ᴘɪ
⑧ .ᴘɪɴɢ
⑨ .sʜᴀᴢᴀᴍ
⑩ .ᴜᴘᴛɪᴍᴇ
⑪ .ᴜʀʟ
⑪ .ᴘᴀɪʀ `,
        },
        footer: {
          text: `┌┤
╰──────────────⊷⳹ `,
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: await getTranslatedText("𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹"),
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
              header: { text: await getTranslatedText(`🔍 System Info`) },
              body: { text: await getTranslatedText(`*ｃｏｍｐｌｅｔｅｄ✘*`) },
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
        } });
    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
  } catch (e) {
    console.error("Error in menu command:", e);
    repondre(await getTranslatedText(`An error occurred: ${e.message}`));
  }
});

fana({
  nomCom: "anime-menu",
  alias: ["speed", "pong"],
  categorie: "General",
  reaction: "📌",
  use: ".ping",
}, async (dest, zk, commandeOptions) => {
  console.log('Command triggered!');
  const { repondre, ms } = commandeOptions;
  try {
    const njabulox = [
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png"

    ];

    const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
    if (!randomNjabulourl) {
      console.error("Error: No image URL found.");
      repondre(await getTranslatedText("An error occurred: No image URL found."));
      return;
    }

    const start = new Date().getTime();
    await zk.sendPresenceUpdate('composing', dest);
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    const cards = [
      {     
        header: {
          title: `╭───────────⊷
┊▢ *${await getTranslatedText("NAME: Njabulo JB")}*
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `① .ᴡᴀɪғᴜ-ᴏɴᴇ
② .ɴᴇᴋᴏ-ᴏɴᴇ
③ .sʜɪɴᴏʙᴜ-ᴏɴᴇ
④ .ᴍᴇɢᴜᴍɪɴ-ᴏɴᴇ
⑤ .ᴄᴏsᴘʟᴀʏ-ᴏɴᴇ
⑥ .ᴄᴏᴜᴘʟᴇᴘᴘ-ᴏɴᴇ
⑦ .ᴡᴀɪғᴜ
⑧ .ɴᴇᴋᴏ
⑨ .sʜɪɴᴏʙᴜ
⑩ .ᴍᴇɢᴜᴍɪɴ`,
        },
        footer: {
          text: `┌┤
╰──────────────⊷⳹ `,
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: await getTranslatedText("𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹"),
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
              header: { text: await getTranslatedText(`🔍 System Info`) },
              body: { text: await getTranslatedText(`*ｃｏｍｐｌｅｔｅｄ✘*`) },
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
        } });
    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
  } catch (e) {
    console.error("Error in menu command:", e);
    repondre(await getTranslatedText(`An error occurred: ${e.message}`));
  }
});

fana({
  nomCom: "bug-menu",
  alias: ["speed", "pong"],
  categorie: "General",
  reaction: "📌",
  use: ".ping",
}, async (dest, zk, commandeOptions) => {
  console.log('Command triggered!');
  const { repondre, ms } = commandeOptions;
  try {
    const njabulox = [
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png"

    ];

    const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
    if (!randomNjabulourl) {
      console.error("Error: No image URL found.");
      repondre(await getTranslatedText("An error occurred: No image URL found."));
      return;
    }

    const start = new Date().getTime();
    await zk.sendPresenceUpdate('composing', dest);
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    const cards = [
      {     
        header: {
          title: `╭───────────⊷
┊▢ *${await getTranslatedText("NAME: Njabulo JB")}*
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `① .ʙᴜɢ ᴄʀᴀsʜ
② .ʟᴏᴄᴄʀᴀsʜ
③ .ᴀᴍᴏᴜɴᴛʙᴜɢ <ᴀᴍᴏᴜɴᴛ>
④ .ᴄʀᴀsʜʙᴜɢ 255xxxx
⑤ .ᴘᴍʙᴜɢ 255xxxx
⑥ .ᴅᴇʟᴀʏʙᴜɢ 255xxxx
⑦ .ᴛʀᴏʟʟʏʙᴜɢ 255xxxx
⑧ .ᴅᴏᴄᴜʙᴜɢ 254xxxx
⑨ .ᴜɴʟɪᴍɪᴛᴇᴅʙᴜɢ 255xxxx
⑩ .ʙᴏᴍʙᴜɢ 255xxxx
⑪ .ʟᴀɢʙᴜɢ 255xxxx
⑫ .ɢᴄʙᴜɢ <ɢʀᴏᴜᴘʟɪɴᴋ>
⑬ .ᴅᴇʟᴀʏɢᴄʙᴜɢ <ɢʀᴏᴜᴘʟɪɴᴋ>
⑭ .ᴛʀᴏʟʟʏɢᴄʙᴜɢ <ɢʀᴏᴜᴘʟɪɴᴋ>
⑮ .ʟᴀɢɢᴄʙᴜɢ <ɢʀᴏᴜᴘʟɪɴᴋ>
⑯ .ʙᴏᴍɢᴄʙᴜɢ <ɢʀᴏᴜᴘʟɪɴᴋ>
⑰ .ᴜɴʟɪᴍɪᴛᴇᴅɢᴄʙᴜɢ <ɢʀᴏᴜᴘʟɪɴᴋ>
⑱ .ᴅᴏᴄᴜɢᴄʙᴜɢ <ɢʀᴏᴜᴘʟɪɴᴋ> `,
        },
        footer: {
          text: `┌┤
╰──────────────⊷⳹ `,
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: await getTranslatedText("𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹"),
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
              header: { text: await getTranslatedText(`🔍 System Info`) },
              body: { text: await getTranslatedText(`*ｃｏｍｐｌｅｔｅｄ✘*`) },
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
        } });
    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
  } catch (e) {
    console.error("Error in menu command:", e);
    repondre(await getTranslatedText(`An error occurred: ${e.message}`));
  }
});

fana({
  nomCom: "group-menu",
  alias: ["speed", "pong"],
  categorie: "General",
  reaction: "📌",
  use: ".ping",
}, async (dest, zk, commandeOptions) => {
  console.log('Command triggered!');
  const { repondre, ms } = commandeOptions;
  try {
    const njabulox = [
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png"

    ];

    const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
    if (!randomNjabulourl) {
      console.error("Error: No image URL found.");
      repondre(await getTranslatedText("An error occurred: No image URL found."));
      return;
    }

    const start = new Date().getTime();
    await zk.sendPresenceUpdate('composing', dest);
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    const cards = [
      {     
        header: {
          title: `╭───────────⊷
┊▢ *${await getTranslatedText("NAME: Njabulo JB")}*
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `① .ᴅᴇʟ
② .ᴛᴀɢᴀʟʟ
③ .ʟɪɴᴋ
④ .ᴘʀᴏᴍᴏᴛᴇ
⑤ .ᴅᴇᴍᴏᴛᴇ
⑥ .ʀᴇᴍᴏᴠᴇ
⑥ .ᴅᴇʟᴇᴛᴇ
⑧ .ɪɴғᴏ
⑨ .ᴀɴᴛɪʟɪɴᴋ
⑩ .ᴀɴᴛɪʙᴏᴛ
⑪ .ɢʀᴏᴜᴘ
⑫ .ɢɴᴀᴍᴇ
⑬ .ɢᴅᴇsᴄ
⑭ .ɢᴘᴘ
⑮ .ʜɪᴅᴇᴛᴀɢ
⑯ .ᴀᴜᴛᴏʟʟ
⑰ .ᴏɴʟʏᴀᴅᴍɪɴ
⑱ .ᴋɪᴄᴋᴀʟʟ
⑲ .ᴡᴀʀɴ
⑳ .ᴡᴇʟᴄᴏᴍᴇ
㉑ .ɢᴏᴏᴅʙʏᴇ
㉒ .ᴀɴᴛɪᴘʀᴏᴍᴏᴛᴇ
㉓ .ᴀɴᴛɪᴅᴇᴍᴏᴛᴇ `,
        },
        footer: {
          text: `┌┤
╰──────────────⊷⳹ `,
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: await getTranslatedText("𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹"),
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
              header: { text: await getTranslatedText(`🔍 System Info`) },
              body: { text: await getTranslatedText(`*ｃｏｍｐｌｅｔｅｄ✘*`) },
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
        } });
    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
  } catch (e) {
    console.error("Error in menu command:", e);
    repondre(await getTranslatedText(`An error occurred: ${e.message}`));
  }
});

fana({
  nomCom: "use-menu",
  alias: ["speed", "pong"],
  categorie: "General",
  reaction: "📌",
  use: ".ping",
}, async (dest, zk, commandeOptions) => {
  console.log('Command triggered!');
  const { repondre, ms } = commandeOptions;
  try {
    const njabulox = [
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png"

    ];

    const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
    if (!randomNjabulourl) {
      console.error("Error: No image URL found.");
      repondre(await getTranslatedText("An error occurred: No image URL found."));
      return;
    }

    const start = new Date().getTime();
    await zk.sendPresenceUpdate('composing', dest);
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    const cards = [
      {     
        header: {
          title: `╭───────────⊷
┊▢ *${await getTranslatedText("NAME: Njabulo JB")}*
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `① .ʟᴇғᴛ
② .ᴛᴇʟᴇsᴛɪᴄᴋᴇʀ
③ .ᴄʀᴇᴡ
④ .ʟᴇᴀᴠᴇ
⑤ .ᴊᴏɪɴ
⑥ .ᴊɪᴅ
⑥ .ʙʟᴏᴄᴋ
⑧ .ᴜɴʙʟᴏᴄᴋ
⑨ .ʙᴀɴ
⑩ .ʙᴀɴɢʀᴏᴜᴘ
⑪ .sᴜᴅᴏ
⑫ .sᴀᴠᴇ
⑬ .ᴍᴇɴᴛɪᴏɴ
⑭ .ʟᴇғᴛ
⑮ .ᴜɴʙʟᴏᴄᴋ
⑯ .ʙʟᴏᴄᴋ
⑰ .ʜᴀᴄᴋ
⑱ .ғᴀɴᴄʏ
⑲ .ᴛʀᴛ `,
        },
        footer: {
          text: `┌┤
╰──────────────⊷⳹ `,
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: await getTranslatedText("𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹"),
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
              header: { text: await getTranslatedText(`🔍 System Info`) },
              body: { text: await getTranslatedText(`*ｃｏｍｐｌｅｔｅｄ✘*`) },
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
        } });
    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
  } catch (e) {
    console.error("Error in menu command:", e);
    repondre(await getTranslatedText(`An error occurred: ${e.message}`));
  }
});

fana({
  nomCom: "heroku-menu",
  alias: ["speed", "pong"],
  categorie: "General",
  reaction: "📌",
  use: ".ping",
}, async (dest, zk, commandeOptions) => {
  console.log('Command triggered!');
  const { repondre, ms } = commandeOptions;
  try {
    const njabulox = [
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png"

    ];

    const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
    if (!randomNjabulourl) {
      console.error("Error: No image URL found.");
      repondre(await getTranslatedText("An error occurred: No image URL found."));
      return;
    }

    const start = new Date().getTime();
    await zk.sendPresenceUpdate('composing', dest);
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    const cards = [
      {     
        header: {
          title: `╭───────────⊷
┊▢ *${await getTranslatedText("NAME: Njabulo JB")}*
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `
① .ᴀɴᴛɪᴄᴀʟʟ
② .ʀᴇᴀᴅsᴛᴀᴛᴜs
③ .ᴀɴᴛɪᴅᴇʟᴇᴛᴇ
④ .ᴅᴏᴡɴʟᴏᴀᴅsᴛᴀᴛᴜs
⑤ .sᴛᴀʀᴛᴍᴇssᴀɢᴇ
⑥ .ʀᴇᴀᴅᴍᴇssᴀɢᴇ
⑥ .ᴘᴍ-ᴘᴇʀᴍɪᴛ
⑧ .ᴄʜᴀᴛʙᴏᴛ
⑨ .ɢʀᴇᴇᴛ
⑩ .ᴀɴᴛɪᴠᴠ
⑪ .ᴘᴜʙʟɪᴄᴍᴏᴅᴇ
⑫ .ᴀᴜᴛᴏʀᴇᴄᴏʀᴅ
⑬ .ᴀᴜᴛᴏᴛʏᴘɪɴɢ
⑭ .ᴀʟᴡᴀʏsᴏɴʟɪɴᴇ
⑮ .ᴘʀɪᴠᴀᴛᴇᴍᴏᴅᴇ
⑯ .ᴀᴜᴛᴏʟɪᴋᴇsᴛᴀᴛᴜs
⑰ .ᴄʜᴀᴛʙᴏᴛ
⑱ .sᴇᴛᴛɪɴɢs
⑲ .sᴇᴛᴘʀᴇғɪx
⑳ .ᴍᴇɴᴜʟɪɴᴋs `,
        },
        footer: {
          text: `┌┤
╰──────────────⊷⳹ `,
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: await getTranslatedText("𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹"),
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
              header: { text: await getTranslatedText(`🔍 System Info`) },
              body: { text: await getTranslatedText(`*ｃｏｍｐｌｅｔｅｄ✘*`) },
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
        } });
    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
  } catch (e) {
    console.error("Error in menu command:", e);
    repondre(await getTranslatedText(`An error occurred: ${e.message}`));
  }
});

fana({
  nomCom: "chat-menu",
  alias: ["speed", "pong"],
  categorie: "General",
  reaction: "📌",
  use: ".ping",
}, async (dest, zk, commandeOptions) => {
  console.log('Command triggered!');
  const { repondre, ms } = commandeOptions;
  try {
    const njabulox = [
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png"

    ];

    const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
    if (!randomNjabulourl) {
      console.error("Error: No image URL found.");
      repondre(await getTranslatedText("An error occurred: No image URL found."));
      return;
    }

    const start = new Date().getTime();
    await zk.sendPresenceUpdate('composing', dest);
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    const cards = [
      {     
        header: {
          title: `╭───────────⊷
┊▢ *${await getTranslatedText("NAME: Njabulo JB")}*
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `
ᴄʜᴀᴛ
② .ɴᴊᴀʙᴜʟᴏ
③ .ɢᴘᴛ
④ .ɢᴇᴍɪɴɪ
⑤ .ɪʟᴀᴍᴀ `,
        },
        footer: {
          text: `┌┤
╰──────────────⊷⳹ `,
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: await getTranslatedText("channel bot"),
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
              header: { text: await getTranslatedText(`🔍 System Info`) },
              body: { text: await getTranslatedText(`*ｃｏｍｐｌｅｔｅｄ✘*`) },
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
        } });
    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
  } catch (e) {
    console.error("Error in menu command:", e);
    repondre(await getTranslatedText(`An error occurred: ${e.message}`));
  }
});

fana({
  nomCom: "edit-menu",
  alias: ["speed", "pong"],
  categorie: "General",
  reaction: "📌",
  use: ".ping",
}, async (dest, zk, commandeOptions) => {
  console.log('Command triggered!');
  const { repondre, ms } = commandeOptions;
  try {
    const njabulox = [
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png"

    ];

    const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
    if (!randomNjabulourl) {
      console.error("Error: No image URL found.");
      repondre(await getTranslatedText("An error occurred: No image URL found."));
      return;
    }

    const start = new Date().getTime();
    await zk.sendPresenceUpdate('composing', dest);
    const end = new Date().getTime();
    const responseTime = (end - start) / 1000;

    const cards = [
      {     
        header: {
          title: `╭───────────⊷
┊▢ *${await getTranslatedText("name: Njabulo JB")}*
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `① .sʜɪᴛ
② .ᴡᴀsᴛᴇᴅ
③ .ᴡᴀɴᴛᴇᴅ
④ .ᴛʀɪɢɢᴇʀ
⑤ .ᴛʀᴀsʜ
⑥ .ʀɪᴘ
⑦ .sᴇᴘɪᴀ
⑧ .ʀᴀɪɴʙᴏᴡ
⑨ .ʜɪᴛʟᴇʀ
⑩ .ɪɴᴠᴇʀᴛ
⑪ .ᴊᴀɪʟ
⑫ .ᴀғғᴇᴄᴛi
⑬ .ʙᴇᴀᴜᴛɪғᴜʟ
⑭ .ʙʟᴜʀ
⑮ .ᴄɪʀᴄʟᴇ
⑯ .ғᴀᴄᴇᴘᴀʟᴍ
⑰ .ɢʀᴇʏsᴄᴀʟᴇ`,
        },
        footer: {
          text: `┌┤
╰──────────────⊷⳹ `,
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: await getTranslatedText("channel bot"),
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
              header: { text: await getTranslatedText(`🔍 System Info`) },
              body: { text: await getTranslatedText(`*ｃｏｍｐｌｅｔｅｄ✘*`) },
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
        } });
    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
  } catch (e) {
    console.error("Error in menu command:", e);
    repondre(await getTranslatedText(`An error occurred: ${e.message}`));
  }
});
