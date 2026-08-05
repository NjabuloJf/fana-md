const axios = require('axios');
const fs = require("fs-extra");
const { execSync } = require("child_process");
const { unlink } = require('fs').promises;
const { fana } = require("../njabulo/fana");
const config = require("../set");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const GIFBufferToVideoBuffer = async (image) => {
  const filename = `${Math.random().toString(36)}`;
  try {
    await fs.writeFileSync(`./${filename}.gif`, image);
    execSync(`ffmpeg -i ./${filename}.gif -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ./${filename}.mp4`, { stdio: 'ignore' });
    await sleep(2000);
    const buffer5 = await fs.readFileSync(`./${filename}.mp4`);
    await Promise.all([unlink(`./${filename}.mp4`).catch(() => {}), unlink(`./${filename}.gif`).catch(() => {})]); 
    return buffer5;
  } catch (e) {
    console.error("GIF conversion error:", e.message);
    return null;
  }
};

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

const generateReactionCommand = (reactionName, reactionEmoji) => {
  fana({
    nomCom: reactionName,
    categorie: "Reaction",
    reaction: reactionEmoji || "😊",
  }, async (origineMessage, zk, commandeOptions) => {
    const { auteurMessage, auteurMsgRepondu, repondre, ms, msgRepondu } = commandeOptions;
    const url = `https://api.waifu.pics/sfw/${reactionName}`;
    
    try {
      const response = await axios.get(url, { timeout: 10000 });
      const imageUrl = response.data.url;
      
      const gifBufferResponse = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
      const gifBuffer = gifBufferResponse.data;
      
      const videoBuffer = await GIFBufferToVideoBuffer(gifBuffer);
      
      if (!videoBuffer) {
        throw new Error("Failed to convert GIF to video");
      }
      
      if (msgRepondu && auteurMsgRepondu) {
        const txt = `@${auteurMessage.split("@")[0]} ${reactionName} @${auteurMsgRepondu.split("@")[0]}`;
        await zk.sendMessage(origineMessage, {
          video: videoBuffer,
          gifPlayback: true,
          caption: txt,
          mentions: [auteurMessage, auteurMsgRepondu]
        }, { quoted: ms });
      } else {
        const txt = `@${auteurMessage.split("@")[0]} ${reactionName}`;
        await zk.sendMessage(origineMessage, {
          video: videoBuffer,
          gifPlayback: true,
          caption: txt,
          mentions: [auteurMessage]
        }, { quoted: ms });
      }
    } catch (error) {
      console.error(`Error in ${reactionName}:`, error.message);
      repondre(`❌ Error: ${error.message}`);
    }
  });
};

// Usage
generateReactionCommand("bully", "👊");
generateReactionCommand("cuddle", "🤗");
generateReactionCommand("cry", "😢");
generateReactionCommand("hug", "😊");
generateReactionCommand("awoo", "🐺");
generateReactionCommand("kiss", "😘");
generateReactionCommand("lick", "👅");
generateReactionCommand("pat", "👋");
generateReactionCommand("smug", "😏");
generateReactionCommand("bonk", "🔨");
generateReactionCommand("yeet", "🚀");
generateReactionCommand("blush", "😊");
generateReactionCommand("smile", "😄");
generateReactionCommand("wave", "👋");
generateReactionCommand("highfive", "🖐️");
generateReactionCommand("handhold", "🤝");
generateReactionCommand("nom", "👅");
generateReactionCommand("bite", "🦷");
generateReactionCommand("glomp", "🤗");
generateReactionCommand("slap", "👋");
generateReactionCommand("kill", "💀");
generateReactionCommand("kick", "🦵");
generateReactionCommand("happy", "😄");
generateReactionCommand("wink", "😉");
generateReactionCommand("poke", "👉");
generateReactionCommand("dance", "💃");
generateReactionCommand("cringe", "😬");
