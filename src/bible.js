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

// ── Helper function to fetch random Bible verse ────────────────────
async function getRandomBibleVerse() {
  try {
    const response = await axios.get('https://bible-api.deno.dev/api/verses/random', { timeout: 10000 });
    const data = response.data;
    return {
      text: data.text,
      reference: data.reference,
      version: data.version || 'NIV'
    };
  } catch (error) {
    console.error("Bible API error:", error.message);
    return null;
  }
}

// ── Bible command with cards ─────────────────────────────────────────────
fana(
  {
    nomCom: "bible",
    alias: ["verse", "biblia", "dailyverse"],
    categorie: "Religion",
    reaction: "📖",
  },
  async (chatId, zk, commandeOptions) => {
    const { ms, repondre, arg } = commandeOptions;

    await zk.sendPresenceUpdate('composing', chatId);

    let verse;
    
    // Check if user provided a specific verse reference
    if (arg && arg[0]) {
      const reference = arg.join(" ");
      try {
        const response = await axios.get(`https://bible-api.deno.dev/api/verses/${encodeURIComponent(reference)}`, { timeout: 10000 });
        const data = response.data;
        verse = {
          text: data.text,
          reference: data.reference,
          version: data.version || 'NIV'
        };
      } catch (error) {
        return repondre(`❌ *Verse not found*\n\nCould not find "${reference}". Please check the reference and try again.\n\nExample: \`.bible John 3:16\``);
      }
    } else {
      // Get random verse
      verse = await getRandomBibleVerse();
      if (!verse) {
        return repondre("❌ *Error fetching Bible verse*\n\nPlease try again later.");
      }
    }

    // Get image buffer for card
    let imageBuffer = null;
    try {
      const imgRes = await axios.get(randomNjabulourl, { responseType: 'arraybuffer', timeout: 10000 });
      imageBuffer = imgRes.data;
    } catch (err) {
      console.error("Failed to download image:", err.message);
    }
    
    const imageMessage = imageBuffer ? (await generateWAMessageContent({ image: imageBuffer }, { upload: zk.waUploadToServer })).imageMessage : null;
    
    // Get current date
    const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // Create cards
    const cards = [
      {
        header: {
          title: `📖 BIBLE VERSE`,
          hasMediaAttachment: true,
          imageMessage: imageMessage,
        },
        body: {
          text: `📜 *${verse.reference}* (${verse.version})\n\n"${verse.text}"`,
        },
        footer: {
          text: "",
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "📋 Copy Verse",
                copy_code: `${verse.reference}\n\n"${verse.text}"`,
              }),
            },
          ],
        },
      },
      {
        header: {
          title: `💫 VERSE INFO`,
          hasMediaAttachment: true,
          imageMessage: imageMessage,
        },
        body: {
          text: `📖 *Reference:* ${verse.reference}
📚 *Version:* ${verse.version}
📏 *Length:* ${verse.text.length} characters
📅 *Date:* ${currentDate}
💫 *Powered by:* NJABULO MD`,
        },
        footer: {
          text: "",
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "📋 Copy Info",
                copy_code: `Reference: ${verse.reference}\nVersion: ${verse.version}\nLength: ${verse.text.length} characters\nDate: ${currentDate}`,
              }),
            },
          ],
        },
      },
      {
        header: {
          title: `🙏 BLESSINGS`,
          hasMediaAttachment: true,
          imageMessage: imageMessage,
        },
        body: {
          text: `🕊️ *May this verse bless your day!*

✨ *Share this verse with others*
💫 *Let God's word guide you*

📖 *Daily Bible Verse*
💒 *NJABULO MD Bible*`,
        },
        footer: {
          text: "",
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "🌐 More Verses",
                url: "https://www.bible.com"
              }),
            },
          ],
        },
      },
    ];

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
              header: { text: `📖 NJABULO MD BIBLE` },
              body: { text: `*📂 Bible Verse*` },
              headerType: 1,
              carouselMessage: { cards },
            },
          },
        },
      },
      { 
        quoted: {
          key: {
            fromMe: false,
            participant: `0@s.whatsapp.net`,
            remoteJid: "status@broadcast"
          },
          message: {
            contactMessage: {
              displayName: "NJABULO MD",
              vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=${config.NUMERO_OWNER}:+${config.NUMERO_OWNER}\nitem1.X-ABLabel:Bot\nEND:VCARD`
            }
          }
        }
      }
    );
    
    await zk.relayMessage(chatId, message.message, { messageId: message.key.id });
  }
);
