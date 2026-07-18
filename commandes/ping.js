const { fana } = require("../njabulo/fana");
const conf = require("../set");

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

const templates = {
  pong: "🏓 *PONG!*",
  ping: "📡 *Ping:*",
  uptime: "⏱️ *Uptime:*",
  status: "✅ *Status:* Online"
};

fana({
  nomCom: "ping",
  alias: ["pong", "speed"],
  categorie: "General",
  reaction: "🏓",
  use: ".ping"
}, async (dest, zk, commandeOptions) => {
  const { ms, repondre } = commandeOptions;
  
  const lang = conf.LANGUAGE || "en";
  
  const start = Date.now();
  const ping = Date.now() - start;
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  const message = `${templates.pong}

${templates.ping} ${ping}ms
${templates.uptime} ${days}d ${hours}h ${minutes}m ${seconds}s

${templates.status}

> NJABULO MD`;

  await sendMessage(zk, dest, message, ms);
});
