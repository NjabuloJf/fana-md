const { fana } = require("../njabulo/fana");
const axios = require("axios");
const { writeFile } = require("fs/promises");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// ── Random image for the header (used only for error messages) ─────
const njabulox = [
"https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",

];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ── Base button definition ─────────────────────────────────
const baseButtons = [
  {
    name: "cta_url",
    buttonParamsJson: JSON.stringify({
      display_text: "Visit Website",
      id: "backup channel",
      url: "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u",
    }),
  },
  {
    name: "cta_copy",
    buttonParamsJson: JSON.stringify({
      display_text: "Copy URL",
      id: "copy",
      copy_code: "", // will be filled dynamically
    }),
  },
];

// ── Helper: send an image with a “Copy URL” button ─────
async function sendImageWithCopy(zk, chatId, imageUrl, ms) {
  // Clone the base button array so we can set the copy_code for this message
  const buttons = JSON.parse(JSON.stringify(baseButtons));
  buttons[1].buttonParamsJson = JSON.stringify({
    display_text: "Copy URL",
    id: "copy",
    copy_code: imageUrl, // copy the image URL
  });
  await zk.sendMessage(
    chatId,
    {
      interactiveMessage: {
        image: { url: imageUrl },
        header: "📸 Image",
        buttons,
        headerType: 1,
        contextInfo: {
          mentionedJid: [ms?.sender?.jid || ""],
          externalAdReply: {
            title: "👥 message settings owner control",
            mediaType: 1,
            previewType: 0,
            thumbnailUrl: imageUrl,
            renderLargerThumbnail: false,
          },
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363399999197102@newsletter",
            newsletterName: "╭••➤®Njabulo Jb",
            serverMessageId: 143,
          },
          forwardingScore: 999,
        },
      },
    },
    { quoted: ms }
  );
}

// ── Helper for error messages (kept from previous version) ─────
async function sendError(zk, chatId, text, ms) {
  const buttons = JSON.parse(JSON.stringify(baseButtons));
  buttons[1].buttonParamsJson = JSON.stringify({
    display_text: "Copy",
    id: "copy",
    copy_code: text,
  });
  await zk.sendMessage(
    chatId,
    {
      interactiveMessage: {
        image: { url: randomNjabulourl },
        header: "⚠️ Error",
        body: text,
        buttons,
        headerType: 1,
        contextInfo: {
          mentionedJid: [ms?.sender?.jid || ""],
        },
      },
    },
    { quoted: ms }
  );
}

// ── Waifu command ─────────────────────────────────────────────
fana(
  {
    nomCom: "waifu",
    categorie: "Weeb",
    reaction: "😏",
  },
  async (chatId, zk, context) => {
    const { ms } = context;
    const api = "https://api.waifu.pics/sfw/waifu";
    try {
      const cards = [];
      for (let i = 0; i < 6; i++) {
        const { data } = await axios.get(api);
        cards.push({
          header: {
            title: `Waifu Image ${i + 1}`,
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent({ image: { url: data.url } }, { upload: zk.waUploadToServer })).imageMessage,
          },
          body: {
            text: "Check out this waifu!",
          },
          footer: {
            text: "Enjoy 😊",
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "Copy Link",
                  copy_code: data.url,
                }),
              },
            ],
          },
        });
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
                body: {
                  text: "Waifu Images",
                },
                footer: {
                  text: "Click to view",
                },
                carouselMessage: {
                  cards,
                },
              },
            },
          },
        },
        { quoted: ms }
      );

      await zk.relayMessage(chatId, message.message, { messageId: message.key.id });
    } catch (e) {
      await sendError(zk, chatId, `Error: ${e.message}`, ms);
    }
  }
);

// ── Neko command ─────────────────────────────────────────────
fana(
  {
    nomCom: "neko",
    categorie: "Weeb",
    reaction: "😺",
  },
  async (chatId, zk, context) => {
    const { ms } = context;
    const api = "https://api.waifu.pics/sfw/neko";
    try {
      const cards = [];
      for (let i = 0; i < 6; i++) {
        const { data } = await axios.get(api);
        cards.push({
          header: {
            title: `Neko Image ${i + 1}`,
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent({ image: { url: data.url } }, { upload: zk.waUploadToServer })).imageMessage,
          },
          body: {
            text: "Check out this neko!",
          },
          footer: {
            text: "Enjoy 😊",
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "Copy Link",
                  copy_code: data.url,
                }),
              },
            ],
          },
        });
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
                body: {
                  text: "Neko Images",
                },
                footer: {
                  text: "Click to view",
                },
                carouselMessage: {
                  cards,
                },
              },
            },
          },
        },
        { quoted: ms }
      );

      await zk.relayMessage(chatId, message.message, { messageId: message.key.id });
    } catch (e) {
      await sendError(zk, chatId, `Error: ${e.message}`, ms);
    }
  }
);

