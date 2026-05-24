const { Sticker, createSticker, StickerTypes } = require("wa-sticker-formatter");
const { fana } = require("../njabulo/fana");
const traduire = require("../njabulo/traduction");
const { downloadMediaMessage, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const fs = require("fs-extra");
const config = require("../set");
const axios = require("axios");
const FormData = require("form-data");
const { exec } = require("child_process");
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

// ── Translate command with 3 cards ─────────────────────────────────────────────
fana(
  {
    nomCom: "trt",
    alias: ["translate", "traduire"],
    categorie: "Use",
    reaction: "💗",
  },
  async (chatId, zk, commandeOptions) => {
    const { msgRepondu, repondre, arg, ms } = commandeOptions;

    if (!msgRepondu) {
      return repondre("📌 *Please mention a text message to translate*\n\nExample: Reply to a message with `.trt en`");
    }

    if (!arg || !arg[0]) {
      return repondre("📌 *Please specify a target language*\n\nExample: `.trt en` (for English)\n`.trt fr` (for French)\n`.trt es` (for Spanish)\n`.trt pt` (for Portuguese)");
    }

    try {
      const sourceText = msgRepondu.conversation || msgRepondu.extendedTextMessage?.text;
      
      if (!sourceText) {
        return repondre("❌ *Cannot translate non-text messages*");
      }
      
      const targetLang = arg[0];
      const translated = await traduire(sourceText, { to: targetLang });
      
      const reactionEmoji = "💗";
      
      // Create 3 cards
      const cards = [
        {
          header: {
            title: `📝 ORIGINAL TEXT`,
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
          },
          body: {
            text: `${sourceText.substring(0, 300)}${sourceText.length > 300 ? '...' : ''}`,
          },
          footer: {
            text: "",
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "📋 Copy Original",
                  copy_code: sourceText,
                }),
              },
            ],
          },
        },
        {
          header: {
            title: `🌐 TRANSLATED (${targetLang.toUpperCase()})`,
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
          },
          body: {
            text: `${translated.substring(0, 300)}${translated.length > 300 ? '...' : ''}`,
          },
          footer: {
            text: "",
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "📋 Copy Translation",
                  copy_code: translated,
                }),
              },
            ],
          },
        },
        {
          header: {
            title: `💗 TRANSLATION INFO`,
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent({ image: { url: randomNjabulourl } }, { upload: zk.waUploadToServer })).imageMessage,
          },
          body: {
            text: `🔍 *Source Language:* Auto-detected
🌐 *Target Language:* ${targetLang.toUpperCase()}
📏 *Original Length:* ${sourceText.length} characters
📏 *Translated Length:* ${translated.length} characters
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
                  copy_code: `Source Language: Auto-detected\nTarget Language: ${targetLang.toUpperCase()}\nOriginal Length: ${sourceText.length} characters\nTranslated Length: ${translated.length} characters`,
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
                header: { text: `💗 NJABULO MD TRANSLATOR` },
                body: { text: `*📂 Translation Results*` },
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
      
    } catch (error) {
      console.error("Translation error:", error);
      repondre("❌ *Translation failed*\n\nPlease check your language code or try again later.");
    }
  }
);
