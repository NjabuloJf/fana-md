const { fana } = require("../njabulo/fana");
const { getAllSudoNumbers, isSudoTableNotEmpty } = require("../bdd/sudo");
const conf = require("../set");
const moment = require("moment-timezone");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const axios = require("axios");

// ── Random image list ─────────────────────────────────────────────
const njabulox = [
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
  "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ── Format runtime function ──────────────────────────────────────────
function formatRuntime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${days > 0 ? days + "d " : ""}${hours > 0 ? hours + "h " : ""}${minutes > 0 ? minutes + "m " : ""}${secs}s`;
}

// ── Owner command with cards ─────────────────────────────────────────────
fana(
  {
    nomCom: "owner",
    alias: ["creator", "dev", "support"],
    categorie: "General",
    reaction: "👑",
  },
  async (dest, zk, commandeOptions) => {
    const { ms } = commandeOptions;

    // Send typing indicator
    await zk.sendPresenceUpdate('composing', dest);

    // Get current time
    const now = moment().tz("Africa/Garissa");
    const uptime = formatRuntime(process.uptime());
    
    // Get image buffer for card
    let imageBuffer = null;
    try {
      const imgRes = await axios.get(randomNjabulourl, { responseType: 'arraybuffer', timeout: 10000 });
      imageBuffer = imgRes.data;
    } catch (err) {
      console.error("Failed to download image:", err.message);
    }
    
    const imageMessage = imageBuffer ? (await generateWAMessageContent({ image: imageBuffer }, { upload: zk.waUploadToServer })).imageMessage : null;
    
    // Check if there are sudo users
    const thsudo = await isSudoTableNotEmpty();
    
    let cards = [];
    
    // Card 1: Owner Info
    const ownerCard = {
      header: {
        title: `👑 OWNER INFO`,
        hasMediaAttachment: true,
        imageMessage: imageMessage,
      },
      body: {
        text: `📛 *Name:* ${conf.OWNER_NAME || "Njabulo JB"}
🤖 *Bot:* ${conf.BOT_NAME || "NJABULO MD"}
📱 *Number:* wa.me/${conf.NUMERO_OWNER}
⏱️ *Uptime:* ${uptime}
🗓️ *Date:* ${now.format("YYYY-MM-DD")}
🕐 *Time:* ${now.format("HH:mm:ss")}`,
      },
      footer: {
        text: "",
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "🌐 WA Channel",
              url: conf.GURL || "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u"
            }),
          },
        ],
      },
    };
    cards.push(ownerCard);
    
    // Card 2: Sudo Users List
    if (thsudo) {
      const sudos = await getAllSudoNumbers();
      
      let sudoText = `🌟 *Owner:* @${conf.NUMERO_OWNER}\n\n📋 *Sudo Users:*\n`;
      
      for (const sudo of sudos) {
        if (sudo) {
          const sudoNumber = sudo.number || sudo;
          const sudoNum = sudoNumber.replace(/[^0-9]/g, "");
          sudoText += `💼 @${sudoNum}\n`;
        }
      }
      
      sudoText += `\n📊 *Total:* ${sudos.length + 1} users`;
      
      const sudoCard = {
        header: {
          title: `👑 SUDO USERS`,
          hasMediaAttachment: true,
          imageMessage: imageMessage,
        },
        body: {
          text: sudoText,
        },
        footer: {
          text: "",
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "🌐 WA Channel",
                url: conf.GURL || "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u"
              }),
            },
          ],
        },
      };
      cards.push(sudoCard);
    } else {
      const noSudoCard = {
        header: {
          title: `👑 SUDO USERS`,
          hasMediaAttachment: true,
          imageMessage: imageMessage,
        },
        body: {
          text: `🌟 *Owner:* @${conf.NUMERO_OWNER}

📋 *Sudo Users:* None

📊 *Total:* 1 user`,
        },
        footer: {
          text: "",
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "🌐 WA Channel",
                url: conf.GURL || "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u"
              }),
            },
          ],
        },
      };
      cards.push(noSudoCard);
    }
    
    // Send the carousel message with cards
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
              header: { text: `👑 NJABULO MD` },
              body: { text: `*📂 OWNER & SUDO INFORMATION*` },
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
              vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Njabulo-Jb;BOT;;;\nFN:Njabulo-Jb\nitem1.TEL;waid=${conf.NUMERO_OWNER}:+${conf.NUMERO_OWNER}\nitem1.X-ABLabel:Bot\nEND:VCARD`
            }
          }
        }
      }
    );
    
    await zk.relayMessage(dest, message.message, { messageId: message.key.id });
  }
);
