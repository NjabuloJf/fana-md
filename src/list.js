const { fana } = require("../njabulo/fana");
const config = require("../set");
const axios = require("axios");
const os = require('os');
const moment = require("moment-timezone");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

fana({
  nomCom: "menu",
  alias: ["help", "cmds"],
  categorie: "General",
  reaction: "📚",
  use: ".menu",
}, async (dest, zk, commandeOptions) => {
  console.log('Command triggered!');
  const { repondre, ms } = commandeOptions;

  const fetchGitHubStats = async () => {
    try {
        const response = await axios.get("https://api.github.com/repos/NjabuloJf/Njabulo-Jb");
        const forksCount = response.data.forks_count;
        const starsCount = response.data.stargazers_count;
        const totalUsers = forksCount * 2 + starsCount * 2;
        return { forks: forksCount, stars: starsCount, totalUsers };
    } catch (error) {
        console.error("Error fetching GitHub stats:", error);
        return { forks: 0, stars: 0, totalUsers: 0 };
    }
};

  const quotes = [
    "Dream big, work hard.",
    "Stay humble, hustle hard.",
    "Believe in yourself.",
    "Success is earned, not given.",
    "Actions speak louder than words.",
    "The best is yet to come.",
    "Keep pushing forward.",
    "Do more than just exist.",
    "Progress, not perfection.",
    "Stay positive, work hard.",
    "Be the change you seek.",
    "Never stop learning.",
    "Chase your dreams.",
    "Be your own hero.",
    "Life is what you make of it.",
    "Do it with passion or not at all.",
    "You are stronger than you think.",
    "Create your own path.",
    "Make today count.",
    "Embrace the journey.",
    "The best way out is always through.",
    "Strive for progress, not perfection.",
    "Don't wish for it, work for it.",
    "Live, laugh, love.",
    "Keep going, you're getting there.",
    "Don’t stop until you’re proud.",
    "Success is a journey, not a destination.",
    "Take the risk or lose the chance.",
    "It’s never too late.",
    "Believe you can and you're halfway there.",
    "Small steps lead to big changes.",
    "Happiness depends on ourselves.",
    "Take chances, make mistakes.",
    "Be a voice, not an echo.",
    "The sky is the limit.",
    "You miss 100% of the shots you don’t take.",
    "Start where you are, use what you have.",
    "The future belongs to those who believe.",
    "Don’t count the days, make the days count.",
    "Success is not the key to happiness. Happiness is the key to success."
];

// Function to get a random quote
const getRandomQuote = () => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
};

  const emojis = ["😅", "🤕", "😔", "🙄", "😂", "🤔", "😲", "😩"]; 
const reactionEmoji = emojis[Math.floor(Math.random() * emojis.length)];


  const randomQuote = getRandomQuote();
  
  const { totalUsers } = await fetchGitHubStats();
  const formattedTotalUsers = totalUsers.toLocaleString();

  moment.tz.setDefault("Africa/Botswana");
    const temps = moment().format('HH:mm:ss');
    const date = moment().format('DD/MM/YYYY');

    const hour = moment().hour();
    let greeting = "Good Mornιng";
    if (hour >= 12 && hour < 18) {
        greeting = "Good ᥲftᥱrnnon!";
    } else if (hour >= 18) {
        greeting = "Good Evᥱrnιng!";
    } else if (hour >= 22 || hour < 5) {
        greeting = "Good Nιght";
    }

  
  try {
    const njabulox = [
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png"
    ];

    const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
    if (!randomNjabulourl) {
      console.error("Error: No image URL found.");
      repondre("An error occurred: No image URL found.");
      return;
    }

    const cards = [
      {
        header: {
          title: `╭───────────⊷
┊▢ *ɴᴀᴍᴇ: ɳʝαႦυʅσ ʝႦ*
┊▢ *ᴅᴀᴛᴇ:* ${date}
┊▢ *ᴛɪᴍᴇ:* ${temps}
┊▢ *ᴛᴏᴛᴀʟ ᴜsᴇʀs:* ${formattedTotalUsers} users
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `
╔
 *ｃｍｄ* 27 
 *Ｍｅｎｕ* Ｒｅａｃｔｉｏｎ 
 *Ｍｏｒｅ* ᴏɴ
 *Ｔｙｐｅ* .ʀᴇᴀᴄᴛɪᴏɴ-ᴍᴇɴᴜ
╚`,
        },
        footer: {
          text: `┌┤🌇 *Hallo family  ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
        },
        nativeFlowMessage: {
          buttons: [
            {
             "buttonId": "uptime-btn",
              "buttonText": {"displayText": "𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹" },
              "type": 1,
            },               
          ],
        },
      },
      {                                      
        header: {
          title: `╭───────────⊷
┊▢ *ɴᴀᴍᴇ: ɳʝαႦυʅσ ʝႦ*
┊▢ *ᴅᴀᴛᴇ:* ${date}
┊▢ *ᴛɪᴍᴇ:* ${temps}
┊▢ *ᴛᴏᴛᴀʟ ᴜsᴇʀs:* ${formattedTotalUsers} users
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `
╔
 *ｃｍｄ* 23
 *Ｍｅｎｕ* Ｒｅａｃｔｉｏｎ 
 *Ｍｏｒｅ* ᴏɴ
 *Ｔｙｐｅ* .ʟᴏɢᴏ-ᴍᴇɴᴜ 
╚`,
        },
        footer: {
          text: `┌┤🌇 *Hallo family  ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
        },
        nativeFlowMessage: {
          buttons: [
            {
             "buttonId": "uptime-btn",
              "buttonText": {"displayText": "𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹" },
              "type": 1,
            },               
          ],
        },
      },
      {                                      
        header: {
          title: `╭───────────⊷
┊▢ *ɴᴀᴍᴇ: ɳʝαႦυʅσ ʝႦ*
┊▢ *ᴅᴀᴛᴇ:* ${date}
┊▢ *ᴛɪᴍᴇ:* ${temps}
┊▢ *ᴛᴏᴛᴀʟ ᴜsᴇʀs:* ${formattedTotalUsers} users
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `
╔
 *ｃｍｄ* 18
 *Ｍｅｎｕ* Ｒｅａｃｔｉｏｎ 
 *Ｍｏｒｅ* ᴏɴ
 *Ｔｙｐｅ* .ᴇᴅɪᴛ-ᴍᴇɴᴜ 
╚`,
        },
        footer: {
          text: `┌┤🌇 *Hallo family  ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
        },
        nativeFlowMessage: {
          buttons: [
            {
             "buttonId": "uptime-btn",
              "buttonText": {"displayText": "𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹" },
              "type": 1,
            },               
          ],
        },
      },
      {                                      

        header: {
          title: `╭───────────⊷
┊▢ *ɴᴀᴍᴇ: ɳʝαႦυʅσ ʝႦ*
┊▢ *ᴅᴀᴛᴇ:* ${date}
┊▢ *ᴛɪᴍᴇ:* ${temps}
┊▢ *ᴛᴏᴛᴀʟ ᴜsᴇʀs:* ${formattedTotalUsers} users
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `
╔
 *ｃｍｄ* 27 
 *Ｍｅｎｕ* Ｒｅａｃｔｉｏｎ 
 *Ｍｏｒｅ* ᴏɴ
 *Ｔｙｐｅ* .ᴅᴏᴡɴʟᴏᴀᴅ-ᴍᴇɴᴜ
╚`,
        },
        footer: {
          text: `┌┤🌇 *Hallo family  ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
        },
        nativeFlowMessage: {
          buttons: [
            {
             "buttonId": "uptime-btn",
              "buttonText": {"displayText": "𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹" },
              "type": 1,
            },               
          ],
        },
      },
      {                                      
        header: {
          title: `╭───────────⊷
┊▢ *ɴᴀᴍᴇ: ɳʝαႦυʅσ ʝႦ*
┊▢ *ᴅᴀᴛᴇ:* ${date}
┊▢ *ᴛɪᴍᴇ:* ${temps}
┊▢ *ᴛᴏᴛᴀʟ ᴜsᴇʀs:* ${formattedTotalUsers} users
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `
╔
 *ｃｍｄ* 11
 *Ｍｅｎｕ* Ｒｅａｃｔｉｏｎ 
 *Ｍｏｒｅ* ᴏɴ
 *Ｔｙｐｅ* .ɢᴇɴᴇʀᴀʟ-ᴍᴇɴᴜ
╚`,
        },
        footer: {
          text: `┌┤🌇 *Hallo family  ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
        },
        nativeFlowMessage: {
          buttons: [
            {
             "buttonId": "uptime-btn",
              "buttonText": {"displayText": "𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹" },
              "type": 1,
            },               
          ],
        },
      },
      {                                      
        header: {
          title: `╭───────────⊷
┊▢ *ɴᴀᴍᴇ: ɳʝαႦυʅσ ʝႦ*
┊▢ *ᴅᴀᴛᴇ:* ${date}
┊▢ *ᴛɪᴍᴇ:* ${temps}
┊▢ *ᴛᴏᴛᴀʟ ᴜsᴇʀs:* ${formattedTotalUsers} users
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `
╔
 *ｃｍｄ* 12
 *Ｍｅｎｕ* Ｒｅａｃｔｉｏｎ 
 *Ｍｏｒｅ* ᴏɴ
 *Ｔｙｐｅ* .ᴀɴɪᴍᴇ-ᴍᴇɴᴜ
╚`,
        },
        footer: {
          text: `┌┤🌇 *Hallo family  ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
        },
        nativeFlowMessage: {
          buttons: [
            {
             "buttonId": "uptime-btn",
              "buttonText": {"displayText": "𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹" },
              "type": 1,
            },               
          ],
        },
      },
      {  
        header: {
          title: `╭───────────⊷
┊▢ *ɴᴀᴍᴇ: ɳʝαႦυʅσ ʝႦ*
┊▢ *ᴅᴀᴛᴇ:* ${date}
┊▢ *ᴛɪᴍᴇ:* ${temps}
┊▢ *ᴛᴏᴛᴀʟ ᴜsᴇʀs:* ${formattedTotalUsers} users
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `
╔
 *ｃｍｄ* 18
 *Ｍｅｎｕ* Ｒｅａｃｔｉｏｎ 
 *Ｍｏｒｅ* ᴏɴ
 *Ｔｙｐｅ* . ʙᴜɢ-ᴍᴇɴᴜ
╚`,
        },
        footer: {
          text: `┌┤🌇 *Hallo family  ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
        },
        nativeFlowMessage: {
          buttons: [
            {
             "buttonId": "uptime-btn",
              "buttonText": {"displayText": "𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹" },
              "type": 1,
            },               
          ],
        },
      },
      {  
        header: {
          title: `╭───────────⊷
┊▢ *ɴᴀᴍᴇ: ɳʝαႦυʅσ ʝႦ*
┊▢ *ᴅᴀᴛᴇ:* ${date}
┊▢ *ᴛɪᴍᴇ:* ${temps}
┊▢ *ᴛᴏᴛᴀʟ ᴜsᴇʀs:* ${formattedTotalUsers} users
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `
╔
 *ｃｍｄ* 23
 *Ｍｅｎｕ* Ｒｅａｃｔｉｏｎ 
 *Ｍｏｒｅ* ᴏɴ
 *Ｔｙｐｅ* .ɢʀᴏᴜᴘ-ᴍᴇɴᴜ
╚`,
        },
        footer: {
          text: `┌┤🌇 *Hallo family  ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
        },
        nativeFlowMessage: {
          buttons: [
            {
             "buttonId": "uptime-btn",
              "buttonText": {"displayText": "𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹" },
              "type": 1,
            },               
          ],
        },
      },
      { 
        header: {
          title: `╭───────────⊷
┊▢ *ɴᴀᴍᴇ: ɳʝαႦυʅσ ʝႦ*
┊▢ *ᴅᴀᴛᴇ:* ${date}
┊▢ *ᴛɪᴍᴇ:* ${temps}
┊▢ *ᴛᴏᴛᴀʟ ᴜsᴇʀs:* ${formattedTotalUsers} users
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `
╔
 *ｃｍｄ* 19
 *Ｍｅｎｕ* Ｒｅａｃｔｉｏｎ 
 *Ｍｏｒｅ* ᴏɴ
 *Ｔｙｐｅ* .ᴜsᴇ-ᴍᴇɴᴜ
╚`,
        },
        footer: {
          text: `┌┤🌇 *Hallo family  ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
        },
        nativeFlowMessage: {
          buttons: [
            {
             "buttonId": "uptime-btn",
              "buttonText": {"displayText": "𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹" },
              "type": 1,
            },               
          ],
        },
      },
      {  
        header: {
          title: `╭───────────⊷
┊▢ *ɴᴀᴍᴇ: ɳʝαႦυʅσ ʝႦ*
┊▢ *ᴅᴀᴛᴇ:* ${date}
┊▢ *ᴛɪᴍᴇ:* ${temps}
┊▢ *ᴛᴏᴛᴀʟ ᴜsᴇʀs:* ${formattedTotalUsers} users
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `
╔
 *ｃｍｄ* 20
 *Ｍｅｎｕ* Ｒｅａｃｔｉｏｎ 
 *Ｍｏｒｅ* ᴏɴ
 *Ｔｙｐｅ* .ʜᴇʀᴏᴋᴜ-ᴍᴇɴᴜ
╚`,
        },
        footer: {
          text: `┌┤🌇 *Hallo family  ${greeting}* 
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹`,
        },
        nativeFlowMessage: {
          buttons: [
            {
             "buttonId": "uptime-btn",
              "buttonText": {"displayText": "𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹" },
              "type": 1,
            },               
          ],
        },
      },
      {                                      
        header: {
          title: `╭───────────⊷
┊▢ *ɴᴀᴍᴇ: ɳʝαႦυʅσ ʝႦ*
┊▢ *ᴅᴀᴛᴇ:* ${date}
┊▢ *ᴛɪᴍᴇ:* ${temps}
┊▢ *ᴛᴏᴛᴀʟ ᴜsᴇʀs:* ${formattedTotalUsers} users
┌┤`,
          hasMediaAttachment: true,
          imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
        },
        body: {
          text: `
╔
  *ｃｍｄ* 5
  *Ｍｅｎｕ* Ｒｅａｃｔｉｏｎ 
  *Ｍｏｒｅ* ᴏɴ
  *Ｔｙｐｅ* .ᴄʜᴀᴛ-ᴍᴇɴᴜ
╚`,
        },
        footer: {
          text: `┌┤🌇 *Hallo family  ${greeting}*
┊${reactionEmoji} *${randomQuote}*
╰──────────────⊷⳹ `,
        },
        nativeFlowMessage: {
          buttons: [
            {
              "buttonId": "uptime-btn",
              "buttonText": {"displayText": "𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹" },
              "type": 1,
            }, 
          ],
        },
      },
    ];

    const audioUrl = "https://files.catbox.moe/bf8mnv.mp3";
            
    
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
              header: { text: `🔍 System Info` },
              body: { text: `*ｃｏｍｐｌｅｔｅｄ✘*` },
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

    
   await zk.sendMessage(dest, {
            audio: { url: audioUrl },
            mimetype: 'audio/mp4',
            ptt: true
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

      
  } catch (e) {
    console.error("Error in menu command:", e);
    repondre(`An error occurred: ${e.message}`);
  }
});

    
