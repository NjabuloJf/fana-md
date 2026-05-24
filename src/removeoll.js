const { fana } = require("../njabulo/fana");
const axios = require("axios");
const config = require("../set");
let { Sticker, createSticker, StickerTypes } = require("wa-sticker-formatter");
const {
  isUserBanned,
  addUserToBanList,
  removeUserFromBanList,
} = require("../bdd/banUser");
const {
  addGroupToBanList,
  isGroupBanned,
  removeGroupFromBanList,
} = require("../bdd/banGroup");
const {
  removeSudoNumber,
  addSudoNumber,
  issudo,
} = require("../bdd/sudo");

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

// ── Base button definition (same as in other modules) ─────
const buttons = [
  {
    name: "cta_url",
    buttonParamsJson: JSON.stringify({
      display_text: "𝗪𝗮 𝗖𝗵𝗮𝗻𝗻𝗲𝗹",
      id: "backup channel",
      url: config.GURL
    }),
  },
];

// ── Helper that sends an interactive message with image + buttons ─────
async function sendFormattedMessage(zk, chatId, text, ms) {
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

// ── Kick all command ─────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

fana(
  {
    nomCom: "kickall",
    categorie: "Group",
    reaction: "📣",
  },
  async (chatId, zk, commandeOptions) => {
    const {
      auteurMessage,
      ms,
      repondre,
      arg,
      verifGroupe,
      infosGroupe,
      nomAuteurMessage,
      verifAdmin,
      superUser,
    } = commandeOptions;

    if (!verifGroupe) {
      return sendFormattedMessage(
        zk,
        chatId,
        "*✋🏿 ✋🏿thιs ᥴommᥲnd ιs rᥱsᥱrvᥱd for groᥙρs*",
        ms
      );
    }

    const metadata = await zk.groupMetadata(chatId);

    if (!(superUser || auteurMessage === metadata.owner)) {
      return sendFormattedMessage(
        zk,
        chatId,
        "Order reserved for the group owner for security reasons",
        ms
      );
    }

    sendFormattedMessage(
      zk,
      chatId,
      "Non-admin members will be removed from the group. You have 5 seconds to reclaim your choice by restarting the bot.",
      ms
    );
    await sleep(5000);

    const membresGroupe = verifGroupe ? await infosGroupe.participants : [];
    try {
      const users = membresGroupe.filter((member) => !member.admin);

      for (const membre of users) {
        await zk.groupParticipantsUpdate(chatId, [membre.id], "remove");
        await sleep(500);
      }
    } catch (e) {
      sendFormattedMessage(zk, chatId, "I need administration rights", ms);
    }
  }
);
