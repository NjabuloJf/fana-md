

const { fana } = require("../njabulo/fana");
const yts = require("yt-search");
const config = require(__dirname + "/../set");
const { generateWAMessageContent, generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// ── Random image list ─────────────────────────────────────────────
const njabulox = [
"https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",

];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];
// ── Standard button set (used by all modules) ────────────────────────
const baseButtons = [
  {
    name: "cta_copy",
    buttonParamsJson: JSON.stringify({
      display_text: "Copy",
      id: "copy",
      copy_code: config.GURL
    }),
  },
];
// ── Helper that sends an *interactive* message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
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
        header: text,
        buttons,
        headerType: 1,
      }
}, { quoted: ms });
}
// ── YouTube search command ─────────────────────────────────────────────
fana(
  {
    nomCom: "yts",
    aliases: ["ytsearch"],
    categorie: "Search",
    reaction: "🔍",
    description: "Search for YouTube videos.",
  },
  async (dest, zk, commandeOptions) => {
    const { repondre, ms, arg } = commandeOptions;
    try {
      if (!arg[0]) {
        return repondre("Please provide a search query.");
      }
      const searchQuery = arg.join(" ");
      await repondre(`🔍 Searching for "${searchQuery}"...`);
      const results = await yts(searchQuery);
      if (!results.videos.length) {
        return repondre("No results found.");
      }
      const cards = await Promise.all(
        results.videos.slice(0, 5).map(async (video, i) => {
          let resultText = `*YouTube Search Result ${i+1}*\n\n`;
          resultText += `*🎧Title:* ${video.title}\n`;
          resultText += `🖇️*URL:* ${video.url}\n`;
          resultText += `*🙈Views:* ${video.views.toLocaleString()}\n`;
          resultText += `*🎶Uploaded:* ${video.ago}\n`;
          resultText += `*⏲️Duration:* ${video.timestamp}`;
          return {
            header: {
              title: `📸 ${video.title}`,
              hasMediaAttachment: true,
              imageMessage: (await generateWAMessageContent({ image: { url: video.thumbnail } }, { upload: zk.waUploadToServer })).imageMessage,
            },
            body: {
              text: resultText,
            },
            footer: {
              text: "*Nᴊᴀʙᴜʟᴏ Jʙ YᴏᴜTᴜʙᴇ ᴅᴏᴡɴʟᴏᴀᴅ*",
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "cta_url",
                  buttonParamsJson: JSON.stringify({
                    display_text: "🌐 View on YouTube",
                    url: `https://youtu.be/${video.videoId}`,
                  }),
                },
              ],
            },
          };
        })
      );
      const message = generateWAMessageFromContent(
        dest,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                header: { text: `🔍 Search Results for "${searchQuery}"` },
                footer: { text: `📂 Found ${results.videos.length} results` },
                carouselMessage: { cards },
              },
            },
          },
        },
        { quoted: ms }
      );
      await zk.relayMessage(dest, message.message, { messageId: message.key.id });
    } catch (err) {
      console.error(err);
      repondre("An error occurred while searching for videos.");
    }
  }
); 
