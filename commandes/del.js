const { fana } = require("../njabulo/fana");
const conf = require("../set");
const { translateText } = require("../translate");

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

// English message templates
const templates = {
  reply: "⚠️ *Please reply to the message you want to delete.*",
  success: "✅ *Message deleted successfully.*",
  admin_rights: "❌ *I need admin rights to delete messages.*",
  only_admins: "❌ *Sorry, only group admins can delete messages.*"
};

fana(
  { nomCom: "del", categorie: "Group", reaction: "🗑️" },
  async (dest, zk, commandeOptions) => {
    const {
      ms,
      repondre,
      verifGroupe,
      auteurMsgRepondu,
      idBot,
      msgRepondu,
      verifAdmin,
      superUser,
    } = commandeOptions;

    const lang = conf.LANGUAGE || "en";
    
    // Translate messages to selected language
    const t = {
      reply: await translateText(templates.reply, lang),
      success: await translateText(templates.success, lang),
      admin_rights: await translateText(templates.admin_rights, lang),
      only_admins: await translateText(templates.only_admins, lang)
    };

    if (!msgRepondu) {
      return await sendMessage(zk, dest, t.reply, ms);
    }

    if (superUser && auteurMsgRepondu === idBot) {
      const key = {
        remoteJid: dest,
        fromMe: true,
        id: ms.message.extendedTextMessage.contextInfo.stanzaId,
      };
      await zk.sendMessage(dest, { delete: key });
      await sendMessage(zk, dest, t.success, ms);
      return;
    }

    if (verifGroupe) {
      if (verifAdmin || superUser) {
        try {
          const key = {
            remoteJid: dest,
            id: ms.message.extendedTextMessage.contextInfo.stanzaId,
            fromMe: false,
            participant: ms.message.extendedTextMessage.contextInfo.participant,
          };
          await zk.sendMessage(dest, { delete: key });
          await sendMessage(zk, dest, t.success, ms);
        } catch (e) {
          await sendMessage(zk, dest, t.admin_rights, ms);
        }
      } else {
        await sendMessage(zk, dest, t.only_admins, ms);
      }
    }
  }
);
