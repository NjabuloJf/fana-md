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

// ---------- Simple text message (NO BUTTONS) ----------
async function sendMessage(zk, chatId, text, ms) {
  await zk.sendMessage(chatId, { 
          interactiveMessage: {
          header: text,
          buttons,
          headerType: 1
          }
        }, { quoted: ms });
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
      return await sendMessage(
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
      await sendMessage(
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
          await sendMessage(
            zk,
            dest,
            "✅ *Message deleted successfully.*",
            ms
          );
        } catch (e) {
          await sendMessage(
            zk,
            dest,
            "❌ *I need admin rights to delete messages.*",
            ms
          );
        }
      } else {
        await sendMessage(
          zk,
          dest,
          "❌ *Sorry, only group admins can delete messages.*",
          ms
        );
      }
    }
  }
);
