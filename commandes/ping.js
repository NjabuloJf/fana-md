const { fana } = require("../njabulo/fana");
const conf = require("../set");
const axios = require("axios");

// ========== TRANSLATION FUNCTION ==========
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

async function sendMessage(zk, chatId, text, ms) {
  const buttons = [
    {
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: "🌐 WA Channel",
        id: "backup channel",
        url: "https://whatsapp.com/channel/0029VbAckOZ7tkj92um4KN3u"
      }),
    }
  ];
  
  await zk.sendMessage(chatId, {
    interactiveMessage: {
      header: text,
      buttons,
      headerType: 1
    }
  }, { quoted: ms });
}

fana({
  nomCom: "ping",
  alias: ["pong", "speed"],
  categorie: "General",
  reaction: "🏓",
  use: ".ping"
}, async (dest, zk, commandeOptions) => {
  const { ms, repondre } = commandeOptions;
  
  const lang = conf.LANGUAGE || "en";
  
  // Translate to selected language
  const pongMsg = await translateText("🏓 *PONG!*", lang);
  const pingMsg = await translateText("📡 *Ping:*", lang);
  const uptimeMsg = await translateText("⏱️ *Uptime:*", lang);
  const statusMsg = await translateText("✅ *Status:* Online", lang);
  
  const start = Date.now();
  const ping = Date.now() - start;
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  const message = `${pongMsg}

${pingMsg} ${ping}ms
${uptimeMsg} ${days}d ${hours}h ${minutes}m ${seconds}s

${statusMsg}

> NJABULO MD`;

  await sendMessage(zk, dest, message, ms);
});
