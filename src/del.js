const { fana } = require("../njabulo/fana");
const config = require("../set");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const {
  ajouterOuMettreAJourJid,
  mettreAJourAction,
  verifierEtatJid,
} = require("../bdd/antilien");
const {
  atbajouterOuMettreAJourJid,
  atbverifierEtatJid,
} = require("../bdd/antibot");
const { search, download } = require("aptoide-scraper");
const fs = require("fs-extra");
const conf = require("../set");
const { default: axios } = require("axios");

// ---------- Buttons ----------
const buttons = [
  {
    name: "cta_url",
    buttonParamsJson: JSON.stringify({
      display_text: "🌐 WA Channel",
      id: "backup channel",
      url: config.GURL
    }),
  },
];

// ---------- Send message with buttons ----------
async function sendMessageWithButtons(zk, chatId, text, ms) {
  try {
    await zk.sendMessage(
      chatId,
      {
        interactiveMessage: {
          header: { text: text },
          buttons: buttons,
          headerType: 1
        }
      },
      { quoted: ms }
    );
  } catch (error) {
    // Fallback to simple text if buttons fail
    await zk.sendMessage(chatId, { text: text });
  }
}

// ---------- Simple text message (fallback) ----------
async function sendMessage(zk, chatId, text) {
  await zk.sendMessage(chatId, { text: text });
}

// ---------- Delete command ----------
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

    if (!msgRepondu) {
      return await sendMessageWithButtons(
        zk,
        dest,
        "⚠️ *Please reply to the message you want to delete.*",
        ms
      );
    }

    // Super user deleting a bot message
    if (superUser && auteurMsgRepondu === idBot) {
      const key = {
        remoteJid: dest,
        fromMe: true,
        id: ms.message.extendedTextMessage.contextInfo.stanzaId,
      };
      await zk.sendMessage(dest, { delete: key });
      await sendMessageWithButtons(
        zk,
        dest,
        "✅ *Message deleted successfully.*",
        ms
      );
      return;
    }

    // Group delete (admin or super user)
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
          await sendMessageWithButtons(
            zk,
            dest,
            "✅ *Message deleted successfully.*",
            ms
          );
        } catch (e) {
          await sendMessageWithButtons(
            zk,
            dest,
            "❌ *I need admin rights to delete messages.*",
            ms
          );
        }
      } else {
        await sendMessageWithButtons(
          zk,
          dest,
          "❌ *Sorry, only group admins can delete messages.*",
          ms
        );
      }
    }
  }
);
