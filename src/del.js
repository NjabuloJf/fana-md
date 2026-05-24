

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
      display_text: "𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹",
      id: "back channel",
      url: config.GURL

    });
  },
];

// ---------- Random image ----------
const njabulox = [
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png",
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg2.png"
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg3.png"
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg4.png"
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg5.png"
      "https://raw.githubusercontent.com/NjabuloJf/njabulo-data/main/njabuloimg/njabuloimg.png"

];
const randomNjabulourl = njabulox[Math.floor(Math.random() * njabulox.length)];

// ---------- Helper to send the formatted message ----------
async function sendFormattedMessage(zk, chatId, text, ms) {
  await zk.sendMessage(
    chatId,
    {
      interactiveMessage: {
        image: { url: randomNjabulourl },
        header: text,
        buttons: buttons,
        headerType: 1,
    }
    }
  );
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
      return await sendFormattedMessage(
        zk,
        dest,
        "*Please mention the message to delete.*",
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
      await sendFormattedMessage(
        zk,
        dest,
        "*Message deleted successfully.*",
        ms
      );
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
          await sendFormattedMessage(
            zk,
            dest,
            "*Message deleted successfully.*",
            ms
          );
        } catch (e) {
          await sendFormattedMessage(
            zk,
            dest,
            "*I need admin rights.*",
            ms
          );
        }
      } else {
        await sendFormattedMessage(
          zk,
          dest,
          "*Sorry, you are not an administrator of the group.*",
          ms
        );
      }
    }
  }
);