// ── Shinobu command ─────────────────────────────────────────────
fana(
  {
    nomCom: "shinobu",
    categorie: "Weeb",
    reaction: "🦋",
  },
  async (chatId, zk, context) => {
    const { ms } = context;
    const api = "https://api.waifu.pics/sfw/shinobu";
    try {
      const cards = [];
      for (let i = 0; i < 6; i++) {
        const { data } = await axios.get(api);
        cards.push({
          header: {
            title: `Shinobu Image ${i + 1}`,
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent({ image: { url: data.url } }, { upload: zk.waUploadToServer })).imageMessage,
          },
          body: {
            text: "Check out this shinobu!",
          },
          footer: {
            text: "Enjoy 😊",
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "Copy Link",
                  copy_code: data.url,
                }),
              },
            ],
          },
        });
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
                body: {
                  text: "Shinobu Images",
                },
                footer: {
                  text: "Click to view",
                },
                carouselMessage: {
                  cards,
                },
              },
            },
          },
        },
        { quoted: ms }
      );

      await zk.relayMessage(chatId, message.message, { messageId: message.key.id });
    } catch (e) {
      await sendError(zk, chatId, `Error: ${e.message}`, ms);
    }
  }
);

fana(
  {
    nomCom: "megumin",
    categorie: "Weeb",
    reaction: "💥",
  },
  async (chatId, zk, context) => {
    const { ms } = context;
    const api = "https://api.waifu.pics/sfw/megumin";
    try {
      const cards = [];
      for (let i = 0; i < 6; i++) {
        const { data } = await axios.get(api);
        cards.push({
          header: {
            title: `Megumin Image ${i + 1}`,
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent({ image: { url: data.url } }, { upload: zk.waUploadToServer })).imageMessage,
          },
          body: {
            text: "Check out this megumin!",
          },
          footer: {
            text: "Enjoy 😊",
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "Copy Link",
                  copy_code: data.url,
                }),
              },
            ],
          },
        });
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
                body: {
                  text: "Megumin Images",
                },
                footer: {
                  text: "Click to view",
                },
                carouselMessage: {
                  cards,
                },
              },
            },
          },
        },
        { quoted: ms }
      );

      await zk.relayMessage(chatId, message.message, { messageId: message.key.id });
    } catch (e) {
      await sendError(zk, chatId, `Error: ${e.message}`, ms);
    }
  }
);

// ── Cosplay command ─────────────────────────────────────────────
fana(
  {
    nomCom: "cosplay",
    categorie: "Weeb",
    reaction: "😏",
  },
  async (chatId, zk, context) => {
    const { ms } = context;
    const api = "https://fantox-cosplay-api.onrender.com/";
    try {
      const cards = [];
      for (let i = 0; i < 6; i++) {
        const { data } = await axios.get(api, { responseType: "arraybuffer" });
        await writeFile("./cosplay.jpg", data);
        cards.push({
          header: {
            title: `Cosplay Image ${i + 1}`,
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent({ image: { url: "./cosplay.jpg" } }, { upload: zk.waUploadToServer })).imageMessage,
          },
          body: {
            text: "Check out this cosplay!",
          },
          footer: {
            text: "Enjoy 😊",
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "Copy Link",
                  copy_code: "./cosplay.jpg",
                }),
              },
            ],
          },
        });
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
                body: {
                  text: "Cosplay Images",
                },
                footer: {
                  text: "Click to view",
                },
                carouselMessage: {
                  cards,
                },
              },
            },
          },
        },
        { quoted: ms }
      );

      await zk.relayMessage(chatId, message.message, { messageId: message.key.id });
    } catch (e) {
      await sendError(zk, chatId, `Error: ${e.message}`, ms);
    }
  }
);

// ── Couple PP command ─────────────────────────────────────────────
fana(
  {
    nomCom: "couplepp",
    categorie: "Weeb",
    reaction: "💞",
  },
  async (chatId, zk, context) => {
    const { ms } = context;
    const api = "https://smiling-hosiery-bear.cyclic.app/weeb/couplepp";
    try {
      const { data } = await axios.get(api);
      const cards = [
        {
          header: {
            title: "Couple PP - Male",
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent({ image: { url: data.male } }, { upload: zk.waUploadToServer })).imageMessage,
          },
          body: {
            text: "Male profile pic",
          },
          footer: {
            text: "Enjoy 😊",
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "Copy Link",
                  copy_code: data.male,
                }),
              },
            ],
          },
        },
        {
          header: {
            title: "Couple PP - Female",
            hasMediaAttachment: true,
            imageMessage: (await generateWAMessageContent({ image: { url: data.female } }, { upload: zk.waUploadToServer })).imageMessage,
          },
          body: {
            text: "Female profile pic",
          },
          footer: {
            text: "Enjoy 😊",
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "Copy Link",
                  copy_code: data.female,
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
                body: {
                  text: "Couple Profile Pics",
                },
                footer: {
                  text: "Click to view",
                },
                carouselMessage: {
                  cards,
                },
              },
            },
          },
        },
        { quoted: ms }
      );

      await zk.relayMessage(chatId, message.message, { messageId: message.key.id });
    } catch (e) {
      await sendError(zk, chatId, `Error: ${e.message}`, ms);
    }
  }
);

